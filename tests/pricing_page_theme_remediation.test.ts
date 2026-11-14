import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getStoredAppearance, setBlackEliteAppearance } from '../src/utils/blackEliteTheme.ts';

describe('Pricing Page Theme Remediation & Platform-Wide Consistency', () => {
  const pricingPagePath = path.resolve(process.cwd(), 'src/components/PricingPage.tsx');
  const indexCssPath = path.resolve(process.cwd(), 'src/index.css');
  const blackEliteThemePath = path.resolve(process.cwd(), 'src/utils/blackEliteTheme.ts');

  test('PricingPage source code does NOT contain redundant currency toggle in hero header', () => {
    const code = fs.readFileSync(pricingPagePath, 'utf-8');

    // Hero section should not have a second currency toggle
    const heroSectionMatch = code.match(/\{\/\* Hero Header[\s\S]*?\{\/\* User Membership/);
    assert.ok(heroSectionMatch, 'Hero section should be identifiable');
    const heroContent = heroSectionMatch[0];
    assert.strictEqual(
      heroContent.includes('setCurrency('),
      false,
      'Hero header must not contain a duplicate currency toggle'
    );
  });

  test('PricingPage contains single high-contrast currency toggle next to billing interval', () => {
    const code = fs.readFileSync(pricingPagePath, 'utf-8');

    // Should have only 2 setCurrency handlers across the entire component
    const setCurrencyMatches = code.match(/setCurrency\(/g) || [];
    assert.strictEqual(
      setCurrencyMatches.length,
      2,
      `Expected exactly 2 setCurrency invocations (INR and USD in single toggle strip), found ${setCurrencyMatches.length}`
    );
  });

  test('PricingPage Free and Pro cards provide light-compatible backgrounds and dark typography in Light Mode', () => {
    const code = fs.readFileSync(pricingPagePath, 'utf-8');

    // Free Card
    assert.ok(code.includes('data-testid="pricing-card-free"'), 'Free card must have testid');
    assert.ok(
      code.includes('isBlack') && code.includes('bg-white text-slate-900 border'),
      'Free card must render bg-white and text-slate-900 when not in black mode'
    );

    // Pro Card
    assert.ok(code.includes('data-testid="pricing-card-pro"'), 'Pro card must have testid');
    assert.ok(
      code.includes('from-white to-blue-50/50 text-slate-900'),
      'Pro card must render light gradient and dark typography when not in black mode'
    );
  });

  test('PricingPage BLACK ELITE card adapts dynamically between Light ivory surface and Dark obsidian surface', () => {
    const code = fs.readFileSync(pricingPagePath, 'utf-8');

    assert.ok(code.includes('data-testid="pricing-card-black"'), 'BLACK card must have testid');

    // Light mode warm alabaster/ivory inner surface
    assert.ok(
      code.includes('from-[#FAF7F2] to-[#F5EFE6] text-slate-900 border border-[#E8DEC8]'),
      'BLACK card inner container must provide warm ivory light surface in light mode'
    );

    // Dark mode obsidian inner surface
    assert.ok(
      code.includes('bg-[#090B12] text-[#F8F8FC]'),
      'BLACK card inner container must provide obsidian surface in dark mode'
    );

    // Entitlements box adaptive styling
    assert.ok(
      code.includes('bg-white/90 backdrop-blur-xs border border-[#C6A66A]/40 shadow-xs'),
      'BLACK card entitlements box must render light glass card in light mode'
    );
    assert.ok(
      code.includes('bg-amber-50/70 border-amber-200/80'),
      'BLACK card entitlements metric tiles must render warm amber tiles in light mode'
    );

    // RoyalCrownLogo variant propagation
    assert.ok(
      code.includes('RoyalCrownLogo size="lg" animated showWordmark variant={isBlack ? \'dark\' : \'light\'}'),
      'BLACK card must pass variant to RoyalCrownLogo to adapt wordmark contrast'
    );
  });

  test('blackEliteTheme getStoredAppearance defaults to light when storage is unset and syncs both keys', () => {
    const code = fs.readFileSync(blackEliteThemePath, 'utf-8');

    assert.ok(
      code.includes('applyvise_black_appearance') && code.includes('STORAGE_APPEARANCE_KEY'),
      'blackEliteTheme must check both storage keys'
    );
    assert.ok(
      code.includes("return 'light';"),
      "blackEliteTheme getStoredAppearance must default to 'light'"
    );
  });

  test('index.css safely scopes dark utility overrides and protects light mode', () => {
    const css = fs.readFileSync(indexCssPath, 'utf-8');

    assert.ok(
      css.includes('.theme-black-light [class*="bg-[#13161B]"]'),
      'index.css must protect .theme-black-light from #13161B dark bleed'
    );
    assert.ok(
      css.includes('.theme-black-light [class*="bg-[#090B12]"]'),
      'index.css must protect .theme-black-light from #090B12 dark bleed'
    );
  });
});
