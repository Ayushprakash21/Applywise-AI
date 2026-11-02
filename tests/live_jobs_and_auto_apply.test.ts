import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSafePublicUrl,
  inferExperienceLevel,
  inferWorkArrangement,
  deduplicateJobs,
  SOURCE_REGISTRY,
  LiveJobItem
} from '../worker/jobConnectors.ts';

test('SSRF Protection: Blocks dangerous internal URLs and allows safe public endpoints', () => {
  // Safe endpoints
  assert.equal(isSafePublicUrl('https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs'), true);
  assert.equal(isSafePublicUrl('https://api.lever.co/v0/postings/spotify'), true);
  assert.equal(isSafePublicUrl('https://remotive.com/api/remote-jobs'), true);

  // Unsafe / SSRF targets
  assert.equal(isSafePublicUrl('http://insecure.com/jobs'), false, 'HTTP non-TLS must be rejected');
  assert.equal(isSafePublicUrl('https://169.254.169.254/latest/meta-data/'), false, 'Cloud metadata service must be blocked');
  assert.equal(isSafePublicUrl('https://localhost/api/secret'), false, 'Localhost must be blocked');
  assert.equal(isSafePublicUrl('https://127.0.0.1/admin'), false, 'Loopback IP must be blocked');
  assert.equal(isSafePublicUrl('https://10.0.0.1/internal'), false, 'Private 10.x.x.x IP must be blocked');
  assert.equal(isSafePublicUrl('https://192.168.1.1/router'), false, 'Private 192.168.x.x IP must be blocked');
  assert.equal(isSafePublicUrl('https://service.internal/vault'), false, 'Internal TLDs must be blocked');
});

test('Heuristic Extraction: Experience level and work arrangement detection', () => {
  // Experience level
  assert.equal(inferExperienceLevel('Software Engineering Intern', 'Join our summer internship'), 'entry');
  assert.equal(inferExperienceLevel('VP of Global Engineering', 'Lead our 200+ team'), 'executive');
  assert.equal(inferExperienceLevel('Lead Infrastructure Architect', 'Architect cloud systems'), 'lead');
  assert.equal(inferExperienceLevel('Senior Product Manager', 'Own the customer journey'), 'senior');
  assert.equal(inferExperienceLevel('Project Manager', 'Coordinate cross-functional releases'), 'mid');

  // Work arrangement
  assert.equal(inferWorkArrangement('Remote, US', 'Fullstack Engineer', 'Work from home anywhere in US'), 'remote');
  assert.equal(inferWorkArrangement('San Francisco, CA', 'Operations Manager', '3 days in office hybrid'), 'hybrid');
  assert.equal(inferWorkArrangement('Austin, TX', 'Hardware Technician', 'Onsite laboratory position'), 'onsite');
});

test('Deduplication: Merges duplicate postings from different sources', () => {
  const now = new Date().toISOString();
  const mockJobs: LiveJobItem[] = [
    {
      id: 'job_1',
      source: 'greenhouse',
      sourceJobId: '101',
      title: 'Senior Frontend Engineer',
      company: 'Cloudflare',
      location: 'Remote, US',
      country: 'United States',
      workArrangement: 'remote',
      employmentType: 'full-time',
      experienceLevel: 'senior',
      url: 'https://boards.greenhouse.io/cloudflare/jobs/101',
      description: 'Build fast web experiences with Workers',
      requirements: ['TypeScript', 'React'],
      tags: ['Engineering'],
      publishedAt: now,
      retrievedAt: now,
      expiresAt: now,
      isActive: true,
      lastCheckedAt: now,
    },
    {
      id: 'job_2',
      source: 'remotive',
      sourceJobId: '9002',
      title: 'Senior Frontend Engineer', // Duplicate title
      company: 'Cloudflare, Inc.', // Same company normalized
      location: 'Remote Worldwide',
      country: 'United States',
      workArrangement: 'remote',
      employmentType: 'full-time',
      experienceLevel: 'senior',
      url: 'https://remotive.com/job/9002',
      description: 'Build fast web experiences with Workers',
      requirements: ['TypeScript', 'React'],
      tags: ['Engineering'],
      publishedAt: now,
      retrievedAt: now,
      expiresAt: now,
      isActive: true,
      lastCheckedAt: now,
    },
    {
      id: 'job_3',
      source: 'lever',
      sourceJobId: '303',
      title: 'Backend Staff Engineer',
      company: 'Spotify',
      location: 'Stockholm / Remote',
      country: 'Sweden',
      workArrangement: 'remote',
      employmentType: 'full-time',
      experienceLevel: 'lead',
      url: 'https://jobs.lever.co/spotify/303',
      description: 'Audio distribution distributed systems',
      requirements: ['Go', 'Kubernetes'],
      tags: ['Backend'],
      publishedAt: now,
      retrievedAt: now,
      expiresAt: now,
      isActive: true,
      lastCheckedAt: now,
    },
  ];

  const deduped = deduplicateJobs(mockJobs);
  assert.equal(deduped.length, 2, 'Duplicate Cloudflare Senior Frontend Engineer should be merged into 1');
  assert.equal(deduped[0].company, 'Cloudflare');
  assert.equal(deduped[1].company, 'Spotify');
});

test('Connector Registry: Verified source definitions and endpoints', () => {
  assert.ok(SOURCE_REGISTRY.length >= 8, 'Must have at least 8 registered live connectors');

  const gh = SOURCE_REGISTRY.find(s => s.id === 'gh_cloudflare');
  assert.ok(gh, 'Cloudflare Greenhouse connector must exist');
  assert.equal(gh.type, 'ats_greenhouse');
  assert.ok(gh.endpoint.includes('greenhouse.io'));

  const lever = SOURCE_REGISTRY.find(s => s.id === 'lever_spotify');
  assert.ok(lever, 'Spotify Lever connector must exist');
  assert.equal(lever.type, 'ats_lever');

  const remotive = SOURCE_REGISTRY.find(s => s.id === 'remotive');
  assert.ok(remotive, 'Remotive aggregator connector must exist');
});
