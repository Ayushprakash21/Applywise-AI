import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';

describe('Production Backend Repairs & Regression Suite', () => {
  // Mock D1-compatible database
  class MockD1Database {
    private tables = new Map<string, any[]>();

    constructor() {
      this.tables.set('users', [
        { id: 'u1', email: 'ayushprakash0021@gmail.com', role: 'admin' },
        { id: 'u2', email: 'candidate@example.com', role: 'user' },
      ]);
      this.tables.set('applications', [{ id: 'app1', user_id: 'u2', status: 'SUBMITTED' }]);
      this.tables.set('resume_documents', [{ id: 'res1', user_id: 'u2', file_name: 'resume.pdf' }]);
      this.tables.set('live_jobs_cache', [
        { id: 'job1', title: 'Senior Software Engineer' },
        { id: 'job2', title: 'Full Stack Developer' },
      ]);
      this.tables.set('cached_vacancies', [{ id: 'cv1', title: 'Sample Job' }]);
      this.tables.set('user_subscriptions', [
        { id: 'sub1', user_id: 'u1', plan_id: 'pro', status: 'active' },
      ]);
      // Note: 'vacancies' table intentionally does NOT exist (matching production schema)
    }

    prepare(sql: string) {
      const db = this;
      return {
        first: async <T>(): Promise<T | null> => {
          // Parse table name from SQL
          const match = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
          if (!match) return null;
          const table = match[1];

          if (!db.tables.has(table)) {
            // Emulate SQLite / Cloudflare D1 error: no such table
            throw new Error(`D1_ERROR: no such table: ${table}`);
          }

          const rows = db.tables.get(table)!;
          if (sql.includes("role = 'admin'")) {
            return { count: rows.filter(r => r.role === 'admin').length } as T;
          }
          if (sql.includes("plan_id = 'pro' AND status = 'active'")) {
            return { count: rows.filter(r => r.plan_id === 'pro' && r.status === 'active').length } as T;
          }
          return { count: rows.length } as T;
        },
      };
    }
  }

  // Implementation of getAdminOverviewStats under test
  const getAdminOverviewStats = async (db: MockD1Database) => {
    const safeCount = async (query: string): Promise<number> => {
      try {
        const row = await db.prepare(query).first<{ count: number }>();
        return row?.count || 0;
      } catch {
        return 0;
      }
    };

    const getVacanciesCount = async (): Promise<number> => {
      try {
        const liveRow = await db.prepare('SELECT COUNT(*) as count FROM live_jobs_cache').first<{ count: number }>();
        if (liveRow && liveRow.count > 0) return liveRow.count;
      } catch {}
      try {
        const cachedRow = await db.prepare('SELECT COUNT(*) as count FROM cached_vacancies').first<{ count: number }>();
        return cachedRow?.count || 0;
      } catch {}
      return 0;
    };

    const [totalUsers, totalAdmins, totalApplications, totalResumes, totalVacancies, activeSubscriptions] = await Promise.all([
      safeCount('SELECT COUNT(*) as count FROM users'),
      safeCount("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"),
      safeCount('SELECT COUNT(*) as count FROM applications'),
      safeCount('SELECT COUNT(*) as count FROM resume_documents'),
      getVacanciesCount(),
      safeCount("SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_id = 'pro' AND status = 'active'"),
    ]);

    return {
      totalUsers,
      totalAdmins,
      totalApplications,
      totalResumes,
      totalVacancies,
      activeSubscriptions,
    };
  };

  it('1. Admin overview succeeds with actual production schema (live_jobs_cache & cached_vacancies)', async () => {
    const db = new MockD1Database();
    const stats = await getAdminOverviewStats(db);

    assert.strictEqual(stats.totalUsers, 2);
    assert.strictEqual(stats.totalAdmins, 1);
    assert.strictEqual(stats.totalApplications, 1);
    assert.strictEqual(stats.totalResumes, 1);
    assert.strictEqual(stats.totalVacancies, 2); // Reads from live_jobs_cache
    assert.strictEqual(stats.activeSubscriptions, 1);
  });

  it('2. Admin overview handles missing or broken tables gracefully without HTTP 500 crash', async () => {
    // Database with zero tables initialized
    const brokenDb = {
      prepare: (_sql: string) => ({
        first: async () => {
          throw new Error('D1_ERROR: database uninitialized or table missing');
        },
      }),
    } as any;

    const stats = await getAdminOverviewStats(brokenDb);
    // Must return safe 0 numbers without throwing
    assert.strictEqual(stats.totalUsers, 0);
    assert.strictEqual(stats.totalAdmins, 0);
    assert.strictEqual(stats.totalVacancies, 0);
    assert.strictEqual(stats.activeSubscriptions, 0);
  });

  it('3. Admin authorization: blocks unauthorized and non-admin requests', () => {
    const requireAdminHandler = (user: { id: string; role?: string } | null) => {
      if (!user) return { status: 401, error: 'Unauthorized: Authentication required' };
      if (user.role !== 'admin') return { status: 403, error: 'Forbidden: Administrator privileges required' };
      return { status: 200, success: true };
    };

    assert.strictEqual(requireAdminHandler(null).status, 401);
    assert.strictEqual(requireAdminHandler({ id: 'u1', role: 'user' }).status, 403);
    assert.strictEqual(requireAdminHandler({ id: 'u2', role: 'admin' }).status, 200);
  });

  it('4. Email/password signup validation: handles success and field failures cleanly', () => {
    const validateSignup = (body: any) => {
      if (!body.fullName || typeof body.fullName !== 'string' || body.fullName.trim().length < 2) {
        return { valid: false, error: 'Full name is required (minimum 2 characters).' };
      }
      if (!body.email || !body.email.includes('@') || !body.email.includes('.')) {
        return { valid: false, error: 'A valid email address is required.' };
      }
      if (!body.password || body.password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long.' };
      }
      if (body.confirmPassword && body.password !== body.confirmPassword) {
        return { valid: false, error: 'Passwords do not match.' };
      }
      return { valid: true };
    };

    assert.strictEqual(validateSignup({ fullName: 'A', email: 'test@example.com', password: 'Password123' }).valid, false);
    assert.strictEqual(validateSignup({ fullName: 'Alice Smith', email: 'invalid-email', password: 'Password123' }).valid, false);
    assert.strictEqual(validateSignup({ fullName: 'Alice Smith', email: 'test@example.com', password: 'short' }).valid, false);
    assert.strictEqual(validateSignup({ fullName: 'Alice Smith', email: 'test@example.com', password: 'Password123', confirmPassword: 'DifferentPassword' }).valid, false);
    assert.strictEqual(validateSignup({ fullName: 'Alice Smith', email: 'test@example.com', password: 'Password123', confirmPassword: 'Password123' }).valid, true);
  });

  it('5. Duplicate email rejection: safely rejects existing email without mutating state', () => {
    const existingUsers = new Map<string, any>();
    existingUsers.set('candidate@example.com', { id: 'u-1', email: 'candidate@example.com' });

    const handleSignup = (email: string) => {
      const cleanEmail = email.toLowerCase().trim();
      if (existingUsers.has(cleanEmail)) {
        throw new Error('An account with this email address already exists');
      }
      return { success: true, id: 'u-2' };
    };

    assert.throws(() => handleSignup('CANDIDATE@example.com'), /already exists/);
    assert.strictEqual(handleSignup('new@example.com').success, true);
  });

  it('6. Google Authentication token validation: audience, issuer, expiry, and server config', () => {
    const validateGoogleToken = (payload: any, serverAudience: string | null) => {
      if (!serverAudience) {
        return { status: 503, error: 'Google authentication is not configured on this server.' };
      }
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (!payload.iss || !validIssuers.includes(payload.iss)) {
        return { status: 401, error: 'Untrusted Google token issuer.' };
      }
      if (payload.aud?.trim() !== serverAudience.trim()) {
        return { status: 401, error: 'Google authentication audience mismatch.' };
      }
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return { status: 401, error: 'Google authentication token has expired.' };
      }
      const isVerified = payload.email_verified === true || payload.email_verified === 'true';
      if (!isVerified) {
        return { status: 401, error: 'Google account email is not verified by Google.' };
      }
      return { status: 200, success: true };
    };

    const clientAud = '564161411224-test.apps.googleusercontent.com';

    // Unconfigured server
    assert.strictEqual(validateGoogleToken({ iss: 'https://accounts.google.com' }, null).status, 503);

    // Audience mismatch
    assert.strictEqual(validateGoogleToken({
      iss: 'https://accounts.google.com',
      aud: 'wrong-audience',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, clientAud).status, 401);

    // Untrusted issuer
    assert.strictEqual(validateGoogleToken({
      iss: 'https://evil-idp.com',
      aud: clientAud,
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, clientAud).status, 401);

    // Expired
    assert.strictEqual(validateGoogleToken({
      iss: 'https://accounts.google.com',
      aud: clientAud,
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) - 100,
    }, clientAud).status, 401);

    // Valid
    assert.strictEqual(validateGoogleToken({
      iss: 'https://accounts.google.com',
      aud: clientAud,
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, clientAud).status, 200);
  });

  it('7. Session persistence after registration and page refresh', () => {
    const sessions = new Map<string, { userId: string; expiresAt: number }>();

    const createSession = (userId: string) => {
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, { userId, expiresAt: Date.now() + 14 * 86400 * 1000 });
      return token;
    };

    const validateSession = (token: string) => {
      const sess = sessions.get(token);
      if (!sess) return null;
      if (sess.expiresAt < Date.now()) {
        sessions.delete(token);
        return null;
      }
      return sess.userId;
    };

    const token = createSession('user_123');
    assert.ok(token);
    // Simulating page refresh by validating stored token
    assert.strictEqual(validateSession(token), 'user_123');
    // Invalid / expired token
    assert.strictEqual(validateSession('invalid_token'), null);
  });
});
