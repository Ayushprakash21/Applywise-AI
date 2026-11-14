import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BRAND_CONFIG } from '../src/config/brand.ts';

describe('ApplyVise AI — Global Brand Positioning Suite', () => {
  const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
  const brandConfigPath = path.resolve(process.cwd(), 'src/config/brand.ts');
  const heroPath = path.resolve(process.cwd(), 'src/components/hero/CareerIntelligenceHero.tsx');
  const footerPath = path.resolve(process.cwd(), 'src/components/GlobalFooter.tsx');
  const aboutPath = path.resolve(process.cwd(), 'src/components/AboutPage.tsx');
  const loginPath = path.resolve(process.cwd(), 'src/components/FlowLogin.tsx');
  const signupPath = path.resolve(process.cwd(), 'src/components/FlowSignup.tsx');

  test('1. Centralized Brand Configuration contains exact approved statements', () => {
    assert.strictEqual(
      BRAND_CONFIG.headline,
      "India's First AI-Powered Job Discovery & Application Automation Platform."
    );
    assert.strictEqual(
      BRAND_CONFIG.tagline,
      'Find opportunities before the crowd. Let AI do the heavy lifting.'
    );
    assert.strictEqual(
      BRAND_CONFIG.description,
      'ApplyVise combines global job discovery, intelligent job matching, AI resume engineering, recruiter intelligence and automated applications to transform how people find and apply for jobs.'
    );
    // Claim substantiation check
    assert.strictEqual(BRAND_CONFIG.claims.substantiationRequired, true);
    assert.ok(BRAND_CONFIG.claims.substantiationNote.length > 0);
  });

  test('2. HTML and Open Graph metadata reflect approved positioning', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');
    assert.ok(html.includes("India's First AI-Powered Job Discovery"));
    assert.ok(html.includes(BRAND_CONFIG.description));
    assert.ok(html.includes(BRAND_CONFIG.tagline));

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.ok(manifest.name.includes('Job Discovery & Application Automation'));
    assert.ok(manifest.description.includes('Find opportunities before the crowd'));
  });

  test('3. Homepage Hero displays official headline, tagline, and description', () => {
    const heroCode = fs.readFileSync(heroPath, 'utf-8');
    assert.ok(heroCode.includes("India&apos;s First") || heroCode.includes("India's First"));
    assert.ok(heroCode.includes('AI-Powered Job Discovery &amp; Application Automation Platform.'));
    assert.ok(heroCode.includes('BRAND_CONFIG.tagline') || heroCode.includes('Find opportunities before the crowd'));
    assert.ok(heroCode.includes('BRAND_CONFIG.description') || heroCode.includes('ApplyVise combines global job discovery'));
  });

  test('4. GlobalFooter uses approved tagline & description and removes deprecated slogans', () => {
    const footerCode = fs.readFileSync(footerPath, 'utf-8');
    assert.ok(footerCode.includes('BRAND_CONFIG.tagline') || footerCode.includes('Find opportunities before the crowd'));
    assert.ok(footerCode.includes('BRAND_CONFIG.description') || footerCode.includes('ApplyVise combines global job discovery'));
    assert.strictEqual(
      footerCode.includes('Your Career. Intelligently Orchestrated.'),
      false,
      'Old slogan "Your Career. Intelligently Orchestrated." must not appear in GlobalFooter'
    );
    assert.strictEqual(
      footerCode.includes('Discover opportunities. Build your professional edge.'),
      false,
      'Old supporting text must not appear in GlobalFooter'
    );
  });

  test('5. Auth Pages (Login & Signup) default to approved brand tagline', () => {
    const loginCode = fs.readFileSync(loginPath, 'utf-8');
    const signupCode = fs.readFileSync(signupPath, 'utf-8');
    assert.ok(loginCode.includes('BRAND_CONFIG.tagline') || loginCode.includes('Find opportunities before the crowd'));
    assert.ok(signupCode.includes('BRAND_CONFIG.tagline') || signupCode.includes('Find opportunities before the crowd'));
  });

  test('6. About Page consumes centralized brand positioning', () => {
    const aboutCode = fs.readFileSync(aboutPath, 'utf-8');
    assert.ok(aboutCode.includes("India&apos;s First AI-Powered Job Discovery &amp; Application Automation Platform."));
    assert.ok(aboutCode.includes('BRAND_CONFIG.description') || aboutCode.includes('ApplyVise combines global job discovery'));
    assert.ok(aboutCode.includes('BRAND_CONFIG.tagline') || aboutCode.includes('Find opportunities before the crowd'));
  });

  test('7. Obsolete slogans are eliminated across user-facing brand surfaces', () => {
    const filesToAudit = [indexHtmlPath, heroPath, footerPath, aboutPath, loginPath, signupPath];
    for (const filePath of filesToAudit) {
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.strictEqual(
        content.includes('Your Career. Intelligently Orchestrated.'),
        false,
        `File ${path.basename(filePath)} still contains "Your Career. Intelligently Orchestrated."`
      );
      assert.strictEqual(
        content.includes('CAREER OPERATING SYSTEM') || content.includes('Career Operating System Architecture'),
        false,
        `File ${path.basename(filePath)} still contains obsolete Career Operating System branding`
      );
    }
  });
});
