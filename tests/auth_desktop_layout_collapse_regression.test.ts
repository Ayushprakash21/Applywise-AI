import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('APPLYVISE AI — Auth Desktop Layout Collapse Regression Suite', async (t) => {
  const signupSrc = fs.readFileSync(path.resolve('src/components/FlowSignup.tsx'), 'utf8');
  const loginSrc = fs.readFileSync(path.resolve('src/components/FlowLogin.tsx'), 'utf8');
  const headerSrc = fs.readFileSync(path.resolve('src/components/AuthHeader.tsx'), 'utf8');
  const glassCardSrc = fs.readFileSync(path.resolve('src/components/auth/AuthGlassCard.tsx'), 'utf8');
  const modalSrc = fs.readFileSync(path.resolve('src/components/AuthModals.tsx'), 'utf8');
  const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');

  await t.test('1. Dedicated Form Width Architecture (No 5/12 column squeezing)', () => {
    // Form column must have dedicated shrink-0 and expand up to 540px on desktop
    assert.match(signupSrc, /lg:max-w-\[520px\]|xl:max-w-\[540px\]/, 'FlowSignup must allocate dedicated 520px-540px on desktop');
    assert.match(loginSrc, /lg:max-w-\[520px\]|xl:max-w-\[540px\]/, 'FlowLogin must allocate dedicated 520px-540px on desktop');
    assert.match(signupSrc, /shrink-0/, 'FlowSignup form container must not shrink under artwork pressure');
    assert.match(loginSrc, /shrink-0/, 'FlowLogin form container must not shrink under artwork pressure');
    assert.match(signupSrc, /flex-1 min-w-0/, 'Artwork container must be fluid and never squeeze the form');
    assert.match(loginSrc, /flex-1 min-w-0/, 'Artwork container must be fluid and never squeeze the form');
  });

  await t.test('2. Single-Line Title and Full-Width Inputs', () => {
    assert.match(signupSrc, /whitespace-normal sm:whitespace-nowrap/, 'Signup title must remain on one line where space permits');
    assert.match(loginSrc, /whitespace-normal sm:whitespace-nowrap/, 'Login title must remain on one line where space permits');
    assert.match(signupSrc, /className="w-full pl-10 pr-4/, 'Inputs must occupy full width inside form');
    assert.match(loginSrc, /className="w-full pl-10 pr-4/, 'Inputs must occupy full width inside form');
  });

  await t.test('3. AuthGlassCard Does Not Hardcode Stranglehold Width', () => {
    assert.doesNotMatch(glassCardSrc, /className=\{\`relative w-full max-w-\[450px\]/, 'AuthGlassCard must not force max-w-[450px]');
    assert.match(glassCardSrc, /hasMaxWidth/, 'AuthGlassCard must respect caller max-width constraints');
  });

  await t.test('4. AuthHeader Navigation Links Never Wrap Individually', () => {
    assert.match(headerSrc, /whitespace-nowrap transition-colors hover:text-slate-900/, 'Nav links must have whitespace-nowrap');
    assert.match(headerSrc, /mobileMenuOpen/, 'AuthHeader must provide mobile menu toggle');
  });

  await t.test('5. AuthModals Does Not Duplicate Full-Page Header & Background', () => {
    assert.match(modalSrc, /isModal=\{true\}/, 'AuthModals must specify isModal={true}');
    assert.match(signupSrc, /if \(isModal\)/, 'FlowSignup must handle isModal cleanly without header duplication');
    assert.match(loginSrc, /if \(isModal\)/, 'FlowLogin must handle isModal cleanly without header duplication');
  });

  await t.test('6. Clean Route Transitions from Copilot & App Actions', () => {
    assert.doesNotMatch(appSrc, /onOpenAuth=\{mode => \{\s*setAuthModalMode\(mode\);\s*setAuthModalOpen\(true\);/s, 'AICopilot onOpenAuth must route cleanly rather than popping overlay over entire page');
  });
});
