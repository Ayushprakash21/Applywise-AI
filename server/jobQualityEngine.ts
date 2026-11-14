// server/jobQualityEngine.ts
// Job Normalization, Multi-Factor Deduplication, Freshness Verification & Quality Engine for ApplyVise AI 2.0

import { DiscoveredJob } from './sourceAdapters/types.ts';
import { isSafePublicUrl } from '../worker/jobConnectors.ts';
import crypto from 'node:crypto';

// Common company suffix cleanup patterns
const COMPANY_SUFFIX_REGEX =
  /\b(inc|incorporated|corp|corporation|llc|ltd|limited|pvt|pvt\s+ltd|private\s+limited|technologies|technology|tech|solutions|services|group|holdings|labs|systems|software)\b\.?/gi;

// Title noise cleanup patterns (e.g. [Req-123], (Remote), - Immediate Joiner)
const REQUISITION_CODE_REGEX = /(\[.*?\]|\(.*?\)|req\s*#?\d+|requisition\s*#?\d+|\bid:\s*\d+)/gi;
const TITLE_LOCATION_NOISE_REGEX = /\b(remote|hybrid|onsite|india|bangalore|bengaluru|mumbai|delhi|us|usa|emea|apac|latam)\b/gi;

/**
 * Normalizes company name by stripping legal entities, punctuation and spacing
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return 'Unknown Company';
  let cleaned = name.toLowerCase();
  cleaned = cleaned.replace(COMPANY_SUFFIX_REGEX, ' ');
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || name.trim().toLowerCase();
}

/**
 * Normalizes job title by stripping requisition IDs, department codes, and location noise
 */
export function cleanJobTitle(title: string): string {
  if (!title) return 'Role';
  let cleaned = title.replace(REQUISITION_CODE_REGEX, ' ');
  cleaned = cleaned.replace(/\s+[-|/•]\s+.*$/g, ' '); // Strip trailing qualifiers like " - Remote"
  cleaned = cleaned.replace(TITLE_LOCATION_NOISE_REGEX, ' ');
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim().toLowerCase();
  return cleaned || title.trim().toLowerCase();
}

/**
 * Computes deterministic deduplication hash for cross-source clustering
 */
export function generateDedupKey(company: string, title: string, location?: string): string {
  const normCompany = normalizeCompanyName(company);
  const normTitle = cleanJobTitle(title);
  // Coarse location (e.g. 'remote', 'india', 'us', or 'general')
  const locRaw = (location || '').toLowerCase();
  let coarseLoc = 'general';
  if (locRaw.includes('remote')) coarseLoc = 'remote';
  else if (locRaw.includes('india') || locRaw.includes('bengaluru') || locRaw.includes('bangalore')) coarseLoc = 'india';
  else if (locRaw.includes('united states') || locRaw.includes('usa') || locRaw.includes('us')) coarseLoc = 'us';

  const rawSeed = `${normCompany}::${normTitle}::${coarseLoc}`;
  return crypto.createHash('sha256').update(rawSeed).digest('hex').substring(0, 16);
}

/**
 * Deduplicates job stream across multiple sources, preferring direct primary ATS over aggregators
 */
export function deduplicateJobs(jobs: DiscoveredJob[]): {
  uniqueJobs: DiscoveredJob[];
  duplicateCount: number;
  clusters: Record<string, DiscoveredJob[]>;
} {
  const clusters: Record<string, DiscoveredJob[]> = {};

  for (const job of jobs) {
    const key = job.dedupKey || generateDedupKey(job.company, job.title, job.location);
    if (!clusters[key]) {
      clusters[key] = [];
    }
    clusters[key].push(job);
  }

  const uniqueJobs: DiscoveredJob[] = [];
  let duplicateCount = 0;

  for (const [key, cluster] of Object.entries(clusters)) {
    if (cluster.length > 1) {
      duplicateCount += cluster.length - 1;
    }

    // Sort by confidence: primary ATS (0.95+) > direct company (0.9+) > marketplace (0.85)
    cluster.sort((a, b) => {
      const confA = a.sourceConfidence || (a.sourceCategory === 'ats' ? 0.95 : 0.85);
      const confB = b.sourceConfidence || (b.sourceCategory === 'ats' ? 0.95 : 0.85);
      return confB - confA;
    });

    const primaryJob = cluster[0];
    primaryJob.dedupKey = key;
    uniqueJobs.push(primaryJob);
  }

  return {
    uniqueJobs,
    duplicateCount,
    clusters,
  };
}

// Known HTML patterns indicating position has closed
const CLOSURE_PATTERNS = [
  /this position has been filled/i,
  /this job is no longer available/i,
  /applications are no longer being accepted/i,
  /the posting you are looking for has expired/i,
  /job closed/i,
  /position closed/i,
  /requisition has been closed/i,
  /404 not found/i,
  /page not found/i,
];

/**
 * Fast HTTP HEAD / lightweight GET freshness verification with SSRF and closure pattern detection
 */
export async function verifyJobFreshness(
  jobUrl: string,
  timeoutMs = 6000
): Promise<{
  isActive: boolean;
  reason: string;
  checkedAt: string;
  httpStatus?: number;
}> {
  const checkedAt = new Date().toISOString();

  if (!jobUrl || !isSafePublicUrl(jobUrl)) {
    return {
      isActive: false,
      reason: 'Invalid or blocked URL',
      checkedAt,
    };
  }

  try {
    // 1. Try HEAD first for minimal network overhead
    let resp = await fetch(jobUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'ApplyViseAI-FreshnessAuditor/2.0 (+https://applywise.ai/bot)',
        Accept: 'text/html,application/xhtml+xml,application/json,*/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });

    // If server disallows HEAD (405), fallback to minimal GET
    if (resp.status === 405) {
      resp = await fetch(jobUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'ApplyViseAI-FreshnessAuditor/2.0 (+https://applywise.ai/bot)',
          Range: 'bytes=0-8192', // Only fetch the first 8KB to inspect head/title
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
    }

    if (resp.status === 404 || resp.status === 410) {
      return {
        isActive: false,
        reason: `HTTP ${resp.status} (Position removed or expired)`,
        checkedAt,
        httpStatus: resp.status,
      };
    }

    if (resp.status >= 400) {
      return {
        isActive: false,
        reason: `HTTP ${resp.status}`,
        checkedAt,
        httpStatus: resp.status,
      };
    }

    // If 200 OK, check for soft 404s in the initial HTML body chunk if GET
    if (resp.headers.get('content-type')?.includes('text/html') && resp.body) {
      try {
        const textChunk = await resp.text();
        for (const pattern of CLOSURE_PATTERNS) {
          if (pattern.test(textChunk)) {
            return {
              isActive: false,
              reason: 'Listing displays closed or filled notification',
              checkedAt,
              httpStatus: 200,
            };
          }
        }
      } catch {
        // Body reading error is non-fatal for freshness if status was 200
      }
    }

    return {
      isActive: true,
      reason: 'HTTP 200 Verified Active',
      checkedAt,
      httpStatus: resp.status,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isActive: false,
      reason: `Verification probe failed: ${msg}`,
      checkedAt,
    };
  }
}
