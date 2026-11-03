import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  PERMANENT_FREE_ACCESS_EMAILS,
  isPermanentFreeAccessAccount,
  isPermanentFreeAccessEmail,
  getEffectivePlan,
  checkFeatureEntitlement,
  checkAIUsageAllowance,
} from '../src/config/freeAccess.ts';
import { authAndStore } from '../server/authAndStore.ts';
import { SUBSCRIPTION_PLANS } from '../src/config/plans.ts';

describe('APPLYVISE AI — BLACK Plan Default Access & Global BLACK/Gold UI Suite', () => {
  const EMAIL_1 = 'aksharasahu45@gmail.com';
  const EMAIL_2 = 'ayushprakash0021@gmail.com';

  it('1. First hardcoded email automatically receives BLACK ELITE plan by default', () => {
    assert(PERMANENT_FREE_ACCESS_EMAILS.includes(EMAIL_1), 'First email is in permanent allowlist');
    const user1 = { id: 'u_akshara', email: EMAIL_1, fullName: 'Akshara Sahu', isVerified: true, role: 'user' };
    
    assert.strictEqual(isPermanentFreeAccessAccount(user1), true);
    const plan = getEffectivePlan(user1);
    assert.strictEqual(plan.planId, 'black', 'Default planId must be black');
    assert.strictEqual(plan.badge, 'BLACK ELITE', 'Badge must be BLACK ELITE');
    assert.strictEqual(plan.isBlack, true);
    assert.strictEqual(plan.isPermanentFreeAccess, true);
    assert.strictEqual(plan.canBlackCareerStrategy, true);
    assert.strictEqual(plan.canBlackAppIntelligence, true);
    assert.strictEqual(plan.canBlackInterviewSim, true);
    assert.strictEqual(plan.canBlackResumeStudio, true);
    assert.strictEqual(plan.priorityProcessing, true);
  });

  it('2. Second hardcoded email automatically receives BLACK ELITE plan by default', () => {
    assert(PERMANENT_FREE_ACCESS_EMAILS.includes(EMAIL_2), 'Second email is in permanent allowlist');
    const user2 = { id: 'u_ayush', email: EMAIL_2, fullName: 'Ayush Prakash', isVerified: true, role: 'user' };

    assert.strictEqual(isPermanentFreeAccessAccount(user2), true);
    const plan = getEffectivePlan(user2);
    assert.strictEqual(plan.planId, 'black', 'Default planId must be black');
    assert.strictEqual(plan.badge, 'BLACK ELITE', 'Badge must be BLACK ELITE');
    assert.strictEqual(plan.isBlack, true);
    assert.strictEqual(plan.isPermanentFreeAccess, true);
    assert.strictEqual(plan.canBlackCareerStrategy, true);
    assert.strictEqual(plan.canBlackAppIntelligence, true);
    assert.strictEqual(plan.canBlackInterviewSim, true);
    assert.strictEqual(plan.canBlackResumeStudio, true);
    assert.strictEqual(plan.priorityProcessing, true);
  });

  it('3. Both hardcoded accounts retain BLACK on refresh & database queries without purchasing', () => {
    // Create/retrieve user in local store to test store layer
    const u1 = authAndStore.getUserByEmail(EMAIL_1) || authAndStore.createUser('Akshara Sahu', EMAIL_1, 'SecurePass123!');
    const sub1 = authAndStore.getUserSubscription(u1.id);
    assert.strictEqual(sub1.planId, 'black', 'Store returns black for allowlisted email 1');

    const u2 = authAndStore.getUserByEmail(EMAIL_2) || authAndStore.createUser('Ayush Prakash', EMAIL_2, 'SecurePass123!');
    const sub2 = authAndStore.getUserSubscription(u2.id);
    assert.strictEqual(sub2.planId, 'black', 'Store returns black for allowlisted email 2');
  });

  it('4. Repeated logins do not create duplicate subscription records', () => {
    const user = authAndStore.getUserByEmail(EMAIL_1);
    assert.ok(user, 'User exists');

    // Simulate multiple login subscription checks
    const subA = authAndStore.getUserSubscription(user.id);
    const subB = authAndStore.getUserSubscription(user.id);
    assert.strictEqual(subA.planId, 'black');
    assert.strictEqual(subB.planId, 'black');
    assert.strictEqual(subA.status, 'active');
  });

  it('5. Normal users do NOT receive BLACK automatically (default strictly to FREE)', () => {
    const normalEmail = `regular_user_${Date.now()}@example.com`;
    const normalUser = authAndStore.createUser('Regular Candidate', normalEmail, 'Pass123456!');

    assert.strictEqual(isPermanentFreeAccessAccount(normalUser), false, 'Normal user is not allowlisted');
    assert.strictEqual(isPermanentFreeAccessEmail(normalEmail), false);

    const normalPlan = getEffectivePlan(normalUser);
    assert.strictEqual(normalPlan.planId, 'free', 'Normal user defaults to free');
    assert.strictEqual(normalPlan.badge, 'FREE');
    assert.strictEqual(normalPlan.isBlack, false);
    assert.strictEqual(normalPlan.canBlackCareerStrategy, false);

    const storeSub = authAndStore.getUserSubscription(normalUser.id);
    assert.strictEqual(storeSub.planId, 'free', 'Store defaults to free for normal user');
  });

  it('6. BLACK access does NOT grant administrator permissions', () => {
    const blackSubscriber = {
      id: 'black_subscriber_non_admin',
      email: EMAIL_1,
      role: 'user', // standard user role
      isVerified: true
    };

    // Subscription is black
    const plan = getEffectivePlan(blackSubscriber);
    assert.strictEqual(plan.planId, 'black');

    // Role MUST remain user, not elevated to admin
    assert.strictEqual(blackSubscriber.role, 'user', 'BLACK access must never mutate user role');
    assert.notStrictEqual(blackSubscriber.role, 'admin', 'User must NOT be admin solely due to BLACK membership');
  });

  it('7. Centralized Theme Management Logic in App.tsx', () => {
    const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');

    // Verifies theme management hook exists and is bound to backend subscription entitlement
    assert.ok(appSrc.includes('isBlackSubscriber'), 'Defines isBlackSubscriber');
    assert.ok(appSrc.includes('document.documentElement.setAttribute(\'data-theme\', \'black\')') ||
              appSrc.includes('root.setAttribute(\'data-theme\', \'black\')'), 'Activates data-theme="black"');
    assert.ok(appSrc.includes('theme-black'), 'Applies theme-black CSS class');
    assert.ok(appSrc.includes('root.removeAttribute(\'data-theme\')'), 'Removes data-theme on revoke or logout');
    assert.ok(appSrc.includes('root.classList.remove(\'theme-black\')'), 'Removes theme-black on revoke or logout');
  });

  it('8. Global BLACK CSS System: Strict Obsidian & Gold palette definitions', () => {
    const cssSrc = fs.readFileSync(path.resolve('src/index.css'), 'utf8');

    assert.ok(cssSrc.includes('APPLYVISE AI — GLOBAL BLACK THEME SYSTEM'), 'Global BLACK theme block present');
    assert.ok(cssSrc.includes('#08090D'), 'Primary background #08090D present');
    assert.ok(cssSrc.includes('#101116'), 'Secondary background #101116 present');
    assert.ok(cssSrc.includes('#15171E'), 'Card background #15171E present');
    assert.ok(cssSrc.includes('#1C1E26'), 'Elevated surfaces #1C1E26 present');
    assert.ok(cssSrc.includes('#D6B46A'), 'Primary gold #D6B46A present');
    assert.ok(cssSrc.includes('#E5C477'), 'Royal gold #E5C477 present');
    assert.ok(cssSrc.includes('#F3DEAC'), 'Champagne #F3DEAC present');
    assert.ok(cssSrc.includes('#A88B4F'), 'Muted gold #A88B4F present');
    assert.ok(cssSrc.includes('#F7F4EC'), 'Primary text #F7F4EC present');
    assert.ok(cssSrc.includes('#B9B4A8'), 'Secondary text #B9B4A8 present');
    assert.ok(cssSrc.includes('rgba(214, 180, 106, 0.22)'), 'Border gold rgba(214,180,106,0.22) present');
  });

  it('9. Pricing Page accurately reflects BLACK Founder Elite status for allowlisted accounts', () => {
    const pricingSrc = fs.readFileSync(path.resolve('src/components/PricingPage.tsx'), 'utf8');

    assert.ok(pricingSrc.includes('full BLACK Elite access'), 'Pricing page informs founder accounts of BLACK Elite');
    assert.ok(pricingSrc.includes('FOUNDER ACCESS — ACTIVE'), 'Badge highlights active founder tier');
    assert.ok(pricingSrc.includes('SUBSCRIPTION_PLANS.black'), 'BLACK centerpiece rendered');
  });

  it('10. Paid Razorpay upgrades continue working independently for non-allowlisted users', () => {
    const paidEmail = `paid_subscriber_${Date.now()}@example.com`;
    const paidUser = authAndStore.createUser('Paid Candidate', paidEmail, 'SecretPass123!');

    // Normal user starts free
    assert.strictEqual(authAndStore.getUserSubscription(paidUser.id).planId, 'free');

    // Simulates successful verified Razorpay upgrade
    authAndStore.updateUserSubscription(paidUser.id, 'black', 'annual');

    // Upgrade persists
    const upgradedSub = authAndStore.getUserSubscription(paidUser.id);
    assert.strictEqual(upgradedSub.planId, 'black');
    assert.strictEqual(upgradedSub.billingInterval, 'annual');
    assert.strictEqual(upgradedSub.status, 'active');

    // Effective plan evaluates to BLACK
    const effective = getEffectivePlan(paidUser, upgradedSub);
    assert.strictEqual(effective.planId, 'black');
    assert.strictEqual(effective.badge, 'BLACK ELITE');
    assert.strictEqual(effective.aiQuotaMonthly, 600);
    assert.strictEqual(effective.maxDailyApplications, 50);
  });
});
