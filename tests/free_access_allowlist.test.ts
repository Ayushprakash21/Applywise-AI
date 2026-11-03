import { test } from 'node:test';
import assert from 'node:assert';
import {
  PERMANENT_FREE_ACCESS_EMAILS,
  normalizeEmail,
  isPermanentFreeAccessEmail,
  isPermanentFreeAccessAccount,
  getEffectivePlan,
  checkFeatureEntitlement,
  checkAIUsageAllowance,
  FreeAccessUserIdentity
} from '../src/config/freeAccess.ts';

test('Free-Access Allowlist: Exactly two authorized accounts configured', () => {
  assert.strictEqual(PERMANENT_FREE_ACCESS_EMAILS.length, 2);
  assert(PERMANENT_FREE_ACCESS_EMAILS.includes('aksharasahu45@gmail.com'));
  assert(PERMANENT_FREE_ACCESS_EMAILS.includes('ayushprakash0021@gmail.com'));
});

test('Free-Access Allowlist: Normalization and case-insensitivity', () => {
  assert.strictEqual(normalizeEmail('  AKSHARASAHU45@GMAIL.COM  '), 'aksharasahu45@gmail.com');
  assert.strictEqual(normalizeEmail('AyushPrakash0021@GMAIL.COM'), 'ayushprakash0021@gmail.com');

  assert.strictEqual(isPermanentFreeAccessEmail('AKSHARASAHU45@GMAIL.COM'), true);
  assert.strictEqual(isPermanentFreeAccessEmail(' ayushprakash0021@gmail.com '), true);
  assert.strictEqual(isPermanentFreeAccessEmail('AksharaSahu45@Gmail.Com'), true);
});

test('Free-Access Allowlist: Both authorized accounts receive permanent free access', () => {
  const user1: FreeAccessUserIdentity = {
    id: 'user-akshara',
    email: 'aksharasahu45@gmail.com',
    fullName: 'Akshara Sahu',
    isVerified: true,
  };

  const user2: FreeAccessUserIdentity = {
    id: 'user-ayush',
    email: 'ayushprakash0021@gmail.com',
    fullName: 'Ayush Prakash',
    isVerified: true,
  };

  assert.strictEqual(isPermanentFreeAccessAccount(user1), true);
  assert.strictEqual(isPermanentFreeAccessAccount(user2), true);

  const plan1 = getEffectivePlan(user1);
  assert.strictEqual(plan1.planId, 'black');
  assert.strictEqual(plan1.isPermanentFreeAccess, true);
  assert.strictEqual(plan1.badge, 'BLACK ELITE');
  assert.strictEqual(plan1.billingInterval, 'permanent');

  const plan2 = getEffectivePlan(user2);
  assert.strictEqual(plan2.planId, 'black');
  assert.strictEqual(plan2.isPermanentFreeAccess, true);
  assert.strictEqual(plan2.badge, 'BLACK ELITE');
});

test('Free-Access Allowlist: Unverified accounts do not receive the exception when verification status is required', () => {
  const unverifiedUser: FreeAccessUserIdentity = {
    id: 'user-unverified',
    email: 'ayushprakash0021@gmail.com',
    fullName: 'Unverified Identity',
    isVerified: false, // Explicitly unverified
  };

  assert.strictEqual(isPermanentFreeAccessAccount(unverifiedUser), false);

  const plan = getEffectivePlan(unverifiedUser);
  assert.strictEqual(plan.planId, 'free');
  assert.strictEqual(plan.isPermanentFreeAccess, false);
});

test('Free-Access Allowlist: Unrelated accounts do not receive the exception and follow normal free plan rules', () => {
  const regularUser: FreeAccessUserIdentity = {
    id: 'user-standard',
    email: 'regular_candidate@example.com',
    fullName: 'Regular Candidate',
    isVerified: true,
  };

  assert.strictEqual(isPermanentFreeAccessAccount(regularUser), false);

  const plan = getEffectivePlan(regularUser);
  assert.strictEqual(plan.planId, 'free');
  assert.strictEqual(plan.isPermanentFreeAccess, false);
  assert.strictEqual(plan.aiQuotaMonthly, 10);
  assert.strictEqual(plan.maxDailyApplications, 5);
});

test('Free-Access Allowlist: Feature entitlement bypass for authorized accounts vs standard users', () => {
  const authorizedUser: FreeAccessUserIdentity = {
    id: 'user-1',
    email: 'aksharasahu45@gmail.com',
    isVerified: true,
  };

  const standardUser: FreeAccessUserIdentity = {
    id: 'user-2',
    email: 'someone_else@example.com',
    isVerified: true,
  };

  // Pro-gated features
  assert.strictEqual(checkFeatureEntitlement(authorizedUser, 'ats_tailoring'), true);
  assert.strictEqual(checkFeatureEntitlement(authorizedUser, 'interview_prep'), true);
  assert.strictEqual(checkFeatureEntitlement(authorizedUser, 'gap_analysis'), true);
  assert.strictEqual(checkFeatureEntitlement(authorizedUser, 'auto_apply'), true);

  // Standard user on free plan is denied pro-gated features
  assert.strictEqual(checkFeatureEntitlement(standardUser, 'ats_tailoring'), false);
  assert.strictEqual(checkFeatureEntitlement(standardUser, 'interview_prep'), false);

  // Standard user gets basic features
  assert.strictEqual(checkFeatureEntitlement(standardUser, 'job_search'), true);
  assert.strictEqual(checkFeatureEntitlement(standardUser, 'application_tracking'), true);
});

test('Free-Access Allowlist: AI Usage Allowance bypasses normal quota with runaway loop safeguards', () => {
  const authorizedUser: FreeAccessUserIdentity = {
    id: 'user-1',
    email: 'ayushprakash0021@gmail.com',
    isVerified: true,
  };

  const standardUser: FreeAccessUserIdentity = {
    id: 'user-2',
    email: 'standard_candidate@example.com',
    isVerified: true,
  };

  // Standard user capped at 10 requests
  const stdAt5 = checkAIUsageAllowance(standardUser, 5);
  assert.strictEqual(stdAt5.allowed, true);
  assert.strictEqual(stdAt5.remaining, 5);

  const stdAt10 = checkAIUsageAllowance(standardUser, 10);
  assert.strictEqual(stdAt10.allowed, false);
  assert.strictEqual(stdAt10.remaining, 0);

  // Authorized user has permanent unrestricted allowance (surpasses 10, 50, 300)
  const authAt50 = checkAIUsageAllowance(authorizedUser, 50);
  assert.strictEqual(authAt50.allowed, true);
  assert.strictEqual(authAt50.isUnlimited, true);
  assert.strictEqual(authAt50.isPermanentFreeAccess, true);

  const authAt350 = checkAIUsageAllowance(authorizedUser, 350);
  assert.strictEqual(authAt350.allowed, true);
  assert.strictEqual(authAt350.isUnlimited, true);

  // Runaway loop protection engages only at operational safeguard ceiling (1,000 queries)
  const authAt1000 = checkAIUsageAllowance(authorizedUser, 1000);
  assert.strictEqual(authAt1000.allowed, false);
});

test('Free-Access Allowlist: No paid subscription or false payment is fabricated', () => {
  const user: FreeAccessUserIdentity = {
    email: 'aksharasahu45@gmail.com',
    isVerified: true,
  };

  const effective = getEffectivePlan(user);
  assert.strictEqual(effective.billingInterval, 'permanent');
  assert.strictEqual(effective.isPermanentFreeAccess, true);
  // It is represented as an internal access grant, not a Stripe/Razorpay transaction
});
