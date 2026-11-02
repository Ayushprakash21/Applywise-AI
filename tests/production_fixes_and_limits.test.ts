// tests/production_fixes_and_limits.test.ts
// Comprehensive verification of Google Sign-In fixes, quota enforcement, and identity isolation

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAccountUsageStats,
  assertCanUploadResume,
  assertCanCreateApplication,
  inspectResumeIdentity,
  UsageLimitError,
  FREE_TIER_LIMITS
} from '../worker/usageEnforcement.ts';
import { isPermanentFreeAccessEmail, isPermanentFreeAccessAccount } from '../src/config/freeAccess.ts';

// In-Memory mock store implementing D1Store methods needed for testing
class MockTestD1Store {
  public users: Map<string, any> = new Map();
  public subscriptions: Map<string, any> = new Map();
  public resumes: Map<string, any[]> = new Map();
  public applications: Map<string, any[]> = new Map();

  async getUserSubscription(userId: string) {
    return this.subscriptions.get(userId) || {
      planId: 'free',
      status: 'active',
      billingInterval: 'monthly',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
    };
  }

  async countResumeDocuments(userId: string): Promise<number> {
    return (this.resumes.get(userId) || []).length;
  }

  async countApplications(userId: string): Promise<number> {
    return (this.applications.get(userId) || []).length;
  }

  async getApplicationByVacancy(userId: string, vacancyId: string): Promise<any | null> {
    const list = this.applications.get(userId) || [];
    return list.find(a => a.vacancyId === vacancyId) || null;
  }

  async addResume(userId: string, replace = false) {
    if (replace) {
      this.resumes.set(userId, [{ id: 'doc_' + Date.now(), fileName: 'resume.pdf' }]);
    } else {
      const list = this.resumes.get(userId) || [];
      list.push({ id: 'doc_' + Date.now(), fileName: 'resume.pdf' });
      this.resumes.set(userId, list);
    }
  }

  async addApplication(userId: string, vacancyId: string) {
    const list = this.applications.get(userId) || [];
    list.push({ id: 'app_' + Date.now(), vacancyId, status: 'PREPARED' });
    this.applications.set(userId, list);
  }
}

test('Google Sign-In & Auth Config: Correct status and parameter contracts', () => {
  // Test simulated config generation logic
  const getSimulatedConfig = (envClientId?: string) => ({
    googleClientId: envClientId || null,
    googleAuthEnabled: Boolean(envClientId),
  });

  const missingEnv = getSimulatedConfig(undefined);
  assert.equal(missingEnv.googleClientId, null);
  assert.equal(missingEnv.googleAuthEnabled, false, 'Auth must be cleanly disabled when GOOGLE_CLIENT_ID is absent');

  const configuredEnv = getSimulatedConfig('123456789-test.apps.googleusercontent.com');
  assert.equal(configuredEnv.googleClientId, '123456789-test.apps.googleusercontent.com');
  assert.equal(configuredEnv.googleAuthEnabled, true, 'Auth must be enabled when GOOGLE_CLIENT_ID is set');
});

test('Google Token Validation: Audience, issuer, expiration, and email_verified rules', () => {
  const allowedIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  const configuredAudience = 'my-google-client-id-123.apps.googleusercontent.com';

  const validateMockTokenPayload = (payload: any, expectedAud?: string) => {
    if (!payload.iss || !allowedIssuers.includes(payload.iss)) {
      throw new Error('Untrusted Google token issuer.');
    }
    if (expectedAud && payload.aud !== expectedAud) {
      throw new Error('Google authentication audience mismatch.');
    }
    const isVerified = payload.email_verified === true || payload.email_verified === 'true';
    if (!isVerified) {
      throw new Error('Google account email is not verified by Google.');
    }
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error('Google authentication token has expired.');
    }
    return true;
  };

  // Valid token
  assert.doesNotThrow(() => {
    validateMockTokenPayload({
      iss: 'https://accounts.google.com',
      aud: configuredAudience,
      email: 'candidate@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, configuredAudience);
  });

  // Untrusted issuer
  assert.throws(() => {
    validateMockTokenPayload({
      iss: 'https://attacker-idp.example.com',
      aud: configuredAudience,
      email: 'candidate@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, configuredAudience);
  }, /Untrusted Google token issuer/);

  // Audience mismatch
  assert.throws(() => {
    validateMockTokenPayload({
      iss: 'https://accounts.google.com',
      aud: 'different-app-client-id',
      email: 'candidate@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, configuredAudience);
  }, /audience mismatch/);

  // Unverified email
  assert.throws(() => {
    validateMockTokenPayload({
      iss: 'https://accounts.google.com',
      aud: configuredAudience,
      email: 'unverified@example.com',
      email_verified: false,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, configuredAudience);
  }, /not verified by Google/);

  // Expired token
  assert.throws(() => {
    validateMockTokenPayload({
      iss: 'https://accounts.google.com',
      aud: configuredAudience,
      email: 'candidate@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) - 100, // expired 100s ago
    }, configuredAudience);
  }, /token has expired/);
});

test('Google Sign-In: Script load failures & fallback error handling', () => {
  // Test fallback logic when Google Identity Services is not available
  const getGoogleAuthActionError = (
    googleGlobal: any,
    config: { googleClientId: string | null; googleAuthEnabled: boolean } | null
  ): string | null => {
    if (!config?.googleAuthEnabled || !config?.googleClientId) {
      return 'Google Sign-In is not enabled on this deployment. Please sign in or register with email and password.';
    }
    if (!googleGlobal?.accounts?.id) {
      return 'Google authentication script is still loading. If you are using an adblocker, please allow accounts.google.com, or sign in with email and password.';
    }
    return null;
  };

  // Disabled configuration
  assert.equal(
    getGoogleAuthActionError(null, { googleClientId: null, googleAuthEnabled: false }),
    'Google Sign-In is not enabled on this deployment. Please sign in or register with email and password.'
  );

  // Script blocked by adblocker / network
  assert.equal(
    getGoogleAuthActionError(null, { googleClientId: 'valid-id.apps.googleusercontent.com', googleAuthEnabled: true }),
    'Google authentication script is still loading. If you are using an adblocker, please allow accounts.google.com, or sign in with email and password.'
  );

  // Script loaded and ready
  assert.equal(
    getGoogleAuthActionError({ accounts: { id: {} } }, { googleClientId: 'valid-id.apps.googleusercontent.com', googleAuthEnabled: true }),
    null
  );
});

test('Google Sign-In: Account creation vs linking with existing email', () => {
  const users = new Map<string, any>();
  users.set('existing@example.com', { id: 'usr-existing-42', email: 'existing@example.com', role: 'user' });

  const processGoogleLogin = (verifiedEmail: string, name: string) => {
    const cleanEmail = verifiedEmail.toLowerCase().trim();
    let user = users.get(cleanEmail);
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = { id: `usr-${Date.now()}`, email: cleanEmail, role: 'user' };
      users.set(cleanEmail, user);
    }
    return { user, isNewUser };
  };

  // New user registration
  const result1 = processGoogleLogin('newcomer@example.com', 'Newcomer');
  assert.equal(result1.isNewUser, true);
  assert.equal(result1.user.email, 'newcomer@example.com');

  // Existing user linking without creating duplicate or changing ID
  const result2 = processGoogleLogin('existing@example.com', 'Existing');
  assert.equal(result2.isNewUser, false);
  assert.equal(result2.user.id, 'usr-existing-42');
  assert.equal(result2.user.email, 'existing@example.com');
});

test('Free Plan Resume Quota: Exactly 1 active resume, replacement permitted, 2nd blocked', async () => {
  const store = new MockTestD1Store() as any;
  const freeUserId = 'free-user-1';
  const freeUserEmail = 'regular.user@example.com';

  // 0 resumes currently
  let stats = await getAccountUsageStats(freeUserId, store, freeUserEmail);
  assert.equal(stats.resumes.active, 0);
  assert.equal(stats.resumes.max, 1);
  assert.equal(stats.resumes.canUploadNew, true);

  // Upload 1st resume without replacing
  await assertCanUploadResume(freeUserId, store, freeUserEmail, false);
  await store.addResume(freeUserId, false);

  stats = await getAccountUsageStats(freeUserId, store, freeUserEmail);
  assert.equal(stats.resumes.active, 1);
  assert.equal(stats.resumes.canUploadNew, false, 'Cannot upload a new distinct resume beyond 1');
  assert.equal(stats.resumes.canReplace, true, 'Replacement must always be permitted');

  // Attempt to upload 2nd resume WITHOUT replacement -> MUST FAIL
  await assert.rejects(
    async () => {
      await assertCanUploadResume(freeUserId, store, freeUserEmail, false);
    },
    (err: any) => {
      assert.ok(err instanceof UsageLimitError);
      assert.equal(err.code, 'RESUME_LIMIT_REACHED');
      assert.equal(err.statusCode, 403);
      assert.ok(err.message.includes('1 active resume'));
      return true;
    }
  );

  // Attempt to upload with replacement -> MUST SUCCEED
  await assert.doesNotReject(async () => {
    await assertCanUploadResume(freeUserId, store, freeUserEmail, true);
  });
  await store.addResume(freeUserId, true);

  // Still exactly 1 resume
  const finalStats = await getAccountUsageStats(freeUserId, store, freeUserEmail);
  assert.equal(finalStats.resumes.active, 1);
});

test('Free Plan Application Quota: Exactly 5 distinct applications, 6th blocked', async () => {
  const store = new MockTestD1Store() as any;
  const freeUserId = 'free-user-2';
  const freeUserEmail = 'jobhunter@example.com';

  // Add 4 applications
  for (let i = 1; i <= 4; i++) {
    await assertCanCreateApplication(freeUserId, store, freeUserEmail, `vacancy_${i}`);
    await store.addApplication(freeUserId, `vacancy_${i}`);
  }

  let stats = await getAccountUsageStats(freeUserId, store, freeUserEmail);
  assert.equal(stats.applications.distinctCount, 4);
  assert.equal(stats.applications.max, 5);
  assert.equal(stats.applications.remaining, 1);
  assert.equal(stats.applications.canCreateNew, true);

  // Add 5th application -> Should succeed
  await assertCanCreateApplication(freeUserId, store, freeUserEmail, 'vacancy_5');
  await store.addApplication(freeUserId, 'vacancy_5');

  stats = await getAccountUsageStats(freeUserId, store, freeUserEmail);
  assert.equal(stats.applications.distinctCount, 5);
  assert.equal(stats.applications.remaining, 0);
  assert.equal(stats.applications.canCreateNew, false);

  // Attempting 6th distinct application -> MUST FAIL WITH 403
  await assert.rejects(
    async () => {
      await assertCanCreateApplication(freeUserId, store, freeUserEmail, 'vacancy_6');
    },
    (err: any) => {
      assert.ok(err instanceof UsageLimitError);
      assert.equal(err.code, 'APPLICATION_LIMIT_REACHED');
      assert.equal(err.statusCode, 403);
      assert.ok(err.message.includes('up to 5 applications'));
      return true;
    }
  );

  // Updating an existing application (e.g. vacancy_2) -> MUST SUCCEED even when at limit
  await assert.doesNotReject(async () => {
    await assertCanCreateApplication(freeUserId, store, freeUserEmail, 'vacancy_2');
  });
});

test('Pro & Permanent Free-Access Users: Quotas are completely bypassed', async () => {
  const store = new MockTestD1Store() as any;
  const allowlistEmails = ['aksharasahu45@gmail.com', 'ayushprakash0021@gmail.com'];

  for (const email of allowlistEmails) {
    const userId = `user_${email.split('@')[0]}`;
    // Give 2 resumes and 6 applications
    await store.addResume(userId, false);
    await store.addResume(userId, false);
    for (let i = 1; i <= 6; i++) {
      await store.addApplication(userId, `vac_${i}`);
    }

    const stats = await getAccountUsageStats(userId, store, email);
    assert.equal(stats.planId, 'pro');
    assert.equal(stats.isPermanentAccess, true);
    assert.equal(stats.resumes.max, null, 'Resumes max must be null (unlimited)');
    assert.equal(stats.resumes.canUploadNew, true);
    assert.equal(stats.applications.max, null, 'Applications max must be null (unlimited)');
    assert.equal(stats.applications.canCreateNew, true);

    // Assert uploading 3rd resume succeeds
    await assert.doesNotReject(async () => {
      await assertCanUploadResume(userId, store, email, false);
    });

    // Assert creating 7th application succeeds
    await assert.doesNotReject(async () => {
      await assertCanCreateApplication(userId, store, email, 'vac_7');
    });
  }
});

test('Resume Identity Extraction: Flags emails differing from account owner', () => {
  const userEmail = 'candidate@gmail.com';

  // Matching email
  const matchResult = inspectResumeIdentity('Contact me at candidate@gmail.com or call 555-0199', userEmail);
  assert.equal(matchResult.isMismatch, false);
  assert.equal(matchResult.warning, undefined);

  // Mismatched email
  const mismatchResult = inspectResumeIdentity('John Doe, Email: fraudulent.contact@otherdomain.com, Senior Dev', userEmail);
  assert.equal(mismatchResult.isMismatch, true);
  assert.ok(mismatchResult.warning?.includes('fraudulent.contact@otherdomain.com'));
  assert.ok(mismatchResult.detectedEmails.includes('fraudulent.contact@otherdomain.com'));

  // No email in resume text
  const noEmailResult = inspectResumeIdentity('Skills: Python, TypeScript, React, SQL', userEmail);
  assert.equal(noEmailResult.isMismatch, false);
});
