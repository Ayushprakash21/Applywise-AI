// server/hrDiscoveryQueueStore.ts
// Persistent SQLite Discovery Queue, Run Telemetry, Company & Job Coverage Queries,
// Tenant-Isolated Manual Contact Corrections, and Admin Diagnostics for HR Contact Discovery.

import crypto from 'node:crypto';
import { sqlite } from './authAndStore.ts';
import { hrOutreachStore, mapHrContactRow } from './hrOutreachStore.ts';
import {
  DiscoveryDiagnosticCategory,
  EmailVerificationLevels,
  EmailVerificationStatus,
  HrAdminDiagnosticsSummary,
  HrContact,
  HrContactClassificationType,
  HrContactDiscoveryRunRecord,
  HrContactRoleCategory,
  HrDiscoveryQueueItem,
} from '../src/types/index.ts';

function computeDescriptionHash(text: string): string {
  return crypto.createHash('sha256').update(text || '').digest('hex').slice(0, 16);
}

function mapQueueRow(row: any): HrDiscoveryQueueItem {
  return {
    id: row.id,
    jobId: row.job_id,
    companyId: row.company_id || undefined,
    companyName: row.company_name,
    source: row.source,
    jobUrl: row.job_url || undefined,
    status: row.status as HrDiscoveryQueueItem['status'],
    diagnosticCategory: (row.diagnostic_category || undefined) as DiscoveryDiagnosticCategory | undefined,
    failureReason: row.failure_reason || undefined,
    attemptCount: Number(row.attempt_count || 0),
    nextRetryAt: row.next_retry_at || undefined,
    emailsExtracted: Number(row.emails_extracted || 0),
    emailsAccepted: Number(row.emails_accepted || 0),
    lastProcessedAt: row.last_processed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRunRow(row: any): HrContactDiscoveryRunRecord {
  let sourceBreakdown: Record<string, { scanned: number; extracted: number; accepted: number; failed: number }> = {};
  try {
    sourceBreakdown = JSON.parse(row.source_breakdown_json || '{}') || {};
  } catch {
    sourceBreakdown = {};
  }
  return {
    id: row.id,
    triggeredBy: row.triggered_by,
    triggerType: (row.trigger_type || 'manual') as HrContactDiscoveryRunRecord['triggerType'],
    status: (row.status || 'completed') as HrContactDiscoveryRunRecord['status'],
    jobsScanned: Number(row.jobs_scanned || 0),
    descriptionsInspected: Number(row.descriptions_inspected || 0),
    companyPagesInspected: Number(row.company_pages_inspected || 0),
    emailsExtracted: Number(row.emails_extracted || 0),
    validSyntaxCount: Number(row.valid_syntax_count || 0),
    domainsValidatedCount: Number(row.domains_validated_count || 0),
    mxValidatedCount: Number(row.mx_validated_count || 0),
    sourceConfirmedCount: Number(row.source_confirmed_count || 0),
    duplicatesSkipped: Number(row.duplicates_skipped || 0),
    invalidRejected: Number(row.invalid_rejected || 0),
    sourcesFailing: Number(row.sources_failing || 0),
    sourceBreakdown,
    errorSummary: row.error_summary || undefined,
    startedAt: row.started_at,
    completedAt: row.completed_at || undefined,
  };
}

export interface QueuedJobRecord {
  queueItem: HrDiscoveryQueueItem;
  job: {
    id: string;
    title: string;
    company: string;
    country: string;
    location: string;
    url: string;
    source: string;
    description: string;
    retrievedAt: string;
    companyWebsite?: string;
    careersUrl?: string;
    companyId?: string;
  };
}

export const hrDiscoveryQueueStore = {
  /**
   * Ensures jobs from live_jobs_cache are enqueued in hr_contact_discovery_queue.
   * Newly ingested jobs or jobs with changed descriptions become `pending`.
   */
  syncJobsToDiscoveryQueue(params?: { jobIds?: string[]; limit?: number }): { enqueued: number; resetForUpdate: number } {
    const now = new Date().toISOString();
    let jobs: any[] = [];

    if (params?.jobIds && params.jobIds.length > 0) {
      const placeholders = params.jobIds.map(() => '?').join(', ');
      jobs = sqlite
        .prepare(`SELECT id, company, source, url, description, retrieved_at FROM live_jobs_cache WHERE id IN (${placeholders})`)
        .all(...params.jobIds) as any[];
    } else {
      const lim = Math.min(2000, Math.max(50, Number(params?.limit || 500)));
      // Prioritize jobs containing email indicators or not yet queued
      jobs = sqlite
        .prepare(
          `SELECT j.id, j.company, j.source, j.url, j.description, j.retrieved_at
           FROM live_jobs_cache j
           LEFT JOIN hr_contact_discovery_queue q ON q.job_id = j.id
           WHERE q.job_id IS NULL
              OR j.description LIKE '%@%'
              OR j.description LIKE '%[at]%'
              OR j.description LIKE '%mailto:%'
           ORDER BY CASE WHEN q.job_id IS NULL THEN 0 ELSE 1 END, j.retrieved_at DESC
           LIMIT ?`
        )
        .all(lim) as any[];
    }

    const companyRows = sqlite
      .prepare('SELECT id, LOWER(name) as lname FROM company_directory')
      .all() as Array<{ id: string; lname: string }>;
    const companyMap = new Map(companyRows.map((c) => [c.lname, c.id]));

    const selectExisting = sqlite.prepare('SELECT id, description_hash, status FROM hr_contact_discovery_queue WHERE job_id = ?');
    const insertStmt = sqlite.prepare(
      `INSERT INTO hr_contact_discovery_queue (
         id, job_id, company_id, company_name, source, job_url, description_hash,
         status, attempt_count, emails_extracted, emails_accepted, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, 0, ?, ?)`
    );
    const updateChangedStmt = sqlite.prepare(
      `UPDATE hr_contact_discovery_queue
       SET description_hash = ?, status = 'pending', attempt_count = 0, next_retry_at = NULL,
           failure_reason = NULL, updated_at = ?
       WHERE id = ?`
    );

    let enqueued = 0;
    let resetForUpdate = 0;

    for (const job of jobs) {
      const hash = computeDescriptionHash(job.description || '');
      const companyId = companyMap.get(String(job.company || '').trim().toLowerCase()) || null;
      const existing = selectExisting.get(job.id) as { id: string; description_hash: string; status: string } | undefined;

      if (!existing) {
        insertStmt.run(
          `hcdq_${crypto.randomUUID()}`,
          job.id,
          companyId,
          job.company || 'Employer',
          job.source || 'live_jobs_cache',
          job.url || null,
          hash,
          now,
          now
        );
        enqueued++;
      } else if (existing.description_hash !== hash && existing.status !== 'processing') {
        updateChangedStmt.run(hash, now, existing.id);
        resetForUpdate++;
      }
    }

    return { enqueued, resetForUpdate };
  },

  fetchPendingQueueBatch(params?: { limit?: number; jobId?: string; companyName?: string }): QueuedJobRecord[] {
    const now = new Date().toISOString();
    const limit = Math.min(200, Math.max(1, Number(params?.limit || 50)));
    const clauses: string[] = [];
    const args: any[] = [];

    if (params?.jobId) {
      clauses.push('q.job_id = ?');
      args.push(params.jobId);
    } else if (params?.companyName) {
      clauses.push('LOWER(q.company_name) LIKE ?');
      args.push(`%${params.companyName.toLowerCase()}%`);
      clauses.push("q.status IN ('pending', 'failed', 'no_contact_found')");
    } else {
      clauses.push("(q.status = 'pending' OR (q.status = 'failed' AND (q.next_retry_at IS NULL OR q.next_retry_at <= ?)))");
      args.push(now);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = sqlite
      .prepare(
        `SELECT q.*,
                j.title as j_title, j.company as j_company, j.country as j_country, j.location as j_location,
                j.url as j_url, j.source as j_source, j.description as j_description, j.retrieved_at as j_retrieved_at,
                cd.id as cd_id, ('https://' || cd.domain) as cd_website, cd.careers_url as cd_careers_url
         FROM hr_contact_discovery_queue q
         JOIN live_jobs_cache j ON j.id = q.job_id
         LEFT JOIN company_directory cd ON LOWER(cd.name) = LOWER(j.company)
         ${whereSql}
         ORDER BY
           CASE
             WHEN j.description LIKE '%@%' OR j.description LIKE '%mailto:%' OR j.description LIKE '%[at]%' THEN 0
             WHEN q.source LIKE 'greenhouse%' OR q.source LIKE 'lever%' OR q.source LIKE 'smartrecruiters%' OR q.source LIKE 'workable%' THEN 1
             ELSE 2
           END,
           q.attempt_count ASC,
           j.retrieved_at DESC
         LIMIT ?`
      )
      .all(...args, limit) as any[];

    return rows.map((r) => ({
      queueItem: mapQueueRow(r),
      job: {
        id: r.job_id,
        title: r.j_title || 'Open Role',
        company: r.j_company || r.company_name,
        country: r.j_country || 'Global',
        location: r.j_location || 'Remote',
        url: r.j_url || r.job_url || '',
        source: r.j_source || r.source,
        description: r.j_description || '',
        retrievedAt: r.j_retrieved_at || r.created_at,
        companyId: r.cd_id || r.company_id || undefined,
        companyWebsite: r.cd_website || undefined,
        careersUrl: r.cd_careers_url || undefined,
      },
    }));
  },

  markQueueItemResult(params: {
    queueId: string;
    status: HrDiscoveryQueueItem['status'];
    diagnosticCategory: DiscoveryDiagnosticCategory;
    failureReason?: string;
    emailsExtracted: number;
    emailsAccepted: number;
  }): void {
    const now = new Date().toISOString();
    const existing = sqlite
      .prepare('SELECT attempt_count FROM hr_contact_discovery_queue WHERE id = ?')
      .get(params.queueId) as { attempt_count: number } | undefined;
    const nextAttempt = Number(existing?.attempt_count || 0) + 1;

    let finalStatus = params.status;
    let nextRetryAt: string | null = null;
    if (params.status === 'failed') {
      if (nextAttempt >= 3) {
        finalStatus = 'dead_letter';
      } else {
        const delayMinutes = Math.pow(2, nextAttempt) * 5;
        nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
      }
    }

    sqlite
      .prepare(
        `UPDATE hr_contact_discovery_queue
         SET status = ?, diagnostic_category = ?, failure_reason = ?, attempt_count = ?,
             next_retry_at = ?, emails_extracted = ?, emails_accepted = ?, last_processed_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        finalStatus,
        params.diagnosticCategory,
        params.failureReason ? params.failureReason.slice(0, 500) : null,
        nextAttempt,
        nextRetryAt,
        params.emailsExtracted,
        params.emailsAccepted,
        now,
        now,
        params.queueId
      );
  },

  reprocessQueueJob(jobId: string): HrDiscoveryQueueItem | null {
    this.syncJobsToDiscoveryQueue({ jobIds: [jobId] });
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `UPDATE hr_contact_discovery_queue
         SET status = 'pending', attempt_count = 0, next_retry_at = NULL, failure_reason = NULL, updated_at = ?
         WHERE job_id = ?`
      )
      .run(now, jobId);
    const row = sqlite.prepare('SELECT * FROM hr_contact_discovery_queue WHERE job_id = ?').get(jobId) as any;
    return row ? mapQueueRow(row) : null;
  },

  retryFailedQueueItems(): number {
    const now = new Date().toISOString();
    const res = sqlite
      .prepare(
        `UPDATE hr_contact_discovery_queue
         SET status = 'pending', next_retry_at = NULL, attempt_count = 0, updated_at = ?
         WHERE status IN ('failed', 'dead_letter')`
      )
      .run(now);
    return Number(res.changes || 0);
  },

  createDetailedRun(params: {
    triggeredBy: string;
    triggerType: HrContactDiscoveryRunRecord['triggerType'];
  }): HrContactDiscoveryRunRecord {
    const id = `hcrun_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO hr_contact_discovery_runs (id, triggered_by, trigger_type, status, started_at)
         VALUES (?, ?, ?, 'running', ?)`
      )
      .run(id, params.triggeredBy, params.triggerType, now);
    const row = sqlite.prepare('SELECT * FROM hr_contact_discovery_runs WHERE id = ?').get(id) as any;
    return mapRunRow(row);
  },

  updateDetailedRun(
    id: string,
    updates: Partial<{
      status: HrContactDiscoveryRunRecord['status'];
      jobsScanned: number;
      descriptionsInspected: number;
      companyPagesInspected: number;
      emailsExtracted: number;
      validSyntaxCount: number;
      domainsValidatedCount: number;
      mxValidatedCount: number;
      sourceConfirmedCount: number;
      duplicatesSkipped: number;
      invalidRejected: number;
      sourcesFailing: number;
      sourceBreakdown: Record<string, { scanned: number; extracted: number; accepted: number; failed: number }>;
      errorSummary: string;
      completedAt: string;
    }>
  ): HrContactDiscoveryRunRecord | null {
    const existing = sqlite.prepare('SELECT * FROM hr_contact_discovery_runs WHERE id = ?').get(id) as any;
    if (!existing) return null;
    sqlite
      .prepare(
        `UPDATE hr_contact_discovery_runs
         SET status = ?, jobs_scanned = ?, descriptions_inspected = ?, company_pages_inspected = ?,
             emails_extracted = ?, valid_syntax_count = ?, domains_validated_count = ?,
             mx_validated_count = ?, source_confirmed_count = ?, duplicates_skipped = ?,
             invalid_rejected = ?, sources_failing = ?, source_breakdown_json = ?,
             error_summary = ?, completed_at = ?
         WHERE id = ?`
      )
      .run(
        updates.status ?? existing.status,
        updates.jobsScanned ?? existing.jobs_scanned,
        updates.descriptionsInspected ?? existing.descriptions_inspected,
        updates.companyPagesInspected ?? existing.company_pages_inspected,
        updates.emailsExtracted ?? existing.emails_extracted,
        updates.validSyntaxCount ?? existing.valid_syntax_count,
        updates.domainsValidatedCount ?? existing.domains_validated_count,
        updates.mxValidatedCount ?? existing.mx_validated_count,
        updates.sourceConfirmedCount ?? existing.source_confirmed_count,
        updates.duplicatesSkipped ?? existing.duplicates_skipped,
        updates.invalidRejected ?? existing.invalid_rejected,
        updates.sourcesFailing ?? existing.sources_failing,
        updates.sourceBreakdown ? JSON.stringify(updates.sourceBreakdown) : existing.source_breakdown_json,
        updates.errorSummary ?? existing.error_summary,
        updates.completedAt ?? existing.completed_at,
        id
      );
    const updated = sqlite.prepare('SELECT * FROM hr_contact_discovery_runs WHERE id = ?').get(id) as any;
    return mapRunRow(updated);
  },

  /**
   * Lists companies across active GCDE jobs & company_directory with real contact & verification counts.
   */
  listCompaniesWithContactSummary(params: {
    userId: string;
    search?: string;
    onlyWithContacts?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(100, Math.max(1, Number(params.limit || 40)));
    const offset = Math.max(0, Number(params.offset || 0));
    const clauses: string[] = [];
    const args: any[] = [params.userId];

    if (params.search) {
      clauses.push('(LOWER(j.company) LIKE ? OR LOWER(COALESCE(cd.country, \'\')) LIKE ?)');
      const q = `%${params.search.toLowerCase()}%`;
      args.push(q, q);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const havingSql = params.onlyWithContacts ? 'HAVING contacts_count > 0' : '';

    const rows = sqlite
      .prepare(
        `SELECT
           j.company as company_name,
           MAX(cd.id) as company_id,
           MAX('https://' || cd.domain) as company_website,
           MAX(cd.careers_url) as careers_url,
           MAX(cd.detected_ats) as ats_type,
           MAX(COALESCE(cd.country, j.country)) as country,
           COUNT(DISTINCT j.id) as active_jobs_count,
           (
             SELECT COUNT(DISTINCT h.id) FROM hr_contacts h
             WHERE h.contact_status != 'archived'
               AND (COALESCE(h.is_user_submitted, 0) = 0 OR h.submitted_by_user_id = ?)
               AND LOWER(h.company_name) = LOWER(j.company)
           ) as contacts_count
         FROM live_jobs_cache j
         LEFT JOIN company_directory cd ON LOWER(cd.name) = LOWER(j.company)
         ${whereSql}
         GROUP BY LOWER(j.company)
         ${havingSql}
         ORDER BY contacts_count DESC, active_jobs_count DESC
         LIMIT ? OFFSET ?`
      )
      .all(...args, limit, offset) as any[];

    const companies = rows.map((r) => {
      const contactRows = sqlite
        .prepare(
          `SELECT * FROM hr_contacts
           WHERE contact_status != 'archived'
             AND (COALESCE(is_user_submitted, 0) = 0 OR submitted_by_user_id = ?)
             AND LOWER(company_name) = LOWER(?)
           ORDER BY contact_confidence DESC LIMIT 5`
        )
        .all(params.userId, r.company_name) as any[];
      const contacts = contactRows.map(mapHrContactRow);
      return {
        companyId: r.company_id || undefined,
        companyName: r.company_name,
        companyWebsite: r.company_website || undefined,
        careersUrl: r.careers_url || undefined,
        atsType: r.ats_type || undefined,
        country: r.country || 'Global',
        activeJobsCount: Number(r.active_jobs_count || 0),
        contactsCount: Number(r.contacts_count || 0),
        sourceConfirmedCount: contacts.filter((c) => c.verificationLevels?.level4SourceEvidenceConfirmed || c.emailVerificationStatus === 'Source Confirmed').length,
        verifiedCount: contacts.filter((c) => c.emailVerificationStatus === 'Mailbox Verified' || c.emailVerificationStatus === 'Verified').length,
        contacts,
      };
    });

    return { companies, total: companies.length };
  },

  /**
   * Lists active GCDE jobs with linked HR contact details, linkType, diagnostic reason, and true job coverage %.
   */
  getJobsWithContactsCoverage(params: {
    userId: string;
    search?: string;
    onlyWithContacts?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(100, Math.max(1, Number(params.limit || 40)));
    const offset = Math.max(0, Number(params.offset || 0));
    const visibilityClause = "(h.contact_status != 'archived' AND (COALESCE(h.is_user_submitted, 0) = 0 OR h.submitted_by_user_id = ?))";

    const totalActiveJobs = Number((sqlite.prepare('SELECT COUNT(*) as c FROM live_jobs_cache').get() as any)?.c || 0);
    const jobsWithContactsCount = Number(
      (
        sqlite
          .prepare(
            `SELECT COUNT(DISTINCT j.id) as c FROM live_jobs_cache j
             WHERE EXISTS (
               SELECT 1 FROM hr_contacts h
               WHERE ${visibilityClause}
                 AND (
                   h.associated_job_ids LIKE '%' || j.id || '%'
                   OR LOWER(h.company_name) = LOWER(j.company)
                   OR EXISTS (SELECT 1 FROM hr_contact_job_links l WHERE l.contact_id = h.id AND l.job_id = j.id)
                 )
             )`
          )
          .get(params.userId) as any
      )?.c || 0
    );

    const clauses: string[] = [];
    const args: any[] = [];
    if (params.search) {
      clauses.push('(LOWER(j.title) LIKE ? OR LOWER(j.company) LIKE ? OR LOWER(j.country) LIKE ?)');
      const q = `%${params.search.toLowerCase()}%`;
      args.push(q, q, q);
    }
    if (params.onlyWithContacts) {
      clauses.push(
        `EXISTS (
          SELECT 1 FROM hr_contacts h
          WHERE ${visibilityClause}
            AND (
              h.associated_job_ids LIKE '%' || j.id || '%'
              OR LOWER(h.company_name) = LOWER(j.company)
              OR EXISTS (SELECT 1 FROM hr_contact_job_links l WHERE l.contact_id = h.id AND l.job_id = j.id)
            )
        )`
      );
      args.push(params.userId);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = sqlite
      .prepare(
        `SELECT j.*, q.status as queue_status, q.diagnostic_category as queue_diagnostic, q.failure_reason as queue_reason
         FROM live_jobs_cache j
         LEFT JOIN hr_contact_discovery_queue q ON q.job_id = j.id
         ${whereSql}
         ORDER BY j.retrieved_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...args, limit, offset) as any[];

    const jobs = rows.map((j) => {
      const contactRows = sqlite
        .prepare(
          `SELECT h.*, l.link_type as matched_link_type
           FROM hr_contacts h
           LEFT JOIN hr_contact_job_links l ON l.contact_id = h.id AND l.job_id = ?
           WHERE ${visibilityClause}
             AND (
               l.job_id IS NOT NULL
               OR h.associated_job_ids LIKE '%' || ? || '%'
               OR LOWER(h.company_name) = LOWER(?)
             )
           ORDER BY CASE WHEN l.link_type = 'direct_posting' THEN 0 ELSE 1 END, h.contact_confidence DESC
           LIMIT 5`
        )
        .all(j.id, params.userId, j.id, j.company) as any[];

      return {
        id: j.id,
        title: j.title,
        company: j.company,
        country: j.country,
        location: j.location,
        url: j.url,
        source: j.source,
        retrievedAt: j.retrieved_at,
        discoveryStatus: j.queue_status || 'not_queued',
        diagnosticCategory: j.queue_diagnostic || undefined,
        diagnosticReason: j.queue_reason || undefined,
        contacts: contactRows.map((c) => ({
          ...mapHrContactRow(c),
          linkType: c.matched_link_type || (c.is_user_submitted ? 'user_submitted' : 'company_only'),
        })),
      };
    });

    return {
      jobs,
      summary: {
        totalActiveJobs,
        jobsWithContacts: jobsWithContactsCount,
        jobCoveragePercent: totalActiveJobs > 0 ? Math.round((jobsWithContactsCount / totalActiveJobs) * 1000) / 10 : 0,
      },
    };
  },

  /**
   * Allows a candidate to manually add or correct a contact while isolating it to their tenant (`isUserSubmitted = true`)
   * and NEVER elevating it to verified without real verification checks.
   */
  submitOrCorrectUserContact(params: {
    userId: string;
    companyName: string;
    companyWebsite?: string;
    contactName?: string;
    designation: string;
    roleCategory: HrContactRoleCategory;
    contactType: HrContactClassificationType;
    email: string;
    country?: string;
    jobId?: string;
    sourceUrl?: string;
    evidence?: string;
    emailVerificationStatus: EmailVerificationStatus;
    verificationLevels: EmailVerificationLevels;
    mxHosts?: string[];
    isRoleBased: boolean;
  }): { contact: HrContact; created: boolean } {
    return hrOutreachStore.upsertHrContact({
      companyName: params.companyName.trim(),
      companyWebsite: params.companyWebsite?.trim() || undefined,
      contactName: params.contactName?.trim() || undefined,
      designation: params.designation.trim() || 'Candidate-Provided HR Contact',
      roleCategory: params.roleCategory,
      contactType: params.contactType,
      email: params.email.trim().toLowerCase(),
      country: params.country?.trim() || 'Global',
      sourceType: 'candidate_submitted',
      sourceName: 'Candidate Manual Submission',
      sourceUrl: params.sourceUrl?.trim() || 'user://manual-submission',
      associatedJobId: params.jobId,
      associatedJobIds: params.jobId ? [params.jobId] : [],
      linkType: 'user_submitted',
      emailVerificationStatus: params.emailVerificationStatus,
      verificationLevels: params.verificationLevels,
      mxHosts: params.mxHosts,
      contactConfidence: params.verificationLevels.level3MxAvailable ? 0.65 : 0.45,
      evidence: params.evidence?.trim() || 'Manually provided by candidate for personal outreach.',
      sourceEvidence: params.evidence?.trim() || 'Manually provided by candidate (unconfirmed public provenance).',
      isRoleBased: params.isRoleBased,
      lastVerifiedAt: new Date().toISOString(),
      isUserSubmitted: true,
      submittedByUserId: params.userId,
    });
  },

  /**
   * Computes all real database-backed Admin Diagnostics metrics (no fabricated numbers).
   */
  getAdminDiagnostics(): HrAdminDiagnosticsSummary {
    const baseFilter = "contact_status != 'archived' AND COALESCE(is_user_submitted, 0) = 0";
    const totalContacts = Number((sqlite.prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE ${baseFilter}`).get() as any)?.c || 0);
    const sourceConfirmedContacts = Number(
      (sqlite.prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE (email_verification_status = 'Source Confirmed' OR COALESCE(level_source_confirmed, 0) = 1) AND ${baseFilter}`).get() as any)?.c || 0
    );
    const mxValidatedContacts = Number(
      (sqlite.prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE (email_verification_status = 'MX Valid' OR COALESCE(level_mx, 0) = 1) AND ${baseFilter}`).get() as any)?.c || 0
    );
    const domainValidContacts = Number(
      (sqlite.prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE (email_verification_status = 'Domain Valid' OR COALESCE(level_domain, 0) = 1) AND ${baseFilter}`).get() as any)?.c || 0
    );
    const mailboxVerifiedContacts = Number(
      (sqlite.prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE (email_verification_status IN ('Mailbox Verified', 'Verified') OR COALESCE(level_mailbox, 0) = 1) AND ${baseFilter}`).get() as any)?.c || 0
    );
    const staleContacts = Number(
      (sqlite.prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE email_verification_status = 'Stale' AND ${baseFilter}`).get() as any)?.c || 0
    );
    const invalidOrFailedContacts = Number(
      (sqlite.prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE email_verification_status IN ('Invalid', 'Verification Failed') AND ${baseFilter}`).get() as any)?.c || 0
    );
    const totalJobLinks = Number((sqlite.prepare('SELECT COUNT(*) as c FROM hr_contact_job_links').get() as any)?.c || 0);
    const totalActiveJobs = Number((sqlite.prepare('SELECT COUNT(*) as c FROM live_jobs_cache').get() as any)?.c || 0);
    const jobsCoveredCount = Number(
      (
        sqlite
          .prepare(
            `SELECT COUNT(DISTINCT j.id) as c FROM live_jobs_cache j
             WHERE EXISTS (
               SELECT 1 FROM hr_contacts h
               WHERE ${baseFilter}
                 AND (
                   h.associated_job_ids LIKE '%' || j.id || '%'
                   OR LOWER(h.company_name) = LOWER(j.company)
                   OR EXISTS (SELECT 1 FROM hr_contact_job_links l WHERE l.contact_id = h.id AND l.job_id = j.id)
                 )
             )`
          )
          .get() as any
      )?.c || 0
    );

    const queueStatusRows = sqlite
      .prepare('SELECT status, COUNT(*) as c FROM hr_contact_discovery_queue GROUP BY status')
      .all() as Array<{ status: string; c: number }>;
    const qMap = new Map(queueStatusRows.map((r) => [r.status, Number(r.c || 0)]));

    const sourceRows = sqlite
      .prepare(
        `SELECT
           source,
           COUNT(*) as total_queued,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
           SUM(CASE WHEN status IN ('failed', 'dead_letter') THEN 1 ELSE 0 END) as failed_count,
           SUM(CASE WHEN status IN ('no_contact_found', 'unsupported_source') THEN 1 ELSE 0 END) as no_contact_count,
           SUM(COALESCE(emails_accepted, 0)) as contacts_found
         FROM hr_contact_discovery_queue
         GROUP BY source
         ORDER BY total_queued DESC`
      )
      .all() as any[];

    const recentRunRows = sqlite
      .prepare('SELECT * FROM hr_contact_discovery_runs ORDER BY started_at DESC LIMIT 20')
      .all() as any[];
    const lastSuccessRow = sqlite
      .prepare("SELECT * FROM hr_contact_discovery_runs WHERE status IN ('completed', 'partial') ORDER BY completed_at DESC LIMIT 1")
      .get() as any;
    const failingRows = sqlite
      .prepare("SELECT * FROM hr_contact_discovery_queue WHERE status IN ('failed', 'dead_letter') ORDER BY updated_at DESC LIMIT 50")
      .all() as any[];

    return {
      totals: {
        totalContacts,
        sourceConfirmedContacts,
        mxValidatedContacts,
        domainValidContacts,
        mailboxVerifiedContacts,
        staleContacts,
        invalidOrFailedContacts,
        totalJobLinks,
        jobsCoveredCount,
        totalActiveJobs,
        jobCoveragePercent: totalActiveJobs > 0 ? Math.round((jobsCoveredCount / totalActiveJobs) * 1000) / 10 : 0,
      },
      queueStats: {
        pending: qMap.get('pending') || 0,
        processing: qMap.get('processing') || 0,
        completed: qMap.get('completed') || 0,
        noContactFound: qMap.get('no_contact_found') || 0,
        failed: qMap.get('failed') || 0,
        deadLetter: qMap.get('dead_letter') || 0,
        unsupportedSource: qMap.get('unsupported_source') || 0,
      },
      sourceBreakdown: sourceRows.map((s) => ({
        source: s.source,
        totalQueued: Number(s.total_queued || 0),
        contactsFound: Number(s.contacts_found || 0),
        failed: Number(s.failed_count || 0),
        noContactFound: Number(s.no_contact_count || 0),
      })),
      recentRuns: recentRunRows.map(mapRunRow),
      failingRecords: failingRows.map(mapQueueRow),
      lastSuccessfulRun: lastSuccessRow ? mapRunRow(lastSuccessRow) : undefined,
    };
  },
};
