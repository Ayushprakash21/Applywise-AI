// server/sourceAdapters/marketplaceAdapters.ts
// Standardized Marketplace & Remote Job Board Adapters (Remotive, Arbeitnow, Jobicy, WeWorkRemotely, RemoteOK)

import { JobSourceAdapter, AdapterFetchResult, SourceHealth, QueryOptions, DiscoveredJob } from './types.ts';
import { extractPlainTextForMatching, isSafePublicUrl, sanitizeIngestedDescription, inferExperienceLevel, inferWorkArrangement } from '../../worker/jobConnectors.ts';

export class RemotiveSourceAdapter implements JobSourceAdapter {
  id = 'marketplace_remotive';
  name = 'Remotive Remote Jobs API';
  category = 'marketplace' as const;
  platform = 'remotive';
  endpoint = 'https://remotive.com/api/remote-jobs';
  rateLimitSeconds = 60;
  private healthState: SourceHealth;

  constructor() {
    this.healthState = {
      sourceId: this.id,
      sourceName: this.name,
      category: 'marketplace',
      platform: 'remotive',
      endpoint: this.endpoint,
      status: 'healthy',
      totalJobsDiscovered: 0,
      validJobsExtracted: 0,
      duplicatesDetected: 0,
      expiredJobsDetected: 0,
      failedRecords: 0,
      avgExtractionTimeMs: 0,
      authRequirements: 'Public Open API',
    };
  }

  async fetchJobs(options?: QueryOptions): Promise<AdapterFetchResult> {
    const startTime = Date.now();
    this.healthState.lastAttemptedRun = new Date().toISOString();
    const limit = Math.min(options?.limit || 25, 50);
    const q = options?.q || options?.query || '';
    const queryParam = q ? `?search=${encodeURIComponent(q)}&limit=${limit}` : `?limit=${limit}`;
    const targetUrl = `${this.endpoint}${queryParam}`;

    try {
      const resp = await fetch(targetUrl, {
        headers: { 'User-Agent': 'ApplyViseAI-Engine/2.0' },
        signal: AbortSignal.timeout(9000),
      });

      const latencyMs = Date.now() - startTime;
      this.healthState.avgExtractionTimeMs = latencyMs;

      if (!resp.ok) {
        this.healthState.status = resp.status === 429 ? 'rate_limited' : 'offline';
        return {
          sourceId: this.id,
          jobs: [],
          metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
          status: this.healthState.status,
          statusCode: resp.status,
          latencyMs,
        };
      }

      const data = (await resp.json()) as { jobs?: Array<any> };
      const rawJobs = Array.isArray(data.jobs) ? data.jobs : [];
      const extracted: DiscoveredJob[] = [];

      for (const item of rawJobs.slice(0, limit)) {
        if (!item.title || !item.id) continue;
        const loc = item.candidate_required_location || 'Worldwide Remote';
        const cleanPlain = extractPlainTextForMatching(item.description || '');
        const expLevel = inferExperienceLevel(item.title, cleanPlain);

        extracted.push({
          id: `remotive_${item.id}`,
          source: 'remotive',
          sourceJobId: String(item.id),
          sourceCategory: 'marketplace',
          title: item.title.trim(),
          company: item.company_name,
          companyLogo: item.company_logo,
          location: loc,
          country: loc.toLowerCase().includes('india') ? 'India' : (loc.toLowerCase().includes('usa') ? 'United States' : 'Remote Worldwide'),
          remote: true,
          arrangement: 'remote',
          employmentType: 'full-time',
          experienceLevel: expLevel as any,
          url: item.url,
          directApplicationUrl: item.url,
          description: sanitizeIngestedDescription(item.description || item.title),
          requirements: item.tags && item.tags.length > 0 ? item.tags : [item.category || 'General'],
          tags: item.tags || ['Remote'],
          publishedAt: item.publication_date || new Date().toISOString(),
          salaryRange: item.salary ? { raw: item.salary, currency: 'USD' } : undefined,
          visaSponsorship: 'unknown',
          retrievedAt: new Date().toISOString(),
          isActive: true,
          lastCheckedAt: new Date().toISOString(),
          sourceConfidence: 0.90,
        });
      }

      this.healthState.status = 'healthy';
      this.healthState.lastSuccessfulRun = new Date().toISOString();
      this.healthState.totalJobsDiscovered += rawJobs.length;
      this.healthState.validJobsExtracted += extracted.length;

      return {
        sourceId: this.id,
        jobs: extracted,
        metrics: { totalFetched: rawJobs.length, totalAccepted: extracted.length, totalRejected: rawJobs.length - extracted.length, totalDuplicated: 0 },
        status: 'healthy',
        statusCode: 200,
        latencyMs,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.healthState.status = 'offline';
      return {
        sourceId: this.id,
        jobs: [],
        metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
        status: 'offline',
        error: msg,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  getHealth(): SourceHealth {
    return { ...this.healthState };
  }
}

export class ArbeitnowSourceAdapter implements JobSourceAdapter {
  id = 'marketplace_arbeitnow';
  name = 'Arbeitnow Global Board API';
  category = 'marketplace' as const;
  platform = 'arbeitnow';
  endpoint = 'https://www.arbeitnow.com/api/job-board-api';
  rateLimitSeconds = 60;
  private healthState: SourceHealth;

  constructor() {
    this.healthState = {
      sourceId: this.id,
      sourceName: this.name,
      category: 'marketplace',
      platform: 'arbeitnow',
      endpoint: this.endpoint,
      status: 'healthy',
      totalJobsDiscovered: 0,
      validJobsExtracted: 0,
      duplicatesDetected: 0,
      expiredJobsDetected: 0,
      failedRecords: 0,
      avgExtractionTimeMs: 0,
      authRequirements: 'Public Open API',
    };
  }

  async fetchJobs(options?: QueryOptions): Promise<AdapterFetchResult> {
    const startTime = Date.now();
    this.healthState.lastAttemptedRun = new Date().toISOString();
    const limit = Math.min(options?.limit || 25, 50);
    const q = (options?.q || options?.query || '').toLowerCase();

    try {
      const resp = await fetch(this.endpoint, {
        headers: { 'User-Agent': 'ApplyViseAI-Engine/2.0' },
        signal: AbortSignal.timeout(9000),
      });

      const latencyMs = Date.now() - startTime;
      this.healthState.avgExtractionTimeMs = latencyMs;

      if (!resp.ok) {
        this.healthState.status = resp.status === 429 ? 'rate_limited' : 'offline';
        return {
          sourceId: this.id,
          jobs: [],
          metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
          status: this.healthState.status,
          statusCode: resp.status,
          latencyMs,
        };
      }

      const data = (await resp.json()) as { data?: Array<any> };
      const rawJobs = Array.isArray(data.data) ? data.data : [];
      const extracted: DiscoveredJob[] = [];

      for (const item of rawJobs) {
        if (!item.title || !item.slug) continue;
        if (q) {
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchCompany = (item.company_name || '').toLowerCase().includes(q);
          const matchTags = Array.isArray(item.tags) && item.tags.some((t: string) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchCompany && !matchTags) continue;
        }

        const loc = item.location || 'Remote';
        const cleanPlain = extractPlainTextForMatching(item.description || '');
        const expLevel = inferExperienceLevel(item.title, cleanPlain);
        const arrangement = item.remote ? 'remote' : 'hybrid';

        extracted.push({
          id: `arbeitnow_${item.slug}`,
          source: 'arbeitnow',
          sourceJobId: item.slug,
          sourceCategory: 'marketplace',
          title: item.title.trim(),
          company: item.company_name,
          location: loc,
          country: loc.toLowerCase().includes('germany') ? 'Germany' : (loc.toLowerCase().includes('india') ? 'India' : 'Europe/Global'),
          remote: !!item.remote,
          arrangement,
          employmentType: 'full-time',
          experienceLevel: expLevel as any,
          url: item.url,
          directApplicationUrl: item.url,
          description: sanitizeIngestedDescription(item.description || item.title),
          requirements: item.tags || ['General'],
          tags: item.tags || [],
          publishedAt: new Date(item.created_at * 1000).toISOString(),
          visaSponsorship: cleanPlain.toLowerCase().includes('visa') ? 'supported' : 'unknown',
          retrievedAt: new Date().toISOString(),
          isActive: true,
          lastCheckedAt: new Date().toISOString(),
          sourceConfidence: 0.92,
        });

        if (extracted.length >= limit) break;
      }

      this.healthState.status = 'healthy';
      this.healthState.lastSuccessfulRun = new Date().toISOString();
      this.healthState.totalJobsDiscovered += rawJobs.length;
      this.healthState.validJobsExtracted += extracted.length;

      return {
        sourceId: this.id,
        jobs: extracted,
        metrics: { totalFetched: rawJobs.length, totalAccepted: extracted.length, totalRejected: rawJobs.length - extracted.length, totalDuplicated: 0 },
        status: 'healthy',
        statusCode: 200,
        latencyMs,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.healthState.status = 'offline';
      return {
        sourceId: this.id,
        jobs: [],
        metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
        status: 'offline',
        error: msg,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  getHealth(): SourceHealth {
    return { ...this.healthState };
  }
}

export class JobicySourceAdapter implements JobSourceAdapter {
  id = 'marketplace_jobicy';
  name = 'Jobicy Remote API';
  category = 'marketplace' as const;
  platform = 'jobicy';
  endpoint = 'https://jobicy.com/api/v2/remote-jobs';
  rateLimitSeconds = 60;
  private healthState: SourceHealth;

  constructor() {
    this.healthState = {
      sourceId: this.id,
      sourceName: this.name,
      category: 'marketplace',
      platform: 'jobicy',
      endpoint: this.endpoint,
      status: 'healthy',
      totalJobsDiscovered: 0,
      validJobsExtracted: 0,
      duplicatesDetected: 0,
      expiredJobsDetected: 0,
      failedRecords: 0,
      avgExtractionTimeMs: 0,
      authRequirements: 'Public Open API',
    };
  }

  async fetchJobs(options?: QueryOptions): Promise<AdapterFetchResult> {
    const startTime = Date.now();
    this.healthState.lastAttemptedRun = new Date().toISOString();
    const limit = Math.min(options?.limit || 25, 50);
    const q = options?.q || options?.query || '';
    const queryParam = q ? `?count=${limit}&tag=${encodeURIComponent(q.toLowerCase())}` : `?count=${limit}`;
    const targetUrl = `${this.endpoint}${queryParam}`;

    try {
      const resp = await fetch(targetUrl, {
        headers: { 'User-Agent': 'ApplyViseAI-Engine/2.0' },
        signal: AbortSignal.timeout(9000),
      });

      const latencyMs = Date.now() - startTime;
      this.healthState.avgExtractionTimeMs = latencyMs;

      if (!resp.ok) {
        this.healthState.status = resp.status === 429 ? 'rate_limited' : 'offline';
        return {
          sourceId: this.id,
          jobs: [],
          metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
          status: this.healthState.status,
          statusCode: resp.status,
          latencyMs,
        };
      }

      const data = (await resp.json()) as { jobs?: Array<any> };
      const rawJobs = Array.isArray(data.jobs) ? data.jobs : [];
      const extracted: DiscoveredJob[] = [];

      for (const item of rawJobs.slice(0, limit)) {
        if (!item.jobTitle || !item.id) continue;
        const loc = item.jobGeo || 'Remote Worldwide';
        const cleanPlain = extractPlainTextForMatching(item.jobDescription || '');
        const expLevel = inferExperienceLevel(item.jobTitle, cleanPlain);
        const salary = item.annualSalaryMin && item.annualSalaryMax
          ? {
              min: parseInt(item.annualSalaryMin, 10),
              max: parseInt(item.annualSalaryMax, 10),
              currency: item.salaryCurrency || 'USD',
              raw: `${item.salaryCurrency || '$'}${item.annualSalaryMin} - ${item.annualSalaryMax}`,
            }
          : undefined;

        extracted.push({
          id: `jobicy_${item.id}`,
          source: 'jobicy',
          sourceJobId: String(item.id),
          sourceCategory: 'marketplace',
          title: item.jobTitle.trim(),
          company: item.companyName,
          companyLogo: item.companyLogo,
          location: loc,
          country: loc.toLowerCase().includes('india') ? 'India' : 'Remote Worldwide',
          remote: true,
          arrangement: 'remote',
          employmentType: 'full-time',
          experienceLevel: expLevel as any,
          url: item.url,
          directApplicationUrl: item.url,
          description: sanitizeIngestedDescription(item.jobDescription || item.jobTitle),
          requirements: item.jobType || ['Full-Time'],
          tags: item.jobType || ['Remote'],
          publishedAt: item.pubDate || new Date().toISOString(),
          salaryRange: salary,
          visaSponsorship: 'unknown',
          retrievedAt: new Date().toISOString(),
          isActive: true,
          lastCheckedAt: new Date().toISOString(),
          sourceConfidence: 0.90,
        });
      }

      this.healthState.status = 'healthy';
      this.healthState.lastSuccessfulRun = new Date().toISOString();
      this.healthState.totalJobsDiscovered += rawJobs.length;
      this.healthState.validJobsExtracted += extracted.length;

      return {
        sourceId: this.id,
        jobs: extracted,
        metrics: { totalFetched: rawJobs.length, totalAccepted: extracted.length, totalRejected: rawJobs.length - extracted.length, totalDuplicated: 0 },
        status: 'healthy',
        statusCode: 200,
        latencyMs,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.healthState.status = 'offline';
      return {
        sourceId: this.id,
        jobs: [],
        metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
        status: 'offline',
        error: msg,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  getHealth(): SourceHealth {
    return { ...this.healthState };
  }
}
