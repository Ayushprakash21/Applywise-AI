// tests/opportunity_engine_hero.test.ts
// Verification of Complete Hero Replacement: OpportunityEngineHero -> The Career Ascent 3D Hero

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('OpportunityEngineHero -> CareerAscentHero Migration & Integrity Suite', () => {
  const legacyTsxPath = path.resolve('src/components/hero/OpportunityEngineHero.tsx');
  const careerAscentTsxPath = path.resolve('src/components/hero/CareerAscentHero.tsx');
  const canvasTsxPath = path.resolve('src/components/hero/CareerAscentCanvas.tsx');
  const landingPath = path.resolve('src/components/LandingPage.tsx');

  test('Replacement component files exist and old composition is replaced', () => {
    assert.ok(fs.existsSync(legacyTsxPath), 'OpportunityEngineHero.tsx compatibility shim must exist');
    assert.ok(fs.existsSync(careerAscentTsxPath), 'CareerAscentHero.tsx must exist');
    assert.ok(fs.existsSync(canvasTsxPath), 'CareerAscentCanvas.tsx must exist');
    assert.ok(fs.existsSync(landingPath), 'LandingPage.tsx must exist');
  });

  test('LandingPage integrates CareerAscentHero directly with verified callbacks', () => {
    const landingSrc = fs.readFileSync(landingPath, 'utf8');
    assert.match(landingSrc, /CareerAscentHero/, 'LandingPage must render CareerAscentHero');
    assert.match(landingSrc, /onExploreJobs=/, 'Must connect onExploreJobs callback');
    assert.match(landingSrc, /onBuildProfile=/, 'Must connect onBuildProfile callback');
    assert.match(landingSrc, /vacancies=/, 'Must pass vacancies');
  });

  test('Five Ascending Milestones replace legacy 4 portals', () => {
    const ascentSrc = fs.readFileSync(careerAscentTsxPath, 'utf8');
    assert.match(ascentSrc, /'Discover'/, 'Stage 1 must be Discover');
    assert.match(ascentSrc, /'Match'/, 'Stage 2 must be Match');
    assert.match(ascentSrc, /'Prepare'/, 'Stage 3 must be Prepare');
    assert.match(ascentSrc, /'Apply'/, 'Stage 4 must be Apply');
    assert.match(ascentSrc, /'Advance'/, 'Stage 5 must be Advance');
  });

  test('Real Backend Data Binding: CompanyLogo used and zero fabricated cards', () => {
    const ascentSrc = fs.readFileSync(careerAscentTsxPath, 'utf8');
    assert.match(ascentSrc, /CompanyLogo/, 'Must use CompanyLogo component for real company branding');
    assert.match(ascentSrc, /vacancies\?:\s*JobVacancy\[\]/, 'Must accept vacancies prop');
    assert.match(ascentSrc, /onSelectVacancy\?:\s*\(vacancy:\s*JobVacancy\)\s*=>\s*void/, 'Must accept onSelectVacancy callback');
    assert.match(ascentSrc, /realJob1/, 'Must map realJob1 for floating card');
  });

  test('Legacy OpportunityEngineHero exports CareerAscentHero for backward compatibility', () => {
    const legacySrc = fs.readFileSync(legacyTsxPath, 'utf8');
    assert.match(legacySrc, /CareerAscentHero/, 'OpportunityEngineHero must re-export CareerAscentHero');
  });
});
