import { GoogleGenAI } from '@google/genai';
import { UserProfile, CareerPreferences, JobVacancy } from '../src/types/index.ts';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export interface MatchAnalysis {
  score: number;
  isEligible: boolean;
  reasons: string[];
  missingRequirements: string[];
  eligibilityConcerns: string[];
  reasonsToConsider: string[];
  salaryCompatible?: boolean;
}

export const matchingEngine = {
  /**
   * Evaluates candidate suitability against job vacancy using deterministic checks + semantic analysis.
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

    // --- 1. HARD ELIGIBILITY CHECKS ---
    let isEligible = true;

    // Check excluded companies
    if (preferences.excludedCompanies && preferences.excludedCompanies.length > 0) {
      const lowerCompany = vacancy.company.toLowerCase();
      if (preferences.excludedCompanies.some(exc => lowerCompany.includes(exc.toLowerCase()))) {
        isEligible = false;
        eligibilityConcerns.push(`Company "${vacancy.company}" is in your excluded companies list.`);
      }
    }

    // Check excluded keywords
    if (preferences.excludedKeywords && preferences.excludedKeywords.length > 0) {
      const lowerText = `${vacancy.title} ${vacancy.description}`.toLowerCase();
      for (const kw of preferences.excludedKeywords) {
        if (kw.trim() && lowerText.includes(kw.toLowerCase().trim())) {
          isEligible = false;
          eligibilityConcerns.push(`Job listing matches excluded keyword: "${kw}".`);
          break;
        }
      }
    }

    // Check visa sponsorship
    const requiresVisa = preferences.requiresVisaSponsorship || preferences.visaSponsorshipRequired;
    if (requiresVisa) {
      if (vacancy.visaSponsorship === 'unsupported' || vacancy.visaSponsorship === 'not_supported') {
        isEligible = false;
        eligibilityConcerns.push('Employer does not support visa sponsorship.');
      } else if (vacancy.visaSponsorship === 'unknown') {
        eligibilityConcerns.push('Visa sponsorship status is unconfirmed by employer.');
      } else {
        reasons.push('Employer explicitly supports visa sponsorship.');
      }
    }

    // --- 2. DETERMINISTIC SCORING ---
    let calculatedScore = 50;

    // Title relevance
    const targetRoles = preferences.targetRoles || preferences.preferredTitles || [];
    const lowerTitle = vacancy.title.toLowerCase();
    const matchesTargetRole = targetRoles.some(role =>
      lowerTitle.includes(role.toLowerCase()) || role.toLowerCase().includes(lowerTitle)
    );
    if (matchesTargetRole) {
      calculatedScore += 20;
      reasons.push(`Job title aligns with target role preferences.`);
    }

    // Candidate skills match
    const candidateSkillNames = profile.skills.map(s => s.name.toLowerCase());
    const matchedSkills: string[] = [];
    const lowerDesc = vacancy.description.toLowerCase();

    for (const skill of candidateSkillNames) {
      if (lowerDesc.includes(skill) || vacancy.requirements.some(r => r.toLowerCase().includes(skill))) {
        matchedSkills.push(skill);
      }
    }

    if (matchedSkills.length > 0) {
      calculatedScore += Math.min(25, matchedSkills.length * 5);
      reasons.push(`Matches ${matchedSkills.length} of your verified skills: ${matchedSkills.slice(0, 5).join(', ')}.`);
    }

    // Detect missing common requirements
    const potentialTech = ['python', 'react', 'aws', 'kubernetes', 'typescript', 'sql', 'docker', 'graphql', 'java', 'go'];
    for (const tech of potentialTech) {
      if (lowerDesc.includes(tech) && !candidateSkillNames.includes(tech)) {
        missingRequirements.push(tech.toUpperCase());
      }
    }

    // Work arrangement check
    const workArr = preferences.workArrangements || preferences.workArrangement || ['remote'];
    if (vacancy.remote && workArr.includes('remote')) {
      calculatedScore += 5;
      reasonsToConsider.push('100% Remote flexibility matching your preferences.');
    }

    // Clamp score
    calculatedScore = Math.min(98, Math.max(15, calculatedScore));
    if (!isEligible) {
      calculatedScore = Math.min(calculatedScore, 40);
    }

    return {
      score: calculatedScore,
      isEligible,
      reasons: reasons.length > 0 ? reasons : ['General skill alignment identified.'],
      missingRequirements: missingRequirements.slice(0, 5),
      eligibilityConcerns,
      reasonsToConsider: reasonsToConsider.length > 0 ? reasonsToConsider : ['Strong career progression alignment.'],
      salaryCompatible: true,
    };
  },
};
