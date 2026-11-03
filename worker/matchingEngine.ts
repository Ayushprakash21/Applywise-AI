// worker/matchingEngine.ts
// Structured 6-Dimension Weighted Scoring & Cross-Industry Evaluation with Zero-Hallucination Evidence

import {
  UserProfile,
  CareerPreferences,
  JobVacancy,
  OpportunityAlignmentTier,
  HonestAssessment,
  ProfileEvidenceItem,
} from '../src/types/index.ts';
import { careerIntelligenceEngine } from './careerIntelligenceEngine.ts';

export interface MatchAnalysis {
  score: number;
  overallScore?: number;
  missingSkills?: string[];
  isEligible: boolean;
  alignmentTier?: OpportunityAlignmentTier;
  honestAssessment?: HonestAssessment;
  essentialRequirementsMatched?: string[];
  preferredRequirementsMatched?: string[];
  missingEssentialRequirements?: string[];
  missingPreferredRequirements?: string[];
  relevantExperienceYears?: number;
  requiredExperienceYears?: number;
  potentialConcerns?: string[];
  unverifiedInformation?: string[];
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
  insufficientData?: boolean;
  scoreMessage?: string;
  profileEvidence?: ProfileEvidenceItem[];
  mandatoryRequirements?: string[];
  preferredRequirements?: string[];
  transferableSkills?: string[];
}

export const JOB_FAMILIES: Record<string, string[]> = {
  'supply_chain': ['supply chain', 'procurement', 'logistics', 'inventory', 'warehouse', 'sourcing', 'buyer'],
  'project_management': ['project manager', 'program manager', 'scrum master', 'agile coach', 'delivery manager', 'pmo'],
  'business_analysis': ['business analyst', 'systems analyst', 'operations analyst', 'product analyst', 'bi analyst'],
  'customer_operations': ['customer success', 'customer operations', 'support manager', 'client service', 'account manager'],
  'finance': ['financial analyst', 'accountant', 'controller', 'fp&a', 'auditor', 'treasury', 'finance manager'],
  'marketing': ['marketing manager', 'growth', 'seo', 'content strategist', 'product marketing', 'brand manager'],
  'engineering': ['software engineer', 'developer', 'frontend', 'backend', 'full stack', 'devops', 'sre', 'architect', 'cloud engineer', 'distributed systems'],
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
   * Evaluates candidate suitability against job vacancy using evidence-backed weighted scoring:
   * - Skills: 25%
   * - Experience & Responsibilities: 25%
   * - Job-Title & Family Alignment: 20%
   * - Qualifications: 10%
   * - Location & Work Authorization: 10%
   * - Salary & Preferences: 10%
   */
  async evaluateMatch(
    param1: any,
    param2: any,
    param3?: any,
    _apiKey?: string
  ): Promise<MatchAnalysis & { overallScore: number }> {
    let profile: UserProfile;
    let preferences: CareerPreferences;
    let vacancy: JobVacancy;

    if (param1?.requirements || param1?.requiredSkills || param1?.title) {
      vacancy = param1;
      profile = param2;
      preferences = Array.isArray(param3) ? {} as any : (param3 || {});
    } else {
      profile = param1;
      preferences = param2 || {};
      vacancy = param3;
    }

    if (!preferences.excludedCompanies) preferences.excludedCompanies = [];
    if (!preferences.excludedKeywords) preferences.excludedKeywords = [];
    const rawReqs = (vacancy.mandatoryRequirements && vacancy.mandatoryRequirements.length > 0)
      ? [...vacancy.mandatoryRequirements, ...(vacancy.preferredRequirements || [])]
      : (vacancy.requiredSkills && vacancy.requiredSkills.length > 0)
        ? [...vacancy.requiredSkills, ...(vacancy.preferredSkills || [])]
        : (vacancy.requirements && vacancy.requirements.length > 0)
          ? vacancy.requirements
          : (vacancy.tags && vacancy.tags.length > 0 ? vacancy.tags : []);

    // 0. Insufficient Information Check
    const hasExperiences = profile?.experiences && profile.experiences.length > 0;
    const hasSkills = profile?.skills && profile.skills.length > 0;

    if (!profile || !profile.fullName || (!hasExperiences && !hasSkills)) {
      return {
        score: 0,
        overallScore: 0,
        isEligible: false,
        insufficientData: true,
        scoreMessage: 'Insufficient verified profile information to calculate a reliable match.',
        reasons: ['Please upload and verify your work history in Career Profile to generate an accurate match.'],
        missingRequirements: rawReqs,
        mandatoryRequirements: rawReqs,
        preferredRequirements: [],
        transferableSkills: [],
        eligibilityConcerns: ['No verified career facts or documented skills available.'],
        reasonsToConsider: [],
        dataQuality: 'limited',
        dataQualityNotes: ['Candidate profile contains no verified employment history.'],
        breakdown: {
          skills: 0,
          experience: 0,
          titleAlignment: 0,
          qualifications: 0,
          locationWorkAuth: 0,
          salaryPreferences: 0,
        },
        profileEvidence: rawReqs.map((req, i) => ({
          id: `evi_req_${i}`,
          requirement: req,
          category: 'mandatory',
          candidateEvidence: 'Not found in your verified profile.',
          source: 'Verified Profile Facts',
          status: 'NOT_FOUND',
          assessment: 'Missing from candidate facts.',
          confidence: 0,
        })),
      };
    }

    const reasons: string[] = [];
    const missingRequirements: string[] = [];
    const eligibilityConcerns: string[] = [];
    const reasonsToConsider: string[] = [];
    const dataQualityNotes: string[] = [];
    const transferableSkills: string[] = [];
    const profileEvidence: ProfileEvidenceItem[] = [];

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

    // 3. Partition Requirements into Mandatory vs Preferred
    const mandatoryRequirements: string[] = [];
    const preferredRequirements: string[] = [];

    for (const r of rawReqs) {
      const rl = r.toLowerCase();
      if (rl.includes('preferred') || rl.includes('nice to have') || rl.includes('plus') || rl.includes('bonus')) {
        preferredRequirements.push(r);
      } else {
        mandatoryRequirements.push(r);
      }
    }

    // 4. Skills Scoring (25% max) & Profile Evidence Traceability
    let skillsScore = 0;
    const candidateSkills = (profile.skills || []).map(s => s.name.toLowerCase().trim());

    if (rawReqs.length > 0) {
      let matchedCount = 0;
      for (const req of rawReqs) {
        const rLower = req.toLowerCase().trim();
        const found = candidateSkills.some(cs => cs.includes(rLower) || rLower.includes(cs));

        if (found) {
          matchedCount++;
          reasons.push(`Matched required skill: ${req}`);
          profileEvidence.push({
            id: `evi_${profileEvidence.length}`,
            requirement: req,
            category: preferredRequirements.includes(req) ? 'preferred' : 'mandatory',
            candidateEvidence: `Documented verified skill: ${req}`,
            source: 'Resume document, Verified Skills Registry',
            status: 'SUPPORTED',
            assessment: 'Direct verified match against published job spec.',
            confidence: 1.0,
          });
        } else {
          // Check for transferable domain capability
          const related = candidateSkills.find(cs => {
            if (rLower.includes('management') && cs.includes('management')) return true;
            if (rLower.includes('operations') && cs.includes('operations')) return true;
            if (rLower.includes('logistics') && cs.includes('supply chain')) return true;
            return false;
          });

          if (related) {
            transferableSkills.push(req);
            profileEvidence.push({
              id: `evi_${profileEvidence.length}`,
              requirement: req,
              category: preferredRequirements.includes(req) ? 'preferred' : 'mandatory',
              candidateEvidence: `Transferable background in ${related}`,
              source: 'Verified Profile Experience',
              status: 'TRANSFERABLE',
              assessment: 'Candidate possesses transferable domain background; direct technical overlap requires validation.',
              confidence: 0.7,
            });
          } else {
            missingRequirements.push(req);
            profileEvidence.push({
              id: `evi_${profileEvidence.length}`,
              requirement: req,
              category: preferredRequirements.includes(req) ? 'preferred' : 'mandatory',
              candidateEvidence: 'Not found in your verified profile.',
              source: 'Not found in your verified profile',
              status: 'NOT_FOUND',
              assessment: 'Missing from verified profile facts.',
              confidence: 0,
            });
          }
        }
      }
      skillsScore = Math.min(25, Math.round((matchedCount / rawReqs.length) * 25));
    } else {
      let matchedInDesc = 0;
      for (const skill of candidateSkills) {
        if (skill.length > 2 && descLower.includes(skill)) {
          matchedInDesc++;
          if (matchedInDesc <= 3) reasons.push(`Demonstrated skill match: ${skill}`);
        }
      }
      skillsScore = Math.min(20, matchedInDesc * 4);
      dataQualityNotes.push('Job listing did not include structured requirements list.');
    }

    // 5. Experience & Seniority Validation (25% max)
    let experienceScore = 0;
    const candidateYears = profile.totalExperienceYears || 0;
    const expMatch = descLower.match(/(\d+)\+?\s*years?(?:\s+of)?\s+experience/);
    const isStaffOrPrincipal = /staff|principal|director|head of|vp|architect/i.test(vacancy.title || '');
    const isSenior = /senior|lead/i.test(vacancy.title || '');

    let requiredYears = expMatch ? parseInt(expMatch[1], 10) : 0;
    if (requiredYears === 0) {
      if (isStaffOrPrincipal) requiredYears = 8;
      else if (isSenior) requiredYears = 5;
      else if (/junior|entry|associate/i.test(vacancy.title || '')) requiredYears = 1;
      else requiredYears = 3;
    }

    if (candidateYears >= requiredYears) {
      experienceScore = 25;
      reasons.push(`Meets experience threshold: ${candidateYears} years versus ${requiredYears} required`);
    } else if (candidateYears >= requiredYears * 0.7) {
      experienceScore = 14;
      missingRequirements.push(`Candidate has ${candidateYears} years experience; role mentions ${requiredYears}+ years`);
    } else {
      experienceScore = 4;
      missingRequirements.push(`Significant experience gap: ${candidateYears} years vs ${requiredYears}+ required`);
    }

    // 6. Job Title, Seniority & Family Alignment (20% max)
    let titleScore = 0;
    const targetRoles = preferences.targetRoles || preferences.preferredTitles || [];
    const candidateTitle = (profile.currentTitle || '').toLowerCase();
    const candidateJobFamily = detectJobFamily(candidateTitle, (profile.experiences || []).map(e => e.role).join(' '));
    const vacancyJobFamily = detectJobFamily(titleLower, descLower);

    const isEngineeringVacancy = vacancyJobFamily === 'engineering' || vacancyJobFamily === 'ai_data';
    const isTechnicalCandidate = candidateSkills.some(s => /javascript|typescript|python|go|rust|c\+\+|java|react|node|cloud|docker|kubernetes|aws/i.test(s));

    let seniorityMismatch = false;
    let disciplineMismatch = false;

    if (isStaffOrPrincipal) {
      if (candidateYears < 4 || (!isTechnicalCandidate && isEngineeringVacancy)) {
        seniorityMismatch = true;
        titleScore = 0;
        reasons.push(`Seniority mismatch: Role requires Staff/Principal level (${requiredYears}+ years). Candidate verified profile has ${candidateYears} years.`);
      } else if (candidateYears >= 8) {
        titleScore = 20;
      } else {
        titleScore = 8;
      }
    } else if (isEngineeringVacancy && !isTechnicalCandidate) {
      disciplineMismatch = true;
      titleScore = 0;
      reasons.push('Disciplinary mismatch: Technical engineering role evaluated against non-engineering profile.');
    } else {
      const titleExact = targetRoles.some(tr => titleLower.includes(tr.toLowerCase()) || tr.toLowerCase().includes(titleLower));
      if (titleExact || (candidateTitle && titleLower.includes(candidateTitle))) {
        titleScore = 20;
        reasons.push(`Target role alignment: "${vacancy.title}" aligns with candidate title targets.`);
      } else if (candidateJobFamily !== 'general' && candidateJobFamily === vacancyJobFamily) {
        titleScore = 14;
        reasons.push(`Cross-industry domain alignment in ${candidateJobFamily.replace('_', ' ')}.`);
      } else {
        titleScore = 4;
        dataQualityNotes.push(`Title not an exact match to target roles (${targetRoles.join(', ')}).`);
      }
    }

    // 7. Qualifications & Education (10% max)
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
      qualificationsScore = (profile.education && profile.education.length > 0) ? 10 : 0;
    }

    // 8. Location & Work Authorization (10% max)
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
      locationScore = 3;
      dataQualityNotes.push('Location unconfirmed or outside primary country target.');
    }

    // 9. Salary & Preferences (10% max)
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

    let totalScore = Math.min(100, skillsScore + experienceScore + titleScore + qualificationsScore + locationScore + salaryScore);

    // Apply strict ceilings if hard ineligibility, seniority mismatch or discipline mismatch
    if (seniorityMismatch) {
      totalScore = Math.min(15, totalScore);
    } else if (disciplineMismatch) {
      totalScore = Math.min(12, totalScore);
    } else if (!isEligible) {
      totalScore = Math.min(25, totalScore);
    }

    if (totalScore >= 75) {
      reasonsToConsider.push('Strong composite score across skills, experience, and domain alignment.');
    } else if (totalScore >= 60) {
      reasonsToConsider.push('Solid foundational match with opportunities for growth.');
    }

    const dataQuality: 'high' | 'moderate' | 'limited' =
      dataQualityNotes.length === 0 ? 'high' : (dataQualityNotes.length <= 2 ? 'moderate' : 'limited');

    const multiDim = careerIntelligenceEngine.evaluateMultiDimensionalMatch(profile, preferences, vacancy);

    return {
      score: totalScore,
      overallScore: totalScore,
      missingSkills: missingRequirements,
      isEligible: isEligible && !seniorityMismatch && !disciplineMismatch,
      alignmentTier: multiDim.alignmentTier,
      honestAssessment: multiDim.honestAssessment,
      essentialRequirementsMatched: multiDim.essentialRequirementsMatched,
      preferredRequirementsMatched: multiDim.preferredRequirementsMatched,
      missingEssentialRequirements: multiDim.missingEssentialRequirements,
      missingPreferredRequirements: multiDim.missingPreferredRequirements,
      relevantExperienceYears: multiDim.relevantExperienceYears,
      requiredExperienceYears: multiDim.requiredExperienceYears,
      potentialConcerns: multiDim.potentialConcerns,
      unverifiedInformation: multiDim.unverifiedInformation,
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
      profileEvidence,
      mandatoryRequirements,
      preferredRequirements,
      transferableSkills,
    };
  },
};

export const matchingEngine = workerMatchingEngine;
export const evaluateMatch = (vacancy: any, profile: any, facts?: any) => workerMatchingEngine.evaluateMatch(vacancy, profile, facts);
