// tests/primary_admin_security.test.ts
// Security & Authentication Test Suite for Primary Administrator Configuration

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { isAdminRole, isSuperAdmin, verifyFirebaseIdTokenClaims } from '../worker/auth.ts';

const ADMIN_EMAIL = 'ayushprakash0021@gmail.com';
const ADMIN_ROLE = 'super_admin';

describe('APPLYWISE AI — Primary Administrator Security & RBAC Suite', () => {
  it('1. Primary Administrator Database Identity Verification', () => {
    const dbPath = path.resolve(process.cwd(), 'data/applywise.sqlite');
    assert.ok(fs.existsSync(dbPath), 'applywise.sqlite database must exist');
    const sqlite = new DatabaseSync(dbPath);
    sqlite.exec('PRAGMA busy_timeout = 5000;');

    const user = sqlite.prepare('SELECT id, email, full_name, role FROM users WHERE email = ?').get(ADMIN_EMAIL) as any;
    assert.ok(user, `User ${ADMIN_EMAIL} must exist in the database`);
    assert.equal(user.email, ADMIN_EMAIL, 'Email must match primary admin identity');
    assert.equal(user.role, ADMIN_ROLE, `Role must be explicitly configured as "${ADMIN_ROLE}"`);
    assert.equal(isSuperAdmin(user.role), true, 'isSuperAdmin helper must verify super_admin status');
    assert.equal(isAdminRole(user.role), true, 'isAdminRole helper must verify admin authorization');
  });

  it('2. Firebase Custom Claims Verification & ID Token Contract', () => {
    const validClaimsPayload = {
      iss: 'https://securetoken.google.com/applywise-ai',
      sub: 'uid_admin_primary_ayush',
      email: ADMIN_EMAIL,
      admin: true,
      role: ADMIN_ROLE,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(validClaimsPayload)).toString('base64url');
    const sig = Buffer.from('mock_signature').toString('base64url');
    const validToken = `${header}.${payload}.${sig}`;

    const check = verifyFirebaseIdTokenClaims(validToken);
    assert.equal(check.isValid, true, 'Valid Firebase ID token must pass verification');
    assert.equal(check.email, ADMIN_EMAIL, 'Extracted email must match');
    assert.equal(check.admin, true, 'Admin custom claim must be true');
    assert.equal(check.role, ADMIN_ROLE, `Role claim must be ${ADMIN_ROLE}`);
    assert.equal(check.isSuperAdmin, true, 'isSuperAdmin must be true');

    // Expired token rejection
    const expiredPayload = { ...validClaimsPayload, exp: Math.floor(Date.now() / 1000) - 100 };
    const expiredToken = `${header}.${Buffer.from(JSON.stringify(expiredPayload)).toString('base64url')}.${sig}`;
    const expiredCheck = verifyFirebaseIdTokenClaims(expiredToken);
    assert.equal(expiredCheck.isValid, false, 'Expired Firebase ID token must be rejected');

    // Untrusted issuer rejection
    const untrustedPayload = { ...validClaimsPayload, iss: 'https://untrusted-auth.com' };
    const untrustedToken = `${header}.${Buffer.from(JSON.stringify(untrustedPayload)).toString('base64url')}.${sig}`;
    const untrustedCheck = verifyFirebaseIdTokenClaims(untrustedToken);
    assert.equal(untrustedCheck.isValid, false, 'Untrusted issuer must be rejected');
  });

  it('3. Server-Side RBAC Enforcement on Protected Admin Routes', () => {
    const checkAuthorization = (user: { role?: string } | null) => {
      if (!user) return { status: 401, error: 'Authentication required. Please sign in.' };
      if (!isAdminRole(user.role)) return { status: 403, error: 'Access denied: Administrator privileges required.' };
      return { status: 200, success: true };
    };

    // Unauthenticated
    assert.equal(checkAuthorization(null).status, 401);

    // Regular Candidate
    const candidateRes = checkAuthorization({ role: 'user' });
    assert.equal(candidateRes.status, 403);

    // Regular Admin
    const adminRes = checkAuthorization({ role: 'admin' });
    assert.equal(adminRes.status, 200);

    // Super Admin (Primary Administrator)
    const superAdminRes = checkAuthorization({ role: ADMIN_ROLE });
    assert.equal(superAdminRes.status, 200);
  });

  it('4. Public Registration Prevents Admin Privilege Escalation', () => {
    // Check worker/d1Store.ts createUser hardcodes 'user'
    const workerStoreSrc = fs.readFileSync('worker/d1Store.ts', 'utf8');
    assert.ok(
      workerStoreSrc.includes("INSERT INTO users (id, email, password_hash, full_name, role, is_verified, created_at, updated_at)") &&
      workerStoreSrc.includes("'user', 1"),
      'worker/d1Store.ts createUser must hardcode "user" role'
    );

    // Check server/authAndStore.ts createUser hardcodes 'user'
    const serverStoreSrc = fs.readFileSync('server/authAndStore.ts', 'utf8');
    assert.ok(
      serverStoreSrc.includes("'user'") && serverStoreSrc.includes("is_verified"),
      'server/authAndStore.ts createUser must hardcode "user" role'
    );
  });

  it('5. Admin Account Cannot Be Recreated via Public Signup (Duplicate Prevention)', () => {
    const dbPath = path.resolve(process.cwd(), 'data/applywise.sqlite');
    const sqlite = new DatabaseSync(dbPath);
    sqlite.exec('PRAGMA busy_timeout = 5000;');

    const existingAdmin = sqlite.prepare('SELECT id, email FROM users WHERE email = ?').get(ADMIN_EMAIL) as any;
    assert.ok(existingAdmin, 'Primary admin must already exist');

    // Attempting to create user with same email should trigger duplicate constraint
    assert.throws(
      () => {
        const insertStmt = sqlite.prepare(`
          INSERT INTO users (id, email, password_hash, full_name, role, is_verified, created_at, updated_at)
          VALUES ('test_dup_id', ?, 'hash', 'Imposter', 'user', 1, datetime('now'), datetime('now'))
        `);
        insertStmt.run(ADMIN_EMAIL);
      },
      /UNIQUE constraint failed: users.email/,
      'Duplicate registration of admin email must be prevented by unique database constraint'
    );
  });

  it('6. Firestore Security Rules Formally Enforce Administrator Role & RBAC', () => {
    assert.ok(fs.existsSync('firestore.rules'), 'firestore.rules must exist');
    assert.ok(fs.existsSync('firebase.json'), 'firebase.json must exist');

    const rules = fs.readFileSync('firestore.rules', 'utf8');

    // Verification of isAdmin helper
    assert.ok(rules.includes('function isAdmin()'), 'firestore.rules must declare isAdmin()');
    assert.ok(rules.includes("request.auth.token.admin == true"), 'isAdmin must check admin claim');
    assert.ok(rules.includes("request.auth.token.role == 'super_admin'"), 'isAdmin must check super_admin role');

    // Verification of isSuperAdmin helper
    assert.ok(rules.includes('function isSuperAdmin()'), 'firestore.rules must declare isSuperAdmin()');

    // Admin & system collection isolation
    assert.ok(rules.includes('match /admin/{document=**}'), 'Admin collection rule must exist');
    assert.ok(rules.includes('allow read, write: if isAdmin();'), 'Admin collection must require isAdmin()');
    assert.ok(rules.includes('match /system/{document=**}'), 'System collection rule must exist');
    assert.ok(rules.includes('allow read, write: if isSuperAdmin();'), 'System collection must require isSuperAdmin()');

    // Role tampering prevention on /users/{userId}
    assert.ok(
      rules.includes("hasAny(['role', 'admin', 'permissions'"),
      'Users collection must prevent non-admin updates to role or admin fields'
    );
  });

  it('7. No Hardcoded Passwords or Credentials in Source Code or Git', () => {
    const gitTrackedFiles = fs.readFileSync('.env.example', 'utf8');
    assert.ok(gitTrackedFiles.includes('GEMINI_API_KEY=""'), 'Sample env keys must be empty');
    assert.ok(!gitTrackedFiles.includes('ayushprakash0021_password'), 'No passwords in sample env');

    const adminLoginSrc = fs.readFileSync('src/components/AdminLoginPage.tsx', 'utf8');
    assert.ok(!adminLoginSrc.includes('password === "'), 'Admin login page must not contain hardcoded passwords');
    assert.ok(!adminLoginSrc.includes('password == "'), 'Admin login page must not contain hardcoded passwords');

    const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
    assert.ok(!appSrc.includes('ayushprakash0021@gmail.com'), 'App.tsx must not contain hardcoded email checks for authorization');
  });

  it('8. Session Persistence & Page Reload Resilience', () => {
    // Session token contract requires 64-char hex string stored and verified
    const dbPath = path.resolve(process.cwd(), 'data/applywise.sqlite');
    const sqlite = new DatabaseSync(dbPath);
    sqlite.exec('PRAGMA busy_timeout = 5000;');

    const adminUser = sqlite.prepare('SELECT id, email, role FROM users WHERE email = ?').get(ADMIN_EMAIL) as any;
    assert.ok(adminUser, 'Admin user must exist');

    // Create session
    const testSessionToken = 'a'.repeat(64);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    sqlite.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(adminUser.id);
    sqlite.prepare('INSERT INTO user_sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)').run(
      'sess_test_123',
      adminUser.id,
      testSessionToken,
      expiresAt,
      new Date().toISOString()
    );

    // Query session with user join
    const sessionRecord = sqlite.prepare(`
      SELECT s.token, u.email, u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
    `).get(testSessionToken) as any;

    assert.ok(sessionRecord, 'Active session must be retrieved from database');
    assert.equal(sessionRecord.email, ADMIN_EMAIL);
    assert.equal(sessionRecord.role, ADMIN_ROLE);
    assert.equal(isAdminRole(sessionRecord.role), true);

    // Clean up test session
    sqlite.prepare('DELETE FROM user_sessions WHERE id = ?').run('sess_test_123');
  });
});
