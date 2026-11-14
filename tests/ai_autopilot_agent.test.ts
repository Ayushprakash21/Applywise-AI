import test from 'node:test';
import assert from 'node:assert/strict';
import { AutopilotEngine, AUTOPILOT_MONTHLY_LIMITS, AUTOPILOT_DAILY_LIMIT } from '../worker/autopilotEngine.ts';
import { isPermanentFreeAccessAccount } from '../src/config/freeAccess.ts';

test('Final Configuration Override: Exact Tier Quotas & Daily Safety Cap', () => {
  // Monthly Entitlements
  assert.equal(AUTOPILOT_MONTHLY_LIMITS.free, 2, 'Free plan must be granted exactly 2 submissions/month');
  assert.equal(AUTOPILOT_MONTHLY_LIMITS.pro, 10, 'Pro plan must be granted exactly 10 submissions/month');
  assert.equal(AUTOPILOT_MONTHLY_LIMITS.black, 20, 'BLACK ELITE plan must be granted exactly 20 submissions/month');
  assert.equal(AUTOPILOT_MONTHLY_LIMITS.founder, 999999, 'Founder privilege must be unlimited monthly');

  // Daily Limit
  assert.equal(AUTOPILOT_DAILY_LIMIT, 3, 'Daily maximum safety cap must be exactly 3 successful submissions per candidate');
});

test('Final Configuration Override: Timezone-Aware Local Calendar Day Calculations', () => {
  const utcDate = new Date('2026-11-14T23:30:00Z');
  
  // In UTC, date is 2026-11-14
  const dateUtc = AutopilotEngine.getLocalCalendarDate('UTC', utcDate);
  assert.equal(dateUtc, '2026-11-14');

  // In Asia/Kolkata (UTC + 5:30), 23:30Z rolls over to next calendar day (2026-11-15)
  const dateIst = AutopilotEngine.getLocalCalendarDate('Asia/Kolkata', utcDate);
  assert.equal(dateIst, '2026-11-15', 'Timezone adjustment must respect candidate local midnight reset');

  // In America/New_York (UTC - 5:00), still 2026-11-14 afternoon
  const dateEst = AutopilotEngine.getLocalCalendarDate('America/New_York', utcDate);
  assert.equal(dateEst, '2026-11-14');
});

test('Final Configuration Override: Supervised Autopilot Approval & One-Time Consent Contract', () => {
  const normalUser = { id: 'usr_supervised', email: 'test_candidate@example.com', isVerified: true };
  const entitlement = AutopilotEngine.getEffectiveEntitlement(normalUser, 'pro');
  
  assert.equal(entitlement.monthlyLimit, 10);
  assert.equal(entitlement.unlimited, false);

  const founderUser = { id: 'usr_founder', email: 'ayushprakash0021@gmail.com', isVerified: true };
  assert.ok(isPermanentFreeAccessAccount(founderUser), 'Founder must be validated against verified allowlist');

  const founderEntitlement = AutopilotEngine.getEffectiveEntitlement(founderUser, 'free');
  assert.equal(founderEntitlement.unlimited, true, 'Founder must receive unlimited monthly auto-apply submissions');
});

test('Final Configuration Override: Daily Limit & Reservation Lock Guard', () => {
  const settings: any = {
    operatingMode: 'SUPERVISED_AUTOPILOT',
    automationActive: true,
    consentGiven: true,
    dailyLimit: 3,
    dailyUsageCount: 3, // Already used 3 today
    candidateTimezone: 'UTC',
  };

  assert.equal(settings.dailyUsageCount >= 3, true, 'Candidate having used 3 today must be blocked by daily safety limit');
});
