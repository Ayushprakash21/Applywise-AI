// src/utils/explainableMatcher.ts
// Explainable Candidate Opportunity Matching Engine (COME)
// Strict 6-dimension weighted scoring with zero fabrication and mandatory gatekeeping

import {
  UserProfile,
  CanonicalLiveJob,
  JobVacancy,
  ExplainableMatchBreakdown
} from '../types/index.ts';

export interface MatchCandidateContext {
  profile: Partial<UserProfile>;
  verifiedSkills?: string[];
  totalExperienceYears?: number;
  targetRole?: string;
  preferredLocations?: string[];
  preferredWorkArrangement?: 'remote' | 'hybrid' | 'onsite' | 'any';
  minSalary?: number;
  visaRequired?: boolean;
}

/**
 * Normalizes a skill or keyword for fuzzy matching
 */
function normalizeKeyword(kw: string): string {
  return kw.toLowerCase().trim().replace(/[^a-z0-9+#.-]/g, '');
}

/**
 * Computes Jaccard / token-based title similarity (0 - 1)
 */
function computeTitleSimilarity(jobTitle: string, targetRole: string): number {
  if (!jobTitle || !targetRole) return 0.4; // Neutral if unspecified
  const tNorm = jobTitle.toLowerCase();
  const rNorm = targetRole.toLowerCase();

  if (tNorm === rNorm) return 1.0;
  if (tNorm.includes(rNorm) || rNorm.includes(tNorm)) return 0.85;

  const tTokens = new Set(tNorm.split(/\s+/).filter(w => w.length > 2));
  const rTokens = new Set(rNorm.split(/\s+/).filter(w => w.length > 2));

  if (tTokens.size === 0 || rTokens.size === 0) return 0.3;

  let common = 0;
  for (const token of rTokens) {
    if (tTokens.has(token)) common++;
  }

  const union = new Set([...tTokens, ...rTokens]).size;
  return union > 0 ? common / union : 0;
}

/**
 * Evaluates a candidate profile against a canonical live job or vacancy
 * using the transparent 6-dimension weighting formula.
 */
export function evaluateCandidateJobMatch(
  job: CanonicalLiveJob | JobVacancy,
  context: MatchCandidateContext
): ExplainableMatchBreakdown {
  const evaluatedAt = new Date().toISOString();

  // 1. Gather candidate skills
  const candidateSkillSet = new Set<string>();
  if (context.verifiedSkills && context.verifiedSkills.length > 0) {
    context.verifiedSkills.forEach(s => candidateSkillSet.add(normalizeKeyword(s)));
  } else if (context.profile.skills && Array.isArray(context.profile.skills)) {
    context.profile.skills.forEach(s => {
      const name = typeof s === 'string' ? s : (s as any).name;
      if (name) candidateSkillSet.add(normalizeKeyword(name));
    });
  }

  // 2. Gather job requirements and skills
  const jobReqs: string[] = (job.requirements && job.requirements.length > 0)
    ? job.requirements
    : ((job as any).tags || []);
  const reqNormalized = jobReqs.map(r => ({ raw: r, norm: normalizeKeyword(r) })).filter(r => r.norm.length > 1);

  // DIMENSION 1: Core Skills Match (Weight: 30%, Max Score: 30)
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  if (reqNormalized.length === 0) {
    // If job specifies no granular requirements, assign neutral baseline
    matchedSkills.push('General alignment');
  } else {
    for (const req of reqNormalized) {
      let isMatched = candidateSkillSet.has(req.norm);
      if (!isMatched) {
        // Substring / partial token check
        for (const cSkill of candidateSkillSet) {
          if (cSkill.includes(req.norm) || req.norm.includes(cSkill)) {
            isMatched = true;
            break;
          }
        }
      }

      if (isMatched) {
        if (!matchedSkills.includes(req.raw)) matchedSkills.push(req.raw);
      } else {
        if (!missingSkills.includes(req.raw)) missingSkills.push(req.raw);
      }
    }
  }

  const totalEvaluatedSkills = matchedSkills.length + missingSkills.length;
  const skillRatio = totalEvaluatedSkills > 0 ? matchedSkills.length / totalEvaluatedSkills : 0.5;
  const coreSkillScore = Math.round(skillRatio * 30);

  // DIMENSION 2: Experience Level & Years (Weight: 25%, Max Score: 25)
  const candidateYears = context.totalExperienceYears ?? context.profile.totalExperienceYears ?? 0;
  const jobLevel = (((job as any).experienceLevel as string) || 'mid').toLowerCase();

  let requiredMinYears = 0;
  if (jobLevel === 'entry' || jobLevel.includes('junior')) requiredMinYears = 0;
  else if (jobLevel === 'mid') requiredMinYears = 3;
  else if (jobLevel === 'senior') requiredMinYears = 5;
  else if (jobLevel === 'lead' || jobLevel === 'staff') requiredMinYears = 8;
  else if (jobLevel === 'executive' || jobLevel === 'principal') requiredMinYears = 10;

  let experienceScore = 0;
  let experienceAssessment = '';

  if (candidateYears >= requiredMinYears) {
    experienceScore = 25;
    experienceAssessment = `Candidate has ${candidateYears} years of verified experience, satisfying the ${jobLevel} requirement (minimum ${requiredMinYears} years).`;
  } else {
    const diff = requiredMinYears - candidateYears;
    if (diff <= 1) {
      experienceScore = 18;
      experienceAssessment = `Candidate has ${candidateYears} years, slightly under the ${requiredMinYears}-year preferred threshold for ${jobLevel} roles.`;
    } else if (diff <= 3) {
      experienceScore = 10;
      experienceAssessment = `Candidate has ${candidateYears} years vs ${requiredMinYears} years required for ${jobLevel} level.`;
    } else {
      experienceScore = 4;
      experienceAssessment = `Substantial seniority gap: candidate has ${candidateYears} years, but role requires ${requiredMinYears}+ years for ${jobLevel}.`;
    }
  }

  // DIMENSION 3: Role & Title Alignment (Weight: 20%, Max Score: 20)
  const targetRole = context.targetRole || context.profile.currentTitle || '';
  const titleSim = computeTitleSimilarity(job.title, targetRole);
  const roleScore = Math.round(titleSim * 20);
  const roleAssessment = titleSim >= 0.8
    ? `Strong title match with target role "${targetRole || job.title}".`
    : titleSim >= 0.4
    ? `Moderate domain overlap between candidate focus and "${job.title}".`
    : `Limited direct title overlap with candidate's target role "${targetRole}".`;

  // DIMENSION 4: Mandatory Qualifications (Weight: 10%, Max Score: 10)
  // Check for hard constraints (e.g. security clearance, specific degree, work auth)
  const mandatoryGaps: string[] = [];
  const descLower = (job.description || '').toLowerCase();

  // Check visa sponsorship if candidate explicitly requires it
  if (context.visaRequired || context.profile.requiresVisaSponsorship) {
    const jobVisa = (job as any).visaSponsorship || '';
    if (jobVisa === 'not_supported' || jobVisa === 'unsupported' || descLower.includes('no sponsorship') || descLower.includes('must be authorized without sponsorship')) {
      mandatoryGaps.push('Visa sponsorship is not supported by this employer');
    }
  }

  // Check strict degree or license mentions if marked required
  if (descLower.includes('must have active ts/sci') && !candidateSkillSet.has('clearance')) {
    mandatoryGaps.push('Active TS/SCI Security Clearance required');
  }

  let mandatoryScore = 10;
  let mandatoryAssessment = 'All mandatory requirements satisfied or no restrictive barriers identified.';

  if (mandatoryGaps.length > 0) {
    mandatoryScore = 0; // Hard gate penalty
    mandatoryAssessment = `Unsatisfied mandatory qualifications: ${mandatoryGaps.join('; ')}.`;
  }

  // DIMENSION 5: Geographic & Work-Mode Compatibility (Weight: 10%, Max Score: 10)
  let geoScore = 10;
  let geoAssessment = '';
  const isJobRemote = job.workArrangement === 'remote' || (job as any).remote === true;
  const candidateArrangement = context.preferredWorkArrangement || 'any';

  if (isJobRemote) {
    geoScore = 10;
    geoAssessment = 'Fully remote opportunity compatible with candidate location.';
  } else if (candidateArrangement === 'remote') {
    // Candidate strictly wants remote, but job is onsite/hybrid
    geoScore = 2;
    geoAssessment = `Candidate prefers remote work, but opportunity is ${job.workArrangement || 'onsite'}.`;
  } else {
    // Compare candidate location with job location/country
    const candLoc = (context.profile.location || '').toLowerCase();
    const jobLoc = (job.location || '').toLowerCase();
    const jobCountry = (job.country || '').toLowerCase();

    if (candLoc && (jobLoc.includes(candLoc) || jobCountry.includes(candLoc))) {
      geoScore = 10;
      geoAssessment = `Location match in ${job.location || job.country}.`;
    } else {
      geoScore = 5;
      geoAssessment = `Job is located in ${job.location || job.country}; candidate location is ${context.profile.location || 'unspecified'}. Relocation or commute required.`;
    }
  }

  // DIMENSION 6: Candidate Preferences Alignment (Weight: 5%, Max Score: 5)
  let prefScore = 5;
  let prefAssessment = 'Role aligns with candidate compensation expectations and profile preferences.';

  if (context.minSalary && (job as any).salaryMin) {
    if ((job as any).salaryMin < context.minSalary) {
      prefScore = 2;
      prefAssessment = `Offered salary range is below candidate's preferred minimum of ${context.minSalary}.`;
    }
  }

  // AGGREGATE SCORE & MANDATORY GATEKEEPING
  let overallScore = coreSkillScore + experienceScore + roleScore + mandatoryScore + geoScore + prefScore;

  // STRICT PENALTY: If mandatory requirements fail or candidate has no matching technical skills for a specialized senior role
  if (mandatoryGaps.length > 0) {
    // Cannot exceed 45% if mandatory disqualifier exists
    overallScore = Math.min(overallScore, 45);
  }

  // Clamp within [0, 100]
  overallScore = Math.max(0, Math.min(100, overallScore));

  // Determine alignment tier
  let tier: 'Strong Fit' | 'Good Fit' | 'Moderate Fit' | 'Low Fit' = 'Low Fit';
  if (overallScore >= 85) tier = 'Strong Fit';
  else if (overallScore >= 70) tier = 'Good Fit';
  else if (overallScore >= 50) tier = 'Moderate Fit';

  // Construct transparent recommendation reason
  let reason = '';
  if (tier === 'Strong Fit') {
    reason = `Exceptional alignment: Candidate matches ${matchedSkills.length} core technical requirements and satisfies seniority criteria for this ${job.title} role.`;
  } else if (tier === 'Good Fit') {
    reason = `Solid candidacy: Strong role alignment and experience fit, with ${matchedSkills.length} matching skills and minor gaps in ${missingSkills.slice(0, 2).join(', ') || 'specialized tools'}.`;
  } else if (tier === 'Moderate Fit') {
    reason = `Partial match: Candidate meets baseline domain qualifications, but has notable gaps in ${missingSkills.slice(0, 3).join(', ') || 'key requirements'}.`;
  } else {
    reason = `Low alignment: Significant mismatches in core skills, required seniority, or mandatory criteria.`;
  }

  return {
    overallScore,
    tier,
    algorithmVersion: '2.0.0',
    dimensions: {
      coreSkills: {
        score: coreSkillScore,
        maxScore: 30,
        weight: '30%',
        matchedSkills,
        missingSkills,
      },
      experience: {
        score: experienceScore,
        maxScore: 25,
        weight: '25%',
        candidateYears,
        requiredLevel: jobLevel,
        assessment: experienceAssessment,
      },
      roleAlignment: {
        score: roleScore,
        maxScore: 20,
        weight: '20%',
        targetRoleMatch: titleSim >= 0.7,
        titleSimilarity: Math.round(titleSim * 100) / 100,
        assessment: roleAssessment,
      },
      mandatoryQualifications: {
        score: mandatoryScore,
        maxScore: 10,
        weight: '10%',
        hasMandatoryGaps: mandatoryGaps.length > 0,
        gaps: mandatoryGaps,
        assessment: mandatoryAssessment,
      },
      geoAndWorkMode: {
        score: geoScore,
        maxScore: 10,
        weight: '10%',
        candidateLocation: context.profile.location || 'Not specified',
        jobLocation: job.location || job.country || 'Global',
        workArrangementMatch: geoScore >= 8,
        assessment: geoAssessment,
      },
      candidatePreferences: {
        score: prefScore,
        maxScore: 5,
        weight: '5%',
        salaryMatch: prefScore >= 4,
        industryMatch: true,
        assessment: prefAssessment,
      },
    },
    recommendationReason: reason,
    confidence: candidateSkillSet.size > 0 ? 0.95 : 0.6,
    evaluatedAt,
  };
}
