import { describe, it } from 'node:test';
import assert from 'node:assert';
import { careerIntelligenceEngine } from '../worker/careerIntelligenceEngine.ts';
import {
  UserProfile,
  CareerPreferences,
  JobVacancy,
} from '../src/types/index.ts';

describe('ApplyVise AI Part 2 — Next-Gen Career Intelligence & Fit Evidence Suite', () => {
  // Test Candidate Profile
  const candidateProfile: UserProfile = {
    id: 'user_dev_01',
    fullName: 'Dev Roy',
    email: 'dev.roy@example.com',
    phone: '+1 555-0199',
    location: 'San Francisco, CA',
    totalExperienceYears: 6,
    currentEmployer: 'Tech Logistics Inc',
    currentTitle: 'Senior Software Engineer',
    professionalSummary: 'Full-stack software engineer with 6 years of experience building distributed web platforms and customer operations tooling using React, TypeScript, and Node.js.',
    skills: [
      { name: 'TypeScript', category: 'frontend', proficiency: 'expert', yearsExperience: 6, verified: true },
      { name: 'React', category: 'frontend', proficiency: 'expert', yearsExperience: 6, verified: true },
      { name: 'Node.js', category: 'backend', proficiency: 'expert', yearsExperience: 5, verified: true },
      { name: 'PostgreSQL', category: 'database', proficiency: 'proficient', yearsExperience: 4, verified: true },
      { name: 'Docker', category: 'devops', proficiency: 'proficient', yearsExperience: 4, verified: true },
    ],
    education: [
      { id: 'edu1', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Science', institution: 'University of California, Berkeley', graduationYear: '2018' },
    ],
    certifications: [
      { id: 'c1', name: 'AWS Certified Solutions Architect', issuingOrg: 'Amazon Web Services', issueYear: '2022' },
    ],
    experiences: [
      {
        id: 'exp1',
        company: 'Tech Logistics Inc',
        role: 'Senior Software Engineer',
        startDate: '2021-03',
        endDate: 'Present',
        current: true,
        location: 'San Francisco, CA',
        description: 'Lead distributed engineer',
        verifiedSkillsUsed: ['React', 'TypeScript', 'Node.js'],
        achievements: [
          'Engineered real-time distributor order tracking service handling 50k daily events.',
          'Built customer operations dashboard using React, TypeScript, and PostgreSQL.',
          'Reduced API latency by 35% through query optimization and Redis caching.',
        ],
      },
      {
        id: 'exp2',
        company: 'CloudScale Labs',
        role: 'Software Engineer',
        startDate: '2018-06',
        endDate: '2021-02',
        current: false,
        location: 'San Francisco, CA',
        description: 'Backend engineer',
        verifiedSkillsUsed: ['Node.js', 'Docker'],
        achievements: [
          'Developed microservices in Node.js and Docker for high-throughput data processing.',
          'Maintained CI/CD pipelines and automated integration test suites.',
        ],
      },
    ],
  };

  const candidatePreferences: CareerPreferences = {
    targetRoles: ['Senior Software Engineer', 'Full Stack Engineer'],
    targetCountries: ['United States'],
    targetCities: ['San Francisco'],
    preferredTitles: ['Senior Software Engineer'],
    preferredIndustries: ['Technology', 'Logistics'],
    workArrangement: ['remote', 'hybrid'],
    minSalaryUSD: 140000,
    minSalaryByCurrency: { USD: 140000 },
    preferredEmploymentType: ['full-time'],
    willingnessToRelocate: 'no',
    visaSponsorshipRequired: false,
    preferredCompanies: [],
    excludedCompanies: ['Blocked Corp'],
    excludedKeywords: ['Gambling'],
  };

  // High-Match Vacancy
  const highMatchVacancy: JobVacancy = {
    id: 'vac_high_01',
    source: 'direct_feed',
    title: 'Senior Software Engineer',
    company: 'Stripe',
    location: 'San Francisco, CA',
    country: 'United States',
    remote: true,
    arrangement: 'remote',
    url: 'https://stripe.com/jobs/senior-software-engineer',
    description: `We are looking for a Senior Software Engineer with 5+ years of experience to join our developer platform team.
Requirements:
- TypeScript
- React
- Node.js
- Distributed systems
- PostgreSQL
- AWS Certified preferred
Salary Range: $165,000 - $195,000`,
    requirements: ['TypeScript', 'React', 'Node.js', 'Distributed systems', 'PostgreSQL', 'AWS Certified preferred'],
    tags: ['TypeScript', 'React', 'Node.js'],
    publishedAt: new Date().toISOString(),
    salaryRange: { min: 165000, max: 195000, raw: '$165,000 - $195,000' },
    visaSponsorship: 'supported',
    retrievedAt: new Date().toISOString(),
    isActive: true,
  };

  // Low-Match Vacancy
  const lowMatchVacancy: JobVacancy = {
    id: 'vac_low_01',
    source: 'direct_feed',
    title: 'Senior Clinical Research Associate',
    company: 'BioPharma Global',
    location: 'Boston, MA',
    country: 'United States',
    remote: false,
    arrangement: 'onsite',
    url: 'https://biopharma.example/jobs/clinical-research',
    description: `Seeking a Senior Clinical Research Associate with 7+ years in Phase III oncology trials.
Requirements:
- Oncology clinical protocols
- FDA regulatory compliance
- Good Clinical Practice (GCP)
- Patient monitoring
Salary: $95,000 - $110,000`,
    requirements: ['Oncology clinical protocols', 'FDA regulatory compliance', 'Good Clinical Practice (GCP)', 'Patient monitoring'],
    tags: ['Clinical', 'Pharma'],
    publishedAt: new Date().toISOString(),
    salaryRange: { min: 95000, max: 110000, raw: '$95,000 - $110,000' },
    retrievedAt: new Date().toISOString(),
    isActive: true,
  };

  it('1. High-Match Job: Computes transparent score (75-95), identifies essential requirements & STRONG_ALIGNMENT', () => {
    const match = careerIntelligenceEngine.evaluateMultiDimensionalMatch(candidateProfile, candidatePreferences, highMatchVacancy);

    assert.ok(match.matchScore >= 75 && match.matchScore <= 100, `Expected score between 75 and 100, got ${match.matchScore}`);
    assert.strictEqual(match.alignmentTier, 'STRONG_ALIGNMENT');
    assert.strictEqual(match.recommendation, 'STRONG_APPLY');

    assert.ok(match.essentialRequirementsMatched?.includes('TypeScript'), 'Must match essential requirement TypeScript');
    assert.ok(match.essentialRequirementsMatched?.includes('React'), 'Must match essential requirement React');
    assert.ok(match.essentialRequirementsMatched?.includes('Node.js'), 'Must match essential requirement Node.js');
    assert.ok(match.preferredRequirementsMatched?.some(r => r.includes('AWS Certified')), 'Must match preferred AWS certification');

    assert.strictEqual(match.salaryCompatibility, 'compatible');
    assert.strictEqual(match.breakdown.skills >= 18, true);
    assert.strictEqual(match.breakdown.experience >= 20, true);
  });

  it('2. Low-Match Job: Correctly assigns LOW_ALIGNMENT without manufactured optimism', () => {
    const match = careerIntelligenceEngine.evaluateMultiDimensionalMatch(candidateProfile, candidatePreferences, lowMatchVacancy);

    assert.ok(match.matchScore < 45, `Expected low score below 45, got ${match.matchScore}`);
    assert.strictEqual(match.alignmentTier, 'LOW_ALIGNMENT');
    assert.strictEqual(match.recommendation, 'MARGINAL');

    assert.ok(match.missingEssentialRequirements?.length! >= 3, 'Must flag missing clinical requirements');
    assert.ok(match.honestAssessment?.whatMayReduceCompetitiveness.length! >= 2);
  });

  it('3. Anti-Gaming: Never awards high score simply because job title matches if skills/experience are deficient', () => {
    // Junior candidate with 6 months experience claiming Senior title
    const superficialCandidate: UserProfile = {
      ...candidateProfile,
      totalExperienceYears: 1,
      currentTitle: 'Senior Software Engineer',
      skills: [{ name: 'HTML', category: 'frontend', proficiency: 'familiar', yearsExperience: 1, verified: true }],
      experiences: [
        {
          id: 'exp99',
          company: 'Acme',
          role: 'Senior Software Engineer',
          startDate: '2023-01',
          endDate: '2023-07',
          current: false,
          location: 'Remote',
          description: 'Junior web assistant',
          verifiedSkillsUsed: ['HTML'],
          achievements: ['Assisted with minor website edits.'],
        },
      ],
    };

    const match = careerIntelligenceEngine.evaluateMultiDimensionalMatch(superficialCandidate, candidatePreferences, highMatchVacancy);

    // Score must be heavily penalized because core skills (TypeScript, Node, React) and years of experience are deficient
    assert.ok(match.matchScore < 50, `Superficial title must be penalized, got inflated score ${match.matchScore}`);
    assert.notStrictEqual(match.alignmentTier, 'STRONG_ALIGNMENT');
    assert.ok(match.potentialConcerns?.some(c => c.toLowerCase().includes('skill evidence is currently thin') || c.toLowerCase().includes('experience gap')));
  });

  it('4. Fit Evidence Map: Connects requirements to verified evidence, inferred relevance, and missing gaps', () => {
    const vacancyWithSupplyChain: JobVacancy = {
      ...highMatchVacancy,
      id: 'vac_evidence_01',
      title: 'Technical Supply Chain Lead',
      description: `Lead supply chain software integrations.
Requirements:
- TypeScript
- AWS Certified
- Supply Chain Operations
- GraphQL API Development`,
      requirements: ['TypeScript', 'AWS Certified', 'Supply Chain Operations', 'GraphQL API Development'],
    };

    const evidenceMap = careerIntelligenceEngine.generateFitEvidenceMap(
      candidateProfile.id,
      candidateProfile,
      vacancyWithSupplyChain
    );

    assert.strictEqual(evidenceMap.nodes.length, 4);

    // Node 1: TypeScript (verified skill + experience)
    const tsNode = evidenceMap.nodes.find(n => n.requirement === 'TypeScript');
    assert.ok(tsNode);
    assert.strictEqual(tsNode?.confidence, 'VERIFIED_EVIDENCE');
    assert.ok(tsNode?.candidateEvidence?.includes('Tech Logistics Inc'));

    // Node 2: AWS Certified (certification record)
    const awsNode = evidenceMap.nodes.find(n => n.requirement === 'AWS Certified');
    assert.ok(awsNode);
    assert.strictEqual(awsNode?.confidence, 'VERIFIED_EVIDENCE');
    assert.strictEqual(awsNode?.sourceType, 'certification_record');

    // Node 3: Supply Chain Operations (inferred bridge: distributor tracking exposure, not end-to-end planning)
    const scNode = evidenceMap.nodes.find(n => n.requirement === 'Supply Chain Operations');
    assert.ok(scNode);
    assert.strictEqual(scNode?.confidence, 'INFERRED_RELEVANCE');
    assert.ok(scNode?.assessmentNotes.includes('Relevant operational exposure, but not automatically equivalent to end-to-end supply chain planning experience.'));

    // Node 4: GraphQL (missing evidence)
    const gqlNode = evidenceMap.nodes.find(n => n.requirement === 'GraphQL API Development');
    assert.ok(gqlNode);
    assert.strictEqual(gqlNode?.confidence, 'MISSING_EVIDENCE');
    assert.ok(gqlNode?.skillGap);
  });

  it('5. Honest Opportunity Assessment: Formats plain English without misleading marketing claims', () => {
    const match = careerIntelligenceEngine.evaluateMultiDimensionalMatch(candidateProfile, candidatePreferences, highMatchVacancy);
    const assessment = match.honestAssessment!;

    assert.ok(assessment);
    assert.ok(assessment.whatMakesYouRelevant.length > 0);
    assert.ok(assessment.whatYouShouldImprove.length > 0);
    assert.ok(assessment.questionsToClarifyBeforeApplying.length > 0);

    const fullAssessmentText = JSON.stringify(assessment).toLowerCase();
    // Verify absence of forbidden false-promise phrases
    assert.strictEqual(fullAssessmentText.includes('guaranteed interview'), false);
    assert.strictEqual(fullAssessmentText.includes('guaranteed selection'), false);
    assert.strictEqual(fullAssessmentText.includes('100% hiring probability'), false);
    assert.strictEqual(fullAssessmentText.includes('you are the perfect candidate'), false);
  });

  it('6. Resume Intelligence: Detects inconsistent dates, duplicate roles, and unsupported summary claims', () => {
    const flawedProfile: UserProfile = {
      ...candidateProfile,
      professionalSummary: 'Executive tech lead with 20+ years of enterprise experience.', // Unsupported claim vs 6 years total
      experiences: [
        {
          id: 'exp_bad_dates',
          company: 'Chronology Glitch Corp',
          role: 'Lead Developer',
          startDate: '2023-08',
          endDate: '2020-01', // Inverted end date before start date
          current: false,
          location: 'Remote',
          description: 'Dev',
          verifiedSkillsUsed: [],
          achievements: [],
        },
        {
          id: 'exp_dup_1',
          company: 'Acme Software',
          role: 'Developer',
          startDate: '2019-01',
          endDate: '2020-01',
          current: false,
          location: 'Remote',
          description: 'Dev',
          verifiedSkillsUsed: ['API'],
          achievements: ['Built API.'],
        },
        {
          id: 'exp_dup_2',
          company: 'Acme Software',
          role: 'Developer', // Duplicate role
          startDate: '2019-01',
          endDate: '2020-01',
          current: false,
          location: 'Remote',
          description: 'Dev',
          verifiedSkillsUsed: ['API'],
          achievements: ['Built API.'],
        },
      ],
    };

    const report = careerIntelligenceEngine.analyzeResumeIntelligence(flawedProfile, highMatchVacancy);

    // 1. Inconsistent dates
    const dateIssue = report.issues.find(i => i.type === 'inconsistent_dates');
    assert.ok(dateIssue, 'Must flag inverted employment dates');
    assert.strictEqual(dateIssue?.severity, 'critical');

    // 2. Duplicate experience
    const dupIssue = report.issues.find(i => i.type === 'duplicate_experience');
    assert.ok(dupIssue, 'Must flag duplicate Acme Software role');

    // 3. Unsupported claim
    const claimIssue = report.issues.find(i => i.type === 'unsupported_claim');
    assert.ok(claimIssue, 'Must flag 20+ years claim vs 6 years reality');

    // 4. Formatting issue (no achievements on Chronology Glitch Corp)
    const fmtIssue = report.issues.find(i => i.type === 'formatting_issue');
    assert.ok(fmtIssue, 'Must flag unbulleted role');

    // 5. ATS Readability feedback
    const comparison = report.comparisonsByJobId?.[highMatchVacancy.id];
    assert.ok(comparison);
    assert.ok(comparison?.atsReadability.methodologyExplanation.includes('Applicant Tracking Systems differ'));
  });

  it('7. Application Readiness Studio: Generates pre-flight checklist and READY_TO_APPLY status', () => {
    const assessment = careerIntelligenceEngine.evaluateApplicationReadiness(
      candidateProfile,
      candidatePreferences,
      highMatchVacancy
    );

    assert.strictEqual(assessment.status, 'READY_TO_APPLY');
    assert.ok(assessment.items.length >= 6);

    const resumeItem = assessment.items.find(i => i.category === 'resume_relevance');
    assert.strictEqual(resumeItem?.status, 'pass');

    const salaryItem = assessment.items.find(i => i.category === 'salary_suitability');
    assert.strictEqual(salaryItem?.status, 'pass');

    const docsItem = assessment.items.find(i => i.category === 'required_documents');
    assert.strictEqual(docsItem?.status, 'pass');

    assert.ok(assessment.questionsToAskEmployer.length >= 2);
  });

  it('8. Application Copilot: Crafts tailored framing from strictly verified data & requires user review', () => {
    const copilotArtifacts = careerIntelligenceEngine.generateCopilotArtifacts(candidateProfile, highMatchVacancy);

    assert.strictEqual(copilotArtifacts.userReviewed, false, 'Artifact must require candidate review before submission');
    assert.ok(copilotArtifacts.tailoredResumeVersion?.professionalSummary.includes('Tech Logistics Inc'));
    assert.ok(copilotArtifacts.tailoredResumeVersion?.verifiedSkillsOnly.includes('TypeScript'));

    assert.ok(copilotArtifacts.coverLetter?.salutation.includes('Stripe'));
    assert.ok(copilotArtifacts.coverLetter?.bodyParagraphs[0].includes('Tech Logistics Inc'));

    assert.ok(copilotArtifacts.recruiterMessage?.message.includes('Stripe'));
  });

  it('9. Career Roadmap: Prioritizes market skill gaps and distinguishes essential from optional learning', () => {
    const targetVacancies: JobVacancy[] = [
      highMatchVacancy,
      {
        ...highMatchVacancy,
        id: 'vac_roadmap_2',
        requirements: ['TypeScript', 'Kubernetes', 'GraphQL', 'Go'],
      },
    ];

    const roadmap = careerIntelligenceEngine.generateCareerRoadmap(
      candidateProfile,
      'Senior Infrastructure Engineer',
      targetVacancies
    );

    assert.strictEqual(roadmap.userId, candidateProfile.id);
    assert.ok(roadmap.prioritizedGaps.length > 0);

    const firstGap = roadmap.prioritizedGaps[0];
    assert.ok(firstGap.skill);
    assert.strictEqual(firstGap.isEssential, true);
    assert.ok(firstGap.realisticCoursesOrProjects.length > 0);
    assert.ok(firstGap.realisticCoursesOrProjects[0].estimatedTime);
  });

  it('10. Interview Intelligence: Generates STAR frameworks without claiming knowledge of actual questions', () => {
    const prep = careerIntelligenceEngine.generateInterviewIntelligence(candidateProfile, highMatchVacancy);

    assert.ok(prep.competencyAreas.length >= 3);
    assert.ok(prep.roleSpecificQuestions.length >= 2);

    const q1 = prep.roleSpecificQuestions[0];
    assert.ok(q1.starFramework.situationGuidance);
    assert.ok(q1.starFramework.taskGuidance);
    assert.ok(q1.starFramework.actionGuidance);
    assert.ok(q1.starFramework.resultGuidance);

    assert.ok(prep.questionsToAskEmployer.length >= 2);
    assert.ok(prep.qualityRubricFeedback.clarityAdvice);
    assert.ok(prep.disclaimer.includes('Actual interview formats and questions are determined exclusively by the employer.'));
  });

  it('11. Incomplete & Unspecified Edge Cases: Gracefully handles missing salary, unknown location, and unstated visa', () => {
    const edgeVacancy: JobVacancy = {
      id: 'vac_edge_01',
      source: 'direct_feed',
      title: 'Staff Software Architect',
      company: 'Stealth Startup',
      location: '',
      country: '',
      remote: false,
      arrangement: 'onsite',
      url: 'https://stealth.example/jobs/architect',
      description: 'Join our team. Technical stack details to be shared during interviews.',
      requirements: [],
      tags: [],
      publishedAt: new Date().toISOString(),
      retrievedAt: new Date().toISOString(),
      isActive: true,
    };

    const match = careerIntelligenceEngine.evaluateMultiDimensionalMatch(candidateProfile, candidatePreferences, edgeVacancy);

    assert.ok(match.unverifiedInformation?.some(u => u.toLowerCase().includes('salary') || u.toLowerCase().includes('compensation')));
    assert.ok(match.unverifiedInformation?.some(u => u.toLowerCase().includes('location') || u.toLowerCase().includes('geographic')));
    assert.strictEqual(match.dataQuality, 'limited');
  });
});
