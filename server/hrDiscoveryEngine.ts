// server/hrDiscoveryEngine.ts
// Legally Compliant HR Contact Discovery & Verification Orchestrator for Node/Express
// Connects directly to GCDE (company_directory & live_jobs_cache), respects rate limits & SSRF boundaries.

import dns from 'node:dns';
import { authAndStore, sqlite } from './authAndStore.ts';
import { hrOutreachStore } from './hrOutreachStore.ts';
import {
  extractPublicHrContactsFromText,
  ExtractedHrContactCandidate,
  HR_DISCOVERY_SOURCES,
} from '../src/utils/hrContactDiscovery.ts';
import {
  MxResolverFn,
  runEmailVerificationPipeline,
} from '../src/utils/hrEmailVerification.ts';
import { safeFetchJobPage, validateSafePublicUrl } from './jobImportEngine.ts';
import { ContactDiscoveryRun, HrContact } from '../src/types/index.ts';

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

// In-process per-domain rate limit cache to prevent hammering employer sites
const domainCooldownMap = new Map<string, number>();
const DEFAULT_DOMAIN_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per domain

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

  const sourcesChecked: Array<{ source: string; status: string; found: number; note?: string }> = [];
  const savedContacts: HrContact[] = [];
  let sourcesScanned = 0;
  let duplicatesSkipped = 0;
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
        .prepare('SELECT * FROM live_jobs_cache WHERE LOWER(company) LIKE ? LIMIT 15')
        .all(`%${params.companyName.toLowerCase()}%`) as any[];
      targetJobs.push(...ljRows);
    } else {
      // Incremental sweep over top active GCDE jobs (bounded concurrency/count)
      const ljRows = sqlite
        .prepare('SELECT * FROM live_jobs_cache WHERE is_active = 1 ORDER BY retrieved_at DESC LIMIT 15')
        .all() as any[];
      targetJobs.push(...ljRows);
    }

    // Extract any explicit HR contacts published inside GCDE job postings
    if (targetJobs.length > 0) {
      sourcesScanned++;
      let foundInJobs = 0;
      for (const job of targetJobs) {
        let domain = '';
        try {
          domain = new URL(job.url).hostname.replace(/^www\./, '');
        } catch {
          domain = '';
        }
        const extracted = extractPublicHrContactsFromText({
          text: `${job.title}\n${job.description}`,
          companyName: job.company,
          country: job.country || 'Global',
          city: job.location,
          companyWebsite: job.url,
          companyDomain: domain,
          sourceType: `gcde_${job.source || 'job_board'}`,
          sourceName: `GCDE Job Posting (${job.source || 'verified_feed'})`,
          sourceUrl: job.url,
          jobId: job.id,
        });
        foundInJobs += extracted.length;
        candidates.push(...extracted);
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

    // Inspect public career pages (bounded concurrency: sequential small batch with cooldown + SSRF validation)
    for (const comp of companyTargets.slice(0, 3)) {
      if (params.htmlOverride) {
        sourcesScanned++;
        const extracted = extractPublicHrContactsFromText({
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
        });
        candidates.push(...extracted);
        sourcesChecked.push({
          source: comp.careersUrl,
          status: 'scanned',
          found: extracted.length,
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

      sourcesScanned++;
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

      const extracted = extractPublicHrContactsFromText({
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
      });
      candidates.push(...extracted);
      sourcesChecked.push({
        source: comp.careersUrl,
        status: 'scanned',
        found: extracted.length,
        note: extracted.length === 0 ? 'Careers page uses online application forms and exposes no public HR email.' : undefined,
      });
    }

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

      // Only count valid MX / Domain Valid / Role-Based / Verified
      if (verification.status === 'Invalid') {
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
        email: cand.email,
        country: cand.country,
        city: cand.city,
        department: cand.department,
        sourceType: cand.sourceType,
        sourceName: cand.sourceName,
        sourceUrl: cand.sourceUrl,
        associatedJobIds: cand.associatedJobIds,
        emailVerificationStatus: verification.status,
        contactConfidence: cand.confidence,
        evidence: cand.evidence,
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
    return {
      run: hrOutreachStore.getDiscoveryRunById(run.id)!,
      discoveredContacts: savedContacts,
      unavailableReason: msg,
      sourcesChecked,
    };
  }
}

export function getHrDiscoverySourceRegistry() {
  return HR_DISCOVERY_SOURCES;
}
