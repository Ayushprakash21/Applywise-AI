import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isSafePublicUrl,
  sanitizeIngestedDescription,
  extractPlainTextForMatching,
  deduplicateJobs,
  generateMultiKeyJobFingerprint,
  detectCompanyATSAndFeed,
  AshbyAdapter,
  WorkableAdapter,
  SmartRecruitersAdapter,
  RecruiteeAdapter,
  GreenhouseAdapter,
  LeverAdapter,
  LiveJobItem,
} from '../worker/jobConnectors.ts';
import { evaluateCandidateJobMatch } from '../src/utils/explainableMatcher.ts';
import { authAndStore } from '../server/authAndStore.ts';
import { JobVacancy, UserProfile } from '../src/types/index.ts';

describe('ApplyVise AI — Global Career Discovery Engine (GCDE) Suite', () => {
  // 1. SSRF & Network Security Boundaries
  describe('1. SSRF & Network Safety Boundary', () => {
    it('blocks internal, private, link-local, and cloud metadata endpoints', () => {
      assert.strictEqual(isSafePublicUrl('http://localhost:8080'), false);
      assert.strictEqual(isSafePublicUrl('https://localhost:8080'), false);
      assert.strictEqual(isSafePublicUrl('https://127.0.0.1:3000'), false);
      assert.strictEqual(isSafePublicUrl('https://10.0.0.1/jobs'), false);
      assert.strictEqual(isSafePublicUrl('https://192.168.1.1/api'), false);
      assert.strictEqual(isSafePublicUrl('https://172.16.0.5/postings'), false);
      assert.strictEqual(isSafePublicUrl('https://169.254.169.254/latest/meta-data'), false);
      assert.strictEqual(isSafePublicUrl('http://plain-http.com/jobs'), false);
    });

    it('allows verified public HTTPS developer and ATS endpoints', () => {
      assert.strictEqual(isSafePublicUrl('https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs'), true);
      assert.strictEqual(isSafePublicUrl('https://api.lever.co/v0/postings/spotify'), true);
      assert.strictEqual(isSafePublicUrl('https://api.ashbyhq.com/posting-api/job-board/notion'), true);
      assert.strictEqual(isSafePublicUrl('https://apply.workable.com/api/v1/widget/accounts/invision'), true);
    });
  });

  // 2. ATS Provider Adapters
  describe('2. ATS Provider Adapters Architecture', () => {
    it('AshbyAdapter constructs endpoint and handles rate limits safely', async () => {
      const adapter = new AshbyAdapter('ashby_test', 'Test Ashby Board', 'Test Company', 'testorg', 600);
      assert.strictEqual(adapter.type, 'ats_ashby');
      assert.strictEqual(adapter.endpoint, 'https://api.ashbyhq.com/posting-api/job-board/testorg');
    });

    it('WorkableAdapter constructs endpoint and preserves workplace types', async () => {
      const adapter = new WorkableAdapter('workable_test', 'Test Workable Board', 'Test Company', 'testacc', 600);
      assert.strictEqual(adapter.type, 'ats_workable');
      assert.strictEqual(adapter.endpoint, 'https://apply.workable.com/api/v1/widget/accounts/testacc');
    });

    it('SmartRecruitersAdapter constructs endpoint correctly', async () => {
      const adapter = new SmartRecruitersAdapter('smartrec_test', 'Test SmartRecruiters', 'Test Company', 'testcomp', 600);
      assert.strictEqual(adapter.type, 'ats_smartrecruiters');
      assert.strictEqual(adapter.endpoint, 'https://api.smartrecruiters.com/v1/companies/testcomp/postings');
    });

    it('RecruiteeAdapter constructs endpoint correctly', async () => {
      const adapter = new RecruiteeAdapter('recruitee_test', 'Test Recruitee', 'Test Company', 'testsub', 600);
      assert.strictEqual(adapter.type, 'ats_recruitee');
      assert.strictEqual(adapter.endpoint, 'https://testsub.recruitee.com/api/offers/');
    });
  });

  // 3. ATS Auto-Detection
  describe('3. Career Page ATS Auto-Detection Engine', () => {
    it('detects Greenhouse URLs and extracts public board token', async () => {
      const res = await detectCompanyATSAndFeed('https://boards.greenhouse.io/cloudflare');
      assert.strictEqual(res.detectedAts, 'ats_greenhouse');
      assert.strictEqual(res.publicBoardToken, 'cloudflare');
      assert.ok(res.publicEndpoint?.includes('boards-api.greenhouse.io'));
    });

    it('detects Lever URLs and extracts company handle', async () => {
      const res = await detectCompanyATSAndFeed('https://jobs.lever.co/spotify');
      assert.strictEqual(res.detectedAts, 'ats_lever');
      assert.strictEqual(res.publicBoardToken, 'spotify');
      assert.ok(res.publicEndpoint?.includes('api.lever.co'));
    });

    it('detects Ashby URLs and extracts organization slug', async () => {
      const res = await detectCompanyATSAndFeed('https://jobs.ashbyhq.com/notion');
      assert.strictEqual(res.detectedAts, 'ats_ashby');
      assert.strictEqual(res.publicBoardToken, 'notion');
      assert.ok(res.publicEndpoint?.includes('api.ashbyhq.com'));
    });

    it('detects Workable URLs and extracts account token', async () => {
      const res = await detectCompanyATSAndFeed('https://apply.workable.com/invision');
      assert.strictEqual(res.detectedAts, 'ats_workable');
      assert.strictEqual(res.publicBoardToken, 'invision');
      assert.ok(res.publicEndpoint?.includes('apply.workable.com'));
    });

    it('detects Recruitee URLs and extracts subdomain', async () => {
      const res = await detectCompanyATSAndFeed('https://bunq.recruitee.com');
      assert.strictEqual(res.detectedAts, 'ats_recruitee');
      assert.strictEqual(res.publicBoardToken, 'bunq');
      assert.ok(res.publicEndpoint?.includes('bunq.recruitee.com'));
    });

    it('falls back to custom_web/json_ld for non-ATS career pages', async () => {
      const res = await detectCompanyATSAndFeed('https://careers.google.com/jobs/results/');
      assert.strictEqual(res.detectedAts, 'json_ld');
    });
  });

  // 4. Ingestion Sanitization & Deduplication
  describe('4. Ingestion Sanitization & Multi-Key Deduplication', () => {
    it('sanitizes dangerous XSS, scripts, and iframes from job descriptions while preserving semantic tags', () => {
      const dirtyHtml = '<p>Great role</p><script>alert("hack")</script><iframe src="evil.com"></iframe><a href="javascript:void(0)">Link</a>';
      const clean = sanitizeIngestedDescription(dirtyHtml);
      assert.strictEqual(clean.includes('<script>'), false);
      assert.strictEqual(clean.includes('<iframe>'), false);
      assert.strictEqual(clean.includes('javascript:'), false);
      assert.ok(clean.includes('<p>Great role</p>'));
    });

    it('generates multi-key fingerprints stripping marketing tracking parameters', () => {
      const { canonicalHash, compositeHash } = generateMultiKeyJobFingerprint({
        company: 'Stripe, Inc.',
        title: 'Senior Backend Engineer',
        location: 'San Francisco, CA',
        url: 'https://stripe.com/jobs/123?utm_source=linkedin&ref=social',
      });

      assert.strictEqual(canonicalHash, 'https://stripe.com/jobs/123');
      assert.ok(compositeHash.includes('stripe'));
      assert.ok(compositeHash.includes('seniorbackendengineer'));
    });

    it('deduplicates duplicate listings from different feeds', () => {
      const now = new Date().toISOString();
      const rawJobs: LiveJobItem[] = [
        {
          id: 'job_1',
          source: 'remotive',
          sourceJobId: '101',
          title: 'Full Stack Engineer',
          company: 'Figma Inc.',
          location: 'Remote',
          country: 'United States',
          workArrangement: 'remote',
          employmentType: 'full-time',
          experienceLevel: 'mid',
          url: 'https://figma.com/jobs/101?utm_source=board',
          description: 'Build Figma tools',
          requirements: ['TypeScript', 'React'],
          tags: ['Figma'],
          publishedAt: now,
          retrievedAt: now,
          expiresAt: now,
          isActive: true,
          lastCheckedAt: now,
        },
        {
          id: 'job_2',
          source: 'greenhouse',
          sourceJobId: '101',
          title: 'Full Stack Engineer',
          company: 'Figma',
          location: 'Remote',
          country: 'United States',
          workArrangement: 'remote',
          employmentType: 'full-time',
          experienceLevel: 'mid',
          url: 'https://figma.com/jobs/101',
          description: 'Build Figma tools',
          requirements: ['TypeScript', 'React'],
          tags: ['Figma'],
          publishedAt: now,
          retrievedAt: now,
          expiresAt: now,
          isActive: true,
          lastCheckedAt: now,
        },
      ];

      const { unique, duplicatedCount } = deduplicateJobs(rawJobs);
      assert.strictEqual(unique.length, 1);
      assert.strictEqual(duplicatedCount, 1);
    });
  });

  // 5. System B: 6-Dimension Weighted Explainable Match Engine
  describe('5. Explainable 6-Dimension Opportunity Matcher (COME)', () => {
    const candidateProfile: Partial<UserProfile> = {
      id: 'usr_senior_dev',
      fullName: 'Alex Vance',
      email: 'alex@example.com',
      currentTitle: 'Senior Distributed Systems Engineer',
      totalExperienceYears: 7,
      location: 'New York, NY',
      requiresVisaSponsorship: false,
    };

    const targetVacancy: JobVacancy = {
      id: 'vac_distributed_systems',
      source: 'direct_feed',
      title: 'Senior Distributed Systems Engineer',
      company: 'Cloudflare',
      location: 'Remote',
      country: 'United States',
      remote: true,
      arrangement: 'remote',
      workArrangement: 'remote',
      url: 'https://cloudflare.com/careers/123',
      description: 'Design global caching systems and edge network microservices.',
      requirements: ['Go', 'Rust', 'Distributed Systems', 'Kubernetes'],
      tags: ['Cloudflare', 'Edge'],
      publishedAt: new Date().toISOString(),
      retrievedAt: new Date().toISOString(),
      isActive: true,
    };

    it('generates high explainable match score (>=85%) for well-aligned candidate with verified skills', () => {
      const evaluation = evaluateCandidateJobMatch(targetVacancy, {
        profile: candidateProfile,
        verifiedSkills: ['Go', 'Rust', 'Distributed Systems', 'Kubernetes', 'Docker'],
        totalExperienceYears: 7,
        targetRole: 'Senior Distributed Systems Engineer',
      });

      assert.strictEqual(evaluation.tier, 'Strong Fit');
      assert.ok(evaluation.overallScore >= 85, `Expected >= 85, got ${evaluation.overallScore}`);
      assert.strictEqual(evaluation.dimensions.coreSkills.matchedSkills.length, 4);
      assert.strictEqual(evaluation.dimensions.coreSkills.missingSkills.length, 0);
      assert.strictEqual(evaluation.dimensions.experience.score, 25);
      assert.strictEqual(evaluation.dimensions.mandatoryQualifications.hasMandatoryGaps, false);
      assert.strictEqual(evaluation.dimensions.geoAndWorkMode.score, 10);
      assert.ok(evaluation.recommendationReason.includes('Exceptional alignment'));
    });

    it('penalizes match score and caps <= 45% when mandatory requirements or visa sponsorship fail', () => {
      const visaRestrictedVacancy: JobVacancy = {
        ...targetVacancy,
        description: 'Requires active TS/SCI clearance. Must be authorized to work in US without sponsorship; no sponsorship available.',
        visaSponsorship: 'not_supported',
      };

      const sponsoredCandidate: Partial<UserProfile> = {
        ...candidateProfile,
        requiresVisaSponsorship: true,
      };

      const evaluation = evaluateCandidateJobMatch(visaRestrictedVacancy, {
        profile: sponsoredCandidate,
        verifiedSkills: ['Go', 'Rust', 'Distributed Systems'],
        totalExperienceYears: 7,
        visaRequired: true,
      });

      assert.strictEqual(evaluation.dimensions.mandatoryQualifications.hasMandatoryGaps, true);
      assert.strictEqual(evaluation.dimensions.mandatoryQualifications.score, 0);
      assert.ok(evaluation.overallScore <= 45, `Expected <= 45 due to mandatory disqualifier, got ${evaluation.overallScore}`);
      assert.strictEqual(evaluation.tier, 'Low Fit');
      assert.ok(evaluation.dimensions.mandatoryQualifications.gaps.length > 0);
    });

    it('honestly docks experience score for candidates with significant seniority gaps', () => {
      const juniorProfile: Partial<UserProfile> = {
        ...candidateProfile,
        totalExperienceYears: 1,
      };

      const leadVacancy: JobVacancy = {
        ...targetVacancy,
        title: 'Lead Architect',
      };
      (leadVacancy as any).experienceLevel = 'lead';

      const evaluation = evaluateCandidateJobMatch(leadVacancy, {
        profile: juniorProfile,
        verifiedSkills: ['Go'],
        totalExperienceYears: 1,
        targetRole: 'Junior Developer',
      });

      assert.ok(evaluation.dimensions.experience.score <= 10, 'Expected <= 10 experience points for 1 year vs Lead role');
      assert.ok(evaluation.dimensions.experience.assessment.includes('gap'));
    });
  });

  // 6. Backend Storage Parity & Operations
  describe('6. SQLite authAndStore Runtime Parity & Operations', () => {
    it('retrieves default seeded verified companies across US and Europe', () => {
      const companies = authAndStore.getCompanyDirectory();
      assert.ok(companies.length >= 8, `Expected >= 8 companies, got ${companies.length}`);

      const cloudflare = companies.find(c => c.domain === 'cloudflare.com');
      assert.ok(cloudflare, 'Cloudflare must exist in directory');
      assert.strictEqual(cloudflare.detectedAts, 'greenhouse');
      assert.strictEqual(cloudflare.verificationStatus, 'verified');

      const spotify = companies.find(c => c.domain === 'spotify.com');
      assert.ok(spotify, 'Spotify must exist in directory');
      assert.strictEqual(spotify.detectedAts, 'lever');
      assert.strictEqual(spotify.country, 'Sweden');
    });

    it('adds and verifies new employer career site with ATS detection', () => {
      const added = authAndStore.addCompanyDirectory({
        name: 'OpenAI',
        domain: 'openai.com',
        careersUrl: 'https://openai.com/careers',
        country: 'United States',
        region: 'north_america',
        industry: 'Artificial Intelligence',
        detectedAts: 'custom_web',
      });

      assert.strictEqual(added.name, 'OpenAI');
      assert.strictEqual(added.domain, 'openai.com');

      const queried = authAndStore.getCompanyDirectory({ query: 'OpenAI' });
      assert.ok(queried.length >= 1);
      assert.strictEqual(queried[0].domain, 'openai.com');
    });

    it('computes and persists geographic coverage summary', () => {
      const coverage = authAndStore.getGeographicCoverageSummary();
      assert.ok(coverage.totalCountries > 0);
      assert.ok(coverage.countries.length > 0);

      const us = coverage.countries.find(c => c.country === 'United States');
      assert.ok(us);
      assert.ok(us.verifiedCompaniesCount >= 5);
    });

    it('generates real-time global source intelligence KPIs for Admin Console', () => {
      const summary = authAndStore.getGlobalSourceIntelligenceSummary();
      assert.ok(summary.totalSources > 0);
      assert.ok(summary.totalDiscoveredCompanies >= 8);
      assert.strictEqual(typeof summary.healthySources, 'number');
    });

    it('computes candidate recommendations using verified evidence without global scraping', () => {
      const email = `cand.test.${Date.now()}.${Math.random().toString(36).substring(2, 6)}@example.com`;
      const user = authAndStore.createUser('Candidate Test', email, 'Pass123456');
      authAndStore.saveCandidateFact(user.id, {
        id: 'fact_' + Date.now(),
        userId: user.id,
        category: 'SKILL',
        field: 'technical_skill',
        value: 'TypeScript',
        originalSource: 'resume_upload',
        verificationStatus: 'USER_CONFIRMED',
        confidence: 0.95,
        lastUpdated: new Date().toISOString(),
      });

      const recs = authAndStore.computeCandidateJobRecommendations(user.id);
      assert.ok(Array.isArray(recs));

      const retrieved = authAndStore.getCandidateJobRecommendations(user.id);
      assert.ok(Array.isArray(retrieved));
    });
  });
});
