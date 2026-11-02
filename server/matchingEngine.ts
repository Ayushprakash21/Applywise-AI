import { GoogleGenAI } from '@google/genai';
import { UserProfile, CareerPreferences, JobVacancy } from '../src/types/index.ts';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export interface MatchAnalysis {
  score: number;
  isEligible: boolean;
  breakdown: {
    skills: number; // 25% max
    experience: number; // 25% max
    titleAlignment: number; // 20% max
    qualifications: number; // 10% max
    locationWorkAuth: number; // 10% max
    salaryPreferences: number; // 10% max
  };
  reasons: string[];
  missingRequirements: string[];
  eligibilityConcerns: string[];
  reasonsToConsider: string[];
  dataQuality: 'high' | 'moderate' | 'limited';
  dataQualityNotes: string[];
  salaryCompatible?: boolean;
}

// Common job family definitions for cross-industry matching
export const JOB_FAMILIES: Record<string, string[]> = {
  'supply_chain': ['supply chain', 'procurement', 'logistics', 'inventory', 'warehouse', 'sourcing', 'buyer'],
  'project_management': ['project manager', 'program manager', 'scrum master', 'agile coach', 'delivery manager', 'pmo'],
  'business_analysis': ['business analyst', 'systems analyst', 'operations analyst', 'product analyst', 'bi analyst'],
  'customer_operations': ['customer success', 'customer operations', 'support manager', 'client service', 'account manager'],
  'finance': ['financial analyst', 'accountant', 'controller', 'fp&a', 'auditor', 'treasury', 'finance manager'],
  'marketing': ['marketing manager', 'growth', 'seo', 'content strategist', 'product marketing', 'brand manager'],
  'engineering': ['software engineer', 'developer', 'frontend', 'backend', 'full stack', 'devops', 'sre', 'architect', 'cloud engineer'],
  'product': ['product manager', 'head of product', 'product owner', 'group product manager'],
  'ai_data': ['data scientist', 'machine learning', 'ai engineer', 'data engineer', 'deep learning', 'mlops'],
};

export function detectJobFamily(title: string, desc: string): string {
  const combined = `${title} ${desc}`.toLowerCase();
  for (const [family, keywords] of Object.entries(JOB_FAMILIES)) {
    if (keywords.some(kw => combined.includes(kw))) {
      return family;
    }
  }
  return 'general';
}

export const matchingEngine = {
  /**
   * Evaluates candidate suitability against job vacancy using structured weighted scoring:
   * - Skills: 25%
   * - Experience & Responsibilities: 25%
   * - Job-Title & Family Alignment: 20%
   * - Qualifications: 10%
   * - Location & Work Authorization: 10%
   * - Salary & Preferences: 10%
   *
   * Enforces mandatory eligibility separately. Does NOT award positive evidence points to unknown info.
   */
  async evaluateMatch(
    profile: UserProfile,
    preferences: CareerPreferences,
    vacancy: JobVacancy
  ): Promise<MatchAnalysis> {
    const reasons: string[] = [];
    const missingRequirements: string[] = [];
    const eligibilityConcerns: string[] = [];
    const reasonsToConsider: string[] = [];
    const dataQualityNotes: string[] = [];

    // --- 1. MANDATORY ELIGIBILITY (Gate check) ---
    let isEligible = true;

    // A. Excluded companies
    if (preferences.excludedCompanies && preferences.excludedCompanies.length > 0) {
      const lowerCompany = vacancy.company.toLowerCase();
      if (preferences.excludedCompanies.some(exc => exc.trim() && lowerCompany.includes(exc.toLowerCase().trim()))) {
        isEligible = false;
        eligibilityConcerns.push(`Company "${vacancy.company}" is in your excluded companies list.`);
      }
    }

    // B. Excluded keywords
    if (preferences.excludedKeywords && preferences.excludedKeywords.length > 0) {
      const lowerText = `${vacancy.title} ${vacancy.description}`.toLowerCase();
      for (const kw of preferences.excludedKeywords) {
        if (kw.trim() && lowerText.includes(kw.toLowerCase().trim())) {
          isEligible = false;
          eligibilityConcerns.push(`Listing contains excluded keyword: "${kw}".`);
          break;
        }
      }
    }

    // C. Visa sponsorship requirement
    const requiresVisa = preferences.requiresVisaSponsorship || preferences.visaSponsorshipRequired;
    if (requiresVisa) {
      if (vacancy.visaSponsorship === 'unsupported' || vacancy.visaSponsorship === 'not_supported') {
        isEligible = false;
        eligibilityConcerns.push('Employer explicitly does not provide visa sponsorship.');
      } else if (vacancy.visaSponsorship === 'unknown' || !vacancy.visaSponsorship) {
        eligibilityConcerns.push('Visa sponsorship status is unconfirmed by employer.');
      } else {
        reasons.push('Employer explicitly supports visa sponsorship.');
      }
    }

    // --- 2. STRUCTURED WEIGHTED SCORING ---

    // Dimension 1: Skills Alignment (25% weight, max 25 points)
    let skillsPoints = 0;
    const candidateSkills = profile.skills.map(s => s.name.toLowerCase().trim());
    const lowerDesc = vacancy.description.toLowerCase();
    const vacancyReqs = vacancy.requirements.map(r => r.toLowerCase().trim());

    const matchedSkillsList: string[] = [];
    const unverifiedSkillsList: string[] = [];

    // Check vacancy requirements against candidate skills
    for (const req of vacancyReqs) {
      const hasSkill = candidateSkills.some(cs => cs.includes(req) || req.includes(cs));
      if (hasSkill) {
        matchedSkillsList.push(req);
      } else {
        unverifiedSkillsList.push(req);
      }
    }

    // Also check candidate skills in job description
    for (const cs of candidateSkills) {
      if (lowerDesc.includes(cs) && !matchedSkillsList.includes(cs)) {
        matchedSkillsList.push(cs);
      }
    }

    if (candidateSkills.length > 0) {
      const skillRatio = matchedSkillsList.length / Math.max(1, vacancyReqs.length || 5);
      skillsPoints = Math.min(25, Math.round(Math.min(1, skillRatio) * 25));
      if (matchedSkillsList.length > 0) {
        reasons.push(`Matched ${matchedSkillsList.length} verified candidate skills (${matchedSkillsList.slice(0, 4).join(', ')}).`);
      }
    } else {
      dataQualityNotes.push('Candidate profile has no verified skills listed.');
    }

    if (unverifiedSkillsList.length > 0) {
      missingRequirements.push(...unverifiedSkillsList.slice(0, 5));
    }

    // Dimension 2: Experience & Responsibilities (25% weight, max 25 points)
    let experiencePoints = 0;
    const candidateYears = profile.totalExperienceYears || 0;

    // Detect requested years of experience from description (e.g. "5+ years", "3-5 years")
    const yearsMatch = lowerDesc.match(/(\d+)\+?\s*years?(?:\s+of)?\s+experience/i);
    const requiredYears = yearsMatch ? parseInt(yearsMatch[1], 10) : 3;

    if (candidateYears >= requiredYears) {
      experiencePoints = 25;
      reasons.push(`Meets experience criteria (${candidateYears} yrs vs ${requiredYears} yrs requested).`);
    } else if (candidateYears > 0) {
      experiencePoints = Math.round((candidateYears / Math.max(1, requiredYears)) * 20);
      missingRequirements.push(`Role requests ${requiredYears}+ yrs experience (profile has ${candidateYears} yrs).`);
    } else {
      experiencePoints = 0;
      dataQualityNotes.push('No verified years of experience on candidate profile.');
    }

    // Dimension 3: Job-Title & Family Alignment (20% weight, max 20 points)
    let titlePoints = 0;
    const targetRoles = (preferences.targetRoles && preferences.targetRoles.length > 0)
      ? preferences.targetRoles
      : (preferences.preferredTitles || []);

    const lowerTitle = vacancy.title.toLowerCase();
    const vacancyFamily = detectJobFamily(vacancy.title, vacancy.description);

    const directTitleMatch = targetRoles.some(tr =>
      lowerTitle.includes(tr.toLowerCase()) || tr.toLowerCase().includes(lowerTitle)
    );

    if (directTitleMatch) {
      titlePoints = 20;
      reasons.push(`Job title directly matches target role preference.`);
    } else {
      // Check family match
      const candidateFamilyMatches = targetRoles.some(tr => detectJobFamily(tr, '') === vacancyFamily);
      if (candidateFamilyMatches) {
        titlePoints = 14;
        reasons.push(`Job belongs to preferred ${vacancyFamily.replace('_', ' ')} career family.`);
      } else if (targetRoles.length === 0) {
        titlePoints = 10;
        dataQualityNotes.push('No target roles configured in candidate preferences.');
      } else {
        titlePoints = 4;
        missingRequirements.push(`Role family (${vacancyFamily}) differs from preferred target titles.`);
      }
    }

    // Dimension 4: Qualifications & Education (10% weight, max 10 points)
    // CRITICAL: Do NOT award positive points to unknown qualifications
    let qualPoints = 0;
    const hasDegreeReq = lowerDesc.includes('bachelor') || lowerDesc.includes('degree') || lowerDesc.includes('master');

    if (profile.education && profile.education.length > 0) {
      if (hasDegreeReq) {
        qualPoints = 10;
        reasons.push(`Verified education (${profile.education[0].degree}) satisfies degree qualification.`);
      } else {
        qualPoints = 7;
      }
    } else {
      // No positive points awarded to missing/unknown qualifications
      qualPoints = 0;
      if (hasDegreeReq) {
        missingRequirements.push('Degree required by vacancy but not present on verified profile.');
      }
    }

    // Dimension 5: Location & Work Arrangement (10% weight, max 10 points)
    let locationPoints = 0;
    const preferredArrangements = preferences.workArrangements || preferences.workArrangement || ['remote'];

    if (vacancy.remote && preferredArrangements.includes('remote')) {
      locationPoints = 10;
      reasonsToConsider.push('100% remote arrangement aligns with your preferences.');
    } else if (preferences.targetCountries && preferences.targetCountries.length > 0) {
      const countryMatch = preferences.targetCountries.some(tc =>
        vacancy.location.toLowerCase().includes(tc.toLowerCase()) ||
        vacancy.country.toLowerCase().includes(tc.toLowerCase())
      );
      if (countryMatch) {
        locationPoints = 10;
        reasons.push(`Location (${vacancy.location}) matches preferred target country.`);
      } else {
        locationPoints = 3;
        missingRequirements.push(`Location (${vacancy.location}) outside preferred target countries.`);
      }
    } else {
      locationPoints = 5;
    }

    // Dimension 6: Salary & Preferences (10% weight, max 10 points)
    let salaryPoints = 0;
    const minSalary = preferences.minSalaryUSD || 0;

    if (vacancy.salaryRange?.min) {
      if (minSalary === 0 || vacancy.salaryRange.min >= minSalary) {
        salaryPoints = 10;
        reasons.push(`Advertised compensation meets minimum salary floor.`);
      } else {
        salaryPoints = 2;
        eligibilityConcerns.push(`Salary range (${vacancy.salaryRange.raw}) is below target floor.`);
      }
    } else {
      // Salary unspecified by employer: neutral 5 points, not full points
      salaryPoints = 5;
      dataQualityNotes.push('Compensation not disclosed by employer.');
    }

    // Total Score Calculation
    let rawScore = skillsPoints + experiencePoints + titlePoints + qualPoints + locationPoints + salaryPoints;

    // If candidate has zero skills and zero experience, clamp to prevent false high score
    if (candidateSkills.length === 0 && candidateYears === 0) {
      rawScore = Math.min(rawScore, 20);
    }

    // If hard ineligible, clamp score
    if (!isEligible) {
      rawScore = Math.min(rawScore, 35);
    }

    const finalScore = Math.max(5, Math.min(98, rawScore));

    // Data quality rating
    const dataQuality: 'high' | 'moderate' | 'limited' =
      dataQualityNotes.length === 0 ? 'high' : dataQualityNotes.length <= 2 ? 'moderate' : 'limited';

    return {
      score: finalScore,
      isEligible,
      breakdown: {
        skills: skillsPoints,
        experience: experiencePoints,
        titleAlignment: titlePoints,
        qualifications: qualPoints,
        locationWorkAuth: locationPoints,
        salaryPreferences: salaryPoints,
      },
      reasons: reasons.length > 0 ? reasons : ['General baseline match.'],
      missingRequirements: Array.from(new Set(missingRequirements)),
      eligibilityConcerns,
      reasonsToConsider: reasonsToConsider.length > 0 ? reasonsToConsider : ['Career progression opportunity.'],
      dataQuality,
      dataQualityNotes,
      salaryCompatible: salaryPoints >= 5,
    };
  },
};
