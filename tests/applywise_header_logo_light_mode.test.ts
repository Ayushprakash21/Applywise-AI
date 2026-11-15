// tests/applywise_header_logo_light_mode.test.ts
// Unit verification suite for ApplyWise AI Header Logo Light & Dark Mode styling

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('ApplyWise AI — Header Logo Light Mode & Theme-Aware Integrity Suite', () => {
  const brandLogoPath = path.resolve('src/components/BrandLogo.tsx');
  const shellPath = path.resolve('src/components/DashboardShell.tsx');
  const pricingPath = path.resolve('src/components/PricingPage.tsx');

  const brandLogoSrc = fs.readFileSync(brandLogoPath, 'utf8');
  const shellSrc = fs.readFileSync(shellPath, 'utf8');
  const pricingSrc = fs.readFileSync(pricingPath, 'utf8');

  it('1. BrandLogo wordmark uses dark navy #17243A in Light Mode', () => {
    assert.ok(
      brandLogoSrc.includes('#17243A'),
      'BrandLogo must define dark navy #17243A for light mode wordmark'
    );
    assert.ok(
      brandLogoSrc.includes('text-[#17243A]'),
      'BrandLogo must include text-[#17243A] Tailwind class'
    );
  });

  it('2. BrandLogo AI accent uses brand blue #168BDB', () => {
    assert.ok(
      brandLogoSrc.includes('#168BDB'),
      'BrandLogo must use exact brand blue #168BDB for AI accent'
    );
    assert.ok(
      brandLogoSrc.includes('text-[#168BDB]'),
      'BrandLogo must include text-[#168BDB] class'
    );
    // Ensure legacy blue-600 (#2563EB) is replaced
    assert.ok(
      !brandLogoSrc.includes('text-blue-600'),
      'BrandLogo must not use generic text-blue-600'
    );
  });

  it('3. BrandLogo icon uses subtle white/light container with clean border', () => {
    assert.ok(
      brandLogoSrc.includes('bg-white/95'),
      'Icon container must have subtle white background in light mode'
    );
    assert.ok(
      brandLogoSrc.includes('border-slate-200/90') || brandLogoSrc.includes('border-slate-200'),
      'Icon container must have clean border'
    );
    assert.ok(
      brandLogoSrc.includes('rounded-xl') || brandLogoSrc.includes('rounded-lg'),
      'Icon container must use clean rounded borders'
    );
  });

  it('4. BrandLogo removes excessive shadows and grey washed-out appearance', () => {
    assert.ok(
      !brandLogoSrc.includes('drop-shadow-sm'),
      'Must eliminate filter drop-shadow-sm on img to prevent washed-out appearance'
    );
  });

  it('5. BrandLogo preserves white wordmark in Dark Mode', () => {
    assert.ok(
      brandLogoSrc.includes('text-white') || brandLogoSrc.includes('#FFFFFF'),
      'BrandLogo must preserve white text in dark mode'
    );
  });

  it('6. DashboardShell passes variant="auto" to BrandLogo preventing white-on-light-blue bug', () => {
    assert.ok(
      !shellSrc.includes("variant={plan === 'black' ? 'dark' : 'light'}"),
      'Must eliminate buggy variant={plan === black ? dark : light} that caused white text on light-blue header'
    );
    assert.ok(
      shellSrc.includes('variant="auto"'),
      'DashboardShell must use variant="auto" to respect light/dark mode'
    );
  });

  it('7. DashboardShell preserves EliteCrownBadge membership icon and functionality', () => {
    assert.ok(
      shellSrc.includes('<EliteCrownBadge />'),
      'DashboardShell must retain EliteCrownBadge next to BrandLogo'
    );
    assert.ok(
      shellSrc.includes("plan === 'black'"),
      'DashboardShell must conditionally render EliteCrownBadge for BLACK members'
    );
  });

  it('8. PricingPage uses variant="auto" for theme-aware logo rendering', () => {
    assert.ok(
      !pricingSrc.includes("variant={isBlack ? 'dark' : 'light'}"),
      'PricingPage must not force dark variant when isBlack is true in light mode'
    );
    assert.ok(
      pricingSrc.includes('variant="auto"'),
      'PricingPage must use variant="auto"'
    );
  });
});
