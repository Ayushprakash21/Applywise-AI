import test from 'node:test';
import assert from 'node:assert/strict';
import { authAndStore } from '../server/authAndStore.ts';

test('Multi-User Security: Strict per-user data isolation', () => {
  const userA = authAndStore.createUser('Alice Candidate', `alice_${Date.now()}@example.com`, 'SecurePass123!');
  const userB = authAndStore.createUser('Bob Engineer', `bob_${Date.now()}@example.com`, 'SecurePass123!');

  // User A updates profile
  const profileA = authAndStore.getProfile(userA.id)!;
  profileA.currentTitle = 'Lead Architect';
  authAndStore.saveProfile(userA.id, profileA);

  // User B's profile must remain completely separate
  const profileB = authAndStore.getProfile(userB.id)!;
  assert.notEqual(profileB.currentTitle, 'Lead Architect');
  assert.equal(profileB.fullName, 'Bob Engineer');

  // User A creates an application
  authAndStore.saveApplication(userA.id, {
    id: `app_alice_${Date.now()}`,
    duplicateKey: `acme::role::${userA.id}`,
    vacancyId: 'vac_123',
    company: 'Acme Corp',
    role: 'Staff Engineer',
    country: 'United States',
    location: 'Remote',
    jobUrl: 'https://example.com/job',
    matchScore: 92,
    status: 'PREPARED',
    tailoredResume: {
      headline: 'Lead Architect',
      professionalSummary: 'Summary',
      targetedSkills: ['Go', 'Kubernetes'],
      tailoredExperiences: [],
      education: [],
      certifications: [],
      truthfulnessScore: 100,
    },
    timeline: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // User B must NOT see User A's applications
  const userBApps = authAndStore.getApplications(userB.id);
  assert.equal(userBApps.length, 0);

  // User B cannot query User A's application by ID
  const directLookupByB = authAndStore.getApplicationById(userB.id, `app_alice_${Date.now()}`);
  assert.equal(directLookupByB, null);
});
