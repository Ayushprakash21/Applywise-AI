import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  decodeHtmlEntities,
  isHtmlContent,
  stripHtmlToText,
  sanitizeJobDescription,
  extractSemanticSections
} from '../src/utils/sanitizeHtml.ts';
import {
  classifySkill,
  classifyJobSkills
} from '../src/utils/skillClassifier.ts';

test('Job Details HTML Sanitization, Renderer & Taxonomy Architecture', async (t) => {
  await t.test('1. Valid HTML description: preserves semantic tags & headings without raw brackets', () => {
    const rawHtml = '<p>You have built data teams from the ground up.</p><h2>About JetBrains</h2><ul><li>Team leadership</li><li>Python & SQL</li></ul>';
    const result = sanitizeJobDescription(rawHtml);

    assert.strictEqual(result.isHtml, true);
    assert.ok(result.sanitizedHtml.includes('<p>You have built data teams'), 'Preserves <p> tag');
    assert.ok(result.sanitizedHtml.includes('<h2>About JetBrains</h2>'), 'Preserves <h2> tag');
    assert.ok(result.sanitizedHtml.includes('<li>Team leadership</li>'), 'Preserves <li> tag');
    assert.strictEqual(result.hasScriptOrUnsafeTags, false);
    // Plain text fallback strips tags
    assert.strictEqual(result.plainTextFallback.includes('<p>'), false);
    assert.ok(result.plainTextFallback.includes('You have built data teams'));
  });

  await t.test('2. Plain-text description: wraps into clean paragraphs without creating invalid tags', () => {
    const plainText = 'We are looking for an experienced Senior Project Manager.\n\nYou will lead cross-functional initiatives across teams.';
    const result = sanitizeJobDescription(plainText);

    assert.strictEqual(result.isHtml, false);
    assert.ok(result.sanitizedHtml.includes('<p class="mb-4">We are looking for an experienced Senior Project Manager.</p>'));
    assert.ok(result.sanitizedHtml.includes('<p class="mb-4">You will lead cross-functional initiatives across teams.</p>'));
    assert.strictEqual(result.plainTextFallback, plainText);
  });

  await t.test('3. HTML-encoded description: decodes &lt;p&gt; safely and renders formatted elements', () => {
    const encoded = '&lt;p&gt;You&apos;ve built data teams from the ground up.&lt;/p&gt; &lt;h2&gt;&lt;strong&gt;About JetBrains&lt;/strong&gt;&lt;/h2&gt;';
    const result = sanitizeJobDescription(encoded);

    assert.strictEqual(result.isHtml, true);
    // Must NOT contain literal escaped entity strings in sanitized HTML
    assert.strictEqual(result.sanitizedHtml.includes('&lt;p&gt;'), false, 'Must not output raw &lt;p&gt;');
    assert.ok(result.sanitizedHtml.includes('<p>You\'ve built data teams') || result.sanitizedHtml.includes('<p>You&#39;ve built data teams'), 'Must decode to semantic <p>');
    assert.ok(result.sanitizedHtml.includes('<h2><strong>About JetBrains</strong></h2>') || result.sanitizedHtml.includes('About JetBrains'));
  });

  await t.test('4. Double-encoded HTML: decodes &amp;lt;p&amp;gt; to valid markup without double escaping', () => {
    const doubleEncoded = '&amp;lt;p&amp;gt;Double encoded paragraph&amp;lt;/p&amp;gt;';
    const result = sanitizeJobDescription(doubleEncoded);

    assert.strictEqual(result.isHtml, true);
    assert.strictEqual(result.sanitizedHtml.includes('&amp;lt;'), false);
    assert.ok(result.sanitizedHtml.includes('Double encoded paragraph'));
  });

  await t.test('5. Malformed HTML: unclosed tags or broken attributes recover gracefully', () => {
    const malformed = '<p>Unclosed paragraph <b>bold text without closing tag <br> Another line';
    const result = sanitizeJobDescription(malformed);

    assert.strictEqual(result.isHtml, true);
    assert.ok(result.sanitizedHtml.includes('Unclosed paragraph'));
    assert.ok(result.sanitizedHtml.includes('bold text without closing tag'));
    assert.strictEqual(typeof result.sanitizedHtml, 'string');
  });

  await t.test('6. Empty, null, or undefined description: returns clear fallback', () => {
    const emptyResult = sanitizeJobDescription('');
    const nullResult = sanitizeJobDescription(null as any);
    const undefinedResult = sanitizeJobDescription(undefined as any);

    assert.strictEqual(emptyResult.isHtml, false);
    assert.ok(emptyResult.sanitizedHtml.includes('No detailed description provided by employer'));
    assert.ok(nullResult.sanitizedHtml.includes('No detailed description provided by employer'));
    assert.ok(undefinedResult.sanitizedHtml.includes('No detailed description provided by employer'));
  });

  await t.test('7. Very long description: processes correctly without buffer truncation or memory leaks', () => {
    const longHtml = `<p>${'Detailed responsibilities and qualifications. '.repeat(200)}</p>`;
    const result = sanitizeJobDescription(longHtml);

    assert.strictEqual(result.isHtml, true);
    assert.ok(result.plainTextFallback.length > 5000);
    assert.ok(result.sanitizedHtml.startsWith('<p>'));
  });

  await t.test('8. HTML containing scripts and event handlers: completely neutralizes XSS vectors', () => {
    const attackVector = '<p>Normal text</p><script>alert("xss")</script><img src="x" onerror="alert(1)"><span onclick="stealData()">Click</span>';
    const result = sanitizeJobDescription(attackVector);

    assert.strictEqual(result.hasScriptOrUnsafeTags, true);
    assert.strictEqual(result.sanitizedHtml.includes('<script>'), false, 'Must strip script tags');
    assert.strictEqual(result.sanitizedHtml.includes('alert("xss")'), false, 'Must eliminate script bodies');
    assert.strictEqual(result.sanitizedHtml.includes('onerror'), false, 'Must strip onerror attributes');
    assert.strictEqual(result.sanitizedHtml.includes('onclick'), false, 'Must strip onclick attributes');
    assert.ok(result.sanitizedHtml.includes('Normal text'), 'Must preserve legitimate text');
  });

  await t.test('9. HTML containing unsafe links: neutralizes javascript: URIs & enforces target="_blank" rel="noopener"', () => {
    const linkVector = '<a href="javascript:alert(1)">Malicious link</a> and <a href="https://jetbrains.com">Official JetBrains Site</a>';
    const result = sanitizeJobDescription(linkVector);

    assert.strictEqual(result.hasScriptOrUnsafeTags, true);
    assert.strictEqual(result.sanitizedHtml.includes('href="javascript:'), false, 'Must strip javascript: protocol');
    assert.ok(result.sanitizedHtml.includes('href="https://jetbrains.com"'));
    assert.ok(result.sanitizedHtml.includes('target="_blank"'), 'Must enforce target="_blank"');
    assert.ok(result.sanitizedHtml.includes('rel="noopener noreferrer nofollow"'), 'Must enforce rel="noopener noreferrer nofollow"');
  });

  await t.test('10. Descriptions containing tables and lists: preserves structured formatting', () => {
    const tableHtml = '<table><thead><tr><th>Role</th><th>Level</th></tr></thead><tbody><tr><td>Data Scientist</td><td>Staff</td></tr></tbody></table>';
    const result = sanitizeJobDescription(tableHtml);

    assert.strictEqual(result.isHtml, true);
    assert.ok(result.sanitizedHtml.includes('<table>'));
    assert.ok(result.sanitizedHtml.includes('<th>Role</th>'));
    assert.ok(result.sanitizedHtml.includes('<td>Data Scientist</td>'));
  });

  await t.test('11. Skill Classification: "JCP Growth" is classified as Recruiter Tag, NOT a technical skill', () => {
    const jetBrainsDescription = `
      Head of Data Science and Analytics (JetBrains Air)
      You have built data teams from the ground up and know how to turn raw information into better product decisions.
      You will own the data strategy, partnering closely with product, engineering, and leadership teams.
      Build and lead a cohesive team of data scientists, analysts, and data engineers.
      Help teams adopt a rigorous experimentation culture, metric frameworks, data models, self-service reporting.
    `;

    // 1. Single classification of "JCP Growth"
    const singleClass = classifySkill('JCP Growth', jetBrainsDescription);
    assert.strictEqual(singleClass.category, 'other_extracted_phrases');
    assert.strictEqual(singleClass.categoryLabel, 'Recruiter / Category Tag');
    assert.strictEqual(singleClass.isVerifiedInText, false);

    // 2. Full classification of JetBrains Air job with raw tags ["JCP Growth"]
    const summary = classifyJobSkills(['JCP Growth'], jetBrainsDescription);

    // "JCP Growth" must NOT be in technical skills
    assert.strictEqual(summary.technicalSkills.some(s => s.name.toLowerCase().includes('jcp')), false);
    // Must be in otherPhrases
    assert.ok(summary.otherPhrases.some(s => s.name === 'JCP Growth'));

    // Verified skills extracted from authentic employer text:
    const techSkillNames = summary.technicalSkills.map(s => s.name.toLowerCase());
    assert.ok(techSkillNames.includes('data science'), 'Extracts Data Science from text');
    assert.ok(techSkillNames.includes('analytics'), 'Extracts Analytics from text');
    assert.ok(techSkillNames.some(s => s.includes('data model') || s.includes('data engineer')), 'Extracts data engineering competencies');

    const funcSkillNames = summary.functionalSkills.map(s => s.name.toLowerCase());
    assert.ok(funcSkillNames.some(s => s.includes('leadership')), 'Extracts Leadership from text');
    assert.ok(funcSkillNames.includes('experimentation'), 'Extracts Experimentation from text');
    assert.ok(funcSkillNames.includes('metric frameworks'), 'Extracts Metric Frameworks from text');
  });

  await t.test('12. Semantic Section Extractor: identifies responsibilities & company overview', () => {
    const fullDesc = `
      About JetBrains
      We create intelligent software development tools for developers and teams. More than 15 million users rely on our products.

      What you'll do
      • Build and lead a cohesive team of data scientists, analysts, and data engineers.
      • Help teams adopt a rigorous experimentation culture.
      • Establish scalable analytics foundations.

      Requirements
      • 5+ years experience in data leadership.
      • Proven track record in product analytics.
    `;

    const sections = extractSemanticSections(fullDesc);
    assert.strictEqual(sections.hasDetectedSections, true);
    assert.ok(sections.companyOverview?.includes('We create intelligent software development tools'));
    assert.ok(sections.responsibilities.length >= 2);
    assert.ok(sections.responsibilities.some(r => r.includes('Build and lead a cohesive team')));
    assert.ok(sections.qualifications.length >= 1);
  });
});
