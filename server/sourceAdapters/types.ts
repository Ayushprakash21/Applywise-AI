// server/sourceAdapters/types.ts
// Standardized Source Adapter Contract & Data Definitions for ApplyVise AI 2.0

import { JobVacancy, WorkArrangement } from '../../src/types/index.ts';

export type AdapterCategory =
  | 'ats'
  | 'company_careers'
  | 'marketplace'
  | 'hiring_announcements';

export type AtsPlatform =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workday'
  | 'smartrecruiters'
  | 'workable'
  | 'recruitee'
  | 'jobvite'
  | 'bamboohr'
  | 'icims'
  | 'sap_successfactors'
  | 'oracle_recruiting'
  | 'custom_ats';

export interface DiscoveredJob extends Omit<JobVacancy, 'source'> {
  source: string;
  atsPlatform?: AtsPlatform;
  experienceLevel?: string;
  sourceConfidence: number; // 0.0 - 1.0
  sourceJobId: string;
  sourceCategory: AdapterCategory;
  directApplicationUrl?: string;
  rawPayloadSnippet?: string;
}

export interface IngestionMetrics {
  totalFetched: number;
  totalAccepted: number;
  totalRejected: number;
  totalDuplicated: number;
}

export interface AdapterFetchResult {
  sourceId: string;
  jobs: DiscoveredJob[];
  metrics: IngestionMetrics;
  status: 'healthy' | 'empty' | 'degraded' | 'rate_limited' | 'offline';
  error?: string;
  statusCode?: number;
  latencyMs: number;
}

export interface SourceHealth {
  sourceId: string;
  sourceName: string;
  category: AdapterCategory;
  platform?: string;
  endpoint: string;
  status: 'healthy' | 'empty' | 'degraded' | 'rate_limited' | 'offline';
  totalJobsDiscovered: number;
  validJobsExtracted: number;
  duplicatesDetected: number;
  expiredJobsDetected: number;
  failedRecords: number;
  lastSuccessfulRun?: string;
  lastAttemptedRun?: string;
  avgExtractionTimeMs: number;
  lastError?: string;
  authRequirements?: string;
}

export interface QueryOptions {
  q?: string;
  query?: string;
  country?: string;
  location?: string;
  remoteOnly?: boolean;
  limit?: number;
  page?: number;
}

export interface JobSourceAdapter {
  id: string;
  name: string;
  category: AdapterCategory;
  platform: string;
  endpoint: string;
  rateLimitSeconds: number;
  
  fetchJobs(options?: QueryOptions): Promise<AdapterFetchResult>;
  checkFreshness?(jobUrl: string): Promise<{ isActive: boolean; lastCheckedAt: string }>;
  getHealth(): SourceHealth;
}
