// server/sourceAdapters/index.ts
// Central Source Adapter Registry & Orchestrator for ApplyVise AI 2.0

import {
  JobSourceAdapter,
  DiscoveredJob,
  AdapterFetchResult,
  SourceHealth,
  QueryOptions,
  AdapterCategory,
} from './types.ts';
import { RemotiveSourceAdapter, ArbeitnowSourceAdapter, JobicySourceAdapter } from './marketplaceAdapters.ts';
import { buildCompanyAdapters, CURATED_COMPANY_REGISTRY, CompanyRegistryEntry } from './companyAdapters.ts';
import { GreenhouseSourceAdapter, LeverSourceAdapter, AshbySourceAdapter } from './atsAdapters.ts';

export class SourceAdapterRegistry {
  private adapters = new Map<string, JobSourceAdapter>();
  private initialized = false;

  constructor() {
    this.initializeDefaultAdapters();
  }

  private initializeDefaultAdapters(): void {
    if (this.initialized) return;

    // 1. Marketplace Adapters
    const remotive = new RemotiveSourceAdapter();
    const arbeitnow = new ArbeitnowSourceAdapter();
    const jobicy = new JobicySourceAdapter();

    this.register(remotive);
    this.register(arbeitnow);
    this.register(jobicy);

    // 2. Curated Company Adapters (Indian Tech + Global Product Leaders)
    const companyAdapters = buildCompanyAdapters();
    for (const ca of companyAdapters) {
      this.register(ca);
    }

    this.initialized = true;
  }

  public register(adapter: JobSourceAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id: string): JobSourceAdapter | undefined {
    return this.adapters.get(id);
  }

  public getAllAdapters(): JobSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getAdaptersByCategory(category: AdapterCategory): JobSourceAdapter[] {
    return this.getAllAdapters().filter((a) => a.category === category);
  }

  public getAdaptersByPlatform(platform: string): JobSourceAdapter[] {
    return this.getAllAdapters().filter((a) => a.platform.toLowerCase() === platform.toLowerCase());
  }

  public getHealthSummary(): SourceHealth[] {
    return this.getAllAdapters().map((a) => a.getHealth());
  }

  public getOverview(): {
    totalSources: number;
    healthySources: number;
    categories: Record<string, number>;
    platforms: Record<string, number>;
  } {
    const all = this.getAllAdapters();
    const categories: Record<string, number> = {};
    const platforms: Record<string, number> = {};
    let healthyCount = 0;

    for (const a of all) {
      categories[a.category] = (categories[a.category] || 0) + 1;
      platforms[a.platform] = (platforms[a.platform] || 0) + 1;
      const h = a.getHealth();
      if (h.status === 'healthy') healthyCount++;
    }

    return {
      totalSources: all.length,
      healthySources: healthyCount,
      categories,
      platforms,
    };
  }

  /**
   * Orchestrated parallel fetch across adapters with concurrency limiting and graceful isolation
   */
  public async fetchAll(
    options: QueryOptions & {
      sourceIds?: string[];
      categories?: AdapterCategory[];
      maxConcurrent?: number;
    } = {}
  ): Promise<{
    jobs: DiscoveredJob[];
    sourceResults: Record<string, AdapterFetchResult>;
    totalFetched: number;
    totalAccepted: number;
    durationMs: number;
  }> {
    const startTime = Date.now();
    let targetAdapters = this.getAllAdapters();

    if (options.sourceIds && options.sourceIds.length > 0) {
      const allowed = new Set(options.sourceIds);
      targetAdapters = targetAdapters.filter((a) => allowed.has(a.id));
    }

    if (options.categories && options.categories.length > 0) {
      const catSet = new Set(options.categories);
      targetAdapters = targetAdapters.filter((a) => catSet.has(a.category));
    }

    // Limit concurrency to avoid socket pool starvation
    const concurrency = options.maxConcurrent || 6;
    const sourceResults: Record<string, AdapterFetchResult> = {};
    const allDiscoveredJobs: DiscoveredJob[] = [];
    let totalFetched = 0;
    let totalAccepted = 0;

    for (let i = 0; i < targetAdapters.length; i += concurrency) {
      const slice = targetAdapters.slice(i, i + concurrency);
      const batchPromises = slice.map(async (adapter) => {
        try {
          const res = await adapter.fetchJobs(options);
          return res;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          const failRes: AdapterFetchResult = {
            sourceId: adapter.id,
            jobs: [],
            metrics: { totalFetched: 0, totalAccepted: 0, totalRejected: 1, totalDuplicated: 0 },
            status: 'offline',
            error: msg,
            latencyMs: 0,
          };
          return failRes;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      for (const b of batchResults) {
        if (b.status === 'fulfilled') {
          const res = b.value;
          sourceResults[res.sourceId] = res;
          totalFetched += res.metrics.totalFetched;
          totalAccepted += res.metrics.totalAccepted;
          allDiscoveredJobs.push(...res.jobs);
        }
      }
    }

    return {
      jobs: allDiscoveredJobs,
      sourceResults,
      totalFetched,
      totalAccepted,
      durationMs: Date.now() - startTime,
    };
  }
}

// Global Singleton Registry instance
export const globalSourceRegistry = new SourceAdapterRegistry();
export * from './types.ts';
export * from './atsAdapters.ts';
export * from './marketplaceAdapters.ts';
export * from './companyAdapters.ts';
