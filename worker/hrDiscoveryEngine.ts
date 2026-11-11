// worker/hrDiscoveryEngine.ts
// Cloudflare Worker + D1 Legally Compliant HR Contact Discovery & Verification Engine
// Parity with server/hrDiscoveryEngine.ts, engineered to respect Worker subrequest budgets.

import { WorkerHrOutreachStore } from './hrOutreachStore.ts';
import { WorkerHrDiscoveryQueueStore } from './hrDiscoveryQueueStore.ts';
import { extractPlainTextForMatching, fetchAtsFullJobDetail, isSafePublicUrl } from './jobConnectors.ts';
import {
  extractPublicHrContactsWithDiagnostics,
  ExtractedHrContactCandidate,
} from '../src/utils/hrContactDiscovery.ts';
import { dohMxResolver, runEmailVerificationPipeline } from '../src/utils/hrEmailVerification.ts';
import {
  ContactDiscoveryRun,
  DiscoveryDiagnosticCategory,
  HrContact,
  HrContactDiscoveryRunRecord,
} from '../src/types/index.ts';

function deriveSourceJobId(jobId: string, source: string): string {
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

async function checkWorkerRobotsAllows(targetUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(targetUrl);
    const robotsUrl = `${parsed.origin}/robots.txt`;
    if (!isSafePublicUrl(robotsUrl)) return false;
    const res = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'ApplyViseAI-HRDiscovery/2.0' },
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);
    if (!res || !res.ok) return true;
    const text = await res.text();
    let inWildcardOrSelf = false;
    const disallowed: string[] = [];
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.split('#')[0].trim();
      if (!line) continue;
      const [key, ...rest] = line.split(':');
      const val = rest.join(':').trim();
      if (key.toLowerCase() === 'user-agent') {
        inWildcardOrSelf = val === '*' || val.toLowerCase().includes('applyvise');
      } else if (inWildcardOrSelf && key.toLowerCase() === 'disallow' && val) {
        disallowed.push(val);
      }
    }
    const reqPath = parsed.pathname || '/';
    return !disallowed.some((d) => d === '/' || reqPath.startsWith(d));
  } catch {
    return true;
  }
}

export async function processWorkerHrDiscoveryQueueBatch(
  db: D1Database,
  params: {
    triggeredBy: string;
    triggerType?: HrContactDiscoveryRunRecord['triggerType'];
    batchLimit?: number;
    fetchBudget?: number;
    jobId?: string;
    companyName?: string;
    jobIds?: string[];
  }
): Promise<{
  run: HrContactDiscoveryRunRecord;
  discoveredContacts: HrContact[];
  sourcesChecked: Array<{ source: string; status: string; found: number; note?: string }>;
}> {
  const outStore = new WorkerHrOutreachStore(db);
  const qStore = new WorkerHrDiscoveryQueueStore(db);

  await qStore.syncJobsToDiscoveryQueue({
    jobIds: params.jobId ? [params.jobId] : params.jobIds,
    limit: Math.min(300, Math.max(80, params.batchLimit || 150)),
  });

  const detailedRun = await qStore.createDetailedRun({
    triggeredBy: params.triggeredBy,
    triggerType: params.triggerType || 'manual',
  });

  const batch = await qStore.fetchPendingQueueBatch({
    limit: Math.min(120, params.batchLimit || 80),
    jobId: params.jobId,
    companyName: params.companyName,
  });

  const maxExternalFetches = Math.min(10, params.fetchBudget ?? 6);
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
  const checkedCompanyPages = new Set<string>();

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
        await qStore.markQueueItemResult({
          queueId: queueItem.id,
          status: 'unsupported_source',
          diagnosticCategory: 'source_not_supported',
          failureReason: 'Restricted portal requires candidate browser session (linking-only).',
          emailsExtracted: 0,
          emailsAccepted: 0,
        });
        continue;
      }

      let combinedText = `${job.title}\n${job.description || ''}`;
      let detailUrl = job.url;
      let detailFetchFailed = false;
      if (job.description) descriptionsInspected++;

      const canFetchDetail =
        externalFetchesUsed < maxExternalFetches &&
        isPlaceholderDescription(job.source, job.description) &&
        (job.source.startsWith('greenhouse_') ||
          job.source.startsWith('smartrec_') ||
          job.source.startsWith('lever_') ||
          job.source.startsWith('workable_'));

      if (canFetchDetail) {
        externalFetchesUsed++;
        const detail = await fetchAtsFullJobDetail({
          source: job.source,
          sourceJobId: deriveSourceJobId(job.id, job.source),
          jobUrl: job.url,
        });
        if (detail.ok && detail.rawHtmlOrText) {
          const clean = extractPlainTextForMatching(detail.rawHtmlOrText).slice(0, 12000);
          combinedText = `${job.title}\n${clean}`;
          detailUrl = detail.sourceUrl || job.url;
          descriptionsInspected++;
          if (clean.length > (job.description || '').length) {
            await db.prepare('UPDATE live_jobs_cache SET description = ? WHERE id = ?').bind(clean, job.id).run();
          }
        } else if (!detail.ok) {
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

      if (candidates.length === 0 && (job.careersUrl || job.companyWebsite) && externalFetchesUsed < maxExternalFetches) {
        const candidateUrl = job.careersUrl || `${job.companyWebsite!.replace(/\/$/, '')}/careers`;
        if (isSafePublicUrl(candidateUrl) && !checkedCompanyPages.has(candidateUrl)) {
          checkedCompanyPages.add(candidateUrl);
          const allowed = await checkWorkerRobotsAllows(candidateUrl);
          if (allowed) {
            externalFetchesUsed++;
            companyPagesInspected++;
            const pageResp = await fetch(candidateUrl, {
              headers: { 'User-Agent': 'ApplyViseAI-HRDiscovery/2.0' },
              signal: AbortSignal.timeout(5500),
            }).catch(() => null);
            if (pageResp && pageResp.ok) {
              const html = (await pageResp.text()).slice(0, 1_500_000);
              const dom = new URL(candidateUrl).hostname.replace(/^www\./, '');
              const pageDiag = extractPublicHrContactsWithDiagnostics({
                text: html,
                companyName: job.company,
                companyId: job.companyId,
                country: job.country || 'Global',
                companyWebsite: job.companyWebsite || candidateUrl,
                companyDomain: dom,
                sourceType: 'official_company_careers',
                sourceName: `${job.company} Official Careers Page`,
                sourceUrl: candidateUrl,
                jobId: job.id,
                linkType: 'recruitment_page',
              });
              candidates.push(...pageDiag.candidates);
              rejectedForItem += pageDiag.rejectedCount;
            } else {
              pageFetchFailed = true;
            }
          }
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
          dohMxResolver
        );

        if (verification.levels.level1SyntaxValid) validSyntaxCount++;
        if (verification.levels.level2DomainExists) domainsValidatedCount++;
        if (verification.levels.level3MxAvailable) mxValidatedCount++;
        if (verification.levels.level4SourceEvidenceConfirmed) sourceConfirmedCount++;

        if (verification.status === 'Invalid') {
          invalidRejected++;
          continue;
        }

        const { contact, created } = await outStore.upsertHrContact({
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
        await qStore.markQueueItemResult({
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

        await qStore.markQueueItemResult({
          queueId: queueItem.id,
          status: detailFetchFailed ? 'failed' : 'no_contact_found',
          diagnosticCategory: diag,
          failureReason:
            diag === 'description_unavailable'
              ? 'Full job description unavailable from upstream source.'
              : diag === 'company_page_unavailable'
              ? 'Official company careers page unavailable or blocked.'
              : 'Employer published posting without a direct recruitment email address.',
          emailsExtracted: candidates.length,
          emailsAccepted: 0,
        });
      }
    } catch (err: unknown) {
      sourcesFailing++;
      srcBucket.failed++;
      await qStore.markQueueItemResult({
        queueId: queueItem.id,
        status: 'failed',
        diagnosticCategory: 'extraction_failed',
        failureReason: err instanceof Error ? err.message : String(err),
        emailsExtracted: 0,
        emailsAccepted: 0,
      });
    }
  }

  sourcesChecked.push({
    source: 'GCDE D1 Discovery Queue',
    status: 'scanned',
    found: savedContacts.length,
    note: `Inspected ${jobsScanned} queued GCDE jobs (${descriptionsInspected} descriptions, ${companyPagesInspected} career pages).`,
  });

  const finishedRun =
    (await qStore.updateDetailedRun(detailedRun.id, {
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
    })) || detailedRun;

  return { run: finishedRun, discoveredContacts: savedContacts, sourcesChecked };
}

export async function discoverWorkerHrContacts(
  db: D1Database,
  params: {
    triggeredBy: string;
    companyName?: string;
    companyWebsite?: string;
    jobId?: string;
  }
): Promise<{
  run: ContactDiscoveryRun;
  discoveredContacts: HrContact[];
  unavailableReason?: string;
  sourcesChecked: Array<{ source: string; status: string; found: number; note?: string }>;
}> {
  const outStore = new WorkerHrOutreachStore(db);
  const qStore = new WorkerHrDiscoveryQueueStore(db);

  const run = await outStore.createDiscoveryRun({
    triggeredBy: params.triggeredBy,
    companyName: params.companyName,
    jobId: params.jobId,
    status: 'running',
  });

  try {
    let targetJobs: any[] = [];
    if (params.jobId) {
      const r = await db.prepare('SELECT * FROM live_jobs_cache WHERE id = ?').bind(params.jobId).first<any>();
      if (r) targetJobs = [r];
    } else if (params.companyName) {
      const r = await db
        .prepare('SELECT * FROM live_jobs_cache WHERE LOWER(company) LIKE ? ORDER BY retrieved_at DESC LIMIT 30')
        .bind(`%${params.companyName.toLowerCase()}%`)
        .all<any>();
      targetJobs = r.results || [];
    } else {
      const r = await db
        .prepare(
          `SELECT * FROM live_jobs_cache
           WHERE is_active = 1
           ORDER BY
             CASE WHEN description LIKE '%@%' OR description LIKE '%mailto:%' OR description LIKE '%[at]%' THEN 0 ELSE 1 END,
             retrieved_at DESC
           LIMIT 75`
        )
        .all<any>();
      targetJobs = r.results || [];
    }

    const candidates: ExtractedHrContactCandidate[] = [];
    const sourcesChecked: Array<{ source: string; status: string; found: number; note?: string }> = [];
    let sourcesScanned = 0;

    if (targetJobs.length > 0) {
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
            await db.prepare('UPDATE live_jobs_cache SET description = ? WHERE id = ?').bind(clean, job.id).run();
          }
        }

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
        candidates.push(...diag.candidates);
      }

      sourcesChecked.push({
        source: 'GCDE Active Job Descriptions',
        status: 'scanned',
        found: foundInJobs,
        note: `Inspected ${targetJobs.length} cached GCDE job descriptions.`,
      });
    }

    const companyTargets: Array<{ id?: string; name: string; domain: string; careersUrl: string; country: string }> = [];
    if (params.companyWebsite) {
      if (!isSafePublicUrl(params.companyWebsite)) {
        sourcesChecked.push({
          source: params.companyWebsite,
          status: 'blocked_ssrf',
          found: 0,
          note: 'Blocked by SSRF safety validation.',
        });
      } else {
        const domain = new URL(params.companyWebsite).hostname.replace(/^www\./, '');
        companyTargets.push({
          name: params.companyName || domain,
          domain,
          careersUrl: params.companyWebsite,
          country: 'Global',
        });
      }
    }

    if (params.companyName || (params.jobId && targetJobs[0])) {
      const coName = params.companyName || targetJobs[0]?.company;
      const dirRes = await db
        .prepare('SELECT * FROM company_directory WHERE LOWER(name) LIKE ? LIMIT 3')
        .bind(`%${String(coName).toLowerCase()}%`)
        .all<any>()
        .catch(() => ({ results: [] }));
      for (const d of dirRes.results || []) {
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
    }

    for (const comp of companyTargets.slice(0, 3)) {
      if (!isSafePublicUrl(comp.careersUrl)) continue;
      const allowed = await checkWorkerRobotsAllows(comp.careersUrl);
      if (!allowed) {
        sourcesChecked.push({ source: comp.careersUrl, status: 'robots_disallowed', found: 0 });
        continue;
      }
      sourcesScanned++;
      try {
        const resp = await fetch(comp.careersUrl, {
          headers: { 'User-Agent': 'ApplyViseAI-HRDiscovery/2.0' },
          signal: AbortSignal.timeout(5500),
        });
        if (resp.ok) {
          const html = (await resp.text()).slice(0, 1_500_000);
          const diag = extractPublicHrContactsWithDiagnostics({
            text: html,
            companyName: comp.name,
            companyId: comp.id,
            country: comp.country,
            companyWebsite: comp.careersUrl,
            companyDomain: comp.domain,
            sourceType: 'official_company_careers',
            sourceName: `${comp.name} Official Careers Page`,
            sourceUrl: comp.careersUrl,
            jobId: params.jobId,
            linkType: 'recruitment_page',
          });
          candidates.push(...diag.candidates);
          sourcesChecked.push({ source: comp.careersUrl, status: 'scanned', found: diag.candidates.length });
        } else {
          sourcesChecked.push({ source: comp.careersUrl, status: 'unavailable', found: 0, note: `HTTP ${resp.status}` });
        }
      } catch (e: any) {
        sourcesChecked.push({ source: comp.careersUrl, status: 'unavailable', found: 0, note: e?.message });
      }
    }

    const seen = new Set<string>();
    const savedContacts: HrContact[] = [];
    let duplicatesSkipped = 0;
    let verifiedCount = 0;

    for (const cand of candidates) {
      if (seen.has(cand.email)) {
        duplicatesSkipped++;
        continue;
      }
      seen.add(cand.email);
      const verification = await runEmailVerificationPipeline(
        { email: cand.email, sourceUrl: cand.sourceUrl, evidence: cand.evidence },
        dohMxResolver
      );
      if (verification.status === 'Invalid') continue;
      if (verification.mxValid) verifiedCount++;

      const { contact, created } = await outStore.upsertHrContact({
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

    await qStore.syncJobsToDiscoveryQueue({ jobIds: targetJobs.map((j) => j.id) });

    await outStore.updateDiscoveryRun(run.id, {
      status: 'completed',
      sourcesScanned,
      contactsDiscovered: savedContacts.length,
      contactsVerified: verifiedCount,
      duplicatesSkipped,
      completedAt: new Date().toISOString(),
    });

    const unavailableReason =
      savedContacts.length === 0
        ? `No public HR email address was published across inspected official sources${params.companyName ? ` for "${params.companyName}"` : ''}.`
        : undefined;

    return {
      run: (await outStore.getDiscoveryRunById(run.id)) || run,
      discoveredContacts: savedContacts,
      unavailableReason,
      sourcesChecked,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await outStore.updateDiscoveryRun(run.id, {
      status: 'failed',
      errorMessage: msg,
      completedAt: new Date().toISOString(),
    });
    return {
      run: (await outStore.getDiscoveryRunById(run.id)) || run,
      discoveredContacts: [],
      unavailableReason: msg,
      sourcesChecked: [],
    };
  }
}

export async function revalidateWorkerStaleContacts(db: D1Database, limit = 25): Promise<{
  checked: number;
  stillValid: number;
  markedStaleOrFailed: number;
}> {
  const outStore = new WorkerHrOutreachStore(db);
  const staleCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const res = await db
    .prepare(
      `SELECT * FROM hr_contacts
       WHERE contact_status != 'archived'
         AND (last_verified_at IS NULL OR last_verified_at < ? OR email_verification_status IN ('Unverified', 'Verification Failed', 'Stale'))
       ORDER BY COALESCE(last_verified_at, '1970-01-01') ASC
       LIMIT ?`
    )
    .bind(staleCutoff, Math.min(60, Math.max(1, limit)))
    .all<any>();

  let checked = 0;
  let stillValid = 0;
  let markedStaleOrFailed = 0;

  for (const row of res.results || []) {
    checked++;
    const verification = await runEmailVerificationPipeline(
      {
        email: row.email,
        sourceUrl: row.source_url,
        evidence: row.source_evidence || row.evidence,
        lastVerifiedAt: row.last_verified_at,
      },
      dohMxResolver
    );

    await outStore.updateHrContactVerification(row.id, verification.status, verification.isRoleBased, verification.checkedAt, {
      verificationLevels: verification.levels,
      mxHosts: verification.mxHosts,
      evidence: row.source_evidence || row.evidence,
    });

    if (
      verification.status === 'Source Confirmed' ||
      verification.status === 'MX Valid' ||
      verification.status === 'Mailbox Verified' ||
      verification.status === 'Verified'
    ) {
      stillValid++;
    } else {
      markedStaleOrFailed++;
    }
  }

  return { checked, stillValid, markedStaleOrFailed };
}
