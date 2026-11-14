import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('ApplyVise AI — Brand Positioning & Unified Global Footer Integrity Suite', async (t) => {
  const globalFooterPath = path.resolve(process.cwd(), 'src/components/GlobalFooter.tsx');
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const landingPagePath = path.resolve(process.cwd(), 'src/components/LandingPage.tsx');
  const aboutPagePath = path.resolve(process.cwd(), 'src/components/AboutPage.tsx');
  const pricingPagePath = path.resolve(process.cwd(), 'src/components/PricingPage.tsx');
  const notFoundPagePath = path.resolve(process.cwd(), 'src/components/NotFoundPage.tsx');
  const jobImportPath = path.resolve(process.cwd(), 'src/components/JobImportModal.tsx');

  assert.ok(fs.existsSync(globalFooterPath), 'GlobalFooter.tsx must exist');
  assert.ok(fs.existsSync(appPath), 'App.tsx must exist');
  assert.ok(fs.existsSync(landingPagePath), 'LandingPage.tsx must exist');
  assert.ok(fs.existsSync(aboutPagePath), 'AboutPage.tsx must exist');
  assert.ok(fs.existsSync(pricingPagePath), 'PricingPage.tsx must exist');
  assert.ok(fs.existsSync(notFoundPagePath), 'NotFoundPage.tsx must exist');
  assert.ok(fs.existsSync(jobImportPath), 'JobImportModal.tsx must exist');

  const footerSource = fs.readFileSync(globalFooterPath, 'utf8');
  const appSource = fs.readFileSync(appPath, 'utf8');
  const landingSource = fs.readFileSync(landingPagePath, 'utf8');
  const aboutSource = fs.readFileSync(aboutPagePath, 'utf8');
  const pricingSource = fs.readFileSync(pricingPagePath, 'utf8');
  const notFoundSource = fs.readFileSync(notFoundPagePath, 'utf8');
  const jobImportSource = fs.readFileSync(jobImportPath, 'utf8');

  await t.test('1. Core Brand Positioning Statements in GlobalFooter', () => {
    // Primary Statement
    assert.match(
      footerSource,
      /Your Career\.\s*Intelligently Orchestrated\./,
      'GlobalFooter must include primary brand statement: "Your Career. Intelligently Orchestrated."'
    );

    // Supporting Statement
    assert.match(
      footerSource,
      /Discover opportunities\.\s*Build your professional edge\.\s*Navigate every career move with AI-powered intelligence\./,
      'GlobalFooter must include supporting statement'
    );

    // Brand Name & Logo
    assert.match(footerSource, /ApplyVise AI/, 'GlobalFooter must contain brand name ApplyVise AI');
    assert.match(footerSource, /<BrandLogo/, 'GlobalFooter must render BrandLogo component');
  });

  await t.test('2. Navigation Actions & Legal Requirements', () => {
    // Links
    assert.match(footerSource, /About Us/, 'Footer provides About Us');
    assert.match(footerSource, /Features & Pricing/, 'Footer provides Features & Pricing');
    assert.match(footerSource, /Admin Portal/, 'Footer provides Admin Portal trigger');
    assert.match(footerSource, /Privacy Policy/, 'Footer provides Privacy Policy');
    assert.match(footerSource, /Terms of Use/, 'Footer provides Terms of Use');
    assert.match(footerSource, /Zero Hallucination Standard/, 'Footer reflects truthfulness / integrity standard');

    // Dynamic Copyright
    assert.match(footerSource, /new Date\(\)\.getFullYear\(\)/, 'Copyright must be dynamic using current year');
    assert.match(footerSource, /ApplyVise AI\.\s*All rights reserved\./, 'Footer includes All rights reserved');
  });

  await t.test('3. Variant Architecture & Palette Awareness', () => {
    // Variants: dashboard, landing, minimal
    assert.match(footerSource, /variant === 'minimal'/, 'Supports minimal variant');
    assert.match(footerSource, /variant === 'dashboard'/, 'Supports dashboard variant');

    // CSS variables & palette awareness
    assert.match(footerSource, /--be-border-subtle/, 'Uses BLACK ELITE border token');
    assert.match(footerSource, /--be-text-primary/, 'Uses BLACK ELITE primary text token');
    assert.match(footerSource, /--be-text-muted/, 'Uses BLACK ELITE muted text token');
  });

  await t.test('4. Global Integration Across Workspace & Public Routes', () => {
    // App.tsx uses GlobalFooter for authenticated workspace
    assert.match(appSource, /<GlobalFooter\s+variant="dashboard"/, 'App.tsx renders dashboard GlobalFooter');
    assert.match(appSource, /onNavigateAbout=/, 'App.tsx connects About route');
    assert.match(appSource, /onNavigatePricing=/, 'App.tsx connects Pricing route');
    assert.match(appSource, /onNavigateAdmin=/, 'App.tsx connects Admin route');

    // LandingPage.tsx uses GlobalFooter
    assert.match(landingSource, /<GlobalFooter\s+variant="landing"/, 'LandingPage renders landing GlobalFooter');

    // AboutPage.tsx uses GlobalFooter
    assert.match(aboutSource, /<GlobalFooter\s+variant="landing"/, 'AboutPage renders GlobalFooter');

    // PricingPage.tsx uses GlobalFooter
    assert.match(pricingSource, /<GlobalFooter\s+variant="landing"/, 'PricingPage renders GlobalFooter');

    // NotFoundPage.tsx uses GlobalFooter
    assert.match(notFoundSource, /<GlobalFooter\s+variant="minimal"/, 'NotFoundPage renders minimal GlobalFooter');
  });

  await t.test('5. Zero Deprecated Slogans in Product Surfaces', () => {
    const outdatedSlogan = 'ApplyVise AI — Unified AI Career Operating System';
    assert.doesNotMatch(appSource, new RegExp(outdatedSlogan), 'App.tsx has no outdated slogan');
    assert.doesNotMatch(landingSource, new RegExp(outdatedSlogan), 'LandingPage.tsx has no outdated slogan');
    assert.doesNotMatch(aboutSource, new RegExp(outdatedSlogan), 'AboutPage.tsx has no outdated slogan');
    assert.doesNotMatch(pricingSource, new RegExp(outdatedSlogan), 'PricingPage.tsx has no outdated slogan');
    assert.doesNotMatch(notFoundSource, new RegExp(outdatedSlogan), 'NotFoundPage.tsx has no outdated slogan');

    // JobImportModal check
    assert.doesNotMatch(jobImportSource, /ApplyVise AI · Career Operating System/, 'JobImportModal has no old Operating System slogan');
    assert.match(jobImportSource, /ApplyVise AI · Your Career\. Intelligently Orchestrated\./, 'JobImportModal has new positioning statement');
  });
});
