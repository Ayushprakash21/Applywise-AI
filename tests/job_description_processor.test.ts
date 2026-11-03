import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeJobDescription,
  decodeHtmlEntities,
  extractPlainText,
  recoverFlattenedDocument,
  containsHtmlTags
} from '../src/services/jobDescriptionProcessor.ts';
import {
  sanitizeIngestedDescription,
  extractPlainTextForMatching
} from '../worker/jobConnectors.ts';

test('Job Description Content Processing & Normalization Suite', async (t) => {
  await t.test('1. HTML containing multiple headings (h1, h2, h3, h4)', () => {
    const raw = `
      <h1>Lead Architecture Engineer</h1>
      <p>Introductory paragraph regarding mission and scope.</p>
      <h2>What You Will Build</h2>
      <p>Detailed architecture breakdown.</p>
      <h3>Core Infrastructure</h3>
      <p>Edge networks and D1 persistence.</p>
      <h4>Technical Stack</h4>
      <p>TypeScript, React, Cloudflare Workers.</p>
    `;
    const res = normalizeJobDescription(raw);
    assert.ok(res.isStructuredHtml);
    assert.match(res.sanitizedHtml, /<h2[^>]*>/, 'Must contain h2 section heading');
    assert.match(res.sanitizedHtml, /<h3[^>]*>Core Infrastructure<\/h3>/, 'Must preserve h3 heading');
    assert.match(res.sanitizedHtml, /<h4[^>]*>Technical Stack<\/h4>/, 'Must preserve h4 heading');
    assert.doesNotMatch(res.sanitizedHtml, /<h1/, 'Body h1 must be normalized to h2 for proper document hierarchy');
  });

  await t.test('2. Multiple paragraphs with distinct spacing', () => {
    const raw = `
      <p>First paragraph about company culture.</p>
      <p>Second paragraph about daily expectations and cross-functional teams.</p>
      <p>Third paragraph with compensation and benefits overview.</p>
    `;
    const res = normalizeJobDescription(raw);
    const matches = res.sanitizedHtml.match(/<p>/g);
    assert.ok(matches && matches.length >= 3, 'Must retain all three distinct paragraphs');
  });

  await t.test('3. Unordered lists (ul, li)', () => {
    const raw = `
      <h2>Qualifications</h2>
      <ul>
        <li>5+ years of experience with distributed systems.</li>
        <li>Proficiency in TypeScript and modern React.</li>
        <li>Hands-on knowledge of edge computing environments.</li>
      </ul>
    `;
    const res = normalizeJobDescription(raw);
    assert.match(res.sanitizedHtml, /<ul>/, 'Must contain unordered list');
    assert.match(res.sanitizedHtml, /<li>5\+ years of experience with distributed systems\.<\/li>/, 'Must preserve first list item');
    assert.match(res.sanitizedHtml, /<li>Proficiency in TypeScript and modern React\.<\/li>/, 'Must preserve second list item');
  });

  await t.test('4. Ordered lists (ol, li)', () => {
    const raw = `
      <h2>Interview Process</h2>
      <ol>
        <li>Initial 30-minute screening conversation.</li>
        <li>Technical architecture discussion.</li>
        <li>Executive culture conversation.</li>
      </ol>
    `;
    const res = normalizeJobDescription(raw);
    assert.match(res.sanitizedHtml, /<ol>/, 'Must preserve ordered list');
    assert.match(res.sanitizedHtml, /<li>Initial 30-minute screening conversation\.<\/li>/, 'Must preserve ordered list item');
  });

  await t.test('5. Bold and emphasis formatting inside paragraphs', () => {
    const raw = '<p>We are seeking a <strong>Principal Systems Architect</strong> who values <em>accuracy and truthfulness</em>.</p>';
    const res = normalizeJobDescription(raw);
    assert.match(res.sanitizedHtml, /<strong>Principal Systems Architect<\/strong>/, 'Must preserve strong tag');
    assert.match(res.sanitizedHtml, /<em>accuracy and truthfulness<\/em>/, 'Must preserve emphasis tag');
  });

  await t.test('6. Mixed headings and lists matching authentic job postings', () => {
    const raw = `
      <h2>About The Opportunity</h2>
      <p>Join our core engineering foundation.</p>
      <h2>Key Responsibilities</h2>
      <ul>
        <li>Deliver high-throughput event processing pipelines.</li>
        <li>Collaborate with reliability engineering teams.</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>Demonstrated track record with zero-hallucination pipelines.</li>
      </ul>
    `;
    const res = normalizeJobDescription(raw);
    assert.match(res.sanitizedHtml, /<h2>About The Opportunity<\/h2>/);
    assert.match(res.sanitizedHtml, /<h2>Key Responsibilities<\/h2>/);
    assert.match(res.sanitizedHtml, /<ul>/);
  });

  await t.test('7. HTML-encoded descriptions (&lt;p&gt;)', () => {
    const raw = '&lt;h2&gt;About The Opportunity&lt;/h2&gt;&lt;p&gt;Are you a talented linguist?&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Translate content.&lt;/li&gt;&lt;/ul&gt;';
    const res = normalizeJobDescription(raw);
    assert.ok(res.isStructuredHtml);
    assert.match(res.sanitizedHtml, /<h2>About The Opportunity<\/h2>/, 'Must decode and render h2');
    assert.match(res.sanitizedHtml, /<p>Are you a talented linguist\?<\/p>/, 'Must decode and render paragraph');
    assert.match(res.sanitizedHtml, /<li>Translate content\.<\/li>/, 'Must decode and render list item');
  });

  await t.test('8. Double-encoded HTML (&amp;lt;p&amp;gt;)', () => {
    const raw = '&amp;lt;h2&amp;gt;What You Deliver&amp;lt;/h2&amp;gt;&amp;lt;p&amp;gt;High quality localization.&amp;lt;/p&amp;gt;';
    const res = normalizeJobDescription(raw);
    assert.match(res.sanitizedHtml, /<h2>What You Deliver<\/h2>/, 'Must decode double-encoded tags');
    assert.match(res.sanitizedHtml, /<p>High quality localization\.<\/p>/, 'Must decode double-encoded paragraph');
  });

  await t.test('9. Plain-text descriptions with newlines and bullet characters', () => {
    const raw = `About The Role\nWe are looking for a staff engineer.\n\nResponsibilities:\n• Design edge architectures\n• Implement reliable APIs\n\nRequirements:\n- 5+ years experience`;
    const res = normalizeJobDescription(raw);
    assert.match(res.sanitizedHtml, /<h2[^>]*>About The Role<\/h2>/);
    assert.match(res.sanitizedHtml, /<p>We are looking for a staff engineer\.<\/p>/);
    assert.match(res.sanitizedHtml, /<ul[^>]*>/);
    assert.match(res.sanitizedHtml, /<li>Design edge architectures<\/li>/);
  });

  await t.test('10. Malformed HTML (unclosed tags, broken attributes)', () => {
    const raw = '<p>Broken paragraph without close <h2>Unclosed heading <ul><li>Item 1<li>Item 2</ul>';
    const res = normalizeJobDescription(raw);
    assert.ok(res.isStructuredHtml);
    assert.match(res.sanitizedHtml, /<li>Item 1<\/li>|<li>Item 1/);
    assert.ok(res.sanitizedHtml.includes('Broken paragraph'));
  });

  await t.test('11. Very long descriptions (over 10,000 characters without clipping)', () => {
    const longPara = '<p>' + 'A'.repeat(5000) + '</p>';
    const raw = `<h2>Section 1</h2>${longPara}<h2>Section 2</h2>${longPara}`;
    const res = normalizeJobDescription(raw);
    assert.ok(res.sanitizedHtml.length >= 10000, 'Must not arbitrarily truncate long descriptions');
    assert.match(res.sanitizedHtml, /<h2>Section 2<\/h2>/, 'Must retain subsequent sections');
  });

  await t.test('12. Empty and null descriptions', () => {
    const empty1 = normalizeJobDescription('');
    const empty2 = normalizeJobDescription(null);
    const empty3 = normalizeJobDescription('   ');
    assert.ok(empty1.sanitizedHtml.includes('No detailed description'));
    assert.ok(empty2.sanitizedHtml.includes('No detailed description'));
    assert.ok(empty3.sanitizedHtml.includes('No detailed description'));
  });

  await t.test('13. HTML tables with proper rows and headers', () => {
    const raw = `
      <h2>Salary Progression Table</h2>
      <table>
        <thead>
          <tr><th>Level</th><th>Base Salary</th></tr>
        </thead>
        <tbody>
          <tr><td>Staff</td><td>$195,000</td></tr>
          <tr><td>Principal</td><td>$245,000</td></tr>
        </tbody>
      </table>
    `;
    const res = normalizeJobDescription(raw);
    assert.match(res.sanitizedHtml, /<table>/);
    assert.match(res.sanitizedHtml, /<th>Level<\/th>/);
    assert.match(res.sanitizedHtml, /<td>\$195,000<\/td>/);
  });

  await t.test('14. Unsafe scripts, iframes, and event handlers neutralization', () => {
    const raw = `
      <h2>Security Test</h2>
      <p>Clean text</p>
      <script>window.maliciousCode = true;</script>
      <img src="x" onerror="alert('xss')" />
      <a href="javascript:alert(1)">Click me</a>
      <iframe src="https://evil.com"></iframe>
    `;
    const res = normalizeJobDescription(raw);
    assert.doesNotMatch(res.sanitizedHtml, /<script/, 'Must neutralize script tags');
    assert.doesNotMatch(res.sanitizedHtml, /maliciousCode/, 'Must neutralize script content');
    assert.doesNotMatch(res.sanitizedHtml, /onerror/, 'Must neutralize onerror event handlers');
    assert.doesNotMatch(res.sanitizedHtml, /href="javascript:/, 'Must neutralize javascript: URLs');
    assert.doesNotMatch(res.sanitizedHtml, /<iframe/, 'Must neutralize iframe tags');
    assert.match(res.sanitizedHtml, /Clean text/, 'Must preserve clean text');
  });

  await t.test('15. Backward compatibility: Recover flattened legacy description (Lilt screenshot case)', () => {
    const flattenedText = "About The Opportunity Are you a talented linguist with a love for language and cutting-edge technology? We want YOU to join our dynamic translation pool! Whatever your specialization, we'd love to hear from you! What You'll Deliver Translate content between English and your native language while preserving cultural nuance and clarity. Edit and refine language content for accuracy, tone, and contextual relevance across digital platforms. Apply current language standards, usage trends, and best practices to all deliverables. Qualifications Native-level proficiency in the target language(s) A graduate qualification in translation, linguistics, or language studies, OR A graduate qualification in another field plus 2 years of full-time professional translation experience. Why Collaborate with Lilt? Your schedule, your rules. As an independent contractor, work when you want. Get paid quickly and fairly.";

    const res = normalizeJobDescription(flattenedText);
    assert.ok(res.isStructuredHtml);
    assert.match(res.sanitizedHtml, /<h2[^>]*>About The Opportunity<\/h2>/, 'Must recover About The Opportunity heading');
    assert.match(res.sanitizedHtml, /<h2[^>]*>What You'll Deliver<\/h2>/, 'Must recover What You\'ll Deliver heading');
    assert.match(res.sanitizedHtml, /<h2[^>]*>Qualifications<\/h2>/, 'Must recover Qualifications heading');
    assert.match(res.sanitizedHtml, /<h2[^>]*>Why Collaborate with Lilt\?<\/h2>/, 'Must recover Why Collaborate with Lilt heading');
    assert.match(res.sanitizedHtml, /<ul[^>]*>/, 'Must recover bulleted list for deliverables');
    assert.match(res.sanitizedHtml, /<li>Translate content between English and your native language/, 'Must recover list item');
  });

  await t.test('16. Provider Ingestion: sanitizeIngestedDescription preserves structural HTML', () => {
    const rawProviderHtml = `
      <h1>About The Opportunity</h1>
      <p>Are you a talented linguist?</p>
      <h2>What You'll Deliver</h2>
      <ul>
        <li>Translate content accurately.</li>
      </ul>
      <script>stealCredentials()</script>
    `;
    const ingested = sanitizeIngestedDescription(rawProviderHtml);
    assert.match(ingested, /<h1>About The Opportunity<\/h1>/, 'Must preserve h1 at ingestion');
    assert.match(ingested, /<h2>What You'll Deliver<\/h2>/, 'Must preserve h2 at ingestion');
    assert.match(ingested, /<ul>\s*<li>Translate content accurately\.<\/li>\s*<\/ul>/, 'Must preserve list at ingestion');
    assert.doesNotMatch(ingested, /<script/, 'Must sanitize script at ingestion');
  });
});
