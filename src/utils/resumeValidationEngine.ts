// src/utils/resumeValidationEngine.ts
// Comprehensive 10-Category Resume Integrity, Truthfulness & Pre-Download Validation Engine
// Enforces zero-hallucination contracts before any resume preview or DOCX/PDF export is permitted.

import type { UserProfile, TailoredResumeContent, CandidateFact, ExperienceItem } from '../types/index.ts';
import { isInvalidToken, isDescriptionOrBullet, formatExperiencePeriod } from './structuralEmploymentParser.ts';

export type ResumeValidationStatus = 'VALID' | 'VALID_WITH_WARNINGS' | 'NEEDS_CANDIDATE_REVIEW' | 'BLOCKED';

export type ValidationSeverity = 'OK' | 'WARNING' | 'REVIEW_REQUIRED' | 'BLOCKER';

export type ValidationCategoryName =
  | 'Employment'
  | 'Dates'
  | 'Chronology'
  | 'Skills'
  | 'Education'
  | 'Certifications'
  | 'Achievements'
  | 'Formatting'
  | 'Completeness'
  | 'Export';

export interface CategoryValidationResult {
  category: ValidationCategoryName;
  passed: boolean;
  severity: ValidationSeverity;
  issues: string[];
}

export interface StructuredResumeValidationResult {
  status: ResumeValidationStatus;
  isDownloadable: boolean;
  score: number;
  blockers: string[];
  warnings: string[];
  reviewItems: string[];
  categoryResults: CategoryValidationResult[];
  auditTimestamp: string;
}

/**
 * Validates a tailored resume against the candidate's master profile and verified facts
 * across all 10 architectural categories.
 */
export function validateTailoredResumePackage(
  tailored: TailoredResumeContent | null | undefined,
  profile: UserProfile | null | undefined,
  facts: CandidateFact[] = []
): StructuredResumeValidationResult {
  const categoryResults: CategoryValidationResult[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  const reviewItems: string[] = [];

  const now = new Date().toISOString();

  if (!tailored || !profile) {
    return {
      status: 'BLOCKED',
      isDownloadable: false,
      score: 0,
      blockers: ['Missing tailored resume document or candidate profile.'],
      warnings: [],
      reviewItems: [],
      categoryResults: [
        {
          category: 'Completeness',
          passed: false,
          severity: 'BLOCKER',
          issues: ['Resume document or profile is missing.'],
        },
      ],
      auditTimestamp: now,
    };
  }

  const masterCompanies = new Set(
    profile.experiences.map((e) => e.company.toLowerCase().trim()).filter(Boolean)
  );
  const factCompanies = new Set(
    facts
      .filter((f) => f.category.toUpperCase() === 'EMPLOYMENT' && f.field === 'company')
      .map((f) => f.value.toLowerCase().trim())
  );
  const allVerifiedCompanies = new Set([...Array.from(masterCompanies), ...Array.from(factCompanies)]);

  const masterSkills = new Set(
    (profile.skills || []).map((s) => (typeof s === 'string' ? s : s.name).toLowerCase().trim())
  );
  const factSkills = new Set(
    facts.filter((f) => f.category.toUpperCase() === 'SKILL').map((f) => f.value.toLowerCase().trim())
  );
  const allVerifiedSkills = new Set([...Array.from(masterSkills), ...Array.from(factSkills)]);

  const masterAchievements = profile.experiences
    .flatMap((e) => e.achievements || [e.description])
    .filter((a): a is string => typeof a === 'string')
    .map((a) => a.toLowerCase().trim());

  // 1. Employment Category
  const empIssues: string[] = [];
  let empSeverity: ValidationSeverity = 'OK';
  const tailoredExps = tailored.tailoredExperiences || [];

  if (tailoredExps.length === 0 && profile.experiences.length > 0) {
    empIssues.push('Tailored resume dropped all employment records from candidate profile.');
    empSeverity = 'BLOCKER';
  }

  for (const exp of tailoredExps) {
    const comp = (exp.company || '').trim();
    const role = (exp.role || '').trim();

    if (!comp || comp === 'Employer not detected') {
      empIssues.push(`Experience entry has missing employer.`);
      empSeverity = 'BLOCKER';
    } else if (isInvalidToken(comp) || isDescriptionOrBullet(comp)) {
      empIssues.push(`Invalid token or sentence fragment used as employer: "${comp}".`);
      empSeverity = 'BLOCKER';
    }

    if (!role || role === 'Title not detected') {
      empIssues.push(`Experience entry at "${comp}" has missing job title.`);
      empSeverity = empSeverity === 'BLOCKER' ? 'BLOCKER' : 'REVIEW_REQUIRED';
    } else if (isInvalidToken(role) || isDescriptionOrBullet(role)) {
      empIssues.push(`Invalid token or sentence fragment used as job title: "${role}".`);
      empSeverity = 'BLOCKER';
    }

    // Verify employer exists in verified master profile
    const compLower = comp.toLowerCase();
    const matched = Array.from(allVerifiedCompanies).some(
      (vc) => vc.includes(compLower) || compLower.includes(vc)
    );
    if (!matched && allVerifiedCompanies.size > 0) {
      empIssues.push(`Unverified employer in tailored experience: "${comp}".`);
      empSeverity = 'BLOCKER';
    }
  }

  categoryResults.push({
    category: 'Employment',
    passed: empIssues.length === 0,
    severity: empSeverity,
    issues: empIssues,
  });

  // 2. Dates Category
  const dateIssues: string[] = [];
  let dateSeverity: ValidationSeverity = 'OK';
  const periodsSeen = new Set<string>();

  for (const exp of tailoredExps) {
    const p = (exp.period || '').trim();
    if (!p) {
      dateIssues.push(`Employment period missing for "${exp.role} at ${exp.company}".`);
      if (dateSeverity !== 'BLOCKER') dateSeverity = 'REVIEW_REQUIRED';
    } else {
      // Check for identical duplicate periods across distinct companies (corruption signal)
      if (periodsSeen.has(p) && tailoredExps.length > 1) {
        dateIssues.push(`Suspicious duplicate date range "${p}" assigned to multiple distinct employers.`);
        dateSeverity = 'BLOCKER';
      }
      periodsSeen.add(p);

      // Check for hallucinated generic "2022 – Present" when not backed by profile
      if (/2022\s*[-–—]\s*present/i.test(p)) {
        const matchingProfileExp = profile.experiences.find(
          (pe) => pe.company.toLowerCase().includes(exp.company.toLowerCase())
        );
        const hasAuthentic2022Present =
          matchingProfileExp &&
          matchingProfileExp.startDate?.includes('2022') &&
          Boolean(matchingProfileExp.current);
        if (!hasAuthentic2022Present) {
          dateIssues.push(`Hallucinated date "2022 – Present" assigned to "${exp.company}".`);
          dateSeverity = 'BLOCKER';
        }
      }
    }
  }

  categoryResults.push({
    category: 'Dates',
    passed: dateIssues.length === 0,
    severity: dateSeverity,
    issues: dateIssues,
  });

  // 3. Chronology Category
  const chronoIssues: string[] = [];
  let chronoSeverity: ValidationSeverity = 'OK';
  let currentCount = 0;

  for (const exp of tailoredExps) {
    if (/\b(?:present|current)\b/i.test(exp.period || '')) {
      currentCount++;
    }
    // Verify start <= end if both years present in period
    const years = (exp.period || '').match(/\b(19\d{2}|20\d{2})\b/g);
    if (years && years.length >= 2) {
      const y1 = parseInt(years[0], 10);
      const y2 = parseInt(years[1], 10);
      if (y1 > y2) {
        chronoIssues.push(`Chronological inversion in "${exp.company}": start year ${y1} exceeds end year ${y2}.`);
        chronoSeverity = 'BLOCKER';
      }
    }
  }

  if (currentCount > 2) {
    chronoIssues.push(`Suspicious current-employment count: ${currentCount} roles marked "Present".`);
    if (chronoSeverity !== 'BLOCKER') chronoSeverity = 'REVIEW_REQUIRED';
  }

  categoryResults.push({
    category: 'Chronology',
    passed: chronoIssues.length === 0,
    severity: chronoSeverity,
    issues: chronoIssues,
  });

  // 4. Skills Category
  const skillIssues: string[] = [];
  let skillSeverity: ValidationSeverity = 'OK';

  for (const sk of tailored.targetedSkills || []) {
    const sLower = sk.toLowerCase().trim();
    const hasSkill = Array.from(allVerifiedSkills).some(
      (vs) => vs.includes(sLower) || sLower.includes(vs)
    );
    if (!hasSkill && allVerifiedSkills.size > 0) {
      skillIssues.push(`Targeted skill "${sk}" is not substantiated by verified master skills.`);
      if (skillSeverity === 'OK') skillSeverity = 'WARNING';
    }
  }

  categoryResults.push({
    category: 'Skills',
    passed: skillIssues.length === 0,
    severity: skillSeverity,
    issues: skillIssues,
  });

  // 5. Education Category
  const eduIssues: string[] = [];
  let eduSeverity: ValidationSeverity = 'OK';
  const masterEdu = profile.education.map((e) => e.degree.toLowerCase().trim());

  for (const eduStr of tailored.education || []) {
    const eLower = eduStr.toLowerCase().trim();
    if (masterEdu.length > 0) {
      const matched = masterEdu.some((me) => me && (eLower.includes(me) || me.includes(eLower)));
      if (!matched && !/bachelor|master|b\.tech|degree|diploma/i.test(eLower)) {
        eduIssues.push(`Education entry "${eduStr}" does not match candidate's verified academic records.`);
        eduSeverity = 'BLOCKER';
      }
    }
  }

  categoryResults.push({
    category: 'Education',
    passed: eduIssues.length === 0,
    severity: eduSeverity,
    issues: eduIssues,
  });

  // 6. Certifications Category
  const certIssues: string[] = [];
  let certSeverity: ValidationSeverity = 'OK';
  const masterCerts = profile.certifications.map((c) => c.name.toLowerCase().trim());

  for (const cStr of tailored.certifications || []) {
    const cLower = cStr.toLowerCase().trim();
    if (masterCerts.length > 0) {
      const matched = masterCerts.some((mc) => mc && (cLower.includes(mc) || mc.includes(cLower)));
      if (!matched) {
        certIssues.push(`Certification "${cStr}" is not listed in candidate's verified credentials.`);
        if (certSeverity === 'OK') certSeverity = 'WARNING';
      }
    }
  }

  categoryResults.push({
    category: 'Certifications',
    passed: certIssues.length === 0,
    severity: certSeverity,
    issues: certIssues,
  });

  // 7. Achievements Category (Metric & Claim Audit)
  const achIssues: string[] = [];
  let achSeverity: ValidationSeverity = 'OK';
  const summaryText = tailored.summary || tailored.professionalSummary || '';
  const allBullets = tailoredExps.flatMap((e) => e.bulletPoints || []);
  const allNarrative = [summaryText, ...allBullets].join('\n');

  // Disallowed fabricated companies check
  const disallowed = ['cloudflare', 'stripe', 'google', 'meta', 'amazon', 'microsoft', 'apple'];
  for (const dComp of disallowed) {
    if (
      allNarrative.toLowerCase().includes(dComp) &&
      !Array.from(allVerifiedCompanies).some((vc) => vc.includes(dComp))
    ) {
      achIssues.push(`Document mentions unverified employer "${dComp}".`);
      achSeverity = 'BLOCKER';
    }
  }

  // Audit percentage metrics (e.g. "increased efficiency by 45%")
  const percentMatches = allNarrative.match(/\b(\d{1,3})%/g) || [];
  for (const pm of percentMatches) {
    const foundInMaster = masterAchievements.some((ma) => ma.includes(pm.toLowerCase()));
    if (!foundInMaster && masterAchievements.length > 0) {
      achIssues.push(`Unsupported percentage claim "${pm}" not grounded in candidate achievements.`);
      achSeverity = 'BLOCKER';
    }
  }

  categoryResults.push({
    category: 'Achievements',
    passed: achIssues.length === 0,
    severity: achSeverity,
    issues: achIssues,
  });

  // 8. Formatting Category
  const fmtIssues: string[] = [];
  let fmtSeverity: ValidationSeverity = 'OK';

  for (const exp of tailoredExps) {
    const emptyBullets = (exp.bulletPoints || []).filter((b) => !b || b.trim().length === 0);
    if (emptyBullets.length > 0) {
      fmtIssues.push(`Experience "${exp.role} at ${exp.company}" contains ${emptyBullets.length} empty bullet points.`);
      if ((fmtSeverity as string) !== 'BLOCKER') fmtSeverity = 'WARNING';
    }
  }

  // Check for literal "undefined" or "null" strings
  const stringified = JSON.stringify(tailored);
  if (/\b(?:undefined|null|NaN)\b/i.test(stringified) && !stringified.includes('"truthfulnessAuditPassed":null')) {
    // Check if literal null or undefined appears in visible text
    if (
      tailored.headline?.includes('undefined') ||
      tailored.professionalSummary?.includes('undefined') ||
      tailoredExps.some((e) => e.company.includes('undefined') || e.role.includes('undefined'))
    ) {
      fmtIssues.push('Document contains literal "undefined" or "null" in visible text.');
      fmtSeverity = 'BLOCKER';
    }
  }

  categoryResults.push({
    category: 'Formatting',
    passed: fmtIssues.length === 0,
    severity: fmtSeverity,
    issues: fmtIssues,
  });

  // 9. Completeness Category
  const compIssues: string[] = [];
  let compSeverity: ValidationSeverity = 'OK';

  if (!profile.fullName || profile.fullName.trim().length === 0) {
    compIssues.push('Candidate full name is missing.');
    compSeverity = 'BLOCKER';
  }
  if (!profile.email && !profile.phone) {
    compIssues.push('Both email and phone contact details are missing.');
    compSeverity = compSeverity === 'BLOCKER' ? 'BLOCKER' : 'REVIEW_REQUIRED';
  }
  if (!tailored.headline || tailored.headline.trim().length === 0) {
    compIssues.push('Tailored resume headline is missing.');
    if (compSeverity !== 'BLOCKER') compSeverity = 'WARNING';
  }
  if (!summaryText || summaryText.trim().length === 0) {
    compIssues.push('Professional summary is missing.');
    if (compSeverity !== 'BLOCKER') compSeverity = 'WARNING';
  }

  categoryResults.push({
    category: 'Completeness',
    passed: compIssues.length === 0,
    severity: compSeverity,
    issues: compIssues,
  });

  // 10. Export Category (Preview vs Export consistency)
  const expIssues: string[] = [];
  let expSeverity: ValidationSeverity = 'OK';

  if (tailoredExps.length !== profile.experiences.length && profile.experiences.length > 0) {
    // Check whether genuine jobs were omitted
    const omitted = profile.experiences.filter(
      (pe) => !tailoredExps.some((te) => te.company.toLowerCase().includes(pe.company.toLowerCase()))
    );
    if (omitted.length > 0) {
      expIssues.push(
        `Tailored document omitted ${omitted.length} authentic roles from verified profile: ${omitted
          .map((o) => o.company)
          .join(', ')}.`
      );
      if ((expSeverity as string) !== 'BLOCKER') expSeverity = 'WARNING';
    }
  }

  categoryResults.push({
    category: 'Export',
    passed: expIssues.length === 0,
    severity: expSeverity,
    issues: expIssues,
  });

  // Compile overall status and blockers
  for (const res of categoryResults) {
    if (res.severity === 'BLOCKER') {
      blockers.push(...res.issues);
    } else if (res.severity === 'REVIEW_REQUIRED') {
      reviewItems.push(...res.issues);
    } else if (res.severity === 'WARNING') {
      warnings.push(...res.issues);
    }
  }

  let finalStatus: ResumeValidationStatus = 'VALID';
  let isDownloadable = true;

  if (blockers.length > 0) {
    finalStatus = 'BLOCKED';
    isDownloadable = false;
  } else if (reviewItems.length > 0) {
    finalStatus = 'NEEDS_CANDIDATE_REVIEW';
    isDownloadable = true;
  } else if (warnings.length > 0) {
    finalStatus = 'VALID_WITH_WARNINGS';
    isDownloadable = true;
  }

  const deductions = blockers.length * 30 + reviewItems.length * 15 + warnings.length * 5;
  const score = Math.max(0, 100 - deductions);

  return {
    status: finalStatus,
    isDownloadable,
    score,
    blockers,
    warnings,
    reviewItems,
    categoryResults,
    auditTimestamp: now,
  };
}
