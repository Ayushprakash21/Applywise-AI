// worker/jobSyncManager.ts
// Robust Ingestion Scheduler, Batch Coordinator & Error Auditing Engine for Live Jobs

import { D1Store } from './d1Store.ts';
import { SOURCE_ADAPTERS, deduplicateJobs, LiveJobItem } from './jobConnectors.ts';
import { processWorkerHrDiscoveryQueueBatch } from './hrDiscoveryEngine.ts';

export interface SyncResult {
  runId: string;
  triggerType: 'cron' | 'manual' | 'startup' | 'on_demand';
  status: 'completed' | 'partial' | 'failed';
  refreshedSources: string[];
  totalJobsFetched: number;
  totalAccepted: number;
  totalRejected: number;
  totalDuplicated: number;
  errors: Array<{ sourceId: string; error: string; statusCode?: number }>;
  expiredPruned: number;
  durationMs: number;
}

export async function runIncrementalJobSync(
  store: D1Store,
  options?: {
    batchLimit?: number;
    forceSourceId?: string;
    triggerType?: 'cron' | 'manual' | 'startup' | 'on_demand';
  }
): Promise<SyncResult> {
  const startTime = Date.now();
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const triggerType = options?.triggerType || 'on_demand';
  const batchLimit = options?.batchLimit || 4; // Bounded batch to respect Worker subrequest budgets

  const errors: Array<{ sourceId: string; error: string; statusCode?: number }> = [];
  const refreshedSources: string[] = [];
  let totalJobsFetched = 0;
  let totalAccepted = 0;
  let totalRejected = 0;
  let totalDuplicated = 0;

  // 1. Record Ingestion Run Start
  try {
    await store.recordIngestionRunStart(runId, triggerType);
  } catch (err) {
    console.error('Failed to record ingestion run start:', err);
  }

  // 2. Gently prune genuinely expired jobs (14-day window)
  let expiredPruned = 0;
  try {
    expiredPruned = await store.cleanupExpiredLiveJobs();
  } catch (err) {
    console.error('Cleanup expired live jobs error:', err);
  }

  // 3. Select sources to refresh (Round-Robin prioritized by oldest sync)
  let targetAdapters = [...SOURCE_ADAPTERS];
  if (options?.forceSourceId) {
    const found = SOURCE_ADAPTERS.find(s => s.id === options.forceSourceId);
    if (found) targetAdapters = [found];
  } else {
    try {
      const healthRecords = await store.getLiveSourcesHealth();
      const healthMap = new Map(healthRecords.map(h => [h.source_id, h]));

      // Sort adapters: prioritized aggregators first, then oldest refreshed
      targetAdapters.sort((a, b) => {
        const aHealth = healthMap.get(a.id);
        const bHealth = healthMap.get(b.id);
        const aTime = aHealth?.last_refreshed_at || '1970-01-01T00:00:00Z';
        const bTime = bHealth?.last_refreshed_at || '1970-01-01T00:00:00Z';
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      });

      targetAdapters = targetAdapters.slice(0, batchLimit);
    } catch {
      targetAdapters = targetAdapters.slice(0, batchLimit);
    }
  }

  const allAccumulatedJobs: LiveJobItem[] = [];

  // 4. Execute fetches with per-adapter isolation
  for (const adapter of targetAdapters) {
    const aStartTime = Date.now();
    try {
      const result = await adapter.fetchJobs();
      const latencyMs = Date.now() - aStartTime;

      totalJobsFetched += result.metrics.totalFetched;
      totalAccepted += result.metrics.totalAccepted;
      totalRejected += result.metrics.totalRejected;

      if (result.jobs.length > 0) {
        const { unique, duplicatedCount } = deduplicateJobs(result.jobs);
        totalDuplicated += duplicatedCount;
        allAccumulatedJobs.push(...unique);
        refreshedSources.push(adapter.id);

        // Record healthy status
        await store.updateSourceHealth({
          sourceId: adapter.id,
          sourceName: adapter.name,
          connectorType: adapter.type,
          endpoint: adapter.endpoint,
          status: result.status,
          totalJobs: unique.length,
          latencyMs,
          lastError: result.error,
        });
      } else {
        // Source responded empty or with error
        if (result.error) {
          errors.push({ sourceId: adapter.id, error: result.error, statusCode: result.statusCode });
          await store.recordIngestionError(runId, adapter.id, result.status, result.error, result.statusCode);
        }

        await store.updateSourceHealth({
          sourceId: adapter.id,
          sourceName: adapter.name,
          connectorType: adapter.type,
          endpoint: adapter.endpoint,
          status: result.status,
          totalJobs: 0,
          latencyMs,
          lastError: result.error,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ sourceId: adapter.id, error: msg });
      try {
        await store.recordIngestionError(runId, adapter.id, 'offline', msg);
        await store.updateSourceHealth({
          sourceId: adapter.id,
          sourceName: adapter.name,
          connectorType: adapter.type,
          endpoint: adapter.endpoint,
          status: 'offline',
          totalJobs: 0,
          latencyMs: Date.now() - aStartTime,
          lastError: msg,
        });
      } catch (logErr) {
        console.error('Failed to log source error:', logErr);
      }
    }
  }

  // 5. Idempotent Upsert to Database
  if (allAccumulatedJobs.length > 0) {
    const { unique, duplicatedCount } = deduplicateJobs(allAccumulatedJobs);
    totalDuplicated += duplicatedCount;
    try {
      await store.saveLiveJobs(unique);
      // Automatically extract HR contacts from freshly synced job descriptions within bounded subrequest budget
      try {
        await processWorkerHrDiscoveryQueueBatch(store.getDatabase(), {
          triggeredBy: 'gcde_sync_hook',
          triggerType: 'post_sync',
          batchLimit: 60,
          fetchBudget: 4,
          jobIds: unique.slice(0, 60).map((j) => j.id),
        });
      } catch (hrErr) {
        console.warn('Post-sync HR contact discovery batch non-fatal warning:', hrErr);
      }
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      errors.push({ sourceId: 'database_persistence', error: `D1 write failed: ${msg}` });
      try {
        await store.recordIngestionError(runId, 'database_persistence', 'db_error', msg);
      } catch {}
    }
  }

  // 6. Record Ingestion Run Completion
  const durationMs = Date.now() - startTime;
  const runStatus = errors.length === 0 ? 'completed' : (refreshedSources.length > 0 ? 'partial' : 'failed');
  const errorSummary = errors.length > 0 ? errors.map(e => `[${e.sourceId}] ${e.error}`).join('; ') : undefined;

  try {
    await store.recordIngestionRunComplete({
      runId,
      status: runStatus,
      totalSources: targetAdapters.length,
      totalFetched: totalJobsFetched,
      totalAccepted,
      totalRejected,
      totalDuplicated,
      durationMs,
      errorSummary,
    });
  } catch (err) {
    console.error('Failed to complete ingestion run logging:', err);
  }

  return {
    runId,
    triggerType,
    status: runStatus,
    refreshedSources,
    totalJobsFetched,
    totalAccepted,
    totalRejected,
    totalDuplicated,
    errors,
    expiredPruned,
    durationMs,
  };
}
