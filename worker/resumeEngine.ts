// worker/resumeEngine.ts
// PDF/DOCX Parsing, Gemini Structured Extraction & ATS DOCX Generation for Cloudflare Workers

import './polyfills.ts';
// @ts-ignore - Legacy worker build provides WorkerMessageHandler
import * as pdfWorkerModule from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

// Setup fake worker in-memory on globalThis so pdf-parse / pdfjs-dist uses it synchronously
// in Cloudflare Workers V8 isolates without attempting dynamic import of './pdf.worker.mjs'
if (typeof (globalThis as any).pdfjsWorker === 'undefined') {
  (globalThis as any).pdfjsWorker = pdfWorkerModule;
}

import { PDFParse } from 'pdf-parse';
import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from 'docx';
import {
  extractDocxResumeText,
  ResumeExtractionError,
  ResumeExtractionErrorCode,
  toUint8Array,
  validateAndDetectResumeFormat,
} from '../src/utils/docxExtractor.ts';
import { UserProfile, TailoredResumeContent, VerifiedSkill, ExperienceItem, StructuredExtractionOutput, StructuredDocumentBlock } from '../src/types/index.ts';
import { detectJobFamily } from './matchingEngine.ts';

export interface ExtractionResult {
  text: string;
  blocks?: StructuredDocumentBlock[];
  isScanned: boolean;
  pageCount?: number;
  format: 'pdf' | 'docx';
  warning?: string;
  errorCode?: ResumeExtractionErrorCode;
}

export interface TruthfulnessValidationResult {
  passed: boolean;
  score: number;
  issues: string[];
}

import {
  type ParsedEmploymentDates,
  parseEmploymentDates,
  parseStructuralEmploymentHistory,
  isInvalidToken,
  buildStructuredResumePromptContext,
  normalizeAndValidateAiExperiences,
  toExperienceItem,
  formatExperiencePeriod,
  type RawEmploymentRecord
} from '../src/utils/structuralEmploymentParser.ts';

export type { ParsedEmploymentDates, RawEmploymentRecord };
export {
  parseEmploymentDates,
  parseStructuralEmploymentHistory,
  isInvalidToken,
  formatExperiencePeriod
};

export const workerResumeEngine = {
  /**
   * Validate and extract text safely from uploaded file buffer.
   */
  async extractText(buffer: Buffer | ArrayBuffer | Uint8Array, originalName: string, mimeType: string): Promise<ExtractionResult> {
    const bytes = toUint8Array(buffer);
    const format = validateAndDetectResumeFormat(bytes, originalName, mimeType);

    if (format === 'pdf') {
      const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      try {
        const parser = new PDFParse({ data: nodeBuf });
        const parseResult = await parser.getText();
        const rawText = parseResult.text ? parseResult.text.trim() : '';

        if (rawText.length < 40) {
          return {
            text: '',
            isScanned: true,
            pageCount: parseResult.pages?.length || 1,
            format: 'pdf',
            warning: 'This PDF appears to be a scanned image or contains no extractable text. Please upload a text-based PDF or DOCX file.',
          };
        }

        const normalizedText = rawText
          .replace(/\r\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        return {
          text: normalizedText,
          isScanned: false,
          pageCount: parseResult.pages?.length || 1,
          format: 'pdf',
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('password') || msg.includes('encrypted')) {
          throw new ResumeExtractionError(
            'PDF_PARSE_FAILURE',
            'The PDF document is password-protected or encrypted. Please provide an unencrypted document.',
            422
          );
        }
        throw new ResumeExtractionError('PDF_PARSE_FAILURE', `Failed to extract text from PDF: ${msg}`, 422);
      }
    } else {
      return extractDocxResumeText(bytes);
    }
  },

  /**
   * Structure extracted resume text via Gemini API, or fallback to deterministic heuristic parser.
   */
  async structureProfileDetailed(
    text: string,
    existingProfile?: UserProfile | null,
    apiKey?: string,
    blocks?: StructuredDocumentBlock[]
  ): Promise<StructuredExtractionOutput> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const validationErrors: string[] = [];

    if (!apiKey) {
      const heuristicFields = workerResumeEngine.heuristicParse(text, existingProfile, blocks);
      return {
        method: 'HEURISTIC',
        parserModel: 'Heuristic-CrossIndustry-v2.0',
        status: 'SUCCESS',
        extractedFields: heuristicFields,
        warnings: ['Gemini API key not configured. Used cross-industry deterministic heuristic parser.'],
        validationErrors: [],
        processingDurationMs: Date.now() - startTime,
        fallbackReason: 'API_KEY_UNAVAILABLE',
        diagnostics: {
          textLength: text.length,
          skillsExtractedCount: heuristicFields.skills.length,
          experienceEntriesCount: heuristicFields.experiences.length,
          educationEntriesCount: heuristicFields.education.length,
          isDateUncertain: heuristicFields.experiences.some(e => e.isDateUncertain),
        },
      };
    }

    try {
      const sectionAnnotatedText = buildStructuredResumePromptContext(text, blocks, 16000);
      const prompt = `You are a precise, truth-focused ATS resume parser.
Extract information ONLY if directly supported by the resume text below.
CRITICAL ANTI-HALLUCINATION RULES:
1. NEVER fabricate employers, titles, degrees, or dates. NEVER guess default dates such as "2022" or "Present".
2. Keep each distinct position as its own entry (including multiple roles/promotions at the same company).
3. Copy exact verbatim lines from the resume into "sourceEvidence" for each job record.
4. Put bullet responsibilities into "responsibilities" (array of strings); never treat a sentence fragment as a job record.
5. Keep PROJECTS, EDUCATION, SKILLS, and VOLUNTEERING strictly separate from EMPLOYMENT experiences.
6. Use null or empty string "" for unknown dates.

Section-Segmented Resume Text:
"""
${sectionAnnotatedText}
"""

Return ONLY a valid JSON object matching this structure:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "location": string,
  "currentTitle": string,
  "currentEmployer": string,
  "totalExperienceYears": number,
  "professionalSummary": string,
  "education": [{"degree": string, "institution": string, "fieldOfStudy": string, "graduationYear": string}],
  "certifications": [{"name": string, "issuingOrg": string, "issueYear": string}],
  "skills": [{"name": string, "category": string, "proficiency": string, "yearsExperience": number}],
  "experiences": [{
    "company": string,
    "role": string,
    "startDate": string,
    "endDate": string,
    "current": boolean,
    "location": string,
    "description": string,
    "responsibilities": string[],
    "achievements": string[],
    "verifiedSkillsUsed": string[],
    "sourceEvidence": string[]
  }],
  "languages": string[]
}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`Gemini HTTP ${res.status}`);
      }

      const resData = (await res.json()) as any;
      const jsonText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) throw new Error('Empty Gemini response');

      let parsed: any;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        validationErrors.push('Gemini returned malformed or non-JSON output');
        const fallbackFields = workerResumeEngine.heuristicParse(text, existingProfile, blocks);
        return {
          method: 'HEURISTIC',
          parserModel: 'gemini-2.5-flash -> Heuristic-Fallback',
          status: 'PARTIAL',
          extractedFields: fallbackFields,
          warnings: ['AI output failed JSON validation; parsed deterministically with heuristic engine.'],
          validationErrors,
          processingDurationMs: Date.now() - startTime,
          fallbackReason: 'MALFORMED_GEMINI_OUTPUT',
          diagnostics: {
            textLength: text.length,
            skillsExtractedCount: fallbackFields.skills.length,
            experienceEntriesCount: fallbackFields.experiences.length,
            educationEntriesCount: fallbackFields.education.length,
            isDateUncertain: fallbackFields.experiences.some(e => e.isDateUncertain),
          },
        };
      }

      const aiValidated = normalizeAndValidateAiExperiences(
        Array.isArray(parsed.experiences) ? parsed.experiences : [],
        text,
        blocks
      );
      const parsedExperiences: ExperienceItem[] = aiValidated.experiences;
      warnings.push(...aiValidated.warnings);

      const totalMonths = parsedExperiences.reduce((sum: number, exp: ExperienceItem) => {
        const d = parseEmploymentDates(exp.startDate ? `${exp.startDate} - ${exp.endDate || (exp.current ? 'Present' : '')}` : '');
        return sum + d.durationMonths;
      }, 0);
      const calculatedExpYears = Math.round(totalMonths / 12);
      const totalExperienceYears = calculatedExpYears || (typeof parsed.totalExperienceYears === 'number' ? parsed.totalExperienceYears : 0);

      const extractedSkills: VerifiedSkill[] = Array.isArray(parsed.skills)
        ? parsed.skills.map((s: any): VerifiedSkill => ({
            name: String(s.name || '').trim(),
            category: (s.category as any) || 'general',
            proficiency: (s.proficiency as any) || 'proficient',
            yearsExperience: typeof s.yearsExperience === 'number' ? s.yearsExperience : 0,
            verified: false,
          }))
        : [];

      const extractedLanguages: string[] = Array.isArray(parsed.languages) ? parsed.languages.filter(Boolean) : [];

      const parsedProfile: UserProfile = {
        id: existingProfile?.id || crypto.randomUUID(),
        fullName: parsed.fullName ? parsed.fullName.trim() : (existingProfile?.fullName || ''),
        email: parsed.email || existingProfile?.email || '',
        phone: parsed.phone || existingProfile?.phone || '',
        location: parsed.location || existingProfile?.location || '',
        workAuthorizationCountry: existingProfile?.workAuthorizationCountry || '',
        workAuthorizationStatus: existingProfile?.workAuthorizationStatus || '',
        workAuthorization: existingProfile?.workAuthorization || [],
        requiresVisaSponsorship: existingProfile?.requiresVisaSponsorship || false,
        currentTitle: parsed.currentTitle || (parsedExperiences[0]?.role || ''),
        currentEmployer: parsed.currentEmployer || (parsedExperiences[0]?.company || ''),
        totalExperienceYears,
        professionalSummary: parsed.professionalSummary || '',
        education: Array.isArray(parsed.education)
          ? parsed.education.map((e: any) => ({
              id: crypto.randomUUID(),
              degree: e.degree || '',
              institution: e.institution || '',
              fieldOfStudy: e.fieldOfStudy || '',
              graduationYear: String(e.graduationYear || ''),
            }))
          : [],
        certifications: Array.isArray(parsed.certifications)
          ? parsed.certifications.map((c: any) => ({
              id: crypto.randomUUID(),
              name: c.name || '',
              issuingOrg: c.issuingOrg || '',
              issueYear: String(c.issueYear || ''),
            }))
          : [],
        skills: extractedSkills,
        experiences: parsedExperiences,
        languages: extractedLanguages,
        masterResumeLastUpdated: new Date().toISOString(),
      };

      return {
        method: 'GEMINI',
        parserModel: 'gemini-2.5-flash',
        status: warnings.length > 0 ? 'PARTIAL' : 'SUCCESS',
        extractedFields: parsedProfile,
        warnings,
        validationErrors: [],
        processingDurationMs: Date.now() - startTime,
        diagnostics: {
          textLength: text.length,
          skillsExtractedCount: extractedSkills.length,
          experienceEntriesCount: parsedExperiences.length,
          educationEntriesCount: parsedProfile.education.length,
          isDateUncertain: parsedExperiences.some(e => e.isDateUncertain),
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      validationErrors.push(msg);
      const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort');
      const fallbackFields = workerResumeEngine.heuristicParse(text, existingProfile, blocks);

      return {
        method: 'HEURISTIC',
        parserModel: 'Heuristic-CrossIndustry-v2.0',
        status: 'PARTIAL',
        extractedFields: fallbackFields,
        warnings: [`Gemini extraction failed (${msg}); processed with deterministic heuristic engine.`],
        validationErrors,
        processingDurationMs: Date.now() - startTime,
        fallbackReason: isTimeout ? 'GEMINI_TIMEOUT' : 'GEMINI_API_ERROR',
        diagnostics: {
          textLength: text.length,
          skillsExtractedCount: fallbackFields.skills.length,
          experienceEntriesCount: fallbackFields.experiences.length,
          educationEntriesCount: fallbackFields.education.length,
          isDateUncertain: fallbackFields.experiences.some(e => e.isDateUncertain),
        },
      };
    }
  },

  /**
   * Structure extracted resume text via Gemini API, or fallback to deterministic heuristic parser.
   */
  async structureProfileWithAI(
    text: string,
    existingProfile?: UserProfile | null,
    apiKey?: string,
    blocks?: StructuredDocumentBlock[]
  ): Promise<UserProfile> {
    const detailed = await this.structureProfileDetailed(text, existingProfile, apiKey, blocks);
    return detailed.extractedFields;
  },

  /**
   * Fast, reliable heuristic parser across cross-industry domains.
   */
  heuristicParse(
    text: string,
    existingProfile?: UserProfile | null,
    blocks?: StructuredDocumentBlock[]
  ): UserProfile {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0] || 'Candidate Name';

    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

    const crossIndustrySkills = [
      'Procurement', 'Supply Chain', 'Logistics', 'Inventory Management', 'Vendor Management', 'Sourcing',
      'Contract Negotiation', 'Warehouse Management', 'Demand Planning', 'ERP', 'SAP',
      'Project Management', 'Agile', 'Scrum', 'Stakeholder Management', 'Risk Management', 'Process Improvement',
      'Business Analysis', 'Roadmapping', 'Budgeting', 'KPI Tracking', 'Cross-functional Leadership',
      'Financial Modeling', 'Forecasting', 'Auditing', 'Accounting', 'Excel', 'Power BI', 'SQL',
      'Data Analysis', 'Tableau', 'Reporting',
      'Digital Marketing', 'SEO', 'Content Strategy', 'CRM', 'Salesforce', 'Customer Retention',
      'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS', 'Docker', 'Git', 'Cloud Architecture'
    ];

    const skillsFound = crossIndustrySkills.filter(skill =>
      new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
    );

    // Always extract fresh employment records from uploaded document text first!
    // Only fall back to existing verified records if document appears to be an unreadable/sparse scan.
    const structural = parseStructuralEmploymentHistory(text, blocks);
    const hasReliableStructural = structural.some(
      (r) => r.company !== 'Employer not detected' && !r.needs_verification
    );
    const isSparseOrUnreadableScan =
      /email\s*:\s*unreadable/i.test(text) ||
      (structural.length === 0 && text.trim().length < 220) ||
      (!hasReliableStructural && text.trim().length < 180);

    const parsedExperiences: ExperienceItem[] =
      structural.length > 0 && (!isSparseOrUnreadableScan || !existingProfile?.experiences?.length)
        ? structural.map((rec: RawEmploymentRecord, idx: number) => toExperienceItem(rec, idx))
        : (isSparseOrUnreadableScan && existingProfile?.experiences ? [...existingProfile.experiences] : []);

    // Dynamic experience duration calculation from extracted records
    const totalMonths = parsedExperiences.reduce((sum: number, exp: ExperienceItem) => {
      const d = parseEmploymentDates(exp.startDate ? `${exp.startDate} - ${exp.endDate || (exp.current ? 'Present' : '')}` : '');
      return sum + d.durationMonths;
    }, 0);
    const calculatedExpYears = Math.round(totalMonths / 12);
    const totalExperienceYears = isSparseOrUnreadableScan && existingProfile?.totalExperienceYears
      ? existingProfile.totalExperienceYears
      : calculatedExpYears;

    return {
      id: existingProfile?.id || crypto.randomUUID(),
      fullName: existingProfile?.fullName || (firstLine.length < 40 ? firstLine : ''),
      email: emailMatch ? emailMatch[0] : (existingProfile?.email || ''),
      phone: phoneMatch ? phoneMatch[0] : (existingProfile?.phone || ''),
      location: existingProfile?.location || '',
      workAuthorizationCountry: existingProfile?.workAuthorizationCountry || '',
      workAuthorizationStatus: existingProfile?.workAuthorizationStatus || '',
      workAuthorization: existingProfile?.workAuthorization || [],
      requiresVisaSponsorship: existingProfile?.requiresVisaSponsorship || false,
      currentTitle: structural.length > 0
        ? (parsedExperiences[0]?.role || '')
        : (isSparseOrUnreadableScan && existingProfile?.currentTitle ? existingProfile.currentTitle : (parsedExperiences[0]?.role || '')),
      currentEmployer: structural.length > 0
        ? (parsedExperiences[0]?.company || '')
        : (isSparseOrUnreadableScan && existingProfile?.currentEmployer ? existingProfile.currentEmployer : (parsedExperiences[0]?.company || '')),
      totalExperienceYears,
      professionalSummary: existingProfile?.professionalSummary || lines.slice(1, 4).join(' ').slice(0, 350) || '',
      education: existingProfile?.education || [],
      certifications: existingProfile?.certifications || [],
      skills: skillsFound.map((s): VerifiedSkill => ({
        name: s,
        category: 'general',
        proficiency: 'proficient',
        yearsExperience: 0,
        verified: false,
      })),
      experiences: parsedExperiences,
      languages: existingProfile?.languages || [],
      masterResumeLastUpdated: new Date().toISOString(),
    };
  },

  /**
   * Deterministically validates tailored resume against the master verified profile facts.
   */
  validateTruthfulness(tailored: TailoredResumeContent, profile: UserProfile): TruthfulnessValidationResult {
    const issues: string[] = [];
    const masterCompanies = profile.experiences.map(e => e.company.toLowerCase().trim());
    const masterSkills = new Set((profile.skills || []).map(s => (typeof s === 'string' ? s : (s as any)?.name || '').toLowerCase().trim()));

    // 1. Verify every company in tailored experience exists in master profile
    for (const exp of tailored.tailoredExperiences || []) {
      const cLower = exp.company.toLowerCase().trim();
      if (!cLower) continue;
      const found = masterCompanies.some(mc => mc.includes(cLower) || cLower.includes(mc));
      if (!found) {
        issues.push(`Unverified employer in tailored experience: "${exp.company}".`);
      }
    }

    // 2. Verify skills are present in verified profile
    for (const sk of tailored.targetedSkills || []) {
      const sLower = sk.toLowerCase().trim();
      const hasSkill = Array.from(masterSkills).some(ms => ms.includes(sLower) || sLower.includes(ms));
      if (!hasSkill) {
        issues.push(`Targeted skill "${sk}" not present in candidate's verified profile.`);
      }
    }

    const deductions = issues.length * 20;
    const score = Math.max(0, 100 - deductions);

    return {
      passed: issues.length === 0,
      score,
      issues,
    };
  },

  /**
   * Tailor resume for specific vacancy without fabricating new unverified claims.
   */
  async tailorResume(
    profile: UserProfile,
    jobTitle: string,
    jobCompany: string,
    jobDescription: string,
    apiKey?: string
  ): Promise<{ tailoredResume: TailoredResumeContent; coverLetter: string; truthfulnessScore: number; auditIssues: string[] }> {
    const jobFamily = detectJobFamily(jobTitle, jobDescription);

    const skillNames = (profile.skills || []).map(s => (typeof s === 'string' ? s : (s as any)?.name || ''));

    const rawResume: TailoredResumeContent = {
      headline: `${profile.currentTitle || jobTitle} | Focus on ${jobCompany}`,
      professionalSummary: `${profile.fullName} is a dedicated professional with proven experience in ${jobFamily.replace('_', ' ')}. Demonstrated background includes ${skillNames.slice(0, 4).join(', ')}.`,
      targetedSkills: skillNames.slice(0, 10),
      tailoredExperiences: profile.experiences.map(e => {
        const cleanBullets = ((e.achievements && e.achievements.length > 0) ? e.achievements : (e.description ? [e.description] : []))
          .map((b: any) => (typeof b === 'string' ? b.trim() : ''))
          .filter((b: string) => b.length > 0 && !isInvalidToken(b));

        return {
          company: e.company,
          role: e.role,
          period: formatExperiencePeriod(e.startDate, e.endDate, e.current),
          bulletPoints: cleanBullets,
        };
      }),
      education: profile.education.map(e => `${e.degree} — ${e.institution} (${e.graduationYear})`),
      certifications: profile.certifications.map(c => `${c.name} (${c.issuingOrg})`),
      truthfulnessScore: 100,
    };

    const audit = workerResumeEngine.validateTruthfulness(rawResume, profile);
    rawResume.truthfulnessAuditPassed = audit.passed;
    rawResume.truthfulnessScore = audit.score;
    rawResume.auditNotes = audit.issues;

    return {
      tailoredResume: rawResume,
      coverLetter: `Dear Hiring Team at ${jobCompany},\n\nI am excited to apply for the ${jobTitle} position at ${jobCompany}. With over ${profile.totalExperienceYears} years of experience and core strengths in ${skillNames.slice(0, 3).join(', ')}, I look forward to bringing immediate value to your team.\n\nThank you for considering my application.\n\nSincerely,\n${profile.fullName}`,
      truthfulnessScore: audit.score,
      auditIssues: audit.issues,
    };
  },

  /**
   * Generates a clean, ATS-formatted DOCX buffer using docx library.
   */
  async generateDocx(profile: UserProfile, tailored: TailoredResumeContent): Promise<Buffer> {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: profile.fullName,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `${profile.email} | ${profile.phone} | ${profile.location}`, size: 20 }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: tailored.headline,
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [new TextRun({ text: tailored.professionalSummary, size: 22 })],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'Core Competencies & Skills',
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [new TextRun({ text: (tailored.targetedSkills || []).join(' • '), size: 22 })],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'Professional Experience',
              heading: HeadingLevel.HEADING_2,
            }),
            ...(tailored.tailoredExperiences || []).flatMap(exp => [
              new Paragraph({
                children: [
                  new TextRun({ text: `${exp.role} — ${exp.company}`, bold: true, size: 22 }),
                  ...(exp.period ? [new TextRun({ text: `   (${exp.period})`, italics: true, size: 20 })] : []),
                ],
              }),
              ...(exp.bulletPoints || [])
                .map((b: any) => (typeof b === 'string' ? b.trim() : ''))
                .filter((b: string) => b.length > 0)
                .map(
                  b =>
                    new Paragraph({
                      bullet: { level: 0 },
                      children: [new TextRun({ text: b, size: 21 })],
                    })
                ),
              new Paragraph({ text: '' }),
            ]),
            new Paragraph({
              text: 'Education',
              heading: HeadingLevel.HEADING_2,
            }),
            ...profile.education.map(
              edu =>
                new Paragraph({
                  children: [
                    new TextRun({ text: `${edu.degree} in ${edu.fieldOfStudy}`, bold: true, size: 22 }),
                    new TextRun({ text: ` — ${edu.institution} (${edu.graduationYear})`, size: 21 }),
                  ],
                })
            ),
          ],
        },
      ],
    });

    return await Packer.toBuffer(doc);
  },
};
