import test from 'node:test';
import assert from 'node:assert/strict';
import { authAndStore } from '../server/authAndStore.ts';

test('Authentication: User registration, duplicate rejection, and login verification', () => {
  const testEmail = `test_${Date.now()}@example.com`;
  const password = 'SecurePassword123!';

  // 1. Successful registration
  const user = authAndStore.createUser('Jordan Lee', testEmail, password);
  assert.ok(user.id);
  assert.equal(user.email, testEmail);
  assert.equal(user.fullName, 'Jordan Lee');

  // 2. Duplicate email rejection
  assert.throws(
    () => authAndStore.createUser('Jordan Lee Copy', testEmail, password),
    /already exists/i
  );

  // 3. Invalid login rejection (wrong password)
  assert.throws(
    () => authAndStore.verifyLogin(testEmail, 'WrongPassword!'),
    /invalid email or password/i
  );

  // 4. Invalid login rejection (nonexistent email)
  assert.throws(
    () => authAndStore.verifyLogin('nonexistent@example.com', password),
    /invalid email or password/i
  );

  // 5. Successful login & session generation
  const loginRes = authAndStore.verifyLogin(testEmail, password);
  assert.ok(loginRes.token);
  assert.equal(loginRes.user.email, testEmail);

  // 6. Session verification
  const sessionUser = authAndStore.getUserByToken(loginRes.token);
  assert.ok(sessionUser);
  assert.equal(sessionUser?.id, user.id);

  // 7. Logout / Session invalidation
  authAndStore.logoutSession(loginRes.token);
  const loggedOutUser = authAndStore.getUserByToken(loginRes.token);
  assert.equal(loggedOutUser, null);
});
