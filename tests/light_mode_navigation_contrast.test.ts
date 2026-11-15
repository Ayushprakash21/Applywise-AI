import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('APPLYWISE AI — Light Mode Header Navigation Contrast Suite', () => {
  const landingPath = path.resolve('src/components/LandingPage.tsx');
  const cssPath = path.resolve('src/index.css');
  const brandLogoPath = path.resolve('src/components/BrandLogo.tsx');

  const landingSrc = fs.readFileSync(landingPath, 'utf8');
  const cssSrc = fs.readFileSync(cssPath, 'utf8');
  const logoSrc = fs.readFileSync(brandLogoPath, 'utf8');

  it('1. All navigation links in light mode use dark readable navy/charcoal (#1B2638)', () => {
    assert.ok(
      landingSrc.includes('text-[#1B2638]'),
      'LandingPage navigation must define dark readable navy #1B2638 for light mode'
    );
    assert.ok(
      cssSrc.includes('color: #1B2638 !important;'),
      'index.css must enforce #1B2638 color for header navigation links in light mode'
    );
  });

  it('2. BrandLogo wordmark adapts automatically to light mode (variant="auto")', () => {
    assert.ok(
      landingSrc.includes('<BrandLogo\n            variant="auto"') || landingSrc.includes('variant="auto"'),
      'LandingPage must pass variant="auto" to BrandLogo'
    );
    assert.ok(
      logoSrc.includes('text-[#17243A]'),
      'BrandLogo must define dark navy wordmark for light mode'
    );
    assert.ok(
      logoSrc.includes('text-[#168BDB]'),
      'BrandLogo must preserve brand blue #168BDB for AI accent'
    );
  });

  it('3. Sign In text is dark and clearly readable (#1B2638) in light mode', () => {
    assert.ok(
      landingSrc.includes('text-[#1B2638] hover:text-[#0788D1] dark:text-slate-200 dark:hover:text-white') &&
      landingSrc.includes('aria-label="Sign In"'),
      'Sign In button must use #1B2638 in light mode with accessible hover'
    );
  });

  it('4. Get Started Free button preserves gold background (#F4B942) with dark legible text (#080F1C)', () => {
    assert.ok(
      landingSrc.includes('bg-[#F4B942]') && landingSrc.includes('text-[#080F1C]'),
      'Get Started Free button must pair gold background (#F4B942) with dark text (#080F1C)'
    );
  });

  it('5. Subtle hover state uses ApplyWise blue (#0788D1)', () => {
    assert.ok(
      landingSrc.includes('hover:text-[#0788D1]'),
      'Navigation links and buttons must define hover:text-[#0788D1] for light mode'
    );
    assert.ok(
      cssSrc.includes('color: #0788D1 !important;'),
      'index.css must define hover color #0788D1 for header nav items'
    );
  });

  it('6. Header background is theme-aware: warm-white in light mode, deep navy in dark mode', () => {
    assert.ok(
      landingSrc.includes('bg-[#F5F3EE]/95 dark:bg-[#080F1C]/85') ||
      landingSrc.includes('bg-[#F5F3EE]/90 dark:bg-[#080F1C]/35'),
      'Header must specify warm-white background for light mode and deep navy for dark mode'
    );
  });

  it('7. Mobile navigation drawer, hamburger button, and icons are theme-aware', () => {
    // Hamburger button
    assert.ok(
      landingSrc.includes('text-[#1B2638] hover:text-[#0788D1] dark:text-slate-200 dark:hover:text-white'),
      'Mobile hamburger button must use theme-aware contrast colors'
    );
    assert.ok(
      landingSrc.includes('text-current'),
      'SVG menu icons must inherit text-current rather than hardcoded text-white'
    );
    // Mobile drawer background
    assert.ok(
      landingSrc.includes('bg-[#F5F3EE]/95 dark:bg-[#080F1C]/95'),
      'Mobile drawer must use theme-aware background in light mode'
    );
  });

  it('8. Active navigation links are visually distinguishable with activeSection state', () => {
    assert.ok(
      landingSrc.includes('activeSection ==='),
      'LandingPage must track and indicate active section'
    );
    assert.ok(
      landingSrc.includes('text-[#0788D1] dark:text-[#F4B942] font-bold'),
      'Active navigation links must be highlighted in ApplyWise blue / gold without losing contrast'
    );
  });
});
