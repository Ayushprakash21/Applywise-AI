// tests/company_logo_and_carousel.test.ts
// Unit and integration tests for Opportunity Radar Carousel & Multi-Tier Company Logo Resolution

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_COMPANY_REGISTRY,
  lookupCompanyMetadata,
  resolveCompanyLogo,
  getCompanyInitials,
  normalizeDomain,
  LogoResolutionResult,
} from '../src/services/companyRegistry.ts';
import { formatPostingRecency } from '../src/components/hero/OpportunityRadarCarousel.tsx';
import { JobVacancy } from '../src/types/index.ts';

describe('Company Logo Resolution & Registry Architecture', () => {
  test('Canonical registry has top employers mapped with valid domains', () => {
    const requiredEmployers = [
      'microsoft',
      'meta',
      'swiggy',
      'uber',
      'apple',
      'google',
      'stripe',
      'linear',
      'vercel',
      'cloudflare',
      'figma',
      'gitlab',
      'databricks',
      'spotify',
      'palantir',
      'notion',
      'razorpay',
      'cred',
      'meesho',
      'netflix',
      'airbnb',
      'supabase',
    ];

    for (const emp of requiredEmployers) {
      const entry = CANONICAL_COMPANY_REGISTRY[emp];
      assert.ok(entry, `Expected canonical entry for ${emp}`);
      assert.ok(entry.canonicalName, `Expected canonicalName for ${emp}`);
      assert.ok(entry.domain, `Expected valid domain for ${emp}`);
      assert.ok(Array.isArray(entry.aliases), `Expected aliases array for ${emp}`);
    }
  });

  test('Alias resolution maps varied company representations to canonical entity', () => {
    // Microsoft variants
    assert.equal(lookupCompanyMetadata('Microsoft')?.canonicalName, 'Microsoft');
    assert.equal(lookupCompanyMetadata('Microsoft Corp')?.canonicalName, 'Microsoft');
    assert.equal(lookupCompanyMetadata('MSFT')?.canonicalName, 'Microsoft');
    assert.equal(lookupCompanyMetadata('Microsoft Corporation')?.canonicalName, 'Microsoft');

    // Meta / Facebook variants
    assert.equal(lookupCompanyMetadata('Meta')?.canonicalName, 'Meta');
    assert.equal(lookupCompanyMetadata('Facebook')?.canonicalName, 'Meta');
    assert.equal(lookupCompanyMetadata('Meta Platforms Inc')?.canonicalName, 'Meta');

    // Google / Alphabet variants
    assert.equal(lookupCompanyMetadata('Google')?.canonicalName, 'Google');
    assert.equal(lookupCompanyMetadata('Alphabet')?.canonicalName, 'Google');
    assert.equal(lookupCompanyMetadata('Google LLC')?.canonicalName, 'Google');

    // Indian tech leaders
    assert.equal(lookupCompanyMetadata('Swiggy')?.canonicalName, 'Swiggy');
    assert.equal(lookupCompanyMetadata('Bundl Technologies')?.canonicalName, 'Swiggy');
    assert.equal(lookupCompanyMetadata('Razorpay')?.canonicalName, 'Razorpay');
    assert.equal(lookupCompanyMetadata('CRED')?.canonicalName, 'CRED');
    assert.equal(lookupCompanyMetadata('Meesho')?.canonicalName, 'Meesho');
  });

  test('Multi-tier logo resolution: Tier 1 - Source API logo prioritized when valid', () => {
    const sourceApiLogo = 'https://remotive.com/job/1234/logo.png';
    const result = resolveCompanyLogo('Google', sourceApiLogo, 'google.com');

    assert.equal(result.source, 'source_api');
    assert.equal(result.url, sourceApiLogo);
    assert.equal(result.domain, 'google.com');
  });

  test('Multi-tier logo resolution: Tier 2 - Canonical verified domain logo used when source API logo missing', () => {
    const result = resolveCompanyLogo('Microsoft', undefined, undefined);

    assert.equal(result.source, 'company_domain');
    assert.equal(result.url, 'https://logo.clearbit.com/microsoft.com');
    assert.equal(result.domain, 'microsoft.com');
  });

  test('Multi-tier logo resolution: Tier 3 - Domain logo constructed when verified domain is provided', () => {
    const result = resolveCompanyLogo('Acme Cloud Services', null, 'acmecloud.io');

    assert.equal(result.source, 'clearbit_logo');
    assert.equal(result.url, 'https://logo.clearbit.com/acmecloud.io');
    assert.equal(result.domain, 'acmecloud.io');
  });

  test('Multi-tier logo resolution: Tier 4 - Initials fallback generated gracefully', () => {
    const result = resolveCompanyLogo('Unregistered Startup XYZ', undefined, undefined);

    assert.equal(result.source, 'initials');
    assert.equal(result.url, null);
    assert.equal(result.domain, null);
    assert.equal(result.initials, 'US');
  });

  test('Domain normalization strips protocols, paths, www, and query params', () => {
    assert.equal(normalizeDomain('https://www.google.com/careers?id=1'), 'google.com');
    assert.equal(normalizeDomain('http://MICROSOFT.COM/'), 'microsoft.com');
    assert.equal(normalizeDomain('sub.domain.co.uk/path'), 'sub.domain.co.uk');
    assert.equal(normalizeDomain('   '), null);
    assert.equal(normalizeDomain(undefined), null);
  });

  test('Initials generator produces clean, high-contrast two-letter initials', () => {
    assert.equal(getCompanyInitials('Microsoft Corporation'), 'MC');
    assert.equal(getCompanyInitials('Swiggy'), 'SW');
    assert.equal(getCompanyInitials('A'), 'A');
    assert.equal(getCompanyInitials(''), 'CO');
    assert.equal(getCompanyInitials(undefined), 'CO');
    assert.equal(getCompanyInitials('3M Company'), '3C');
  });

  test('Edge cases: null, undefined, whitespace inputs never throw', () => {
    assert.doesNotThrow(() => resolveCompanyLogo(''));
    assert.doesNotThrow(() => resolveCompanyLogo('   ', 'not-a-valid-url'));
    assert.doesNotThrow(() => resolveCompanyLogo('Unknown Corp', null, null));

    const fallback = resolveCompanyLogo('', '', '');
    assert.equal(fallback.source, 'initials');
    assert.equal(fallback.initials, 'CO');
  });
});

describe('Opportunity Radar Carousel Data & Animation Contracts', () => {
  test('Posting recency formatter handles varied timestamp formats accurately', () => {
    const now = Date.now();
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();

    assert.equal(formatPostingRecency(tenMinutesAgo), '10 mins ago');
    assert.equal(formatPostingRecency(twoHoursAgo), '2 hrs ago');
    assert.equal(formatPostingRecency(threeDaysAgo), '3 days ago');
    assert.equal(formatPostingRecency(undefined), 'Recently');
    assert.equal(formatPostingRecency('invalid-date'), 'Recently');
  });

  test('JobVacancy canonical schema includes all required company logo fields', () => {
    const sampleVacancy: JobVacancy = {
      id: 'job_test_001',
      source: 'greenhouse',
      title: 'Senior Distributed Systems Engineer',
      company: 'Cloudflare',
      companyLogo: 'https://logo.clearbit.com/cloudflare.com',
      companyLogoUrl: 'https://logo.clearbit.com/cloudflare.com',
      companyDomain: 'cloudflare.com',
      companyLogoSource: 'company_domain',
      companyLogoVerifiedAt: new Date().toISOString(),
      location: 'San Francisco, CA (Remote)',
      country: 'United States',
      remote: true,
      arrangement: 'remote',
      url: 'https://boards.greenhouse.io/cloudflare/jobs/12345',
      description: 'Design and build resilient global edge services.',
      requirements: ['Rust', 'Go', 'Distributed Systems'],
      tags: ['Cloudflare', 'Edge', 'Remote'],
      postedDate: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      retrievedAt: new Date().toISOString(),
      isActive: true,
      employmentType: 'full-time',
      experienceLevel: 'senior',
    };

    assert.equal(sampleVacancy.company, 'Cloudflare');
    assert.equal(sampleVacancy.companyDomain, 'cloudflare.com');
    assert.equal(sampleVacancy.companyLogoSource, 'company_domain');
    assert.ok(sampleVacancy.companyLogoUrl?.includes('cloudflare.com'));
    assert.ok(sampleVacancy.companyLogoVerifiedAt);
  });

  test('Cache resolution prevents repeated redundant URL generations', () => {
    const res1 = resolveCompanyLogo('Microsoft');
    const res2 = resolveCompanyLogo('Microsoft');
    assert.strictEqual(res1, res2, 'Subsequent lookups should return cached object reference');
  });

  test('Carousel duplicated array produces seamless 2x items for loop', () => {
    const sampleJobs: JobVacancy[] = [
      {
        id: 'job_1',
        source: 'greenhouse',
        title: 'Backend Engineer',
        company: 'Stripe',
        location: 'Remote',
        url: 'https://stripe.com/jobs/1',
        description: 'Payments infrastructure',
        requirements: ['Ruby', 'Go'],
        tags: ['Payments'],
        postedDate: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        retrievedAt: new Date().toISOString(),
        isActive: true,
      },
      {
        id: 'job_2',
        source: 'lever',
        title: 'Frontend Architect',
        company: 'Figma',
        location: 'San Francisco, CA',
        url: 'https://figma.com/jobs/2',
        description: 'Design systems architecture',
        requirements: ['TypeScript', 'WebGL'],
        tags: ['Design'],
        postedDate: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        retrievedAt: new Date().toISOString(),
        isActive: true,
      },
    ];

    // Carousel duplicate logic: [...sampleJobs, ...sampleJobs]
    const loopItems = [...sampleJobs, ...sampleJobs];
    assert.equal(loopItems.length, sampleJobs.length * 2);
    assert.equal(loopItems[0].id, loopItems[2].id);
    assert.equal(loopItems[1].id, loopItems[3].id);
  });
});

