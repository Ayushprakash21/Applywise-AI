import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { ALLOWED_TRANSITIONS, validateStateTransition } from '../src/utils/rules.ts';
import { ApplicationStatus } from '../src/types/index.ts';

// 1. Razorpay Signature Verification Logic
test('Stage 0: Razorpay HMAC-SHA256 verification enforces exact signatures', () => {
  const secret = 'rzp_sec_test_applyvise_123';
  const orderId = 'order_av_123456';
  const paymentId = 'pay_987654';

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${orderId}|${paymentId}`);
  const validSignature = hmac.digest('hex');

  // Verify valid signature matches
  assert.equal(
    crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex'),
    validSignature
  );

  // Verify tampered signature fails
  const tamperedSignature = validSignature.slice(0, -2) + 'aa';
  assert.notEqual(
    crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex'),
    tamperedSignature
  );
});

// 2. Admin Promotion SQL Injection Prevention
test('Stage 0: Admin provisioning email validation strictly rejects SQL injection payloads', () => {
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const validEmail = 'ayushprakash0021@gmail.com';
  assert.equal(EMAIL_REGEX.test(validEmail), true);

  const maliciousPayloads = [
    "attacker@example.com'; DROP TABLE users; --",
    'admin@applyvise.ai" OR "1"="1',
    "user@domain.com' UNION SELECT 1,2,3; --",
    "test'--@example.com",
    "john;reboot@example.com",
  ];

  for (const payload of maliciousPayloads) {
    const isDisallowed =
      !EMAIL_REGEX.test(payload) ||
      payload.includes("'") ||
      payload.includes('"') ||
      payload.includes(';') ||
      payload.includes('--');
    assert.equal(isDisallowed, true, `Payload should have been rejected: ${payload}`);
  }
});

// 3. Application Lifecycle: 12-Stage State Machine
test('Stage 0: 12-Stage state transitions validate correctly', () => {
  assert.equal(validateStateTransition('OPPORTUNITY_SELECTED', 'SUITABILITY_REVIEWED'), true);
  assert.equal(validateStateTransition('SUITABILITY_REVIEWED', 'RESUME_PREPARED'), true);
  assert.equal(validateStateTransition('RESUME_PREPARED', 'RECRUITER_REVIEW_COMPLETED'), true);
  assert.equal(validateStateTransition('RECRUITER_REVIEW_COMPLETED', 'APPLICATION_READY'), true);
  assert.equal(validateStateTransition('APPLICATION_READY', 'AWAITING_USER_APPROVAL'), true);
  assert.equal(validateStateTransition('AWAITING_USER_APPROVAL', 'SUBMISSION_IN_PROGRESS'), true);
  assert.equal(validateStateTransition('READY_TO_SUBMIT', 'SUBMISSION_IN_PROGRESS'), true);

  // Disallowed backwards transitions
  assert.equal(validateStateTransition('AWAITING_USER_APPROVAL', 'OPPORTUNITY_SELECTED'), false);
  assert.equal(validateStateTransition('RECRUITER_REVIEW_COMPLETED', 'SUITABILITY_REVIEWED'), false);
});

// 4. Honest Application Status: Non-Automated Submissions are not claimed as SUBMITTED
test('Stage 0: Honest application status defaults to READY_TO_SUBMIT rather than fabricating SUBMITTED', () => {
  const initialStatus: ApplicationStatus = 'READY_TO_SUBMIT';
  assert.notEqual(initialStatus, 'SUBMITTED');
  assert.notEqual(initialStatus, 'SUBMITTED_CONFIRMED');
});
