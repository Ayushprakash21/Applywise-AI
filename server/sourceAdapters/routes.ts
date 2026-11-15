// server/sourceAdapters/routes.ts
// REST Endpoints for Universal Opportunity Discovery & Health Monitoring

import { Router, Request, Response } from 'express';
import { globalSourceRegistry } from './index.ts';
import { globalCanonicalStore } from './canonicalStore.ts';
import { globalHiringAi } from '../hiringAiPipeline.ts';

export const discoveryRouter = Router();

/**
 * GET /api/discovery/sources
 * Returns all registered job sources, their adapter platform, category, and health status
 */
discoveryRouter.get('/sources', (_req: Request, res: Response) => {
  try {
    const healthList = globalSourceRegistry.getHealthSummary();
    const overview = globalSourceRegistry.getOverview();
    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      overview,
      sources: healthList,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/discovery/sync
 * Triggers ingestion across all or filtered sources and runs deduplication + contact enrichment
 */
discoveryRouter.post('/sync', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { sourceIds, categories, limit = 20 } = req.body || {};

  try {
    // 1. Fetch from adapters
    const result = await globalSourceRegistry.fetchAll({
      sourceIds,
      categories,
      limit,
      maxConcurrent: 6,
    });

    // 2. Ingest into canonical store with deduplication
    const ingestionMetrics = globalCanonicalStore.ingestBatch(result.jobs);

    // 3. Enrich contacts for top accepted jobs
    const activeJobs = globalCanonicalStore.getAllOpportunities().slice(0, 30);
    for (const job of activeJobs) {
      if (job.enrichmentStatus === 'pending') {
        await globalCanonicalStore.enrichOpportunityContacts(job.id);
      }
    }

    const storeMetrics = globalCanonicalStore.getMetrics();

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      adapters: {
        totalFetched: result.totalFetched,
        totalAccepted: result.totalAccepted,
        sourceBreakdown: Object.keys(result.sourceResults).map((sId) => ({
          sourceId: sId,
          status: result.sourceResults[sId].status,
          jobsExtracted: result.sourceResults[sId].jobs.length,
          latencyMs: result.sourceResults[sId].latencyMs,
        })),
      },
      canonicalStore: {
        batchAccepted: ingestionMetrics.accepted,
        batchDuplicatesMerged: ingestionMetrics.duplicatesMerged,
        totalCanonicalOpportunities: storeMetrics.totalIndexed,
        totalActiveOpportunities: storeMetrics.totalActive,
        totalWithEnrichedContacts: storeMetrics.totalWithContacts,
        deduplicationRatePercent: storeMetrics.deduplicationRatePercent,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/discovery/jobs
 * Queries canonical deduplicated opportunities
 */
discoveryRouter.get('/jobs', (req: Request, res: Response) => {
  try {
    const country = req.query.country as string | undefined;
    const remoteOnly = req.query.remote === 'true';
    const arrangement = req.query.arrangement as string | undefined;
    const limit = parseInt(req.query.limit as string || '50', 10);

    const jobs = globalCanonicalStore.getAllOpportunities({
      country,
      remoteOnly,
      arrangement,
      activeOnly: true,
    });

    return res.json({
      success: true,
      count: jobs.length,
      jobs: jobs.slice(0, limit),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/discovery/metrics
 * Comprehensive telemetry for admin dashboard and real-time monitoring
 */
discoveryRouter.get('/metrics', (_req: Request, res: Response) => {
  try {
    const storeMetrics = globalCanonicalStore.getMetrics();
    const overview = globalSourceRegistry.getOverview();
    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storeMetrics,
      registryOverview: overview,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/discovery/analyze-intent
 * Runs AI intent extraction on job text
 */
discoveryRouter.post('/analyze-intent', (req: Request, res: Response) => {
  try {
    const { title = '', description = '', requirements = [] } = req.body || {};
    const signals = globalHiringAi.analyzeVacancy(title, description, requirements);
    return res.json({
      success: true,
      signals,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
});
