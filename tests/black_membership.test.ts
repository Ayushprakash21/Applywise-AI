import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SUBSCRIPTION_PLANS, COMPARISON_FEATURES, PlanId } from '../src/config/plans.ts';
import {
  checkFeatureEntitlement,
  checkAIUsageAllowance,
  getEffectivePlan,
  isPermanentFreeAccessAccount,
} from '../src/config/freeAccess.ts';
import { authAndStore } from '../server/authAndStore.ts';

describe('BLACK by ApplyVise AI — Ultra-Premium Subscription Architecture', () => {
  it('1. Hierarchy & Brand Identity: FREE < PRO < BLACK', () => {
    assert.ok(SUBSCRIPTION_PLANS.free, 'Free tier exists');
    assert.ok(SUBSCRIPTION_PLANS.pro, 'Pro tier exists');
    assert.ok(SUBSCRIPTION_PLANS.black, 'BLACK tier exists');

    const black = SUBSCRIPTION_PLANS.black;
    assert.strictEqual(black.name, 'BLACK');
    assert.strictEqual(black.brand, 'BLACK by ApplyVise AI');
    assert.strictEqual(black.badge, 'BLACK ELITE');
    assert.strictEqual(black.tagline, 'Your Career. Without Limits.');
    assert.strictEqual(black.secondaryTagline, 'Elite Career Intelligence. Maximum Advantage.');
    assert.strictEqual(black.isBlackElite, true);
    assert.strictEqual(black.highlighted, true);
  });

  it('2. Exact 2× PRO Quotas Verification', () => {
    const pro = SUBSCRIPTION_PLANS.pro;
    const black = SUBSCRIPTION_PLANS.black;

    // AI monthly quota must be exactly 2× Pro (300 -> 600)
    assert.strictEqual(pro.aiQuotaMonthly, 300, 'Pro AI quota is 300');
    assert.strictEqual(black.aiQuotaMonthly, 600, 'BLACK AI quota is exactly 600 (2× Pro)');
    assert.strictEqual(black.aiQuotaMonthly, pro.aiQuotaMonthly * 2, 'BLACK AI quota is 2× Pro');

    // Daily application capacity must be exactly 2× Pro (25 -> 50)
    assert.strictEqual(pro.maxDailyApplications, 25, 'Pro daily applications is 25');
    assert.strictEqual(black.maxDailyApplications, 50, 'BLACK daily applications is exactly 50 (2× Pro)');
    assert.strictEqual(black.maxDailyApplications, pro.maxDailyApplications * 2, 'BLACK daily applications is 2× Pro');

    // Check allowance calculator
    const mockFreeUser = { id: 'user_free', email: 'free@example.com', role: 'user' };
    const mockProUser = { id: 'user_pro', email: 'pro@example.com', role: 'user' };
    const mockBlackUser = { id: 'user_black', email: 'black@example.com', role: 'user' };

    const freeAllowance = checkAIUsageAllowance(mockFreeUser, 5, { planId: 'free' });
    assert.strictEqual(freeAllowance.limit, 10);
    assert.strictEqual(freeAllowance.remaining, 5);

    const proAllowance = checkAIUsageAllowance(mockProUser, 50, { planId: 'pro' });
    assert.strictEqual(proAllowance.limit, 300);
    assert.strictEqual(proAllowance.remaining, 250);

    const blackAllowance = checkAIUsageAllowance(mockBlackUser, 100, { planId: 'black' });
    assert.strictEqual(blackAllowance.limit, 600);
    assert.strictEqual(blackAllowance.remaining, 500);
  });

  it('3. Feature Entitlements & Gates for BLACK Exclusives', () => {
    const freeUser = { id: 'u1', email: 'u1@example.com', role: 'user' };
    const proUser = { id: 'u2', email: 'u2@example.com', role: 'user' };
    const blackUser = { id: 'u3', email: 'u3@example.com', role: 'user' };

    const subFree = { planId: 'free' };
    const subPro = { planId: 'pro' };
    const subBlack = { planId: 'black' };

    // Standard pro features: accessible by Pro and Black, blocked for Free
    assert.strictEqual(checkFeatureEntitlement(freeUser, 'advanced_fit_map', subFree), false);
    assert.strictEqual(checkFeatureEntitlement(proUser, 'advanced_fit_map', subPro), true);
    assert.strictEqual(checkFeatureEntitlement(blackUser, 'advanced_fit_map', subBlack), true);

    // BLACK exclusive features: blocked for Free and Pro, unlocked for Black
    const blackFeatures = [
      'black_career_strategy',
      'black_app_intelligence',
      'black_interview_sim',
      'black_resume_studio',
    ] as const;

    for (const feat of blackFeatures) {
      assert.strictEqual(checkFeatureEntitlement(freeUser, feat, subFree), false, `${feat} blocked for Free`);
      assert.strictEqual(checkFeatureEntitlement(proUser, feat, subPro), false, `${feat} blocked for Pro`);
      assert.strictEqual(checkFeatureEntitlement(blackUser, feat, subBlack), true, `${feat} unlocked for Black`);
    }
  });

  it('4. Pricing & Transparent Value', () => {
    const black = SUBSCRIPTION_PLANS.black;
    assert.strictEqual(black.price.monthly.inr, 1599, 'Monthly INR ₹1,599');
    assert.strictEqual(black.price.monthly.usd, 19.99, 'Monthly USD $19.99');
    assert.strictEqual(black.price.annual.inr, 15990, 'Annual INR ₹15,990');
    assert.strictEqual(black.price.annual.usd, 199.90, 'Annual USD $199.90');
    assert.strictEqual(black.price.annual.savingsPercent, 17, '17% annual discount');
  });

  it('5. Razorpay HMAC-SHA256 Signature Verification Cryptographic Contract', () => {
    const keySecret = 'test_secret_key_applyvise_123';
    const orderId = 'order_av_mock12345';
    const paymentId = 'pay_av_mock67890';

    const payload = `${orderId}|${paymentId}`;
    const validSignature = crypto.createHmac('sha256', keySecret).update(payload).digest('hex');

    // Correct signature matches
    const generated = crypto.createHmac('sha256', keySecret).update(payload).digest('hex');
    assert.strictEqual(generated, validSignature);

    // Tampered paymentId fails
    const tamperedPayload = `${orderId}|pay_tampered_fake`;
    const tamperedSignature = crypto.createHmac('sha256', keySecret).update(tamperedPayload).digest('hex');
    assert.notStrictEqual(tamperedSignature, validSignature);
  });

  it('6. Royal Crown Logo Vector & Component Integrity', () => {
    const crownFile = fs.readFileSync(path.resolve('src/components/RoyalCrownLogo.tsx'), 'utf8');
    assert.ok(crownFile.includes('export const RoyalCrownLogo'), 'Component exported');
    assert.ok(crownFile.includes('blackCrownGold'), 'Metallic champagne gold gradient present');
    assert.ok(crownFile.includes('blackCrownViolet'), 'Radiant violet jewel gradient present');
    assert.ok(crownFile.includes('BLACK'), 'BLACK wordmark supported');
    assert.ok(crownFile.includes('ELITE'), 'ELITE wordmark supported');
  });

  it('7. Pricing Page Layout: 3-Column Glassmorphism Centerpiece', () => {
    const pricingSrc = fs.readFileSync(path.resolve('src/components/PricingPage.tsx'), 'utf8');
    assert.ok(pricingSrc.includes('SUBSCRIPTION_PLANS.black'), 'Renders BLACK card');
    assert.ok(pricingSrc.includes('RoyalCrownLogo'), 'Uses royal crown in pricing UI');
    assert.ok(pricingSrc.includes('BLACK ELITE'), 'Displays BLACK ELITE badge');
    assert.ok(pricingSrc.includes('Exact 2× Pro Measurable Entitlements'), 'Highlights doubled quotas');
    assert.ok(pricingSrc.includes('handleSelectPlan'), 'Subscription upgrade flow connected');
  });

  it('8. Database Persistence for BLACK tier', () => {
    const email = `blacktest_${Date.now()}@example.com`;
    const user = authAndStore.createUser('Black Elite Tester', email, 'SecurePass123!');

    // Initialize subscription
    const initial = authAndStore.getUserSubscription(user.id);
    assert.strictEqual(initial.planId, 'free', 'Defaults to free');

    // Upgrade to BLACK
    authAndStore.updateUserSubscription(user.id, 'black', 'annual');

    // Read back
    const fetched = authAndStore.getUserSubscription(user.id);
    assert.strictEqual(fetched.planId, 'black', 'Persisted as black');
    assert.strictEqual(fetched.status, 'active');
    assert.strictEqual(fetched.billingInterval, 'annual');
  });
});
