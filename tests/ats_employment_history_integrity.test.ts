// tests/ats_employment_history_integrity.test.ts
// Critical Regression Test Suite: ATS Document Studio Employment History and Date Integrity

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStructuralEmploymentHistory,
  normalizeAndValidateAiExperiences,
  validateAndMergeEmploymentRecords,
  formatExperiencePeriod,
  isInvalidToken,
  isDescriptionOrBullet,
} from '../src/utils/structuralEmploymentParser.ts';
import { buildFactsFromProfile, auditTailoredResume } from '../src/utils/candidateFactRegistry.ts';
import { resumeEngine } from '../server/resumeEngine.ts';
import { workerResumeEngine } from '../worker/resumeEngine.ts';
import type { UserProfile, ExperienceItem, TailoredResumeContent } from '../src/types/index.ts';

// Authentic candidate resume text (simulating extracted PDF/DOCX lines with natural wrapping)
const CANDIDATE_RESUME_TEXT = `
Ayush Prakash
Indore, Madhya Pradesh, India | ayush@example.com

PROFESSIONAL SUMMARY
Experienced Process Associate and Project Manager with over 3.5 years across Supply Chain Operations,
ERP implementations, and business process improvements.

PROFESSIONAL EXPERIENCE

Tata Consultancy Services (TCS), Indore
Senior Process Associate – Supply Chain Operations
Sep 2024 – Present
• Carried out the end-to-end VIM implementation for a European grocery chain.
• Provided analytical reporting and invoice checking services for a Canadian energy technology company.
• Reconciled discrepancies in a fast-paced environment.

ESP Softtech Pvt. Ltd., Indore
Associate Project Manager
Sep 2023 – Aug 2024
• Spearheaded cross-functional sprint planning and stakeholder coordination across 4 agile teams.
• Monitored milestone delivery, risk mitigation, and weekly project health reporting.

SynergyTop Softlabs Pvt. Ltd., Indore
Associate Project Manager
Feb 2023 – Jul 2023
• Managed software delivery workflows and sprint tracking for international web solutions.
• Coordinated resource allocations and daily standups.

Accenture Solutions Pvt. Ltd., Indore
Business & Technology Delivery Associate
Dec 2021 – Feb 2023
• Delivered SAP ERP support, master data audits, and client ticketing resolutions.
• Analyzed operational workflows and reduced resolution cycle time by 18%.

Teleperformance, Indore
Customer Service Associate
Sep 2021 – Nov 2021
• Provided first-line inbound client support and documented query tickets with 98% CSAT.

Toppr Technologies, Indore
Business Development Associate
Jul 2021
• Conducted educational product consultations and customer requirement assessments.

ICICI Bank, Anand
Deputy Manager – Relationship Manager
Feb 2021 – Apr 2021
• Managed corporate and retail client banking portfolios, financial compliance, and account servicing.

EDUCATION
B.Tech in Computer Science | Rajiv Gandhi Proudyogiki Vishwavidyalaya | 2020

SKILLS
Supply Chain, ERP, SAP, Project Management, Process Improvement, Excel, Power BI, Data Analysis, Tableau, Reporting
`;

test('Scenario 1: Full Candidate Chronology Extraction & Grounding (All 7 authentic roles)', () => {
  const records = parseStructuralEmploymentHistory(CANDIDATE_RESUME_TEXT);

  assert.equal(records.length, 7, 'Must extract exactly 7 authentic employers without dropping or hallucinating jobs');

  // 1. TCS
  assert.ok(records[0].company.includes('Tata Consultancy Services'));
  assert.ok(records[0].job_title.includes('Senior Process Associate'));
  assert.ok(records[0].job_title.includes('Supply Chain Operations'));
  assert.equal(records[0].is_current, true);
  assert.equal(records[0].start_date, '2024-09');
  assert.equal(records[0].end_date, null);
  assert.ok(records[0].description.length >= 2, 'Must retain responsibility bullets');

  // 2. ESP Softtech
  assert.ok(records[1].company.includes('ESP Softtech'));
  assert.equal(records[1].job_title, 'Associate Project Manager');
  assert.equal(records[1].is_current, false);
  assert.equal(records[1].start_date, '2023-09');
  assert.equal(records[1].end_date, '2024-08');

  // 3. SynergyTop
  assert.ok(records[2].company.includes('SynergyTop'));
  assert.equal(records[2].job_title, 'Associate Project Manager');
  assert.equal(records[2].start_date, '2023-02');
  assert.equal(records[2].end_date, '2023-07');

  // 4. Accenture
  assert.ok(records[3].company.includes('Accenture'));
  assert.equal(records[3].job_title, 'Business & Technology Delivery Associate');
  assert.equal(records[3].start_date, '2021-12');
  assert.equal(records[3].end_date, '2023-02');

  // 5. Teleperformance
  assert.ok(records[4].company.includes('Teleperformance'));
  assert.equal(records[4].job_title, 'Customer Service Associate');
  assert.equal(records[4].start_date, '2021-09');
  assert.equal(records[4].end_date, '2021-11');

  // 6. Toppr Technologies
  assert.ok(records[5].company.includes('Toppr'));
  assert.equal(records[5].job_title, 'Business Development Associate');
  assert.equal(records[5].start_date, '2021-07');

  // 7. ICICI Bank
  assert.ok(records[6].company.includes('ICICI Bank'));
  assert.ok(records[6].job_title.includes('Relationship Manager') || records[6].job_title.includes('Deputy Manager'));
  assert.equal(records[6].start_date, '2021-02');
  assert.equal(records[6].end_date, '2021-04');
});

test('Scenario 2: Date Corruption Immunity — Distinct employment dates for different companies', () => {
  const records = parseStructuralEmploymentHistory(CANDIDATE_RESUME_TEXT);
  const periods = records.map((r) => formatExperiencePeriod(r.start_date, r.end_date, r.is_current));

  // Verify no duplicate periods across distinct companies
  const uniquePeriods = new Set(periods);
  assert.equal(uniquePeriods.size, records.length, 'Every employment record must have distinct, authentic dates');

  // Verify none have "2022 – Present"
  for (const p of periods) {
    assert.notEqual(p, '2022 – Present', 'No record may receive hallucinated 2022 – Present dates');
    assert.notEqual(p, '2022 - Present', 'No record may receive hallucinated 2022 - Present dates');
  }
});

test('Scenario 3: Zero Bullet Fragments As Jobs — Sentence continuations rejected', () => {
  const wrappedFragmentResume = `
Tata Consultancy Services (TCS), Indore | 2024
Present
Senior Process Associate – Supply Chain Operations
to-end VIM implementation for a European grocery chain.
• Carried out the end
checking services for a Canadian energy technology company.
• Provided analytical reporting and invoice
discrepancies in a fast
paced environment.
`;

  const parsed = parseStructuralEmploymentHistory(wrappedFragmentResume);

  // Assert fragments never became separate records
  assert.equal(
    parsed.some((r) => /to-end VIM|checking services|discrepancies|paced environment/i.test(r.company)),
    false,
    'Fragment sentences must never become employer records'
  );
  assert.equal(
    parsed.some((r) => /to-end VIM|checking services|discrepancies|paced environment/i.test(r.job_title)),
    false,
    'Fragment sentences must never become job titles'
  );
  assert.equal(
    parsed.some((r) => r.company === 'Present' || r.job_title === 'Present'),
    false,
    'Keyword Present must never become a company or title'
  );
  assert.equal(
    parsed.some((r) => /^\d{4}$/.test(r.company) || /^\d{4}$/.test(r.job_title)),
    false,
    'Standalone year must never become a company or title'
  );
});

test('Scenario 4: Role and Domain Disambiguation', () => {
  // Test split on "Senior Process Associate – Supply Chain Operations"
  const tokens = parseStructuralEmploymentHistory(`
Tata Consultancy Services (TCS), Indore
Senior Process Associate – Supply Chain Operations
Sep 2024 – Present
  `);

  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].company, 'Tata Consultancy Services (TCS)');
  assert.ok(tokens[0].job_title.includes('Senior Process Associate'));
  assert.ok(tokens[0].job_title.includes('Supply Chain Operations'));
  assert.notEqual(tokens[0].company, 'Senior Process Associate');
  assert.notEqual(tokens[0].job_title, 'Tata Consultancy Services (TCS)');
});

test('Scenario 5: Post-AI Hallucination Stripping & Grounding', () => {
  const sourceText = `
Accenture Solutions Pvt. Ltd., Indore
Business & Technology Delivery Associate
Dec 2021 – Feb 2023
• Delivered SAP ERP support.
  `;

  // Simulated AI output that hallucinated 2022-Present for Accenture
  const badAiOutput = [
    {
      company: 'Accenture Solutions Pvt. Ltd.',
      role: 'Business & Technology Delivery Associate',
      startDate: '2022',
      endDate: 'Present',
      current: true,
      responsibilities: ['Delivered SAP ERP support.', ''],
      sourceEvidence: ['Accenture Solutions Pvt. Ltd., Indore\nDec 2021 – Feb 2023'],
    },
    {
      company: 'discrepancies in a fast',
      role: 'paced environment.',
      startDate: '2022',
      endDate: 'Present',
      current: true,
      responsibilities: [''],
    },
  ];

  const repaired = normalizeAndValidateAiExperiences(badAiOutput, sourceText);

  // Fragment record must be purged
  assert.equal(repaired.experiences.length, 1);
  assert.equal(repaired.experiences[0].company, 'Accenture Solutions Pvt. Ltd.');
  // Present flag must be stripped because source text has Dec 2021 – Feb 2023 without Present
  assert.equal(repaired.experiences[0].current, false);
});

test('Scenario 6: formatExperiencePeriod Helper Reliability', () => {
  assert.equal(formatExperiencePeriod('Sep 2024', null, true), 'Sep 2024 – Present');
  assert.equal(formatExperiencePeriod('Sep 2023', 'Aug 2024', false), 'Sep 2023 – Aug 2024');
  assert.equal(formatExperiencePeriod('Jul 2021', null, false), 'Jul 2021');
  assert.equal(formatExperiencePeriod(null, null, true), 'Present');
  assert.equal(formatExperiencePeriod(null, null, false), '');
  assert.equal(formatExperiencePeriod('', '', false), '');
});

test('Scenario 7: Zero Empty Bullets in Tailoring Engine & DOCX', async () => {
  const sampleProfile: UserProfile = {
    id: 'cand_ayush',
    fullName: 'Ayush Prakash',
    email: 'ayush@example.com',
    phone: '+91 9876543210',
    location: 'Indore, India',
    currentTitle: 'Senior Process Associate – Supply Chain Operations',
    currentEmployer: 'Tata Consultancy Services',
    totalExperienceYears: 4,
    professionalSummary: 'Supply chain specialist with ERP expertise.',
    education: [{ id: 'edu_1', degree: 'B.Tech', institution: 'RGPV', fieldOfStudy: 'CS', graduationYear: '2020' }],
    certifications: [],
    skills: [
      { name: 'Supply Chain', category: 'general', proficiency: 'expert', yearsExperience: 4, verified: true },
      { name: 'SAP', category: 'general', proficiency: 'proficient', yearsExperience: 3, verified: true },
    ],
    experiences: [
      {
        id: 'exp_tcs',
        company: 'Tata Consultancy Services',
        role: 'Senior Process Associate – Supply Chain Operations',
        startDate: 'Sep 2024',
        endDate: 'Present',
        current: true,
        location: 'Indore',
        description: 'VIM implementation for grocery chain.',
        achievements: ['VIM implementation for grocery chain.', ''], // contains empty string
        responsibilities: ['VIM implementation for grocery chain.'],
      },
      {
        id: 'exp_esp',
        company: 'ESP Softtech Pvt. Ltd.',
        role: 'Associate Project Manager',
        startDate: 'Sep 2023',
        endDate: 'Aug 2024',
        current: false,
        location: 'Indore',
        description: '', // empty description
        achievements: [],
        responsibilities: [],
      },
    ],
  };

  const tailoring = await resumeEngine.tailorResume(
    sampleProfile,
    'Head of Supply Chain (m/f/d)',
    'Yepoda',
    'Oversee international logistics and ERP inventory reconciliation.'
  );

  const experiences = tailoring.tailoredResume.tailoredExperiences || [];
  assert.equal(experiences.length, 2);

  // TCS record
  assert.equal(experiences[0].company, 'Tata Consultancy Services');
  assert.equal(experiences[0].period, 'Sep 2024 – Present');
  assert.ok(experiences[0].bulletPoints.every((b) => b.trim().length > 0), 'No empty bullet strings in TCS record');

  // ESP Softtech record
  assert.equal(experiences[1].company, 'ESP Softtech Pvt. Ltd.');
  assert.equal(experiences[1].period, 'Sep 2023 – Aug 2024');
  assert.ok(experiences[1].bulletPoints.every((b) => b.trim().length > 0), 'No empty bullet strings in ESP record');

  // Generate DOCX buffer and verify it builds without throwing
  const docBuffer = await resumeEngine.generateDocx(sampleProfile, tailoring.tailoredResume);
  assert.ok(docBuffer instanceof Buffer);
  assert.ok(docBuffer.length > 1000, 'Valid DOCX buffer generated');

  // Worker engine parity check
  const workerTailoring = await workerResumeEngine.tailorResume(
    sampleProfile,
    'Head of Supply Chain (m/f/d)',
    'Yepoda',
    'Oversee international logistics.'
  );
  const workerExps = workerTailoring.tailoredResume.tailoredExperiences || [];
  assert.equal(workerExps[0].period, 'Sep 2024 – Present');
  assert.equal(workerExps[1].period, 'Sep 2023 – Aug 2024');

  const workerDocBuffer = await workerResumeEngine.generateDocx(sampleProfile, workerTailoring.tailoredResume);
  assert.ok(workerDocBuffer instanceof Buffer);
  assert.ok(workerDocBuffer.length > 1000);
});

test('Scenario 8: Candidate Fact Registry Duration Integrity', () => {
  const profile: UserProfile = {
    id: 'cand_facts',
    fullName: 'Ayush Prakash',
    email: 'ayush@example.com',
    phone: '+91 9876543210',
    location: 'Indore, India',
    currentTitle: 'Senior Process Associate',
    currentEmployer: 'Tata Consultancy Services',
    totalExperienceYears: 4,
    professionalSummary: '',
    education: [],
    certifications: [],
    skills: [],
    experiences: [
      {
        id: 'exp_tcs',
        company: 'Tata Consultancy Services',
        role: 'Senior Process Associate',
        startDate: '2024-09',
        endDate: undefined,
        current: true,
      },
      {
        id: 'exp_acc',
        company: 'Accenture Solutions Pvt. Ltd.',
        role: 'Business & Technology Delivery Associate',
        startDate: '2021-12',
        endDate: '2023-02',
        current: false,
      },
      {
        id: 'exp_toppr',
        company: 'Toppr Technologies',
        role: 'Business Development Associate',
        startDate: '2021-07',
        endDate: undefined,
        current: false,
      },
    ],
  };

  const facts = buildFactsFromProfile(profile);
  const durFacts = facts.filter((f) => f.category === 'EMPLOYMENT' && f.field === 'duration');

  assert.equal(durFacts.length, 3);
  assert.equal(durFacts[0].value, '2024-09 – Present');
  assert.equal(durFacts[1].value, '2021-12 – 2023-02');
  // Past role without end date must NOT default to Present
  assert.equal(durFacts[2].value, '2021-07');
  assert.notEqual(durFacts[2].value, '2021-07 – Present');
});

test('Scenario 9: Truthfulness Audit Rejection of Fabricated Dates or Employers', () => {
  const profile: UserProfile = {
    id: 'audit_profile',
    fullName: 'Ayush Prakash',
    email: 'ayush@example.com',
    phone: '',
    location: 'Indore',
    currentTitle: 'Senior Process Associate',
    currentEmployer: 'Tata Consultancy Services',
    totalExperienceYears: 3,
    professionalSummary: '',
    education: [],
    certifications: [],
    skills: [{ name: 'Supply Chain', category: 'general', proficiency: 'expert', yearsExperience: 3, verified: true }],
    experiences: [
      {
        id: 'exp_1',
        company: 'Tata Consultancy Services',
        role: 'Senior Process Associate',
        startDate: '2024-09',
        endDate: undefined,
        current: true,
      },
    ],
  };

  const facts = buildFactsFromProfile(profile);

  // Grounded resume
  const groundedResume: TailoredResumeContent = {
    headline: 'Senior Process Associate',
    professionalSummary: 'Proven record at Tata Consultancy Services in Supply Chain.',
    targetedSkills: ['Supply Chain'],
    tailoredExperiences: [
      {
        company: 'Tata Consultancy Services',
        role: 'Senior Process Associate',
        period: '2024-09 – Present',
        bulletPoints: ['Managed supply chain operations.'],
      },
    ],
  };
  const auditGrounded = auditTailoredResume(groundedResume, facts);
  assert.equal(auditGrounded.passed, true);
  assert.equal(auditGrounded.score, 100);

  // Hallucinated resume with fake employer (e.g. Cloudflare)
  const fakeResume: TailoredResumeContent = {
    headline: 'Senior Process Associate',
    professionalSummary: 'Worked at Cloudflare delivering edge solutions.',
    targetedSkills: ['Supply Chain'],
    tailoredExperiences: [],
  };
  const auditFake = auditTailoredResume(fakeResume, facts);
  assert.equal(auditFake.passed, false);
  assert.ok(auditFake.unsupportedClaims.some((c) => c.type === 'UNVERIFIED_EMPLOYER'));
});
