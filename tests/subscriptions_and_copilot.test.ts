import test from 'node:test';
import assert from 'node:assert/strict';
import { SUBSCRIPTION_PLANS, COMPARISON_FEATURES } from '../src/config/plans.ts';

test('Subscription Plans: Free and Pro pricing, quotas, and structure', () => {
  assert.ok(SUBSCRIPTION_PLANS.free, 'Free plan must exist');
  assert.ok(SUBSCRIPTION_PLANS.pro, 'Pro plan must exist');

  // Verify Free Plan specifications
  assert.equal(SUBSCRIPTION_PLANS.free.id, 'free');
  assert.equal(SUBSCRIPTION_PLANS.free.price.monthly.inr, 0);
  assert.equal(SUBSCRIPTION_PLANS.free.price.monthly.usd, 0);
  assert.equal(SUBSCRIPTION_PLANS.free.aiQuotaMonthly, 10, 'Free tier must have 10 AI copilot requests');

  // Verify Pro Plan specifications
  assert.equal(SUBSCRIPTION_PLANS.pro.id, 'pro');
  assert.equal(SUBSCRIPTION_PLANS.pro.price.monthly.inr, 799, 'Pro monthly price should be ₹799');
  assert.equal(SUBSCRIPTION_PLANS.pro.price.monthly.usd, 9.99, 'Pro monthly price should be $9.99');
  assert.equal(SUBSCRIPTION_PLANS.pro.aiQuotaMonthly, 300, 'Pro tier must have 300 AI copilot requests');

  // Annual discount
  assert.ok(SUBSCRIPTION_PLANS.pro.price.annual.savingsPercent >= 15, 'Annual plan offers discount');
});

test('Comparison Features: Verify tiered entitlements and upcoming features', () => {
  assert.ok(COMPARISON_FEATURES.length >= 6, 'Must provide comprehensive feature comparison');

  const atsTailoring = COMPARISON_FEATURES.find(f => f.name.includes('ATS Document Tailoring'));
  assert.ok(atsTailoring, 'ATS tailoring feature must be defined');
  assert.equal(atsTailoring.includedInFree, false, 'ATS tailoring restricted to Pro');
  assert.equal(atsTailoring.includedInPro, true, 'ATS tailoring included in Pro');

  const copilotFeature = COMPARISON_FEATURES.find(f => f.name.includes('AI Copilot'));
  assert.ok(copilotFeature, 'AI Copilot must be in comparison table');
  assert.equal(copilotFeature.includedInFree, true, 'Basic copilot queries available in free');
  assert.equal(copilotFeature.includedInPro, true, 'Full copilot queries available in pro');
});
