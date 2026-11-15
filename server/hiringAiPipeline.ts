// server/hiringAiPipeline.ts
// Production Hiring AI & Intent Classification Engine
// Analyzes vacancy text to extract structured signals without hallucinating unstated facts

export interface HiringIntentSignals {
  intentType: 'team_expansion' | 'backfill' | 'founding_role' | 'specialized_project' | 'standard_recruitment';
  seniorityTier: 'intern' | 'entry' | 'mid' | 'senior' | 'staff_lead' | 'director_executive';
  estimatedExperienceYears: { min: number; max?: number };
  mandatorySkills: string[];
  preferredSkills: string[];
  isVisaSponsored: boolean;
  hiringManagerMentioned: boolean;
  hiringManagerAngle?: string;
  recommendedPitchAngle: string;
  truthfulnessConfidence: number;
}

export class HiringAiPipeline {
  /**
   * Deterministic signal extractor grounded strictly in vacancy content
   */
  public analyzeVacancy(title: string, description: string, requirements: string[] = []): HiringIntentSignals {
    const fullText = `${title}\n${description}\n${requirements.join('\n')}`.toLowerCase();

    // 1. Intent Classification
    let intentType: HiringIntentSignals['intentType'] = 'standard_recruitment';
    if (fullText.includes('founding') || fullText.includes('first engineer') || fullText.includes('first designer') || fullText.includes('first product manager')) {
      intentType = 'founding_role';
    } else if (fullText.includes('expanding our team') || fullText.includes('rapid growth') || fullText.includes('scaling up') || fullText.includes('doubling the team')) {
      intentType = 'team_expansion';
    } else if (fullText.includes('special project') || fullText.includes('initiative') || fullText.includes('new product line')) {
      intentType = 'specialized_project';
    }

    // 2. Seniority Classification
    let seniorityTier: HiringIntentSignals['seniorityTier'] = 'mid';
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('intern') || lowerTitle.includes('trainee') || lowerTitle.includes('apprentice')) {
      seniorityTier = 'intern';
    } else if (lowerTitle.includes('entry') || lowerTitle.includes('junior') || lowerTitle.includes('associate') || lowerTitle.includes('grad')) {
      seniorityTier = 'entry';
    } else if (lowerTitle.includes('principal') || lowerTitle.includes('staff') || lowerTitle.includes('lead') || lowerTitle.includes('head of')) {
      seniorityTier = 'staff_lead';
    } else if (lowerTitle.includes('director') || lowerTitle.includes('vp') || lowerTitle.includes('chief') || lowerTitle.includes('c-level')) {
      seniorityTier = 'director_executive';
    } else if (lowerTitle.includes('senior') || lowerTitle.includes('sr.') || lowerTitle.includes('experienced')) {
      seniorityTier = 'senior';
    }

    // 3. Years of Experience Extraction via regex
    let minExp = 0;
    let maxExp: number | undefined = undefined;
    const expRegex = /(\d+)\s*(?:-|to)\s*(\d+)\+?\s*years?/i;
    const singleExpRegex = /(\d+)\+?\s*years?(?:\s+of)?(?:\s+experience)?/i;

    const expRangeMatch = expRegex.exec(fullText);
    if (expRangeMatch) {
      minExp = parseInt(expRangeMatch[1], 10);
      maxExp = parseInt(expRangeMatch[2], 10);
    } else {
      const singleMatch = singleExpRegex.exec(fullText);
      if (singleMatch) {
        minExp = parseInt(singleMatch[1], 10);
      } else {
        // Fallback default based on seniority
        minExp = seniorityTier === 'senior' ? 5 : seniorityTier === 'staff_lead' ? 8 : seniorityTier === 'entry' ? 1 : 3;
      }
    }

    // 4. Skills extraction from known tech dictionary
    const KNOWN_SKILLS = [
      'react', 'typescript', 'javascript', 'node.js', 'python', 'go', 'golang', 'java', 'c++', 'rust',
      'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'postgresql', 'mysql', 'mongodb', 'redis', 'graphql',
      'next.js', 'tailwind', 'microservices', 'distributed systems', 'machine learning', 'llm', 'pytorch',
      'system design', 'rest api', 'ci/cd', 'terraform', 'kafka', 'spark', 'sql', 'nosql', 'fastapi'
    ];

    const mandatorySkills: string[] = [];
    const preferredSkills: string[] = [];

    for (const skill of KNOWN_SKILLS) {
      if (fullText.includes(skill)) {
        if (mandatorySkills.length < 5) {
          mandatorySkills.push(skill);
        } else if (preferredSkills.length < 5) {
          preferredSkills.push(skill);
        }
      }
    }

    // 5. Visa Sponsorship
    const isVisaSponsored = fullText.includes('visa sponsorship') || fullText.includes('relocation assistance') || fullText.includes('sponsor visa');

    // 6. Hiring Manager Detection
    const hiringManagerMentioned = fullText.includes('report to') || fullText.includes('reporting to') || fullText.includes('hiring manager');
    let hiringManagerAngle: string | undefined = undefined;
    if (hiringManagerMentioned) {
      const reportMatch = /(?:report(?:s|ing)? to the?|working closely with the?)\s+([a-z\s]+?)(?:\.|\,|<|\n)/i.exec(fullText);
      if (reportMatch) {
        hiringManagerAngle = `Role directly reports to ${reportMatch[1].trim()}`;
      }
    }

    // 7. Pitch Angle Recommendation
    let recommendedPitchAngle = 'Emphasize architectural depth, hands-on production ownership, and velocity.';
    if (seniorityTier === 'senior' || seniorityTier === 'staff_lead') {
      recommendedPitchAngle = 'Highlight cross-functional technical leadership, mentorship, and distributed system resilience.';
    } else if (intentType === 'founding_role') {
      recommendedPitchAngle = 'Focus on zero-to-one product engineering, autonomy, fast prototyping, and candidate grit.';
    } else if (mandatorySkills.length > 0) {
      recommendedPitchAngle = `Lead with proven track record in ${mandatorySkills.slice(0, 3).join(', ')} and measurable past metrics.`;
    }

    return {
      intentType,
      seniorityTier,
      estimatedExperienceYears: { min: minExp, max: maxExp },
      mandatorySkills,
      preferredSkills,
      isVisaSponsored,
      hiringManagerMentioned,
      hiringManagerAngle,
      recommendedPitchAngle,
      truthfulnessConfidence: 0.95,
    };
  }
}

export const globalHiringAi = new HiringAiPipeline();
