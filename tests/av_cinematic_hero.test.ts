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

  test('3. AvCinematicHero Layout: Full-Width Cinematic Artwork Layer, Typography & CTAs', () => {
    // Full-width artwork backdrop layer
    assert.match(heroTsxSrc, /av-hero-artwork-backdrop/, 'Must render full-section artwork backdrop layer');
    assert.match(heroCssSrc, /\.av-hero-artwork-backdrop/, 'CSS defines full-section artwork layer');

    // Readability gradient overlay
    assert.match(heroTsxSrc, /av-hero-gradient-overlay/, 'Must render controlled readability gradient overlay');
    assert.match(heroCssSrc, /\.av-hero-gradient-overlay/, 'CSS defines controlled readability gradient');

    // Brand pill is removed per user instruction
    assert.ok(!heroTsxSrc.includes('data-testid="av-brand-pill"'), 'Brand pill must be completely removed');

    // High-contrast headline colors
    assert.match(heroTsxSrc, /av-headline-white/, 'Headline uses pure white styling for high contrast');
    assert.match(heroTsxSrc, /av-headline-gold/, 'Headline uses warm gold styling for accent');
    assert.match(heroTsxSrc, /India(?:'|&apos;|&#39;)s First/, 'Headline contains "India\'s First"');
    assert.match(heroTsxSrc, /AI-Powered Job/, 'Headline contains "AI-Powered Job"');
    assert.match(heroTsxSrc, /Discovery &amp; Application/, 'Headline contains "Discovery & Application"');

    // Action CTAs
    assert.match(heroTsxSrc, /Get Started for Free/, 'Primary CTA must be "Get Started for Free"');
    assert.match(heroTsxSrc, /Explore How It Works/, 'Secondary CTA must be "Explore How It Works"');
  });

  test('4. Capability Trust Strip Removed Per Visual Instructions', () => {
    // The bottom trust strip is removed per instructions
    assert.ok(!heroTsxSrc.includes('av-trust-strip'), 'Capability strip must be completely removed');
    assert.ok(!heroTsxSrc.includes('Trusted by professionals for smarter career growth'), 'Trust heading must be removed');
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

  test('8. Founder Section Visual Corrections: Editorial Eyebrow & Single-Line Heading', () => {
    const founderPath = path.resolve('src/components/FounderSection.tsx');
    const founderSrc = fs.readFileSync(founderPath, 'utf8');

    // Editorial eyebrow instead of AI-style badge
    assert.match(founderSrc, /Meet the Founder/, 'Features "Meet the Founder" label');
    assert.match(founderSrc, /text-\[14px\]\s*sm:text-\[16px\]/, 'Eyebrow has prominent 15-17px desktop typography');
    assert.match(founderSrc, /tracking-\[0\.18em\]/, 'Eyebrow has clear letter spacing');
    assert.ok(!founderSrc.includes('rounded-full text-xs font-mono'), 'No oversized AI pill background on Meet the Founder');
    assert.ok(!founderSrc.includes('<Sparkles className="h-3.5 w-3.5 text-cyan-400" />'), 'No unnecessary decorative sparkles icon');

    // Single-line desktop heading
    assert.match(founderSrc, /Built with ambition\.\s*Powered by AI\./, 'Features verified founder headline');
    assert.match(founderSrc, /md:whitespace-nowrap/, 'Heading enforces single-line rendering on desktop viewports');
    assert.match(founderSrc, /max-w-5xl/, 'Container has expanded max-width to accommodate single-line headline');
  });
});
