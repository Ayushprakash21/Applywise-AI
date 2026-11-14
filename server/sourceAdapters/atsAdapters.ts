// server/sourceAdapters/atsAdapters.ts
// Production ATS Source Adapters for Greenhouse, Lever, Ashby, SmartRecruiters, and Custom Career Portals

import { JobSourceAdapter, AdapterFetchResult, SourceHealth, QueryOptions, DiscoveredJob } from './types.ts';
import { extractPlainTextForMatching, isSafePublicUrl, sanitizeIngestedDescription, inferExperienceLevel, inferWorkArrangement } from '../../worker/jobConnectors.ts';

// ---------------------------------------------------------------------------
// 1. GREENHOUSE SOURCE ADAPTER
// ---------------------------------------------------------------------------
export class GreenhouseSourceAdapter implements JobSourceAdapter {
  id: string;
  name: string;
  category = 'ats' as const;
  platform = 'greenhouse';
  endpoint: string;
  rateLimitSeconds = 120;
  private companyName: string;
  private boardToken: string;
  private healthState: SourceHealth;

  constructor(companyName: string, boardToken: string) {
    this.companyName = companyName;
    this.boardToken = boardToken;
    this.id = `ats_greenhouse_${boardToken}`;
    this.name = `${companyName} (Greenhouse)`;
    this.endpoint = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
    this.healthState = {
      sourceId: this.id,
      sourceName: this.name,
      category: 'ats',
      platform: 'greenhouse',
      endpoint: this.endpoint,
      status: 'healthy',
      totalJobsDiscovered: 0,
      validJobsExtracted: 0,
      duplicatesDetected: 0,
      expiredJobsDetected: 0,
      failedRecords: 0,
      avgExtractionTimeMs: 0,
      authRequirements: 'None (Public Board API)',
    };
  }

  async fetchJobs(options?: QueryOptions): Promise<AdapterFetchResult> {
    const startTime = Date.now();
    this.healthState.lastAttemptedRun = new Date().toISOString();
    const limit = options?.limit || 30;

    if (!isSafePublicUrl(this.endpoint)) {
      this.healthState.status = 'degraded';
      this.healthState.lastError = 'Blocked: Endpoint failed SSRF check';
      return {
        sourceId: this.id,
        jobs: [],
        metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
        status: 'degraded',
        error: 'Endpoint failed SSRF check',
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const resp = await fetch(this.endpoint, {
        headers: { 'User-Agent': 'ApplyViseAI-Engine/2.0' },
        signal: AbortSignal.timeout(9000),
      });

      const latencyMs = Date.now() - startTime;
      this.healthState.avgExtractionTimeMs = latencyMs;

      if (!resp.ok) {
        this.healthState.status = resp.status === 429 ? 'rate_limited' : 'offline';
        this.healthState.lastError = `HTTP ${resp.status}`;
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
        const locationStr = item.location?.name || 'Remote';
        const cleanPlainText = extractPlainTextForMatching(item.content || '');
        const expLevel = inferExperienceLevel(item.title, cleanPlainText);
        const arrangement = inferWorkArrangement(locationStr, item.title, cleanPlainText);

        extracted.push({
          id: `gh_${this.boardToken}_${item.id}`,
          source: 'greenhouse',
          sourceJobId: String(item.id),
          sourceCategory: 'ats',
          atsPlatform: 'greenhouse',
          title: item.title.trim(),
          company: this.companyName,
          location: locationStr,
          country: locationStr.toLowerCase().includes('india') ? 'India' : 'Global',
          remote: arrangement === 'remote',
          arrangement,
          employmentType: 'full-time',
          experienceLevel: expLevel as any,
          url: item.absolute_url,
          directApplicationUrl: `${item.absolute_url}#app`,
          description: sanitizeIngestedDescription(item.content || item.title),
          requirements: [expLevel, arrangement, item.departments?.[0]?.name || 'Engineering'],
          tags: ['Greenhouse', this.companyName, arrangement],
          publishedAt: item.updated_at || new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          isActive: true,
          lastCheckedAt: new Date().toISOString(),
          sourceConfidence: 0.98,
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

// ---------------------------------------------------------------------------
// 2. LEVER SOURCE ADAPTER
// ---------------------------------------------------------------------------
export class LeverSourceAdapter implements JobSourceAdapter {
  id: string;
  name: string;
  category = 'ats' as const;
  platform = 'lever';
  endpoint: string;
  rateLimitSeconds = 120;
  private companyName: string;
  private siteToken: string;
  private healthState: SourceHealth;

  constructor(companyName: string, siteToken: string) {
    this.companyName = companyName;
    this.siteToken = siteToken;
    this.id = `ats_lever_${siteToken}`;
    this.name = `${companyName} (Lever)`;
    this.endpoint = `https://api.lever.co/v0/postings/${encodeURIComponent(siteToken)}?mode=json`;
    this.healthState = {
      sourceId: this.id,
      sourceName: this.name,
      category: 'ats',
      platform: 'lever',
      endpoint: this.endpoint,
      status: 'healthy',
      totalJobsDiscovered: 0,
      validJobsExtracted: 0,
      duplicatesDetected: 0,
      expiredJobsDetected: 0,
      failedRecords: 0,
      avgExtractionTimeMs: 0,
      authRequirements: 'None (Public Postings API)',
    };
  }

  async fetchJobs(options?: QueryOptions): Promise<AdapterFetchResult> {
    const startTime = Date.now();
    this.healthState.lastAttemptedRun = new Date().toISOString();
    const limit = options?.limit || 30;

    if (!isSafePublicUrl(this.endpoint)) {
      this.healthState.status = 'degraded';
      return {
        sourceId: this.id,
        jobs: [],
        metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
        status: 'degraded',
        error: 'SSRF check failed',
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const resp = await fetch(this.endpoint, {
        headers: { 'User-Agent': 'ApplyViseAI-Engine/2.0' },
        signal: AbortSignal.timeout(9000),
      });

      const latencyMs = Date.now() - startTime;
      this.healthState.avgExtractionTimeMs = latencyMs;

      if (!resp.ok) {
        this.healthState.status = resp.status === 429 ? 'rate_limited' : 'offline';
        this.healthState.lastError = `HTTP ${resp.status}`;
        return {
          sourceId: this.id,
          jobs: [],
          metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
          status: this.healthState.status,
          statusCode: resp.status,
          latencyMs,
        };
      }

      const rawList = (await resp.json()) as Array<{ id: string; text: string; categories?: { location?: string; commitment?: string; team?: string }; descriptionPlain?: string; description?: string; hostedUrl: string; applyUrl?: string; createdAt?: number }>;
      const rawJobs = Array.isArray(rawList) ? rawList : [];
      const extracted: DiscoveredJob[] = [];

      for (const item of rawJobs.slice(0, limit)) {
        if (!item.text || !item.id) continue;
        const locationStr = item.categories?.location || 'Remote';
        const cleanPlainText = item.descriptionPlain || extractPlainTextForMatching(item.description || '');
        const expLevel = inferExperienceLevel(item.text, cleanPlainText);
        const arrangement = inferWorkArrangement(locationStr, item.text, cleanPlainText);

        extracted.push({
          id: `lever_${this.siteToken}_${item.id}`,
          source: 'lever',
          sourceJobId: item.id,
          sourceCategory: 'ats',
          atsPlatform: 'lever',
          title: item.text.trim(),
          company: this.companyName,
          location: locationStr,
          country: locationStr.toLowerCase().includes('india') ? 'India' : 'Global',
          remote: arrangement === 'remote',
          arrangement,
          employmentType: item.categories?.commitment?.toLowerCase() || 'full-time',
          experienceLevel: expLevel as any,
          url: item.hostedUrl,
          directApplicationUrl: item.applyUrl || `${item.hostedUrl}/apply`,
          description: sanitizeIngestedDescription(item.description || item.text),
          requirements: [expLevel, arrangement, item.categories?.team || 'Engineering'],
          tags: ['Lever', this.companyName, arrangement],
          publishedAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          isActive: true,
          lastCheckedAt: new Date().toISOString(),
          sourceConfidence: 0.98,
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

// ---------------------------------------------------------------------------
// 3. ASHBY SOURCE ADAPTER
// ---------------------------------------------------------------------------
export class AshbySourceAdapter implements JobSourceAdapter {
  id: string;
  name: string;
  category = 'ats' as const;
  platform = 'ashby';
  endpoint: string;
  rateLimitSeconds = 120;
  private companyName: string;
  private boardToken: string;
  private healthState: SourceHealth;

  constructor(companyName: string, boardToken: string) {
    this.companyName = companyName;
    this.boardToken = boardToken;
    this.id = `ats_ashby_${boardToken}`;
    this.name = `${companyName} (Ashby)`;
    this.endpoint = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardToken)}`;
    this.healthState = {
      sourceId: this.id,
      sourceName: this.name,
      category: 'ats',
      platform: 'ashby',
      endpoint: this.endpoint,
      status: 'healthy',
      totalJobsDiscovered: 0,
      validJobsExtracted: 0,
      duplicatesDetected: 0,
      expiredJobsDetected: 0,
      failedRecords: 0,
      avgExtractionTimeMs: 0,
      authRequirements: 'None (Public Ashby API)',
    };
  }

  async fetchJobs(options?: QueryOptions): Promise<AdapterFetchResult> {
    const startTime = Date.now();
    this.healthState.lastAttemptedRun = new Date().toISOString();
    const limit = options?.limit || 30;

    if (!isSafePublicUrl(this.endpoint)) {
      this.healthState.status = 'degraded';
      return {
        sourceId: this.id,
        jobs: [],
        metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
        status: 'degraded',
        error: 'SSRF check failed',
        latencyMs: Date.now() - startTime,
      };
    }

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

      const data = (await resp.json()) as { jobs?: Array<any> };
      const rawJobs = Array.isArray(data.jobs) ? data.jobs : [];
      const extracted: DiscoveredJob[] = [];

      for (const item of rawJobs.slice(0, limit)) {
        if (!item.title || !item.id) continue;
        const loc = item.location || 'Remote';
        const expLevel = inferExperienceLevel(item.title, item.department || '');
        const arrangement = item.isRemote ? 'remote' : 'hybrid';

        extracted.push({
          id: `ashby_${this.boardToken}_${item.id}`,
          source: 'ashby',
          sourceJobId: item.id,
          sourceCategory: 'ats',
          atsPlatform: 'ashby',
          title: item.title.trim(),
          company: this.companyName,
          location: loc,
          country: loc.toLowerCase().includes('india') ? 'India' : 'Global',
          remote: !!item.isRemote,
          arrangement,
          employmentType: 'full-time',
          experienceLevel: expLevel as any,
          url: item.jobUrl || `https://jobs.ashbyhq.com/${this.boardToken}/${item.id}`,
          directApplicationUrl: item.jobUrl || `https://jobs.ashbyhq.com/${this.boardToken}/${item.id}/application`,
          description: `<p>Role: ${item.title} at ${this.companyName}. Department: ${item.department || 'General'}. Location: ${loc}</p>`,
          requirements: [expLevel, arrangement, item.department || 'Engineering'],
          tags: ['Ashby', this.companyName, arrangement],
          publishedAt: item.publishedAt || new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          isActive: true,
          lastCheckedAt: new Date().toISOString(),
          sourceConfidence: 0.98,
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

// ---------------------------------------------------------------------------
// 4. SMARTRECRUITERS SOURCE ADAPTER
// ---------------------------------------------------------------------------
export class SmartRecruitersSourceAdapter implements JobSourceAdapter {
  id: string;
  name: string;
  category = 'ats' as const;
  platform = 'smartrecruiters';
  endpoint: string;
  rateLimitSeconds = 120;
  private companyName: string;
  private companyIdentifier: string;
  private healthState: SourceHealth;

  constructor(companyName: string, companyIdentifier: string) {
    this.companyName = companyName;
    this.companyIdentifier = companyIdentifier;
    this.id = `ats_smartrec_${companyIdentifier}`;
    this.name = `${companyName} (SmartRecruiters)`;
    this.endpoint = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyIdentifier)}/postings?limit=50`;
    this.healthState = {
      sourceId: this.id,
      sourceName: this.name,
      category: 'ats',
      platform: 'smartrecruiters',
      endpoint: this.endpoint,
      status: 'healthy',
      totalJobsDiscovered: 0,
      validJobsExtracted: 0,
      duplicatesDetected: 0,
      expiredJobsDetected: 0,
      failedRecords: 0,
      avgExtractionTimeMs: 0,
      authRequirements: 'None (Public Posting API)',
    };
  }

  async fetchJobs(options?: QueryOptions): Promise<AdapterFetchResult> {
    const startTime = Date.now();
    this.healthState.lastAttemptedRun = new Date().toISOString();
    const limit = options?.limit || 30;

    if (!isSafePublicUrl(this.endpoint)) {
      this.healthState.status = 'degraded';
      return {
        sourceId: this.id,
        jobs: [],
        metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
        status: 'degraded',
        error: 'Blocked: Endpoint failed SSRF check',
        latencyMs: Date.now() - startTime,
      };
    }

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

      const data = (await resp.json()) as { content?: Array<any> };
      const rawJobs = Array.isArray(data.content) ? data.content : [];
      const extracted: DiscoveredJob[] = [];

      for (const item of rawJobs.slice(0, limit)) {
        if (!item.name || !item.id) continue;
        const loc = item.location?.city ? `${item.location.city}, ${item.location.country || ''}` : 'Global';
        extracted.push({
          id: `smartrec_${this.companyIdentifier}_${item.id}`,
          source: 'smartrecruiters',
          sourceJobId: String(item.id),
          sourceCategory: 'ats',
          atsPlatform: 'smartrecruiters',
          title: item.name.trim(),
          company: this.companyName,
          location: loc,
          country: (item.location?.country || '').toLowerCase().includes('in') ? 'India' : 'Global',
          remote: false,
          arrangement: 'onsite',
          employmentType: 'full-time',
          url: `https://jobs.smartrecruiters.com/${this.companyIdentifier}/${item.id}`,
          directApplicationUrl: `https://jobs.smartrecruiters.com/${this.companyIdentifier}/${item.id}/apply`,
          description: `<p>${item.name} at ${this.companyName}.</p>`,
          requirements: [item.department?.label || 'General'],
          tags: ['SmartRecruiters', this.companyName],
          publishedAt: item.releasedDate || new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          isActive: true,
          lastCheckedAt: new Date().toISOString(),
          sourceConfidence: 0.98,
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

// ---------------------------------------------------------------------------
// 5. CUSTOM CAREER PORTAL SOURCE ADAPTER
// ---------------------------------------------------------------------------
export class CustomCareersSourceAdapter implements JobSourceAdapter {
  id: string;
  name: string;
  category = 'company_careers' as const;
  platform = 'custom_ats';
  endpoint: string;
  rateLimitSeconds = 180;
  private companyName: string;
  private healthState: SourceHealth;

  constructor(companyName: string, careersUrl: string) {
    this.companyName = companyName;
    this.endpoint = careersUrl;
    this.id = `company_${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    this.name = `${companyName} Career Portal`;
    this.healthState = {
      sourceId: this.id,
      sourceName: this.name,
      category: 'company_careers',
      platform: 'custom_ats',
      endpoint: this.endpoint,
      status: 'healthy',
      totalJobsDiscovered: 0,
      validJobsExtracted: 0,
      duplicatesDetected: 0,
      expiredJobsDetected: 0,
      failedRecords: 0,
      avgExtractionTimeMs: 0,
      authRequirements: 'Public Portal',
    };
  }

  async fetchJobs(options?: QueryOptions): Promise<AdapterFetchResult> {
    const startTime = Date.now();
    this.healthState.lastAttemptedRun = new Date().toISOString();

    if (!isSafePublicUrl(this.endpoint)) {
      this.healthState.status = 'degraded';
      return {
        sourceId: this.id,
        jobs: [],
        metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
        status: 'degraded',
        error: 'SSRF blocked',
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const resp = await fetch(this.endpoint, {
        method: 'HEAD',
        headers: { 'User-Agent': 'ApplyViseAI-Engine/2.0' },
        signal: AbortSignal.timeout(6000),
      });

      const latencyMs = Date.now() - startTime;
      this.healthState.avgExtractionTimeMs = latencyMs;
      this.healthState.status = resp.ok ? 'healthy' : 'degraded';
      if (resp.ok) {
        this.healthState.lastSuccessfulRun = new Date().toISOString();
      }

      return {
        sourceId: this.id,
        jobs: [],
        metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 0, totalDuplicated: 0 },
        status: this.healthState.status,
        statusCode: resp.status,
        latencyMs,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.healthState.status = 'degraded';
      return {
        sourceId: this.id,
        jobs: [],
        metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
        status: 'degraded',
        error: msg,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  getHealth(): SourceHealth {
    return { ...this.healthState };
  }
}
