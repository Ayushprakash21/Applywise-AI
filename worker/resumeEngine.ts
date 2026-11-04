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
import mammoth from 'mammoth';
import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from 'docx';
import { UserProfile, TailoredResumeContent, VerifiedSkill, ExperienceItem, StructuredExtractionOutput } from '../src/types/index.ts';
import { detectJobFamily } from './matchingEngine.ts';

export interface ExtractionResult {
  text: string;
  isScanned: boolean;
  pageCount?: number;
  format: 'pdf' | 'docx';
  warning?: string;
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
  type RawEmploymentRecord
} from '../src/utils/structuralEmploymentParser.ts';

export type { ParsedEmploymentDates, RawEmploymentRecord };
export {
  parseEmploymentDates,
  parseStructuralEmploymentHistory,
  isInvalidToken
};

export const workerResumeEngine = {
  /**
   * Validate and extract text safely from uploaded file buffer.
   */
  async extractText(buffer: Buffer | ArrayBuffer, originalName: string, mimeType: string): Promise<ExtractionResult> {
    const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

    if (!nodeBuf || nodeBuf.length === 0) {
      throw new Error('Uploaded document is empty (0 bytes).');
    }

    if (nodeBuf.length > 10 * 1024 * 1024) {
      throw new Error('File size exceeds the 10MB limit.');
    }

    const lowerName = originalName.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || mimeType === 'application/pdf';
    const isDocx = lowerName.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPdf && !isDocx) {
      throw new Error('Unsupported file format. Please upload a PDF (.pdf) or Microsoft Word (.docx) document.');
    }

    if (isPdf) {
      const header = nodeBuf.subarray(0, 5).toString('ascii');
      if (!header.startsWith('%PDF-')) {
        throw new Error('Malformed PDF file: Invalid PDF header signature.');
      }

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
          .replace(/[ \t]+/g, ' ')
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
          throw new Error('The PDF document is password-protected or encrypted. Please provide an unencrypted document.');
        }
        throw new Error(`Failed to extract text from PDF: ${msg}`);
      }
    } else {
      // Validate DOCX OpenXML ZIP header signature (PK\x03\x04)
      if (nodeBuf.length < 4 || nodeBuf[0] !== 0x50 || nodeBuf[1] !== 0x4B || nodeBuf[2] !== 0x03 || nodeBuf[3] !== 0x04) {
        throw new Error('Failed to extract text from Word document: Malformed DOCX file (invalid ZIP archive header).');
      }

      try {
        const result = await mammoth.extractRawText({ buffer: nodeBuf });
        const rawText = result.value ? result.value.trim() : '';

        if (rawText.length < 40) {
          return {
            text: '',
            isScanned: true,
            format: 'docx',
            warning: 'This Word document contains minimal or no extractable text.',
          };
        }

        const normalizedText = rawText
          .replace(/\r\n/g, '\n')
          .replace(/[ \t]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        return {
          text: normalizedText,
          isScanned: false,
          format: 'docx',
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to extract text from Word document: ${msg}`);
      }
    }
  },

  /**
   * Structure extracted resume text via Gemini API, or fallback to deterministic heuristic parser.
   */
  async structureProfileDetailed(text: string, existingProfile?: UserProfile | null, apiKey?: string): Promise<StructuredExtractionOutput> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const validationErrors: string[] = [];

    if (!apiKey) {
      const heuristicFields = workerResumeEngine.heuristicParse(text, existingProfile);
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
      const prompt = `You are a precise, truth-focused ATS resume parser.
Extract information ONLY if directly supported by the resume text. Do NOT hallucinate credentials or employers.

Resume text:
"""
${text.slice(0, 10000)}
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
    "achievements": string[],
    "verifiedSkillsUsed": string[]
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
        const fallbackFields = workerResumeEngine.heuristicParse(text, existingProfile);
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

      const parsedExperiences: ExperienceItem[] = Array.isArray(parsed.experiences)
        ? parsed.experiences
            .filter((exp: any) => exp && exp.company && !isInvalidToken(exp.company) && !isInvalidToken(exp.role))
            .map((exp: any) => {
              const dateRes = parseEmploymentDates(exp.startDate ? `${exp.startDate} - ${exp.endDate || (exp.current ? 'Present' : '')}` : exp.period);
              if (dateRes.isDateUncertain) {
                warnings.push(`Employment dates uncertain for ${exp.company}: please verify.`);
              }
              return {
                id: crypto.randomUUID(),
                company: String(exp.company).trim(),
                role: String(exp.role || '').trim(),
                startDate: dateRes.startDate,
                endDate: dateRes.endDate,
                current: Boolean(dateRes.current),
                location: exp.location || '',
                description: exp.description || '',
                achievements: Array.isArray(exp.achievements) ? exp.achievements : [],
                verifiedSkillsUsed: Array.isArray(exp.verifiedSkillsUsed) ? exp.verifiedSkillsUsed : [],
                isDateUncertain: dateRes.isDateUncertain,
                dateWarning: dateRes.dateWarning,
                originalDateText: dateRes.originalDateText,
                needsVerification: dateRes.isDateUncertain,
              };
            })
        : [];

      const totalMonths = parsedExperiences.reduce((sum: number, exp: ExperienceItem) => {
        const d = parseEmploymentDates(exp.startDate ? `${exp.startDate} - ${exp.endDate || (exp.current ? 'Present' : '')}` : '');
        return sum + d.durationMonths;
      }, 0);
      const calculatedExpYears = Math.round(totalMonths / 12);
      const totalExperienceYears = typeof parsed.totalExperienceYears === 'number'
        ? parsed.totalExperienceYears
        : (calculatedExpYears || existingProfile?.totalExperienceYears || 0);

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
      const fallbackFields = workerResumeEngine.heuristicParse(text, existingProfile);

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
  async structureProfileWithAI(text: string, existingProfile?: UserProfile | null, apiKey?: string): Promise<UserProfile> {
    const detailed = await this.structureProfileDetailed(text, existingProfile, apiKey);
    return detailed.extractedFields;
  },

  /**
   * Fast, reliable heuristic parser across cross-industry domains.
   */
  heuristicParse(text: string, existingProfile?: UserProfile | null): UserProfile {
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

    // Structural experience extraction
    let parsedExperiences: ExperienceItem[] = existingProfile?.experiences ? [...existingProfile.experiences] : [];
    if (parsedExperiences.length === 0) {
      const structural = parseStructuralEmploymentHistory(text);
      parsedExperiences = structural.map((rec: RawEmploymentRecord) => ({
        id: crypto.randomUUID(),
        company: rec.company,
        role: rec.job_title,
        startDate: rec.start_date || '',
        endDate: rec.is_current ? 'Present' : (rec.end_date || ''),
        current: rec.is_current,
        location: rec.location || '',
        description: rec.description.join(' '),
        achievements: rec.description.filter((d: string) => /^[•\-*]/.test(d) || d.length > 30),
        verifiedSkillsUsed: [],
        isDateUncertain: rec.needs_verification,
        dateWarning: rec.needs_verification ? 'Employment dates not detected — Please verify.' : undefined,
        originalDateText: rec.original_date_text,
        confidence: rec.confidence,
        needsVerification: rec.needs_verification,
        employmentType: rec.employment_type,
        sourceText: rec.source_text
      }));
    }

    // Dynamic experience duration calculation
    const totalMonths = parsedExperiences.reduce((sum: number, exp: ExperienceItem) => {
      const d = parseEmploymentDates(exp.startDate ? `${exp.startDate} - ${exp.endDate || (exp.current ? 'Present' : '')}` : '');
      return sum + d.durationMonths;
    }, 0);
    const calculatedExpYears = Math.round(totalMonths / 12);
    const totalExperienceYears = existingProfile?.totalExperienceYears || calculatedExpYears || 0;

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
      currentTitle: existingProfile?.currentTitle || (parsedExperiences[0]?.role || ''),
      currentEmployer: existingProfile?.currentEmployer || (parsedExperiences[0]?.company || ''),
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
    const masterSkills = new Set(profile.skills.map(s => s.name.toLowerCase().trim()));

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

    const rawResume: TailoredResumeContent = {
      headline: `${profile.currentTitle || jobTitle} | Focus on ${jobCompany}`,
      professionalSummary: `${profile.fullName} is a dedicated professional with proven experience in ${jobFamily.replace('_', ' ')}. Demonstrated background includes ${profile.skills.slice(0, 4).map(s => s.name).join(', ')}.`,
      targetedSkills: profile.skills.map(s => s.name).slice(0, 10),
      tailoredExperiences: profile.experiences.map(e => ({
        company: e.company,
        role: e.role,
        period: `${e.startDate || ''} - ${e.current ? 'Present' : (e.endDate || '')}`,
        bulletPoints: (e.achievements && e.achievements.length > 0) ? e.achievements.filter((b): b is string => typeof b === 'string') : (e.description ? [e.description] : []),
      })),
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
      coverLetter: `Dear Hiring Team at ${jobCompany},\n\nI am excited to apply for the ${jobTitle} position at ${jobCompany}. With over ${profile.totalExperienceYears} years of experience and core strengths in ${profile.skills.slice(0, 3).map(s => s.name).join(', ')}, I look forward to bringing immediate value to your team.\n\nThank you for considering my application.\n\nSincerely,\n${profile.fullName}`,
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
                  new TextRun({ text: `   (${exp.period})`, italics: true, size: 20 }),
                ],
              }),
              ...(exp.bulletPoints || []).map(
                b =>
                  new Paragraph({
                    bullet: { level: 0 },
                    children: [new TextRun({ text: b || '', size: 21 })],
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
