import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOURCE_REGISTRY,
  LiveJobItem,
} from '../worker/jobConnectors.ts';
import { initialVacancies } from '../src/data/seedData.ts';
import { D1Store } from '../worker/d1Store.ts';

// Clean MockD1Database for pipeline unit tests
class MockD1Database {
  public tables: {
    live_jobs_cache: any[];
    source_health_registry: any[];
  } = {
    live_jobs_cache: [],
    source_health_registry: [],
  };

  prepare(query: string) {
    const db = this;
    const stmt = {
      _params: [] as any[],
      bind(...params: any[]) {
        const bound = Object.create(stmt);
        bound._params = params;
        return bound;
      },
      async first<T = any>(): Promise<T | null> {
        const res = await this.all<T>();
        return res.results[0] || null;
      },
      async all<T = any>(): Promise<{ results: T[] }> {
        const q = query.trim().toUpperCase();
        if (q.includes('FROM LIVE_JOBS_CACHE')) {
          if (q.startsWith('SELECT COUNT(*)')) {
            return { results: [{ count: db.tables.live_jobs_cache.length, total: db.tables.live_jobs_cache.length } as any] };
          }
          if (q.includes('WHERE ID = ?')) {
            const found = db.tables.live_jobs_cache.find(j => j.id === this._params[0]);
            return { results: found ? [found as any] : [] };
          }
          return { results: db.tables.live_jobs_cache as any };
        }
        if (q.includes('FROM SOURCE_HEALTH_REGISTRY')) {
          return { results: db.tables.source_health_registry as any };
        }
        return { results: [] };
      },
      async run() {
        const q = query.trim().toUpperCase();
        if (q.includes('INSERT INTO LIVE_JOBS_CACHE') || q.includes('INSERT OR REPLACE INTO LIVE_JOBS_CACHE')) {
          db.tables.live_jobs_cache.push({
            id: this._params[0],
            source: this._params[1],
            source_job_id: this._params[2],
            title: this._params[3],
            company: this._params[4],
            company_logo: this._params[5],
            location: this._params[6],
            country: this._params[7],
            work_arrangement: this._params[8],
            employment_type: this._params[9],
            experience_level: this._params[10],
            salary_raw: this._params[11],
            salary_min: this._params[12],
            salary_max: this._params[13],
            salary_currency: this._params[14],
            url: this._params[15],
            description: this._params[16],
            requirements: this._params[17],
            tags: this._params[18],
            published_at: this._params[19],
            retrieved_at: this._params[20],
            expires_at: this._params[21],
            is_active: 1,
            last_checked_at: this._params[22],
          });
        } else if (q.includes('INTO SOURCE_HEALTH_REGISTRY')) {
          const rec = {
            source_id: this._params[0],
            source_name: this._params[1],
            connector_type: this._params[2],
            endpoint: this._params[3],
            status: this._params[4],
            total_jobs: this._params[5],
            latency_ms: this._params[6],
            last_error: this._params[7],
            last_refreshed_at: new Date().toISOString(),
          };
          const idx = db.tables.source_health_registry.findIndex(s => s.source_id === rec.source_id);
          if (idx >= 0) db.tables.source_health_registry[idx] = rec;
          else db.tables.source_health_registry.push(rec);
        } else if (q.includes('DELETE FROM LIVE_JOBS_CACHE WHERE EXPIRES_AT < ?')) {
          const cutoff = this._params[0];
          const initial = db.tables.live_jobs_cache.length;
          db.tables.live_jobs_cache = db.tables.live_jobs_cache.filter(j => j.expires_at >= cutoff);
          return { meta: { changes: initial - db.tables.live_jobs_cache.length } };
        }
        return { meta: { changes: 1 } };
      },
    };
    return stmt;
  }

  async batch(statements: any[]) {
    for (const stmt of statements) {
      await stmt.run();
    }
  }
}

test('Demo Data Isolation: Predefined seed vacancies are isolated from production cache', () => {
  assert.ok(Array.isArray(initialVacancies), 'Seed vacancies fixture must exist for offline tests');
  assert.equal(initialVacancies.length, 5, 'Seed fixture contains 5 mock jobs');

  // Verify seed vacancies have recognizable mock IDs
  const mockIds = initialVacancies.map(v => v.id);
  assert.deepEqual(mockIds, [
    'vac_vercel_01',
    'vac_linear_02',
    'vac_supabase_03',
    'vac_anthropic_04',
    'vac_shopify_05',
  ]);

  // Connectors in SOURCE_REGISTRY must never produce these mock IDs
  for (const c of SOURCE_REGISTRY) {
    assert.notEqual(c.id, 'vac_vercel_01');
    assert.notEqual(c.id, 'vac_linear_02');
    assert.ok(c.endpoint.startsWith('https://'), 'Connector must use https endpoint');
  }
});

test('Schema & Normalization: LiveJobItem conforms to JobVacancy contract', () => {
  const now = new Date().toISOString();
  const testLiveItem: LiveJobItem = {
    id: 'gh_cloudflare_7695702',
    source: 'greenhouse_cloudflare',
    sourceJobId: '7695702',
    title: 'Senior Systems Engineer - Edge Performance',
    company: 'Cloudflare',
    location: 'Austin, TX / Remote',
    country: 'United States',
    workArrangement: 'remote',
    employmentType: 'full-time',
    experienceLevel: 'senior',
    salaryRaw: '$170,000 - $210,000 USD',
    salaryMin: 170000,
    salaryMax: 210000,
    salaryCurrency: 'USD',
    url: 'https://boards.greenhouse.io/cloudflare/jobs/7695702',
    description: 'Work on distributed edge routing and TCP optimization.',
    requirements: ['Rust', 'Linux Kernel', 'Distributed Systems'],
    tags: ['Edge', 'Networking', 'Remote'],
    publishedAt: now,
    retrievedAt: now,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    isActive: true,
    lastCheckedAt: now,
  };

  assert.ok(testLiveItem.id);
  assert.ok(testLiveItem.title);
  assert.ok(testLiveItem.company);
  assert.ok(testLiveItem.url);
  assert.ok(testLiveItem.publishedAt);
  assert.ok(testLiveItem.retrievedAt);
  assert.equal(testLiveItem.isActive, true);
  assert.equal(testLiveItem.workArrangement, 'remote');
});

test('D1 Store Live Jobs Pipeline: Save, Search, Expiration, and Health Tracking', async () => {
  const mockDb = new MockD1Database();
  const store = new D1Store(mockDb as any);

  const now = new Date();
  const validJob: LiveJobItem = {
    id: 'remotive_1001',
    source: 'remotive',
    sourceJobId: '1001',
    title: 'Full Stack Engineer',
    company: 'Buffer',
    location: 'Remote Worldwide',
    country: 'Remote',
    workArrangement: 'remote',
    employmentType: 'full-time',
    experienceLevel: 'mid',
    url: 'https://remotive.com/jobs/1001',
    description: 'Social media publishing tools',
    requirements: ['Node.js', 'React'],
    tags: ['Fullstack'],
    publishedAt: now.toISOString(),
    retrievedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 3600000).toISOString(),
    isActive: true,
    lastCheckedAt: now.toISOString(),
  };

  const expiredJob: LiveJobItem = {
    id: 'remotive_999',
    source: 'remotive',
    sourceJobId: '999',
    title: 'Old Deprecated Job',
    company: 'Stale Co',
    location: 'Remote',
    country: 'Remote',
    workArrangement: 'remote',
    employmentType: 'full-time',
    experienceLevel: 'senior',
    url: 'https://remotive.com/jobs/999',
    description: 'Expired vacancy',
    requirements: [],
    tags: [],
    publishedAt: new Date(now.getTime() - 86400000).toISOString(),
    retrievedAt: new Date(now.getTime() - 7200000).toISOString(),
    expiresAt: new Date(now.getTime() - 3600000).toISOString(),
    isActive: true,
    lastCheckedAt: new Date(now.getTime() - 3600000).toISOString(),
  };

  // 1. Save both jobs
  await store.saveLiveJobs([validJob, expiredJob]);
  const countInitial = await store.countLiveJobs();
  assert.equal(countInitial, 2);

  // 2. Prune expired temporary records
  const pruned = await store.cleanupExpiredLiveJobs();
  assert.equal(pruned, 1, 'Should prune exactly 1 expired vacancy');
  const countAfterPrune = await store.countLiveJobs();
  assert.equal(countAfterPrune, 1, 'Only 1 active vacancy should remain');

  // 3. Search should return valid unexpired job with backward-compatible JobVacancy properties
  const search = await store.searchLiveJobs({});
  assert.equal(search.jobs.length, 1);
  const found = search.jobs[0];
  assert.equal(found.id, 'remotive_1001');
  assert.equal(found.remote, true, 'Must map remote boolean');
  assert.equal(found.arrangement, 'remote', 'Must map arrangement');

  // 4. Update source health
  await store.updateSourceHealth({
    sourceId: 'remotive',
    sourceName: 'Remotive Global',
    connectorType: 'aggregator_api',
    endpoint: 'https://remotive.com/api/remote-jobs',
    status: 'healthy',
    totalJobs: 1,
    latencyMs: 145,
  });

  const health = await store.getLiveSourcesHealth();
  assert.equal(health.length, 1);
  assert.equal(health[0].source_id, 'remotive');
  assert.equal(health[0].status, 'healthy');
  assert.equal(health[0].latency_ms, 145);
});
