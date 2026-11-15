// tests/universal_opportunity_discovery.test.ts
// Comprehensive Test Suite for ApplyWise AI 2.0 Universal Opportunity Discovery Engine
// Validates Multi-Source ATS Adapters, Canonical Store Deduplication, and Zero-Hallucination Contact Verification

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { globalSourceRegistry } from '../server/sourceAdapters/index.ts';
import { WorkdaySourceAdapter } from '../server/sourceAdapters/workdayAdapter.ts';
import { BambooHRSourceAdapter } from '../server/sourceAdapters/bamboohrAdapter.ts';
import { SchemaOrgJobAdapter } from '../server/sourceAdapters/schemaOrgAdapter.ts';
import { RssJobAdapter } from '../server/sourceAdapters/rssAdapter.ts';
import { CanonicalJobStore } from '../server/sourceAdapters/canonicalStore.ts';
import { HiringAiPipeline } from '../server/hiringAiPipeline.ts';
import { DiscoveredJob } from '../server/sourceAdapters/types.ts';

describe('ApplyWise AI — Universal Opportunity Discovery & Aggregation Suite', () => {

  describe('1. Universal Connector Registry & Adapter Coverage', () => {
    it('initializes with multi-category coverage (ATS, Company Careers, Marketplace)', () => {
      const overview = globalSourceRegistry.getOverview();
      assert.ok(overview.totalSources >= 15, `Expected >= 15 registered sources, got ${overview.totalSources}`);
      assert.ok(overview.categories['ats'] > 0, 'Must have ATS adapters registered');
      assert.ok(overview.categories['marketplace'] > 0, 'Must have Marketplace adapters registered');
      assert.ok(overview.categories['company_careers'] > 0, 'Must have Company Careers adapters registered');
    });

    it('registers Workday, Greenhouse, Lever, Ashby, SmartRecruiters, and BambooHR platforms', () => {
      const all = globalSourceRegistry.getAllAdapters();
      const platforms = new Set(all.map((a) => a.platform.toLowerCase()));

      assert.ok(platforms.has('greenhouse'), 'Must include Greenhouse');
      assert.ok(platforms.has('lever'), 'Must include Lever');
      assert.ok(platforms.has('ashby'), 'Must include Ashby');
      assert.ok(platforms.has('smartrecruiters'), 'Must include SmartRecruiters');
      assert.ok(platforms.has('workday'), 'Must include Workday');
    });

    it('reports health summaries with latency and status contracts', () => {
      const healthSummary = globalSourceRegistry.getHealthSummary();
      assert.ok(Array.isArray(healthSummary));
      const first = healthSummary[0];
      assert.ok(first.sourceId);
      assert.ok(first.sourceName);
      assert.ok(['healthy', 'empty', 'degraded', 'rate_limited', 'offline'].includes(first.status));
      assert.strictEqual(typeof first.totalJobsDiscovered, 'number');
    });
  });

  describe('2. Workday Public Candidate Experience (CXS) Adapter', () => {
    it('constructs correct public Workday CXS endpoints and metadata', () => {
      const adapter = new WorkdaySourceAdapter('Walmart Global Tech', 'walmart', 'WalmartExternal');
      assert.strictEqual(adapter.platform, 'workday');
      assert.strictEqual(adapter.category, 'ats');
      assert.ok(adapter.endpoint.includes('walmart.myworkdayjobs.com/wday/cxs/walmart/WalmartExternal/jobs'));
    });

    it('enforces SSRF protection against malicious or private loopback endpoints', async () => {
      const badAdapter = new WorkdaySourceAdapter('Malicious Inc', '127.0.0.1');
      // Override endpoint to private loopback
      badAdapter.endpoint = 'http://127.0.0.1:8080/wday/cxs/jobs';
      const result = await badAdapter.fetchJobs();
      assert.strictEqual(result.status, 'degraded');
      assert.ok(result.error?.includes('SSRF'));
      assert.strictEqual(result.jobs.length, 0);
    });
  });

  describe('3. BambooHR Public Careers Adapter', () => {
    it('constructs correct BambooHR careers endpoint and metadata', () => {
      const adapter = new BambooHRSourceAdapter('GitLab', 'gitlab');
      assert.strictEqual(adapter.platform, 'bamboohr');
      assert.strictEqual(adapter.category, 'ats');
      assert.ok(adapter.endpoint.includes('gitlab.bamboohr.com/careers/list'));
    });
  });

  describe('4. Schema.org JSON-LD Career Page Adapter', () => {
    it('extracts structured JobPosting records from HTML JSON-LD scripts', () => {
      const adapter = new SchemaOrgJobAdapter('Razorpay', 'https://razorpay.com/jobs');
      const sampleHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Careers at Razorpay</title>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Senior Backend Engineer - Core Payments",
            "description": "<p>Build high-scale financial infrastructure in Go and distributed systems.</p>",
            "datePosted": "2026-11-10",
            "employmentType": "FULL_TIME",
            "hiringOrganization": {
              "@type": "Organization",
              "name": "Razorpay"
            },
            "jobLocation": {
              "@type": "Place",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Bengaluru",
                "addressRegion": "Karnataka",
                "addressCountry": "India"
              }
            },
            "url": "https://razorpay.com/jobs/sr-backend-payments"
          }
          </script>
        </head>
        <body></body>
        </html>
      `;

      const jobs = adapter.extractJobPostingsFromHtml(sampleHtml, 'https://razorpay.com/jobs');
      assert.strictEqual(jobs.length, 1);
      const job = jobs[0];
      assert.strictEqual(job.title, 'Senior Backend Engineer - Core Payments');
      assert.strictEqual(job.company, 'Razorpay');
      assert.ok(job.location.includes('Bengaluru'));
      assert.strictEqual(job.country, 'India');
      assert.strictEqual(job.employmentType, 'full-time');
      assert.strictEqual(job.experienceLevel, 'senior');
      assert.strictEqual(job.url, 'https://razorpay.com/jobs/sr-backend-payments');
    });
  });

  describe('5. RSS/Atom Career Feed Adapter', () => {
    it('parses XML items into standardized DiscoveredJob instances', () => {
      const adapter = new RssJobAdapter('TechNews', 'https://example.com/jobs.rss');
      const sampleXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Careers</title>
            <item>
              <title><![CDATA[Lead Distributed Systems Architect]]></title>
              <link>https://example.com/careers/arch-1</link>
              <description><![CDATA[Remote global opportunity for Kubernetes and distributed cloud architectures.]]></description>
              <pubDate>Wed, 12 Nov 2026 14:00:00 GMT</pubDate>
              <guid>https://example.com/careers/arch-1</guid>
            </item>
          </channel>
        </rss>
      `;

      const jobs = adapter.parseRssXml(sampleXml);
      assert.strictEqual(jobs.length, 1);
      const j = jobs[0];
      assert.strictEqual(j.title, 'Lead Distributed Systems Architect');
      assert.strictEqual(j.remote, true);
      assert.strictEqual(j.arrangement, 'remote');
      assert.strictEqual(j.experienceLevel, 'lead');
    });
  });

  describe('6. Canonical Store Deduplication & Source Precedence', () => {
    it('normalizes company names, titles, and locations deterministically', () => {
      const store = new CanonicalJobStore();
      const hash1 = store.computeCanonicalHash('Razorpay Software Private Limited', 'Senior Software Engineer - Backend', 'Bengaluru, India');
      const hash2 = store.computeCanonicalHash('Razorpay Inc', 'Sr. Software Developer Backend', 'Bengaluru, Karnataka');

      assert.strictEqual(hash1, hash2, 'Normalized hashes must match across common title and company variants');
    });

    it('merges duplicates from aggregators and preserves authoritative ATS links', () => {
      const store = new CanonicalJobStore();

      // First: Aggregator job arrives
      const aggregatorJob: DiscoveredJob = {
        id: 'remotive_12345',
        source: 'remotive',
        sourceJobId: '12345',
        sourceCategory: 'marketplace',
        title: 'Senior Frontend Developer',
        company: 'Stripe',
        location: 'Remote',
        country: 'Global',
        remote: true,
        arrangement: 'remote',
        employmentType: 'full-time',
        experienceLevel: 'senior',
        url: 'https://remotive.com/jobs/stripe-12345',
        directApplicationUrl: 'https://remotive.com/jobs/stripe-12345',
        description: 'React developer needed',
        requirements: ['React'],
        tags: ['Remotive', 'Stripe'],
        publishedAt: '2026-11-10T00:00:00Z',
        retrievedAt: '2026-11-10T00:00:00Z',
        isActive: true,
        lastCheckedAt: '2026-11-10T00:00:00Z',
        sourceConfidence: 0.85,
      };

      // Second: Direct Greenhouse ATS job arrives
      const directAtsJob: DiscoveredJob = {
        id: 'gh_stripe_99999',
        source: 'greenhouse',
        sourceJobId: '99999',
        sourceCategory: 'ats',
        atsPlatform: 'greenhouse',
        title: 'Sr Frontend Engineer',
        company: 'Stripe Inc.',
        location: 'Remote Worldwide',
        country: 'Global',
        remote: true,
        arrangement: 'remote',
        employmentType: 'full-time',
        experienceLevel: 'senior',
        url: 'https://boards.greenhouse.io/stripe/jobs/99999',
        directApplicationUrl: 'https://boards.greenhouse.io/stripe/jobs/99999#app',
        description: 'React core frontend team',
        requirements: ['React', 'TypeScript'],
        tags: ['Greenhouse', 'Fintech'],
        publishedAt: '2026-11-11T00:00:00Z',
        retrievedAt: '2026-11-11T00:00:00Z',
        isActive: true,
        lastCheckedAt: '2026-11-11T00:00:00Z',
        sourceConfidence: 0.98,
      };

      const result = store.ingestBatch([aggregatorJob, directAtsJob]);
      assert.strictEqual(result.accepted, 1, 'Only 1 canonical opportunity created');
      assert.strictEqual(result.duplicatesMerged, 1, '1 duplicate was merged');

      const canonical = store.getOpportunity('remotive_12345')!;
      assert.ok(canonical, 'Canonical record exists');
      // Must have upgraded to direct ATS URL
      assert.strictEqual(canonical.source, 'greenhouse', 'Precedence upgrades source to direct ATS');
      assert.strictEqual(canonical.directApplicationUrl, 'https://boards.greenhouse.io/stripe/jobs/99999#app');
      assert.strictEqual(canonical.duplicateSources.length, 1);
      assert.strictEqual(canonical.duplicateSources[0].source, 'greenhouse');
    });
  });

  describe('7. Zero-Hallucination HR & Recruiter Contact Discovery', () => {
    it('discovers Tier 1 explicit in-post emails with high confidence', async () => {
      const store = new CanonicalJobStore();
      const testJob: DiscoveredJob = {
        id: 'job_test_contact',
        source: 'hiring_posts',
        sourceJobId: 'post_101',
        sourceCategory: 'hiring_announcements',
        title: 'Staff Product Designer',
        company: 'Figma',
        location: 'San Francisco, CA',
        country: 'US',
        remote: false,
        arrangement: 'onsite',
        employmentType: 'full-time',
        experienceLevel: 'lead',
        url: 'https://example.com/post/101',
        description: 'We are expanding our design systems team! Please send your portfolio directly to priya.recruiter@figma.com for review.',
        requirements: ['Figma'],
        tags: ['Design'],
        publishedAt: '2026-11-12T00:00:00Z',
        retrievedAt: '2026-11-12T00:00:00Z',
        isActive: true,
        lastCheckedAt: '2026-11-12T00:00:00Z',
        sourceConfidence: 0.95,
      };

      store.ingestBatch([testJob]);
      const contacts = await store.enrichOpportunityContacts('job_test_contact');

      const explicitContact = contacts.find((c) => c.verificationTier === 'tier_1_in_post');
      assert.ok(explicitContact, 'Must discover explicitly published email');
      assert.strictEqual(explicitContact.email, 'priya.recruiter@figma.com');
      assert.strictEqual(explicitContact.type, 'recruiter_direct');
      assert.ok(explicitContact.confidenceScore >= 0.95);
      assert.ok(explicitContact.provenanceEvidence.includes('priya.recruiter@figma.com'));
    });

    it('attaches Tier 4 hiring manager profile URL WITHOUT fabricating synthetic emails', async () => {
      const store = new CanonicalJobStore();
      const testJob: DiscoveredJob = {
        id: 'job_test_zero_hallucination',
        source: 'hiring_posts',
        sourceJobId: 'post_202',
        sourceCategory: 'hiring_announcements',
        title: 'Lead AI Engineer',
        company: 'Anthropic',
        location: 'Remote',
        country: 'Global',
        remote: true,
        arrangement: 'remote',
        employmentType: 'full-time',
        experienceLevel: 'lead',
        url: 'https://example.com/post/202',
        description: 'Exciting AI alignment role opening up.',
        requirements: ['PyTorch'],
        tags: ['AI'],
        publishedAt: '2026-11-12T00:00:00Z',
        retrievedAt: '2026-11-12T00:00:00Z',
        isActive: true,
        lastCheckedAt: '2026-11-12T00:00:00Z',
        sourceConfidence: 0.95,
      };

      store.ingestBatch([testJob]);
      const recruiterProfile = 'https://linkedin.com/in/verified-ai-hiring-manager';
      const contacts = await store.enrichOpportunityContacts('job_test_zero_hallucination', recruiterProfile);

      const profileContact = contacts.find((c) => c.verificationTier === 'tier_4_profile_only');
      assert.ok(profileContact, 'Must attach profile link');
      assert.strictEqual(profileContact.profileUrl, recruiterProfile);
      assert.strictEqual(profileContact.email, undefined, 'CRITICAL: Must NEVER synthesize or guess email when only profile is provided');
      assert.ok(profileContact.provenanceEvidence.includes('Zero-hallucination'));
    });
  });

  describe('8. Hiring AI Intent & Signal Pipeline', () => {
    it('accurately extracts hiring intent, experience range, and skills without fabrication', () => {
      const pipeline = new HiringAiPipeline();
      const signals = pipeline.analyzeVacancy(
        'Staff Distributed Systems Engineer (Founding Team)',
        `
        We are building the first engineer core team for our next-gen financial ledger.
        Requirements:
        - 8+ years of hands-on experience in backend engineering
        - Production mastery of Go, PostgreSQL, Kafka, and Kubernetes
        - Strong background in microservices and distributed consensus
        - Visa sponsorship is available for qualified applicants.
        `
      );

      assert.strictEqual(signals.intentType, 'founding_role');
      assert.strictEqual(signals.seniorityTier, 'staff_lead');
      assert.strictEqual(signals.estimatedExperienceYears.min, 8);
      assert.strictEqual(signals.isVisaSponsored, true);
      assert.ok(signals.mandatorySkills.includes('go'));
      assert.ok(signals.mandatorySkills.includes('postgresql'));
      assert.ok(signals.mandatorySkills.includes('kubernetes'));
      assert.ok(signals.truthfulnessConfidence >= 0.95);
    });
  });
});
