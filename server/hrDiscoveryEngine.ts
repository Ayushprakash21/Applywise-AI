// server/hrDiscoveryEngine.ts
// Legally Compliant HR Contact Discovery & Verification Orchestrator for Node/Express
// Connects directly to GCDE (company_directory & live_jobs_cache), persistent discovery queue,
// ATS full detail fetchers, and official company career pages while respecting robots.txt, rate limits & SSRF.

import dns from 'node:dns';
import { authAndStore, sqlite } from './authAndStore.ts';
import { hrOutreachStore } from './hrOutreachStore.ts';
import { hrDiscoveryQueueStore } from './hrDiscoveryQueueStore.ts';
import {
  extractPublicHrContactsWithDiagnostics,
  ExtractedHrContactCandidate,
  HR_DISCOVERY_SOURCES,
} from '../src/utils/hrContactDiscovery.ts';
import {
  MxResolverFn,
  runEmailVerificationPipeline,
} from '../src/utils/hrEmailVerification.ts';
import { extractPlainTextForMatching, fetchAtsFullJobDetail } from '../worker/jobConnectors.ts';
import { safeFetchJobPage, validateSafePublicUrl } from './jobImportEngine.ts';
import {
  ContactDiscoveryRun,
  DiscoveryDiagnosticCategory,
  HrContact,
  HrContactDiscoveryRunRecord,
} from '../src/types/index.ts';

/**
 * Node.js authoritative MX resolver using node:dns
 */
export const nodeMxResolver: MxResolverFn = async (domain: string) => {
  try {
    const records = await dns.promises.resolveMx(domain);
    const hosts = (records || [])
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange)
      .filter(Boolean);
    return { ok: hosts.length > 0, hosts };
  } catch (err: unknown) {
    const code = (err as any)?.code;
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      return { ok: false, hosts: [], error: `NXDOMAIN / No MX records (${code})` };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, hosts: [], error: msg };
  }
};

// In-process per-domain rate limit & robots.txt cache
const domainCooldownMap = new Map<string, number>();
const robotsDisallowCache = new Map<string, { checkedAt: number; disallowedPrefixes: string[] }>();
const DEFAULT_DOMAIN_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per domain
const ROBOTS_CACHE_TTL_MS = 60 * 60 * 1000;

export function deriveSourceJobId(jobId: string, source: string): string {
  const s = (source || '').toLowerCase();
  if (s.startsWith('greenhouse_')) {
    const token = s.replace(/^greenhouse_/, '');
    const prefix = `gh_${token}_`;
    if (jobId.startsWith(prefix)) return jobId.slice(prefix.length);
  }
  for (const [srcPrefix, idPrefix] of [
    ['lever_', 'lever_'],
    ['workable_', 'workable_'],
    ['smartrec_', 'smartrec_'],
    ['ashby_', 'ashby_'],
    ['recruitee_', 'recruitee_'],
  ] as const) {
    if (s.startsWith(srcPrefix)) {
      const handle = s.slice(srcPrefix.length);
      const fullPrefix = `${idPrefix}${handle}_`;
      if (jobId.startsWith(fullPrefix)) return jobId.slice(fullPrefix.length);
    }
  }
  const parts = jobId.split('_');
  return parts.length > 1 ? parts[parts.length - 1] : jobId;
}

function isPlaceholderDescription(source: string, description: string): boolean {
  const trimmed = (description || '').trim();
  if (trimmed.length < 180) return true;
  const s = (source || '').toLowerCase();
  if (s.startsWith('greenhouse_') && trimmed.includes('Open role at ') && trimmed.includes('Location:')) return true;
  if (s.startsWith('smartrec_') && trimmed.includes('Role at ') && trimmed.includes('Ref:')) return true;
  return false;
}

async function checkRobotsTxtAllows(targetUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(targetUrl);
    const origin = parsed.origin;
    const cached = robotsDisallowCache.get(origin);
    let prefixes: string[] = [];

    if (cached && Date.now() - cached.checkedAt < ROBOTS_CACHE_TTL_MS) {
      prefixes = cached.disallowedPrefixes;
    } else {
      const robotsUrl = `${origin}/robots.txt`;
      const safety = await validateSafePublicUrl(robotsUrl);
      if (!safety.safe) return false;
      const res = await fetch(safety.canonicalUrl, {
        headers: { 'User-Agent': 'ApplyViseAI-HRDiscovery/2.0' },
        signal: AbortSignal.timeout(3500),
      }).catch(() => null);
      if (res && res.ok) {
        const text = await res.text();
        let inWildcardOrSelf = false;
        for (const rawLine of text.split(/\r?\n/)) {
          const line = rawLine.split('#')[0].trim();
          if (!line) continue;
          const [key, ...rest] = line.split(':');
          const val = rest.join(':').trim();
          if (key.toLowerCase() === 'user-agent') {
            inWildcardOrSelf = val === '*' || val.toLowerCase().includes('applyvise');
          } else if (inWildcardOrSelf && key.toLowerCase() === 'disallow' && val) {
            prefixes.push(val);
          }
        }
      }
      robotsDisallowCache.set(origin, { checkedAt: Date.now(), disallowedPrefixes: prefixes });
    }

    const reqPath = parsed.pathname || '/';
    return !prefixes.some((disallowed) => disallowed === '/' || reqPath.startsWith(disallowed));
  } catch {
    return true;
  }
}

function isUnsupportedPortalUrl(url: string): boolean {
  const lower = (url || '').toLowerCase();
  return (
    lower.includes('linkedin.com/jobs') ||
    lower.includes('indeed.com') ||
    lower.includes('glassdoor.com') ||
    lower.includes('naukri.com') ||
    lower.includes('myworkdayjobs.com')
  );
}

/**
 * Processes persistent discovery queue items in bounded batches, fetching full ATS details
 * or official employer /careers pages where permitted, verifying syntax + DNS + MX, and saving job links.
 */
export async function processHrDiscoveryQueueBatch(params: {
  triggeredBy: string;
  triggerType?: HrContactDiscoveryRunRecord['triggerType'];
  batchLimit?: number;
  fetchBudget?: number;
  jobId?: string;
  companyName?: string;
  forceRefresh?: boolean;
}): Promise<{
  run: HrContactDiscoveryRunRecord;
  discoveredContacts: HrContact[];
  sourcesChecked: Array<{ source: string; status: string; found: number; note?: string }>;
}> {
  hrDiscoveryQueueStore.syncJobsToDiscoveryQueue({
    jobIds: params.jobId ? [params.jobId] : undefined,
    limit: Math.max(200, params.batchLimit || 500),
  });

  const detailedRun = hrDiscoveryQueueStore.createDetailedRun({
    triggeredBy: params.triggeredBy,
    triggerType: params.triggerType || 'manual',
  });

  const batch = hrDiscoveryQueueStore.fetchPendingQueueBatch({
    limit: params.batchLimit || 60,
    jobId: params.jobId,
    companyName: params.companyName,
  });

  const maxExternalFetches = params.fetchBudget ?? 10;
  let externalFetchesUsed = 0;

  let jobsScanned = 0;
  let descriptionsInspected = 0;
  let companyPagesInspected = 0;
  let emailsExtracted = 0;
  let validSyntaxCount = 0;
  let domainsValidatedCount = 0;
  let mxValidatedCount = 0;
  let sourceConfirmedCount = 0;
  let duplicatesSkipped = 0;
  let invalidRejected = 0;
  let sourcesFailing = 0;

  const sourceBreakdown: Record<string, { scanned: number; extracted: number; accepted: number; failed: number }> = {};
  const sourcesChecked: Array<{ source: string; status: string; found: number; note?: string }> = [];
  const savedContacts: HrContact[] = [];
  const seenEmailsInRun = new Set<string>();

  for (const item of batch) {
    jobsScanned++;
    const { queueItem, job } = item;
    const srcBucket = (sourceBreakdown[job.source] = sourceBreakdown[job.source] || {
      scanned: 0,
      extracted: 0,
      accepted: 0,
      failed: 0,
    });
    srcBucket.scanned++;

    try {
      if (isUnsupportedPortalUrl(job.url) && !job.description) {
        hrDiscoveryQueueStore.markQueueItemResult({
          queueId: queueItem.id,
          status: 'unsupported_source',
          diagnosticCategory: 'source_not_supported',
          failureReason: 'Restricted job portal blocks automated scraping (linking-only mode).',
          emailsExtracted: 0,
          emailsAccepted: 0,
        });
        continue;
      }

      let combinedText = `${job.title}\n${job.description || ''}`;
      let detailUrl = job.url;
      let detailFetchFailed = false;

      if (job.description) {
        descriptionsInspected++;
      }

      // Fetch full un-truncated ATS job description if placeholder/short and fetch budget allows
      const canFetchDetail =
        externalFetchesUsed < maxExternalFetches &&
        isPlaceholderDescription(job.source, job.description) &&
        (job.source.startsWith('greenhouse_') ||
          job.source.startsWith('smartrec_') ||
          job.source.startsWith('lever_') ||
          job.source.startsWith('workable_'));

      if (canFetchDetail) {
        externalFetchesUsed++;
        const sourceJobId = deriveSourceJobId(job.id, job.source);
        const detailRes = await fetchAtsFullJobDetail({
          source: job.source,
          sourceJobId,
          jobUrl: job.url,
        });
        if (detailRes.ok && detailRes.rawHtmlOrText) {
          const cleanDetail = extractPlainTextForMatching(detailRes.rawHtmlOrText).slice(0, 12000);
          combinedText = `${job.title}\n${cleanDetail}`;
          detailUrl = detailRes.sourceUrl || job.url;
          descriptionsInspected++;
          if (cleanDetail.length > (job.description || '').length) {
            sqlite.prepare('UPDATE live_jobs_cache SET description = ? WHERE id = ?').run(cleanDetail, job.id);
          }
        } else if (!detailRes.ok) {
          detailFetchFailed = true;
          sourcesFailing++;
          srcBucket.failed++;
        }
      }

      let companyDomain = '';
      if (job.companyWebsite) {
        try {
          companyDomain = new URL(job.companyWebsite).hostname.replace(/^www\./, '');
        } catch {
          companyDomain = '';
        }
      } else if (job.url) {
        try {
          const u = new URL(job.url).hostname.replace(/^www\./, '');
          if (!/(greenhouse|lever|ashbyhq|workable|smartrecruiters|remotive|arbeitnow|jobicy|recruitee)\./i.test(u)) {
            companyDomain = u;
          }
        } catch {
          companyDomain = '';
        }
      }

      const extractionDiag = extractPublicHrContactsWithDiagnostics({
        text: combinedText,
        companyName: job.company,
        companyId: job.companyId,
        country: job.country || 'Global',
        city: job.location,
        companyWebsite: job.companyWebsite || detailUrl,
        companyDomain,
        sourceType: `gcde_${job.source || 'job_board'}`,
        sourceName: `GCDE Job Posting (${job.source || 'verified_feed'})`,
        sourceUrl: detailUrl || job.url,
        jobId: job.id,
        linkType: 'direct_posting',
      });

      const candidates: ExtractedHrContactCandidate[] = [...extractionDiag.candidates];
      let rejectedForItem = extractionDiag.rejectedCount;
      let pageFetchFailed = false;

      // Fallback to Official Company Career/Contact pages when job description published no HR email
      if (candidates.length === 0 && (job.careersUrl || job.companyWebsite) && externalFetchesUsed < maxExternalFetches) {
        const candidateUrls = Array.from(
          new Set(
            [
              job.careersUrl,
              job.companyWebsite ? `${job.companyWebsite.replace(/\/$/, '')}/careers` : undefined,
              job.companyWebsite ? `${job.companyWebsite.replace(/\/$/, '')}/contact` : undefined,
            ].filter((u): u is string => Boolean(u))
          )
        ).slice(0, 2);

        for (const pageUrl of candidateUrls) {
          const safety = await validateSafePublicUrl(pageUrl);
          if (!safety.safe) continue;
          const lastHit = domainCooldownMap.get(safety.sourceDomain) || 0;
          if (!params.forceRefresh && Date.now() - lastHit < DEFAULT_DOMAIN_COOLDOWN_MS) continue;
          const robotsAllowed = await checkRobotsTxtAllows(safety.canonicalUrl);
          if (!robotsAllowed) continue;

          externalFetchesUsed++;
          companyPagesInspected++;
          domainCooldownMap.set(safety.sourceDomain, Date.now());
          const pageRes = await safeFetchJobPage(safety.canonicalUrl, 2);
          if (!pageRes.ok) {
            pageFetchFailed = true;
            continue;
          }
          const pageDiag = extractPublicHrContactsWithDiagnostics({
            text: pageRes.html,
            companyName: job.company,
            companyId: job.companyId,
            country: job.country || 'Global',
            companyWebsite: job.companyWebsite || safety.canonicalUrl,
            companyDomain: safety.sourceDomain,
            sourceType: 'official_company_careers',
            sourceName: `${job.company} Official Careers Page`,
            sourceUrl: pageRes.finalUrl || safety.canonicalUrl,
            jobId: job.id,
            linkType: 'recruitment_page',
          });
          candidates.push(...pageDiag.candidates);
          rejectedForItem += pageDiag.rejectedCount;
          if (candidates.length > 0) break;
        }
      }

      emailsExtracted += candidates.length;
      invalidRejected += rejectedForItem;
      srcBucket.extracted += candidates.length;

      let acceptedForItem = 0;
      for (const cand of candidates) {
        if (seenEmailsInRun.has(cand.email)) {
          duplicatesSkipped++;
          acceptedForItem++;
          continue;
        }
        seenEmailsInRun.add(cand.email);

        const verification = await runEmailVerificationPipeline(
          {
            email: cand.email,
            sourceUrl: cand.sourceUrl,
            evidence: cand.evidence,
          },
          nodeMxResolver
        );

        if (verification.levels.level1SyntaxValid) validSyntaxCount++;
        if (verification.levels.level2DomainExists) domainsValidatedCount++;
        if (verification.levels.level3MxAvailable) mxValidatedCount++;
        if (verification.levels.level4SourceEvidenceConfirmed) sourceConfirmedCount++;

        if (verification.status === 'Invalid') {
          invalidRejected++;
          continue;
        }

        const { contact, created } = hrOutreachStore.upsertHrContact({
          companyId: cand.companyId,
          companyName: cand.companyName,
          companyWebsite: cand.companyWebsite,
          contactName: cand.contactName,
          designation: cand.designation,
          roleCategory: cand.roleCategory,
          contactType: cand.contactType,
          email: cand.email,
          country: cand.country,
          city: cand.city,
          department: cand.department,
          sourceType: cand.sourceType,
          sourceName: cand.sourceName,
          sourceUrl: cand.sourceUrl,
          associatedJobId: job.id,
          associatedJobIds: cand.associatedJobIds,
          linkType: cand.linkType || 'direct_posting',
          emailVerificationStatus: verification.status,
          verificationLevels: verification.levels,
          mxHosts: verification.mxHosts,
          contactConfidence: cand.confidence,
          evidence: cand.evidence,
          sourceEvidence: cand.evidence,
          isRoleBased: verification.isRoleBased,
          lastVerifiedAt: verification.checkedAt,
        });

        if (!created) duplicatesSkipped++;
        acceptedForItem++;
        srcBucket.accepted++;
        savedContacts.push(contact);
      }

      if (acceptedForItem > 0) {
        hrDiscoveryQueueStore.markQueueItemResult({
          queueId: queueItem.id,
          status: 'completed',
          diagnosticCategory: 'contacts_extracted',
          emailsExtracted: candidates.length,
          emailsAccepted: acceptedForItem,
        });
      } else {
        const diag: DiscoveryDiagnosticCategory = detailFetchFailed
          ? 'description_unavailable'
          : pageFetchFailed
          ? 'company_page_unavailable'
          : (job.description || '').trim().length === 0
          ? 'description_unavailable'
          : 'no_contacts_published';

        hrDiscoveryQueueStore.markQueueItemResult({
          queueId: queueItem.id,
          status: detailFetchFailed ? 'failed' : 'no_contact_found',
          diagnosticCategory: diag,
          failureReason:
            diag === 'description_unavailable'
              ? 'Full job description could not be retrieved from upstream source.'
              : diag === 'company_page_unavailable'
              ? 'Company careers/contact page could not be fetched or returned non-200 status.'
              : 'Employer published job without a direct HR/recruitment email address.',
          emailsExtracted: candidates.length,
          emailsAccepted: 0,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sourcesFailing++;
      srcBucket.failed++;
      hrDiscoveryQueueStore.markQueueItemResult({
        queueId: queueItem.id,
        status: 'failed',
        diagnosticCategory: 'extraction_failed',
        failureReason: msg,
        emailsExtracted: 0,
        emailsAccepted: 0,
      });
    }
  }

  sourcesChecked.push({
    source: 'GCDE Discovery Queue',
    status: 'scanned',
    found: savedContacts.length,
    note: `Scanned ${jobsScanned} queued jobs (${descriptionsInspected} descriptions, ${companyPagesInspected} company pages).`,
  });

  const finishedRun =
    hrDiscoveryQueueStore.updateDetailedRun(detailedRun.id, {
      status: sourcesFailing > 0 && savedContacts.length === 0 && jobsScanned > 0 ? 'partial' : 'completed',
      jobsScanned,
      descriptionsInspected,
      companyPagesInspected,
      emailsExtracted,
      validSyntaxCount,
      domainsValidatedCount,
      mxValidatedCount,
      sourceConfirmedCount,
      duplicatesSkipped,
      invalidRejected,
      sourcesFailing,
      sourceBreakdown,
      completedAt: new Date().toISOString(),
    }) || detailedRun;

  return { run: finishedRun, discoveredContacts: savedContacts, sourcesChecked };
}

export async function discoverAndPersistHrContacts(params: {
  triggeredBy: string;
  companyName?: string;
  companyWebsite?: string;
  jobId?: string;
  userId?: string;
  forceRefresh?: boolean;
  htmlOverride?: string; // Used in tests or user-supplied public page content
}): Promise<{
  run: ContactDiscoveryRun;
  discoveredContacts: HrContact[];
  unavailableReason?: string;
  sourcesChecked: Array<{ source: string; status: string; found: number; note?: string }>;
}> {
  const run = hrOutreachStore.createDiscoveryRun({
    triggeredBy: params.triggeredBy,
    companyName: params.companyName,
    jobId: params.jobId,
    status: 'running',
  });

  const detailedRun = hrDiscoveryQueueStore.createDetailedRun({
    triggeredBy: params.triggeredBy,
    triggerType: 'manual',
  });

  const sourcesChecked: Array<{ source: string; status: string; found: number; note?: string }> = [];
  const savedContacts: HrContact[] = [];
  let sourcesScanned = 0;
  let descriptionsInspected = 0;
  let companyPagesInspected = 0;
  let emailsExtracted = 0;
  let validSyntaxCount = 0;
  let domainsValidatedCount = 0;
  let mxValidatedCount = 0;
  let sourceConfirmedCount = 0;
  let duplicatesSkipped = 0;
  let invalidRejected = 0;
  let verifiedCount = 0;

  try {
    const candidates: ExtractedHrContactCandidate[] = [];

    // 1. Inspect matching GCDE jobs in live_jobs_cache / cached_vacancies (including full descriptions)
    const targetJobs: Array<{
      id: string;
      company: string;
      title: string;
      country: string;
      location: string;
      url: string;
      description: string;
      source: string;
    }> = [];

    if (params.jobId) {
      const lj = sqlite.prepare('SELECT * FROM live_jobs_cache WHERE id = ?').get(params.jobId) as any;
      if (lj) {
        targetJobs.push(lj);
      } else {
        const cv = sqlite.prepare('SELECT * FROM cached_vacancies WHERE id = ?').get(params.jobId) as any;
        if (cv) {
          let desc = '';
          try {
            desc = JSON.parse(cv.data || '{}')?.description || '';
          } catch {
            desc = '';
          }
          targetJobs.push({
            id: cv.id,
            company: cv.company,
            title: cv.title,
            country: 'Global',
            location: cv.location,
            url: cv.url,
            description: desc,
            source: cv.source || 'gcde_cache',
          });
        }
      }
    } else if (params.companyName) {
      const ljRows = sqlite
        .prepare('SELECT * FROM live_jobs_cache WHERE LOWER(company) LIKE ? ORDER BY retrieved_at DESC LIMIT 30')
        .all(`%${params.companyName.toLowerCase()}%`) as any[];
      targetJobs.push(...ljRows);
    } else {
      // Prioritize descriptions containing published emails / contact indicators first, then freshest active jobs
      const ljRows = sqlite
        .prepare(
          `SELECT * FROM live_jobs_cache
           WHERE is_active = 1
           ORDER BY
             CASE WHEN description LIKE '%@%' OR description LIKE '%mailto:%' OR description LIKE '%[at]%' THEN 0 ELSE 1 END,
             retrieved_at DESC
           LIMIT 75`
        )
        .all() as any[];
      targetJobs.push(...ljRows);
    }

    // Sync these into the persistent queue for observability
    hrDiscoveryQueueStore.syncJobsToDiscoveryQueue({
      jobIds: targetJobs.map((j) => j.id),
    });

    // Extract any explicit HR contacts published inside GCDE job postings (with ATS detail fallback for stubs)
    if (targetJobs.length > 0 && !params.htmlOverride) {
      sourcesScanned++;
      let foundInJobs = 0;
      let detailFetches = 0;

      for (const job of targetJobs) {
        let fullText = `${job.title}\n${job.description || ''}`;
        let jobSourceUrl = job.url;

        if (isPlaceholderDescription(job.source, job.description) && detailFetches < 5) {
          detailFetches++;
          const detail = await fetchAtsFullJobDetail({
            source: job.source,
            sourceJobId: deriveSourceJobId(job.id, job.source),
            jobUrl: job.url,
          });
          if (detail.ok && detail.rawHtmlOrText) {
            const clean = extractPlainTextForMatching(detail.rawHtmlOrText).slice(0, 12000);
            fullText = `${job.title}\n${clean}`;
            jobSourceUrl = detail.sourceUrl || job.url;
            sqlite.prepare('UPDATE live_jobs_cache SET description = ? WHERE id = ?').run(clean, job.id);
          }
        }

        descriptionsInspected++;
        let domain = '';
        try {
          const u = new URL(jobSourceUrl).hostname.replace(/^www\./, '');
          if (!/(greenhouse|lever|ashbyhq|workable|smartrecruiters|remotive|arbeitnow|jobicy|recruitee)\./i.test(u)) {
            domain = u;
          }
        } catch {
          domain = '';
        }

        const diag = extractPublicHrContactsWithDiagnostics({
          text: fullText,
          companyName: job.company,
          country: job.country || 'Global',
          city: job.location,
          companyWebsite: jobSourceUrl,
          companyDomain: domain,
          sourceType: `gcde_${job.source || 'job_board'}`,
          sourceName: `GCDE Job Posting (${job.source || 'verified_feed'})`,
          sourceUrl: jobSourceUrl,
          jobId: job.id,
          linkType: 'direct_posting',
        });

        foundInJobs += diag.candidates.length;
        invalidRejected += diag.rejectedCount;
        candidates.push(...diag.candidates);
      }

      sourcesChecked.push({
        source: 'GCDE Active Job Descriptions',
        status: 'scanned',
        found: foundInJobs,
        note: `Inspected ${targetJobs.length} cached GCDE job descriptions.`,
      });
    }

    // 2. Inspect matched companies from GCDE company_directory or explicit companyWebsite
    const companyTargets: Array<{
      id?: string;
      name: string;
      domain: string;
      careersUrl: string;
      country: string;
    }> = [];

    if (params.companyWebsite) {
      const safety = await validateSafePublicUrl(params.companyWebsite);
      if (!safety.safe) {
        sourcesChecked.push({
          source: params.companyWebsite,
          status: 'blocked_ssrf',
          found: 0,
          note: safety.error || 'Blocked by SSRF safety validation.',
        });
      } else {
        companyTargets.push({
          name: params.companyName || safety.sourceDomain,
          domain: safety.sourceDomain,
          careersUrl: safety.canonicalUrl,
          country: 'Global',
        });
      }
    }

    const dirRows = params.companyName
      ? (sqlite
          .prepare('SELECT * FROM company_directory WHERE LOWER(name) LIKE ? LIMIT 5')
          .all(`%${params.companyName.toLowerCase()}%`) as any[])
      : params.jobId && targetJobs[0]
      ? (sqlite
          .prepare('SELECT * FROM company_directory WHERE LOWER(name) = LOWER(?) LIMIT 3')
          .all(targetJobs[0].company) as any[])
      : [];

    for (const d of dirRows) {
      if (!companyTargets.some((t) => t.domain === d.domain)) {
        companyTargets.push({
          id: d.id,
          name: d.name,
          domain: d.domain,
          careersUrl: d.careers_url,
          country: d.country || 'Global',
        });
      }
    }

    // Inspect public career pages (bounded concurrency + robots.txt + cooldown + SSRF validation)
    for (const comp of companyTargets.slice(0, 3)) {
      if (params.htmlOverride) {
        sourcesScanned++;
        companyPagesInspected++;
        const diag = extractPublicHrContactsWithDiagnostics({
          text: params.htmlOverride,
          companyName: comp.name,
          companyId: comp.id,
          companyWebsite: comp.careersUrl,
          companyDomain: comp.domain,
          country: comp.country,
          sourceType: 'official_company_careers',
          sourceName: `${comp.name} Official Careers Page`,
          sourceUrl: comp.careersUrl,
          jobId: params.jobId,
          linkType: params.jobId ? 'direct_posting' : 'recruitment_page',
        });
        candidates.push(...diag.candidates);
        invalidRejected += diag.rejectedCount;
        sourcesChecked.push({
          source: comp.careersUrl,
          status: 'scanned',
          found: diag.candidates.length,
        });
        continue;
      }

      const lastHit = domainCooldownMap.get(comp.domain) || 0;
      if (!params.forceRefresh && Date.now() - lastHit < DEFAULT_DOMAIN_COOLDOWN_MS) {
        sourcesChecked.push({
          source: comp.careersUrl,
          status: 'rate_limited_cached',
          found: 0,
          note: 'Skipped live fetch due to per-domain politeness cooldown; reusing cached intelligence.',
        });
        continue;
      }

      const robotsAllowed = await checkRobotsTxtAllows(comp.careersUrl);
      if (!robotsAllowed) {
        sourcesChecked.push({
          source: comp.careersUrl,
          status: 'robots_disallowed',
          found: 0,
          note: 'Blocked by employer robots.txt policy.',
        });
        continue;
      }

      sourcesScanned++;
      companyPagesInspected++;
      domainCooldownMap.set(comp.domain, Date.now());
      const pageRes = await safeFetchJobPage(comp.careersUrl, 2);
      if (!pageRes.ok) {
        sourcesChecked.push({
          source: comp.careersUrl,
          status: pageRes.blocked ? 'restricted_or_blocked' : 'unavailable',
          found: 0,
          note: pageRes.error || `HTTP ${pageRes.statusCode}`,
        });
        continue;
      }

      const diag = extractPublicHrContactsWithDiagnostics({
        text: pageRes.html,
        companyName: comp.name,
        companyId: comp.id,
        companyWebsite: comp.careersUrl,
        companyDomain: comp.domain,
        country: comp.country,
        sourceType: 'official_company_careers',
        sourceName: `${comp.name} Official Careers Page`,
        sourceUrl: pageRes.finalUrl || comp.careersUrl,
        jobId: params.jobId,
        linkType: 'recruitment_page',
      });
      candidates.push(...diag.candidates);
      invalidRejected += diag.rejectedCount;
      sourcesChecked.push({
        source: comp.careersUrl,
        status: 'scanned',
        found: diag.candidates.length,
        note: diag.candidates.length === 0 ? 'Careers page uses online application forms and exposes no public HR email.' : undefined,
      });
    }

    emailsExtracted = candidates.length;

    // 3. Verify & persist all extracted candidates (never fabricating when empty!)
    const seenInRun = new Set<string>();
    for (const cand of candidates) {
      if (seenInRun.has(cand.email)) {
        duplicatesSkipped++;
        continue;
      }
      seenInRun.add(cand.email);

      const verification = await runEmailVerificationPipeline(
        {
          email: cand.email,
          sourceUrl: cand.sourceUrl,
          evidence: cand.evidence,
        },
        nodeMxResolver
      );

      if (verification.levels.level1SyntaxValid) validSyntaxCount++;
      if (verification.levels.level2DomainExists) domainsValidatedCount++;
      if (verification.levels.level3MxAvailable) mxValidatedCount++;
      if (verification.levels.level4SourceEvidenceConfirmed) sourceConfirmedCount++;

      if (verification.status === 'Invalid') {
        invalidRejected++;
        continue;
      }
      if (verification.mxValid) {
        verifiedCount++;
      }

      const { contact, created } = hrOutreachStore.upsertHrContact({
        companyId: cand.companyId,
        companyName: cand.companyName,
        companyWebsite: cand.companyWebsite,
        contactName: cand.contactName,
        designation: cand.designation,
        roleCategory: cand.roleCategory,
        contactType: cand.contactType,
        email: cand.email,
        country: cand.country,
        city: cand.city,
        department: cand.department,
        sourceType: cand.sourceType,
        sourceName: cand.sourceName,
        sourceUrl: cand.sourceUrl,
        associatedJobId: cand.associatedJobIds[0],
        associatedJobIds: cand.associatedJobIds,
        linkType: cand.linkType || 'direct_posting',
        emailVerificationStatus: verification.status,
        verificationLevels: verification.levels,
        mxHosts: verification.mxHosts,
        contactConfidence: cand.confidence,
        evidence: cand.evidence,
        sourceEvidence: cand.evidence,
        isRoleBased: verification.isRoleBased,
        lastVerifiedAt: verification.checkedAt,
      });

      if (!created) duplicatesSkipped++;
      savedContacts.push(contact);
    }

    const unavailableReason =
      savedContacts.length === 0
        ? `No public HR email address was exposed by the checked official sources${params.companyName ? ` for "${params.companyName}"` : ''}. Many employers and ATS boards (e.g. Workday, Greenhouse, LinkedIn, Indeed) accept applications via web forms only and intentionally withhold direct recruiter email addresses.`
        : undefined;

    hrOutreachStore.updateDiscoveryRun(run.id, {
      status: 'completed',
      sourcesScanned,
      contactsDiscovered: savedContacts.length,
      contactsVerified: verifiedCount,
      duplicatesSkipped,
      checkpoint: params.companyName || params.jobId || 'gcde_batch',
      completedAt: new Date().toISOString(),
    });

    hrDiscoveryQueueStore.updateDetailedRun(detailedRun.id, {
      status: 'completed',
      jobsScanned: targetJobs.length,
      descriptionsInspected,
      companyPagesInspected,
      emailsExtracted,
      validSyntaxCount,
      domainsValidatedCount,
      mxValidatedCount,
      sourceConfirmedCount,
      duplicatesSkipped,
      invalidRejected,
      sourcesFailing: 0,
      completedAt: new Date().toISOString(),
    });

    if (params.userId) {
      authAndStore.addAuditLog(
        params.userId,
        'User manual',
        'HR_CONTACT_DISCOVERY_RUN',
        params.companyName || params.jobId || 'GCDE Discovery',
        `Scanned ${sourcesScanned} sources; persisted ${savedContacts.length} public contacts (${duplicatesSkipped} duplicates merged).`
      );
    }

    return {
      run: hrOutreachStore.getDiscoveryRunById(run.id)!,
      discoveredContacts: savedContacts,
      unavailableReason,
      sourcesChecked,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    hrOutreachStore.updateDiscoveryRun(run.id, {
      status: run.retryCount >= 2 ? 'dead_letter' : 'failed',
      retryCount: run.retryCount + 1,
      errorMessage: msg,
      completedAt: new Date().toISOString(),
    });
    hrDiscoveryQueueStore.updateDetailedRun(detailedRun.id, {
      status: 'failed',
      errorSummary: msg,
      completedAt: new Date().toISOString(),
    });
    return {
      run: hrOutreachStore.getDiscoveryRunById(run.id)!,
      discoveredContacts: savedContacts,
      unavailableReason: msg,
      sourcesChecked,
    };
  }
}

/**
 * Revalidates stale or unverified HR contacts (oldest or older than 14 days).
 */
export async function revalidateStaleContacts(limit = 35): Promise<{
  checked: number;
  stillValid: number;
  markedStaleOrFailed: number;
}> {
  const staleCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const rows = sqlite
    .prepare(
      `SELECT * FROM hr_contacts
       WHERE contact_status != 'archived'
         AND (last_verified_at IS NULL OR last_verified_at < ? OR email_verification_status IN ('Unverified', 'Verification Failed', 'Stale'))
       ORDER BY COALESCE(last_verified_at, '1970-01-01') ASC
       LIMIT ?`
    )
    .all(staleCutoff, Math.min(100, Math.max(1, limit))) as any[];

  let checked = 0;
  let stillValid = 0;
  let markedStaleOrFailed = 0;

  for (const row of rows) {
    checked++;
    const verification = await runEmailVerificationPipeline(
      {
        email: row.email,
        sourceUrl: row.source_url,
        evidence: row.source_evidence || row.evidence,
        lastVerifiedAt: row.last_verified_at,
      },
      nodeMxResolver
    );

    const nextStatus = verification.status;

    hrOutreachStore.updateHrContactVerification(row.id, nextStatus, verification.isRoleBased, verification.checkedAt, {
      verificationLevels: verification.levels,
      mxHosts: verification.mxHosts,
      evidence: row.source_evidence || row.evidence,
    });

    if (
      nextStatus === 'Source Confirmed' ||
      nextStatus === 'MX Valid' ||
      nextStatus === 'Mailbox Verified' ||
      nextStatus === 'Verified'
    ) {
      stillValid++;
    } else {
      markedStaleOrFailed++;
    }
  }

  return { checked, stillValid, markedStaleOrFailed };
}

export function getHrDiscoverySourceRegistry() {
  return HR_DISCOVERY_SOURCES;
}
