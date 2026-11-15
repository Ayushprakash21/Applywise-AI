import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Homepage Step-by-Step Guidance Dark & Light Theme Suite', () => {
  const landingPagePath = path.resolve(process.cwd(), 'src/components/LandingPage.tsx');

  test('Step-by-Step Guidance section exists in LandingPage.tsx', () => {
    assert.ok(fs.existsSync(landingPagePath), 'LandingPage.tsx must exist');
    const code = fs.readFileSync(landingPagePath, 'utf-8');
    assert.ok(code.includes('From raw resume to tracked applications.'), 'Must contain main section headline');
    assert.ok(code.includes('Step-by-Step Guidance'), 'Must contain section category badge');
  });

  test('Dark Mode Design Tokens implemented accurately', () => {
    const code = fs.readFileSync(landingPagePath, 'utf-8');
    const journeyMatch = code.match(/id="journey"[\s\S]*?id="cockpit"/);
    assert.ok(journeyMatch, 'Journey section must be identifiable');
    const journeyCode = journeyMatch[0];

    // Card background: #17191D
    assert.ok(journeyCode.includes('#17191D'), 'Card background must use #17191D in dark mode');

    // Card border: #30343A
    assert.ok(journeyCode.includes('#30343A'), 'Card border must use #30343A in dark mode');

    // Main headings: #FFFFFF
    assert.ok(journeyCode.includes('#FFFFFF'), 'Main headings must use #FFFFFF in dark mode');

    // Step numbers: #FFFFFF
    assert.ok(journeyCode.includes('text-[#FFFFFF]'), 'Step numbers must use #FFFFFF in dark mode');

    // Card titles: #F5F5F5
    assert.ok(journeyCode.includes('#F5F5F5'), 'Card titles must use #F5F5F5 in dark mode');

    // Descriptions: #C5C9D0
    assert.ok(journeyCode.includes('#C5C9D0'), 'Descriptions must use #C5C9D0 in dark mode');

    // Orange subtitles: #FFB15C
    assert.ok(journeyCode.includes('#FFB15C'), 'Subtitles must use #FFB15C in dark mode');

    // Dividers: #454A52
    assert.ok(journeyCode.includes('#454A52'), 'Dividers must use #454A52 in dark mode');

    // Badge background: #282B31
    assert.ok(journeyCode.includes('#282B31'), 'Step badge background must use #282B31 in dark mode');

    // Badge text: #E6E8EB
    assert.ok(journeyCode.includes('#E6E8EB'), 'Step badge text must use #E6E8EB in dark mode');
  });

  test('Step Badges: High contrast in dark mode, light mode unaffected', () => {
    const code = fs.readFileSync(landingPagePath, 'utf-8');
    const journeyMatch = code.match(/id="journey"[\s\S]*?id="cockpit"/);
    const journeyCode = journeyMatch![0];

    // Badge has appropriate padding and rounded corners
    assert.ok(journeyCode.includes('px-2.5 py-1 rounded-lg'), 'Badges must maintain padding and rounded corners');

    // Light mode badge preservation
    assert.ok(journeyCode.includes('bg-[#F5F3EE]'), 'Light mode must maintain warm ivory badge background #F5F3EE');
    assert.ok(journeyCode.includes('text-slate-700'), 'Light mode must maintain text-slate-700 badge text');

    // Dark mode badge styling
    assert.ok(journeyCode.includes('bg-[#282B31]'), 'Dark mode must use dark charcoal badge background #282B31');
    assert.ok(journeyCode.includes('text-[#E6E8EB]'), 'Dark mode must use readable light text #E6E8EB');
  });

  test('Preserves 6 stages and 3-column desktop layout', () => {
    const code = fs.readFileSync(landingPagePath, 'utf-8');
    const journeyMatch = code.match(/id="journey"[\s\S]*?id="cockpit"/);
    const journeyCode = journeyMatch![0];

    assert.ok(journeyCode.includes('grid-cols-1 md:grid-cols-2 lg:grid-cols-3'), 'Must preserve 3-column layout');
    assert.ok(journeyCode.includes('Resume Ingestion'), 'Stage 1: Resume Ingestion');
    assert.ok(journeyCode.includes('Twin Construction'), 'Stage 2: Twin Construction');
    assert.ok(journeyCode.includes('Live Vacancy Stream'), 'Stage 3: Live Vacancy Stream');
    assert.ok(journeyCode.includes('Evidence-Based Fit'), 'Stage 4: Evidence-Based Fit');
    assert.ok(journeyCode.includes('Truthful Tailoring'), 'Stage 5: Truthful Tailoring');
    assert.ok(journeyCode.includes('Tracked Submission'), 'Stage 6: Tracked Submission');
  });
});
