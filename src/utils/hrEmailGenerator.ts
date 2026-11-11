// src/utils/hrEmailGenerator.ts
// Zero-Hallucination AI HR Outreach Email Generator & Grounding Auditor
// Uses candidate's verified profile & facts exclusively; supports 11 templates & 5 tones.

import {
  CareerPreferences,
  HrContact,
  JobVacancy,
  OutreachEmailTone,
  OutreachTemplateType,
  UserProfile,
} from '../types/index.ts';

export const OUTREACH_TEMPLATES: readonly OutreachTemplateType[] = [
  'Direct Job Application',
  'HR Introduction',
  'Referral Request',
  'Recruitment Enquiry',
  'Follow-up After Application',
  'Follow-up After Interview',
  'International Job Application',
  'Relocation and Visa Sponsorship Enquiry',
  'Supply Chain Role Application',
  'Project Management Role Application',
  'General Talent Acquisition Enquiry',
] as const;

export const OUTREACH_TONES: readonly OutreachEmailTone[] = [
  'Professional',
  'Executive',
  'Concise',
  'Confident',
  'International',
] as const;

export interface GenerateOutreachEmailInput {
  profile: UserProfile | null;
  preferences?: CareerPreferences | null;
  contact: HrContact;
  job?: JobVacancy | null;
  templateType: OutreachTemplateType;
  tone: OutreachEmailTone;
  customNotes?: string;
}

export interface GeneratedOutreachEmailResult {
  subject: string;
  bodyText: string;
  usedGemini: boolean;
  groundedQualifications: string[];
  missingDataNotices: string[];
  integrityAudit: {
    passed: boolean;
    warnings: string[];
  };
}

function getCandidateFirstLast(profile: UserProfile | null): { fullName: string; email: string; phone: string; location: string; title: string; linkedin?: string } {
  return {
    fullName: profile?.fullName?.trim() || 'Candidate',
    email: profile?.email?.trim() || '',
    phone: profile?.phone?.trim() || '',
    location: profile?.location?.trim() || '',
    title: profile?.currentTitle?.trim() || profile?.experiences?.[0]?.role?.trim() || '',
    linkedin: profile?.linkedinUrl?.trim() || undefined,
  };
}

function getSkillName(s: any): string {
  return typeof s === 'string' ? s : s?.name || '';
}

function getCertName(c: any): string {
  return typeof c === 'string' ? c : c?.name || '';
}

function extractGroundedHighlights(profile: UserProfile | null, job?: JobVacancy | null): {
  qualifications: string[];
  missing: string[];
} {
  if (!profile) {
    return {
      qualifications: [],
      missing: ['Candidate profile/resume has not been uploaded or verified yet.'],
    };
  }

  const missing: string[] = [];
  if (!profile.fullName) missing.push('Full name');
  if (!profile.experiences || profile.experiences.length === 0) missing.push('Employment history');
  if (!profile.skills || profile.skills.length === 0) missing.push('Verified skills');

  const qualifications: string[] = [];
  const jobText = `${job?.title || ''} ${job?.description || ''} ${(job?.requirements || []).join(' ')}`.toLowerCase();

  // Pick 2-3 genuinely supported achievements/experiences or skills prioritized by job overlap
  const allExp = profile.experiences || [];
  if (allExp.length > 0) {
    const latest = allExp[0];
    if (latest.role && latest.company) {
      const periodStr = latest.startDate ? ` (${latest.startDate} – ${latest.endDate || 'Present'})` : '';
      qualifications.push(`Current/most recent role as ${latest.role} at ${latest.company}${periodStr}`);
    }
    for (const exp of allExp.slice(0, 2)) {
      const achList = [...(exp.achievements || []), ...(exp.description ? [exp.description] : [])];
      for (const a of achList) {
        const trimmed = a.trim();
        if (trimmed.length >= 15 && qualifications.length < 3) {
          qualifications.push(trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed);
        }
      }
    }
  }

  // Skills overlap
  if (profile.skills && profile.skills.length > 0) {
    const skillNames = profile.skills.map(getSkillName).filter(Boolean);
    const overlapping = jobText
      ? skillNames.filter((s) => jobText.includes(s.toLowerCase()))
      : [];
    const chosenSkills = (overlapping.length > 0 ? overlapping : skillNames).slice(0, 6);
    if (chosenSkills.length > 0 && qualifications.length < 3) {
      qualifications.push(`Core competencies in ${chosenSkills.join(', ')}`);
    }
  }

  // Certifications
  if (profile.certifications && profile.certifications.length > 0 && qualifications.length < 4) {
    const certNames = profile.certifications.map(getCertName).filter(Boolean).slice(0, 2);
    if (certNames.length > 0) {
      qualifications.push(`Certified in ${certNames.join(', ')}`);
    }
  }

  return { qualifications: qualifications.slice(0, 4), missing };
}

/**
 * Builds the strict zero-hallucination Gemini prompt for outreach email drafting.
 */
export function buildOutreachEmailPrompt(input: GenerateOutreachEmailInput): string {
  const { profile, preferences, contact, job, templateType, tone, customNotes } = input;
  const { qualifications, missing } = extractGroundedHighlights(profile, job);

  const verifiedFactsBlock = profile
    ? JSON.stringify(
        {
          fullName: profile.fullName,
          currentTitle: profile.currentTitle,
          location: profile.location,
          summary: profile.summary,
          skills: (profile.skills || []).map(getSkillName).filter(Boolean).slice(0, 25),
          experiences: (profile.experiences || []).slice(0, 5).map((e) => ({
            role: e.role,
            company: e.company,
            startDate: e.startDate,
            endDate: e.endDate,
            achievements: (e.achievements || []).slice(0, 3),
          })),
          education: (profile.education || []).slice(0, 3),
          certifications: (profile.certifications || []).slice(0, 5),
          workAuthorizationCountry: profile.workAuthorizationCountry || 'Not specified',
          visaSponsorshipRequired: preferences?.visaSponsorshipRequired ?? 'Not specified',
          targetRoles: preferences?.targetRoles || [],
        },
        null,
        2
      )
    : 'NO VERIFIED PROFILE ON FILE';

  return `You are an executive career communications specialist for ApplyVise AI.
Write a crisp, high-signal, authentic email for the candidate.

STRICT ZERO-HALLUCINATION RULES:
1. NEVER invent years of experience, employment history, employers, certifications, degrees, technical skills, metrics, work authorization, visa eligibility, or prior conversations with HR.
2. Rely EXCLUSIVELY on the Verified Candidate Facts below. If a detail is missing (e.g. visa status or specific skills), omit it or state clearly without fabricating.
3. Avoid generic AI filler, clichés ("I am writing to express my enthusiastic interest in..."), or excessive flattery. Keep it concise, direct, human, and respectful of the recruiter's time.

REQUIRED STRUCTURE:
- Appropriate Subject line
- Professional Greeting (use recruiter name "${contact.contactName || ''}" if present, otherwise "${contact.designation || 'Hiring Team'}")
- Short Candidate Introduction
- 2 to 3 genuinely supported qualifications/experiences relevant to the opportunity
- Why the candidate aligns with ${contact.companyName}${job ? ` and the ${job.title} role` : ''}
- Clear expression of interest & polite call to action (referencing attached resume)
- Professional closing with candidate contact details

TEMPLATE: ${templateType}
TONE: ${tone}

RECIPIENT HR CONTACT:
- Name: ${contact.contactName || 'Not publicly listed (use professional team/role greeting)'}
- Designation: ${contact.designation}
- Company: ${contact.companyName}
- Country: ${contact.country}
- Department: ${contact.department || 'Talent Acquisition'}

TARGET JOB OPPORTUNITY:
${
  job
    ? `- Title: ${job.title}\n- Company: ${job.company}\n- Location: ${job.location} (${job.country})\n- Key Requirements: ${(job.requirements || []).slice(0, 8).join('; ') || job.description.slice(0, 600)}`
    : '- General / Proactive Talent Acquisition Outreach (no single specific posting selected)'
}

PRE-EXTRACTED GROUNDED HIGHLIGHTS:
${qualifications.join('\n') || 'None available'}
${missing.length > 0 ? `MISSING PROFILE SECTIONS (DO NOT INVENT): ${missing.join(', ')}` : ''}
${customNotes ? `CANDIDATE ADDITIONAL INSTRUCTIONS (ONLY USE FACTUAL PREFERENCES): ${customNotes}` : ''}

VERIFIED CANDIDATE FACTS (GROUND TRUTH):
${verifiedFactsBlock}

Respond ONLY with valid JSON:
{
  "subject": "...",
  "bodyText": "..."
}`;
}

/**
 * Deterministic zero-hallucination email generator (used offline / in tests / when Gemini key is unavailable).
 */
export function generateDeterministicGroundedEmail(input: GenerateOutreachEmailInput): GeneratedOutreachEmailResult {
  const { profile, contact, job, templateType, tone, preferences } = input;
  const cand = getCandidateFirstLast(profile);
  const { qualifications, missing } = extractGroundedHighlights(profile, job);

  const greetingName = contact.contactName ? contact.contactName : `${contact.designation || 'Talent Acquisition Team'}`;
  const greeting = tone === 'Concise' ? `Hi ${greetingName},` : `Dear ${greetingName},`;
  const company = contact.companyName;
  const roleLabel = job?.title || cand.title || preferences?.targetRoles?.[0] || 'relevant opportunities';

  let subject = `Application: ${roleLabel} — ${cand.fullName}`;
  if (templateType === 'HR Introduction' || templateType === 'General Talent Acquisition Enquiry') {
    subject = `Introduction: ${cand.title || 'Candidate'} interested in ${company}`;
  } else if (templateType === 'Referral Request') {
    subject = `Brief enquiry regarding ${roleLabel} at ${company}`;
  } else if (templateType === 'Follow-up After Application') {
    subject = `Follow-up: Application for ${roleLabel} — ${cand.fullName}`;
  } else if (templateType === 'Follow-up After Interview') {
    subject = `Thank you & Follow-up: ${roleLabel} interview — ${cand.fullName}`;
  } else if (templateType === 'International Job Application' || templateType === 'Relocation and Visa Sponsorship Enquiry') {
    subject = `International Candidate Application: ${roleLabel} (${contact.country}) — ${cand.fullName}`;
  } else if (templateType === 'Supply Chain Role Application') {
    subject = `Supply Chain Application: ${roleLabel} — ${cand.fullName}`;
  } else if (templateType === 'Project Management Role Application') {
    subject = `Project Management Application: ${roleLabel} — ${cand.fullName}`;
  } else if (templateType === 'Recruitment Enquiry') {
    subject = `Recruitment Enquiry: ${roleLabel} at ${company}`;
  }

  let intro = '';
  if (templateType === 'Follow-up After Application') {
    intro = `I recently submitted my application for the ${roleLabel} position at ${company} and wanted to share a brief direct introduction along with my resume for your review.`;
  } else if (templateType === 'Follow-up After Interview') {
    intro = `Thank you for coordinating my recent conversation regarding the ${roleLabel} role at ${company}. I remain very interested in contributing to your team.`;
  } else if (templateType === 'International Job Application' || templateType === 'Relocation and Visa Sponsorship Enquiry') {
    const authClause = profile?.workAuthorizationCountry
      ? ` Regarding international mobility, my current work authorization is: ${profile.workAuthorizationCountry}.`
      : ' Please let me know if international relocation support is considered for this opening.';
    intro = `I am writing to express my interest in the ${roleLabel} opportunity at ${company} in ${contact.country}.${authClause}`;
  } else if (templateType === 'HR Introduction' || templateType === 'General Talent Acquisition Enquiry' || templateType === 'Recruitment Enquiry') {
    intro = cand.title
      ? `I am a ${cand.title}${cand.location ? ` based in ${cand.location}` : ''}, reaching out regarding ${roleLabel} opportunities at ${company}.`
      : `I am reaching out to introduce my background regarding ${roleLabel} opportunities at ${company}.`;
  } else {
    intro = cand.title
      ? `I am writing to apply directly for the ${roleLabel} opportunity at ${company}. Currently serving as ${cand.title}, my background aligns closely with your team's scope.`
      : `I am writing to apply directly for the ${roleLabel} opportunity at ${company}.`;
  }

  if (tone === 'Executive') {
    intro = intro.replace('I am writing to apply directly', 'I am reaching out regarding');
  } else if (tone === 'Confident') {
    intro = `${intro} Based on my verified track record, I can contribute immediate operational impact.`;
  }

  const qualBlock =
    qualifications.length > 0
      ? `Key verified qualifications from my background:\n${qualifications.map((q) => `• ${q}`).join('\n')}`
      : `Please find my attached resume detailing my work experience and capabilities.`;

  const closingCta =
    tone === 'Concise'
      ? `I have attached my resume for consideration and would welcome a brief conversation if my profile matches your requirements.`
      : `I have attached my resume for your review. Should my background align with ${company}'s current hiring priorities, I would welcome the opportunity to discuss how I can support the team.`;

  const signOffLine = [cand.fullName, cand.title, cand.email, cand.phone, cand.linkedin].filter(Boolean).join('\n');

  const bodyText = `${greeting}\n\n${intro}\n\n${qualBlock}\n\n${closingCta}\n\nBest regards,\n${signOffLine}`;

  const audit = auditGeneratedEmailClaims(bodyText, profile);

  return {
    subject,
    bodyText,
    usedGemini: false,
    groundedQualifications: qualifications,
    missingDataNotices: missing,
    integrityAudit: audit,
  };
}

/**
 * Post-generation claim audit: detects potential fabricated tenure claims or hallucinated known employers.
 */
export function auditGeneratedEmailClaims(
  bodyText: string,
  profile: UserProfile | null
): { passed: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!profile) {
    return {
      passed: bodyText.length > 0,
      warnings: ['Profile unavailable for full factual cross-verification. Review claims manually before sending.'],
    };
  }

  // Check if email asserts "X+ years of experience" without supporting experience count
  const yearClaimMatch = bodyText.match(/\b(\d{1,2})\+?\s+years\s+of\s+experience/i);
  if (yearClaimMatch) {
    const claimedYears = parseInt(yearClaimMatch[1], 10);
    const expCount = profile.experiences?.length || 0;
    if (expCount === 0 || claimedYears > 25) {
      warnings.push(`Email mentions "${yearClaimMatch[0]}" — confirm this matches your verified employment dates.`);
    }
  }

  // Check if candidate's verified profile has employers, ensure fabricated brand names aren't injected
  const verifiedEmployers = new Set((profile.experiences || []).map((e) => e.company.toLowerCase()));
  const suspiciousClaims = ['worked at google', 'worked at meta', 'worked at amazon', 'ex-google', 'ex-meta'];
  const lower = bodyText.toLowerCase();
  for (const s of suspiciousClaims) {
    const brand = s.replace(/worked at |ex-/g, '').trim();
    if (lower.includes(s) && !verifiedEmployers.has(brand)) {
      warnings.push(`Unverified employer reference detected ("${s}").`);
    }
  }

  return {
    passed: warnings.length === 0,
    warnings,
  };
}
