// server/sourceAdapters/rssAdapter.ts
// Production RSS/Atom Career Feed Adapter
// Ingests open RSS / Atom feeds published by corporate recruitment blogs and job boards

import { JobSourceAdapter, AdapterFetchResult, SourceHealth, QueryOptions, DiscoveredJob } from './types.ts';
import { isSafePublicUrl, sanitizeIngestedDescription, inferExperienceLevel, inferWorkArrangement } from '../../worker/jobConnectors.ts';

export class RssJobAdapter implements JobSourceAdapter {
  id: string;
  name: string;
  category = 'company_careers' as const;
  platform = 'rss_atom';
  endpoint: string;
  rateLimitSeconds = 300;
  private companyName: string;
  private healthState: SourceHealth;

  constructor(companyName: string, rssFeedUrl: string) {
    this.companyName = companyName;
    this.endpoint = rssFeedUrl;
    this.id = `rss_${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    this.name = `${companyName} (RSS Careers)`;
    this.healthState = {
      sourceId: this.id,
      sourceName: this.name,
      category: 'company_careers',
      platform: 'rss_atom',
      endpoint: this.endpoint,
      status: 'healthy',
      totalJobsDiscovered: 0,
      validJobsExtracted: 0,
      duplicatesDetected: 0,
      expiredJobsDetected: 0,
      failedRecords: 0,
      avgExtractionTimeMs: 0,
      authRequirements: 'None (Public RSS/Atom Feed)',
    };
  }

  async fetchJobs(options?: QueryOptions): Promise<AdapterFetchResult> {
    const startTime = Date.now();
    this.healthState.lastAttemptedRun = new Date().toISOString();
    const limit = options?.limit || 25;

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
        headers: {
          'User-Agent': 'ApplyWiseAI-Engine/2.0 (+https://applywise.ai/bot)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
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

      const xmlText = await resp.text();
      const extracted = this.parseRssXml(xmlText, limit);

      this.healthState.status = 'healthy';
      this.healthState.lastSuccessfulRun = new Date().toISOString();
      this.healthState.totalJobsDiscovered += extracted.length;
      this.healthState.validJobsExtracted += extracted.length;

      return {
        sourceId: this.id,
        jobs: extracted,
        metrics: {
          totalFetched: extracted.length,
          totalAccepted: extracted.length,
          totalRejected: 0,
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

  public parseRssXml(xml: string, limit: number = 25): DiscoveredJob[] {
    const jobs: DiscoveredJob[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null && jobs.length < limit) {
      const itemBlock = match[1];
      const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(itemBlock);
      const linkMatch = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i.exec(itemBlock);
      const descMatch = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i.exec(itemBlock);
      const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(itemBlock);
      const guidMatch = /<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/i.exec(itemBlock);

      if (!titleMatch) continue;
      const title = titleMatch[1].trim();
      const link = linkMatch ? linkMatch[1].trim() : this.endpoint;
      const desc = descMatch ? descMatch[1].trim() : `<p>${title} at ${this.companyName}.</p>`;
      const pubDate = pubDateMatch ? new Date(pubDateMatch[1].trim()).toISOString() : new Date().toISOString();
      const guid = guidMatch ? guidMatch[1].trim() : link;

      const expLevel = inferExperienceLevel(title, desc);
      const arrangement = inferWorkArrangement(desc, title, desc);

      jobs.push({
        id: `rss_${this.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${encodeURIComponent(guid.slice(-20)).replace(/[^a-z0-9]/g, '_')}`,
        source: 'company_careers',
        sourceJobId: guid,
        sourceCategory: 'company_careers',
        atsPlatform: 'custom_ats',
        title,
        company: this.companyName,
        location: 'Global',
        country: 'Global',
        remote: arrangement === 'remote',
        arrangement,
        employmentType: 'full-time',
        experienceLevel: expLevel as any,
        url: link,
        directApplicationUrl: link,
        description: sanitizeIngestedDescription(desc),
        requirements: [expLevel, arrangement],
        tags: ['RSS Feed', this.companyName, arrangement],
        publishedAt: pubDate,
        retrievedAt: new Date().toISOString(),
        isActive: true,
        lastCheckedAt: new Date().toISOString(),
        sourceConfidence: 0.92,
      });
    }

    return jobs;
  }

  getHealth(): SourceHealth {
    return { ...this.healthState };
  }
}
