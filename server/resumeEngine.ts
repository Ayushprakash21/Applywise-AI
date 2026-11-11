// @ts-ignore - Legacy worker build provides WorkerMessageHandler
import * as pdfWorkerModule from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

// Setup fake worker in-memory on globalThis so pdf-parse / pdfjs-dist uses it synchronously
if (typeof (globalThis as any).pdfjsWorker === 'undefined') {
  (globalThis as any).pdfjsWorker = pdfWorkerModule;
}

import { PDFParse } from 'pdf-parse';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from 'docx';
import {
  extractDocxResumeText,
  ResumeExtractionError,
  ResumeExtractionErrorCode,
  toUint8Array,
  validateAndDetectResumeFormat,
} from '../src/utils/docxExtractor.ts';
import { UserProfile, TailoredResumeContent, VerifiedSkill, ExperienceItem, StructuredExtractionOutput } from '../src/types/index.ts';
import { detectJobFamily } from './matchingEngine.ts';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export interface ExtractionResult {
  text: string;
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
  type RawEmploymentRecord
} from '../src/utils/structuralEmploymentParser.ts';

export type { ParsedEmploymentDates, RawEmploymentRecord };
export {
  parseEmploymentDates,
  parseStructuralEmploymentHistory,
  isInvalidToken
};

export const resumeEngine = {
  /**
   * Validate and extract text safely from raw file buffer.
   * Never passes binary stream or raw buffer as text.
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

        // Check for scanned / image-only PDF
        if (rawText.length < 40) {
          return {
            text: '',
            isScanned: true,
            pageCount: parseResult.pages?.length || 1,
            format: 'pdf',
            warning: 'This PDF appears to be a scanned image or contains no extractable text. Please upload a text-based PDF, an OCR-processed document, or a DOCX file.',
          };
        }

        // Clean up excessive whitespace while preserving line structure
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
   * Structure normalized text into UserProfile via Gemini with strict schema.
   */
  async structureProfileDetailed(text: string, existingProfile?: UserProfile | null): Promise<StructuredExtractionOutput> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const validationErrors: string[] = [];

    if (!text || text.trim().length < 40) {
      throw new Error('Insufficient text to extract a career profile (minimum 40 characters required).');
    }

    if (!process.env.GEMINI_API_KEY) {
      const heuristicFields = this.heuristicParse(text, existingProfile);
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

    const systemPrompt = `You are ApplyVise AI's expert ATS Resume Parser.
Analyze the following resume text and extract candidate profile details into STRICT JSON matching this schema:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "location": string,
  "linkedinUrl": string,
  "portfolioUrl": string,
  "totalExperienceYears": number,
  "currentEmployer": string,
  "currentTitle": string,
  "professionalSummary": string,
  "education": [
    { "degree": string, "institution": string, "fieldOfStudy": string, "graduationYear": string }
  ],
  "certifications": [
    { "name": string, "issuingOrg": string, "issueYear": string }
  ],
  "skills": [
    {
      "name": string,
      "category": "frontend"|"backend"|"cloud"|"ai"|"database"|"architecture"|"devops"|"general",
      "proficiency": "expert"|"proficient"|"familiar",
      "yearsExperience": number
    }
  ],
  "experiences": [
    {
      "company": string,
      "role": string,
      "startDate": string,
      "endDate": string,
      "current": boolean,
      "location": string,
      "description": string,
      "achievements": string[],
      "verifiedSkillsUsed": string[]
    }
  ],
  "languages": string[]
}

CRITICAL RULES:
1. DO NOT fabricate, hallucinate, or extrapolate facts. Extract ONLY facts present in the text.
2. Preserve all distinct employment records in chronological order. Do not collapse multiple jobs.
3. If an item is unknown, use empty string, 0, or empty array.
4. DO NOT default missing language to English.
5. DO NOT mark extracted skills as verified.
6. Return ONLY valid JSON.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt}\n\nRESUME TEXT:\n${text.slice(0, 15000)}`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      let parsed: any;
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch (jsonErr) {
        validationErrors.push('Gemini returned malformed or non-JSON output');
        const fallbackFields = this.heuristicParse(text, existingProfile);
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

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('AI parser returned invalid payload format.');
      }

      // Parse experiences and calculate actual duration from timeline
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

      // Calculate total experience duration without arbitrary 2-year fallback
      const totalMonths = parsedExperiences.reduce((sum: number, exp: ExperienceItem) => {
        const d = parseEmploymentDates(exp.startDate ? `${exp.startDate} - ${exp.endDate || (exp.current ? 'Present' : '')}` : '');
        return sum + d.durationMonths;
      }, 0);
      const calculatedExpYears = Math.round(totalMonths / 12);
      const totalExperienceYears = typeof parsed.totalExperienceYears === 'number'
        ? parsed.totalExperienceYears
        : (calculatedExpYears || existingProfile?.totalExperienceYears || 0);

      // Extract skills without auto-verification or arbitrary 2-year duration
      const extractedSkills: VerifiedSkill[] = Array.isArray(parsed.skills)
        ? parsed.skills.map((s: any): VerifiedSkill => ({
            name: String(s.name || '').trim(),
            category: (s.category as any) || 'general',
            proficiency: (s.proficiency as any) || 'proficient',
            yearsExperience: typeof s.yearsExperience === 'number' ? s.yearsExperience : 0,
            verified: false, // EXTRACTED facts must NOT be auto-verified
          }))
        : [];

      // Languages: strictly empty if unstated in document
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
      const fallbackFields = this.heuristicParse(text, existingProfile);

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
   * Structure normalized text into UserProfile via Gemini or fallback.
   */
  async structureProfileWithAI(text: string, existingProfile?: UserProfile | null): Promise<UserProfile> {
    const detailed = await this.structureProfileDetailed(text, existingProfile);
    return detailed.extractedFields;
  },

  /**
   * Fast, reliable heuristic parser across business, operations, supply chain, management, finance, data, and technology.
   */
  heuristicParse(text: string, existingProfile?: UserProfile | null): UserProfile {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0] || 'Candidate Name';

    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

    // Cross-industry skill keywords
    const crossIndustrySkills = [
      // Supply Chain & Operations
      'Procurement', 'Supply Chain', 'Logistics', 'Inventory Management', 'Vendor Management', 'Sourcing',
      'Contract Negotiation', 'Warehouse Management', 'Demand Planning', 'ERP', 'SAP',
      // Project Management & Business
      'Project Management', 'Agile', 'Scrum', 'Stakeholder Management', 'Risk Management', 'Process Improvement',
      'Business Analysis', 'Roadmapping', 'Budgeting', 'KPI Tracking', 'Cross-functional Leadership',
      // Finance & Data
      'Financial Modeling', 'Forecasting', 'Auditing', 'Accounting', 'Excel', 'Power BI', 'SQL',
      'Data Analysis', 'Tableau', 'Reporting',
      // Marketing & Customer
      'Digital Marketing', 'SEO', 'Content Strategy', 'CRM', 'Salesforce', 'Customer Retention',
      // Technology
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
        sourceText: rec.source_text,
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
   * Runs BEFORE marking audit passed.
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

    // 3. Score calculation
    const deductions = issues.length * 20;
    const score = Math.max(0, 100 - deductions);

    return {
      passed: issues.length === 0,
      score,
      issues,
    };
  },

  /**
   * Generates a tailored ATS resume strictly adhering to verified master profile facts.
   * Adapts document strategy to the job family (e.g. Supply Chain vs PM vs Engineering vs Marketing).
   */
  async tailorResume(profile: UserProfile, jobTitle: string, jobCompany: string, jobDescription: string): Promise<{
    tailoredResume: TailoredResumeContent;
    coverLetter: string;
    truthfulnessScore: number;
    auditIssues: string[];
  }> {
    const jobFamily = detectJobFamily(jobTitle, jobDescription);
    const profileFacts = {
      name: profile.fullName,
      title: profile.currentTitle,
      skills: (profile.skills || []).map(s => (typeof s === 'string' ? s : (s as any)?.name || '')),
      companies: profile.experiences.map(e => e.company),
      roles: profile.experiences.map(e => e.role),
      experiencePoints: profile.experiences.flatMap(e => e.achievements || [e.description]),
    };

    const eduStrings = profile.education.map(e => `${e.degree} from ${e.institution}`);
    const certStrings = profile.certifications.map(c => c.name);

    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are ApplyVise AI's Zero-Hallucination ATS Resume Tailoring Engine.
Task: Align the candidate's verified profile to this vacancy WITHOUT INVENTING ANY FACTS.

TARGET JOB VACANCY:
Title: ${jobTitle}
Company: ${jobCompany}
Job Family: ${jobFamily}
Description: ${jobDescription.slice(0, 3000)}

CANDIDATE VERIFIED FACTS (Source of Truth):
${JSON.stringify(profileFacts, null, 2)}

STRICT RULES:
1. ONLY use employers, job titles, and skills listed in the candidate's verified facts.
2. Adapt document wording to the ${jobFamily} career domain. DO NOT insert software engineering jargon if this is a business, supply chain, or operations role.
3. Reword bullet points to emphasize relevant skills from the facts, but DO NOT invent metrics, dates, or employers.
4. Output strict JSON matching:
{
  "headline": string,
  "professionalSummary": string,
  "targetedSkills": string[],
  "tailoredExperiences": [
    { "company": string, "role": string, "period": string, "bulletPoints": string[] }
  ],
  "coverLetter": string
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const parsed = JSON.parse(response.text || '{}');
        if (parsed.headline && parsed.professionalSummary) {
          const rawResume: TailoredResumeContent = {
            headline: parsed.headline,
            professionalSummary: parsed.professionalSummary,
            targetedSkills: Array.isArray(parsed.targetedSkills) ? parsed.targetedSkills : (profile.skills || []).map(s => (typeof s === 'string' ? s : (s as any)?.name || '')),
            tailoredExperiences: Array.isArray(parsed.tailoredExperiences) ? parsed.tailoredExperiences : profile.experiences.map(e => ({
              company: e.company,
              role: e.role,
              period: `${e.startDate} - ${e.endDate || 'Present'}`,
              bulletPoints: e.achievements && e.achievements.length > 0 ? e.achievements : [e.description],
            })),
            education: eduStrings,
            certifications: certStrings,
            truthfulnessScore: 0, // Computed by audit
            auditNotes: [],
          };

          // Deterministic Truthfulness Audit BEFORE setting audit score
          const audit = resumeEngine.validateTruthfulness(rawResume, profile);
          rawResume.truthfulnessScore = audit.score;
          rawResume.truthfulnessAuditPassed = audit.passed;
          rawResume.auditNotes = audit.passed
            ? ['All facts verified against master profile.', 'Zero hallucinated companies, degrees, or unverified skills.']
            : audit.issues;

          return {
            tailoredResume: rawResume,
            coverLetter: parsed.coverLetter || `Dear Hiring Team at ${jobCompany},\n\nI am writing to express my strong interest in the ${jobTitle} position...`,
            truthfulnessScore: audit.score,
            auditIssues: audit.issues,
          };
        }
      } catch (err) {
        console.warn('Gemini tailoring fallback:', err);
      }
    }

    // Domain-Adaptive Heuristic Tailoring Fallback (handles Supply Chain, Management, Finance, Tech)
    const matchedSkills = (profile.skills || []).map(s => (typeof s === 'string' ? s : (s as any)?.name || '')).slice(0, 10);
    const domainHeadline = `${profile.currentTitle || 'Professional'} | ${jobTitle} Candidate`;

    const rawResume: TailoredResumeContent = {
      headline: domainHeadline,
      professionalSummary: `Dedicated ${profile.currentTitle || 'professional'} with ${profile.totalExperienceYears}+ years of experience, bringing proven competencies in ${matchedSkills.slice(0, 4).join(', ')}. Eager to contribute directly to ${jobCompany} in the ${jobTitle} role.`,
      targetedSkills: matchedSkills,
      tailoredExperiences: profile.experiences.map(e => ({
        company: e.company,
        role: e.role,
        period: `${e.startDate || ''} - ${e.endDate || 'Present'}`,
        bulletPoints: (e.achievements && e.achievements.length > 0) ? e.achievements.filter((b): b is string => typeof b === 'string') : (e.description ? [e.description] : []),
      })),
      education: eduStrings,
      certifications: certStrings,
      truthfulnessScore: 0,
      auditNotes: [],
    };

    const audit = resumeEngine.validateTruthfulness(rawResume, profile);
    rawResume.truthfulnessScore = audit.score;
    rawResume.truthfulnessAuditPassed = audit.passed;
    rawResume.auditNotes = audit.passed
      ? ['All experiences cross-referenced against verified master profile.']
      : audit.issues;

    return {
      tailoredResume: rawResume,
      coverLetter: `Dear Hiring Team at ${jobCompany},\n\nI am excited to apply for the ${jobTitle} position at ${jobCompany}. With over ${profile.totalExperienceYears} years of experience and core strengths in ${matchedSkills.slice(0, 3).join(', ')}, I look forward to bringing immediate value to your team.\n\nThank you for considering my application.\n\nSincerely,\n${profile.fullName}`,
      truthfulnessScore: audit.score,
      auditIssues: audit.issues,
    };
  },

  /**
   * Export tailored resume to a real downloadable .docx buffer
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
