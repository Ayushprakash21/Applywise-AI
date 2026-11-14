import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BLACK_ELITE_PALETTES, BlackElitePalette } from '../src/utils/blackEliteTheme.ts';

test('APPLYVISE AI — Signature Cinematic Homepage Hero Suite', async (t) => {
  const heroPath = path.resolve('src/components/hero/CareerIntelligenceHero.tsx');
  const landingPath = path.resolve('src/components/LandingPage.tsx');

  assert.ok(fs.existsSync(heroPath), 'CareerIntelligenceHero.tsx component must exist');
  assert.ok(fs.existsSync(landingPath), 'LandingPage.tsx must exist');

  const heroSrc = fs.readFileSync(heroPath, 'utf8');
  const landingSrc = fs.readFileSync(landingPath, 'utf8');

  await t.test('1. Architectural Integration & Component Contract', () => {
    assert.match(landingSrc, /CareerIntelligenceHero/, 'LandingPage.tsx must import and render CareerIntelligenceHero');
    assert.match(landingSrc, /<CareerIntelligenceHero/, 'LandingPage must render CareerIntelligenceHero in JSX');
    assert.match(landingSrc, /onOpenAuth=\{onOpenAuth\}/, 'Must pass onOpenAuth callback');
    assert.match(landingSrc, /onSearch=\{onSearch\}/, 'Must pass onSearch callback');
  });

  await t.test('2. Signature Editorial Headline, Eyebrow & Brand Narrative', () => {
    // Official headline
    assert.match(heroSrc, /India(?:'|&apos;)s First/, 'Must contain approved market positioning');
    assert.match(heroSrc, /AI-Powered Job Discovery &amp; Application Automation Platform\./, 'Must contain approved official headline');
    
    // Official supporting tagline & product description
    assert.match(
      heroSrc,
      /BRAND_CONFIG\.description|ApplyVise combines global job discovery/,
      'Must contain official product description'
    );
    assert.match(
      heroSrc,
      /BRAND_CONFIG\.tagline|Find opportunities before the crowd/,
      'Must contain official supporting tagline'
    );

    // Official eyebrow
    assert.match(
      heroSrc,
      /APPLYVISE AI · JOB DISCOVERY &amp; APPLICATION AUTOMATION/,
      'Must contain official eyebrow label'
    );

    // Strict prohibition of generic AI marketing filler
    assert.doesNotMatch(heroSrc, /Unlock your potential/i, 'Must not use generic "Unlock your potential" cliché');
    assert.doesNotMatch(heroSrc, /Supercharge your career/i, 'Must not use generic "Supercharge your career" cliché');
    assert.doesNotMatch(heroSrc, /Revolutionize your job search/i, 'Must not use generic "Revolutionize your job search" cliché');
    assert.doesNotMatch(heroSrc, /AI-powered everything/i, 'Must not use generic "AI-powered everything" cliché');
  });

  await t.test('3. The Career Intelligence Structure: Four Authentic Operating Dimensions', () => {
    // Dimension 1: Experience Architecture
    assert.match(heroSrc, /Experience Architecture/, 'Must present Dimension 01: Experience Architecture');
    assert.match(heroSrc, /Candidate Fact Registry|Master Profile Grounding/, 'Must emphasize fact-grounding guarantee');

    // Dimension 2: Competency Modeling (Skills)
    assert.match(heroSrc, /Competency Modeling/, 'Must present Dimension 02: Competency Modeling');
    assert.match(heroSrc, /System Architecture/, 'Must contain verified System Architecture capability');
    assert.match(heroSrc, /Distributed Operations/, 'Must contain verified Distributed Operations capability');
    assert.match(heroSrc, /TypeScript & Cloud/, 'Must contain verified TypeScript capability');
    assert.match(heroSrc, /Truthfulness Guarantee/, 'Must contain Truthfulness Guarantee capability');

    // Dimension 3: Opportunity Ingestion
    assert.match(heroSrc, /Opportunity Ingestion/, 'Must present Dimension 03: Opportunity Ingestion');
    assert.match(heroSrc, /Direct ATS Connectors|Live Hiring Feeds/, 'Must feature authentic verified vacancy ingestion');

    // Dimension 4: Application Control
    assert.match(heroSrc, /Application Control/, 'Must present Dimension 04: Application Control');
    assert.match(heroSrc, /Native DOCX ATS Formatting|Pre-Submission Screening/, 'Must present verified application control');

    // Strict prohibition of fabricated metrics & fake candidate records
    assert.doesNotMatch(heroSrc, /94% Match/, 'Must NOT contain fabricated 94% match scores');
    assert.doesNotMatch(heroSrc, /Senior Process Associate.*Supply Chain/i, 'Must NOT contain fake candidate profiles');
  });

  await t.test('4. CTAs, Navigation and Search Capsule Usability', () => {
    // CTAs
    assert.match(heroSrc, /data-testid="hero-primary-cta"/, 'Primary CTA must have testid');
    assert.match(heroSrc, /Build My Career Strategy/, 'Primary CTA text');
    assert.match(heroSrc, /data-testid="hero-secondary-cta"/, 'Secondary CTA must have testid');
    assert.match(heroSrc, /Explore the Platform/, 'Secondary CTA text');

    // Interactive Search Capsule
    assert.match(heroSrc, /flex flex-col sm:flex-row items-stretch sm:items-center/, 'Search capsule must stack on mobile');
    assert.match(heroSrc, /min-w-0 flex-1/, 'Input container must prevent flex-child overflow');
    assert.match(heroSrc, /placeholder="Search by title, skill, or role/, 'Must maintain authentic search placeholder');
    assert.match(heroSrc, /Software Engineer/, 'Must feature popular role tags');
    assert.match(heroSrc, /Product Manager/, 'Must feature Product Manager tag');
  });

  await t.test('5. Theme Token Integration & Five Curated Palettes', () => {
    // Dynamic token consumption
    assert.match(heroSrc, /var\(--be-bg-canvas/, 'Must consume --be-bg-canvas token');
    assert.match(heroSrc, /var\(--be-bg-card/, 'Must consume --be-bg-card token');
    assert.match(heroSrc, /var\(--be-border-subtle/, 'Must consume --be-border-subtle token');
    assert.match(heroSrc, /var\(--be-accent/, 'Must consume --be-accent token');
    assert.match(heroSrc, /var\(--be-text-primary/, 'Must consume --be-text-primary token');

    // Verify all 5 palettes in BLACK_ELITE_PALETTES support both dark and light
    const palettes: BlackElitePalette[] = ['ocean', 'dune', 'dusk', 'silk', 'aurora'];
    for (const pal of palettes) {
      const meta = BLACK_ELITE_PALETTES[pal];
      assert.ok(meta, `Palette ${pal} must exist`);
      assert.ok(meta.dark.bgPrimary, `${pal} dark must define bgPrimary`);
      assert.ok(meta.dark.accent, `${pal} dark must define accent`);
      assert.ok(meta.light.bgPrimary, `${pal} light must define bgPrimary`);
      assert.ok(meta.light.accent, `${pal} light must define accent`);
    }
  });

  await t.test('6. Motion Performance & Reduced-Motion Accessibility Contract', () => {
    assert.match(heroSrc, /prefers-reduced-motion/, 'Hero must query prefers-reduced-motion');
    assert.match(heroSrc, /window\.matchMedia/, 'Must use window.matchMedia for motion query');
  });

  await t.test('7. Anti-Generic AI Design Guard & Zero-Hallucination Contrast', () => {
    // Prohibit invented generic AI tropes
    assert.doesNotMatch(heroSrc, /from-purple-.*to-indigo/i, 'Must not use purple gradients');
    assert.doesNotMatch(heroSrc, /from-orange-.*to-pink/i, 'Must not use orange-pink gradients');
    assert.doesNotMatch(heroSrc, /neon-green/i, 'Must not use neon green');

    // Zero-Hallucination comparison table column contrast in LandingPage
    assert.match(landingSrc, /text-sky-300/, 'Zero-hallucination right column header/text must be high contrast');
    assert.match(landingSrc, /text-slate-100/, 'Zero-hallucination description text must be high contrast');
  });
});
