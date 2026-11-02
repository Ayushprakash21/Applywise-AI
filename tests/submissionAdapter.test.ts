import test from 'node:test';
import assert from 'node:assert/strict';
import { submissionAdapter } from '../server/submissionAdapter.ts';
import { ApplicationRecord, UserProfile } from '../src/types/index.ts';

test('Submission Adapter: Truthful application workflow and zero fake receipts', async () => {
  const profile: UserProfile = {
    id: 'usr_test',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-0199',
    location: 'Austin, TX',
    totalExperienceYears: 5,
    currentEmployer: 'Startup Inc',
    currentTitle: 'Product Manager',
    professionalSummary: 'Product leader',
    education: [],
    certifications: [],
    skills: [],
    experiences: [],
    masterResumeLastUpdated: new Date().toISOString(),
  };

  const appRecord: ApplicationRecord = {
    id: 'app_test_1',
    duplicateKey: 'test::pm::usr_test',
    vacancyId: 'vac_pm',
    company: 'NextGen Tech',
    role: 'Senior Product Manager',
    country: 'United States',
    location: 'Remote',
    jobUrl: 'https://careers.nextgen.io/pm-role',
    matchScore: 88,
    status: 'AUTHORIZED_TO_SUBMIT',
    tailoredResume: {
      headline: 'Product Manager',
      professionalSummary: 'Product leader',
      targetedSkills: ['Roadmapping', 'Agile'],
      tailoredExperiences: [],
      education: [],
      certifications: [],
      truthfulnessScore: 100,
    },
    timeline: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Case 1: Automatic portal submission requires human interaction -> GUIDED_COMPLETION_REQUIRED
  const result1 = await submissionAdapter.processSubmission(appRecord, profile);
  assert.equal(result1.status, 'GUIDED_COMPLETION_REQUIRED');
  assert.ok(result1.guidedApplication);
  assert.equal(result1.guidedApplication.portalUrl, 'https://careers.nextgen.io/pm-role');
  assert.equal(result1.guidedApplication.prefilledFields['Full Name'], 'Jane Doe');

  // Case 2: Candidate completes application and provides genuine confirmation code
  const result2 = await submissionAdapter.processSubmission(appRecord, profile, {
    confirmationCode: 'NEXTGEN-7482',
    employerConfirmationUrl: 'https://careers.nextgen.io/pm-role/confirmed',
  });
  assert.equal(result2.status, 'SUBMITTED_VERIFIED');
  assert.ok(result2.evidence);
  assert.equal(result2.evidence?.verified, true);
  assert.equal(result2.evidence?.confirmationUrl, 'https://careers.nextgen.io/pm-role/confirmed');
});
