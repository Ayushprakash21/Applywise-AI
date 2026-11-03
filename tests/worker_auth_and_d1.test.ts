// tests/worker_auth_and_d1.test.ts
// Verification of Worker WebCrypto authentication, token handling, and input validation

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, generateSessionToken, validateEmail, validatePassword } from '../worker/auth.ts';

test('Worker Auth: WebCrypto PBKDF2 hashing and verification', async () => {
  const password = 'SuperSecurePassword2026!';
  const hash = await hashPassword(password);

  assert.ok(hash.startsWith('pbkdf2:'), 'Hash must have pbkdf2 prefix');
  const parts = hash.split(':');
  assert.equal(parts.length, 3, 'Hash must contain prefix, salt, and key');

  const valid = await verifyPassword(password, hash);
  assert.equal(valid, true, 'Correct password must verify successfully');

  const wrong = await verifyPassword('WrongPassword123!', hash);
  assert.equal(wrong, false, 'Incorrect password must be rejected');
});

test('Worker Auth: Token generation and input validation', () => {
  const token1 = generateSessionToken();
  const token2 = generateSessionToken();

  assert.equal(token1.length, 64, 'Token must be 64-char hex string (32 bytes)');
  assert.notEqual(token1, token2, 'Generated tokens must be distinct');

  assert.equal(validateEmail('test@applyvise.ai'), true);
  assert.equal(validateEmail('invalid-email'), false);
  assert.equal(validateEmail(''), false);

  assert.equal(validatePassword('12345678'), true);
  assert.equal(validatePassword('short'), false);
});
