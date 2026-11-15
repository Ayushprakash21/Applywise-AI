// tests/direct_career_portal_engine.test.ts
// Verification of Direct Company Career Portal Job Discovery Engine

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getDirectAtsAdapter,
  resolveEmployerLogo,
  isVendorLogo,
  DirectAtsType,
  EmployerContext,
  NormalizedEmployerJob,
} from '../worker/directAtsAdapters.ts';

import {
  discoverEmployerCareerPortal,
  normalizeDomain,
  detectAtsFromHtml,
} from '../worker/careerPortalDiscovery.ts';

import {
  SEED_DIRECT_EMPLOYERS,
  bulkImportEmployers,
  fetchDirectEmployerJobs,
  EmployerRecord,
} from '../worker/employerRegistry.ts';

import { authAndStore } from '../server/authAndStore.ts';

describe('Direct Company Career Portal Engine', () => {
  describe('1. ATS Adapters & Logo Hierarchy', () => {
    it('should provide adapters for major ATS systems', () => {
      const expectedAtsList: DirectAtsType[] = [
        'greenhouse',
        'lever',
        'ashby',
        'workday',
        'smartrecruiters',
        'workable',
        'bamboohr',
        'recruitee',
        'breezy',
        'json_ld',
      ];

      for (const ats of expectedAtsList) {
        const adapter = getDirectAtsAdapter(ats);
        assert.ok(adapter, `Adapter for ATS ${ats} must be registered`);
        assert.equal(adapter.name, ats);
      }
    });

    it('should enforce strict logo hierarchy and block vendor logos', () => {
      // Must identify and reject vendor logos
      assert.equal(isVendorLogo('https://boards.greenhouse.io/assets/greenhouse-logo.png'), true);
      assert.equal(isVendorLogo('https://jobs.lever.co/img/lever-logo-white.svg'), true);
      assert.equal(isVendorLogo('https://www.workday.com/content/dam/workday/logos/workday-logo.svg'), true);
      assert.equal(isVendorLogo('https://ashbyhq.com/branding/ashby_logo_dark.png'), true);

      // Level 1: Official Portal API Logo (when valid)
      const officialLogo = resolveEmployerLogo('razorpay.com', 'https://razorpay.com/assets/img/razorpay-logo.png');
      assert.equal(officialLogo.logoStatus, 'portal_api');
      assert.equal(officialLogo.logoUrl, 'https://razorpay.com/assets/img/razorpay-logo.png');

      // Reject vendor logo and fallback to domain favicon (Level 3)
      const vendorFallBack = resolveEmployerLogo('razorpay.com', 'https://boards.greenhouse.io/assets/greenhouse-logo.png');
      assert.equal(vendorFallBack.logoStatus, 'domain_favicon');
      assert.ok(vendorFallBack.logoUrl.includes('google.com/s2/favicons') || vendorFallBack.logoUrl.includes('razorpay.com'));

      // Level 3: Verified domain favicon when no API logo
      const domainLogo = resolveEmployerLogo('postman.com');
      assert.equal(domainLogo.logoStatus, 'domain_favicon');
      assert.ok(domainLogo.logoUrl.includes('domain=postman.com'));

      // Level 4: Initials when no domain
      const emptyLogo = resolveEmployerLogo('');
      assert.equal(emptyLogo.logoStatus, 'initials');
      assert.equal(emptyLogo.logoUrl, '');
    });

    it('should correctly normalize domain names', () => {
      assert.equal(normalizeDomain('https://www.stripe.com/jobs/search'), 'stripe.com');
      assert.equal(normalizeDomain('careers.figma.com/positions'), 'careers.figma.com');
      assert.equal(normalizeDomain('http://razorpay.com/'), 'razorpay.com');
    });
  });

  describe('2. Career Portal Discovery & ATS Detection', () => {
    it('should detect ATS vendor tokens from HTML without fabricating IDs', () => {
      const greenhouseHtml = `
        <html>
          <head><title>Careers at Acme</title></head>
          <body>
            <iframe src="https://boards.greenhouse.io/embed/job_board?for=acmetech"></iframe>
          </body>
        </html>
      `;
      const detectedGh = detectAtsFromHtml(greenhouseHtml, 'https://acme.com/careers');
      assert.equal(detectedGh.detectedAts, 'greenhouse');
      assert.equal(detectedGh.atsBoardId, 'acmetech');
      assert.ok(detectedGh.jobFeedEndpoint?.includes('boards-api.greenhouse.io/v1/boards/acmetech/jobs'));

      const leverHtml = `
        <html>
          <body>
            <a href="https://jobs.lever.co/cloudflare">View Open Roles on Lever</a>
          </body>
        </html>
      `;
      const detectedLever = detectAtsFromHtml(leverHtml, 'https://cloudflare.com/careers');
      assert.equal(detectedLever.detectedAts, 'lever');
      assert.equal(detectedLever.atsBoardId, 'cloudflare');
      assert.ok(detectedLever.jobFeedEndpoint?.includes('api.lever.co/v0/postings/cloudflare'));

      const ashbyHtml = `
        <html>
          <script>
            window.__ASHBY_CONFIG__ = { organizationName: 'ramp' };
          </script>
        </html>
      `;
      const detectedAshby = detectAtsFromHtml(ashbyHtml, 'https://ramp.com/careers');
      assert.equal(detectedAshby.detectedAts, 'ashby');
      assert.equal(detectedAshby.atsBoardId, 'ramp');
      assert.ok(detectedAshby.jobFeedEndpoint?.includes('api.ashbyhq.com/posting-api/job-board/ramp'));
    });

    it('should discover portal details directly from a known ATS board URL', async () => {
      const res = await discoverEmployerCareerPortal({ domainOrUrl: 'https://boards.greenhouse.io/postman' });
      assert.equal(res.detectedAts, 'greenhouse');
      assert.equal(res.atsBoardId, 'postman');
      assert.ok(res.jobFeedEndpoint?.includes('boards-api.greenhouse.io/v1/boards/postman/jobs'));
      assert.equal(res.domain, 'boards.greenhouse.io');
    });
  });

  describe('3. Employer Registry & Multi-Region Seeding', () => {
    it('should have 100+ verified direct employers seeded across multiple geographies', () => {
      assert.ok(SEED_DIRECT_EMPLOYERS.length >= 100, `Expected at least 100 seeded employers, got ${SEED_DIRECT_EMPLOYERS.length}`);

      const countries = new Set(SEED_DIRECT_EMPLOYERS.map(e => e.country));
      assert.ok(countries.has('India'), 'Must include Indian employers');
      assert.ok(countries.has('United States'), 'Must include US employers');
      assert.ok(countries.has('Germany') || countries.has('Netherlands') || countries.has('United Kingdom'), 'Must include European employers');

      // Verify every seed employer has a valid official domain and careers URL
      for (const emp of SEED_DIRECT_EMPLOYERS) {
        assert.ok(emp.name, 'Employer must have a name');
        assert.ok(emp.domain, `Employer ${emp.name} must have a domain`);
        assert.ok(emp.careersUrl, `Employer ${emp.name} must have a careersUrl`);
        assert.ok(emp.detectedAts, `Employer ${emp.name} must have a detectedAts`);
        assert.ok(emp.logoStatus, `Employer ${emp.name} must have a logoStatus`);
      }
    });

    it('should bulk import employers from JSON data and detect their ATS', async () => {
      const importPayload = [
        {
          name: 'Elastic',
          domain: 'elastic.co',
          careersUrl: 'https://jobs.lever.co/elastic',
          country: 'United States',
          industry: 'Search & Data',
        },
        {
          name: 'Zapier',
          domain: 'zapier.com',
          careersUrl: 'https://boards.greenhouse.io/zapier',
          country: 'United States',
          industry: 'Automation',
        },
      ];

      const res = await bulkImportEmployers(importPayload);
      assert.equal(res.importedCount, 2);
      assert.equal(res.records.length, 2);
      assert.equal(res.records[0].detectedAts, 'lever');
      assert.equal(res.records[0].atsBoardId, 'elastic');
      assert.equal(res.records[1].detectedAts, 'greenhouse');
      assert.equal(res.records[1].atsBoardId, 'zapier');
    });
  });

  describe('4. Ingestion Pipeline, Closed Job Detection & Deduplication', () => {
    it('should fetch from public direct employer feed, normalize jobs and preserve application URLs', async () => {
      // Use Postman (Greenhouse public feed) or Razorpay as a live verifiable test
      const postmanEmployer: EmployerRecord = {
        id: 'emp_postman_test',
        name: 'Postman',
        domain: 'postman.com',
        careersUrl: 'https://www.postman.com/company/careers/',
        country: 'India',
        industry: 'Developer Tools',
        detectedAts: 'greenhouse',
        atsBoardId: 'postman',
        jobFeedEndpoint: 'https://boards-api.greenhouse.io/v1/boards/postman/jobs?content=true',
        logoStatus: 'domain_favicon',
        lastDiscoveryTime: new Date().toISOString(),
        fetchStatus: 'idle',
        isEnabled: true,
        totalJobsActive: 0,
      };

      const result = await fetchDirectEmployerJobs(postmanEmployer);
      assert.ok(result.health, 'Must return health report');
      assert.equal(result.health.atsProvider, 'greenhouse');

      if (result.jobs.length > 0) {
        const sample = result.jobs[0];
        assert.ok(sample.id.startsWith('gh_postman_'), 'Must have deterministic prefixed ID');
        assert.ok(sample.title.length > 0, 'Must have title');
        assert.equal(sample.employerName, 'Postman');
        assert.ok(sample.originalApplicationUrl.includes('greenhouse.io') || sample.originalApplicationUrl.includes('postman'), 'Must preserve official application URL');
        assert.equal(sample.isActive, true);
        assert.ok(sample.description.length > 0, 'Must have job description');
      }
    });

    it('should save direct employer jobs and detect closed/pruned jobs', async () => {
      const uniqueDomain = `acmeingestion_${Date.now()}.test`;
      const emp: EmployerRecord = {
        id: `test_emp_${Date.now()}`,
        name: 'Acme Ingestion Test Corp',
        domain: uniqueDomain,
        careersUrl: `https://${uniqueDomain}/careers`,
        country: 'India',
        industry: 'Technology',
        detectedAts: 'greenhouse',
        atsBoardId: 'acmeingestion',
        jobFeedEndpoint: 'https://boards-api.greenhouse.io/v1/boards/acmeingestion/jobs',
        logoStatus: 'domain_favicon',
        lastDiscoveryTime: new Date().toISOString(),
        fetchStatus: 'idle',
        isEnabled: true,
        totalJobsActive: 0,
      };

      const savedEmp = authAndStore.saveDirectEmployer(emp);
      const testEmployerId = savedEmp.id;

      // Ingest Batch 1: Job A and Job B
      const jobA: NormalizedEmployerJob = {
        id: `gh_test_${Date.now()}_A`,
        employerId: testEmployerId,
        employerName: 'Acme Ingestion Test Corp',
        employerDomain: uniqueDomain,
        sourcePortal: 'greenhouse',
        atsProvider: 'greenhouse',
        sourceJobId: '1001',
        title: 'Lead Architect',
        location: 'Bengaluru, India',
        country: 'India',
        workArrangement: 'hybrid',
        employmentType: 'full-time',
        experienceLevel: 'lead',
        originalJobUrl: `https://${uniqueDomain}/jobs/1001`,
        originalApplicationUrl: `https://${uniqueDomain}/jobs/1001/apply`,
        description: 'Design distributed direct ingestion engines.',
        requirements: ['TypeScript', 'SQLite'],
        tags: ['Architecture', 'Backend'],
        publishedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        isActive: true,
        logoStatus: 'domain_favicon',
      };

      const jobB: NormalizedEmployerJob = {
        id: `gh_test_${Date.now()}_B`,
        employerId: testEmployerId,
        employerName: 'Acme Ingestion Test Corp',
        employerDomain: uniqueDomain,
        sourcePortal: 'greenhouse',
        atsProvider: 'greenhouse',
        sourceJobId: '1002',
        title: 'Senior Frontend Engineer',
        location: 'Remote',
        country: 'India',
        workArrangement: 'remote',
        employmentType: 'full-time',
        experienceLevel: 'senior',
        originalJobUrl: `https://${uniqueDomain}/jobs/1002`,
        originalApplicationUrl: `https://${uniqueDomain}/jobs/1002/apply`,
        description: 'Build fast reactive portals.',
        requirements: ['React', 'TypeScript'],
        tags: ['Frontend', 'React'],
        publishedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        isActive: true,
        logoStatus: 'domain_favicon',
      };

      const batch1Res = authAndStore.saveDirectEmployerJobs(testEmployerId, [jobA, jobB]);
      assert.equal(batch1Res.newJobs, 2);
      assert.equal(batch1Res.closedJobs, 0);

      // Ingest Batch 2: Only Job A is present, Job B has been closed by employer
      const batch2Res = authAndStore.saveDirectEmployerJobs(testEmployerId, [jobA]);
      assert.equal(batch2Res.newJobs, 1);
      assert.equal(batch2Res.closedJobs, 1, 'Job B must be detected as closed and pruned from active listings');

      // Verify metrics
      const metrics = await authAndStore.getDirectCareerPortalsMetrics();
      assert.ok(metrics.totalRegisteredEmployers > 0, 'Total registered employers should be > 0');
      assert.ok(metrics.totalActiveJobsIngested >= 1, 'Total active jobs ingested should be >= 1');
      assert.ok(metrics.atsBreakdown.greenhouse > 0, 'Greenhouse breakdown must be counted');
    });
  });
});
