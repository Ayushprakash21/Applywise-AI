// worker/matchingEngine.ts
// Structured 6-Dimension Weighted Scoring & Cross-Industry Evaluation for Cloudflare Workers

import { UserProfile, CareerPreferences, JobVacancy } from '../src/types/index.ts';

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

export const workerMatchingEngine = {
  /**
   * Evaluates candidate suitability against job vacancy using structured weighted scoring:
   * - Skills: 25%
   * - Experience & Responsibilities: 25%
   * - Job-Title & Family Alignment: 20%
   * - Qualifications: 10%
   * - Location & Work Authorization: 10%
   * - Salary & Preferences: 10%
   */
  async evaluateMatch(
    profile: UserProfile,
    preferences: CareerPreferences,
    vacancy: JobVacancy,
    apiKey?: string
  ): Promise<MatchAnalysis> {
    const reasons: string[] = [];
    const missingRequirements: string[] = [];
    const eligibilityConcerns: string[] = [];
    const reasonsToConsider: string[] = [];
    const dataQualityNotes: string[] = [];

    let isEligible = true;

    // 1. Mandatory Exclusions
    const companyLower = (vacancy.company || '').toLowerCase();
    const titleLower = (vacancy.title || '').toLowerCase();
    const descLower = (vacancy.description || '').toLowerCase();

    if (preferences.excludedCompanies && preferences.excludedCompanies.length > 0) {
      for (const exc of preferences.excludedCompanies) {
        if (exc && companyLower.includes(exc.toLowerCase().trim())) {
          isEligible = false;
          eligibilityConcerns.push(`Excluded company: "${vacancy.company}" matches candidate exclusion.`);
        }
      }
    }

    if (preferences.excludedKeywords && preferences.excludedKeywords.length > 0) {
      for (const kw of preferences.excludedKeywords) {
        if (kw && (titleLower.includes(kw.toLowerCase().trim()) || descLower.includes(kw.toLowerCase().trim()))) {
          isEligible = false;
          eligibilityConcerns.push(`Excluded keyword: "${kw}" found in job listing.`);
        }
      }
    }

    // 2. Visa Sponsorship Check
    if (preferences.requiresVisaSponsorship || preferences.visaSponsorshipRequired) {
      if (vacancy.visaSponsorship === 'not_supported' || vacancy.visaSponsorship === 'unsupported') {
        isEligible = false;
        eligibilityConcerns.push('Visa sponsorship required by candidate, but vacancy explicitly states no sponsorship.');
      } else if (vacancy.visaSponsorship === 'unknown' || !vacancy.visaSponsorship) {
        eligibilityConcerns.push('Visa sponsorship requirement unverified in listing.');
      }
    }

    // 3. Skills Scoring (25% max)
    let skillsScore = 0;
    const candidateSkills = (profile.skills || []).map(s => s.name.toLowerCase().trim());
    const jobRequirements = (vacancy.requirements || []).map(r => r.toLowerCase().trim());

    if (jobRequirements.length > 0) {
      let matchedCount = 0;
      for (const req of jobRequirements) {
        const found = candidateSkills.some(cs => cs.includes(req) || req.includes(cs) || descLower.includes(cs));
        if (found) {
          matchedCount++;
          reasons.push(`Matched required skill: ${req}`);
        } else {
          missingRequirements.push(req);
        }
      }
      skillsScore = Math.min(25, Math.round((matchedCount / jobRequirements.length) * 25));
    } else {
      // Evaluate skills present in description
      let matchedInDesc = 0;
      for (const skill of candidateSkills) {
        if (skill.length > 2 && descLower.includes(skill)) {
          matchedInDesc++;
          if (matchedInDesc <= 3) reasons.push(`Demonstrated skill match: ${skill}`);
        }
      }
      skillsScore = Math.min(25, matchedInDesc * 5);
      dataQualityNotes.push('Job listing did not include structured requirements list.');
    }

    // 4. Experience & Responsibilities Scoring (25% max)
    let experienceScore = 0;
    const candidateYears = profile.totalExperienceYears || 0;
    const expMatch = descLower.match(/(\d+)\+?\s*years?(?:\s+of)?\s+experience/);
    const requiredYears = expMatch ? parseInt(expMatch[1], 10) : 0;

    if (requiredYears > 0) {
      if (candidateYears >= requiredYears) {
        experienceScore = 25;
        reasons.push(`Meets experience threshold: ${candidateYears} years versus ${requiredYears} required`);
      } else if (candidateYears >= requiredYears * 0.7) {
        experienceScore = 15;
        missingRequirements.push(`Candidate has ${candidateYears} years experience; role mentions ${requiredYears}+ years`);
      } else {
        experienceScore = 5;
        missingRequirements.push(`Significant experience gap: ${candidateYears} years vs ${requiredYears}+ required`);
      }
    } else {
      experienceScore = candidateYears >= 5 ? 20 : (candidateYears >= 2 ? 15 : 10);
      dataQualityNotes.push('Years of experience requirement not explicitly quantified in listing.');
    }

    // 5. Job Title & Family Alignment (20% max)
    let titleScore = 0;
    const targetRoles = preferences.targetRoles || preferences.preferredTitles || [];
    const candidateTitle = (profile.currentTitle || '').toLowerCase();
    const candidateJobFamily = detectJobFamily(candidateTitle, (profile.experiences || []).map(e => e.role).join(' '));
    const vacancyJobFamily = detectJobFamily(titleLower, descLower);

    const titleExact = targetRoles.some(tr => titleLower.includes(tr.toLowerCase()) || tr.toLowerCase().includes(titleLower));
    if (titleExact || (candidateTitle && titleLower.includes(candidateTitle))) {
      titleScore = 20;
      reasons.push(`Target role alignment: "${vacancy.title}" aligns with candidate title targets.`);
    } else if (candidateJobFamily !== 'general' && candidateJobFamily === vacancyJobFamily) {
      titleScore = 14;
      reasons.push(`Cross-industry domain alignment in ${candidateJobFamily.replace('_', ' ')}.`);
    } else {
      titleScore = 5;
      dataQualityNotes.push(`Title not an exact match to target roles (${targetRoles.join(', ')}).`);
    }

    // 6. Qualifications & Education (10% max)
    let qualificationsScore = 0;
    const degreeRequired = descLower.includes("bachelor's") || descLower.includes("master's") || descLower.includes('degree') || descLower.includes('bs ') || descLower.includes('ms ');
    if (degreeRequired) {
      const hasDegree = (profile.education || []).length > 0;
      if (hasDegree) {
        qualificationsScore = 10;
        reasons.push('Candidate holds verified post-secondary educational degree.');
      } else {
        qualificationsScore = 0;
        missingRequirements.push('Degree mentioned in vacancy; none recorded in profile.');
      }
    } else {
      qualificationsScore = (profile.education && profile.education.length > 0) ? 10 : 5;
    }

    // 7. Location & Work Authorization (10% max)
    let locationScore = 0;
    const targetCountries = (preferences.targetCountries || []).map(c => c.toLowerCase());
    const isRemote = vacancy.remote || (vacancy.arrangement === 'remote') || descLower.includes('remote');
    const candWantsRemote = (preferences.workArrangement || []).includes('remote') || (preferences.workArrangements || []).includes('remote');

    if (isRemote && candWantsRemote) {
      locationScore = 10;
      reasons.push('Remote work arrangement matches candidate preferences.');
    } else if (targetCountries.some(tc => (vacancy.country || '').toLowerCase().includes(tc) || (vacancy.location || '').toLowerCase().includes(tc))) {
      locationScore = 10;
      reasons.push(`Location matches candidate target country: ${vacancy.country || vacancy.location}`);
    } else {
      locationScore = 4;
      dataQualityNotes.push('Location unconfirmed or outside primary country target.');
    }

    // 8. Salary & Preferences (10% max)
    let salaryScore = 10;
    let salaryCompatible = true;
    const minSalary = preferences.minSalaryUSD || 0;
    if (minSalary > 0 && vacancy.salaryRange?.raw) {
      const salaryNums = vacancy.salaryRange.raw.match(/\d+[\d,.]*/g);
      if (salaryNums && salaryNums.length > 0) {
        const topNum = parseInt(salaryNums[salaryNums.length - 1].replace(/,/g, ''), 10);
        if (topNum > 1000 && topNum < minSalary * 0.8) {
          salaryScore = 2;
          salaryCompatible = false;
          missingRequirements.push(`Posted salary range (${vacancy.salaryRange.raw}) below candidate threshold ($${minSalary.toLocaleString()}).`);
        } else {
          salaryScore = 10;
          reasons.push(`Compensation matches or exceeds expectation: ${vacancy.salaryRange.raw}`);
        }
      }
    }

    const totalScore = Math.min(100, skillsScore + experienceScore + titleScore + qualificationsScore + locationScore + salaryScore);

    if (totalScore >= 75) {
      reasonsToConsider.push('Strong composite score across skills, experience, and domain alignment.');
    } else if (totalScore >= 60) {
      reasonsToConsider.push('Solid foundational match with opportunities for growth.');
    }

    const dataQuality: 'high' | 'moderate' | 'limited' =
      dataQualityNotes.length === 0 ? 'high' : (dataQualityNotes.length <= 2 ? 'moderate' : 'limited');

    return {
      score: totalScore,
      isEligible,
      breakdown: {
        skills: skillsScore,
        experience: experienceScore,
        titleAlignment: titleScore,
        qualifications: qualificationsScore,
        locationWorkAuth: locationScore,
        salaryPreferences: salaryScore,
      },
      reasons,
      missingRequirements,
      eligibilityConcerns,
      reasonsToConsider,
      dataQuality,
      dataQualityNotes,
      salaryCompatible,
    };
  },
};
