// tests/admin_founder_profile.test.ts
// Comprehensive automated test suite for Founder Profile & Photograph Management

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_FOUNDER_PROFILE } from '../src/data/defaultFounderProfile.ts';
import { authAndStore } from '../server/authAndStore.ts';

test('1. Default Founder Profile has complete verified fields', () => {
  assert.equal(DEFAULT_FOUNDER_PROFILE.name, 'Ayush Prakash');
  assert.equal(DEFAULT_FOUNDER_PROFILE.companyName, 'ApplyVise AI');
  assert.equal(DEFAULT_FOUNDER_PROFILE.designation, 'Founder & Product Architect, ApplyVise AI');
  assert.ok(DEFAULT_FOUNDER_PROFILE.bioParagraphs.length >= 3, 'Must contain at least 3 bio paragraphs');
  assert.equal(DEFAULT_FOUNDER_PROFILE.linkedinUrl, 'https://www.linkedin.com/in/ayushprakash21/');
  assert.equal(DEFAULT_FOUNDER_PROFILE.isPublished, true);
  assert.ok(DEFAULT_FOUNDER_PROFILE.expertiseTags.includes('Supply Chain & Operations'));
  assert.ok(DEFAULT_FOUNDER_PROFILE.expertiseTags.includes('Digital Product Strategy'));
  assert.ok(DEFAULT_FOUNDER_PROFILE.expertiseTags.includes('Applied AI Workflows'));
});

test('2. SQLite authAndStore: Table initialization, draft, publish, and revert lifecycle', () => {
  // Ensure starting state is default verified founder profile
  authAndStore.updateFounderProfileDraft(DEFAULT_FOUNDER_PROFILE);
  authAndStore.publishFounderProfile();

  // Initial published profile should exist and contain Ayush Prakash
  const initialPublished = authAndStore.getPublishedFounderProfile();
  assert.ok(initialPublished, 'Initial published profile must not be null');
  assert.equal(initialPublished.name, 'Ayush Prakash');

  const initialAdmin = authAndStore.getAdminFounderProfile();
  assert.ok(initialAdmin.draft, 'Draft must exist');
  assert.equal(initialAdmin.draft.name, 'Ayush Prakash');

  // Update draft
  const updatedDraft = authAndStore.updateFounderProfileDraft({
    name: 'Ayush Prakash (Founder)',
    subtitle: 'MBA • AI Innovator',
    quote: 'Integrity in every job application.',
  });

  assert.equal(updatedDraft.name, 'Ayush Prakash (Founder)');
  assert.equal(updatedDraft.subtitle, 'MBA • AI Innovator');
  assert.equal(updatedDraft.isPublished, false);

  // Separation check: published profile must still be old published profile
  const stillOldPublished = authAndStore.getPublishedFounderProfile();
  assert.equal(stillOldPublished.name, 'Ayush Prakash');
  assert.notEqual(stillOldPublished.name, updatedDraft.name);

  // Admin state reflects modified draft
  const modifiedAdmin = authAndStore.getAdminFounderProfile();
  assert.equal(modifiedAdmin.isDraftModified, true);
  assert.equal(modifiedAdmin.draft.name, 'Ayush Prakash (Founder)');

  // Publish changes
  const published = authAndStore.publishFounderProfile();
  assert.equal(published.name, 'Ayush Prakash (Founder)');
  assert.equal(published.isPublished, true);

  // Public endpoint now reflects published changes
  const newPublic = authAndStore.getPublishedFounderProfile();
  assert.equal(newPublic.name, 'Ayush Prakash (Founder)');
  assert.equal(newPublic.subtitle, 'MBA • AI Innovator');

  // Revert test: update draft, then revert
  authAndStore.updateFounderProfileDraft({ name: 'Unwanted Test Name' });
  const beforeRevert = authAndStore.getAdminFounderProfile();
  assert.equal(beforeRevert.draft.name, 'Unwanted Test Name');

  const reverted = authAndStore.revertFounderProfileDraft();
  assert.equal(reverted.name, 'Ayush Prakash (Founder)');
  assert.equal(authAndStore.getAdminFounderProfile().isDraftModified, false);

  // Cleanup back to original name for consistency
  authAndStore.updateFounderProfileDraft(DEFAULT_FOUNDER_PROFILE);
  authAndStore.publishFounderProfile();
});

test('3. Photo Asset Upload, Storage, and Serving Lifecycle', () => {
  // Create mock base64 image data (1x1 transparent PNG)
  const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const dummyMime = 'image/png';
  const dummySize = 68;

  // Save asset
  const assetId = authAndStore.saveFounderImageAsset({
    dataBase64: dummyBase64,
    mimeType: dummyMime,
    sizeBytes: dummySize,
    fileName: 'founder_headshot.png',
  });

  assert.ok(assetId.startsWith('asset_'), 'Asset ID should have prefix asset_');

  // Retrieve asset directly
  const retrievedAsset = authAndStore.getFounderImageAsset(assetId);
  assert.ok(retrievedAsset, 'Asset should exist');
  assert.equal(retrievedAsset.mime_type, dummyMime);
  assert.equal(retrievedAsset.data_base64, dummyBase64);
  assert.equal(retrievedAsset.file_size, dummySize);

  // Update draft to reference this photo asset
  const photoUrl = `/api/founder-profile/image/${assetId}`;
  authAndStore.updateFounderProfileDraft({
    photoUrl,
    photoAssetId: assetId,
  });

  const adminProfile = authAndStore.getAdminFounderProfile();
  assert.equal(adminProfile.draft.photoUrl, photoUrl);
  assert.equal(adminProfile.draft.photoAssetId, assetId);

  // Published profile still does NOT have the photo until published
  const publishedBefore = authAndStore.getPublishedFounderProfile();
  assert.notEqual(publishedBefore.photoUrl, photoUrl);

  // Now publish
  authAndStore.publishFounderProfile();
  const publishedAfter = authAndStore.getPublishedFounderProfile();
  assert.equal(publishedAfter.photoUrl, photoUrl);

  // Remove photo test
  authAndStore.removeFounderPhoto();
  const afterRemoveDraft = authAndStore.getAdminFounderProfile();
  assert.equal(afterRemoveDraft.draft.photoUrl, null);
  assert.equal(afterRemoveDraft.draft.photoAssetId, null);

  // Publish removal
  authAndStore.publishFounderProfile();
  assert.equal(authAndStore.getPublishedFounderProfile().photoUrl, null);

  // Ensure database restored to default
  authAndStore.updateFounderProfileDraft(DEFAULT_FOUNDER_PROFILE);
  authAndStore.publishFounderProfile();
});

test('4. Component Structure & Verified Profile Preservations', () => {
  const founderSectionCode = fs.readFileSync(path.resolve('src/components/FounderSection.tsx'), 'utf-8');
  const adminConsoleCode = fs.readFileSync(path.resolve('src/components/AdminConsole.tsx'), 'utf-8');
  const adminFounderProfileCode = fs.readFileSync(path.resolve('src/components/AdminFounderProfile.tsx'), 'utf-8');

  // FounderSection verification
  assert.ok(
    founderSectionCode.includes('https://www.linkedin.com/in/ayushprakash21/'),
    'FounderSection must link to verified profile URL'
  );
  assert.ok(
    founderSectionCode.includes('profile.photoUrl ?'),
    'FounderSection must support rendering photoUrl conditionally'
  );
  assert.ok(
    founderSectionCode.includes('Founder & Architect'),
    'FounderSection must maintain AP Monogram fallback'
  );

  // AdminConsole navigation verification
  assert.ok(
    adminConsoleCode.includes("setActiveTab('founder')"),
    'AdminConsole must contain tab navigation to founder profile'
  );
  assert.ok(
    adminConsoleCode.includes('<AdminFounderProfile'),
    'AdminConsole must render AdminFounderProfile'
  );

  // AdminFounderProfile feature verification
  assert.ok(adminFounderProfileCode.includes('Save Draft'), 'Must contain Save Draft action');
  assert.ok(adminFounderProfileCode.includes('Publish to Live'), 'Must contain Publish action');
  assert.ok(adminFounderProfileCode.includes('Revert'), 'Must contain Revert action');
  assert.ok(adminFounderProfileCode.includes('5 * 1024 * 1024'), 'Must enforce 5 MB max size check');
  assert.ok(adminFounderProfileCode.includes('Live Preview'), 'Must support Live Interactive Preview');
});
