import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDuplicateKey,
  checkHardEligibility,
  calculateJobMatch,
  validateStateTransition,
  verifyTruthfulness,
  DEFAULT_SCORING_WEIGHTS,
} from './rules.ts';
import {
  UserProfile,
  CareerPreferences,
  JobVacancy,
  TailoredResumeContent
} from '../types/index.ts';

const mockProfile: UserProfile = {
  id: 'user-001',
  fullName: 'Alex Vance',
  email: 'alex.vance@example.com',
  phone: '+1 (555) 234-5678',
  location: 'San Francisco, CA, USA',
  workAuthorizationCountry: 'United States',
  workAuthorizationStatus: 'US Citizen',
  linkedinUrl: 'https://linkedin.com/in/alexvance',
  githubUrl: 'https://github.com/alexvance',
  portfolioUrl: 'https://alexvance.dev',
  totalExperienceYears: 6,
  currentEmployer: 'Stripe',
  currentTitle: 'Senior Full Stack Engineer',
  noticePeriodDays: 14,
  earliestJoinDate: '2026-12-01',
  professionalSummary: 'Full stack engineer with 6 years experience building distributed web systems.',
  education: [
    {
      id: 'edu-1',
      degree: 'B.S. in Computer Science',
      institution: 'UC Berkeley',
      fieldOfStudy: 'Computer Science',
      graduationYear: '2020',
    },
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'AWS Certified Solutions Architect',
      issuingOrg: 'Amazon Web Services',
      issueYear: '2023',
    },
  ],
  skills: [
    { name: 'TypeScript', category: 'frontend', proficiency: 'expert', yearsExperience: 5, verified: true },
    { name: 'React', category: 'frontend', proficiency: 'expert', yearsExperience: 6, verified: true },
    { name: 'Node.js', category: 'backend', proficiency: 'expert', yearsExperience: 5, verified: true },
    { name: 'PostgreSQL', category: 'database', proficiency: 'proficient', yearsExperience: 4, verified: true },
    { name: 'Docker', category: 'devops', proficiency: 'proficient', yearsExperience: 4, verified: true },
    { name: 'GraphQL', category: 'backend', proficiency: 'proficient', yearsExperience: 3, verified: true },
  ],
  experiences: [
    {
      id: 'exp-1',
      company: 'Stripe',
      role: 'Senior Full Stack Engineer',
      startDate: '2022-01',
      endDate: 'Present',
      current: true,
      location: 'San Francisco, CA',
      description: 'Lead engineer on payments dashboard core infrastructure.',
      achievements: [
        'Reduced p99 page latency by 42% via SSR optimization.',
        'Architected real-time webhook inspection panel used by 40,000 developers.',
      ],
      verifiedSkillsUsed: ['TypeScript', 'React', 'Node.js'],
    },
    {
      id: 'exp-2',
      company: 'Datadog',
      role: 'Software Engineer',
      startDate: '2020-06',
      endDate: '2021-12',
      current: false,
      location: 'New York, NY',
      description: 'Built high-throughput telemetry pipelines and UI widgets.',
      achievements: ['Integrated Kafka ingestion pipelines handling 50k events/sec.'],
      verifiedSkillsUsed: ['Node.js', 'PostgreSQL', 'Docker'],
    },
  ],
};

const mockPreferences: CareerPreferences = {
  targetCountries: ['United States', 'Canada', 'Remote'],
  targetCities: ['San Francisco', 'New York', 'Seattle'],
  preferredTitles: ['Senior Full Stack Engineer', 'Staff Engineer', 'Senior Frontend Engineer'],
  preferredIndustries: ['Fintech', 'Developer Tools', 'AI'],
  workArrangement: ['remote', 'hybrid'],
  minSalaryByCurrency: { USD: 150000, EUR: 110000 },
  preferredEmploymentType: ['full-time'],
  willingnessToRelocate: 'no',
  visaSponsorshipRequired: false,
  preferredCompanies: ['Stripe', 'OpenAI', 'Anthropic', 'Vercel'],
  excludedCompanies: ['CryptoSpamCorp', 'BadCulture Inc'],
  excludedKeywords: ['crypto', 'web3'],
};

const mockVacancy: JobVacancy = {
  id: 'vac-101',
  source: 'remotive',
  title: 'Senior Full Stack Engineer',
  company: 'Vercel',
  location: 'Remote, US',
  country: 'United States',
  remote: true,
  arrangement: 'remote',
  url: 'https://vercel.com/careers/senior-fullstack',
  description: 'Looking for a Senior Full Stack Engineer with strong TypeScript, React, and Node.js expertise to build developer workflows.',
  requirements: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
  tags: ['TypeScript', 'React', 'Remote'],
  publishedAt: '2026-11-01T12:00:00Z',
  salaryRange: { min: 160000, max: 210000, currency: 'USD' },
  visaSponsorship: 'supported',
  retrievedAt: '2026-11-02T03:00:00Z',
  isActive: true,
};

test('generateDuplicateKey produces deterministic normalized keys', () => {
  const key1 = generateDuplicateKey('Vercel, Inc.', 'https://vercel.com/careers/senior-fullstack/', 'user-001');
  const key2 = generateDuplicateKey('VERCEL', 'https://vercel.com/careers/senior-fullstack', 'user-001');
  assert.equal(key1, key2);
  assert.ok(key1.includes('vercel'));
  assert.ok(key1.includes('user-001'));
});

test('checkHardEligibility rejects excluded companies and excluded keywords', () => {
  const badCompanyVacancy: JobVacancy = {
    ...mockVacancy,
    company: 'CryptoSpamCorp',
  };
  const resultComp = checkHardEligibility(badCompanyVacancy, mockProfile, mockPreferences);
  assert.equal(resultComp.isEligible, false);
  assert.ok(resultComp.issues[0].includes('excluded companies list'));

  const badKeywordVacancy: JobVacancy = {
    ...mockVacancy,
    title: 'Senior Web3 & Crypto Engineer',
  };
  const resultKw = checkHardEligibility(badKeywordVacancy, mockProfile, mockPreferences);
  assert.equal(resultKw.isEligible, false);
  assert.ok(resultKw.issues.some(i => i.includes('excluded keyword')));
});

test('checkHardEligibility enforces visa sponsorship if user requires it', () => {
  const userNeedsVisa: CareerPreferences = {
    ...mockPreferences,
    visaSponsorshipRequired: true,
  };
  const noVisaVacancy: JobVacancy = {
    ...mockVacancy,
    visaSponsorship: 'not_supported',
  };
  const result = checkHardEligibility(noVisaVacancy, mockProfile, userNeedsVisa);
  assert.equal(result.isEligible, false);
  assert.ok(result.issues.some(i => i.includes('visa sponsorship')));
});

test('calculateJobMatch generates high match score for aligned vacancy', () => {
  const match = calculateJobMatch(mockVacancy, mockProfile, mockPreferences, DEFAULT_SCORING_WEIGHTS);
  assert.ok(match.matchScore >= 80, `Expected score >= 80, got ${match.matchScore}`);
  assert.equal(match.recommendation, 'STRONG_APPLY');
  assert.ok(match.matchedSkills.includes('TypeScript'));
  assert.ok(match.matchedSkills.includes('React'));
  assert.equal(match.salaryCompatibility, 'compatible');
});

test('validateStateTransition enforces application lifecycle state machine', () => {
  assert.equal(validateStateTransition('DISCOVERED', 'VALIDATED'), true);
  assert.equal(validateStateTransition('VALIDATED', 'MATCHED'), true);
  assert.equal(validateStateTransition('APPLICATION_PREPARED', 'AWAITING_APPROVAL'), true);
  assert.equal(validateStateTransition('AWAITING_APPROVAL', 'AUTHORIZED_TO_SUBMIT'), true);
  assert.equal(validateStateTransition('AUTHORIZED_TO_SUBMIT', 'SUBMITTING'), true);
  assert.equal(validateStateTransition('SUBMITTING', 'SUBMITTED'), true);
  assert.equal(validateStateTransition('SUBMITTED', 'CONFIRMATION_VERIFIED'), true);

  // Illegal transition: cannot jump from DISCOVERED directly to SUBMITTED
  assert.equal(validateStateTransition('DISCOVERED', 'SUBMITTED'), false);
  assert.equal(validateStateTransition('MATCHED', 'CONFIRMATION_VERIFIED'), false);
});

test('verifyTruthfulness flags hallucinated companies and skills', () => {
  const validResume: TailoredResumeContent = {
    versionId: 'res-v1',
    generatedAt: '2026-11-02T00:00:00Z',
    targetJobTitle: 'Senior Full Stack Engineer',
    targetCompany: 'Vercel',
    headline: 'Senior Full Stack Engineer | React & TypeScript Specialist',
    professionalSummary: 'Experienced full stack developer with 6 years scaling React & Node.js.',
    targetedSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    tailoredExperiences: [
      {
        company: 'Stripe',
        role: 'Senior Full Stack Engineer',
        period: '2022 - Present',
        bulletPoints: ['Reduced p99 page latency by 42% via SSR optimization.'],
      },
    ],
    education: ['B.S. in Computer Science, UC Berkeley'],
    certifications: ['AWS Certified Solutions Architect'],
    truthfulnessAuditPassed: true,
    truthfulnessScore: 100,
    auditNotes: [],
  };

  const auditValid = verifyTruthfulness(validResume, mockProfile);
  assert.equal(auditValid.passed, true);
  assert.equal(auditValid.score, 100);

  const hallucinatedResume: TailoredResumeContent = {
    ...validResume,
    targetedSkills: ['TypeScript', 'QuantumComputing', 'BrainInterfaceProgramming'],
    tailoredExperiences: [
      {
        company: 'FakeFictionalLab',
        role: 'Chief Scientist',
        period: '2019 - 2021',
        bulletPoints: ['Invented faster than light computing.'],
      },
    ],
  };

  const auditHallucinated = verifyTruthfulness(hallucinatedResume, mockProfile);
  assert.equal(auditHallucinated.passed, false);
  assert.ok(auditHallucinated.score < 80);
  assert.ok(auditHallucinated.issues.some(i => i.includes('FakeFictionalLab')));
  assert.ok(auditHallucinated.issues.some(i => i.includes('QuantumComputing')));
});
