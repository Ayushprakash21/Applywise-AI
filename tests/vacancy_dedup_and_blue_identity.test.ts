import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { formatCleanDescriptionSnippet, stripHtmlToText } from '../src/utils/sanitizeHtml.ts';

test('ApplyWise AI — Vacancy Deduplication & Blue-and-White Identity Enforcement', async (t) => {
  const landingPagePath = path.resolve(process.cwd(), 'src/components/LandingPage.tsx');
  const showcasePath = path.resolve(process.cwd(), 'src/components/CinematicProductShowcase.tsx');
  const blackElitePath = path.resolve(process.cwd(), 'src/components/pricing/BlackElitePricingCard.tsx');

  assert.ok(fs.existsSync(landingPagePath), 'LandingPage.tsx must exist');
  assert.ok(fs.existsSync(showcasePath), 'CinematicProductShowcase.tsx must exist');
  assert.ok(fs.existsSync(blackElitePath), 'BlackElitePricingCard.tsx must exist');

  const landingSrc = fs.readFileSync(landingPagePath, 'utf8');
  const showcaseSrc = fs.readFileSync(showcasePath, 'utf8');
  const blackEliteSrc = fs.readFileSync(blackElitePath, 'utf8');

  await t.test('1. Single Primary Vacancy Discovery Section (Zero Duplication on Homepage)', () => {
    // Single primary vacancy discovery section
    assert.match(landingSrc, /Career Opportunity Universe/, 'Must retain Career Opportunity Universe as primary');
    assert.match(landingSrc, /CareerNetworkVisual/, 'Embeds CareerNetworkVisual');
    assert.match(landingSrc, /vacancies=\{featuredVacancies\}/, 'Passes live featured vacancies to primary visual');
    assert.match(landingSrc, /onSelectVacancy=\{onSelectVacancy\}/, 'Passes onSelectVacancy trigger to primary visual');

    // Duplicate section must be completely eliminated
    assert.doesNotMatch(landingSrc, /Live Discovered Vacancies/, 'Duplicate "Live Discovered Vacancies" must be removed from homepage');
    assert.doesNotMatch(landingSrc, /featuredVacancies\.slice\(0, 6\)\.map/, 'Duplicate 6-card loop must be removed');
  });

  await t.test('2. HTML Sanitization: Eliminates Raw Tags (<div class="content-intro">) and Decodes Entities', () => {
    // Test input mimicking user reported bug on Staffbase card
    const rawWithIntro = '<div class="content-intro"><h2>About Us</h2><p>Staffbase is a high-growth, award-winning company &amp; workplace.</p></div>';
    const cleaned = formatCleanDescriptionSnippet(rawWithIntro);

    assert.ok(!cleaned.includes('<div'), 'Must strip <div tag');
    assert.ok(!cleaned.includes('content-intro'), 'Must strip class names and markup');
    assert.ok(!cleaned.includes('<h2>'), 'Must strip <h2> tag');
    assert.ok(!cleaned.includes('<p>'), 'Must strip <p> tag');
    assert.ok(cleaned.includes('Staffbase is a high-growth, award-winning company & workplace.'), 'Must decode &amp; and retain clean text');

    // Test double-encoded entities and non-breaking spaces
    const rawEntities = 'Seeking a Senior Engineer&nbsp;&amp;&nbsp;Tech Lead &lt;span class="badge"&gt;Urgent&lt;/span&gt;';
    const cleanedEntities = formatCleanDescriptionSnippet(rawEntities);
    assert.ok(!cleanedEntities.includes('&nbsp;'), 'Must decode &nbsp;');
    assert.ok(!cleanedEntities.includes('&amp;'), 'Must decode &amp;');
    assert.ok(!cleanedEntities.includes('&lt;'), 'Must decode and strip &lt;');
    assert.ok(!cleanedEntities.includes('<span'), 'Must strip encoded span tag');
    assert.ok(cleanedEntities.includes('Seeking a Senior Engineer & Tech Lead Urgent'), 'Must output readable plain text');

    // Verify CinematicProductShowcase uses formatCleanDescriptionSnippet and stripHtmlToText
    assert.match(showcaseSrc, /formatCleanDescriptionSnippet\(vac\.description\)/, 'Showcase cards must use formatCleanDescriptionSnippet');
    assert.match(showcaseSrc, /stripHtmlToText\(selectedVacancy\.description\)/, 'Showcase modal must use stripHtmlToText');
  });

  await t.test('3. Enforce ApplyWise Blue-and-White Brand Identity (Zero Orange/Brown in Standard Vacancy UI)', () => {
    // Verified Role badge: Restrained blue verification treatment
    assert.match(showcaseSrc, /bg-\[#0788D1\]\/10\s+text-\[#0788D1\]/, 'Verified Role badge must use Azure blue in light theme');
    assert.match(showcaseSrc, /dark:bg-\[#20B9F3\]\/10\s+dark:text-\[#20B9F3\]/, 'Verified Role badge must use Electric blue in dark theme');
    assert.doesNotMatch(showcaseSrc, /bg-orange-50.*Verified Role/, 'Must not use orange background for Verified Role badge');

    // Inspect Role action link: Azure / Electric Blue
    assert.match(showcaseSrc, /text-\[#0788D1\]\s+dark:text-\[#20B9F3\][\s\S]*?Inspect Role/, 'Inspect Role must use Azure / Electric Blue');
    assert.doesNotMatch(showcaseSrc, /text-orange-600.*Inspect Role/, 'Inspect Role must not use orange');

    // Card hover & styling: Blue accents
    assert.match(showcaseSrc, /hover:border-\[#0788D1\]\/40/, 'Light card hover must use Azure blue border');
    assert.match(showcaseSrc, /dark:hover:border-\[#20B9F3\]\/40/, 'Dark card hover must use Electric blue border');
    assert.doesNotMatch(showcaseSrc, /hover:border-orange/, 'Must not use orange hover borders in vacancy showcase');

    // Input focus ring
    assert.match(showcaseSrc, /focus:ring-\[#0788D1\]\s+dark:focus:ring-\[#20B9F3\]/, 'Search input must focus with brand blue');
    assert.doesNotMatch(showcaseSrc, /focus:ring-orange/, 'Search input must not use orange focus ring');

    // Direct application button in modal
    assert.match(showcaseSrc, /bg-\[#0788D1\]\s+hover:bg-\[#056da8\]\s+dark:bg-\[#20B9F3\]/, 'Modal CTA button must use brand blue');
    assert.doesNotMatch(showcaseSrc, /bg-orange-600/, 'Modal CTA button must not use orange');
  });

  await t.test('4. Exclusive BLACK Elite Identity Preserved Untouched', () => {
    // BLACK Elite must retain its mandatory black and gold identity
    assert.match(blackEliteSrc, /#090909/, 'BLACK Elite must retain #090909 deep black background');
    assert.match(blackEliteSrc, /#C9A45B/, 'BLACK Elite must retain #C9A45B metallic gold border and accents');
    assert.match(blackEliteSrc, /1,599/, 'BLACK Elite must retain ₹1,599 pricing');
  });

  await t.test('5. Accessible List View, Search, Filtering & Refresh Preserved', () => {
    assert.match(showcaseSrc, /Accessible List View/, 'Preserves accessible list toggle');
    assert.match(showcaseSrc, /loadRealData/, 'Preserves live feed refresh');
    assert.match(showcaseSrc, /searchQuery/, 'Preserves search input');
    assert.match(showcaseSrc, /tierFilter/, 'Preserves alignment filtering');
    assert.match(showcaseSrc, /handleOpportunityClick/, 'Preserves vacancy detail trigger');
  });
});
