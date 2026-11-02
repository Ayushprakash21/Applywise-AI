import { test } from 'node:test';
import assert from 'node:assert';
import {
  auditResumeAgainstTwin,
  auditCoverLetterAgainstTwin,
  checkDuplicateApplication,
  evaluateTransferableSkills,
  runCentralIntegrityAudit
} from '../worker/integrityEngine.ts';
import {
  CareerDigitalTwin,
  TailoredResumeContent,
  ApplicationRecord
} from '../src/types/index.ts';

const mockTwin: CareerDigitalTwin = {
  userId: 'user-test-123',
  professionalSummary: 'Accomplished engineering lead with 8 years of experience leading distributed systems and cloud platforms.',
  summaryProvenance: {
    source: 'user_confirmed',
    confidence: 'confirmed',
    confirmedAt: '2026-11-01T00:00:00.000Z',
  },
  workExperiences: [
    {
      id: 'exp-1',
      company: 'Acme Cloud Corp',
      role: 'Senior Infrastructure Engineer',
      startDate: '2021-01',
      endDate: '2024-05',
      current: false,
      location: 'San Francisco, CA',
      description: 'Architected distributed event streaming systems and automated CI/CD pipelines.',
      achievements: [
        'Reduced cloud infrastructure spend by 25% through spot instance automation.',
        'Scaled Kafka clusters to process 500k messages per second.'
      ],
      skillsUsed: ['Kafka', 'Kubernetes', 'Go', 'AWS'],
      provenance: {
        source: 'user_confirmed',
        confidence: 'confirmed',
        confirmedAt: '2026-11-01T00:00:00.000Z',
      },
    },
    {
      id: 'exp-2',
      company: 'Inferred Startup Co',
      role: 'Operations Consultant',
      startDate: '2019-01',
      endDate: '2020-12',
      current: false,
      location: 'Remote',
      description: 'Streamlined supply chain logistics and warehouse inventory tracking.',
      achievements: ['Integrated automated barcode verification system.'],
      skillsUsed: ['Operations Management', 'Supply Chain', 'Logistics'],
      provenance: {
        source: 'ai_inferred',
        confidence: 'inferred',
      },
    }
  ],
  skillsInventory: [
    {
      id: 'sk-1',
      name: 'Kubernetes',
      category: 'cloud',
      proficiency: 'expert',
      yearsExperience: 5,
      provenance: { source: 'user_confirmed', confidence: 'confirmed' },
    },
    {
      id: 'sk-2',
      name: 'Go',
      category: 'backend',
      proficiency: 'proficient',
      yearsExperience: 4,
      provenance: { source: 'user_confirmed', confidence: 'confirmed' },
    },
    {
      id: 'sk-3',
      name: 'Kafka',
      category: 'backend',
      proficiency: 'proficient',
      yearsExperience: 3,
      provenance: { source: 'user_confirmed', confidence: 'confirmed' },
    },
    {
      id: 'sk-4',
      name: 'Supply Chain Optimization',
      category: 'supply_chain',
      proficiency: 'proficient',
      yearsExperience: 2,
      provenance: { source: 'ai_inferred', confidence: 'inferred' },
    }
  ],
  education: [],
  certifications: [],
  projects: [],
  careerGoals: ['Lead Staff Architect'],
  learningObjectives: ['Rust Systems Programming'],
  transferableBridges: [],
  completenessScore: 85,
  inferredPendingCount: 1,
  unverifiedCount: 0,
  updatedAt: '2026-11-01T00:00:00.000Z',
};

test('Career Twin Audit: Detects invented employers and flags as critical blocker', () => {
  const tailoredResumeWithFakeEmployer: TailoredResumeContent = {
    headline: 'Senior Cloud Architect',
    professionalSummary: 'Experienced engineering leader.',
    targetedSkills: ['Kubernetes', 'Go'],
    tailoredExperiences: [
      {
        company: 'Fictional Unicorn Inc', // INVENTED - not in twin
        role: 'Chief Architect',
        period: '2024-Present',
        bulletPoints: ['Spearheaded enterprise infrastructure.'],
      }
    ],
    education: [],
    certifications: [],
    truthfulnessScore: 100,
  };

  const audit = auditResumeAgainstTwin(tailoredResumeWithFakeEmployer, mockTwin);
  assert.strictEqual(audit.status, 'BLOCKED', 'Should block resume containing invented employer');
  assert.strictEqual(audit.inventedCompanies.length, 1);
  assert.strictEqual(audit.inventedCompanies[0], 'Fictional Unicorn Inc');
  assert(audit.truthfulnessScore < 50, 'Truthfulness score should be severely penalized');
});

test('Career Twin Audit: Audits numerical metrics against ground truth achievements', () => {
  const tailoredResumeWithMetrics: TailoredResumeContent = {
    headline: 'Infrastructure Engineer',
    professionalSummary: 'Cloud specialist.',
    targetedSkills: ['Kubernetes'],
    tailoredExperiences: [
      {
        company: 'Acme Cloud Corp',
        role: 'Senior Infrastructure Engineer',
        period: '2021-2024',
        bulletPoints: [
          'Reduced cloud infrastructure spend by 25% through spot instance automation.', // Evidenced in twin!
          'Increased team throughput by 85% and generated $4.2M in annual revenue.' // Invented metric!
        ],
      }
    ],
    education: [],
    certifications: [],
    truthfulnessScore: 100,
  };

  const audit = auditResumeAgainstTwin(tailoredResumeWithMetrics, mockTwin);
  assert.strictEqual(audit.status, 'NEEDS_REVIEW');
  const metric25 = audit.metricsAudit.find(m => m.metric === '25%');
  assert(metric25 && metric25.supportedInTwin, '25% metric should be verified in twin');
  const metric85 = audit.metricsAudit.find(m => m.metric === '85%');
  assert(metric85 && !metric85.supportedInTwin, '85% metric should be flagged as unevidenced');
});

test('Career Twin Audit: Distinguishes confirmed skills from unconfirmed AI inferences', () => {
  const tailoredResume: TailoredResumeContent = {
    headline: 'Systems Engineer',
    professionalSummary: 'Experienced leader.',
    targetedSkills: [
      'Kubernetes', // Confirmed fact in twin
      'Supply Chain Optimization', // AI inferred in twin (warning)
      'Quantum Computing' // Completely unevidenced skill (warning/blocked)
    ],
    tailoredExperiences: [
      {
        company: 'Acme Cloud Corp',
        role: 'Senior Engineer',
        period: '2021-2024',
        bulletPoints: ['Maintained Kubernetes clusters.'],
      }
    ],
    education: [],
    certifications: [],
    truthfulnessScore: 100,
  };

  const audit = auditResumeAgainstTwin(tailoredResume, mockTwin);
  assert.strictEqual(audit.status, 'NEEDS_REVIEW');
  assert(audit.inventedSkills.includes('Quantum Computing'));
  assert(audit.unsupportedClaims.some(c => c.claim.includes('Supply Chain Optimization')));
});

test('Transferable Skill Intelligence: Calculates domain bridges between technical and operations backgrounds', () => {
  const bridges = evaluateTransferableSkills(
    mockTwin,
    'Supply Chain Solutions Lead',
    'Oversee cross-functional warehouse operations, automated logistics, and continuous infrastructure improvements.'
  );

  assert(Array.isArray(bridges));
  assert(bridges.length > 0, 'Should generate domain bridge matches');
  const topBridge = bridges[0];
  assert(topBridge.relevanceScore > 40, 'Relevance score should reflect existing skills');
  assert(topBridge.rationale.length > 10, 'Rationale should explain transferable capability');
});

test('Duplicate Application Detector: Flags duplicates across vacancy, company, and role', () => {
  const existingApps: ApplicationRecord[] = [
    {
      id: 'app-999',
      duplicateKey: 'acme-cloud_senior-infrastructure-engineer',
      vacancyId: 'vac-1',
      company: 'Acme Cloud',
      role: 'Senior Infrastructure Engineer',
      country: 'USA',
      location: 'San Francisco',
      jobUrl: 'https://acme.com/jobs/1',
      matchScore: 90,
      status: 'SUBMITTED_VERIFIED',
      tailoredResume: {} as any,
      timeline: [],
      createdAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-20T00:00:00.000Z',
    }
  ];

  const duplicateCheck1 = checkDuplicateApplication('vac-1', 'Acme Cloud', 'Senior Infrastructure Engineer', existingApps);
  assert.strictEqual(duplicateCheck1.isDuplicate, true);
  assert.strictEqual(duplicateCheck1.duplicateApplicationId, 'app-999');

  const duplicateCheck2 = checkDuplicateApplication('vac-2', 'Stripe', 'Staff Engineer', existingApps);
  assert.strictEqual(duplicateCheck2.isDuplicate, false);
});

test('Central Verification Audit: End-to-end report generation with trust and truthfulness status', () => {
  const report = runCentralIntegrityAudit({
    job: {
      id: 'vac-greenhouse-1',
      company: 'Acme Cloud Corp',
      title: 'Senior Infrastructure Engineer',
      url: 'https://boards.greenhouse.io/acme/jobs/12345',
      isActive: true,
      lastCheckedAt: new Date().toISOString(),
    },
    tailoredResume: {
      headline: 'Senior Infrastructure Engineer',
      professionalSummary: 'Accomplished engineering lead.',
      targetedSkills: ['Kubernetes', 'Go'],
      tailoredExperiences: [
        {
          company: 'Acme Cloud Corp',
          role: 'Senior Infrastructure Engineer',
          period: '2021-2024',
          bulletPoints: ['Scaled Kafka clusters to process 500k messages per second.'],
        }
      ],
      education: [],
      certifications: [],
      truthfulnessScore: 100,
    },
    twin: mockTwin,
    existingApplications: [],
  });

  assert.strictEqual(report.overallStatus, 'VERIFIED');
  assert.strictEqual(report.destinationTrustStatus, 'TRUSTED_OFFICIAL_ATS');
  assert.strictEqual(report.jobAvailabilityStatus, 'VERIFIED_ACTIVE');
  assert.strictEqual(report.resumeIntegrity.status, 'VERIFIED');
  assert.strictEqual(report.duplicateCheck.isDuplicate, false);
});
