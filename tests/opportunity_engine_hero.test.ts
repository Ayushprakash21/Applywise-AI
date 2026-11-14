// tests/opportunity_engine_hero.test.ts
// Unit and integration tests for OpportunityEngineHero component

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('OpportunityEngineHero Component Suite', () => {
  const heroTsxPath = path.resolve('src/components/hero/OpportunityEngineHero.tsx');
  const heroCssPath = path.resolve('src/components/hero/OpportunityEngineHero.css');
  const landingPath = path.resolve('src/components/LandingPage.tsx');

  test('Component files exist in correct locations', () => {
    assert.ok(fs.existsSync(heroTsxPath), 'OpportunityEngineHero.tsx must exist in src/components/hero/');
    assert.ok(fs.existsSync(heroCssPath), 'OpportunityEngineHero.css must exist in src/components/hero/');
    assert.ok(fs.existsSync(landingPath), 'LandingPage.tsx must exist');
  });

  test('LandingPage integrates OpportunityEngineHero', () => {
    const landingSrc = fs.readFileSync(landingPath, 'utf8');
    assert.match(landingSrc, /import OpportunityEngineHero/, 'LandingPage must import OpportunityEngineHero');
    assert.match(landingSrc, /<OpportunityEngineHero/, 'LandingPage must render OpportunityEngineHero');
    assert.match(landingSrc, /onExploreJobs=/, 'Must connect onExploreJobs callback');
    assert.match(landingSrc, /onBuildProfile=/, 'Must connect onBuildProfile callback');
  });

  test('Design Requirements: Four Interconnected Portals', () => {
    const tsxSrc = fs.readFileSync(heroTsxPath, 'utf8');
    assert.match(tsxSrc, /label="Discover"/, 'Portal 1 must be Discover');
    assert.match(tsxSrc, /label="Match"/, 'Portal 2 must be Match');
    assert.match(tsxSrc, /label="Prepare"/, 'Portal 3 must be Prepare');
    assert.match(tsxSrc, /label="Advance"/, 'Portal 4 must be Advance');
    assert.match(tsxSrc, /index=\{1\}/, 'Portal 1 index 01');
    assert.match(tsxSrc, /index=\{4\}/, 'Portal 4 index 04');
  });

  test('Design Requirements: Staircase, Climber Marker & Orbital Network', () => {
    const tsxSrc = fs.readFileSync(heroTsxPath, 'utf8');
    const cssSrc = fs.readFileSync(heroCssPath, 'utf8');

    // 8 steps
    assert.match(tsxSrc, /oe-staircase/, 'Must render oe-staircase');
    assert.match(tsxSrc, /length:\s*8/, 'Staircase must feature 8 steps');

    // Climber marker
    assert.match(tsxSrc, /oe-career-marker/, 'Must render career marker');
    assert.match(tsxSrc, /oe-marker-head/, 'Must have marker head');
    assert.match(tsxSrc, /oe-marker-body/, 'Must have marker body');

    // Networks
    assert.match(tsxSrc, /oe-network-a/, 'Must render network A');
    assert.match(tsxSrc, /oe-network-b/, 'Must render network B');

    // CSS animations
    assert.match(cssSrc, /@keyframes oe-portal-pulse/, 'Must define portal pulse animation');
    assert.match(cssSrc, /@keyframes oe-climb/, 'Must define climbing animation');
    assert.match(cssSrc, /@keyframes oe-card-float/, 'Must define card float animation');
    assert.match(cssSrc, /@keyframes oe-ticker/, 'Must define ticker marquee animation');
  });

  test('Integration Requirements: Real Backend Data Binding', () => {
    const tsxSrc = fs.readFileSync(heroTsxPath, 'utf8');
    assert.match(tsxSrc, /CompanyLogo/, 'Must use CompanyLogo component for real company branding');
    assert.match(tsxSrc, /vacancies\?:\s*JobVacancy\[\]/, 'Must accept vacancies prop');
    assert.match(tsxSrc, /onSelectVacancy\?:\s*\(vacancy:\s*JobVacancy\)\s*=>\s*void/, 'Must accept onSelectVacancy callback');
    assert.match(tsxSrc, /realJob1/, 'Must map realJob1 for floating card');
    assert.match(tsxSrc, /tickerItems/, 'Must map real backend ticker items');
  });

  test('Accessibility & Performance: Reduced Motion & Scoped CSS', () => {
    const cssSrc = fs.readFileSync(heroCssPath, 'utf8');
    assert.match(cssSrc, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Must include reduced motion query');
    assert.match(cssSrc, /animation-duration:\s*\.01ms\s*!important/, 'Must disable animations when reduced motion requested');
  });

  test('No Duplicate Headers: .oe-topline removed from hero component', () => {
    const tsxSrc = fs.readFileSync(heroTsxPath, 'utf8');
    assert.doesNotMatch(tsxSrc, /oe-topline/, 'Must NOT render duplicate oe-topline navigation strip');
  });
});
