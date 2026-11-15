// server/sourceAdapters/workdayAdapter.ts
// Production Workday Candidate Experience (CX) Public Source Adapter
// Connects to public Workday career portals via standard public CX JSON endpoints

import { JobSourceAdapter, AdapterFetchResult, SourceHealth, QueryOptions, DiscoveredJob } from './types.ts';
import { isSafePublicUrl, sanitizeIngestedDescription, inferExperienceLevel, inferWorkArrangement } from '../../worker/jobConnectors.ts';

export class WorkdaySourceAdapter implements JobSourceAdapter {
  id: string;
  name: string;
  category = 'ats' as const;
  platform = 'workday';
  endpoint: string;
  rateLimitSeconds = 120;
  private tenant: string;
  private site: string;
  private companyName: string;
  private healthState: SourceHealth;

  constructor(companyName: string, tenant: string, site: string = 'External') {
    this.companyName = companyName;
    this.tenant = tenant;
    this.site = site;
    this.id = `ats_workday_${tenant.toLowerCase()}`;
    this.name = `${companyName} (Workday)`;
    // Standard Workday Candidate Experience (CXS) search endpoint
    this.endpoint = `https://${encodeURIComponent(tenant)}.myworkdayjobs.com/wday/cxs/${encodeURIComponent(tenant)}/${encodeURIComponent(site)}/jobs`;
    this.healthState = {
      sourceId: this.id,
      sourceName: this.name,
      category: 'ats',
      platform: 'workday',
      endpoint: this.endpoint,
      status: 'healthy',
      totalJobsDiscovered: 0,
      validJobsExtracted: 0,
      duplicatesDetected: 0,
      expiredJobsDetected: 0,
      failedRecords: 0,
      avgExtractionTimeMs: 0,
      authRequirements: 'None (Public CXS REST API)',
    };
  }

  async fetchJobs(options?: QueryOptions): Promise<AdapterFetchResult> {
    const startTime = Date.now();
    this.healthState.lastAttemptedRun = new Date().toISOString();
    const limit = options?.limit || 25;
    const searchText = options?.q || options?.query || '';

    if (!isSafePublicUrl(this.endpoint)) {
      this.healthState.status = 'degraded';
      this.healthState.lastError = 'SSRF Check Failed';
      return {
        sourceId: this.id,
        jobs: [],
        metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
        status: 'degraded',
        error: 'SSRF Check Failed',
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const resp = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ApplyWiseAI-Engine/2.0 (+https://applywise.ai/bot)',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          appliedFacets: {},
          limit,
          offset: 0,
          searchText,
        }),
        signal: AbortSignal.timeout(10000),
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

      const data = (await resp.json()) as {
        total?: number;
        jobPostings?: Array<{
          title: string;
          externalPath: string;
          locationsText?: string;
          postedOn?: string;
          bulletFields?: string[];
          timeType?: string;
        }>;
      };

      const rawList = Array.isArray(data.jobPostings) ? data.jobPostings : [];
      const extracted: DiscoveredJob[] = [];

      for (const item of rawList.slice(0, limit)) {
        if (!item.title || !item.externalPath) continue;

        const locationStr = item.locationsText || 'Global';
        const isIndia = locationStr.toLowerCase().includes('india') ||
          locationStr.toLowerCase().includes('bengaluru') ||
          locationStr.toLowerCase().includes('hyderabad') ||
          locationStr.toLowerCase().includes('pune') ||
          locationStr.toLowerCase().includes('noida') ||
          locationStr.toLowerCase().includes('mumbai') ||
          locationStr.toLowerCase().includes('gurugram');

        const deepUrl = `https://${this.tenant}.myworkdayjobs.com/en-US/${this.site}${item.externalPath}`;
        const cleanTitle = item.title.trim();
        const arrangement = inferWorkArrangement(locationStr, cleanTitle, (item.bulletFields || []).join(' '));
        const expLevel = inferExperienceLevel(cleanTitle, (item.bulletFields || []).join(' '));

        extracted.push({
          id: `wd_${this.tenant}_${item.externalPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
          source: 'workday',
          sourceJobId: item.externalPath,
          sourceCategory: 'ats',
          atsPlatform: 'workday',
          title: cleanTitle,
          company: this.companyName,
          location: locationStr,
          country: isIndia ? 'India' : 'Global',
          remote: arrangement === 'remote',
          arrangement,
          employmentType: item.timeType?.toLowerCase().includes('part') ? 'part-time' : 'full-time',
          experienceLevel: expLevel as any,
          url: deepUrl,
          directApplicationUrl: `${deepUrl}/apply`,
          description: sanitizeIngestedDescription(
            `<p>Role: ${cleanTitle} at ${this.companyName}. Location: ${locationStr}. Posted: ${item.postedOn || 'Recently'}.</p>`
          ),
          requirements: [expLevel, arrangement, ...(item.bulletFields || [])],
          tags: ['Workday', this.companyName, arrangement],
          publishedAt: new Date().toISOString(),
          retrievedAt: new Date().toISOString(),
          isActive: true,
          lastCheckedAt: new Date().toISOString(),
          sourceConfidence: 0.98,
        });
      }

      this.healthState.status = 'healthy';
      this.healthState.lastSuccessfulRun = new Date().toISOString();
      this.healthState.totalJobsDiscovered += (data.total || rawList.length);
      this.healthState.validJobsExtracted += extracted.length;

      return {
        sourceId: this.id,
        jobs: extracted,
        metrics: {
          totalFetched: rawList.length,
          totalAccepted: extracted.length,
          totalRejected: rawList.length - extracted.length,
          totalDuplicated: 0,
        },
        status: 'healthy',
        statusCode: 200,
        latencyMs,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.healthState.status = 'offline';
      this.healthState.lastError = msg;
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

  async checkFreshness(jobUrl: string): Promise<{ isActive: boolean; lastCheckedAt: string }> {
    const checkedAt = new Date().toISOString();
    try {
      const resp = await fetch(jobUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'ApplyWiseAI-Engine/2.0' },
        signal: AbortSignal.timeout(5000),
      });
      return {
        isActive: resp.status < 400,
        lastCheckedAt: checkedAt,
      };
    } catch {
      return { isActive: false, lastCheckedAt: checkedAt };
    }
  }

  getHealth(): SourceHealth {
    return { ...this.healthState };
  }
}
