import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Onboarding Progress Bar: 1. CSS grid requirements are strictly met', () => {
  const modalSrc = fs.readFileSync('src/components/ResumeOnboardingModal.tsx', 'utf8');

  // Verify display: grid and 5 equal columns
  assert.ok(modalSrc.includes("gridTemplateColumns: 'repeat(5, minmax(0, 1fr))'"), 'Must use repeat(5, minmax(0, 1fr))');
  assert.ok(modalSrc.includes("display: 'grid'"), 'Must explicitly define display: grid');
  assert.ok(modalSrc.includes("minWidth: 0") || modalSrc.includes("min-w-0"), 'Grid cells must have min-width: 0 to prevent text blowout');
  assert.ok(modalSrc.includes("boxSizing: 'border-box'") || modalSrc.includes("box-border"), 'Must use box-sizing: border-box');
  assert.ok(modalSrc.includes("width: '100%'") || modalSrc.includes("w-full"), 'Must use width: 100%');
  assert.ok(modalSrc.includes("maxWidth: '100%'") || modalSrc.includes("max-w-full"), 'Must use max-width: 100%');
});

test('Onboarding Progress Bar: 2. All 5 steps are properly registered and labeled', () => {
  const modalSrc = fs.readFileSync('src/components/ResumeOnboardingModal.tsx', 'utf8');

  assert.ok(modalSrc.includes("label: 'Uploading document'"), 'Step 1 must be Uploading document');
  assert.ok(modalSrc.includes("label: 'Extracting text'"), 'Step 2 must be Extracting text');
  assert.ok(modalSrc.includes("label: 'Analyzing profile'"), 'Step 3 must be Analyzing profile');
  assert.ok(modalSrc.includes("label: 'Validating fields'"), 'Step 4 must be Validating fields');
  assert.ok(modalSrc.includes("label: 'Ready for review'"), 'Step 5 must be Ready for review');
});

test('Onboarding Progress Bar: 3. Independent progress track line exists and represents stage percentages', () => {
  const modalSrc = fs.readFileSync('src/components/ResumeOnboardingModal.tsx', 'utf8');

  assert.ok(modalSrc.includes('getProgressPercentage'), 'Must have progress percentage calculation');
  assert.ok(modalSrc.includes("case 'uploading': return 20"), 'Step 1 uploading must be 20%');
  assert.ok(modalSrc.includes("case 'extracting': return 40"), 'Step 2 extracting must be 40%');
  assert.ok(modalSrc.includes("case 'analyzing': return 60"), 'Step 3 analyzing must be 60%');
  assert.ok(modalSrc.includes("case 'validating': return 80"), 'Step 4 validating must be 80%');
  assert.ok(modalSrc.includes("case 'review': return 100"), 'Step 5 review must be 100%');
  assert.ok(modalSrc.includes('data-testid="progress-fill-desktop"'), 'Must have desktop progress track fill element');
});

test('Onboarding Progress Bar: 4. Responsive mobile compact view is implemented (< 640px)', () => {
  const modalSrc = fs.readFileSync('src/components/ResumeOnboardingModal.tsx', 'utf8');

  assert.ok(modalSrc.includes('sm:hidden'), 'Must hide mobile view on >= sm screens');
  assert.ok(modalSrc.includes('hidden sm:block'), 'Must hide desktop 5-step grid on mobile screens');
  assert.ok(modalSrc.includes('data-testid="progress-mobile-compact"'), 'Must have mobile compact progress testid');
  assert.ok(modalSrc.includes('data-testid="progress-fill-mobile"'), 'Must have mobile progress track fill element');
  assert.ok(modalSrc.includes('Step {getCurrentStepInfo().stepNum} of 5:'), 'Must show Step X of 5 on mobile');
});

test('Onboarding Progress Bar: 5. No horizontal overflow or large fixed gaps', () => {
  const modalSrc = fs.readFileSync('src/components/ResumeOnboardingModal.tsx', 'utf8');

  assert.ok(!modalSrc.includes('overflow-x-auto text-[11px] gap-2'), 'Must eliminate old overflow-x-auto clipping container');
  assert.ok(modalSrc.includes('overflow-hidden shrink-0'), 'Container must have overflow-hidden to prevent horizontal scrollbar');
  assert.ok(modalSrc.includes('truncate'), 'Step text must truncate gracefully without expanding column');
});
