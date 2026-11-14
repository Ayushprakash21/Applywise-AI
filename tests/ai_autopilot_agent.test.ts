import test from 'node:test';
import assert from 'node:assert/strict';
import { AutopilotEngine, AUTOPILOT_MONTHLY_LIMITS } from '../worker/autopilotEngine.ts';
import { isPermanentFreeAccessAccount } from '../src/config/freeAccess.ts';

test('Autopilot Quota Engine: Tier Limits Enforcement', () => {
  assert.equal(AUTOPILOT_MONTHLY_LIMITS.free, 2, 'Free plan must be granted exactly 2 submissions/month');
  assert.equal(AUTOPILOT_MONTHLY_LIMITS.pro, 10, 'Pro plan must be granted exactly 10 submissions/month');
  assert.equal(AUTOPILOT_MONTHLY_LIMITS.black, 20, 'BLACK ELITE plan must be granted exactly 20 submissions/month');
  assert.equal(AUTOPILOT_MONTHLY_LIMITS.founder, 999999, 'Founder privilege must be unlimited');
});

test('Autopilot Quota Engine: Founder Privilege Exclusivity & Allowlist Guard', () => {
  const normalUser = { id: 'usr_normal', email: 'candidate@example.com', isVerified: true };
  const normalEntitlement = AutopilotEngine.getEffectiveEntitlement(normalUser, 'free');
  assert.equal(normalEntitlement.monthlyLimit, 2);
  assert.equal(normalEntitlement.unlimited, false);
  assert.equal(normalEntitlement.entitlementSource, 'plan');

  // Allowlisted founder account
  const founderUser = { id: 'usr_founder', email: 'ayushprakash0021@gmail.com', isVerified: true };
  assert.ok(isPermanentFreeAccessAccount(founderUser), 'Founder email must qualify for permanent free access allowlist');

  const founderEntitlement = AutopilotEngine.getEffectiveEntitlement(founderUser, 'free');
  assert.equal(founderEntitlement.unlimited, true, 'Founder must receive unlimited auto-apply submissions');
  assert.equal(founderEntitlement.planId, 'founder');
  assert.equal(founderEntitlement.entitlementSource, 'founder_allowlist');
});

test('Autopilot Quota Engine: Quota Calculation, Usage, and Reservation Locks', () => {
  const user = { id: 'usr_pro', email: 'pro_user@example.com', isVerified: true };
  const mockExistingRow = {
    billing_period_start: new Date(Date.now() - 86400000).toISOString(),
    billing_period_end: new Date(Date.now() + 86400000 * 20).toISOString(),
    usage_count: 4,
    reserved_count: 2,
  };

  const entitlement = AutopilotEngine.getEffectiveEntitlement(user, 'pro', mockExistingRow);
  assert.equal(entitlement.monthlyLimit, 10);
  assert.equal(entitlement.usageCount, 4);
  assert.equal(entitlement.reservedCount, 2);
  assert.equal(entitlement.remainingCount, 4, 'Remaining count must equal monthlyLimit (10) - usage (4) - reserved (2) = 4');
});

test('Autopilot Agent 3: Job Eligibility Evaluation without Hallucinations', () => {
  const profile: any = {
    fullName: 'Jane Doe',
    currentTitle: 'Senior Full Stack Engineer',
    skills: [{ name: 'TypeScript' }, { name: 'React' }, { name: 'Node.js' }],
  };

  const settings: any = {
    targetJobTitles: ['Full Stack Engineer', 'Software Engineer'],
    preferredWorkArrangement: 'all',
    minMatchScore: 70,
    excludedEmployers: ['BadCorp'],
  };

  const eligibleJob: any = {
    title: 'Senior Full Stack Engineer',
    company: 'GoodCorp',
    description: 'Looking for a Senior Full Stack Engineer proficient with TypeScript and React.',
    workArrangement: 'remote',
  };

  const result = AutopilotEngine.evaluateJobEligibility(profile, settings, eligibleJob);
  assert.ok(result.score >= 70, 'Eligible job should achieve >= 70 match score');
  assert.equal(result.eligibilityStatus, 'STRONG_MATCH');

  const excludedJob: any = {
    title: 'Lead Engineer',
    company: 'BadCorp International',
    description: 'TypeScript engineer needed',
  };

  const excludedResult = AutopilotEngine.evaluateJobEligibility(profile, settings, excludedJob);
  assert.equal(excludedResult.score, 0);
  assert.equal(excludedResult.eligibilityStatus, 'NOT_ELIGIBLE');
  assert.ok(excludedResult.missingQualifications.some(q => q.includes('exclusion list')));
});

test('Autopilot Agent 4 & 6: Resume Tailoring & Supported ATS Execution', async () => {
  const profile: any = {
    fullName: 'Alex River',
    currentTitle: 'Cloud Architect',
    skills: [{ name: 'Kubernetes' }, { name: 'AWS' }],
  };

  const tailoring = AutopilotEngine.tailorApplicationPackage(profile, 'Cloud Platform Engineer', 'Stripe');
  assert.ok(tailoring.tailoredHeadline.includes('Cloud Architect tailored for Cloud Platform Engineer'));
  assert.ok(tailoring.coverLetterSnippet.includes('Stripe'));

  // ATS adapter detection test
  const ghJob: any = {
    id: 'job_gh_1',
    jobTitle: 'Backend Engineer',
    company: 'Airbnb',
    url: 'https://boards.greenhouse.io/airbnb/jobs/12345',
  };

  const ghExec = await AutopilotEngine.executeSubmission(ghJob, profile);
  assert.equal(ghExec.success, true);
  assert.equal(ghExec.provider, 'greenhouse');
  assert.ok(ghExec.submissionReference?.startsWith('GH-SUB-'));

  // Unsupported custom portal -> requires candidate attention
  const customJob: any = {
    id: 'job_custom_1',
    jobTitle: 'Lead Engineer',
    company: 'LegacyCorp',
    url: 'https://careers.legacycorp.com/apply/multistep-form',
  };

  const customExec = await AutopilotEngine.executeSubmission(customJob, profile);
  assert.equal(customExec.success, false);
  assert.equal(customExec.requiresAttention, true);
  assert.equal(customExec.provider, 'guided_portal');
});
