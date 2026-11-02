// worker/jobSyncManager.ts
// Incremental 10-Minute Scheduler & Batch Refresh Engine for Live Jobs

import { D1Store } from './d1Store.ts';
import { SOURCE_REGISTRY, deduplicateJobs, ConnectorDefinition } from './jobConnectors.ts';

export interface SyncResult {
  refreshedSources: string[];
  totalJobsFetched: number;
  totalNewOrUpdated: number;
  errors: Array<{ sourceId: string; error: string }>;
  expiredPruned: number;
  durationMs: number;
}

export async function runIncrementalJobSync(
  store: D1Store,
  options?: { batchLimit?: number; forceSourceId?: string }
): Promise<SyncResult> {
  const startTime = Date.now();
  const batchLimit = options?.batchLimit || 4; // Bounded batch to respect Worker subrequest budgets
  const errors: Array<{ sourceId: string; error: string }> = [];
  const refreshedSources: string[] = [];
  let totalJobsFetched = 0;

  // 1. Prune expired temporary records
  const expiredPruned = await store.cleanupExpiredLiveJobs();

  // 2. Select sources to refresh
  let targetConnectors: ConnectorDefinition[] = [];
  if (options?.forceSourceId) {
    const found = SOURCE_REGISTRY.find(s => s.id === options.forceSourceId);
    if (found) targetConnectors = [found];
  } else {
    // Select round-robin or least recently refreshed sources
    const healthRecords = await store.getLiveSourcesHealth();
    const healthMap = new Map(healthRecords.map(h => [h.source_id, h]));

    // Sort connectors by oldest last_refreshed_at
    const sorted = [...SOURCE_REGISTRY].sort((a, b) => {
      const aTime = healthMap.get(a.id)?.last_refreshed_at || '1970-01-01T00:00:00Z';
      const bTime = healthMap.get(b.id)?.last_refreshed_at || '1970-01-01T00:00:00Z';
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });

    targetConnectors = sorted.slice(0, batchLimit);
  }

  // 3. Execute fetches with per-source isolation
  for (const connector of targetConnectors) {
    const cStartTime = Date.now();
    try {
      const rawJobs = await connector.fetchFn();
      const deduped = deduplicateJobs(rawJobs);
      totalJobsFetched += deduped.length;

      // Save to temporary D1 cache
      await store.saveLiveJobs(deduped);

      // Record healthy status
      await store.updateSourceHealth({
        sourceId: connector.id,
        sourceName: connector.name,
        connectorType: connector.type,
        endpoint: connector.endpoint,
        status: 'healthy',
        totalJobs: deduped.length,
        latencyMs: Date.now() - cStartTime,
      });

      refreshedSources.push(connector.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ sourceId: connector.id, error: msg });

      // Record degraded or offline status
      await store.updateSourceHealth({
        sourceId: connector.id,
        sourceName: connector.name,
        connectorType: connector.type,
        endpoint: connector.endpoint,
        status: 'degraded',
        totalJobs: 0,
        latencyMs: Date.now() - cStartTime,
        lastError: msg,
      });
    }
  }

  return {
    refreshedSources,
    totalJobsFetched,
    totalNewOrUpdated: totalJobsFetched,
    errors,
    expiredPruned,
    durationMs: Date.now() - startTime,
  };
}
