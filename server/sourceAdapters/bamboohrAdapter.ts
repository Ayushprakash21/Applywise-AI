// server/sourceAdapters/bamboohrAdapter.ts
// Production BambooHR Public Source Adapter
// Queries public BambooHR company career feeds

import { JobSourceAdapter, AdapterFetchResult, SourceHealth, QueryOptions, DiscoveredJob } from './types.ts';
import { isSafePublicUrl, sanitizeIngestedDescription, inferExperienceLevel, inferWorkArrangement } from '../../worker/jobConnectors.ts';

export class BambooHRSourceAdapter implements JobSourceAdapter {
  id: string;
  name: string;
  category = 'ats' as const;
  platform = 'bamboohr';
  endpoint: string;
  rateLimitSeconds = 120;
  private companySubdomain: string;
  private companyName: string;
  private healthState: SourceHealth;

  constructor(companyName: string, companySubdomain: string) {
    this.companyName = companyName;
    this.companySubdomain = companySubdomain;
    this.id = `ats_bamboohr_${companySubdomain.toLowerCase()}`;
    this.name = `${companyName} (BambooHR)`;
    // BambooHR public careers feed JSON endpoint
    this.endpoint = `https://${encodeURIComponent(companySubdomain)}.bamboohr.com/careers/list`;
    this.healthState = {
      sourceId: this.id,
      sourceName: this.name,
      category: 'ats',
      platform: 'bamboohr',
      endpoint: this.endpoint,
      status: 'healthy',
      totalJobsDiscovered: 0,
      validJobsExtracted: 0,
      duplicatesDetected: 0,
      expiredJobsDetected: 0,
      failedRecords: 0,
      avgExtractionTimeMs: 0,
      authRequirements: 'None (Public BambooHR Feed)',
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
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ApplyWiseAI-Engine/2.0 (+https://applywise.ai/bot)',
        },
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

      const data = (await resp.json()) as {
        result?: Array<{
          id: string | number;
          jobOpeningName?: string;
          department?: string;
          location?: {
            city?: string;
            state?: string;
          };
          locationType?: string;
        }>;
      };

      const rawJobs = Array.isArray(data.result) ? data.result : [];
      const extracted: DiscoveredJob[] = [];

      for (const item of rawJobs.slice(0, limit)) {
        if (!item.jobOpeningName || !item.id) continue;

        const loc = item.location?.city ? `${item.location.city}${item.location.state ? `, ${item.location.state}` : ''}` : 'Remote';
        const isRemote = (item.locationType || '').toLowerCase().includes('remote') || loc.toLowerCase().includes('remote');
        const arrangement = isRemote ? 'remote' : 'hybrid';
        const expLevel = inferExperienceLevel(item.jobOpeningName, item.department || '');
        const hostedUrl = `https://${this.companySubdomain}.bamboohr.com/careers/${item.id}`;

        extracted.push({
          id: `bamboohr_${this.companySubdomain}_${item.id}`,
          source: 'bamboohr',
          sourceJobId: String(item.id),
          sourceCategory: 'ats',
          atsPlatform: 'bamboohr',
          title: item.jobOpeningName.trim(),
          company: this.companyName,
          location: loc,
          country: loc.toLowerCase().includes('india') ? 'India' : 'Global',
          remote: isRemote,
          arrangement,
          employmentType: 'full-time',
          experienceLevel: expLevel as any,
          url: hostedUrl,
          directApplicationUrl: `${hostedUrl}/detail`,
          description: `<p>${item.jobOpeningName} at ${this.companyName}. Department: ${item.department || 'General'}.</p>`,
          requirements: [expLevel, arrangement, item.department || 'Engineering'],
          tags: ['BambooHR', this.companyName, arrangement],
          publishedAt: new Date().toISOString(),
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
        metrics: {
          totalFetched: rawJobs.length,
          totalAccepted: extracted.length,
          totalRejected: rawJobs.length - extracted.length,
          totalDuplicated: 0,
        },
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
