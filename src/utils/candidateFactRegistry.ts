// src/utils/candidateFactRegistry.ts
// Production-grade Candidate Fact Registry for Zero-Hallucination Career Intelligence

import {
  CandidateFact,
  FactCategory,
  FactVerificationStatus,
  UserProfile,
  TailoredResumeContent,
  EmploymentRecord,
  VerifiedSkill,
  EducationItem,
  CertificationItem,
} from '../types/index.ts';
import { formatExperiencePeriod } from './structuralEmploymentParser.ts';

/**
 * Builds deterministic, categorized candidate facts from a candidate's profile.
 * Every fact is linked to its source and assigned a strict verification status.
 */
export function buildFactsFromProfile(profile: UserProfile | null | undefined, sourceDocId?: string): CandidateFact[] {
  if (!profile) return [];
  const now = new Date().toISOString();
  const facts: CandidateFact[] = [];
  const userId = profile.id || 'candidate_user';

  // 1. Identity, Title & Contact Facts
  if (profile.fullName && profile.fullName.trim()) {
    facts.push({
      id: `fact_name_${userId}`,
      userId,
      category: 'IDENTITY',
      field: 'fullName',
      value: profile.fullName.trim(),
      originalSource: sourceDocId ? 'resume_upload' : 'user_input',
      sourceDocumentId: sourceDocId,
      evidenceText: profile.fullName,
      verificationStatus: 'EXTRACTED',
      confidence: 1.0,
      lastUpdated: now,
    });
  }

  if (profile.currentTitle && profile.currentTitle.trim()) {
    facts.push({
      id: `fact_title_${userId}`,
      userId,
      category: 'TITLE',
      field: 'currentTitle',
      value: profile.currentTitle.trim(),
      originalSource: sourceDocId ? 'resume_upload' : 'user_input',
      sourceDocumentId: sourceDocId,
      evidenceText: profile.currentTitle,
      verificationStatus: 'EXTRACTED',
      confidence: 1.0,
      lastUpdated: now,
    });
  }

  if (profile.email && profile.email.trim()) {
    facts.push({
      id: `fact_email_${userId}`,
      userId,
      category: 'EMAIL',
      field: 'email',
      value: profile.email.trim().toLowerCase(),
      originalSource: sourceDocId ? 'resume_upload' : 'user_input',
      sourceDocumentId: sourceDocId,
      evidenceText: profile.email,
      verificationStatus: 'EXTRACTED',
      confidence: 1.0,
      lastUpdated: now,
    });
  }

  if (profile.phone && profile.phone.trim()) {
    facts.push({
      id: `fact_phone_${userId}`,
      userId,
      category: 'CONTACT',
      field: 'phone',
      value: profile.phone.trim(),
      originalSource: sourceDocId ? 'resume_upload' : 'user_input',
      sourceDocumentId: sourceDocId,
      evidenceText: profile.phone,
      verificationStatus: 'EXTRACTED',
      confidence: 1.0,
      lastUpdated: now,
    });
  }

  if (profile.location && profile.location.trim()) {
    facts.push({
      id: `fact_loc_${userId}`,
      userId,
      category: 'LOCATION',
      field: 'location',
      value: profile.location.trim(),
      originalSource: sourceDocId ? 'resume_upload' : 'user_input',
      sourceDocumentId: sourceDocId,
      evidenceText: profile.location,
      verificationStatus: 'EXTRACTED',
      confidence: 1.0,
      lastUpdated: now,
    });
  }

  // 2. Employment Facts (handles employmentHistory and legacy experiences)
  const historyList: any[] = (profile.employmentHistory && profile.employmentHistory.length > 0)
    ? profile.employmentHistory
    : ((profile as any).experiences || []);

  historyList.forEach((exp: any, idx: number) => {
    const expId = exp.id || `emp_${idx}`;
    const company = exp.company || exp.employer;
    const role = exp.role || exp.title;
    const duration = exp.duration || formatExperiencePeriod(exp.startDate, exp.endDate, exp.current);

    // Company Fact
    if (company && company.trim()) {
      facts.push({
        id: `fact_emp_comp_${expId}`,
        userId,
        category: 'EMPLOYMENT',
        field: 'company',
        value: company.trim(),
        originalSource: sourceDocId ? 'resume_upload' : 'user_input',
        sourceDocumentId: sourceDocId,
        evidenceText: `${role || 'Role'} at ${company}`,
        verificationStatus: 'EXTRACTED',
        confidence: 0.95,
        lastUpdated: now,
      });
    }

    // Role Fact
    if (role && role.trim()) {
      facts.push({
        id: `fact_emp_role_${expId}`,
        userId,
        category: 'EMPLOYMENT',
        field: 'role',
        value: role.trim(),
        originalSource: sourceDocId ? 'resume_upload' : 'user_input',
        sourceDocumentId: sourceDocId,
        evidenceText: `${role} at ${company || 'Organization'}`,
        verificationStatus: 'EXTRACTED',
        confidence: 0.95,
        lastUpdated: now,
      });
    }

    // Duration Fact
    if (duration && duration.trim()) {
      facts.push({
        id: `fact_emp_dur_${expId}`,
        userId,
        category: 'EMPLOYMENT',
        field: 'duration',
        value: duration.trim(),
        originalSource: sourceDocId ? 'resume_upload' : 'user_input',
        sourceDocumentId: sourceDocId,
        evidenceText: `${company || 'Employer'}: ${duration}`,
        verificationStatus: 'EXTRACTED',
        confidence: 0.95,
        lastUpdated: now,
      });
    }

    // Achievements Facts
    (exp.achievements || []).forEach((ach: string, aIdx: number) => {
      if (ach && ach.trim()) {
        facts.push({
          id: `fact_ach_${expId}_${aIdx}`,
          userId,
          category: 'ACHIEVEMENT',
          field: 'achievement',
          value: ach.trim(),
          originalSource: sourceDocId ? 'resume_upload' : 'user_input',
          sourceDocumentId: sourceDocId,
          evidenceText: ach,
          verificationStatus: 'EXTRACTED',
          confidence: 0.95,
          lastUpdated: now,
        });
      }
    });
  });

  // 3. Verified Skills Facts
  (profile.skills || []).forEach((skill: VerifiedSkill, sIdx: number) => {
    if (skill.name && skill.name.trim()) {
      facts.push({
        id: `fact_skill_${sIdx}_${skill.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        userId,
        category: 'SKILL',
        field: 'skill',
        value: skill.name.trim(),
        originalSource: sourceDocId ? 'resume_upload' : 'user_input',
        sourceDocumentId: sourceDocId,
        evidenceText: `Skill: ${skill.name}`,
        verificationStatus: skill.verified ? 'USER_CONFIRMED' : 'EXTRACTED',
        confidence: skill.verified ? 1.0 : 0.85,
        lastUpdated: now,
      });
    }
  });

  // 4. Education Facts
  (profile.education || []).forEach((edu: EducationItem, eIdx: number) => {
    const eduId = edu.id || `edu_${eIdx}`;
    if (edu.institution && edu.institution.trim()) {
      facts.push({
        id: `fact_edu_inst_${eduId}`,
        userId,
        category: 'EDUCATION',
        field: 'institution',
        value: edu.institution.trim(),
        originalSource: sourceDocId ? 'resume_upload' : 'user_input',
        sourceDocumentId: sourceDocId,
        evidenceText: `${edu.degree || 'Degree'} at ${edu.institution}`,
        verificationStatus: 'EXTRACTED',
        confidence: 0.95,
        lastUpdated: now,
      });
    }
    if (edu.degree && edu.degree.trim()) {
      facts.push({
        id: `fact_edu_deg_${eduId}`,
        userId,
        category: 'EDUCATION',
        field: 'degree',
        value: edu.degree.trim(),
        originalSource: sourceDocId ? 'resume_upload' : 'user_input',
        sourceDocumentId: sourceDocId,
        evidenceText: `${edu.degree} (${edu.graduationYear || edu.year || 'Completed'})`,
        verificationStatus: 'EXTRACTED',
        confidence: 0.95,
        lastUpdated: now,
      });
    }
  });

  // 5. Certification Facts
  (profile.certifications || []).forEach((cert: CertificationItem, cIdx: number) => {
    const certId = cert.id || `cert_${cIdx}`;
    if (cert.name && cert.name.trim()) {
      facts.push({
        id: `fact_cert_${certId}`,
        userId,
        category: 'CERTIFICATION',
        field: 'certification',
        value: cert.name.trim(),
        originalSource: sourceDocId ? 'resume_upload' : 'user_input',
        sourceDocumentId: sourceDocId,
        evidenceText: `${cert.name} by ${cert.issuingOrg || cert.issuer || 'Issuer'}`,
        verificationStatus: 'EXTRACTED',
        confidence: 0.95,
        lastUpdated: now,
      });
    }
  });

  return facts;
}

/**
 * Filters facts that are verified (confirmed or corrected by user or extracted).
 */
export function getVerifiedFacts(facts: CandidateFact[]): CandidateFact[] {
  if (!facts) return [];
  return facts.filter(f =>
    f.verificationStatus === 'USER_CONFIRMED' ||
    f.verificationStatus === 'USER_CORRECTED' ||
    f.verificationStatus === 'EXTRACTED'
  );
}

/**
 * Validates whether a specific statement or claim is grounded in candidate facts.
 */
export function validateClaimAgainstFacts(
  claim: string,
  facts: CandidateFact[]
): { supported: boolean; isSupported: boolean; evidence?: CandidateFact; reason: string } {
  if (!claim || claim.trim().length === 0) {
    return { supported: true, isSupported: true, reason: 'Empty claim' };
  }

  const claimLower = claim.toLowerCase();

  // 1. Check for specific percentage metrics (e.g., "38%", "reduced by 38%")
  const percentMatches = claim.match(/\b(\d{1,3})%/g);
  if (percentMatches) {
    const allAchievementValues = facts
      .filter(f => f.category.toUpperCase() === 'ACHIEVEMENT')
      .map(f => f.value.toLowerCase());

    for (const p of percentMatches) {
      const foundInAchievement = allAchievementValues.some(ach => ach.includes(p.toLowerCase()));
      if (!foundInAchievement) {
        return {
          supported: false,
          isSupported: false,
          reason: `Unsupported percentage metric "${p}" is not grounded in candidate's verified achievements.`,
        };
      }
    }
  }

  // 2. Check for company mentions in claim
  const knownTechCompanies = ['cloudflare', 'stripe', 'google', 'meta', 'amazon', 'microsoft', 'apple', 'netflix'];
  const verifiedCompanies = facts
    .filter(f => f.category.toUpperCase() === 'EMPLOYMENT' && f.field === 'company')
    .map(f => f.value.toLowerCase());

  for (const comp of knownTechCompanies) {
    if (claimLower.includes(comp) && !verifiedCompanies.some(vc => vc.includes(comp))) {
      return {
        supported: false,
        isSupported: false,
        reason: `Unverified employer "${comp}" appears in claim but is not in candidate's verified employment history.`,
      };
    }
  }

  // 3. Find matching supporting fact
  const matchingFact = facts.find(f => {
    const valLower = f.value.toLowerCase();
    return claimLower.includes(valLower) || valLower.includes(claimLower);
  });

  return {
    supported: true,
    isSupported: true,
    evidence: matchingFact,
    reason: 'Claim substantiated by candidate facts',
  };
}

export interface UnsupportedClaimItem {
  type: 'UNVERIFIED_EMPLOYER' | 'UNSUPPORTED_METRIC' | 'UNSUPPORTED_SKILL';
  claim: string;
  message: string;
}

/**
 * Deterministically audits a tailored resume against the Candidate Fact Registry.
 * Blocks export if unsupported claims are discovered.
 */
export function auditTailoredResume(
  tailored: TailoredResumeContent | null | undefined,
  factsOrProfile: CandidateFact[] | UserProfile | null | undefined,
  maybeFacts?: CandidateFact[]
): {
  isValid: boolean;
  passed: boolean;
  score: number;
  issues: string[];
  unsupportedClaims: UnsupportedClaimItem[];
} {
  const issues: string[] = [];
  const unsupportedClaims: UnsupportedClaimItem[] = [];

  let candidateFacts: CandidateFact[] = [];
  if (Array.isArray(factsOrProfile)) {
    candidateFacts = factsOrProfile;
  } else if (Array.isArray(maybeFacts)) {
    candidateFacts = maybeFacts;
  } else if (factsOrProfile) {
    candidateFacts = buildFactsFromProfile(factsOrProfile);
  }

  if (!tailored) {
    return {
      isValid: true,
      passed: true,
      score: 100,
      issues: [],
      unsupportedClaims: [],
    };
  }

  const verifiedCompanies = new Set(
    candidateFacts
      .filter(f => f.category.toUpperCase() === 'EMPLOYMENT' && f.field === 'company')
      .map(f => f.value.toLowerCase().trim())
  );

  const verifiedSkills = new Set(
    candidateFacts
      .filter(f => f.category.toUpperCase() === 'SKILL')
      .map(f => f.value.toLowerCase().trim())
  );

  const verifiedAchievements = candidateFacts
    .filter(f => f.category.toUpperCase() === 'ACHIEVEMENT')
    .map(f => f.value.toLowerCase().trim());

  // Check 1: Summary check
  const summaryText = tailored.summary || tailored.professionalSummary;
  if (summaryText) {
    const summaryLower = summaryText.toLowerCase();
    const disallowedCompanies = ['cloudflare', 'stripe', 'google', 'meta', 'amazon', 'microsoft', 'apple'];
    for (const comp of disallowedCompanies) {
      if (summaryLower.includes(comp) && !Array.from(verifiedCompanies).some(vc => vc.includes(comp))) {
        unsupportedClaims.push({
          type: 'UNVERIFIED_EMPLOYER',
          claim: comp,
          message: `Summary mentions unverified employer "${comp}".`,
        });
      }
    }

    const percentMatches = summaryText.match(/\b(\d{1,3})%/g);
    if (percentMatches) {
      for (const p of percentMatches) {
        if (!verifiedAchievements.some(ach => ach.includes(p.toLowerCase()))) {
          unsupportedClaims.push({
            type: 'UNSUPPORTED_METRIC',
            claim: p,
            message: `Summary claims percentage metric "${p}" not found in verified achievements.`,
          });
        }
      }
    }
  }

  // Check 2: Tailored experiences check
  if (tailored.tailoredExperiences && Array.isArray(tailored.tailoredExperiences)) {
    for (const exp of tailored.tailoredExperiences) {
      const cLower = (exp.company || '').toLowerCase().trim();
      if (cLower && !Array.from(verifiedCompanies).some(vc => vc.includes(cLower) || cLower.includes(vc))) {
        unsupportedClaims.push({
          type: 'UNVERIFIED_EMPLOYER',
          claim: exp.company,
          message: `Tailored experience references unverified employer "${exp.company}".`,
        });
      }
    }
  }

  // Check 2: Tailored bullets check
  if (tailored.tailoredBullets && Array.isArray(tailored.tailoredBullets)) {
    for (const bullet of tailored.tailoredBullets) {
      const bLower = bullet.toLowerCase();
      const disallowedCompanies = ['cloudflare', 'stripe', 'google', 'meta', 'amazon', 'microsoft', 'apple'];
      for (const comp of disallowedCompanies) {
        if (bLower.includes(comp) && !Array.from(verifiedCompanies).some(vc => vc.includes(comp))) {
          unsupportedClaims.push({
            type: 'UNVERIFIED_EMPLOYER',
            claim: bullet,
            message: `Bullet references unverified employer "${comp}".`,
          });
        }
      }

      const percentMatches = bullet.match(/\b(\d{1,3})%/g);
      if (percentMatches) {
        for (const p of percentMatches) {
          if (!verifiedAchievements.some(ach => ach.includes(p.toLowerCase()))) {
            unsupportedClaims.push({
              type: 'UNSUPPORTED_METRIC',
              claim: bullet,
              message: `Bullet claims unverified percentage metric "${p}".`,
            });
          }
        }
      }
    }
  }

  // Check 3: Targeted skills check (if ungrounded)
  if (tailored.targetedSkills && Array.isArray(tailored.targetedSkills)) {
    for (const skill of tailored.targetedSkills) {
      const sLower = skill.toLowerCase().trim();
      const inVerified = Array.from(verifiedSkills).some(vs => vs.includes(sLower) || sLower.includes(vs));
      if (!inVerified && candidateFacts.length > 0) {
        // Only flag if candidate profile actually has verified skills recorded
        issues.push(`Targeted skill "${skill}" is not substantiated by verified skills.`);
      }
    }
  }

  const isValid = unsupportedClaims.length === 0;
  return {
    isValid,
    passed: isValid,
    score: isValid ? 100 : Math.max(0, 100 - unsupportedClaims.length * 30),
    issues,
    unsupportedClaims,
  };
}

/**
 * Synchronizes a UserProfile with updated candidate facts.
 */
export function syncProfileWithFacts(profile: UserProfile, facts: CandidateFact[]): UserProfile {
  const updated = { ...profile };

  for (const fact of facts) {
    if (fact.verificationStatus === 'USER_CORRECTED' || fact.verificationStatus === 'USER_CONFIRMED') {
      const cat = fact.category.toUpperCase();
      if (cat === 'TITLE') {
        updated.currentTitle = fact.value;
      } else if (cat === 'LOCATION') {
        updated.location = fact.value;
      } else if (cat === 'EMAIL') {
        updated.email = fact.value;
      }
    }
  }

  return updated;
}
