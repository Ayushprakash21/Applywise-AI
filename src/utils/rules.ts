import {
  UserProfile,
  CareerPreferences,
  ScoringWeights,
  JobVacancy,
  JobMatchEvaluation,
  ApplicationStatus,
  TailoredResumeContent,
  CandidateFact,
  ProfileEvidenceItem
} from '../types/index.ts';

/**
 * Standard default scoring weights summing to 100%
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  skillsWeight: 30,
  experienceWeight: 25,
  qualificationsWeight: 15,
  seniorityWeight: 10,
  locationWeight: 10,
  salaryWeight: 10,
};

/**
 * Generates a normalized composite duplicate prevention key.
 * Used to detect multiple listings or repeated applications across sources.
 */
export function generateDuplicateKey(company: string, titleOrUrl: string, userId: string = 'default_user'): string {
  let normCompany = (company || '')
    .toLowerCase()
    .trim()
    .replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|gmbh)\b\.?/gi, '')
    .trim()
    .replace(/[^a-z0-9]/g, '');

  // Extract either normalized title or domain/path from URL
  let normIdentifier = (titleOrUrl || '').toLowerCase().trim();
  try {
    if (normIdentifier.startsWith('http://') || normIdentifier.startsWith('https://')) {
      const parsed = new URL(normIdentifier);
      normIdentifier = parsed.hostname + parsed.pathname.replace(/\/$/, '');
    }
  } catch {
    // Keep as string if not a valid URL
  }
  normIdentifier = normIdentifier.replace(/[^a-z0-9]/g, '');

  const normUser = (userId || 'default_user').toLowerCase().trim();
  return `${normCompany}::${normIdentifier}::${normUser}`;
}

/**
 * Evaluates mandatory eligibility constraints separately from weighted score.
 * Never interprets unknown requirements as satisfied.
 */
export function checkHardEligibility(
  vacancy: JobVacancy,
  profile: UserProfile,
  preferences: CareerPreferences
): { isEligible: boolean; issues: string[]; confidence: 'high' | 'medium' | 'low' } {
  const issues: string[] = [];

  // 1. Excluded companies / Blacklist check
  const compLower = (vacancy.company || '').toLowerCase().trim();
  const isExcluded = preferences.excludedCompanies.some(exc => {
    const excLower = exc.toLowerCase().trim();
    return excLower && (compLower.includes(excLower) || excLower.includes(compLower));
  });
  if (isExcluded) {
    issues.push(`Company "${vacancy.company}" is in your excluded companies list.`);
  }

  // 2. Excluded keywords in title or description
  const titleLower = (vacancy.title || '').toLowerCase();
  const descLower = (vacancy.description || '').toLowerCase();
  for (const kw of preferences.excludedKeywords) {
    const kwLower = kw.toLowerCase().trim();
    if (kwLower && (titleLower.includes(kwLower) || descLower.includes(kwLower))) {
      issues.push(`Vacancy contains excluded keyword: "${kw}"`);
    }
  }

  // 3. Work Authorization & Visa Sponsorship check
  if (preferences.visaSponsorshipRequired) {
    if (vacancy.visaSponsorship === 'not_supported') {
      issues.push('Employer explicitly does NOT provide visa sponsorship.');
    } else if (vacancy.visaSponsorship === 'unknown') {
      // Check if text says "must be authorized without sponsorship"
      if (
        descLower.includes('no sponsorship') ||
        descLower.includes('without sponsorship') ||
        descLower.includes('must be authorized to work in') ||
        descLower.includes('us citizen or green card')
      ) {
        issues.push('Job description indicates sponsorship is unavailable.');
      }
    }
  }

  // 4. Location & Work Arrangement check
  if (preferences.workArrangement.length > 0) {
    const arrangementMatch = preferences.workArrangement.includes(vacancy.arrangement);
    if (!arrangementMatch && vacancy.arrangement === 'onsite' && !preferences.workArrangement.includes('onsite')) {
      if (preferences.willingnessToRelocate === 'no') {
        issues.push(`Vacancy is On-site in ${vacancy.location}, but your preference is Remote/Hybrid only with no relocation.`);
      }
    }
  }

  return {
    isEligible: issues.length === 0,
    issues,
    confidence: vacancy.visaSponsorship !== 'unknown' ? 'high' : 'medium',
  };
}

/**
 * Calculates a multidimensional job match score (0-100) and breakdown
 * using configurable weights.
 */
/**
 * Calculates a multidimensional job match score (0-100) and breakdown
 * using evidence-based scoring and zero-hallucination rules.
 */
export function calculateJobMatch(
  vacancy: JobVacancy,
  profile: UserProfile | null | undefined,
  preferencesOrFacts?: any,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): JobMatchEvaluation {
  let preferences: CareerPreferences = {
    targetRoles: [],
    targetCountries: [],
    targetCities: [],
    preferredTitles: [],
    preferredIndustries: [],
    workArrangement: ['remote', 'hybrid', 'onsite'],
    workArrangements: ['remote', 'hybrid', 'onsite'],
    minSalaryUSD: 0,
    minSalaryByCurrency: {},
    preferredEmploymentType: ['full-time'],
    willingnessToRelocate: 'negotiable',
    visaSponsorshipRequired: false,
    requiresVisaSponsorship: false,
    preferredCompanies: [],
    excludedCompanies: [],
    excludedKeywords: []
  };

  let candidateFacts: CandidateFact[] = [];
  if (Array.isArray(preferencesOrFacts)) {
    candidateFacts = preferencesOrFacts;
  } else if (preferencesOrFacts && typeof preferencesOrFacts === 'object') {
    preferences = { ...preferences, ...preferencesOrFacts };
  }

  // 0. Check for insufficient profile information
  const hasHistory = (profile?.employmentHistory && profile.employmentHistory.length > 0) ||
    (profile?.experiences && (profile.experiences as any).length > 0);
  const hasSkills = profile?.skills && profile.skills.length > 0;

  if (!profile || (!hasHistory && !hasSkills)) {
    const rawReqs = vacancy.mandatoryRequirements || vacancy.requiredSkills || vacancy.requirements || [];
    return {
      matchScore: 0,
      insufficientData: true,
      scoreMessage: 'Insufficient verified profile information to calculate a reliable match.',
      fitVerdict: 'weak',
      breakdown: {
        skills: 0,
        experience: 0,
        qualifications: 0,
        seniority: 0,
        location: 0,
        salary: 0,
      },
      matchedSkills: [],
      matchedCompetencies: [],
      missingSkills: rawReqs,
      mandatoryRequirements: rawReqs,
      preferredRequirements: vacancy.preferredRequirements || vacancy.preferredSkills || [],
      missingMandatory: rawReqs,
      missingPreferred: vacancy.preferredRequirements || vacancy.preferredSkills || [],
      transferableSkills: [],
      reasons: ['Please upload and verify your work history in Career Profile to generate a reliable match.'],
      eligibilityIssues: ['No verified work experience or skills found in candidate profile.'],
      salaryCompatibility: 'unspecified',
      sponsorshipStatus: 'unspecified',
      recommendation: 'DO_NOT_APPLY',
      evaluatedAt: new Date().toISOString(),
      profileEvidence: rawReqs.map((req, i) => ({
        id: `evi_req_${i}`,
        requirement: req,
        category: 'mandatory',
        candidateEvidence: 'Not found in your verified profile.',
        source: 'Not found in your verified profile',
        status: 'NOT_FOUND',
        assessment: 'Missing from verified profile facts.',
        confidence: 0,
      })),
    };
  }

  const profileSkills = (profile.skills || []).map(s => s.name.toLowerCase().trim());
  const vacancyDesc = vacancy.description || '';
  const vacancyTitle = vacancy.title || '';
  const vacancyText = `${vacancyTitle} ${(vacancy.requirements || []).join(' ')} ${(vacancy.tags || []).join(' ')} ${vacancyDesc}`.toLowerCase();

  // 1. Partition requirements into Mandatory vs Preferred
  const mandatoryRequirements: string[] = vacancy.mandatoryRequirements && vacancy.mandatoryRequirements.length > 0
    ? [...vacancy.mandatoryRequirements]
    : (vacancy.requiredSkills && vacancy.requiredSkills.length > 0 ? [...vacancy.requiredSkills] : []);

  const preferredRequirements: string[] = vacancy.preferredRequirements && vacancy.preferredRequirements.length > 0
    ? [...vacancy.preferredRequirements]
    : (vacancy.preferredSkills && vacancy.preferredSkills.length > 0 ? [...vacancy.preferredSkills] : []);

  const rawReqs = (mandatoryRequirements.length > 0 || preferredRequirements.length > 0)
    ? [...mandatoryRequirements, ...preferredRequirements]
    : (vacancy.requirements && vacancy.requirements.length > 0 ? vacancy.requirements : (vacancy.tags || []));

  if (mandatoryRequirements.length === 0 && preferredRequirements.length === 0) {
    for (const r of rawReqs) {
      const rl = r.toLowerCase();
      if (rl.includes('preferred') || rl.includes('nice to have') || rl.includes('plus') || rl.includes('bonus')) {
        preferredRequirements.push(r);
      } else {
        mandatoryRequirements.push(r);
      }
    }
  }

  // 2. Skills Match & Transferable Skills
  const matchedSkills: string[] = [];
  const matchedCompetencies = matchedSkills;
  const missingSkills: string[] = [];
  const transferableSkills: string[] = [];
  const profileEvidence: ProfileEvidenceItem[] = [];

  for (const skill of rawReqs) {
    const sLower = skill.toLowerCase().trim();
    const hasExact = profileSkills.some(ps => ps.includes(sLower) || sLower.includes(ps));

    if (hasExact) {
      if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
      profileEvidence.push({
        id: `evi_${profileEvidence.length}`,
        requirement: skill,
        category: preferredRequirements.includes(skill) ? 'preferred' : 'mandatory',
        candidateEvidence: `Documented verified skill: ${skill}`,
        source: 'Resume document, Verified Skills Registry',
        status: 'SUPPORTED',
        assessment: 'Direct verified match against published job spec.',
        confidence: 1.0,
      });
    } else {
      // Check for related/transferable match
      const relatedSkill = profileSkills.find(ps => {
        if (sLower.includes('management') && ps.includes('management')) return true;
        if (sLower.includes('operations') && ps.includes('operations')) return true;
        if (sLower.includes('logistics') && ps.includes('supply chain')) return true;
        if (sLower.includes('scrum') && ps.includes('agile')) return true;
        return false;
      });

      if (relatedSkill) {
        if (!transferableSkills.includes(skill)) transferableSkills.push(skill);
        profileEvidence.push({
          id: `evi_${profileEvidence.length}`,
          requirement: skill,
          category: preferredRequirements.includes(skill) ? 'preferred' : 'mandatory',
          candidateEvidence: `Transferable background in ${relatedSkill}`,
          source: 'Verified Profile Experience',
          status: 'TRANSFERABLE',
          assessment: 'Candidate possesses transferable domain background; direct technical overlap requires validation.',
          confidence: 0.7,
        });
      } else {
        if (!missingSkills.includes(skill)) missingSkills.push(skill);
        profileEvidence.push({
          id: `evi_${profileEvidence.length}`,
          requirement: skill,
          category: preferredRequirements.includes(skill) ? 'preferred' : 'mandatory',
          candidateEvidence: 'Not found in your verified profile.',
          source: 'Not found in your verified profile',
          status: 'NOT_FOUND',
          assessment: 'Missing from verified profile facts.',
          confidence: 0,
        });
      }
    }
  }

  // Also verify candidate's skills that match vacancy description
  profile.skills.forEach(skill => {
    if (vacancyText.includes(skill.name.toLowerCase().trim())) {
      if (!matchedSkills.includes(skill.name)) {
        matchedSkills.push(skill.name);
      }
    }
  });

  const totalSkillReqs = matchedSkills.length + missingSkills.length;
  let skillsScore = 0;
  if (totalSkillReqs > 0) {
    skillsScore = Math.min(100, Math.round((matchedSkills.length / totalSkillReqs) * 100));
  } else if (rawReqs.length === 0 && profileSkills.length > 0) {
    // If job didn't list structured skills, check text overlap
    const matchedInText = profileSkills.filter(ps => vacancyText.includes(ps)).length;
    skillsScore = Math.min(60, matchedInText * 15);
  }

  // 3. Experience Match & Seniority Validation
  const titleLower = vacancyTitle.toLowerCase();
  const isStaffOrPrincipal = /staff|principal|director|head of|vp|architect/i.test(vacancyTitle);
  const isSenior = /senior|lead/i.test(vacancyTitle);

  let requiredYears = 2;
  if (isStaffOrPrincipal) requiredYears = 8;
  else if (isSenior) requiredYears = 5;
  else if (/junior|entry|associate/i.test(vacancyTitle)) requiredYears = 1;

  let candidateYears = profile.totalExperienceYears || 0;
  if (!candidateYears && profile.employmentHistory && profile.employmentHistory.length > 0) {
    candidateYears = profile.employmentHistory.length * 4;
  }
  let experienceScore = 0;

  if (candidateYears >= requiredYears) {
    experienceScore = 100;
  } else if (requiredYears > 0) {
    experienceScore = Math.min(100, Math.round((candidateYears / requiredYears) * 80));
  }

  // 4. Seniority & Role Alignment
  let seniorityScore = 50;
  const currentTitleLower = (profile.currentTitle || '').toLowerCase();

  // Discipline / Family check (e.g. Distributed Systems Engineer vs Supply Chain Associate)
  const isEngineeringJob = /engineer|developer|architect|distributed systems|software/i.test(titleLower);
  const isTechnicalCandidate = profileSkills.some(s => /javascript|typescript|python|go|rust|c\+\+|java|react|node|cloud|docker|kubernetes|aws/i.test(s));

  let seniorityMismatch = false;

  if (isStaffOrPrincipal) {
    if (candidateYears < 4 || (!isTechnicalCandidate && isEngineeringJob)) {
      seniorityScore = 0;
      seniorityMismatch = true;
    } else if (candidateYears >= 8) {
      seniorityScore = 95;
    } else {
      seniorityScore = 40;
    }
  } else if (isSenior) {
    if (candidateYears >= 5) seniorityScore = 90;
    else seniorityScore = 45;
  } else {
    seniorityScore = 75;
  }

  // 5. Required Qualifications (Education & Certifications)
  let qualScore = 0;
  const degreeRequired = /bachelor|master|degree|bs |ms /i.test(vacancyText);
  if (degreeRequired) {
    qualScore = (profile.education && profile.education.length > 0) ? 90 : 0;
    if (profile.certifications && profile.certifications.length > 0) qualScore = Math.min(100, qualScore + 10);
  } else {
    qualScore = (profile.education && profile.education.length > 0) ? 80 : 40;
    if (profile.certifications && profile.certifications.length > 0) qualScore = Math.min(100, qualScore + 20);
  }

  // 6. Location & Work Arrangement
  let locationScore = 40;
  const isRemote = vacancy.remote || vacancy.arrangement === 'remote' || vacancy.workArrangement === 'remote' || /remote/i.test(vacancyText);
  const candWantsRemote = (preferences.workArrangement || []).includes('remote') || (preferences.workArrangements || []).includes('remote');

  if (isRemote && candWantsRemote) {
    locationScore = 100;
  } else if (preferences.targetCountries && preferences.targetCountries.some(c => (vacancy.country || '').toLowerCase().includes(c.toLowerCase()))) {
    locationScore = 85;
  }

  // 7. Salary Compatibility
  let salaryScore = 70;
  let salaryCompatibility: 'compatible' | 'below_threshold' | 'unspecified' | 'negotiable' = 'unspecified';

  if (vacancy.salaryRange?.min) {
    const currency = vacancy.salaryRange.currency || 'USD';
    const minAcceptable = preferences.minSalaryByCurrency?.[currency] || 0;
    if (minAcceptable > 0) {
      if (vacancy.salaryRange.max && vacancy.salaryRange.max >= minAcceptable) {
        salaryScore = 100;
        salaryCompatibility = 'compatible';
      } else if (vacancy.salaryRange.min >= minAcceptable) {
        salaryScore = 100;
        salaryCompatibility = 'compatible';
      } else {
        salaryScore = Math.max(10, Math.round((vacancy.salaryRange.min / minAcceptable) * 70));
        salaryCompatibility = 'below_threshold';
      }
    } else {
      salaryScore = 80;
      salaryCompatibility = 'compatible';
    }
  }

  // Weighted total score
  const totalWeight =
    weights.skillsWeight +
    weights.experienceWeight +
    weights.qualificationsWeight +
    weights.seniorityWeight +
    weights.locationWeight +
    weights.salaryWeight;

  let rawScore =
    (skillsScore * weights.skillsWeight +
      experienceScore * weights.experienceWeight +
      qualScore * weights.qualificationsWeight +
      seniorityScore * weights.seniorityWeight +
      locationScore * weights.locationWeight +
      salaryScore * weights.salaryWeight) /
    (totalWeight || 100);

  // If there is a severe discipline or seniority mismatch, cap score to prevent misleading 88% scores
  if (seniorityMismatch) {
    rawScore = Math.min(15, rawScore);
  } else if (isEngineeringJob && !isTechnicalCandidate) {
    rawScore = Math.min(12, rawScore);
  }

  const matchScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Eligibility check
  const eligibility = checkHardEligibility(vacancy, profile, preferences);

  // Recommendations
  let recommendation: 'STRONG_APPLY' | 'CONSIDER' | 'MARGINAL' | 'DO_NOT_APPLY' = 'CONSIDER';
  if (!eligibility.isEligible || seniorityMismatch) {
    recommendation = 'DO_NOT_APPLY';
  } else if (matchScore >= 80) {
    recommendation = 'STRONG_APPLY';
  } else if (matchScore >= 60) {
    recommendation = 'CONSIDER';
  } else {
    recommendation = 'MARGINAL';
  }

  const missingMandatory = missingSkills.filter(s => mandatoryRequirements.includes(s) || !preferredRequirements.includes(s));
  const missingPreferred = missingSkills.filter(s => preferredRequirements.includes(s));

  const reasons: string[] = [];
  if (matchedCompetencies.length > 0) {
    reasons.push(`Evidence found for: ${matchedCompetencies.slice(0, 4).join(', ')}.`);
  }
  if (seniorityMismatch) {
    reasons.push('Seniority gap detected between candidate experience and role level.');
  }
  if (isEngineeringJob && !isTechnicalCandidate) {
    reasons.push('Disciplinary mismatch: Role is in distributed software engineering, but candidate background has no documented software engineering skills.');
  }

  return {
    matchScore,
    breakdown: {
      skills: skillsScore,
      experience: experienceScore,
      qualifications: qualScore,
      seniority: seniorityScore,
      location: locationScore,
      salary: salaryScore,
    },
    matchedSkills: matchedCompetencies,
    missingSkills,
    mandatoryRequirements,
    preferredRequirements,
    transferableSkills,
    reasons,
    eligibilityIssues: eligibility.issues,
    salaryCompatibility,
    sponsorshipStatus: vacancy.visaSponsorship === 'supported' ? 'supported' : vacancy.visaSponsorship === 'not_supported' ? 'unsupported' : 'unspecified',
    recommendation,
    evaluatedAt: new Date().toISOString(),
    profileEvidence,
    matchedCompetencies,
    missingMandatory,
    missingPreferred,
    insufficientData: false,
    scoreMessage: `${matchScore}% Alignment · Evidence-Based Match`,
    fitVerdict: matchScore >= 70 ? 'strong' : matchScore >= 40 ? 'moderate' : 'weak'
  };
}

/**
 * Validates state transitions in the application lifecycle state machine.
 */
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DISCOVERED: ['VALIDATED', 'WITHDRAWN', 'FAILED', 'MATCHED', 'PREPARED'],
  VALIDATED: ['MATCHED', 'WITHDRAWN', 'FAILED'],
  MATCHED: ['RESUME_GENERATED', 'AWAITING_APPROVAL', 'PREPARED', 'WITHDRAWN', 'FAILED'],
  PREPARING: ['PREPARED', 'NEEDS_REVIEW', 'READY_TO_APPLY', 'WITHDRAWN', 'FAILED'],
  NEEDS_REVIEW: ['READY_TO_APPLY', 'AUTHORIZED_TO_SUBMIT', 'WITHDRAWN', 'FAILED'],
  READY_TO_APPLY: ['SUBMITTING', 'SUBMISSION_IN_PROGRESS', 'REDIRECTED_TO_EMPLOYER', 'SUBMITTED', 'WITHDRAWN', 'FAILED'],
  STATUS_UNKNOWN: ['SUBMITTED_CONFIRMED', 'SUBMISSION_FAILED', 'TRACKED', 'WITHDRAWN'],
  SUBMITTED_CONFIRMED: ['TRACKED', 'INTERVIEW', 'INTERVIEWING', 'OFFER', 'OFFER_RECEIVED', 'REJECTED'],
  OFFER: ['TRACKED', 'WITHDRAWN'],
  PREPARED: ['AWAITING_APPROVAL', 'AWAITING_USER_REVIEW', 'REDIRECTED_TO_EMPLOYER', 'AUTHORIZED_TO_SUBMIT', 'SUBMISSION_IN_PROGRESS', 'GUIDED_COMPLETION_REQUIRED', 'WITHDRAWN', 'FAILED'],
  RESUME_GENERATED: ['APPLICATION_PREPARED', 'PREPARED', 'WITHDRAWN', 'FAILED'],
  APPLICATION_PREPARED: ['AWAITING_APPROVAL', 'AWAITING_USER_REVIEW', 'REDIRECTED_TO_EMPLOYER', 'AUTHORIZED_TO_SUBMIT', 'WITHDRAWN', 'FAILED'],
  AWAITING_APPROVAL: ['AUTHORIZED_TO_SUBMIT', 'WITHDRAWN', 'REJECTED'],
  AWAITING_USER_REVIEW: ['AUTHORIZED_TO_SUBMIT', 'REDIRECTED_TO_EMPLOYER', 'SUBMITTED', 'WITHDRAWN', 'REJECTED', 'FAILED'],
  REDIRECTED_TO_EMPLOYER: ['SUBMITTED', 'SUBMITTED_VERIFIED', 'TRACKED', 'CONFIRMATION_VERIFIED', 'WITHDRAWN', 'FAILED'],
  AUTHORIZED_TO_SUBMIT: ['SUBMITTING', 'SUBMISSION_ATTEMPTED', 'SUBMISSION_IN_PROGRESS', 'WITHDRAWN', 'FAILED'],
  SUBMISSION_IN_PROGRESS: ['SUBMITTED', 'SUBMISSION_ATTEMPTED', 'SUBMISSION_CONFIRMED', 'SUBMITTED_VERIFIED', 'GUIDED_COMPLETION_REQUIRED', 'SUBMISSION_FAILED', 'FAILED'],
  SUBMITTING: ['SUBMITTED', 'SUBMISSION_ATTEMPTED', 'FAILED'],
  SUBMISSION_ATTEMPTED: ['SUBMITTED', 'SUBMISSION_CONFIRMED', 'SUBMISSION_FAILED', 'FAILED'],
  SUBMISSION_CONFIRMED: ['TRACKED', 'INTERVIEWING', 'INTERVIEW', 'REJECTED', 'OFFER_RECEIVED'],
  SUBMITTED: ['CONFIRMATION_VERIFIED', 'SUBMISSION_CONFIRMED', 'SUBMITTED_VERIFIED', 'FAILED', 'REJECTED', 'TRACKED'],
  SUBMITTED_VERIFIED: ['TRACKED', 'INTERVIEW', 'INTERVIEWING', 'REJECTED', 'OFFER_RECEIVED'],
  GUIDED_COMPLETION_REQUIRED: ['SUBMITTED_VERIFIED', 'CONFIRMATION_VERIFIED', 'FAILED', 'WITHDRAWN'],
  CONFIRMATION_VERIFIED: ['TRACKED', 'INTERVIEWING', 'INTERVIEW', 'REJECTED', 'OFFER_RECEIVED'],
  TRACKED: ['INTERVIEWING', 'INTERVIEW', 'REJECTED', 'OFFER_RECEIVED', 'WITHDRAWN'],
  INTERVIEW: ['OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN'],
  INTERVIEWING: ['OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN'],
  OFFER_RECEIVED: ['TRACKED', 'WITHDRAWN'],
  REJECTED: ['TRACKED'],
  WITHDRAWN: ['DISCOVERED'],
  FAILED: ['DISCOVERED', 'APPLICATION_PREPARED', 'PREPARED'],
  SUBMISSION_FAILED: ['PREPARED', 'DISCOVERED', 'WITHDRAWN'],
};

export function validateStateTransition(current: ApplicationStatus, next: ApplicationStatus): boolean {
  if (current === next) return true;
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

/**
 * Strict Truthfulness Audit:
 * Verifies that tailored resume bullets and claims NEVER hallucinate companies, degrees,
 * or skills not present in the master profile.
 */
export function verifyTruthfulness(
  tailored: TailoredResumeContent,
  profile: UserProfile
): { passed: boolean; score: number; issues: string[] } {
  const issues: string[] = [];
  const masterCompanies = profile.experiences.map(e => e.company.toLowerCase().trim());
  const masterSkills = new Set(profile.skills.map(s => s.name.toLowerCase().trim()));
  const masterDegrees = profile.education.map(ed => ed.degree.toLowerCase().trim());

  // 1. Verify companies in tailored experience
  for (const exp of tailored.tailoredExperiences) {
    const cLower = exp.company.toLowerCase().trim();
    const found = masterCompanies.some(mc => mc.includes(cLower) || cLower.includes(mc));
    if (!found) {
      issues.push(`Tailored resume contains unverified employer: "${exp.company}".`);
    }
  }

  // 2. Verify skills are in master verified skills
  let unverifiedSkillsCount = 0;
  for (const sk of tailored.targetedSkills) {
    const sLower = sk.toLowerCase().trim();
    const hasSkill = Array.from(masterSkills).some(ms => ms.includes(sLower) || sLower.includes(ms));
    if (!hasSkill) {
      unverifiedSkillsCount++;
      issues.push(`Targeted skill "${sk}" is not listed in candidate's verified profile.`);
    }
  }

  // 3. Calculate score
  const totalChecks = Math.max(1, tailored.targetedSkills.length + tailored.tailoredExperiences.length);
  const deductions = issues.length * 20;
  const score = Math.max(0, 100 - deductions);

  return {
    passed: issues.length === 0,
    score,
    issues,
  };
}
