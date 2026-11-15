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

  test('PricingPage renders dedicated BlackElitePricingCard with permanent BLACK + GOLD identity', () => {
    const code = fs.readFileSync(pricingPagePath, 'utf-8');
    const blackCardPath = path.resolve(process.cwd(), 'src/components/pricing/BlackElitePricingCard.tsx');
    const blackCardCode = fs.readFileSync(blackCardPath, 'utf-8');

    // PricingPage integrates BlackElitePricingCard
    assert.ok(code.includes('BlackElitePricingCard'), 'PricingPage must import and render BlackElitePricingCard');
    assert.ok(blackCardCode.includes('data-testid="pricing-card-black"'), 'BLACK card must have testid');

    // Visual specifications verification
    assert.ok(blackCardCode.includes('#090909'), 'Card background must be deep premium black #090909');
    assert.ok(blackCardCode.includes('#C9A45B'), 'Border and accents must use metallic gold #C9A45B');
    assert.ok(blackCardCode.includes('#191713'), 'Inner surfaces must use charcoal #191713');
    assert.ok(blackCardCode.includes('#FAF8F5'), 'Headings must use warm white #FAF8F5');
    assert.ok(blackCardCode.includes('#D8D3C8'), 'Supporting text must use soft ivory #D8D3C8');

    // Permanent theme variant markers
    assert.ok(blackCardCode.includes('data-theme-variant="black-elite"'), 'Must define black-elite theme variant');
    assert.ok(blackCardCode.includes('data-theme-surface="dark"'), 'Must declare dark surface to prevent light mode bleed');
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
