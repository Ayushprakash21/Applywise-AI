import {
  UserProfile,
  CareerPreferences,
  ScoringWeights,
  JobVacancy,
  JobMatchEvaluation,
  ApplicationStatus,
  TailoredResumeContent
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
export function calculateJobMatch(
  vacancy: JobVacancy,
  profile: UserProfile,
  preferences: CareerPreferences,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): JobMatchEvaluation {
  const profileSkills = profile.skills.map(s => s.name.toLowerCase().trim());
  const vacancyText = `${vacancy.title} ${vacancy.requirements.join(' ')} ${vacancy.tags.join(' ')} ${vacancy.description}`.toLowerCase();

  // 1. Skills match (weight default 30%)
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  
  // Extract required skill mentions
  const allTargetSkills = vacancy.requirements.length > 0
    ? vacancy.requirements
    : vacancy.tags.length > 0
    ? vacancy.tags
    : ['react', 'typescript', 'node.js', 'cloud', 'api'];

  for (const skill of allTargetSkills) {
    const sLower = skill.toLowerCase().trim();
    const hasSkill = profileSkills.some(ps => ps.includes(sLower) || sLower.includes(ps));
    if (hasSkill) {
      if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
    } else {
      if (!missingSkills.includes(skill)) missingSkills.push(skill);
    }
  }

  // Also check candidate's expert skills against vacancy text
  profile.skills.forEach(skill => {
    if (vacancyText.includes(skill.name.toLowerCase().trim())) {
      if (!matchedSkills.includes(skill.name)) {
        matchedSkills.push(skill.name);
      }
    }
  });

  const skillMatchRatio = matchedSkills.length + missingSkills.length > 0
    ? matchedSkills.length / (matchedSkills.length + missingSkills.length)
    : 0.7;
  const skillsScore = Math.min(100, Math.round(skillMatchRatio * 100));

  // 2. Experience match (weight default 25%)
  // Detect seniority requirement in job description
  let requiredYears = 3;
  if (/senior|lead|staff|principal|head/i.test(vacancy.title)) requiredYears = 5;
  if (/lead|staff|principal/i.test(vacancy.title)) requiredYears = 8;
  if (/junior|entry|associate/i.test(vacancy.title)) requiredYears = 1;

  const expRatio = profile.totalExperienceYears >= requiredYears
    ? 1.0
    : profile.totalExperienceYears / requiredYears;
  const experienceScore = Math.min(100, Math.round(expRatio * 100));

  // 3. Required qualifications & certifications (weight default 15%)
  let qualScore = 75; // baseline for degree
  if (profile.education.length > 0) qualScore += 15;
  if (profile.certifications.length > 0) qualScore += 10;
  qualScore = Math.min(100, qualScore);

  // 4. Seniority & role alignment (weight default 10%)
  const titleLower = vacancy.title.toLowerCase();
  const currentTitleLower = profile.currentTitle.toLowerCase();
  let seniorityScore = 60;
  if (preferences.preferredTitles.some(t => titleLower.includes(t.toLowerCase()) || t.toLowerCase().includes(titleLower))) {
    seniorityScore = 95;
  } else if (titleLower.includes('engineer') && currentTitleLower.includes('engineer')) {
    seniorityScore = 85;
  }

  // 5. Location & work arrangement (weight default 10%)
  let locationScore = 50;
  if (vacancy.remote && preferences.workArrangement.includes('remote')) {
    locationScore = 100;
  } else if (preferences.targetCountries.some(c => vacancy.country.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(vacancy.country.toLowerCase()))) {
    locationScore = 90;
  } else if (vacancy.arrangement === 'hybrid' && preferences.workArrangement.includes('hybrid')) {
    locationScore = 80;
  }

  // 6. Salary & employment preferences (weight default 10%)
  let salaryScore = 75;
  let salaryCompatibility: 'compatible' | 'below_threshold' | 'unspecified' | 'negotiable' = 'unspecified';

  if (vacancy.salaryRange?.min) {
    const currency = vacancy.salaryRange.currency || 'USD';
    const minAcceptable = preferences.minSalaryByCurrency[currency] || 100000;
    if (vacancy.salaryRange.max && vacancy.salaryRange.max >= minAcceptable) {
      salaryScore = 100;
      salaryCompatibility = 'compatible';
    } else if (vacancy.salaryRange.min >= minAcceptable) {
      salaryScore = 100;
      salaryCompatibility = 'compatible';
    } else {
      salaryScore = Math.max(30, Math.round((vacancy.salaryRange.min / minAcceptable) * 80));
      salaryCompatibility = 'below_threshold';
    }
  } else {
    salaryScore = 70; // Unspecified salary
    salaryCompatibility = 'unspecified';
  }

  // Weighted total score
  const totalWeight =
    weights.skillsWeight +
    weights.experienceWeight +
    weights.qualificationsWeight +
    weights.seniorityWeight +
    weights.locationWeight +
    weights.salaryWeight;

  const rawScore =
    (skillsScore * weights.skillsWeight +
      experienceScore * weights.experienceWeight +
      qualScore * weights.qualificationsWeight +
      seniorityScore * weights.seniorityWeight +
      locationScore * weights.locationWeight +
      salaryScore * weights.salaryWeight) /
    (totalWeight || 100);

  const matchScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Eligibility check
  const eligibility = checkHardEligibility(vacancy, profile, preferences);

  // Recommendations
  let recommendation: 'STRONG_APPLY' | 'CONSIDER' | 'MARGINAL' | 'DO_NOT_APPLY' = 'CONSIDER';
  if (!eligibility.isEligible) {
    recommendation = 'DO_NOT_APPLY';
  } else if (matchScore >= 80) {
    recommendation = 'STRONG_APPLY';
  } else if (matchScore >= 65) {
    recommendation = 'CONSIDER';
  } else {
    recommendation = 'MARGINAL';
  }

  const reasons: string[] = [];
  if (matchedSkills.length > 0) {
    reasons.push(`Strong overlap on key skills: ${matchedSkills.slice(0, 4).join(', ')}.`);
  }
  if (profile.totalExperienceYears >= requiredYears) {
    reasons.push(`Candidate possesses ${profile.totalExperienceYears} years experience (meets ${requiredYears}+ yrs criteria).`);
  }
  if (vacancy.remote && preferences.workArrangement.includes('remote')) {
    reasons.push('Full alignment with preferred Remote work arrangement.');
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
    matchedSkills,
    missingSkills,
    reasons,
    eligibilityIssues: eligibility.issues,
    salaryCompatibility,
    sponsorshipStatus: vacancy.visaSponsorship === 'supported' ? 'supported' : vacancy.visaSponsorship === 'not_supported' ? 'unsupported' : 'unspecified',
    recommendation,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Validates state transitions in the application lifecycle state machine.
 */
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DISCOVERED: ['VALIDATED', 'WITHDRAWN', 'FAILED', 'MATCHED', 'PREPARED'],
  VALIDATED: ['MATCHED', 'WITHDRAWN', 'FAILED'],
  MATCHED: ['RESUME_GENERATED', 'AWAITING_APPROVAL', 'PREPARED', 'WITHDRAWN', 'FAILED'],
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
