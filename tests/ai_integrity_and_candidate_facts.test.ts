// tests/ai_integrity_and_candidate_facts.test.ts
// Verification of AI Integrity, Candidate Fact Registry, Evidence-Based Matching, and Non-Fabrication Standards

import test from 'node:test';
import assert from 'node:assert/strict';
import { UserProfile, JobVacancy, CandidateFact, TailoredResumeContent } from '../src/types/index.ts';
import { calculateJobMatch } from '../src/utils/rules.ts';
import {
  buildFactsFromProfile,
  getVerifiedFacts,
  validateClaimAgainstFacts,
  auditTailoredResume,
  syncProfileWithFacts
} from '../src/utils/candidateFactRegistry.ts';
import { copilotTools, generateCopilotResponse } from '../src/utils/copilotEngine.ts';
import { evaluateMatch } from '../worker/matchingEngine.ts';

// Sample Staff Distributed Systems Engineer Job Vacancy
const STRIPE_STAFF_JOB = {
  id: 'vac_stripe_staff_dist',
  source: 'remotive',
  title: 'Staff Distributed Systems Engineer',
  company: 'Stripe',
  location: 'United States & Canada (Remote)',
  country: 'United States',
  workArrangement: 'remote',
  employmentType: 'full-time',
  salaryRange: { raw: '$240,000 – $295,000 / year' } as any,
  sourceUrl: 'https://stripe.com/jobs/staff-dist',
  postedDate: '2026-03-01',
  description: 'Architect low-latency distributed systems, scale Raft consensus protocols, maintain edge services, and collaborate on mission-critical financial infrastructure.',
  requiredSkills: ['Go', 'Raft Consensus', 'Distributed Systems', 'Edge Computing', 'eBPF Monitoring'],
  preferredSkills: ['Multi-Region Failover', 'TypeScript', 'Rust'],
  mandatoryRequirements: ['Go', 'Raft Consensus', 'Distributed Systems'],
  preferredRequirements: ['eBPF Monitoring', 'Multi-Region Failover', 'TypeScript']
} as unknown as JobVacancy;

// Candidate profile based on user's actual background (Supply Chain / Operations / Product)
const REAL_CANDIDATE_PROFILE = {
  fullName: 'Ayush Prakash',
  currentTitle: 'Senior Process Associate',
  email: 'ayush@applyvise.ai',
  location: 'Indore, India',
  summary: 'Operations and process management specialist with hands-on experience in enterprise supply chain and digital workflows.',
  skills: [
    { name: 'Supply Chain Operations', category: 'Operations', level: 'advanced' },
    { name: 'Process Optimization', category: 'Operations', level: 'advanced' },
    { name: 'Product Management', category: 'Product', level: 'intermediate' }
  ],
  employmentHistory: [
    {
      company: 'Tata Consultancy Services (TCS)',
      role: 'Senior Process Associate',
      duration: '2022 – Present',
      achievements: ['Streamlined client operations and maintained 99.8% process accuracy.']
    }
  ]
} as unknown as UserProfile;

test('Scenario 1: Empty profile evaluated against job returns insufficientData === true with 0 matchScore', () => {
  const emptyProfile = {
    id: 'empty_user',
    fullName: 'New User',
    email: 'newuser@example.com',
    phone: '',
    location: '',
    totalExperienceYears: 0,
    currentTitle: '',
    skills: [],
    employmentHistory: [],
    education: [],
    certifications: [],
    experiences: [],
  } as unknown as UserProfile;

  const evalResult = calculateJobMatch(STRIPE_STAFF_JOB, emptyProfile, []);
  assert.equal(evalResult.insufficientData, true);
  assert.equal(evalResult.matchScore, 0);
  assert.equal(evalResult.fitVerdict, 'weak');
  assert.ok(evalResult.scoreMessage?.includes('Insufficient verified profile information'));
  assert.equal((evalResult.matchedCompetencies || []).length, 0);
});

test('Scenario 2: Non-technical candidate evaluated against Staff Distributed Systems Engineer cannot receive 88% match', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const evalResult = calculateJobMatch(STRIPE_STAFF_JOB, REAL_CANDIDATE_PROFILE, facts);

  // Score must be capped by disciplinary/seniority gap, strictly <= 15%
  assert.ok(evalResult.matchScore <= 15, `Expected matchScore <= 15%, got ${evalResult.matchScore}%`);
  assert.notEqual(evalResult.matchScore, 88, 'Match score must NEVER be 88% for an unaligned candidate');
  assert.equal(evalResult.fitVerdict, 'weak');
  assert.ok((evalResult.missingMandatory?.length || 0) >= 2, 'Must flag missing mandatory skills');
});

test('Scenario 3: Worker evaluateMatch engine enforces disciplinary gap capping', async () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const result = await evaluateMatch(STRIPE_STAFF_JOB, REAL_CANDIDATE_PROFILE, facts);

  assert.ok(result.overallScore <= 15, `Expected worker match score <= 15%, got ${result.overallScore}%`);
  assert.notEqual(result.overallScore, 88);
  assert.ok((result.missingSkills?.length || 0) > 0);
  assert.ok(result.profileEvidence?.some(e => e.status === 'NOT_FOUND'));
});

test('Scenario 4: Fact extraction generates valid CandidateFact records', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  assert.ok(facts.length >= 4);

  const empFact = facts.find(f => f.category === 'EMPLOYMENT' && f.value.includes('Tata Consultancy Services'));
  assert.ok(empFact, 'Should extract TCS employment fact');
  assert.equal(empFact?.verificationStatus, 'EXTRACTED');

  const skillFact = facts.find(f => f.category === 'SKILL' && f.value === 'Supply Chain Operations');
  assert.ok(skillFact, 'Should extract Supply Chain skill fact');
});

test('Scenario 5: User verification updates status to USER_CONFIRMED', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const skillFact = facts.find(f => f.category === 'SKILL');
  assert.ok(skillFact);

  skillFact.verificationStatus = 'USER_CONFIRMED';
  const verified = getVerifiedFacts(facts);
  assert.ok(verified.some(f => f.id === skillFact.id && f.verificationStatus === 'USER_CONFIRMED'));
});

test('Scenario 6: User correction updates status to USER_CORRECTED', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const titleFact = facts.find(f => f.category === 'TITLE');
  assert.ok(titleFact);

  titleFact.value = 'Operations Lead';
  titleFact.verificationStatus = 'USER_CORRECTED';

  const updatedProfile = syncProfileWithFacts(REAL_CANDIDATE_PROFILE, facts);
  assert.equal(updatedProfile.currentTitle, 'Operations Lead');
});

test('Scenario 7: Mandatory and preferred requirements are strictly partitioned', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const evalResult = calculateJobMatch(STRIPE_STAFF_JOB, REAL_CANDIDATE_PROFILE, facts);

  assert.ok(evalResult.missingMandatory?.includes('Go'));
  assert.ok(evalResult.missingMandatory?.includes('Raft Consensus'));
  assert.ok(evalResult.missingPreferred?.includes('TypeScript') || evalResult.missingPreferred?.includes('eBPF Monitoring'));
});

test('Scenario 8: Profile evidence items are generated with traceable attribution', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const evalResult = calculateJobMatch(STRIPE_STAFF_JOB, REAL_CANDIDATE_PROFILE, facts);

  assert.ok((evalResult.profileEvidence?.length || 0) > 0);
  const goReq = evalResult.profileEvidence?.find(e => e.requirement === 'Go');
  assert.ok(goReq);
  assert.equal(goReq.status, 'NOT_FOUND');
  assert.equal(goReq.source, 'Not found in your verified profile');
});

test('Scenario 9: Audit passes only when 0 missing requirements and facts exist', () => {
  // Construct a perfectly matching verified candidate
  const qualifiedCandidate = {
    fullName: 'Distributed Systems Specialist',
    totalExperienceYears: 9,
    education: [{ institution: 'MIT', degree: 'B.S. in Computer Science', graduationYear: '2016' }],
    currentTitle: 'Staff Distributed Systems Engineer',
    email: 'specialist@example.com',
    skills: [
      { name: 'Go', category: 'Backend' },
      { name: 'Raft Consensus', category: 'Distributed Systems' },
      { name: 'Distributed Systems', category: 'Architecture' },
      { name: 'Edge Computing', category: 'Cloud' },
      { name: 'eBPF Monitoring', category: 'Systems' },
      { name: 'Multi-Region Failover', category: 'Infrastructure' },
      { name: 'TypeScript', category: 'Languages' },
      { name: 'Rust', category: 'Languages' }
    ],
    employmentHistory: [
      {
        company: 'Distributed Edge Corp',
        role: 'Staff Infrastructure Engineer',
        duration: '2020 – Present',
        achievements: ['Designed low latency distributed consensus clusters.']
      }
    ]
  } as unknown as UserProfile;

  const facts = buildFactsFromProfile(qualifiedCandidate);
  const evalResult = calculateJobMatch(STRIPE_STAFF_JOB, qualifiedCandidate, facts);

  assert.equal((evalResult.missingMandatory?.length || 0), 0);
  assert.equal((evalResult.missingPreferred?.length || 0), 0);
  assert.ok(evalResult.matchScore >= 80);
});

test('Scenario 10: Tailored resume audit rejects unverified employer claims (e.g. Cloudflare)', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);

  const fabricatedResume: TailoredResumeContent = {
    summary: 'Cloudflare Senior Infrastructure Engineer with 38% latency improvement.',
    targetedSkills: ['Go', 'Rust', 'Raft consensus'],
    tailoredBullets: [
      'Architected low-latency distributed edge synchronization services in Go at Cloudflare.'
    ]
  };

  const audit = auditTailoredResume(fabricatedResume, facts);
  assert.equal(audit.isValid, false);
  assert.ok(audit.unsupportedClaims.some(c => c.type === 'UNVERIFIED_EMPLOYER'));
  assert.ok(audit.unsupportedClaims.some(c => c.type === 'UNSUPPORTED_METRIC'));
});

test('Scenario 11: Tailored resume audit passes for grounded resume content', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);

  const groundedResume: TailoredResumeContent = {
    summary: 'Senior Process Associate with documented expertise in enterprise supply chain operations at Tata Consultancy Services (TCS).',
    targetedSkills: ['Supply Chain Operations', 'Process Optimization'],
    tailoredBullets: [
      'Managed end-to-end supply chain processes maintaining high SLA compliance at Tata Consultancy Services (TCS).'
    ]
  };

  const audit = auditTailoredResume(groundedResume, facts);
  assert.equal(audit.isValid, true);
  assert.equal(audit.unsupportedClaims.length, 0);
});

test('Scenario 12: Claim validation rejects unsupported percentage metrics', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);

  const claimResult = validateClaimAgainstFacts('Reduced tail latency by 38% across edge clusters', facts);
  assert.equal(claimResult.supported, false);
  assert.ok(claimResult.reason.includes('Unsupported percentage metric'));
});

test('Scenario 13: Copilot tool getVerifiedSkills returns only candidate verified skills', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const skills = copilotTools.getVerifiedSkills(REAL_CANDIDATE_PROFILE, facts);

  assert.equal(skills.length, 3);
  assert.ok(skills.some(s => s.name === 'Supply Chain Operations'));
  assert.ok(!skills.some(s => s.name === 'Go'));
  assert.ok(!skills.some(s => s.name === 'Rust'));
});

test('Scenario 14: Copilot tool getVerifiedEmploymentHistory returns real employers, never Cloudflare', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const history = copilotTools.getVerifiedEmploymentHistory(REAL_CANDIDATE_PROFILE, facts);

  assert.equal(history.length, 1);
  assert.equal(history[0].company, 'Tata Consultancy Services (TCS)');
  assert.ok(!history.some(h => h.company.toLowerCase().includes('cloudflare')));
});

test('Scenario 15: Copilot responds honestly when asked about unverified skill', async () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const reply = await generateCopilotResponse({
    message: 'Do I have experience with eBPF monitoring?',
    user: { id: 'u1', fullName: 'Ayush Prakash', email: 'ayush@applyvise.ai' },
    profile: REAL_CANDIDATE_PROFILE,
    facts
  });

  assert.ok(reply.includes("I don't have that information in your verified profile"));
});

test('Scenario 16: Copilot provides honest assessment for Staff Engineer role without score inflation', async () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const reply = await generateCopilotResponse({
    message: 'Do I qualify for the Stripe Staff Distributed Systems Engineer job?',
    user: { id: 'u1', fullName: 'Ayush Prakash', email: 'ayush@applyvise.ai' },
    profile: REAL_CANDIDATE_PROFILE,
    facts,
    job: STRIPE_STAFF_JOB
  });

  assert.ok(!reply.includes('88% Alignment'));
  assert.ok(reply.includes('Gaps Identified in Your Verified Profile'));
  assert.ok(reply.includes('Go'));
  assert.ok(reply.includes('ApplyVise AI adheres to a strict zero-fabrication standard'));
});

test('Scenario 17: No demo profile or hardcoded fallback applied when profile is empty', () => {
  const facts = buildFactsFromProfile(null);
  assert.equal(facts.length, 0);

  const evalResult = calculateJobMatch(STRIPE_STAFF_JOB, null, []);
  assert.equal(evalResult.insufficientData, true);
  assert.equal(evalResult.matchScore, 0);
});

test('Scenario 18: ATS Resume preview data extraction never hallucinates contact or titles', () => {
  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const emailFact = facts.find(f => f.category === 'EMAIL');
  assert.equal(emailFact?.value, 'ayush@applyvise.ai');
  assert.notEqual(emailFact?.value, 'ayush@example.com');

  const locFact = facts.find(f => f.category === 'LOCATION');
  assert.equal(locFact?.value, 'Indore, India');
  assert.notEqual(locFact?.value, 'San Francisco, CA');
});

test('Scenario 19: REGRESSION TEST FOR REPORTED SCREENSHOT DEFECTS', () => {
  // Proves that candidate Ayush Prakash evaluated against Stripe Staff Distributed Systems Engineer
  // can NEVER reproduce the fabricated details from the user screenshots:
  // 1. Cloudflare employment history (2021–2024)
  // 2. Senior Infrastructure Engineer designation
  // 3. 38% tail-latency improvement
  // 4. Go, Rust and Raft consensus expertise
  // 5. San Francisco location
  // 6. ayush@example.com email address
  // 7. Lead Product & Systems Architect designation
  // 8. 88% alignment

  const facts = buildFactsFromProfile(REAL_CANDIDATE_PROFILE);
  const evalResult = calculateJobMatch(STRIPE_STAFF_JOB, REAL_CANDIDATE_PROFILE, facts);

  // 1. Match score cannot be 88%
  assert.notEqual(evalResult.matchScore, 88);
  assert.ok(evalResult.matchScore <= 15);

  // 2. Cloudflare cannot be in candidate facts
  assert.ok(!facts.some(f => f.value.toLowerCase().includes('cloudflare')));

  // 3. 38% latency cannot be substantiated
  const latencyCheck = validateClaimAgainstFacts('Reduced tail latency by 38% across edge clusters', facts);
  assert.equal(latencyCheck.supported, false);

  // 4. Go and Raft consensus must be flagged as missing
  assert.ok(evalResult.missingMandatory?.includes('Go'));
  assert.ok(evalResult.missingMandatory?.includes('Raft Consensus'));

  // 5. Location must not be San Francisco, CA
  const locFact = facts.find(f => f.category === 'LOCATION');
  assert.notEqual(locFact?.value, 'San Francisco, CA');

  // 6. Email must not be ayush@example.com
  const emailFact = facts.find(f => f.category === 'EMAIL');
  assert.notEqual(emailFact?.value, 'ayush@example.com');

  // 7. Title must not be Senior Infrastructure Engineer
  const titleFact = facts.find(f => f.category === 'TITLE');
  assert.notEqual(titleFact?.value, 'Senior Infrastructure Engineer');

  // 8. Fabricated resume bullets must be rejected
  const fakeResume: TailoredResumeContent = {
    summary: 'Cloudflare Senior Infrastructure Engineer',
    tailoredBullets: [
      'Architected low-latency distributed edge synchronization services in Go, cutting tail latency 38% using Raft consensus protocols.'
    ]
  };
  const audit = auditTailoredResume(fakeResume, facts);
  assert.equal(audit.isValid, false);
});
