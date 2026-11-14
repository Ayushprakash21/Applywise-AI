// server/jobDiscovery.ts
// Upgraded Global Career Discovery Engine (GCDE) for ApplyVise AI 2.0
// Features Multi-Source Adapter Architecture, Normalization, Deduplication & Freshness Verification.

import { JobVacancy } from '../src/types/index.ts';
import { globalSourceRegistry, DiscoveredJob, SourceHealth } from './sourceAdapters/index.ts';
import { deduplicateJobs, verifyJobFreshness, cleanJobTitle, normalizeCompanyName } from './jobQualityEngine.ts';

export interface DiscoveryQuery {
  query?: string;
  category?: string;
  country?: string;
  location?: string;
  remoteOnly?: boolean;
  limit?: number;
  sourceIds?: string[];
}

export const jobDiscovery = {
  /**
   * Search multiple public job sources (ATS, Marketplaces, Curated Company Portals)
   * and return normalized, deduplicated listings with quality scores.
   */
  async searchJobs(params: DiscoveryQuery): Promise<{
    vacancies: JobVacancy[];
    errors: string[];
    metrics: {
      totalDiscovered: number;
      uniqueAccepted: number;
      duplicateCount: number;
      sourceCount: number;
      durationMs: number;
    };
  }> {
    const errors: string[] = [];
    const limit = Math.min(params.limit || 30, 100);

    try {
      const fetchResult = await globalSourceRegistry.fetchAll({
        q: params.query,
        query: params.query,
        country: params.country,
        location: params.location,
        remoteOnly: params.remoteOnly,
        limit,
        sourceIds: params.sourceIds,
        maxConcurrent: 6,
      });

      // Collect adapter errors
      for (const [sourceId, res] of Object.entries(fetchResult.sourceResults)) {
        if (res.error) {
          errors.push(`[${sourceId}] ${res.error}`);
        }
      }

      // Filter by country / remote if explicitly requested
      let filtered = fetchResult.jobs;
      if (params.remoteOnly) {
        filtered = filtered.filter((j) => j.remote || j.arrangement === 'remote');
      }
      if (params.country && params.country !== 'all') {
        const cLower = params.country.toLowerCase();
        filtered = filtered.filter(
          (j) =>
            (j.country && j.country.toLowerCase().includes(cLower)) ||
            (j.location && j.location.toLowerCase().includes(cLower))
        );
      }

      // Multi-factor deduplication
      const { uniqueJobs, duplicateCount } = deduplicateJobs(filtered);

      return {
        vacancies: uniqueJobs.slice(0, limit),
        errors,
        metrics: {
          totalDiscovered: fetchResult.totalFetched,
          uniqueAccepted: uniqueJobs.length,
          duplicateCount,
          sourceCount: Object.keys(fetchResult.sourceResults).length,
          durationMs: fetchResult.durationMs,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Discovery engine error: ${msg}`);
      return {
        vacancies: [],
        errors,
        metrics: {
          totalDiscovered: 0,
          uniqueAccepted: 0,
          duplicateCount: 0,
          sourceCount: 0,
          durationMs: 0,
        },
      };
    }
  },

  /**
   * Recheck if an external vacancy is still reachable using HTTP HEAD/GET probe.
   */
  async recheckVacancy(vacancy: JobVacancy): Promise<{ isActive: boolean; lastCheckedAt: string; reason: string }> {
    if (!vacancy.url) {
      return { isActive: false, lastCheckedAt: new Date().toISOString(), reason: 'Missing listing URL' };
    }
    const res = await verifyJobFreshness(vacancy.url, 5000);
    return {
      isActive: res.isActive,
      lastCheckedAt: res.checkedAt,
      reason: res.reason,
    };
  },

  /**
   * Returns current health telemetry across all registered source adapters
   */
  getSourcesHealth(): SourceHealth[] {
    return globalSourceRegistry.getHealthSummary();
  },

  /**
   * Returns high-level overview of adapter categories and active platforms
   */
  getSourcesOverview() {
    return globalSourceRegistry.getOverview();
  },
};
