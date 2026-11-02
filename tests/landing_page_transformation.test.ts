import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Landing Page Transformation - Daoism Systems Architectural Integrity', async (t) => {
  const landingPagePath = path.resolve(process.cwd(), 'src/components/LandingPage.tsx');
  const careerVisualPath = path.resolve(process.cwd(), 'src/components/CareerNetworkVisual.tsx');
  const founderSectionPath = path.resolve(process.cwd(), 'src/components/FounderSection.tsx');
  const indexCssPath = path.resolve(process.cwd(), 'src/index.css');

  assert.ok(fs.existsSync(landingPagePath), 'LandingPage.tsx must exist');
  assert.ok(fs.existsSync(careerVisualPath), 'CareerNetworkVisual.tsx must exist');
  assert.ok(fs.existsSync(founderSectionPath), 'FounderSection.tsx must exist');
  assert.ok(fs.existsSync(indexCssPath), 'index.css must exist');

  const landingSource = fs.readFileSync(landingPagePath, 'utf8');
  const careerSource = fs.readFileSync(careerVisualPath, 'utf8');
  const founderSource = fs.readFileSync(founderSectionPath, 'utf8');
  const cssSource = fs.readFileSync(indexCssPath, 'utf8');

  await t.test('Visual Styling & Theme Architecture (Daoism Systems Aesthetic)', () => {
    // Dark background #030712 / #050811
    assert.match(landingSource, /bg-\[#030712\]/, 'Landing page should use deep midnight obsidian #030712');
    assert.match(landingSource, /bg-grid-cyber/, 'Hero should include subtle cyber grid');
    assert.match(cssSource, /bg-grid-cyber/, 'CSS should define bg-grid-cyber utility');
    assert.match(cssSource, /dark-glass/, 'CSS should define dark-glass utility');
  });

  await t.test('Hero Section Narrative and Copy Requirements', () => {
    // Monospaced badge
    assert.match(landingSource, /APPLYWISE AI 2\.0 · TRUTHFUL CAREER INTELLIGENCE/, 'Must feature monospaced system pill');
    // Primary headline
    assert.match(landingSource, /Your next chapter/, 'Hero headline part 1');
    assert.match(landingSource, /starts with clarity\./, 'Hero headline part 2');
    // Supporting copy
    assert.match(landingSource, /maps verified experience to live opportunities with zero hallucination/i, 'Hero narrative copy');
    // Search capsule
    assert.match(landingSource, /handleSearchSubmit/, 'Search form must be wired to handleSearchSubmit');
    assert.match(landingSource, /onSearch/, 'Search submission must invoke onSearch');
  });

  await t.test('Career Network Constellation Visual Integration', () => {
    assert.match(landingSource, /<CareerNetworkVisual \/>/, 'Landing page must embed CareerNetworkVisual');
    // Check performance optimizations in CareerNetworkVisual
    assert.match(careerSource, /IntersectionObserver/, 'CareerNetworkVisual must pause rendering when offscreen');
    assert.match(careerSource, /visibilitychange/, 'CareerNetworkVisual must pause on visibilitychange');
    assert.match(careerSource, /prefers-reduced-motion/, 'CareerNetworkVisual must respect prefers-reduced-motion');
    // Verify nodes contain realistic career twin data
    assert.match(careerSource, /Verified Career Twin/, 'Visual graph contains Career Twin node');
    assert.match(careerSource, /System Architecture/, 'Visual graph contains skill nodes');
    assert.match(careerSource, /Truthfulness Guarantee/, 'Visual graph contains integrity node');
  });

  await t.test('6-Stage Journey Narrative Flow', () => {
    assert.match(landingSource, /Resume Ingestion/, 'Stage 1: Resume Ingestion');
    assert.match(landingSource, /Twin Construction/, 'Stage 2: Twin Construction');
    assert.match(landingSource, /Live Vacancy Stream/, 'Stage 3: Live Vacancy Stream');
    assert.match(landingSource, /Evidence-Based Fit/, 'Stage 4: Evidence-Based Fit');
    assert.match(landingSource, /Truthful Tailoring/, 'Stage 5: Truthful Tailoring');
    assert.match(landingSource, /Tracked Submission/, 'Stage 6: Tracked Submission');
  });

  await t.test('Interactive Cockpit Demonstration & Truth Audit', () => {
    assert.match(landingSource, /activeTab === 'fit'/, 'Cockpit supports fit evaluation view');
    assert.match(landingSource, /activeTab === 'audit'/, 'Cockpit supports truth audit view');
    assert.match(landingSource, /activeTab === 'tailor'/, 'Cockpit supports ATS preview');
    assert.match(landingSource, /AUDIT PASS: Zero fabricated credentials/, 'Truth audit emphasizes zero hallucinations');
  });

  await t.test('Integrity Comparison Matrix (Zero Hallucination Standard)', () => {
    assert.match(landingSource, /Generic Generative AI/, 'Comparison header for generic AI tools');
    assert.match(landingSource, /ApplyWise AI Engine/, 'Comparison header for ApplyWise AI');
    assert.match(landingSource, /The Zero-Hallucination Standard/, 'Section title');
  });

  await t.test('Live Vacancy Feed Integration', () => {
    assert.match(landingSource, /featuredVacancies\.slice\(0, 6\)\.map/, 'Must render live featured vacancies');
    assert.match(landingSource, /onSelectVacancy\(v\)/, 'Card click must trigger onSelectVacancy');
  });

  await t.test('Founder Story & Authority Verification', () => {
    assert.match(landingSource, /<FounderSection theme="dark"/, 'Embeds FounderSection with dark theme');
    assert.match(founderSource, /https:\/\/www\.linkedin\.com\/in\/ayushprakash21\//, 'Founder section must maintain exact personal LinkedIn profile');
    assert.match(founderSource, /Ayush Prakash/, 'Founder name preserved');
  });

  await t.test('Footer Navigation & Callback Safety', () => {
    assert.match(landingSource, /onOpenAbout/, 'Footer contains onOpenAbout trigger');
    assert.match(landingSource, /onOpenPricing/, 'Footer contains onOpenPricing trigger');
    assert.match(landingSource, /onOpenAdmin/, 'Footer contains onOpenAdmin trigger');
    assert.match(landingSource, /onOpenPrivacy/, 'Footer contains onOpenPrivacy trigger');
    assert.match(landingSource, /onOpenTerms/, 'Footer contains onOpenTerms trigger');
    assert.match(landingSource, /onOpenAuth\('signup'\)/, 'Navigation & CTA contains signup trigger');
    assert.match(landingSource, /onOpenAuth\('login'\)/, 'Navigation & CTA contains login trigger');
  });
});
