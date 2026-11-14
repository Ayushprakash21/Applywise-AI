// tests/global_job_hr_intelligence_v2.test.ts
// Comprehensive Test Suite for Global Job Discovery & HR Contact Intelligence Engine (ApplyVise AI 2.0)
// Uses Node native test runner (node:test + node:assert/strict) for 100% npm test compatibility.

import test from 'node:test';
import assert from 'node:assert/strict';
import { globalSourceRegistry } from '../server/sourceAdapters/index.ts';
import { CURATED_COMPANY_REGISTRY, buildCompanyAdapters } from '../server/sourceAdapters/companyAdapters.ts';
import {
  normalizeCompanyName,
  cleanJobTitle,
  generateDedupKey,
  deduplicateJobs,
  verifyJobFreshness,
} from '../server/jobQualityEngine.ts';
import {
  validateEmailSyntax,
  isRoleBasedEmailAddress,
  DISPOSABLE_EMAIL_DOMAINS,
} from '../src/utils/hrEmailVerification.ts';
import { DurableScheduler } from '../server/durableScheduler.ts';
import { DiscoveredJob } from '../server/sourceAdapters/types.ts';

test('APPLYVISE AI — Global Job Discovery & HR Contact Intelligence Engine v2', async (t) => {
  await t.test('1. Global Job Source Adapter Framework & Expansion', async (st) => {
    await st.test('registers all default marketplace and curated company adapters', () => {
      const allAdapters = globalSourceRegistry.getAllAdapters();
      assert.ok(allAdapters.length >= 15, 'Registry must contain at least 15 adapters');

      const overview = globalSourceRegistry.getOverview();
      assert.ok(overview.totalSources >= 15, 'Total sources overview must be >= 15');
      assert.ok(overview.categories.marketplace >= 3, 'Marketplace category must have >= 3 adapters');
      const companyRelated = (overview.categories.ats || 0) + (overview.categories.company_careers || 0);
      assert.ok(companyRelated >= 12, 'ATS and Company Careers adapters must total >= 12');
    });

    await st.test('contains Indian tech leaders and global product leaders in curated registry', () => {
      const companyNames = CURATED_COMPANY_REGISTRY.map((c) => c.companyName);
      assert.ok(companyNames.includes('Razorpay'), 'Must include Razorpay');
      assert.ok(companyNames.includes('CRED'), 'Must include CRED');
      assert.ok(companyNames.includes('Meesho'), 'Must include Meesho');
      assert.ok(companyNames.includes('InMobi'), 'Must include InMobi');
      assert.ok(companyNames.includes('Postman'), 'Must include Postman');
      assert.ok(companyNames.includes('Swiggy'), 'Must include Swiggy');
      assert.ok(companyNames.includes('Zomato'), 'Must include Zomato');
      assert.ok(companyNames.includes('Flipkart'), 'Must include Flipkart');
      assert.ok(companyNames.includes('Cloudflare'), 'Must include Cloudflare');
      assert.ok(companyNames.includes('Airbnb'), 'Must include Airbnb');
      assert.ok(companyNames.includes('Netflix'), 'Must include Netflix');
    });

    await st.test('buildCompanyAdapters instantiates adapters with valid public endpoints', () => {
      const adapters = buildCompanyAdapters();
      assert.equal(adapters.length, CURATED_COMPANY_REGISTRY.length, 'Must build adapters for every registry company');
      for (const a of adapters) {
        assert.ok(a.id, 'Adapter must have an id');
        assert.ok(a.name, 'Adapter must have a name');
        assert.match(a.endpoint, /^https:\/\//, 'Endpoint must use secure HTTPS');
        assert.equal(typeof a.fetchJobs, 'function', 'fetchJobs must be a function');
        assert.equal(typeof a.getHealth, 'function', 'getHealth must be a function');
      }
    });
  });

  await t.test('2. Multi-Factor Deduplication & Quality Engine', async (st) => {
    await st.test('normalizes company names correctly by stripping legal entity noise', () => {
      assert.equal(normalizeCompanyName('Razorpay Software Private Limited'), 'razorpay');
      assert.equal(normalizeCompanyName('CRED Technologies Inc.'), 'cred');
      assert.equal(normalizeCompanyName('Tata Consultancy Services Ltd.'), 'tata consultancy');
      assert.equal(normalizeCompanyName('InMobi Technologies Pvt Ltd'), 'inmobi');
      assert.equal(normalizeCompanyName('Netflix, Inc.'), 'netflix');
    });

    await st.test('cleans job titles by removing requisition codes, locations, and brackets', () => {
      assert.equal(cleanJobTitle('Senior Backend Engineer [REQ-4920] (Remote)'), 'senior backend engineer');
      assert.equal(cleanJobTitle('Staff Full-Stack Developer - India - Immediate Joiner'), 'staff full stack developer');
      assert.equal(cleanJobTitle('Lead Product Manager (Bangalore / Remote)'), 'lead product manager');
    });

    await st.test('generates consistent deterministic deduplication keys across sources', () => {
      const key1 = generateDedupKey('Razorpay Software Pvt Ltd', 'Senior Backend Engineer [REQ-101]', 'Bengaluru, India');
      const key2 = generateDedupKey('Razorpay', 'Senior Backend Engineer (Remote / Bengaluru)', 'India');
      assert.equal(key1, key2, 'Keys must match for identical company and role');
    });

    await st.test('deduplicates cross-source postings and prioritizes primary ATS source confidence', () => {
      const mockJobs: DiscoveredJob[] = [
        {
          id: 'job_mkt_1',
          source: 'arbeitnow',
          sourceJobId: 'slug-1',
          sourceCategory: 'marketplace',
          sourceConfidence: 0.85,
          title: 'Senior Frontend Engineer (Remote)',
          company: 'Cloudflare Inc.',
          location: 'Remote',
          remote: true,
          arrangement: 'remote',
          url: 'https://arbeitnow.com/job/1',
          description: 'React, TypeScript and edge platforms.',
          requirements: ['React', 'TypeScript'],
          publishedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: 'job_ats_1',
          source: 'greenhouse',
          sourceJobId: 'gh-492',
          sourceCategory: 'ats',
          atsPlatform: 'greenhouse',
          sourceConfidence: 0.98,
          title: 'Senior Frontend Engineer [REQ-492]',
          company: 'Cloudflare',
          location: 'Worldwide Remote',
          remote: true,
          arrangement: 'remote',
          url: 'https://boards.greenhouse.io/cloudflare/jobs/492',
          directApplicationUrl: 'https://boards.greenhouse.io/cloudflare/jobs/492#apply',
          description: 'Build fast edge web interfaces with React and TypeScript.',
          requirements: ['React', 'TypeScript'],
          publishedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: 'job_diff_2',
          source: 'jobicy',
          sourceJobId: 'jobicy-2',
          sourceCategory: 'marketplace',
          sourceConfidence: 0.88,
          title: 'Staff Security Engineer',
          company: 'Cloudflare',
          location: 'Remote',
          remote: true,
          arrangement: 'remote',
          url: 'https://jobicy.com/job/2',
          description: 'Cloudflare WAF and AppSec engineering.',
          requirements: ['Security', 'Cryptography'],
          publishedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          isActive: true,
        },
      ];

      const result = deduplicateJobs(mockJobs);
      assert.equal(result.duplicateCount, 1, 'Duplicate count must be 1');
      assert.equal(result.uniqueJobs.length, 2, 'Unique job count must be 2');

      const cloudflareFrontend = result.uniqueJobs.find((j) => j.title.toLowerCase().includes('frontend'));
      assert.equal(cloudflareFrontend?.id, 'job_ats_1', 'Primary ATS job must be preferred');
      assert.equal(cloudflareFrontend?.sourceCategory, 'ats', 'Source category must be ats');
    });

    await st.test('rejects unsafe SSRF URLs during freshness verification', async () => {
      const res1 = await verifyJobFreshness('http://localhost:8080/secret');
      assert.equal(res1.isActive, false, 'Localhost must be rejected');
      assert.match(res1.reason, /Invalid or blocked URL/, 'Reason must mention blocked URL');

      const res2 = await verifyJobFreshness('http://169.254.169.254/latest/meta-data');
      assert.equal(res2.isActive, false, 'Link-local cloud metadata must be rejected');
    });
  });

  await t.test('3. HR Recruiter Email Discovery & Multi-Stage Verification Pipeline', async (st) => {
    await st.test('validates standard email syntax correctly and rejects illegal characters', () => {
      assert.equal(validateEmailSyntax('talent@razorpay.com').valid, true);
      assert.equal(validateEmailSyntax('careers@meesho.io').valid, true);
      assert.equal(validateEmailSyntax('invalid-email-without-at.com').valid, false);
      assert.equal(validateEmailSyntax('recruiter@domain..com').valid, false);
      assert.equal(validateEmailSyntax('').valid, false);
    });

    await st.test('rejects disposable and temporary email domains', () => {
      assert.equal(DISPOSABLE_EMAIL_DOMAINS.has('mailinator.com'), true);
      assert.equal(DISPOSABLE_EMAIL_DOMAINS.has('tempmail.com'), true);
      assert.equal(DISPOSABLE_EMAIL_DOMAINS.has('throwawaymail.com'), true);
    });

    await st.test('accurately classifies role-based recruitment inboxes vs named recruiters', () => {
      assert.equal(isRoleBasedEmailAddress('careers'), true);
      assert.equal(isRoleBasedEmailAddress('talent'), true);
      assert.equal(isRoleBasedEmailAddress('recruitment'), true);
      assert.equal(isRoleBasedEmailAddress('hrteam'), true);
      assert.equal(isRoleBasedEmailAddress('jobs'), true);

      assert.equal(isRoleBasedEmailAddress('priya.sharma'), false);
      assert.equal(isRoleBasedEmailAddress('alex.chen'), false);
    });
  });

  await t.test('4. Durable Scheduler with Priority Queues & Mutex Locking', async (st) => {
    await st.test('initializes scheduler with high, standard and maintenance priority tasks', () => {
      const scheduler = new DurableScheduler();
      const status = scheduler.getStatus();

      assert.ok(status.tasks.length >= 4, 'Scheduler must have >= 4 default tasks');
      const taskIds = status.tasks.map((t) => t.id);
      assert.ok(taskIds.includes('task_ats_sync'), 'Must include task_ats_sync');
      assert.ok(taskIds.includes('task_marketplace_sync'), 'Must include task_marketplace_sync');
      assert.ok(taskIds.includes('task_closure_cleanup'), 'Must include task_closure_cleanup');
      assert.ok(taskIds.includes('task_hr_discovery_queue'), 'Must include task_hr_discovery_queue');
    });

    await st.test('executes tasks under lock and prevents overlapping execution', async () => {
      const scheduler = new DurableScheduler();
      let counter = 0;

      scheduler.registerTask({
        id: 'test_task',
        name: 'Test Mutex Task',
        priority: 'high',
        intervalMs: 10000,
        nextRunAt: new Date().toISOString(),
        consecutiveFailures: 0,
        status: 'idle',
        execute: async () => {
          counter++;
          await new Promise((r) => setTimeout(r, 60));
          return { itemsProcessed: 1, itemsAccepted: 1 };
        },
      });

      const runPromise1 = scheduler.triggerTask('test_task');
      const runPromise2 = scheduler.triggerTask('test_task');

      const [res1, res2] = await Promise.all([runPromise1, runPromise2]);
      assert.equal(res1.success, true, 'First task run should succeed');
      assert.equal(res2.success, false, 'Second overlapping task run should be rejected');
      assert.match(res2.message, /is currently executing/, 'Message must explain lock collision');
      assert.equal(counter, 1, 'Counter must increment exactly once');
    });
  });
});
