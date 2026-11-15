import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('APPLYWISE AI — Header Controls Alignment & Unified Design System Suite', () => {
  const authHeaderPath = path.resolve('src/components/AuthHeader.tsx');
  const themeSwitchPath = path.resolve('src/components/ui/GlobalThemeSwitch.tsx');

  it('1. AuthHeader renders GlobalThemeSwitch with size="header"', () => {
    const src = fs.readFileSync(authHeaderPath, 'utf8');
    assert.ok(
      src.includes('<GlobalThemeSwitch size="header" />'),
      'AuthHeader must use size="header" to match 40px height system'
    );
  });

  it('2. Dimensional Consistency: All three controls share identical 40px (h-10) height', () => {
    const headerSrc = fs.readFileSync(authHeaderPath, 'utf8');
    const switchSrc = fs.readFileSync(themeSwitchPath, 'utf8');

    // Theme Switch has 40px height (h-10)
    assert.ok(
      switchSrc.includes("isLarge ? 'w-[72px] h-10 p-1'") || switchSrc.includes('h-10'),
      'GlobalThemeSwitch must support 40px height (h-10) when isLarge/header'
    );

    // Sign In button has h-10
    assert.ok(
      headerSrc.includes('h-10 px-4 sm:px-5 rounded-full') && headerSrc.includes('Sign In'),
      'Sign In button must use 40px (h-10) height with balanced horizontal padding'
    );

    // Sign Up button has h-10
    assert.ok(
      headerSrc.includes('h-10 px-4 sm:px-5 rounded-full') && headerSrc.includes('Sign Up'),
      'Sign Up button must use 40px (h-10) height with balanced horizontal padding'
    );
  });

  it('3. Unified Corner Radii & Component Family: All three controls use rounded-full capsules', () => {
    const headerSrc = fs.readFileSync(authHeaderPath, 'utf8');
    const switchSrc = fs.readFileSync(themeSwitchPath, 'utf8');

    // Theme Switch is rounded-full
    assert.ok(switchSrc.includes('rounded-full'), 'Theme Switch must be rounded-full');

    // Sign In is rounded-full
    assert.match(
      headerSrc,
      /h-10[^>]*rounded-full[^>]*>[^<]*Sign In/s,
      'Sign In button must use rounded-full'
    );

    // Sign Up is rounded-full (fixing previous rounded-md defect)
    assert.match(
      headerSrc,
      /h-10[^>]*rounded-full[^>]*>[^<]*Sign Up/s,
      'Sign Up button must use rounded-full'
    );
  });

  it('4. Vertical Alignment & Consistent Spacing: Unified flex container with gap-2.5 sm:gap-3', () => {
    const headerSrc = fs.readFileSync(authHeaderPath, 'utf8');
    assert.ok(
      headerSrc.includes('flex items-center gap-2.5 sm:gap-3 shrink-0'),
      'Header controls container must vertically align items (items-center) with gap-2.5 sm:gap-3'
    );
  });

  it('5. Visual Hierarchy: Sign In (Secondary) vs Sign Up (Primary) differentiation preserved', () => {
    const headerSrc = fs.readFileSync(authHeaderPath, 'utf8');

    // Sign In secondary treatment
    assert.ok(
      headerSrc.includes('border border-slate-200/90') || headerSrc.includes('border border-slate-300'),
      'Sign In must retain secondary bordered card styling'
    );

    // Sign Up primary treatment
    assert.ok(
      headerSrc.includes('bg-slate-900') || headerSrc.includes('bg-slate-800'),
      'Sign Up must retain solid high-contrast primary button styling'
    );
  });

  it('6. Functional & Accessibility Preservation', () => {
    const headerSrc = fs.readFileSync(authHeaderPath, 'utf8');
    assert.ok(headerSrc.includes('onNavigateLogin'), 'Must preserve onNavigateLogin');
    assert.ok(headerSrc.includes('onNavigateSignup'), 'Must preserve onNavigateSignup');
    assert.ok(headerSrc.includes('activePage === \'login\''), 'Must preserve login active state');
    assert.ok(headerSrc.includes('activePage === \'signup\''), 'Must preserve signup active state');
  });
});
