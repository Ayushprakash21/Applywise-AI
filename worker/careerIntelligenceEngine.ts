// worker/careerIntelligenceEngine.ts
// Next-Generation Intelligent Job Matching, Fit Evidence Map, Resume Intelligence,
// Application Readiness Studio, Copilot & Career Roadmap for ApplyVise AI

import {
  UserProfile,
  CareerPreferences,
  JobVacancy,
  JobMatchEvaluation,
  OpportunityAlignmentTier,
  HonestAssessment,
  FitEvidenceMap,
  FitEvidenceNode,
  EvidenceConfidence,
  ResumeIntelligenceReport,
  ResumeIssue,
  ResumeToJobComparison,
  ApplicationReadinessAssessment,
  ReadinessChecklistItem,
  CopilotJobArtifacts,
  InterviewIntelligenceReport,
  StarQuestion,
  CareerRoadmap,
  CareerRoadmapItem,
  ScoringWeights,
} from '../src/types/index.ts';

// Cross-industry domains and transferable keywords
export const DOMAIN_TAXONOMY: Record<string, { keywords: string[]; related: string[] }> = {
  supply_chain: {
    keywords: ['supply chain', 'procurement', 'logistics', 'inventory', 'warehouse', 'sourcing', 'vendor management', 'erp', 'sap'],
    related: ['customer_operations', 'project_management', 'manufacturing'],
  },
  project_management: {
    keywords: ['project management', 'program manager', 'scrum', 'agile', 'sprint planning', 'jira', 'stakeholder management', 'pmp'],
    related: ['business_analysis', 'engineering', 'customer_operations'],
  },
  business_analysis: {
    keywords: ['business analysis', 'data analysis', 'sql', 'bi', 'tableau', 'power bi', 'requirements gathering', 'kpi', 'metrics'],
    related: ['project_management', 'finance', 'product'],
  },
  customer_operations: {
    keywords: ['customer success', 'customer operations', 'support', 'client relationship', 'onboarding', 'account management', 'retention'],
    related: ['supply_chain', 'sales', 'business_analysis'],
  },
  engineering: {
    keywords: ['software engineer', 'developer', 'typescript', 'python', 'react', 'node.js', 'aws', 'docker', 'kubernetes', 'api', 'ci/cd'],
    related: ['product', 'data_science', 'devops'],
  },
  product: {
    keywords: ['product management', 'product strategy', 'user research', 'roadmap', 'wireframing', 'user stories', 'ab testing'],
    related: ['engineering', 'business_analysis', 'marketing'],
  },
  data_science: {
    keywords: ['machine learning', 'data science', 'deep learning', 'pandas', 'nlp', 'pytorch', 'tensorflow', 'model evaluation', 'ai'],
    related: ['engineering', 'business_analysis'],
  },
};

/**
 * Standard disclaimer ensuring ethical AI promises
 */
export const HONEST_ASSESSMENT_DISCLAIMER =
  'This score reflects structured profile-to-job criteria alignment and does not constitute a hiring guarantee or interview prediction. ATS platforms and human recruiters evaluate nuances beyond programmatic keyword matching.';

export const INTERVIEW_DISCLAIMER =
  'These practice questions are inferred from published role competencies and your verified background. Actual interview formats and questions are determined exclusively by the employer.';

export const ATS_METHODOLOGY_EXPLANATION =
  'Applicant Tracking Systems differ in parsing engines (e.g. Workday, Greenhouse, Taleo) and text extraction heuristics. Clean single-column formatting and standard headings maximize parsing fidelity across all vendors.';

export class CareerIntelligenceEngine {
  /**
   * 1. Multi-Dimensional Job Matching Engine with Honest Opportunity Assessment
   */
  public evaluateMultiDimensionalMatch(
    profile: UserProfile,
    preferences: CareerPreferences,
    vacancy: JobVacancy,
    customWeights?: Partial<ScoringWeights>
  ): JobMatchEvaluation {
    const reasons: string[] = [];
    const missingRequirements: string[] = [];
    const eligibilityConcerns: string[] = [];
    const reasonsToConsider: string[] = [];
    const dataQualityNotes: string[] = [];
    const unverifiedInformation: string[] = [];
    const potentialConcerns: string[] = [];

    const weights: ScoringWeights = {
      skillsWeight: customWeights?.skillsWeight ?? 25,
      experienceWeight: customWeights?.experienceWeight ?? 25,
      seniorityWeight: customWeights?.seniorityWeight ?? 10,
      educationWeight: customWeights?.educationWeight ?? 10,
      certificationsWeight: customWeights?.certificationsWeight ?? 5,
      industryWeight: customWeights?.industryWeight ?? 5,
      locationWorkAuthWeight: customWeights?.locationWorkAuthWeight ?? 10,
      salaryWeight: customWeights?.salaryWeight ?? 10,
      qualificationsWeight: 10,
      locationWeight: 10,
    };

    let isEligible = true;
    const titleLower = (vacancy.title || '').toLowerCase();
    const descLower = (vacancy.description || '').toLowerCase();
    const companyLower = (vacancy.company || '').toLowerCase();

    // 1. Mandatory Exclusions
    if (preferences.excludedCompanies && preferences.excludedCompanies.length > 0) {
      for (const exc of preferences.excludedCompanies) {
        if (exc && companyLower.includes(exc.toLowerCase().trim())) {
          isEligible = false;
          eligibilityConcerns.push(`Excluded company: "${vacancy.company}" is on your exclusion list.`);
        }
      }
    }

    if (preferences.excludedKeywords && preferences.excludedKeywords.length > 0) {
      for (const kw of preferences.excludedKeywords) {
        if (kw && (titleLower.includes(kw.toLowerCase().trim()) || descLower.includes(kw.toLowerCase().trim()))) {
          isEligible = false;
          eligibilityConcerns.push(`Excluded keyword: "${kw}" found in job specification.`);
        }
      }
    }

    // 2. Visa & Work Authorization
    let sponsorshipStatus: 'supported' | 'unsupported' | 'unspecified' = 'unspecified';
    if (vacancy.visaSponsorship === 'supported') {
      sponsorshipStatus = 'supported';
    } else if (vacancy.visaSponsorship === 'not_supported' || vacancy.visaSponsorship === 'unsupported') {
      sponsorshipStatus = 'unsupported';
    } else if (descLower.includes('visa sponsorship available') || descLower.includes('willing to sponsor')) {
      sponsorshipStatus = 'supported';
    } else if (descLower.includes('no sponsorship') || descLower.includes('must be authorized to work without sponsorship')) {
      sponsorshipStatus = 'unsupported';
    }

    if (preferences.requiresVisaSponsorship || preferences.visaSponsorshipRequired) {
      if (sponsorshipStatus === 'unsupported') {
        isEligible = false;
        eligibilityConcerns.push('Visa sponsorship required by you, but this opening explicitly does not offer sponsorship.');
      } else if (sponsorshipStatus === 'unspecified') {
        unverifiedInformation.push('Visa sponsorship availability is not specified in the listing.');
      }
    }

    // 3. Skills Analysis: Distinguish Essential vs Preferred Requirements
    const essentialRequirementsMatched: string[] = [];
    const preferredRequirementsMatched: string[] = [];
    const missingEssentialRequirements: string[] = [];
    const missingPreferredRequirements: string[] = [];

    const candidateSkills = (profile.skills || []).map(s => s.name.toLowerCase().trim());
    const candidateExperiences = profile.experiences || [];
    const expText = candidateExperiences.map(e => `${e.role} ${e.company} ${(e.achievements || []).join(' ')}`).join(' ').toLowerCase();

    // Partition vacancy requirements into essential vs preferred
    const rawReqs = vacancy.requirements && vacancy.requirements.length > 0
      ? vacancy.requirements
      : this.extractRequirementsFromText(vacancy.description);

    const essentialReqs: string[] = [];
    const preferredReqs: string[] = [];

    for (const r of rawReqs) {
      const rl = r.toLowerCase();
      if (rl.includes('preferred') || rl.includes('nice to have') || rl.includes('plus') || rl.includes('bonus')) {
        preferredReqs.push(r);
      } else {
        essentialReqs.push(r);
      }
    }

    if (rawReqs.length === 0) {
      dataQualityNotes.push('Job listing did not contain structured requirements or bullet points.');
      unverifiedInformation.push('Specific skill requirements could not be programmatically extracted from description.');
    }

    const candidateCerts = (profile.certifications || []).map(c => (c.name || '').toLowerCase());

    // Match Essential Requirements
    for (const req of essentialReqs) {
      const reqLower = req.toLowerCase();
      const cleanReq = reqLower.replace(/\b(preferred|nice to have|plus|bonus|required|essential)\b/gi, '').trim();
      const directSkill = candidateSkills.some(cs => cs.includes(reqLower) || reqLower.includes(cs) || (cleanReq && (cs.includes(cleanReq) || cleanReq.includes(cs))));
      const inExp = expText.includes(reqLower) || (cleanReq && expText.includes(cleanReq));
      const inCert = candidateCerts.some(cc => cc.includes(reqLower) || reqLower.includes(cc) || (cleanReq && (cc.includes(cleanReq) || cleanReq.includes(cc))));

      if (directSkill || inExp || inCert) {
        essentialRequirementsMatched.push(req);
        reasons.push(`Matched essential requirement: "${req}"`);
      } else {
        missingEssentialRequirements.push(req);
        missingRequirements.push(req);
      }
    }

    // Match Preferred Requirements
    for (const req of preferredReqs) {
      const reqLower = req.toLowerCase();
      const cleanReq = reqLower.replace(/\b(preferred|nice to have|plus|bonus|required|essential)\b/gi, '').trim();
      const directSkill = candidateSkills.some(cs => cs.includes(reqLower) || reqLower.includes(cs) || (cleanReq && (cs.includes(cleanReq) || cleanReq.includes(cs))));
      const inExp = expText.includes(reqLower) || (cleanReq && expText.includes(cleanReq));
      const inCert = candidateCerts.some(cc => cc.includes(reqLower) || reqLower.includes(cc) || (cleanReq && (cc.includes(cleanReq) || cleanReq.includes(cc))));

      if (directSkill || inExp || inCert) {
        preferredRequirementsMatched.push(req);
        reasons.push(`Matched preferred requirement: "${req}"`);
      } else {
        missingPreferredRequirements.push(req);
      }
    }

    // Calculate Skills Score with heavy weighting on essential requirements
    let skillsScore = 0;
    const totalReqCount = essentialReqs.length + preferredReqs.length;
    if (totalReqCount > 0) {
      const essentialRatio = essentialReqs.length > 0
        ? essentialRequirementsMatched.length / essentialReqs.length
        : 1;
      const preferredRatio = preferredReqs.length > 0
        ? preferredRequirementsMatched.length / preferredReqs.length
        : 1;

      // Essential requirements account for 80% of skills score, preferred for 20%
      const combinedRatio = essentialReqs.length > 0
        ? (essentialRatio * 0.8) + (preferredRatio * 0.2)
        : preferredRatio;

      skillsScore = Math.round(combinedRatio * weights.skillsWeight);
    } else {
      // Fallback matching against candidate skills in description
      let matchesInDesc = 0;
      for (const sk of candidateSkills) {
        if (sk.length > 2 && descLower.includes(sk)) {
          matchesInDesc++;
          essentialRequirementsMatched.push(sk);
        }
      }
      skillsScore = Math.min(weights.skillsWeight, matchesInDesc * 4);
    }

    // 4. Experience & Seniority Analysis
    let experienceScore = 0;
    const candidateYears = profile.totalExperienceYears || this.computeExperienceYears(candidateExperiences);
    const expRegex = /(\d+)\+?\s*years?(?:\s+of)?\s+(?:relevant\s+)?experience/i;
    const expMatch = descLower.match(expRegex);
    const requiredYears = expMatch ? parseInt(expMatch[1], 10) : 0;

    if (requiredYears > 0) {
      if (candidateYears >= requiredYears) {
        experienceScore = weights.experienceWeight;
        reasons.push(`Meets experience threshold (${candidateYears} yrs verified vs ${requiredYears}+ required).`);
      } else if (candidateYears >= requiredYears * 0.7) {
        experienceScore = Math.round(weights.experienceWeight * 0.65);
        potentialConcerns.push(`Candidate has ${candidateYears} years of verified experience; vacancy specifies ${requiredYears}+ years.`);
      } else {
        experienceScore = Math.round(weights.experienceWeight * 0.3);
        potentialConcerns.push(`Notable experience gap: ${candidateYears} years vs ${requiredYears}+ requested.`);
      }
    } else {
      experienceScore = candidateYears >= 5 ? weights.experienceWeight : Math.round(weights.experienceWeight * 0.75);
      unverifiedInformation.push('Explicit years of experience threshold was not stated in the job post.');
    }

    // 5. Seniority & Title Alignment (GUARD AGAINST SUPERFICIAL TITLE INFLATION)
    let seniorityScore = 0;
    const targetRoles = preferences.targetRoles || preferences.preferredTitles || [];
    const candidateTitle = (profile.currentTitle || '').toLowerCase();

    // Check if candidate has real skills/experience to back up a matching title
    const hasSubstantiveMatch = essentialRequirementsMatched.length > 0 || candidateYears >= 2;
    const titleMatches = targetRoles.some(tr => titleLower.includes(tr.toLowerCase()) || tr.toLowerCase().includes(titleLower)) ||
      (candidateTitle && titleLower.includes(candidateTitle));

    if (titleMatches) {
      if (hasSubstantiveMatch) {
        seniorityScore = weights.seniorityWeight;
        reasons.push(`Target role alignment: "${vacancy.title}" matches your target career profile.`);
      } else {
        // Candidate title resembles role, but skills/experience are deficient: penalize to prevent fake optimism
        seniorityScore = Math.round(weights.seniorityWeight * 0.4);
        potentialConcerns.push('Title resembles your profile, but core functional skill evidence is currently thin.');
      }
    } else {
      seniorityScore = Math.round(weights.seniorityWeight * 0.5);
    }

    const educationWeight = weights.educationWeight ?? 10;
    const certificationsWeight = weights.certificationsWeight ?? 5;
    const industryWeight = weights.industryWeight ?? 5;
    const locationWorkAuthWeight = weights.locationWorkAuthWeight ?? 10;

    // 6. Education & Qualifications
    let educationScore = 0;
    const educationRequired = descLower.includes("bachelor's") || descLower.includes("master's") || descLower.includes('degree in') || descLower.includes('bs in') || descLower.includes('ms in');
    const hasEducation = (profile.education || []).length > 0;

    if (educationRequired) {
      if (hasEducation) {
        educationScore = educationWeight;
        reasons.push('Candidate holds verified post-secondary educational credentials.');
      } else {
        educationScore = 0;
        potentialConcerns.push('Degree mentioned in listing; no degree currently listed in candidate profile.');
      }
    } else {
      educationScore = hasEducation ? educationWeight : 0;
    }

    // 7. Certifications
    let certificationsScore = 0;
    const profileCerts = profile.certifications || [];
    const mentionsCert = descLower.includes('certification') || descLower.includes('certified') || descLower.includes('pmp') || descLower.includes('aws certified') || descLower.includes('cpa');

    if (mentionsCert) {
      if (profileCerts.length > 0) {
        certificationsScore = certificationsWeight;
        reasons.push(`Holds relevant certifications: ${profileCerts.map(c => c.name).join(', ')}`);
      } else {
        certificationsScore = 1;
        unverifiedInformation.push('Certification encouraged by job description, but none attached to profile.');
      }
    } else {
      certificationsScore = profileCerts.length > 0 ? certificationsWeight : Math.round(certificationsWeight * 0.6);
    }

    // 8. Industry & Cross-Domain Experience
    let industryScore = 0;
    const candidateDomain = this.inferDomain(candidateTitle, expText);
    const vacancyDomain = this.inferDomain(titleLower, descLower);

    if (candidateDomain === vacancyDomain && candidateDomain !== 'general') {
      industryScore = industryWeight;
      reasons.push(`Direct industry domain alignment in ${candidateDomain.replace('_', ' ')}.`);
    } else if (this.areDomainsRelated(candidateDomain, vacancyDomain)) {
      industryScore = Math.round(industryWeight * 0.7);
      reasons.push(`Transferable cross-domain operational exposure (${candidateDomain.replace('_', ' ')} → ${vacancyDomain.replace('_', ' ')}).`);
    } else {
      industryScore = Math.round(industryWeight * 0.4);
    }

    // 9. Location & Work Authorization
    let locationScore = 0;
    const targetCountries = (preferences.targetCountries || []).map(c => c.toLowerCase());
    const isRemote = vacancy.remote || vacancy.arrangement === 'remote' || descLower.includes('remote');
    const candWantsRemote = (preferences.workArrangement || []).includes('remote') || (preferences.workArrangements || []).includes('remote');

    if (isRemote && candWantsRemote) {
      locationScore = locationWorkAuthWeight;
      reasons.push('Remote flexibility fully satisfies your work preferences.');
    } else if (targetCountries.some(tc => (vacancy.country || '').toLowerCase().includes(tc) || (vacancy.location || '').toLowerCase().includes(tc))) {
      locationScore = locationWorkAuthWeight;
      reasons.push(`Job location (${vacancy.location || vacancy.country}) matches your target country list.`);
    } else if (vacancy.location) {
      locationScore = Math.round(locationWorkAuthWeight * 0.5);
      potentialConcerns.push(`Role location (${vacancy.location}) differs from primary target geographies.`);
    } else {
      locationScore = Math.round(locationWorkAuthWeight * 0.5);
      unverifiedInformation.push('Job posting does not define precise geographic office location.');
    }

    // 10. Salary Compatibility
    let salaryScore = weights.salaryWeight;
    let salaryCompatibility: 'compatible' | 'below_threshold' | 'unspecified' | 'negotiable' = 'unspecified';
    const minSalary = preferences.minSalaryUSD || 0;

    if (vacancy.salaryRange?.min || vacancy.salaryRange?.raw) {
      const topNum = vacancy.salaryRange.max || vacancy.salaryRange.min || this.parseSalaryString(vacancy.salaryRange.raw || '');
      if (topNum && minSalary > 0) {
        if (topNum < minSalary * 0.8) {
          salaryScore = 2;
          salaryCompatibility = 'below_threshold';
          potentialConcerns.push(`Posted compensation (${vacancy.salaryRange.raw || topNum}) is below your desired baseline ($${minSalary.toLocaleString()}).`);
        } else {
          salaryScore = weights.salaryWeight;
          salaryCompatibility = 'compatible';
          reasons.push(`Compensation matches or exceeds your compensation expectations: ${vacancy.salaryRange.raw || `$${topNum.toLocaleString()}`}`);
        }
      } else {
        salaryCompatibility = 'negotiable';
      }
    } else {
      unverifiedInformation.push('Compensation was not disclosed in the vacancy listing.');
    }

    // Composite Score Calculation (0 - 100)
    let totalScore = skillsScore + experienceScore + seniorityScore + educationScore + certificationsScore + industryScore + locationScore + salaryScore;

    // Disproportionate penalty for missing essential requirements: constrain maximum score
    if (missingEssentialRequirements.length >= 3 || (essentialRequirementsMatched.length === 0 && missingEssentialRequirements.length >= 2)) {
      totalScore = Math.min(35, totalScore);
    } else if (missingEssentialRequirements.length >= 2) {
      totalScore = Math.min(55, totalScore);
    }

    if (!isEligible) {
      totalScore = Math.min(25, totalScore);
    }
    totalScore = Math.max(5, Math.min(100, Math.round(totalScore)));

    // Determine Alignment Tier
    let alignmentTier: OpportunityAlignmentTier = 'LOW_ALIGNMENT';
    let recommendation: 'STRONG_APPLY' | 'CONSIDER' | 'MARGINAL' | 'DO_NOT_APPLY' = 'MARGINAL';

    if (!isEligible || totalScore < 45 || missingEssentialRequirements.length >= 3) {
      alignmentTier = 'LOW_ALIGNMENT';
      recommendation = !isEligible ? 'DO_NOT_APPLY' : 'MARGINAL';
    } else if (totalScore >= 75 && missingEssentialRequirements.length <= 1) {
      alignmentTier = 'STRONG_ALIGNMENT';
      recommendation = 'STRONG_APPLY';
    } else if (totalScore >= 60) {
      alignmentTier = 'GOOD_ALIGNMENT_WITH_GAPS';
      recommendation = 'CONSIDER';
    } else {
      alignmentTier = 'STRETCH_OPPORTUNITY';
      recommendation = 'CONSIDER';
    }

    // Honest Opportunity Assessment
    const honestAssessment = this.buildHonestAssessment(
      alignmentTier,
      vacancy,
      essentialRequirementsMatched,
      missingEssentialRequirements,
      missingPreferredRequirements,
      candidateYears,
      requiredYears,
      potentialConcerns,
      unverifiedInformation
    );

    const dataQuality: 'high' | 'moderate' | 'limited' =
      dataQualityNotes.length === 0 && unverifiedInformation.length <= 1
        ? 'high'
        : (dataQualityNotes.length <= 1 && unverifiedInformation.length <= 2 ? 'moderate' : 'limited');

    return {
      matchScore: totalScore,
      alignmentTier,
      honestAssessment,
      breakdown: {
        skills: skillsScore,
        experience: experienceScore,
        qualifications: educationScore + certificationsScore,
        seniority: seniorityScore,
        location: locationScore,
        salary: salaryScore,
        titleAlignment: seniorityScore,
        locationWorkAuth: locationScore,
        salaryPreferences: salaryScore,
        industry: industryScore,
        certifications: certificationsScore,
      },
      matchedSkills: essentialRequirementsMatched.concat(preferredRequirementsMatched),
      missingSkills: missingEssentialRequirements.concat(missingPreferredRequirements),
      essentialRequirementsMatched,
      preferredRequirementsMatched,
      missingEssentialRequirements,
      missingPreferredRequirements,
      relevantExperienceYears: candidateYears,
      requiredExperienceYears: requiredYears,
      potentialConcerns,
      unverifiedInformation,
      reasons,
      eligibilityIssues: eligibilityConcerns,
      missingRequirements,
      eligibilityConcerns,
      reasonsToConsider,
      dataQuality,
      dataQualityNotes,
      salaryCompatibility,
      sponsorshipStatus,
      recommendation,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * 2. Fit Evidence Map (Signature Feature: Requirement 2)
   */
  public generateFitEvidenceMap(
    userId: string,
    profile: UserProfile,
    vacancy: JobVacancy,
    matchEval?: JobMatchEvaluation
  ): FitEvidenceMap {
    const nodes: FitEvidenceNode[] = [];
    const evaluation = matchEval || this.evaluateMultiDimensionalMatch(profile, {} as CareerPreferences, vacancy);

    const candidateSkills = (profile.skills || []).map(s => s.name.toLowerCase().trim());
    const candidateExperiences = profile.experiences || [];
    const candidateCerts = (profile.certifications || []).map(c => c.name.toLowerCase().trim());

    const requirements = vacancy.requirements && vacancy.requirements.length > 0
      ? vacancy.requirements
      : this.extractRequirementsFromText(vacancy.description);

    let verifiedCount = 0;
    let inferredCount = 0;
    let userConfirmedCount = 0;
    let missingCount = 0;

    for (let i = 0; i < requirements.length; i++) {
      const req = requirements[i];
      const reqLower = req.toLowerCase().trim();
      const id = `node_${vacancy.id}_${i}`;

      // Check verified candidate skill or explicit certification
      const matchedSkill = candidateSkills.find(cs => cs === reqLower || reqLower.includes(cs) || cs.includes(reqLower));
      const matchedCert = candidateCerts.find(cc => cc.includes(reqLower) || reqLower.includes(cc));

      // Check experience descriptions
      const expEvidence = candidateExperiences.find(exp => {
        const fullExpText = `${exp.role} ${exp.company} ${(exp.achievements || []).join(' ')}`.toLowerCase();
        return fullExpText.includes(reqLower);
      });

      if (matchedCert) {
        verifiedCount++;
        nodes.push({
          id,
          requirement: req,
          category: 'certification',
          candidateEvidence: `Certified credential: ${matchedCert}`,
          sourceType: 'certification_record',
          sourceReference: 'Candidate Verified Certifications',
          confidence: 'VERIFIED_EVIDENCE',
          assessmentNotes: 'Direct, independently verifiable credential matches requirements.',
        });
      } else if (matchedSkill && expEvidence) {
        verifiedCount++;
        nodes.push({
          id,
          requirement: req,
          category: 'essential_skill',
          candidateEvidence: `Demonstrated at ${expEvidence.company} as ${expEvidence.role}`,
          sourceType: 'resume_parsed',
          sourceReference: `${expEvidence.company} (${expEvidence.startDate || 'Prior'} - ${expEvidence.endDate || 'Present'})`,
          confidence: 'VERIFIED_EVIDENCE',
          assessmentNotes: `Substantive work history demonstrates hands-on application of ${req}.`,
        });
      } else if (matchedSkill) {
        userConfirmedCount++;
        nodes.push({
          id,
          requirement: req,
          category: 'preferred_skill',
          candidateEvidence: `Listed on verified profile skill portfolio`,
          sourceType: 'user_profile',
          sourceReference: 'Candidate Profile Skills',
          confidence: 'USER_CONFIRMED',
          assessmentNotes: `Candidate confirmed proficiency in ${req}. Contextual company project metrics recommended.`,
          isUserConfirmed: true,
        });
      } else if (expEvidence) {
        inferredCount++;
        nodes.push({
          id,
          requirement: req,
          category: 'experience',
          candidateEvidence: `Mentioned in role responsibilities at ${expEvidence.company}`,
          sourceType: 'resume_parsed',
          sourceReference: `${expEvidence.company} (${expEvidence.role})`,
          confidence: 'INFERRED_RELEVANCE',
          assessmentNotes: `Relevant operational exposure noted, but not automatically equivalent to end-to-end dedicated ownership.`,
        });
      } else {
        // Cross-domain inference check
        const domainMatch = this.findDomainBridge(reqLower, candidateExperiences);
        if (domainMatch) {
          inferredCount++;
          nodes.push({
            id,
            requirement: req,
            category: 'domain',
            candidateEvidence: domainMatch.evidence,
            sourceType: 'resume_parsed',
            sourceReference: domainMatch.reference,
            confidence: 'INFERRED_RELEVANCE',
            assessmentNotes: domainMatch.notes,
          });
        } else {
          missingCount++;
          nodes.push({
            id,
            requirement: req,
            category: 'essential_skill',
            skillGap: req,
            sourceType: 'none',
            confidence: 'MISSING_EVIDENCE',
            assessmentNotes: `No explicit record of "${req}" in uploaded resume or verified profile.`,
          });
        }
      }
    }

    const overallConfidence: 'high' | 'medium' | 'low' =
      verifiedCount >= requirements.length * 0.5 ? 'high' : (verifiedCount + inferredCount >= requirements.length * 0.5 ? 'medium' : 'low');

    return {
      jobId: vacancy.id,
      userId,
      overallConfidence,
      nodes,
      totalRequirements: requirements.length,
      verifiedCount,
      inferredCount,
      userConfirmedCount,
      missingCount,
      evaluatedAt: new Date().toISOString(),
      modelVersion: 'v2-career-intel',
    };
  }

  /**
   * 3. Honest Opportunity Assessment Builder
   */
  private buildHonestAssessment(
    tier: OpportunityAlignmentTier,
    vacancy: JobVacancy,
    matched: string[],
    missingEssential: string[],
    missingPreferred: string[],
    candidateYears: number,
    requiredYears: number,
    concerns: string[],
    unverified: string[]
  ): HonestAssessment {
    const whatMakesYouRelevant: string[] = [];
    const whatMayReduceCompetitiveness: string[] = [];
    const whatYouShouldImprove: string[] = [];
    const questionsToClarifyBeforeApplying: string[] = [];

    // Relevant points
    if (matched.length > 0) {
      whatMakesYouRelevant.push(`You demonstrate verified alignment with ${matched.length} key requirement${matched.length === 1 ? '' : 's'}: ${matched.slice(0, 3).join(', ')}.`);
    }
    if (candidateYears >= requiredYears && requiredYears > 0) {
      whatMakesYouRelevant.push(`Your ${candidateYears} years of experience meet the stated threshold of ${requiredYears}+ years.`);
    }

    // Competitive risks
    if (missingEssential.length > 0) {
      whatMayReduceCompetitiveness.push(`Missing direct evidence for ${missingEssential.length} essential requirement${missingEssential.length === 1 ? '' : 's'}: ${missingEssential.slice(0, 3).join(', ')}.`);
    }
    if (candidateYears < requiredYears && requiredYears > 0) {
      whatMayReduceCompetitiveness.push(`Role requests ${requiredYears}+ years experience, whereas you currently have ${candidateYears} verified years.`);
    }
    for (const c of concerns) {
      whatMayReduceCompetitiveness.push(c);
    }

    // Improvement advice
    if (missingEssential.length > 0) {
      whatYouShouldImprove.push(`Prepare specific examples or portfolio artifacts demonstrating practical knowledge of ${missingEssential[0]}.`);
    }
    if (missingPreferred.length > 0) {
      whatYouShouldImprove.push(`Highlight any related exposure to preferred tools (${missingPreferred.slice(0, 2).join(', ')}) in your cover letter.`);
    }
    if (whatYouShouldImprove.length === 0) {
      whatYouShouldImprove.push('Quantify the measurable business outcomes of your most recent achievements.');
    }

    // Questions to clarify
    if (!vacancy.salaryRange?.raw) {
      questionsToClarifyBeforeApplying.push('What is the budgeted compensation band for this role?');
    }
    if (vacancy.visaSponsorship === 'unknown' || !vacancy.visaSponsorship) {
      questionsToClarifyBeforeApplying.push('Does this position support international visa transfer or relocation assistance?');
    }
    if (vacancy.arrangement === 'hybrid') {
      questionsToClarifyBeforeApplying.push('What are the specific weekly in-office expectations for hybrid team members?');
    }
    questionsToClarifyBeforeApplying.push('What are the immediate priorities and deliverables for this position during the first 90 days?');

    let summary = '';
    switch (tier) {
      case 'STRONG_ALIGNMENT':
        summary = `You have strong structural alignment with the core responsibilities of this ${vacancy.title} opening at ${vacancy.company}.`;
        break;
      case 'GOOD_ALIGNMENT_WITH_GAPS':
        summary = `You demonstrate solid foundational qualifications for this role, though a few specific skill requirements may require targeted preparation.`;
        break;
      case 'STRETCH_OPPORTUNITY':
        summary = `This role represents an ambitious career step with notable gaps in required seniority or core technical stack.`;
        break;
      case 'LOW_ALIGNMENT':
        summary = `There is significant misalignment between your documented background and the mandatory requirements for this position.`;
        break;
    }

    return {
      alignmentTier: tier,
      summary,
      whatMakesYouRelevant,
      whatMayReduceCompetitiveness,
      whatYouShouldImprove,
      questionsToClarifyBeforeApplying,
      unverifiedInformation: unverified,
      disclaimer: HONEST_ASSESSMENT_DISCLAIMER,
    };
  }

  /**
   * 4. Resume Intelligence (Requirement 4)
   */
  public analyzeResumeIntelligence(profile: UserProfile, targetVacancy?: JobVacancy | null): ResumeIntelligenceReport {
    const issues: ResumeIssue[] = [];

    const exps = profile.experiences || [];
    const skills = (profile.skills || []).map(s => s.name);
    const education = profile.education || [];
    const certs = (profile.certifications || []).map(c => c.name);

    // 1. Missing information
    if (!profile.professionalSummary || profile.professionalSummary.trim().length < 50) {
      issues.push({
        type: 'missing_info',
        severity: 'warning',
        field: 'summary',
        description: 'Professional summary is absent or brief.',
        recommendation: 'Add a 3-sentence summary highlighting your core expertise and target role.',
        requiresUserConfirmation: false,
      });
    }

    if (skills.length < 5) {
      issues.push({
        type: 'missing_info',
        severity: 'warning',
        field: 'skills',
        description: 'Fewer than 5 skills extracted from resume.',
        recommendation: 'Add standard industry competencies to improve discovery and automated matching.',
        requiresUserConfirmation: true,
      });
    }

    // 2. Inconsistent Dates
    const nowYear = new Date().getFullYear();
    for (const exp of exps) {
      if (exp.startDate && exp.endDate && exp.endDate.toLowerCase() !== 'present') {
        const startY = parseInt(exp.startDate.match(/\d{4}/)?.[0] || '0', 10);
        const endY = parseInt(exp.endDate.match(/\d{4}/)?.[0] || '0', 10);
        if (startY > endY && endY > 1980) {
          issues.push({
            type: 'inconsistent_dates',
            severity: 'critical',
            field: 'experiences',
            description: `Start date (${exp.startDate}) is after end date (${exp.endDate}) at ${exp.company}.`,
            recommendation: 'Review your employment timeline dates to correct inverted chronology.',
            requiresUserConfirmation: true,
          });
        }
        if (startY > nowYear + 1) {
          issues.push({
            type: 'inconsistent_dates',
            severity: 'critical',
            field: 'experiences',
            description: `Start date (${exp.startDate}) is in the future at ${exp.company}.`,
            recommendation: 'Verify date formatting (MM/YYYY).',
            requiresUserConfirmation: true,
          });
        }
      }
    }

    // 3. Duplicate Experience Detection
    const seenRoles = new Map<string, number>();
    for (const exp of exps) {
      const key = `${(exp.company || '').toLowerCase()}_${(exp.role || '').toLowerCase()}`;
      seenRoles.set(key, (seenRoles.get(key) || 0) + 1);
      if (seenRoles.get(key)! > 1) {
        issues.push({
          type: 'duplicate_experience',
          severity: 'warning',
          field: 'experiences',
          description: `Duplicate experience record identified: ${exp.role} at ${exp.company}.`,
          recommendation: 'Merge duplicate roles into a single cohesive promotion or timeline entry.',
          requiresUserConfirmation: true,
        });
      }
    }

    // 4. Unsupported Claims
    const totalExp = profile.totalExperienceYears || this.computeExperienceYears(exps);
    if (profile.professionalSummary && profile.professionalSummary.match(/(\d+)\+?\s*years/i)) {
      const claimYears = parseInt(profile.professionalSummary.match(/(\d+)\+?\s*years/i)![1], 10);
      if (claimYears > totalExp + 3 && totalExp > 0) {
        issues.push({
          type: 'unsupported_claim',
          severity: 'warning',
          field: 'summary',
          description: `Summary claims "${claimYears}+ years of experience", but documented work history covers ${totalExp} years.`,
          recommendation: 'Align summary claims directly with chronological employment dates.',
          requiresUserConfirmation: true,
        });
      }
    }

    // 5. Formatting & Readability
    let unbulletedRoles = 0;
    for (const exp of exps) {
      if (!exp.achievements || exp.achievements.length === 0) {
        unbulletedRoles++;
      }
    }
    if (unbulletedRoles > 0) {
      issues.push({
        type: 'formatting_issue',
        severity: 'suggestion',
        field: 'experiences',
        description: `${unbulletedRoles} role(s) lack achievement bullet points.`,
        recommendation: 'Structure responsibilities into 3-4 bullet points highlighting outcomes and metrics.',
        requiresUserConfirmation: false,
      });
    }

    // Extract achievements and tools
    const achievements: string[] = [];
    const tools: string[] = [];
    for (const exp of exps) {
      for (const ach of exp.achievements || []) {
        achievements.push(ach);
        const matches = ach.match(/\b(SQL|Python|React|Docker|Kubernetes|AWS|Jira|Figma|Excel|Tableau|Git|Node\.js|GraphQL)\b/gi);
        if (matches) {
          for (const m of matches) {
            if (!tools.includes(m)) tools.push(m);
          }
        }
      }
    }

    const report: ResumeIntelligenceReport = {
      extracted: {
        employmentHistory: exps,
        skills,
        education,
        certifications: certs,
        achievements: achievements.slice(0, 15),
        toolsAndTechnologies: tools,
      },
      issues,
      analyzedAt: new Date().toISOString(),
    };

    if (targetVacancy) {
      report.comparisonsByJobId = {
        [targetVacancy.id]: this.compareResumeToJob(profile, targetVacancy),
      };
    }

    return report;
  }

  /**
   * Resume-to-Job Comparison with ATS Readability Feedback
   */
  public compareResumeToJob(profile: UserProfile, vacancy: JobVacancy): ResumeToJobComparison {
    const candidateSkills = (profile.skills || []).map(s => s.name.toLowerCase().trim());
    const descLower = (vacancy.description || '').toLowerCase();
    const requirements = vacancy.requirements || this.extractRequirementsFromText(vacancy.description);

    const existingRelevantContent: string[] = [];
    const missingRelevantKeywords: string[] = [];
    const skillsRequiringClarification: string[] = [];
    const suggestionsToImproveRelevance: string[] = [];

    for (const req of requirements) {
      const rl = req.toLowerCase();
      if (candidateSkills.some(cs => cs.includes(rl) || rl.includes(cs))) {
        existingRelevantContent.push(req);
      } else if (descLower.includes(rl)) {
        missingRelevantKeywords.push(req);
      }
    }

    if (missingRelevantKeywords.length > 0) {
      suggestionsToImproveRelevance.push(`Incorporate authentic context for "${missingRelevantKeywords[0]}" if you have applied experience with it.`);
    }
    suggestionsToImproveRelevance.push('Use the exact title framing used by the employer in your application cover letter.');

    return {
      jobId: vacancy.id,
      existingRelevantContent,
      missingRelevantKeywords: missingRelevantKeywords.slice(0, 8),
      skillsRequiringClarification,
      suggestionsToImproveRelevance,
      atsReadability: {
        parserCompatibility: profile.masterResumeFileName?.toLowerCase().endsWith('.docx') ? 'moderate' : 'high',
        structuralFeedback: [
          'Standard chronological layout ensures compatibility across ATS parsers.',
          'Standard headings (Experience, Education, Skills) detected.',
        ],
        unsupportedFormatsDetected: [],
        methodologyExplanation: ATS_METHODOLOGY_EXPLANATION,
      },
    };
  }

  /**
   * 5. Application Readiness Studio (Requirement 5)
   */
  public evaluateApplicationReadiness(
    profile: UserProfile,
    preferences: CareerPreferences,
    vacancy: JobVacancy
  ): ApplicationReadinessAssessment {
    const items: ReadinessChecklistItem[] = [];
    const questionsToAskEmployer: string[] = [];

    // 1. Resume relevance
    const match = this.evaluateMultiDimensionalMatch(profile, preferences, vacancy);
    if (match.matchScore >= 65) {
      items.push({
        id: 'readiness_resume',
        category: 'resume_relevance',
        label: 'Resume Structural Alignment',
        status: 'pass',
        detail: `Composite fit score of ${match.matchScore}/100 meets application readiness threshold.`,
      });
    } else {
      items.push({
        id: 'readiness_resume',
        category: 'resume_relevance',
        label: 'Resume Structural Alignment',
        status: 'warning',
        detail: `Composite fit score of ${match.matchScore}/100 indicates notable gaps in required qualifications.`,
        actionableStep: 'Review the Fit Evidence Map and clarify relevant transferable experience.',
      });
    }

    // 2. Required Qualifications
    if (match.missingEssentialRequirements && match.missingEssentialRequirements.length > 0) {
      items.push({
        id: 'readiness_quals',
        category: 'required_qualifications',
        label: 'Essential Mandatory Requirements',
        status: 'warning',
        detail: `${match.missingEssentialRequirements.length} essential requirement(s) lack direct evidence: ${match.missingEssentialRequirements.slice(0, 2).join(', ')}.`,
        actionableStep: 'Prepare STAR achievement examples explaining your familiarity with these competencies.',
      });
    } else {
      items.push({
        id: 'readiness_quals',
        category: 'required_qualifications',
        label: 'Essential Mandatory Requirements',
        status: 'pass',
        detail: 'Direct evidence confirmed for all listed essential requirements.',
      });
    }

    // 3. Location Suitability
    const isRemote = vacancy.remote || vacancy.arrangement === 'remote';
    if (isRemote) {
      items.push({
        id: 'readiness_location',
        category: 'location_suitability',
        label: 'Location & Work Arrangement',
        status: 'pass',
        detail: 'Remote arrangement matches flexible candidate parameters.',
      });
    } else {
      items.push({
        id: 'readiness_location',
        category: 'location_suitability',
        label: 'Location & Work Arrangement',
        status: 'pass',
        detail: `Position located in ${vacancy.location || 'Stated city'}. Confirm commute or relocation willingness.`,
      });
    }

    // 4. Salary Suitability
    if (match.salaryCompatibility === 'below_threshold') {
      items.push({
        id: 'readiness_salary',
        category: 'salary_suitability',
        label: 'Compensation Alignment',
        status: 'warning',
        detail: 'Posted compensation is below your target salary baseline.',
        actionableStep: 'Be prepared to negotiate or confirm whether total compensation includes bonus or equity.',
      });
    } else {
      items.push({
        id: 'readiness_salary',
        category: 'salary_suitability',
        label: 'Compensation Alignment',
        status: 'pass',
        detail: vacancy.salaryRange?.raw ? `Compensation (${vacancy.salaryRange.raw}) is aligned with preferences.` : 'Compensation not disclosed; negotiable in recruiter screen.',
      });
    }

    // 5. Work Authorization
    if (match.sponsorshipStatus === 'unsupported' && (preferences.requiresVisaSponsorship || preferences.visaSponsorshipRequired)) {
      items.push({
        id: 'readiness_visa',
        category: 'work_authorization',
        label: 'Work Authorization',
        status: 'fail',
        detail: 'Role does not offer visa sponsorship, while candidate requires sponsorship.',
        actionableStep: 'Verify whether employer can accept independent work authorization or CPT/OPT.',
      });
    } else {
      items.push({
        id: 'readiness_visa',
        category: 'work_authorization',
        label: 'Work Authorization',
        status: 'pass',
        detail: 'No work authorization conflicts detected.',
      });
    }

    // 6. Required Documents
    const hasResume = Boolean(profile.masterResumeFileName || (profile.experiences && profile.experiences.length > 0));
    if (hasResume) {
      items.push({
        id: 'readiness_docs',
        category: 'required_documents',
        label: 'Application Documents',
        status: 'pass',
        detail: 'Master resume profile verified and ready for tailored submission.',
      });
    } else {
      items.push({
        id: 'readiness_docs',
        category: 'required_documents',
        label: 'Application Documents',
        status: 'fail',
        detail: 'No master resume uploaded.',
        actionableStep: 'Upload your master resume in Resume Studio before applying.',
      });
    }

    // Questions to ask
    questionsToAskEmployer.push('What are the key technical or business challenges this team is solving over the next 6-12 months?');
    questionsToAskEmployer.push('How does this team evaluate success and impact in this role?');
    if (!vacancy.salaryRange?.raw) {
      questionsToAskEmployer.push('Could you share the budgeted salary range for this position?');
    }

    const hasFail = items.some(i => i.status === 'fail');
    const warningCount = items.filter(i => i.status === 'warning').length;
    const status: 'READY_TO_APPLY' | 'REVIEW_FIRST' = hasFail || warningCount >= 2 ? 'REVIEW_FIRST' : 'READY_TO_APPLY';

    const overallSummary = status === 'READY_TO_APPLY'
      ? 'Your profile satisfies the core criteria for this opening. You are well-positioned to apply with confidence.'
      : 'Review the identified warnings before applying to optimize your application narrative and avoid mismatched expectations.';

    return {
      jobId: vacancy.id,
      status,
      overallSummary,
      items,
      questionsToAskEmployer,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * 6. Application Copilot (Requirement 6)
   */
  public generateCopilotArtifacts(profile: UserProfile, vacancy: JobVacancy): CopilotJobArtifacts {
    const verifiedSkills = (profile.skills || []).map(s => s.name);
    const exps = profile.experiences || [];

    // Filter experiences to verified achievements
    const highlightedExperiences = exps.slice(0, 3).map(exp => ({
      company: exp.company,
      role: exp.role,
      bulletPoints: (exp.achievements || []).slice(0, 3),
    }));

    // Tailored resume summary based strictly on verified candidate background
    const headline = `${profile.currentTitle || 'Professional'} | Specialist in ${verifiedSkills.slice(0, 3).join(', ')}`;
    const professionalSummary = `Experienced ${profile.currentTitle || 'professional'} with ${profile.totalExperienceYears || 'proven'} years of demonstrated background at ${exps.map(e => e.company).slice(0, 2).join(' and ')}. Proven track record in ${verifiedSkills.slice(0, 4).join(', ')}. Applying verified background to ${vacancy.title} at ${vacancy.company}.`;

    // Professional cover letter grounded strictly in candidate facts
    const coverLetter = {
      salutation: `Dear Hiring Team at ${vacancy.company},`,
      opening: `I am writing to express my focused interest in the ${vacancy.title} opening at ${vacancy.company}. With a verified background in ${verifiedSkills.slice(0, 3).join(', ')}, I am eager to contribute to your team's objectives.`,
      bodyParagraphs: [
        `Throughout my tenure at ${exps[0]?.company || 'my recent organization'}, I focused on delivering high-impact outcomes as ${exps[0]?.role || 'a core team member'}. Specifically, I worked with ${verifiedSkills.slice(0, 3).join(', ')} to support critical project milestones.`,
        `I have carefully reviewed the requirements for this ${vacancy.title} role. My practical experience directly aligns with your need for verified expertise, and I look forward to bringing transparent, outcome-oriented execution to ${vacancy.company}.`,
      ],
      callToAction: `I would welcome the opportunity to discuss how my verified background and hands-on experience align with your priorities for this role.`,
      closing: `Sincerely,\n${profile.fullName || 'Candidate'}`,
    };

    // Recruiter outreach message
    const recruiterMessage = {
      platform: 'linkedin' as const,
      subject: `Inquiry regarding ${vacancy.title} role at ${vacancy.company}`,
      message: `Hi there, I noticed the ${vacancy.title} position at ${vacancy.company} and wanted to reach out. With verified experience in ${verifiedSkills.slice(0, 2).join(' and ')} at ${exps[0]?.company || 'leading teams'}, I believe my background aligns well with the team's goals. I would love to connect and share my portfolio. Best regards, ${profile.fullName || 'Candidate'}.`,
    };

    // Skills-gap improvement plan
    const reqs = vacancy.requirements || this.extractRequirementsFromText(vacancy.description);
    const missing = reqs.filter(r => !verifiedSkills.some(vs => vs.toLowerCase().includes(r.toLowerCase())));

    const skillsGapImprovementPlan = {
      targetSkills: missing.slice(0, 3),
      learningPath: missing.slice(0, 3).map((sk, idx) => ({
        skill: sk,
        suggestedAction: `Complete a targeted practical exercise applying ${sk} to an open-source or portfolio case study.`,
        estimatedHours: 8 + (idx * 4),
        priority: (idx === 0 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
      })),
    };

    return {
      jobId: vacancy.id,
      tailoredResumeVersion: {
        headline,
        professionalSummary,
        highlightedExperiences,
        verifiedSkillsOnly: verifiedSkills,
      },
      coverLetter,
      recruiterMessage,
      skillsGapImprovementPlan,
      userReviewed: false,
    };
  }

  /**
   * 7. Interview Intelligence (Requirement 9)
   */
  public generateInterviewIntelligence(profile: UserProfile, vacancy: JobVacancy): InterviewIntelligenceReport {
    const verifiedSkills = (profile.skills || []).map(s => s.name);
    const exps = profile.experiences || [];
    const topExp = exps[0];

    const competencies = [
      'Core Technical Execution & Problem Solving',
      'Cross-Functional Stakeholder Collaboration',
      'System Architecture & Process Reliability',
      'Ambiguity & Fast-Paced Decision Making',
    ];

    const roleSpecificQuestions: StarQuestion[] = [
      {
        question: `Can you walk through a time at ${topExp?.company || 'your previous company'} where you tackled a complex challenge in ${verifiedSkills[0] || 'your core area'}?`,
        category: 'role_specific',
        starFramework: {
          situationGuidance: `Describe the specific operational context at ${topExp?.company || 'your past role'} and the business stakes.`,
          taskGuidance: 'Define exactly what your personal responsibility was versus the broader team.',
          actionGuidance: `Detail the concrete steps you executed using ${verifiedSkills[0] || 'your primary methodology'}.`,
          resultGuidance: 'State the measurable quantitative business outcome (e.g. latency reduction, cost savings, delivery speed).',
        },
        candidateRelevantExperienceRef: topExp ? `${topExp.role} at ${topExp.company}` : undefined,
      },
      {
        question: `How have you resolved disagreements or misaligned priorities with product or business partners?`,
        category: 'competency',
        starFramework: {
          situationGuidance: 'Choose a real instance where technical feasibility conflicted with deadline expectations.',
          taskGuidance: 'Explain your goal: finding common ground without compromising architectural integrity.',
          actionGuidance: 'Describe your communication approach, data sharing, and trade-off negotiations.',
          resultGuidance: 'Explain the agreed solution and the long-term relationship outcome.',
        },
      },
    ];

    const technicalFunctionalQuestions: StarQuestion[] = [
      {
        question: `How would you architect a reliable workflow for ${vacancy.title} responsibilities at ${vacancy.company}?`,
        category: 'technical_functional',
        starFramework: {
          situationGuidance: 'Acknowledge the specific scale and industry domain of the employer.',
          taskGuidance: 'Outline the functional requirements and critical edge-case failure modes.',
          actionGuidance: 'Detail your step-by-step technical approach, tooling, and monitoring strategies.',
          resultGuidance: 'Explain how your architecture guarantees reliability and team maintainability.',
        },
      },
    ];

    const questionsToAskEmployer = [
      `What are the most urgent technical or operational problems the team needs this ${vacancy.title} to solve in quarter 1?`,
      `How does engineering and product collaboration work day-to-day at ${vacancy.company}?`,
      `What does the career progression path look like for high performers in this group?`,
    ];

    const qualityRubricFeedback = {
      clarityAdvice: 'Keep your situation and task description under 90 seconds. Spend 60% of your time on the concrete actions you took.',
      evidenceGroundingAdvice: 'Anchor claims in verified projects. State specific numbers, tools, and timelines rather than generic generalities.',
      humilityAndTransparencyAdvice: 'If asked about a tool you have not used hands-on, state what you know honestly and explain your rapid ramp-up approach.',
    };

    return {
      jobId: vacancy.id,
      competencies_json: JSON.stringify(competencies),
      questions_json: JSON.stringify([...roleSpecificQuestions, ...technicalFunctionalQuestions]),
      questions_to_ask_json: JSON.stringify(questionsToAskEmployer),
      feedback_rubric_json: JSON.stringify(qualityRubricFeedback),
      competencyAreas: competencies,
      roleSpecificQuestions,
      technicalFunctionalQuestions,
      questionsToAskEmployer,
      qualityRubricFeedback,
      disclaimer: INTERVIEW_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    } as any;
  }

  /**
   * 8. Personalized Career Roadmap (Requirement 10)
   */
  public generateCareerRoadmap(profile: UserProfile, targetRole: string, targetVacancies: JobVacancy[]): CareerRoadmap {
    const verifiedSkills = (profile.skills || []).map(s => s.name.toLowerCase().trim());
    const skillFrequency = new Map<string, number>();

    // Analyze target vacancies to find frequent requirements
    for (const vac of targetVacancies) {
      const reqs = vac.requirements || this.extractRequirementsFromText(vac.description);
      for (const r of reqs) {
        const rl = r.toLowerCase().trim();
        if (!verifiedSkills.includes(rl)) {
          skillFrequency.set(r, (skillFrequency.get(r) || 0) + 1);
        }
      }
    }

    const sortedSkills = Array.from(skillFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const prioritizedGaps: CareerRoadmapItem[] = sortedSkills.map(([skill, freq], idx) => {
      const isEssential = idx < 2 || freq >= 2;
      return {
        id: `gap_${idx}`,
        skill,
        isEssential,
        learningEffort: (idx === 0 ? 'moderate' : (idx === 1 ? 'high' : 'low')) as 'low' | 'moderate' | 'high',
        relevanceScore: Math.min(100, Math.round((freq / Math.max(1, targetVacancies.length)) * 100) + 50),
        recommendedAction: isEssential
          ? `Essential qualification: Build hands-on project artifacts demonstrating ${skill}.`
          : `Optional growth skill: Familiarize yourself with fundamental concepts in ${skill}.`,
        realisticCoursesOrProjects: [
          {
            title: `Practical Implementation Portfolio: ${skill}`,
            type: 'hands_on_project',
            description: `Build a production-grade miniature component using ${skill} and push clean, documented code to GitHub.`,
            estimatedTime: '12 - 16 hours',
          },
          {
            title: `Industry Certification / Course in ${skill}`,
            type: 'course',
            description: `Complete an accredited curriculum covering best practices, error handling, and architecture in ${skill}.`,
            estimatedTime: '20 - 30 hours',
          },
        ],
      };
    });

    return {
      userId: profile.id,
      targetRole: targetRole || profile.currentTitle || 'Target Career Path',
      prioritizedGaps,
      updatedAt: new Date().toISOString(),
    };
  }

  // Helper Methods
  private extractRequirementsFromText(desc: string): string[] {
    if (!desc) return [];
    const lines = desc.split(/[\n\r]+/);
    const results: string[] = [];
    for (const l of lines) {
      const trimmed = l.trim().replace(/^[-•*–—]\s*/, '');
      if (trimmed.length > 5 && trimmed.length < 120 && (l.startsWith('-') || l.startsWith('•') || l.startsWith('*') || l.startsWith('–'))) {
        results.push(trimmed);
      }
    }
    return results.slice(0, 10);
  }

  private computeExperienceYears(experiences: any[]): number {
    let totalMonths = 0;
    for (const exp of experiences) {
      const sMatch = exp.startDate?.match(/\d{4}/);
      const eMatch = exp.endDate?.match(/\d{4}/);
      if (sMatch) {
        const s = parseInt(sMatch[0], 10);
        const e = exp.endDate?.toLowerCase() === 'present' ? new Date().getFullYear() : (eMatch ? parseInt(eMatch[0], 10) : s + 1);
        totalMonths += Math.max(6, (e - s) * 12);
      }
    }
    return Math.max(1, Math.round(totalMonths / 12));
  }

  private parseSalaryString(raw: string): number | undefined {
    const numbers = raw.match(/\d+[\d,.]*/g);
    if (!numbers) return undefined;
    const cleaned = parseInt(numbers[numbers.length - 1].replace(/,/g, ''), 10);
    return cleaned > 1000 ? cleaned : undefined;
  }

  private inferDomain(title: string, text: string): string {
    const combined = `${title} ${text}`.toLowerCase();
    for (const [domain, data] of Object.entries(DOMAIN_TAXONOMY)) {
      if (data.keywords.some(kw => combined.includes(kw))) {
        return domain;
      }
    }
    return 'general';
  }

  private areDomainsRelated(d1: string, d2: string): boolean {
    if (d1 === d2) return true;
    const rel1 = DOMAIN_TAXONOMY[d1]?.related || [];
    const rel2 = DOMAIN_TAXONOMY[d2]?.related || [];
    return rel1.includes(d2) || rel2.includes(d1);
  }

  private findDomainBridge(req: string, exps: any[]): { evidence: string; reference: string; notes: string } | null {
    for (const exp of exps) {
      const fullText = `${exp.role} ${exp.company} ${(exp.achievements || []).join(' ')}`.toLowerCase();
      // Example: Candidate has customer operations / distributor requests handling supply-chain requests
      if (req.includes('supply chain') && (fullText.includes('distributor') || fullText.includes('inventory') || fullText.includes('order'))) {
        return {
          evidence: `Experience managing distributor requests and order fulfillment at ${exp.company}`,
          reference: `${exp.company} (${exp.role})`,
          notes: 'Relevant operational exposure, but not automatically equivalent to end-to-end supply chain planning experience.',
        };
      }
      if (req.includes('project management') && (fullText.includes('coordinated') || fullText.includes('scheduled') || fullText.includes('deliverables'))) {
        return {
          evidence: `Track record coordinating deliverables and release schedules at ${exp.company}`,
          reference: `${exp.company} (${exp.role})`,
          notes: 'Transferable coordination experience, but lacks formal Agile / Scrum certification on record.',
        };
      }
    }
    return null;
  }
}

export const careerIntelligenceEngine = new CareerIntelligenceEngine();
