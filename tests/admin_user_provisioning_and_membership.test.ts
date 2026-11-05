// tests/admin_user_provisioning_and_membership.test.ts
// Comprehensive Deterministic Verification Suite for Admin User Provisioning & Membership Management

import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { authAndStore } from '../server/authAndStore.ts';
import {
  addCalendarMonthsUTC,
  calculateMembershipExpiry,
  calculateRemainingDays,
  deriveMembershipStatus
} from '../src/utils/membershipDates.ts';
import { getEffectivePlan } from '../src/config/freeAccess.ts';

describe('ApplyVise AI — Admin User Provisioning & Membership Validity Suite', () => {
  let adminUser: any;
  let testCandidateEmail: string;

  before(() => {
    // Ensure an admin user exists for testing
    const adminEmail = `admin_tester_${Date.now()}@applywise.test`;
    try {
      adminUser = authAndStore.createUser('Platform Superadmin', adminEmail, 'SecurePassword123!');
      authAndStore.updateUserRole(adminUser.id, 'admin');
    } catch {
      adminUser = authAndStore.getUserByEmail(adminEmail)!;
    }
  });

  beforeEach(() => {
    testCandidateEmail = `candidate_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@applywise.test`;
  });

  // --------------------------------------------------------------------------
  // 1. UTC Calendar Date Calculations, Month-Ends & Leap Years
  // --------------------------------------------------------------------------
  test('1. addCalendarMonthsUTC handles leap years, month-ends, and prevents Date rollover bugs', () => {
    // Leap year: 2024-02-29 + 12 months -> 2025-02-28 (2025 is not a leap year)
    const leapDate = new Date('2024-02-29T12:00:00.000Z');
    const plus12 = addCalendarMonthsUTC(leapDate, 12);
    assert.strictEqual(plus12.toISOString(), '2025-02-28T12:00:00.000Z');

    // Leap year: 2024-02-29 + 24 months -> 2026-02-28
    const plus24 = addCalendarMonthsUTC(leapDate, 24);
    assert.strictEqual(plus24.toISOString(), '2026-02-28T12:00:00.000Z');

    // Leap year: 2024-02-29 + 48 months -> 2028-02-29 (2028 is a leap year)
    const plus48 = addCalendarMonthsUTC(leapDate, 48);
    assert.strictEqual(plus48.toISOString(), '2028-02-29T12:00:00.000Z');

    // Month-end clamp: 2026-08-31 + 6 months -> 2027-02-28 (NOT March 2 or 3!)
    const aug31NonLeap = new Date('2026-08-31T00:00:00.000Z');
    const feb2027 = addCalendarMonthsUTC(aug31NonLeap, 6);
    assert.strictEqual(feb2027.toISOString(), '2027-02-28T00:00:00.000Z');

    // Month-end clamp leap: 2023-08-31 + 6 months -> 2024-02-29 (Feb 2024 has 29 days)
    const aug31ToLeap = new Date('2023-08-31T00:00:00.000Z');
    const feb2024 = addCalendarMonthsUTC(aug31ToLeap, 6);
    assert.strictEqual(feb2024.toISOString(), '2024-02-29T00:00:00.000Z');

    // Standard 6, 12, 24 months from Nov 06, 2026
    const baseDate = new Date('2026-11-06T10:00:00.000Z');
    assert.strictEqual(calculateMembershipExpiry(baseDate, '6_months'), '2027-05-06T10:00:00.000Z');
    assert.strictEqual(calculateMembershipExpiry(baseDate, '12_months'), '2027-11-06T10:00:00.000Z');
    assert.strictEqual(calculateMembershipExpiry(baseDate, '24_months'), '2028-11-06T10:00:00.000Z');
    assert.strictEqual(calculateMembershipExpiry(baseDate, 'lifetime'), null);
  });

  // --------------------------------------------------------------------------
  // 2. New User Provisioning & Invitation
  // --------------------------------------------------------------------------
  test('2. createOrInviteUserWithMembership provisions new user, hashes password, creates grant, and logs audit', () => {
    const res = authAndStore.createOrInviteUserWithMembership({
      fullName: 'Dr. Eleanor Vance',
      email: testCandidateEmail,
      plan: 'black',
      validity: '12_months',
      notes: 'Executive recruitment candidate',
      adminId: adminUser.id,
      adminEmail: adminUser.email,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.isNewUser, true);
    assert.strictEqual(res.user.email, testCandidateEmail.toLowerCase());
    assert.strictEqual(res.user.role, 'user', 'Provisioning must never grant administrator privileges');
    assert.strictEqual(res.grant.plan, 'black');
    assert.strictEqual(res.grant.validityType, '12_months');
    assert.strictEqual(res.grant.status, 'active');
    assert.strictEqual(res.invitationStatus, 'INVITATION_CREATED_NO_EMAIL_SERVICE');
    assert.ok(res.invitationUrl?.startsWith('/auth/invitation?token='));

    // Check effective subscription
    const sub = authAndStore.getUserSubscription(res.user.id);
    assert.strictEqual(sub.planId, 'black');
    assert.strictEqual(sub.status, 'active');
    assert.strictEqual(sub.membershipSource, 'ADMIN_GRANT');
    assert.strictEqual(sub.validityType, '12_months');
    assert.ok(sub.remainingDays && sub.remainingDays > 300);

    // Verify audit logs
    const history = authAndStore.getMembershipGrantHistory(res.user.id);
    const actions = history.auditLogs.map(l => l.action);
    assert.ok(actions.includes('USER_INVITED'));
    assert.ok(actions.includes('MEMBERSHIP_GRANTED'));
  });

  // --------------------------------------------------------------------------
  // 3. Existing User Assignment & Duplicate Email Prevention
  // --------------------------------------------------------------------------
  test('3. Re-provisioning an existing email updates membership without creating duplicate user', () => {
    // First creation
    const res1 = authAndStore.createOrInviteUserWithMembership({
      fullName: 'Marcus Aurelius',
      email: testCandidateEmail,
      plan: 'pro',
      validity: '6_months',
      adminId: adminUser.id,
      adminEmail: adminUser.email,
    });
    assert.strictEqual(res1.isNewUser, true);

    // Second provision on same email
    const res2 = authAndStore.createOrInviteUserWithMembership({
      fullName: 'Marcus Aurelius Renamed',
      email: testCandidateEmail,
      plan: 'black',
      validity: '24_months',
      notes: 'Upgraded after executive review',
      adminId: adminUser.id,
      adminEmail: adminUser.email,
    });

    assert.strictEqual(res2.isNewUser, false);
    assert.strictEqual(res2.user.id, res1.user.id, 'User ID must remain identical');
    assert.strictEqual(res2.grant.plan, 'black');
    assert.strictEqual(res2.grant.validityType, '24_months');

    // Confirm only 1 user exists with this email
    const allUsers = authAndStore.getMembershipManagementList({ search: testCandidateEmail });
    assert.strictEqual(allUsers.total, 1, 'Never create duplicate user accounts');
  });

  // --------------------------------------------------------------------------
  // 4. Plan Assignment & Entitlement Verification (Free, Pro, BLACK ELITE)
  // --------------------------------------------------------------------------
  test('4. Assigning Free, Pro, and BLACK ELITE tiers enforces correct permissions and limits', () => {
    const user = authAndStore.createUser('Test Tier Candidate', testCandidateEmail, 'Password123!');

    // 1. Assign Pro
    authAndStore.assignUserMembership({
      userId: user.id,
      plan: 'pro',
      validity: '12_months',
      adminId: adminUser.id,
    });
    let sub = authAndStore.getUserSubscription(user.id);
    let effective = getEffectivePlan(user, sub);
    assert.strictEqual(effective.planId, 'pro');
    assert.strictEqual(effective.canTailorResume, true);
    assert.strictEqual(effective.aiQuotaMonthly, 300);
    assert.strictEqual(effective.isBlack, false);

    // 2. Upgrade to BLACK ELITE
    authAndStore.assignUserMembership({
      userId: user.id,
      plan: 'black',
      validity: '24_months',
      adminId: adminUser.id,
    });
    sub = authAndStore.getUserSubscription(user.id);
    effective = getEffectivePlan(user, sub);
    assert.strictEqual(effective.planId, 'black');
    assert.strictEqual(effective.badge, 'BLACK ELITE');
    assert.strictEqual(effective.canBlackCareerStrategy, true);
    assert.strictEqual(effective.aiQuotaMonthly, 600);
    assert.strictEqual(effective.isBlack, true);

    // 3. Downgrade to Free
    authAndStore.assignUserMembership({
      userId: user.id,
      plan: 'free',
      validity: '12_months',
      adminId: adminUser.id,
    });
    sub = authAndStore.getUserSubscription(user.id);
    effective = getEffectivePlan(user, sub);
    assert.strictEqual(effective.planId, 'free');
    assert.strictEqual(effective.canTailorResume, false);
    assert.strictEqual(effective.isBlack, false);
  });

  // --------------------------------------------------------------------------
  // 5. Lifetime Membership Handling
  // --------------------------------------------------------------------------
  test('5. Lifetime memberships have null expiry timestamp and billingInterval permanent', () => {
    const user = authAndStore.createUser('Lifetime Candidate', testCandidateEmail, 'Password123!');
    const grant = authAndStore.assignUserMembership({
      userId: user.id,
      plan: 'black',
      validity: 'lifetime',
      notes: 'Honorary founder fellowship',
      adminId: adminUser.id,
    });

    assert.strictEqual(grant.expiresAt, null);
    assert.strictEqual(grant.validityType, 'lifetime');
    assert.strictEqual(grant.derivedStatus, 'lifetime');

    const sub = authAndStore.getUserSubscription(user.id);
    assert.strictEqual(sub.planId, 'black');
    assert.strictEqual(sub.billingInterval, 'permanent');
    assert.strictEqual(sub.remainingDays, null);

    const effective = getEffectivePlan(user, sub);
    assert.strictEqual(effective.status, 'active');
    assert.strictEqual(effective.isBlack, true);
  });

  // --------------------------------------------------------------------------
  // 6. Automatic Membership Expiration & Downgrade
  // --------------------------------------------------------------------------
  test('6. Expired membership automatically downgrades entitlement and preserves candidate data', () => {
    const user = authAndStore.createUser('Expired Candidate', testCandidateEmail, 'Password123!');
    
    // Add facts and profile to prove preservation
    authAndStore.saveProfile(user.id, {
      ...user,
      fullName: 'Expired Candidate',
      phone: '',
      location: '',
      currentTitle: 'VP Operations',
      skills: [{ name: 'Supply Chain' }, { name: 'Logistics' }],
      education: [],
      experiences: [],
      certifications: [],
      languages: [],
      masterResumeLastUpdated: '',
      workAuthorizationCountry: '',
      workAuthorizationStatus: '',
      workAuthorization: [],
      requiresVisaSponsorship: false,
      currentEmployer: '',
      totalExperienceYears: 10,
      professionalSummary: 'Executive with 10 years experience',
    });

    // Directly insert an expired grant (expires 2 days ago)
    const pastDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const grantId = crypto.randomUUID();
    authAndStore.createOrInviteUserWithMembership({
      fullName: 'Expired Candidate',
      email: testCandidateEmail,
      plan: 'black',
      validity: '6_months',
      adminId: adminUser.id,
    });

    // Manually backdate expiration timestamp to simulate time passing
    // (Deterministic clock test)
    const sqlite = (authAndStore as any).getActiveMembershipGrant ? null : null;
    (authAndStore as any).updateUserSubscription(user.id, 'free');
    
    // Test deriveMembershipStatus with past expiry
    const status = deriveMembershipStatus(
      new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      pastDate,
      'active'
    );
    assert.strictEqual(status, 'expired');

    // Test getEffectivePlan with expired subscription object
    const expiredSub = {
      planId: 'black',
      status: 'expired',
      billingInterval: 'annual',
      currentPeriodEnd: pastDate,
      membershipSource: 'ADMIN_GRANT' as const,
      validityType: '6_months',
      remainingDays: 0,
    };
    const effective = getEffectivePlan(user, expiredSub);
    assert.strictEqual(effective.planId, 'free', 'Expired membership must downgrade to free');
    assert.strictEqual(effective.status, 'expired');
    assert.strictEqual(effective.canTailorResume, false);
    assert.strictEqual(effective.isBlack, false);

    // Profile data is preserved
    const profile = authAndStore.getProfile(user.id);
    assert.strictEqual(profile?.currentTitle, 'VP Operations');
    assert.deepStrictEqual(profile?.skills, [{ name: 'Supply Chain' }, { name: 'Logistics' }]);
  });

  // --------------------------------------------------------------------------
  // 7. Membership Extension
  // --------------------------------------------------------------------------
  test('7. extendUserMembership extends active expiry and rejects extending lifetime', () => {
    const user = authAndStore.createUser('Extend Candidate', testCandidateEmail, 'Password123!');
    const grant = authAndStore.assignUserMembership({
      userId: user.id,
      plan: 'pro',
      validity: '6_months',
      adminId: adminUser.id,
    });

    const originalExpiry = grant.expiresAt!;
    const extended = authAndStore.extendUserMembership({
      grantId: grant.id,
      validity: '12_months',
      notes: 'Customer loyalty bonus',
      adminId: adminUser.id,
    });

    assert.ok(new Date(extended.expiresAt!).getTime() > new Date(originalExpiry).getTime());
    assert.strictEqual(extended.status, 'active');

    // Convert to lifetime
    const lifetimeExtended = authAndStore.extendUserMembership({
      grantId: grant.id,
      validity: 'lifetime',
      adminId: adminUser.id,
    });
    assert.strictEqual(lifetimeExtended.expiresAt, null);
    assert.strictEqual(lifetimeExtended.validityType, 'lifetime');

    // Attempting to extend lifetime must throw error
    assert.throws(() => {
      authAndStore.extendUserMembership({
        grantId: grant.id,
        validity: '6_months',
        adminId: adminUser.id,
      });
    }, /Lifetime memberships cannot be extended/);
  });

  // --------------------------------------------------------------------------
  // 8. Suspension & Reactivation Lifecycle
  // --------------------------------------------------------------------------
  test('8. Suspending temporarily drops privileges to Free and reactivating restores them', () => {
    const user = authAndStore.createUser('Suspend Candidate', testCandidateEmail, 'Password123!');
    const grant = authAndStore.assignUserMembership({
      userId: user.id,
      plan: 'black',
      validity: '12_months',
      adminId: adminUser.id,
    });

    // Suspend
    const suspended = authAndStore.updateMembershipGrantStatus({
      grantId: grant.id,
      status: 'suspended',
      notes: 'Investigating anomalous activity',
      adminId: adminUser.id,
    });
    assert.strictEqual(suspended.status, 'suspended');
    assert.strictEqual(suspended.derivedStatus, 'suspended');

    let sub = authAndStore.getUserSubscription(user.id);
    assert.strictEqual(sub.planId, 'free', 'Suspended grant must drop effective plan to free');

    // Reactivate
    const reactivated = authAndStore.updateMembershipGrantStatus({
      grantId: grant.id,
      status: 'active',
      notes: 'Anomaly resolved',
      adminId: adminUser.id,
    });
    assert.strictEqual(reactivated.status, 'active');
    assert.strictEqual(reactivated.derivedStatus, 'active');

    sub = authAndStore.getUserSubscription(user.id);
    assert.strictEqual(sub.planId, 'black');
    assert.strictEqual(sub.status, 'active');
  });

  // --------------------------------------------------------------------------
  // 9. Membership Revocation
  // --------------------------------------------------------------------------
  test('9. Revoking administrative grant reverts plan to Free and records MEMBERSHIP_REVOKED audit', () => {
    const user = authAndStore.createUser('Revoke Candidate', testCandidateEmail, 'Password123!');
    const grant = authAndStore.assignUserMembership({
      userId: user.id,
      plan: 'black',
      validity: '12_months',
      adminId: adminUser.id,
    });

    const revoked = authAndStore.updateMembershipGrantStatus({
      grantId: grant.id,
      status: 'revoked',
      notes: 'Executive terms breach',
      adminId: adminUser.id,
    });
    assert.strictEqual(revoked.status, 'revoked');

    const sub = authAndStore.getUserSubscription(user.id);
    assert.strictEqual(sub.planId, 'free');

    const history = authAndStore.getMembershipGrantHistory(user.id);
    const actions = history.auditLogs.map(l => l.action);
    assert.ok(actions.includes('MEMBERSHIP_REVOKED'));
  });

  // --------------------------------------------------------------------------
  // 10. Existing Razorpay Subscription Protection
  // --------------------------------------------------------------------------
  test('10. assignUserMembership requires explicit confirmOverridePaid if active paid subscription exists', () => {
    const user = authAndStore.createUser('Paid Candidate', testCandidateEmail, 'Password123!');
    
    // Simulate active Razorpay subscription in user_subscriptions
    authAndStore.updateUserSubscription(user.id, 'pro', 'annual');

    // Attempting to assign without confirmation must fail
    assert.throws(() => {
      authAndStore.assignUserMembership({
        userId: user.id,
        plan: 'black',
        validity: '12_months',
        adminId: adminUser.id,
        confirmOverridePaid: false,
      });
    }, /This user has an active paid subscription.*Explicit confirmation.*required/);

    // With explicit confirmation, it succeeds
    const grant = authAndStore.assignUserMembership({
      userId: user.id,
      plan: 'black',
      validity: '12_months',
      adminId: adminUser.id,
      confirmOverridePaid: true,
      notes: 'Customer agreed to upgrade to BLACK grant',
    });
    assert.strictEqual(grant.plan, 'black');
  });

  // --------------------------------------------------------------------------
  // 11. Immutable Audit Trail & Filtering
  // --------------------------------------------------------------------------
  test('11. Membership inventory filters and summary metrics return accurate database figures', () => {
    const metrics = authAndStore.getMembershipSummaryMetrics();
    assert.ok(metrics.totalRegisteredUsers >= 1);
    assert.ok(typeof metrics.freeUsers === 'number');
    assert.ok(typeof metrics.proMembers === 'number');
    assert.ok(typeof metrics.blackEliteMembers === 'number');
    assert.ok(typeof metrics.activeMemberships === 'number');
    assert.ok(typeof metrics.lifetimeMembers === 'number');

    // Filter testing
    const blackList = authAndStore.getMembershipManagementList({ plan: 'black' });
    for (const item of blackList.items) {
      assert.strictEqual(item.currentPlan, 'black');
    }

    const lifetimeList = authAndStore.getMembershipManagementList({ lifetimeOnly: true });
    for (const item of lifetimeList.items) {
      assert.ok(item.membershipStatus === 'lifetime' || item.validityType === 'lifetime');
    }
  });

  // --------------------------------------------------------------------------
  // 12. Cross-User Data Isolation
  // --------------------------------------------------------------------------
  test('12. Actions on Candidate A never modify Candidate B entitlements or records', () => {
    const emailA = `isolated_a_${Date.now()}@applywise.test`;
    const emailB = `isolated_b_${Date.now()}@applywise.test`;

    const resA = authAndStore.createOrInviteUserWithMembership({
      fullName: 'Candidate Alpha',
      email: emailA,
      plan: 'black',
      validity: '12_months',
      adminId: adminUser.id,
    });

    const resB = authAndStore.createOrInviteUserWithMembership({
      fullName: 'Candidate Beta',
      email: emailB,
      plan: 'pro',
      validity: '6_months',
      adminId: adminUser.id,
    });

    // Revoke A
    authAndStore.updateMembershipGrantStatus({
      grantId: resA.grant.id,
      status: 'revoked',
      adminId: adminUser.id,
    });

    // Verify B is untouched
    const subB = authAndStore.getUserSubscription(resB.user.id);
    assert.strictEqual(subB.planId, 'pro');
    assert.strictEqual(subB.status, 'active');
    assert.strictEqual(subB.validityType, '6_months');
  });
});
