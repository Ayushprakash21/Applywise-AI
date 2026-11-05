import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import {
  normalizeJobUrl,
  isPrivateOrBlockedIp,
  validateSafePublicUrl,
  extractFromJsonLd,
  extractFromSupportedAdapters,
  extractFromRawPastedText,
  executeUniversalJobExtraction
} from '../server/jobImportEngine.ts';
import { authAndStore } from '../server/authAndStore.ts';
import { ExtractedJobData, UserImportedJobRecord, JobVacancy } from '../src/types/index.ts';

describe('Universal Job Import — URL Canonicalization & Normalization', () => {
  it('strips tracking parameters, hash fragments, and normalizes URLs', () => {
    const rawUrl = 'https://www.linkedin.com/jobs/view/123456789/?utm_source=share&utm_medium=member_desktop&ref=job_search&fbclid=abcdef#apply';
    const normalized = normalizeJobUrl(rawUrl);

    assert.strictEqual(normalized.sourceDomain, 'linkedin.com');
    assert.ok(!normalized.canonicalUrl.includes('utm_source'));
    assert.ok(!normalized.canonicalUrl.includes('utm_medium'));
    assert.ok(!normalized.canonicalUrl.includes('ref='));
    assert.ok(!normalized.canonicalUrl.includes('fbclid'));
    assert.ok(!normalized.canonicalUrl.includes('#apply'));
    assert.strictEqual(normalized.canonicalUrl, 'https://linkedin.com/jobs/view/123456789');
  });

  it('normalizes Greenhouse and Lever job board URLs', () => {
    const leverUrl = 'https://jobs.lever.co/stripe/98765432-abcd-ef01-2345-6789abcdef01/?gh_src=123';
    const normLever = normalizeJobUrl(leverUrl);
    assert.strictEqual(normLever.sourceDomain, 'jobs.lever.co');
    assert.ok(!normLever.canonicalUrl.includes('gh_src'));

    const ghUrl = 'https://boards.greenhouse.io/figma/jobs/4567890?utm_campaign=board';
    const normGh = normalizeJobUrl(ghUrl);
    assert.strictEqual(normGh.sourceDomain, 'boards.greenhouse.io');
    assert.ok(!normGh.canonicalUrl.includes('utm_campaign'));
  });

  it('handles malformed URLs gracefully without crashing', () => {
    const bad = normalizeJobUrl('not-a-valid-url');
    assert.strictEqual(bad.sourceDomain, 'unknown');
    assert.strictEqual(bad.canonicalUrl, 'not-a-valid-url');
  });
});

describe('Universal Job Import — SSRF and Network Security Boundaries', () => {
  it('blocks loopback IPv4 addresses', () => {
    assert.strictEqual(isPrivateOrBlockedIp('127.0.0.1'), true);
    assert.strictEqual(isPrivateOrBlockedIp('127.0.1.1'), true);
    assert.strictEqual(isPrivateOrBlockedIp('127.255.255.255'), true);
  });

  it('blocks IPv6 loopback and unspecified addresses', () => {
    assert.strictEqual(isPrivateOrBlockedIp('::1'), true);
    assert.strictEqual(isPrivateOrBlockedIp('0:0:0:0:0:0:0:1'), true);
    assert.strictEqual(isPrivateOrBlockedIp('::'), true);
  });

  it('blocks AWS/GCP/Azure link-local cloud metadata IPs (169.254.169.254)', () => {
    assert.strictEqual(isPrivateOrBlockedIp('169.254.169.254'), true);
    assert.strictEqual(isPrivateOrBlockedIp('169.254.1.1'), true);
  });

  it('blocks RFC 1918 private subnets (10.x, 172.16-31.x, 192.168.x)', () => {
    assert.strictEqual(isPrivateOrBlockedIp('10.0.0.1'), true);
    assert.strictEqual(isPrivateOrBlockedIp('10.255.255.255'), true);
    assert.strictEqual(isPrivateOrBlockedIp('172.16.0.1'), true);
    assert.strictEqual(isPrivateOrBlockedIp('172.31.255.255'), true);
    assert.strictEqual(isPrivateOrBlockedIp('192.168.1.1'), true);
    assert.strictEqual(isPrivateOrBlockedIp('192.168.0.100'), true);
  });

  it('allows public routable internet IPs', () => {
    assert.strictEqual(isPrivateOrBlockedIp('8.8.8.8'), false);
    assert.strictEqual(isPrivateOrBlockedIp('104.21.5.1'), false);
    assert.strictEqual(isPrivateOrBlockedIp('142.250.190.46'), false);
  });

  it('validateSafePublicUrl rejects non-http protocols and local hostnames', async () => {
    const fileResult = await validateSafePublicUrl('file:///etc/passwd');
    assert.strictEqual(fileResult.safe, false);
    assert.ok(fileResult.error?.includes('HTTP'));

    const ftpResult = await validateSafePublicUrl('ftp://example.com/job');
    assert.strictEqual(ftpResult.safe, false);

    const localResult = await validateSafePublicUrl('http://localhost:8080/admin');
    assert.strictEqual(localResult.safe, false);
    assert.ok(fileResult.error?.includes('HTTP') || localResult.error?.includes('security') || localResult.error?.includes('blocked'));

    const internalResult = await validateSafePublicUrl('http://internal-service.local/job');
    assert.strictEqual(internalResult.safe, false);
  });
});

describe('Universal Job Import — Structured Schema.org JSON-LD Extraction', () => {
  it('extracts complete job posting details from valid JSON-LD', () => {
    const htmlWithJsonLd = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Senior Distributed Systems Engineer - Stripe</title>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          "title": "Senior Distributed Systems Engineer",
          "description": "<p>Build high-throughput payment routing infrastructure. Requirements: Go, Distributed Systems, Kubernetes, Kafka.</p>",
          "datePosted": "2026-03-01T08:00:00Z",
          "employmentType": "FULL_TIME",
          "hiringOrganization": {
            "@type": "Organization",
            "name": "Stripe",
            "sameAs": "https://stripe.com"
          },
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "San Francisco",
              "addressRegion": "CA",
              "addressCountry": "US"
            }
          },
          "jobLocationType": "TELECOMMUTE",
          "baseSalary": {
            "@type": "MonetaryAmount",
            "currency": "USD",
            "value": {
              "@type": "QuantitativeValue",
              "minValue": 195000,
              "maxValue": 245000,
              "unitText": "YEAR"
            }
          }
        }
        </script>
      </head>
      <body>Job page</body>
      </html>
    `;

    const result = extractFromJsonLd(htmlWithJsonLd, 'https://stripe.com/jobs/123');
    assert.ok(result, 'Expected JSON-LD extraction to succeed');
    assert.strictEqual(result.title, 'Senior Distributed Systems Engineer');
    assert.strictEqual(result.company, 'Stripe');
    assert.strictEqual(result.workplaceType, 'Remote');
    assert.strictEqual(result.salaryRange?.min, 195000);
    assert.strictEqual(result.salaryRange?.max, 245000);
    assert.strictEqual(result.salaryRange?.currency, 'USD');
    assert.strictEqual(result.extractionMethod, 'json_ld');
    assert.strictEqual(result.extractionStatus, 'verified_source');
    assert.ok(result.requiredSkills.includes('Go'));
    assert.ok(result.requiredSkills.includes('Distributed Systems'));
    assert.ok(result.requiredSkills.includes('Kubernetes'));
  });

  it('guarantees zero-hallucination when salary or dates are absent in JSON-LD', () => {
    const htmlNoSalary = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Lead Product Designer",
        "hiringOrganization": { "name": "Linear" },
        "jobLocation": { "address": "Remote" }
      }
      </script>
    `;

    const result = extractFromJsonLd(htmlNoSalary, 'https://linear.app/careers/456');
    assert.ok(result);
    assert.strictEqual(result.title, 'Lead Product Designer');
    assert.strictEqual(result.company, 'Linear');
    assert.strictEqual(result.salaryRange, null, 'Never fabricates a salary when absent');
    assert.strictEqual(result.deadline, null, 'Never fabricates a deadline');
  });
});

describe('Universal Job Import — ATS Adapters & Raw Text Parsing', () => {
  it('extracts role and company from Greenhouse ATS HTML structures', () => {
    const greenhouseHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Staff Backend Architect at Figma" />
        <meta property="og:description" content="We are looking for a Staff Backend Architect to design scalable graph sync." />
      </head>
      <body>
        <div id="header">
          <h1 class="app-title">Staff Backend Architect</h1>
          <span class="company-name">at Figma</span>
          <div class="location">San Francisco, CA or Remote</div>
        </div>
        <div id="content">
          <p>Proficiency in Rust, PostgreSQL, GraphQL, and AWS required.</p>
        </div>
      </body>
      </html>
    `;

    const result = extractFromSupportedAdapters(greenhouseHtml, 'https://boards.greenhouse.io/figma/jobs/999');
    assert.ok(result);
    assert.strictEqual(result.title, 'Staff Backend Architect');
    assert.strictEqual(result.company, 'Figma');
    assert.strictEqual(result.extractionMethod, 'adapter');
    assert.ok(result.requiredSkills.includes('Rust'));
    assert.ok(result.requiredSkills.includes('PostgreSQL'));
  });

  it('parses raw pasted job descriptions truthfully without hallucinating missing attributes', async () => {
    const rawJd = `
      Senior Site Reliability Engineer
      Company: OpenAI
      Location: San Francisco, CA (Hybrid)

      About the role:
      We operate some of the largest compute clusters in the world.
      You will automate cluster operations, scale Kubernetes clusters, and troubleshoot Linux kernel issues.

      Requirements:
      - 5+ years of experience with Linux systems administration
      - Strong proficiency in Python or Go
      - Extensive experience with Kubernetes, Terraform, and Docker
      - Deep understanding of distributed systems and observability (Prometheus, Grafana)
    `;

    const result = await extractFromRawPastedText(rawJd, 'Senior SRE', 'OpenAI', 'https://openai.com/careers/123');
    assert.strictEqual(result.title, 'Senior SRE');
    assert.strictEqual(result.company, 'OpenAI');
    assert.strictEqual(result.workplaceType, 'Hybrid');
    assert.strictEqual(result.extractionMethod, 'manual');
    assert.strictEqual(result.extractionStatus, 'manual_entry');
    assert.strictEqual(result.salaryRange, null, 'Salary should not be hallucinated if not in text');
    assert.ok(result.requiredSkills.includes('Kubernetes'));
    assert.ok(result.requiredSkills.includes('Terraform'));
    assert.ok(result.requiredSkills.includes('Docker'));
  });
});

describe('Universal Job Import — Multi-Tenant Persistence & Isolation in authAndStore', () => {
  let userA: any;
  let userB: any;

  before(() => {
    userA = authAndStore.createUser('Import Candidate A', `import_a_${Date.now()}@applyvise.com`, 'Password123!');
    userB = authAndStore.createUser('Import Candidate B', `import_b_${Date.now()}@applyvise.com`, 'Password123!');
  });

  it('saves an imported job and enforces strict user isolation in getUserVacancies', () => {
    const timestamp = new Date().toISOString();
    const vacancyId = `vac_imported_${Date.now()}`;
    const importedId = `imp_${Date.now()}`;

    const vacancy: JobVacancy = {
      id: vacancyId,
      source: 'imported',
      title: 'Principal AI Architect',
      company: 'Anthropic',
      location: 'San Francisco, CA',
      country: 'US',
      workArrangement: 'hybrid',
      description: 'Lead next-generation foundation model infrastructure.',
      url: 'https://jobs.lever.co/anthropic/principal-ai',
      requiredSkills: ['Python', 'PyTorch', 'Distributed Systems'],
      importedByUserId: userA.id,
      importedProvenance: {
        originalUrl: 'https://jobs.lever.co/anthropic/principal-ai?utm_source=test',
        sourceDomain: 'jobs.lever.co',
        extractionStatus: 'verified_source',
        extractionMethod: 'adapter',
        extractionConfidence: 95,
        importedAt: timestamp,
      },
    };

    const record: UserImportedJobRecord = {
      id: importedId,
      userId: userA.id,
      vacancyId,
      originalUrl: 'https://jobs.lever.co/anthropic/principal-ai?utm_source=test',
      canonicalUrl: 'https://jobs.lever.co/anthropic/principal-ai',
      sourceDomain: 'jobs.lever.co',
      extractionStatus: 'verified_source',
      extractionMethod: 'adapter',
      extractionConfidence: 95,
      extractedData: {
        title: 'Principal AI Architect',
        company: 'Anthropic',
        location: 'San Francisco, CA',
        country: 'US',
        workplaceType: 'Hybrid',
        employmentType: 'Full-time',
        salaryRange: null,
        requiredSkills: ['Python', 'PyTorch', 'Distributed Systems'],
        preferredSkills: [],
        responsibilities: [],
        qualifications: [],
        educationRequirements: [],
        description: 'Lead next-generation foundation model infrastructure.',
        originalUrl: 'https://jobs.lever.co/anthropic/principal-ai',
        sourceDomain: 'jobs.lever.co',
        extractionTimestamp: timestamp,
        extractionMethod: 'adapter',
        extractionConfidence: 0.95,
        extractionStatus: 'verified_source',
        unavailableFields: [],
        reviewRecommendedFields: [],
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      isArchived: false,
    };

    // Save for User A
    authAndStore.saveUserImportedJob(record, vacancy);

    // 1. Verify User A can retrieve it
    const userAImports = authAndStore.getUserImportedJobs(userA.id);
    assert.ok(userAImports.some(i => i.id === importedId && i.vacancyId === vacancyId));

    const userAVacancies = authAndStore.getUserVacancies(userA.id);
    assert.ok(userAVacancies.some(v => v.id === vacancyId && v.source === 'imported'));

    // 2. Verify User B CANNOT see User A's imported job (Strict Isolation)
    const userBImports = authAndStore.getUserImportedJobs(userB.id);
    assert.strictEqual(userBImports.some(i => i.id === importedId), false);

    const userBVacancies = authAndStore.getUserVacancies(userB.id);
    assert.strictEqual(userBVacancies.some(v => v.id === vacancyId), false);
  });

  it('detects duplicate imported job by canonical URL for the same user', () => {
    const existing = authAndStore.findDuplicateImportedJob(userA.id, 'https://jobs.lever.co/anthropic/principal-ai');
    assert.strictEqual(existing.isDuplicate, true, 'Should detect duplicate for User A');
    assert.strictEqual(existing.existingRecord?.sourceDomain, 'jobs.lever.co');

    // Should NOT report duplicate for User B with the same URL
    const existingB = authAndStore.findDuplicateImportedJob(userB.id, 'https://jobs.lever.co/anthropic/principal-ai');
    assert.strictEqual(existingB.isDuplicate, false);
  });

  it('archives and deletes imported job cleanly', () => {
    const userAImports = authAndStore.getUserImportedJobs(userA.id);
    const target = userAImports[0];
    assert.ok(target);

    // Archive
    const archived = authAndStore.archiveUserImportedJob(userA.id, target.id);
    assert.strictEqual(archived, true);

    const activeAfterArchive = authAndStore.getUserImportedJobs(userA.id, false);
    assert.strictEqual(activeAfterArchive.some(i => i.id === target.id), false, 'Archived job should not be in active list');

    const allAfterArchive = authAndStore.getUserImportedJobs(userA.id, true);
    const archivedItem = allAfterArchive.find(i => i.id === target.id);
    assert.strictEqual(archivedItem?.isArchived, true);

    // Delete
    const deleted = authAndStore.deleteUserImportedJob(userA.id, target.id);
    assert.strictEqual(deleted, true);

    const afterDelete = authAndStore.getUserImportedJobs(userA.id);
    assert.strictEqual(afterDelete.some(i => i.id === target.id), false);
  });
});
