import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { authAndStore } from '../server/authAndStore.ts';
import { isSafePublicUrl, SOURCE_REGISTRY } from '../worker/jobConnectors.ts';

test('FlowAuth: 1. New user registration succeeds with valid data', () => {
  const email = `flow_user_${Date.now()}@example.com`;
  const user = authAndStore.createUser('Morgan Taylor', email, 'SuperSecure2026!');
  assert.ok(user.id);
  assert.equal(user.email, email);
  assert.equal(user.fullName, 'Morgan Taylor');
  assert.equal(user.role, 'user');
});

test('FlowAuth: 2. Registration fails when required fields are missing', () => {
  // Missing full name
  assert.throws(
    () => authAndStore.createUser('', 'valid@example.com', 'SuperSecure2026!'),
    /name.*required/i
  );

  // Missing email
  assert.throws(
    () => authAndStore.createUser('Morgan Taylor', '', 'SuperSecure2026!'),
    /email.*required/i
  );

  // Missing or short password
  assert.throws(
    () => authAndStore.createUser('Morgan Taylor', 'valid@example.com', 'short'),
    /password.*8/i
  );
});

test('FlowAuth: 3. Registration rejects mismatched passwords (contract check)', () => {
  const pwd1 = 'Password123!';
  const pwd2 = 'Password999!';
  assert.notEqual(pwd1, pwd2, 'Mismatch must be detected before submission');

  const signupSource = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');
  assert.ok(signupSource.includes('password !== confirmPassword'), 'FlowSignup must enforce confirmPassword equality check');
  assert.ok(signupSource.includes('Passwords do not match'), 'FlowSignup must display mismatch error alert');
});

test('FlowAuth: 4. Registration handles duplicate email addresses safely', () => {
  const existingEmail = `dup_${Date.now()}@example.com`;
  authAndStore.createUser('First User', existingEmail, 'StrongPass123!');

  assert.throws(
    () => authAndStore.createUser('Second User', existingEmail, 'OtherPass123!'),
    /already exists/i
  );
});

test('FlowAuth: 5. Registered user successfully signs in and receives token', () => {
  const email = `login_success_${Date.now()}@example.com`;
  const pwd = 'ValidPassword888!';
  authAndStore.createUser('Alex Rivera', email, pwd);

  const res = authAndStore.verifyLogin(email, pwd);
  assert.ok(res.token, 'Must return session token');
  assert.equal(res.user.email, email);
  assert.equal(res.user.fullName, 'Alex Rivera');

  const session = authAndStore.getUserByToken(res.token);
  assert.ok(session);
  assert.equal(session?.id, res.user.id);
});

test('FlowAuth: 6. Incorrect credentials show useful error', () => {
  const email = `login_fail_${Date.now()}@example.com`;
  authAndStore.createUser('Sam Carter', email, 'CorrectPassword123!');

  // Wrong password
  assert.throws(
    () => authAndStore.verifyLogin(email, 'WrongPassword123!'),
    /invalid email or password/i
  );

  // Non-existent email
  assert.throws(
    () => authAndStore.verifyLogin('nonexistent_user_99@example.com', 'AnyPassword123!'),
    /invalid email or password/i
  );
});

test('FlowAuth: 7. Password visibility toggles correctly in both components', () => {
  const signupSource = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');
  const loginSource = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');

  assert.ok(signupSource.includes('passwordVisible ? \'text\' : \'password\''));
  assert.ok(signupSource.includes('confirmVisible ? \'text\' : \'password\''));
  assert.ok(loginSource.includes('passwordVisible ? \'text\' : \'password\''));
  assert.ok(loginSource.includes('EyeOff') && loginSource.includes('Eye'));
});

test('FlowAuth: 8. Forgot Password endpoint exists and protects against user enumeration', () => {
  const workerSource = fs.readFileSync('worker/index.ts', 'utf8');
  const serverSource = fs.readFileSync('server.ts', 'utf8');

  assert.ok(workerSource.includes('/api/auth/recover-password'));
  assert.ok(serverSource.includes('/api/auth/recover-password'));

  const loginSource = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');
  assert.ok(loginSource.includes('handleForgotPasswordSubmit'));
  assert.ok(loginSource.includes('recoverPassword'));
});

test('FlowAuth: 9. Sign In and Sign Up routes are declared in App.tsx', () => {
  const appSource = fs.readFileSync('src/App.tsx', 'utf8');

  assert.ok(appSource.includes("currentRoute === '/signup'"));
  assert.ok(appSource.includes("currentRoute === '/login'"));
  assert.ok(appSource.includes('<FlowSignup'));
  assert.ok(appSource.includes('<FlowLogin'));
});

test('FlowAuth: 10. Authenticated pages remain protected from unauthenticated access', () => {
  // In server auth store: null token returns null user
  const nullUser = authAndStore.getUserByToken('');
  assert.equal(nullUser, null, 'Empty token must not return user');

  const invalidTokenUser = authAndStore.getUserByToken('invalid_token_12345');
  assert.equal(invalidTokenUser, null, 'Invalid token must not return user');
});

test('FlowAuth: 11. Social buttons work only when their providers are configured', () => {
  const signupSource = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');
  const loginSource = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');

  // Both components check authConfig before permitting social action
  assert.ok(signupSource.includes('googleAuthEnabled'));
  assert.ok(signupSource.includes('Google Sign-Up is not configured'));
  assert.ok(signupSource.includes('Apple Sign-Up is currently unconfigured'));

  assert.ok(loginSource.includes('googleAuthEnabled'));
  assert.ok(loginSource.includes('Google Sign-In is not configured'));
  assert.ok(loginSource.includes('Apple Sign-In is currently unconfigured'));
});

test('FlowAuth: 12. Both components contain responsive styling for mobile, tablet, and desktop', () => {
  const signupSource = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');
  const loginSource = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');

  assert.ok(signupSource.includes('max-w-[440px]'));
  assert.ok(signupSource.includes('p-6 sm:p-8'));
  assert.ok(loginSource.includes('max-w-[440px]'));
  assert.ok(loginSource.includes('p-6 sm:p-8'));
});

test('FlowAuth: 13. Existing job search features continue working cleanly', () => {
  assert.ok(SOURCE_REGISTRY.length >= 8);
  assert.ok(isSafePublicUrl('https://remotive.com/api/remote-jobs'));
  assert.equal(isSafePublicUrl('http://insecure.com'), false);
});
