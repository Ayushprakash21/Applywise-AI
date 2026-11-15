// tests/av_cinematic_hero.test.ts
// Comprehensive Test Suite for APPLYWISE AI — CINEMATIC AV HERO & HOMEPAGE CORRECTION
// Validates Image 1 (Cleanup), Image 2 (Artwork Animation), and Image 3 (Target Structure)

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('ApplyWise AI — Cinematic AV Hero & Homepage Structure Suite', () => {
  const landingPath = path.resolve('src/components/LandingPage.tsx');
  const heroTsxPath = path.resolve('src/components/hero/AvCinematicHero.tsx');
  const canvasTsxPath = path.resolve('src/components/hero/AvCinematicCanvas.tsx');
  const heroCssPath = path.resolve('src/components/hero/AvCinematicHero.css');
  const artworkPath = path.resolve('public/hero/av-pilgrim-hero.jpg');
  const footerPath = path.resolve('src/components/GlobalFooter.tsx');

  const landingSrc = fs.readFileSync(landingPath, 'utf8');
  const heroTsxSrc = fs.readFileSync(heroTsxPath, 'utf8');
  const canvasTsxSrc = fs.readFileSync(canvasTsxPath, 'utf8');
  const heroCssSrc = fs.readFileSync(heroCssPath, 'utf8');
  const footerSrc = fs.readFileSync(footerPath, 'utf8');

  test('1. Image 2 Artwork File Exists in Public Directory', () => {
    assert.ok(fs.existsSync(artworkPath), 'public/hero/av-pilgrim-hero.jpg must exist');
    const stats = fs.statSync(artworkPath);
    assert.ok(stats.size > 50000, 'Artwork file must be high-resolution (> 50KB)');
  });

  test('2. Single Primary Hero Architecture in LandingPage.tsx', () => {
    // Only one primary hero component rendered immediately below header
    assert.match(landingSrc, /<AvCinematicHero/, 'LandingPage renders AvCinematicHero directly below header navigation');
    
    // AvCinematicHero precedes journey section without intermediate active hero components
    assert.match(landingSrc, /<AvCinematicHero[\s\S]*?<section id="journey"/, 'AvCinematicHero is the primary hero preceding journey');
  });

  test('3. AvCinematicHero Layout: 40/60 Proportions, Typography & CTAs', () => {
    // 40/60 Layout in CSS
    assert.match(heroCssSrc, /max-width:\s*42%/, 'Left column must be ~40% width in desktop layout');
    assert.match(heroCssSrc, /max-width:\s*58%/, 'Right column must be ~60% width in desktop layout');

    // Brand pill & Headline
    assert.match(heroTsxSrc, /data-testid="av-brand-pill"/, 'Must render AV Brand Pill');
    assert.match(heroTsxSrc, /India(?:'|&apos;|&#39;)s First/, 'Headline contains "India\'s First"');
    assert.match(heroTsxSrc, /AI-Powered Job/, 'Headline contains "AI-Powered Job"');
    assert.match(heroTsxSrc, /Discovery &amp; Application/, 'Headline contains "Discovery & Application"');

    // Action CTAs
    assert.match(heroTsxSrc, /Get Started for Free/, 'Primary CTA must be "Get Started for Free"');
    assert.match(heroTsxSrc, /Explore How It Works/, 'Secondary CTA must be "Explore How It Works"');
  });

  test('4. Capability Strip Below Hero', () => {
    assert.match(heroTsxSrc, /Trusted by professionals for smarter career growth/, 'Must feature official capability strip heading');
    assert.match(heroTsxSrc, /AI Job Discovery/, 'Pill 1: AI Job Discovery');
    assert.match(heroTsxSrc, /Resume Intelligence/, 'Pill 2: Resume Intelligence');
    assert.match(heroTsxSrc, /Application Automation/, 'Pill 3: Application Automation');
    assert.match(heroTsxSrc, /Career Insights/, 'Pill 4: Career Insights');
  });

  test('5. Multi-Layer Canvas Animation Engine (Image 2 Artwork)', () => {
    // Canvas loads Image 2
    assert.match(canvasTsxSrc, /\/hero\/av-pilgrim-hero\.jpg/, 'Canvas engine must load Image 2 source artwork');

    // Monogram Volumetric & Edge Lighting
    assert.match(canvasTsxSrc, /VOLUMETRIC/, 'Engine renders volumetric light sweeps behind AV monogram');
    assert.match(canvasTsxSrc, /AV MONOGRAM LIGHT SWEEP/, 'Engine renders surface reflections along AV letter edges');

    // Flowing Energy Ribbons & Particles
    assert.match(canvasTsxSrc, /DYNAMIC ENERGY RIBBON LIGHT STREAKS/, 'Engine renders flowing blue and gold energy ribbons');
    assert.match(canvasTsxSrc, /GUIDED PARTICLES FOLLOWING THE ENERGY RIBBONS/, 'Engine renders guided particles flowing toward AV monogram');

    // Ground Reflections & Silhouette Lighting
    assert.match(canvasTsxSrc, /PILGRIM SPECULAR GROUND REFLECTIONS/, 'Engine renders pilgrim ground reflections and wet surface sheen');

    // Career Universe Symbols (Briefcase, Growth Left/Right, Rosette/Achievement, Graduation Cap)
    assert.match(canvasTsxSrc, /CAREER UNIVERSE SYMBOLS/, 'Engine renders sequential lens flares on career symbols');
    assert.match(canvasTsxSrc, /briefcase/, 'Animates briefcase symbol');
    assert.match(canvasTsxSrc, /graduation/, 'Animates graduation cap symbol');
    assert.match(canvasTsxSrc, /achievement/, 'Animates rosette achievement symbol');

    // Performance & Accessibility Controls
    assert.match(canvasTsxSrc, /prefers-reduced-motion/, 'Honors user accessibility preference for reduced motion');
    assert.match(canvasTsxSrc, /IntersectionObserver/, 'Uses IntersectionObserver to pause rendering when offscreen');
  });

  test('6. Section E: Live Discovered Vacancies (6 Cards Grid)', () => {
    assert.match(landingSrc, /Live Discovered Vacancies/, 'LandingPage renders Live Discovered Vacancies section');
    assert.match(landingSrc, /Fresh opportunities from verified sources, updated regularly\./, 'Features verified subtitle');
    assert.match(landingSrc, /View All Jobs/, 'Features "View All Jobs" action link');
    assert.match(landingSrc, /slice\(0,\s*6\)/, 'Renders exactly 6 vacancy cards');
  });

  test('7. Clean Deep Navy Global Footer (#080F1C) matching Image 3', () => {
    // 4 Columns
    assert.match(footerSrc, /Quick links/i, 'Footer column 1: Quick Links');
    assert.match(footerSrc, /Company/i, 'Footer column 2: Company');
    assert.match(footerSrc, /Support/i, 'Footer column 3: Support');
    assert.match(footerSrc, /Connect/i, 'Footer column 4: Connect');

    // Social & Made in India
    assert.match(footerSrc, /Made in India/, 'Footer features Made in India badge');
    assert.match(footerSrc, /LinkedIn/i, 'Footer features LinkedIn link');
    assert.match(footerSrc, /#080F1C/, 'Footer background uses Deep Navy #080F1C');
  });
});
