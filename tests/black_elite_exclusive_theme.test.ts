import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('BLACK ELITE Exclusive Membership Theme Suite', () => {
  const blackCardPath = path.resolve(process.cwd(), 'src/components/pricing/BlackElitePricingCard.tsx');
  const pricingPagePath = path.resolve(process.cwd(), 'src/components/PricingPage.tsx');
  const indexCssPath = path.resolve(process.cwd(), 'src/index.css');
  const plansPath = path.resolve(process.cwd(), 'src/config/plans.ts');
  const royalCrownPath = path.resolve(process.cwd(), 'src/components/RoyalCrownLogo.tsx');

  test('Component exists and exports BlackElitePricingCard', () => {
    assert.ok(fs.existsSync(blackCardPath), 'BlackElitePricingCard.tsx must exist');
    const code = fs.readFileSync(blackCardPath, 'utf-8');
    assert.ok(code.includes('export const BlackElitePricingCard'), 'Must export BlackElitePricingCard');
    assert.ok(code.includes('data-testid="pricing-card-black"'), 'Must maintain data-testid="pricing-card-black"');
  });

  test('Core Visual Specifications: Deep black background, Charcoal inner, Metallic Gold border', () => {
    const code = fs.readFileSync(blackCardPath, 'utf-8');

    // 1. Deep premium black (#090909)
    assert.ok(code.includes('#090909'), 'Card background must use deep premium black #090909');
    assert.match(code, /backgroundColor:\s*'#090909'/, 'Explicit style must lock background to #090909');

    // 2. Charcoal inner surfaces (#191713)
    assert.ok(code.includes('#191713'), 'Inner surfaces must use charcoal #191713');
    assert.match(code, /backgroundColor:\s*'#191713'/, 'Inner entitlements box must use #191713');

    // 3. Metallic gold (#C9A45B)
    assert.ok(code.includes('#C9A45B'), 'Must use metallic gold #C9A45B');
    assert.match(code, /border:\s*'1.5px solid #C9A45B'/, 'Border must be metallic gold 1.5px');

    // 4. Heading: Warm white (#FAF8F5)
    assert.ok(code.includes('#FAF8F5'), 'Heading must use warm white #FAF8F5');

    // 5. Price: Metallic gold (#C9A45B)
    assert.match(code, /color:\s*'#C9A45B'[\s\S]*?₹1,599/, 'Price must be metallic gold #C9A45B');

    // 6. Supporting text: Soft ivory (#D8D3C8)
    assert.ok(code.includes('#D8D3C8'), 'Supporting text must use soft ivory #D8D3C8');

    // 7. CTA: Gold gradient with black text (#090909)
    assert.ok(code.includes('linear-gradient(135deg, #C9A45B 0%, #E2C58A 50%, #C9A45B 100%)'), 'CTA must use metallic gold gradient');
    assert.match(code, /color:\s*isCurrentActive\s*\?\s*'#C9A45B'\s*:\s*'#090909'/, 'CTA button text must be black #090909');

    // 8. Subtle dark shadow with restrained gold illumination
    assert.ok(code.includes('0 20px 40px rgba(0, 0, 0, 0.75), 0 0 24px rgba(201, 164, 91, 0.14)'), 'Must apply restrained gold ambient shadow');
  });

  test('Exclusive Identity: Crown symbol, BLACK ELITE badge, ₹1,599 pricing & 2× Pro Entitlements', () => {
    const cardCode = fs.readFileSync(blackCardPath, 'utf-8');
    const plansCode = fs.readFileSync(plansPath, 'utf-8');

    // Crown emblem & badge
    assert.ok(cardCode.includes('RoyalCrownLogo'), 'Must retain RoyalCrownLogo');
    assert.ok(cardCode.includes('variant="black-elite"'), 'Must use dedicated black-elite logo variant');
    assert.ok(cardCode.includes('BLACK ELITE'), 'Must display BLACK ELITE badge text');

    // ₹1,599 / month pricing
    assert.ok(plansCode.includes('inr: 1599'), 'Pricing configuration must preserve ₹1,599');
    assert.ok(cardCode.includes('₹1,599'), 'Must render ₹1,599 price in INR');

    // Exact 2× Pro Measurable Entitlements
    assert.ok(cardCode.includes('600 req / month'), 'Must display 600 req/mo Copilot quota');
    assert.ok(cardCode.includes('(2× Pro 300)'), 'Must display 2x Pro 300 comparison');
    assert.ok(cardCode.includes('50 / day'), 'Must display 50 daily applications');
    assert.ok(cardCode.includes('(2× Pro 25)'), 'Must display 2x Pro 25 comparison');
    assert.ok(cardCode.includes('60 / month'), 'Must display 60 resume tailorings');
    assert.ok(cardCode.includes('(2× Pro 30)'), 'Must display 2x Pro 30 comparison');
    assert.ok(cardCode.includes('20 sessions'), 'Must display 20 interview prep sessions');
    assert.ok(cardCode.includes('(2× Pro 10)'), 'Must display 2x Pro 10 comparison');
  });

  test('Critical Theme Rules: Never beige/white/ivory, isolated from light mode bleed', () => {
    const cardCode = fs.readFileSync(blackCardPath, 'utf-8');
    const cssCode = fs.readFileSync(indexCssPath, 'utf-8');

    // Never beige, white, or ivory backgrounds for BLACK Elite card
    assert.strictEqual(cardCode.includes('from-[#FAF7F2] to-[#F5EFE6]'), false, 'Must not contain light ivory gradient');
    assert.strictEqual(cardCode.includes('bg-white/90'), false, 'Must not use white background');

    // Theme isolation tokens
    assert.ok(cardCode.includes('data-theme-surface="dark"'), 'Must declare data-theme-surface="dark"');
    assert.ok(cardCode.includes('data-theme-variant="black-elite"'), 'Must declare data-theme-variant="black-elite"');
    assert.ok(cardCode.includes('black-elite-theme-card'), 'Must include class black-elite-theme-card');

    // CSS safety rules in index.css
    assert.ok(cssCode.includes('.black-elite-theme-card,'), 'index.css must provide dedicated rule for black-elite-theme-card');
    assert.ok(cssCode.includes('[data-theme-variant="black-elite"]'), 'index.css must provide dedicated rule for data-theme-variant');
  });

  test('Preserves other pricing plans (Free and Pro untouched)', () => {
    const pricingCode = fs.readFileSync(pricingPagePath, 'utf-8');

    // Free card
    assert.ok(pricingCode.includes('data-testid="pricing-card-free"'), 'Free card must exist');
    assert.ok(pricingCode.includes('SUBSCRIPTION_PLANS.free.name'), 'Free card must use free plan');

    // Pro card
    assert.ok(pricingCode.includes('data-testid="pricing-card-pro"'), 'Pro card must exist');
    assert.ok(pricingCode.includes('SUBSCRIPTION_PLANS.pro.name'), 'Pro card must use pro plan');
    assert.ok(pricingCode.includes('₹799'), 'Pro card must preserve ₹799 price');
  });

  test('RoyalCrownLogo supports black-elite variant with warm white and metallic gold', () => {
    const crownCode = fs.readFileSync(royalCrownPath, 'utf-8');

    assert.ok(crownCode.includes("'black-elite'"), 'variant union must include black-elite');
    assert.ok(crownCode.includes('#FAF8F5'), 'Must render warm white #FAF8F5 for BLACK wordmark in black-elite variant');
    assert.ok(crownCode.includes('#C9A45B'), 'Must render metallic gold #C9A45B for ELITE wordmark');
  });
});
