// worker/hrOutreachStore.ts
// Cloudflare D1 Persistence Layer for AI HR Outreach & Direct Application Automation
// Full parity with server/hrOutreachStore.ts for Worker runtime.

import {
  ContactDiscoveryRun,
  DoNotContactEntry,
  EmailAccountProvider,
  EmailAccountSummary,
  EmailVerificationStatus,
  HrContact,
  HrContactRoleCategory,
  HrContactSource,
  OutreachCampaign,
  OutreachCampaignContact,
  OutreachEmailTone,
  OutreachEvent,
  OutreachMessage,
  OutreachMessageStatus,
  OutreachTemplateType,
  ResumeAttachmentOption,
} from '../src/types/index.ts';
import { sanitizeEmailAccountRow } from '../src/utils/tokenCrypto.ts';

function safeJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapHrContactRow(row: any): HrContact {
  return {
    id: row.id,
    companyId: row.company_id || undefined,
    companyName: row.company_name,
    companyWebsite: row.company_website || undefined,
    contactName: row.contact_name || undefined,
    designation: row.designation,
    roleCategory: row.role_category as HrContactRoleCategory,
    email: row.email,
    country: row.country || 'Global',
    city: row.city || undefined,
    department: row.department || undefined,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    associatedJobIds: safeJsonArray(row.associated_job_ids),
    emailVerificationStatus: row.email_verification_status as EmailVerificationStatus,
    contactConfidence: Number(row.contact_confidence ?? 0.5),
    evidence: row.evidence || '',
    discoveredAt: row.discovered_at,
    lastVerifiedAt: row.last_verified_at || undefined,
    lastContactedAt: row.last_contacted_at || undefined,
    contactStatus: (row.contact_status || 'active') as HrContact['contactStatus'],
    isRoleBased: Boolean(row.is_role_based),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOutreachMessageRow(row: any): OutreachMessage {
  return {
    id: row.id,
    userId: row.user_id,
    contactId: row.contact_id,
    campaignId: row.campaign_id || undefined,
    emailAccountId: row.email_account_id || undefined,
    jobId: row.job_id || undefined,
    companyName: row.company_name,
    jobTitle: row.job_title || undefined,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name || undefined,
    templateType: row.template_type as OutreachTemplateType,
    tone: row.tone as OutreachEmailTone,
    subject: row.subject,
    bodyText: row.body_text,
    bodyHtml: row.body_html || undefined,
    resumeDocumentId: row.resume_document_id || undefined,
    resumeFileName: row.resume_file_name || undefined,
    resumeFileSize: row.resume_file_size ? Number(row.resume_file_size) : undefined,
    status: row.status as OutreachMessageStatus,
    explicitUserApproval: Boolean(row.explicit_user_approval),
    approvedAt: row.approved_at || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    provider: row.provider || undefined,
    providerMessageId: row.provider_message_id || undefined,
    providerThreadId: row.provider_thread_id || undefined,
    errorMessage: row.error_message || undefined,
    sentAt: row.sent_at || undefined,
    repliedAt: row.replied_at || undefined,
    followUpDueAt: row.follow_up_due_at || undefined,
    replySummary: row.reply_summary || undefined,
    suggestedReply: row.suggested_reply || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class WorkerHrOutreachStore {
  constructor(private db: D1Database) {}

  async saveResumeFileBlob(params: {
    resumeId: string;
    userId: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    dataBase64: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO resume_file_blobs (resume_id, user_id, file_name, mime_type, file_size_bytes, data_base64, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(resume_id) DO UPDATE SET
           file_name = excluded.file_name,
           mime_type = excluded.mime_type,
           file_size_bytes = excluded.file_size_bytes,
           data_base64 = excluded.data_base64`
      )
      .bind(params.resumeId, params.userId, params.fileName, params.mimeType, params.fileSizeBytes, params.dataBase64, now)
      .run();
  }

  async getResumeFileBlobForUser(userId: string, resumeId: string): Promise<{
    resumeId: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    bytes: Uint8Array;
  } | null> {
    const blob = await this.db
      .prepare('SELECT * FROM resume_file_blobs WHERE resume_id = ? AND user_id = ?')
      .bind(resumeId, userId)
      .first<any>();
    if (!blob) return null;
    const binary = atob(blob.data_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return {
      resumeId: blob.resume_id,
      fileName: blob.file_name,
      mimeType: blob.mime_type,
      fileSizeBytes: Number(blob.file_size_bytes),
      bytes,
    };
  }

  async listCandidateResumeAttachments(userId: string): Promise<ResumeAttachmentOption[]> {
    const docsRes = await this.db
      .prepare(
        `SELECT d.id, d.file_name, d.file_type, d.mime_type, d.file_size_bytes, d.created_at,
                (b.resume_id IS NOT NULL) as has_blob
         FROM resume_documents d
         LEFT JOIN resume_file_blobs b ON b.resume_id = d.id AND b.user_id = d.user_id
         WHERE d.user_id = ?
         ORDER BY d.created_at DESC`
      )
      .bind(userId)
      .all<any>();

    const options: ResumeAttachmentOption[] = (docsRes.results || []).map((d, idx) => {
      const mime =
        d.mime_type ||
        (String(d.file_name).toLowerCase().endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf');
      return {
        id: d.id,
        sourceType: 'uploaded_document',
        fileName: d.file_name,
        mimeType: mime,
        fileSizeBytes: Number(d.file_size_bytes || 0),
        createdAt: d.created_at,
        hasBinaryPreview: Boolean(d.has_blob),
        isDefault: idx === 0,
      };
    });

    const appsRes = await this.db
      .prepare('SELECT id, company, role, updated_at, data FROM applications WHERE user_id = ? ORDER BY updated_at DESC LIMIT 25')
      .bind(userId)
      .all<any>();

    for (const a of appsRes.results || []) {
      let parsed: any = {};
      try {
        parsed = JSON.parse(a.data || '{}');
      } catch {
        parsed = {};
      }
      if (parsed?.tailoredResume) {
        const cleanCo = String(a.company || 'Employer').replace(/[^a-zA-Z0-9_-]/g, '_');
        options.push({
          id: `tailored_${a.id}`,
          sourceType: 'tailored_application',
          fileName: `${cleanCo}_Tailored_Resume.pdf`,
          mimeType: 'application/pdf',
          fileSizeBytes: Math.max(2048, JSON.stringify(parsed.tailoredResume).length * 2),
          createdAt: a.updated_at,
          company: a.company,
          role: a.role,
          hasBinaryPreview: true,
          isDefault: options.length === 0,
        });
      }
    }

    return options;
  }

  async upsertHrContact(params: {
    companyId?: string;
    companyName: string;
    companyWebsite?: string;
    contactName?: string;
    designation: string;
    roleCategory: HrContactRoleCategory;
    email: string;
    country: string;
    city?: string;
    department?: string;
    sourceType: string;
    sourceName: string;
    sourceUrl: string;
    associatedJobIds?: string[];
    emailVerificationStatus: EmailVerificationStatus;
    contactConfidence: number;
    evidence: string;
    isRoleBased: boolean;
    lastVerifiedAt?: string;
  }): Promise<{ contact: HrContact; created: boolean }> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const dedupeKey = normalizedEmail;
    const now = new Date().toISOString();

    const existing = await this.db
      .prepare('SELECT * FROM hr_contacts WHERE dedupe_key = ?')
      .bind(dedupeKey)
      .first<any>();

    if (existing) {
      const mergedJobs = Array.from(
        new Set([...safeJsonArray(existing.associated_job_ids), ...(params.associatedJobIds || [])])
      );
      const nextConfidence = Math.max(Number(existing.contact_confidence || 0), params.contactConfidence);
      const nextVerification =
        existing.email_verification_status === 'Verified'
          ? 'Verified'
          : params.emailVerificationStatus || existing.email_verification_status;

      await this.db
        .prepare(
          `UPDATE hr_contacts
           SET company_id = COALESCE(company_id, ?),
               company_website = COALESCE(company_website, ?),
               contact_name = COALESCE(contact_name, ?),
               associated_job_ids = ?,
               contact_confidence = ?,
               email_verification_status = ?,
               last_verified_at = COALESCE(?, last_verified_at),
               updated_at = ?
           WHERE id = ?`
        )
        .bind(
          params.companyId || null,
          params.companyWebsite || null,
          params.contactName || null,
          JSON.stringify(mergedJobs),
          nextConfidence,
          nextVerification,
          params.lastVerifiedAt || null,
          now,
          existing.id
        )
        .run();

      const srcExists = await this.db
        .prepare('SELECT id FROM hr_contact_sources WHERE contact_id = ? AND source_url = ?')
        .bind(existing.id, params.sourceUrl)
        .first<any>();

      if (!srcExists) {
        await this.db
          .prepare(
            `INSERT INTO hr_contact_sources (id, contact_id, source_type, source_name, source_url, extracted_snippet, confidence_score, discovered_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            `hcs_${crypto.randomUUID()}`,
            existing.id,
            params.sourceType,
            params.sourceName,
            params.sourceUrl,
            params.evidence.slice(0, 500),
            params.contactConfidence,
            now
          )
          .run();
      }

      const updated = await this.db.prepare('SELECT * FROM hr_contacts WHERE id = ?').bind(existing.id).first<any>();
      return { contact: mapHrContactRow(updated), created: false };
    }

    const id = `hrc_${crypto.randomUUID()}`;
    await this.db
      .prepare(
        `INSERT INTO hr_contacts (
           id, company_id, company_name, company_website, contact_name, designation, role_category,
           email, country, city, department, source_type, source_url, associated_job_ids,
           email_verification_status, contact_confidence, evidence, discovered_at, last_verified_at,
           contact_status, is_role_based, dedupe_key, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
      )
      .bind(
        id,
        params.companyId || null,
        params.companyName,
        params.companyWebsite || null,
        params.contactName || null,
        params.designation,
        params.roleCategory,
        normalizedEmail,
        params.country || 'Global',
        params.city || null,
        params.department || null,
        params.sourceType,
        params.sourceUrl,
        JSON.stringify(params.associatedJobIds || []),
        params.emailVerificationStatus,
        params.contactConfidence,
        params.evidence,
        now,
        params.lastVerifiedAt || null,
        params.isRoleBased ? 1 : 0,
        dedupeKey,
        now,
        now
      )
      .run();

    await this.db
      .prepare(
        `INSERT INTO hr_contact_sources (id, contact_id, source_type, source_name, source_url, extracted_snippet, confidence_score, discovered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `hcs_${crypto.randomUUID()}`,
        id,
        params.sourceType,
        params.sourceName,
        params.sourceUrl,
        params.evidence.slice(0, 500),
        params.contactConfidence,
        now
      )
      .run();

    const row = await this.db.prepare('SELECT * FROM hr_contacts WHERE id = ?').bind(id).first<any>();
    return { contact: mapHrContactRow(row), created: true };
  }

  async listHrContacts(filters?: {
    search?: string;
    country?: string;
    company?: string;
    designation?: string;
    verificationStatus?: string;
    sourceType?: string;
    jobId?: string;
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ contacts: HrContact[]; total: number }> {
    const clauses: string[] = [];
    const args: any[] = [];

    if (!filters?.includeArchived) clauses.push("contact_status != 'archived'");
    if (filters?.search) {
      clauses.push("(LOWER(company_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(contact_name, '')) LIKE ? OR LOWER(designation) LIKE ?)");
      const q = `%${filters.search.toLowerCase()}%`;
      args.push(q, q, q, q);
    }
    if (filters?.country && filters.country !== 'all') {
      clauses.push('LOWER(country) = ?');
      args.push(filters.country.toLowerCase());
    }
    if (filters?.company) {
      clauses.push('LOWER(company_name) LIKE ?');
      args.push(`%${filters.company.toLowerCase()}%`);
    }
    if (filters?.designation && filters.designation !== 'all') {
      clauses.push('role_category = ?');
      args.push(filters.designation);
    }
    if (filters?.verificationStatus && filters.verificationStatus !== 'all') {
      clauses.push('email_verification_status = ?');
      args.push(filters.verificationStatus);
    }
    if (filters?.sourceType && filters.sourceType !== 'all') {
      clauses.push('source_type = ?');
      args.push(filters.sourceType);
    }
    if (filters?.jobId) {
      clauses.push('associated_job_ids LIKE ?');
      args.push(`%${filters.jobId}%`);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const totalRow = await this.db.prepare(`SELECT COUNT(*) as total FROM hr_contacts ${whereSql}`).bind(...args).first<any>();
    const limit = Math.min(200, Math.max(1, Number(filters?.limit || 50)));
    const offset = Math.max(0, Number(filters?.offset || 0));

    const res = await this.db
      .prepare(`SELECT * FROM hr_contacts ${whereSql} ORDER BY contact_confidence DESC, updated_at DESC LIMIT ? OFFSET ?`)
      .bind(...args, limit, offset)
      .all<any>();

    return {
      contacts: (res.results || []).map(mapHrContactRow),
      total: Number(totalRow?.total || 0),
    };
  }

  async getHrContactById(id: string): Promise<{ contact: HrContact; sources: HrContactSource[] } | null> {
    const row = await this.db.prepare('SELECT * FROM hr_contacts WHERE id = ?').bind(id).first<any>();
    if (!row) return null;
    const sourcesRes = await this.db
      .prepare('SELECT * FROM hr_contact_sources WHERE contact_id = ? ORDER BY discovered_at DESC')
      .bind(id)
      .all<any>();
    return {
      contact: mapHrContactRow(row),
      sources: (sourcesRes.results || []).map((s) => ({
        id: s.id,
        contactId: s.contact_id,
        sourceType: s.source_type,
        sourceName: s.source_name,
        sourceUrl: s.source_url,
        extractedSnippet: s.extracted_snippet || undefined,
        confidenceScore: Number(s.confidence_score ?? 0.5),
        discoveredAt: s.discovered_at,
      })),
    };
  }

  async updateHrContactVerification(id: string, status: EmailVerificationStatus, isRoleBased: boolean, checkedAt: string): Promise<HrContact | null> {
    await this.db
      .prepare('UPDATE hr_contacts SET email_verification_status = ?, is_role_based = ?, last_verified_at = ?, updated_at = ? WHERE id = ?')
      .bind(status, isRoleBased ? 1 : 0, checkedAt, checkedAt, id)
      .run();
    const row = await this.db.prepare('SELECT * FROM hr_contacts WHERE id = ?').bind(id).first<any>();
    return row ? mapHrContactRow(row) : null;
  }

  async updateHrContactStatus(id: string, contactStatus: 'active' | 'archived' | 'suppressed', lastContactedAt?: string): Promise<HrContact | null> {
    const now = new Date().toISOString();
    if (lastContactedAt) {
      await this.db
        .prepare('UPDATE hr_contacts SET contact_status = ?, last_contacted_at = ?, updated_at = ? WHERE id = ?')
        .bind(contactStatus, lastContactedAt, now, id)
        .run();
    } else {
      await this.db
        .prepare('UPDATE hr_contacts SET contact_status = ?, updated_at = ? WHERE id = ?')
        .bind(contactStatus, now, id)
        .run();
    }
    const row = await this.db.prepare('SELECT * FROM hr_contacts WHERE id = ?').bind(id).first<any>();
    return row ? mapHrContactRow(row) : null;
  }

  async createDiscoveryRun(params: {
    triggeredBy: string;
    companyId?: string;
    companyName?: string;
    jobId?: string;
    status?: ContactDiscoveryRun['status'];
  }): Promise<ContactDiscoveryRun> {
    const id = `cdrun_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await this.db
      .prepare('INSERT INTO contact_discovery_runs (id, triggered_by, company_id, company_name, job_id, status, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, params.triggeredBy, params.companyId || null, params.companyName || null, params.jobId || null, params.status || 'running', now)
      .run();
    return (await this.getDiscoveryRunById(id))!;
  }

  async getDiscoveryRunById(id: string): Promise<ContactDiscoveryRun | null> {
    const r = await this.db.prepare('SELECT * FROM contact_discovery_runs WHERE id = ?').bind(id).first<any>();
    if (!r) return null;
    return {
      id: r.id,
      triggeredBy: r.triggered_by,
      companyId: r.company_id || undefined,
      companyName: r.company_name || undefined,
      jobId: r.job_id || undefined,
      status: r.status,
      sourcesScanned: Number(r.sources_scanned || 0),
      contactsDiscovered: Number(r.contacts_discovered || 0),
      contactsVerified: Number(r.contacts_verified || 0),
      duplicatesSkipped: Number(r.duplicates_skipped || 0),
      retryCount: Number(r.retry_count || 0),
      checkpoint: r.checkpoint || undefined,
      errorMessage: r.error_message || undefined,
      startedAt: r.started_at,
      completedAt: r.completed_at || undefined,
    };
  }

  async updateDiscoveryRun(id: string, patch: Partial<ContactDiscoveryRun>): Promise<void> {
    const cur = await this.getDiscoveryRunById(id);
    if (!cur) return;
    await this.db
      .prepare(
        `UPDATE contact_discovery_runs
         SET status = ?, sources_scanned = ?, contacts_discovered = ?, contacts_verified = ?,
             duplicates_skipped = ?, retry_count = ?, checkpoint = ?, error_message = ?, completed_at = ?
         WHERE id = ?`
      )
      .bind(
        patch.status ?? cur.status,
        patch.sourcesScanned ?? cur.sourcesScanned,
        patch.contactsDiscovered ?? cur.contactsDiscovered,
        patch.contactsVerified ?? cur.contactsVerified,
        patch.duplicatesSkipped ?? cur.duplicatesSkipped,
        patch.retryCount ?? cur.retryCount,
        patch.checkpoint ?? cur.checkpoint ?? null,
        patch.errorMessage ?? cur.errorMessage ?? null,
        patch.completedAt ?? cur.completedAt ?? null,
        id
      )
      .run();
  }

  async listDiscoveryRuns(limit = 20): Promise<ContactDiscoveryRun[]> {
    const res = await this.db
      .prepare('SELECT * FROM contact_discovery_runs ORDER BY started_at DESC LIMIT ?')
      .bind(limit)
      .all<any>();
    return (res.results || []).map((r) => ({
      id: r.id,
      triggeredBy: r.triggered_by,
      companyId: r.company_id || undefined,
      companyName: r.company_name || undefined,
      jobId: r.job_id || undefined,
      status: r.status,
      sourcesScanned: Number(r.sources_scanned || 0),
      contactsDiscovered: Number(r.contacts_discovered || 0),
      contactsVerified: Number(r.contacts_verified || 0),
      duplicatesSkipped: Number(r.duplicates_skipped || 0),
      retryCount: Number(r.retry_count || 0),
      checkpoint: r.checkpoint || undefined,
      errorMessage: r.error_message || undefined,
      startedAt: r.started_at,
      completedAt: r.completed_at || undefined,
    }));
  }

  async createOAuthState(userId: string, provider: EmailAccountProvider, redirectUri: string, state: string, ttlSeconds = 600): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    await this.db
      .prepare('INSERT INTO oauth_states (state, user_id, provider, redirect_uri, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(state, userId, provider, redirectUri, expiresAt, now.toISOString())
      .run();
  }

  async consumeOAuthState(state: string, userId: string, provider: EmailAccountProvider): Promise<{ redirectUri: string } | null> {
    const row = await this.db
      .prepare('SELECT * FROM oauth_states WHERE state = ? AND user_id = ? AND provider = ?')
      .bind(state, userId, provider)
      .first<any>();
    if (!row) return null;
    await this.db.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();
    if (Date.parse(row.expires_at) < Date.now()) return null;
    return { redirectUri: row.redirect_uri };
  }

  async upsertEmailAccount(params: {
    userId: string;
    provider: EmailAccountProvider;
    email: string;
    displayName?: string;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string;
    tokenExpiresAt?: string;
    scopes: string[];
  }): Promise<EmailAccountSummary> {
    const now = new Date().toISOString();
    const cleanEmail = params.email.trim().toLowerCase();
    const existing = await this.db
      .prepare('SELECT id FROM email_accounts WHERE user_id = ? AND provider = ? AND email = ?')
      .bind(params.userId, params.provider, cleanEmail)
      .first<any>();

    const id = existing?.id || `emacc_${crypto.randomUUID()}`;
    await this.db
      .prepare(
        `INSERT INTO email_accounts (
           id, user_id, provider, email, display_name, encrypted_access_token, encrypted_refresh_token,
           token_expires_at, scopes, status, last_error, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'connected', NULL, ?, ?)
         ON CONFLICT(user_id, provider, email) DO UPDATE SET
           display_name = excluded.display_name,
           encrypted_access_token = excluded.encrypted_access_token,
           encrypted_refresh_token = COALESCE(excluded.encrypted_refresh_token, email_accounts.encrypted_refresh_token),
           token_expires_at = excluded.token_expires_at,
           scopes = excluded.scopes,
           status = 'connected',
           last_error = NULL,
           updated_at = excluded.updated_at`
      )
      .bind(
        id,
        params.userId,
        params.provider,
        cleanEmail,
        params.displayName || null,
        params.encryptedAccessToken,
        params.encryptedRefreshToken || null,
        params.tokenExpiresAt || null,
        JSON.stringify(params.scopes),
        now,
        now
      )
      .run();

    const row = await this.db.prepare('SELECT * FROM email_accounts WHERE id = ?').bind(id).first<any>();
    return sanitizeEmailAccountRow(row);
  }

  async listUserEmailAccounts(userId: string): Promise<EmailAccountSummary[]> {
    const res = await this.db
      .prepare('SELECT * FROM email_accounts WHERE user_id = ? ORDER BY updated_at DESC')
      .bind(userId)
      .all<any>();
    return (res.results || []).map(sanitizeEmailAccountRow);
  }

  async getEmailAccountWithSecrets(userId: string, accountId: string): Promise<{
    summary: EmailAccountSummary;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string;
  } | null> {
    const row = await this.db
      .prepare('SELECT * FROM email_accounts WHERE id = ? AND user_id = ?')
      .bind(accountId, userId)
      .first<any>();
    if (!row) return null;
    return {
      summary: sanitizeEmailAccountRow(row),
      encryptedAccessToken: row.encrypted_access_token,
      encryptedRefreshToken: row.encrypted_refresh_token || undefined,
    };
  }

  async updateEmailAccountTokens(params: {
    userId: string;
    accountId: string;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string;
    tokenExpiresAt?: string;
    status?: EmailAccountSummary['status'];
    lastError?: string | null;
  }): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE email_accounts
         SET encrypted_access_token = ?,
             encrypted_refresh_token = COALESCE(?, encrypted_refresh_token),
             token_expires_at = COALESCE(?, token_expires_at),
             status = COALESCE(?, status),
             last_error = ?,
             updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .bind(
        params.encryptedAccessToken,
        params.encryptedRefreshToken || null,
        params.tokenExpiresAt || null,
        params.status || null,
        params.lastError ?? null,
        now,
        params.accountId,
        params.userId
      )
      .run();
  }

  async disconnectEmailAccount(userId: string, accountId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await this.db
      .prepare(
        `UPDATE email_accounts
         SET status = 'disconnected',
             encrypted_access_token = '',
             encrypted_refresh_token = NULL,
             updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .bind(now, accountId, userId)
      .run();
    return Boolean(res.meta?.changes && res.meta.changes > 0);
  }

  async addDoNotContact(userId: string, email: string, reason: string, source = 'user_action'): Promise<DoNotContactEntry> {
    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1] || '';
    const now = new Date().toISOString();
    const id = `dnc_${crypto.randomUUID()}`;
    await this.db
      .prepare(
        `INSERT INTO do_not_contact (id, user_id, email, domain, reason, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, email) DO UPDATE SET reason = excluded.reason`
      )
      .bind(id, userId, cleanEmail, domain, reason, source, now)
      .run();
    const row = await this.db
      .prepare('SELECT * FROM do_not_contact WHERE user_id = ? AND email = ?')
      .bind(userId, cleanEmail)
      .first<any>();
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      domain: row.domain || undefined,
      reason: row.reason,
      source: row.source,
      createdAt: row.created_at,
    };
  }

  async isDoNotContact(userId: string, email: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const row = await this.db
      .prepare('SELECT id FROM do_not_contact WHERE user_id = ? AND LOWER(email) = ?')
      .bind(userId, cleanEmail)
      .first<any>();
    return Boolean(row);
  }

  async listDoNotContact(userId: string): Promise<DoNotContactEntry[]> {
    const res = await this.db
      .prepare('SELECT * FROM do_not_contact WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<any>();
    return (res.results || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      email: r.email,
      domain: r.domain || undefined,
      reason: r.reason,
      source: r.source,
      createdAt: r.created_at,
    }));
  }

  async removeDoNotContact(userId: string, id: string): Promise<boolean> {
    const res = await this.db.prepare('DELETE FROM do_not_contact WHERE id = ? AND user_id = ?').bind(id, userId).run();
    return Boolean(res.meta?.changes && res.meta.changes > 0);
  }

  async findOutreachMessageByIdempotencyKey(userId: string, idempotencyKey: string): Promise<OutreachMessage | null> {
    const row = await this.db
      .prepare('SELECT * FROM outreach_messages WHERE user_id = ? AND idempotency_key = ?')
      .bind(userId, idempotencyKey)
      .first<any>();
    return row ? mapOutreachMessageRow(row) : null;
  }

  async createOutreachMessage(params: {
    userId: string;
    contactId: string;
    campaignId?: string;
    emailAccountId?: string;
    jobId?: string;
    companyName: string;
    jobTitle?: string;
    recipientEmail: string;
    recipientName?: string;
    templateType: OutreachTemplateType;
    tone: OutreachEmailTone;
    subject: string;
    bodyText: string;
    resumeDocumentId?: string;
    resumeFileName?: string;
    resumeFileSize?: number;
    status?: OutreachMessageStatus;
    explicitUserApproval?: boolean;
    idempotencyKey?: string;
  }): Promise<OutreachMessage> {
    const id = `omsg_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const approvedAt = params.explicitUserApproval ? now : null;
    await this.db
      .prepare(
        `INSERT INTO outreach_messages (
           id, user_id, contact_id, campaign_id, email_account_id, job_id, company_name, job_title,
           recipient_email, recipient_name, template_type, tone, subject, body_text,
           resume_document_id, resume_file_name, resume_file_size, status,
           explicit_user_approval, approved_at, idempotency_key, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        params.userId,
        params.contactId,
        params.campaignId || null,
        params.emailAccountId || null,
        params.jobId || null,
        params.companyName,
        params.jobTitle || null,
        params.recipientEmail.trim().toLowerCase(),
        params.recipientName || null,
        params.templateType,
        params.tone,
        params.subject,
        params.bodyText,
        params.resumeDocumentId || null,
        params.resumeFileName || null,
        params.resumeFileSize || null,
        params.status || 'draft',
        params.explicitUserApproval ? 1 : 0,
        approvedAt,
        params.idempotencyKey || null,
        now,
        now
      )
      .run();

    await this.recordOutreachEvent(params.userId, id, 'draft_created', {
      recipientEmail: params.recipientEmail,
      templateType: params.templateType,
    });

    return (await this.getOutreachMessageById(params.userId, id))!;
  }

  async updateOutreachMessage(
    userId: string,
    messageId: string,
    patch: Partial<{
      emailAccountId: string;
      subject: string;
      bodyText: string;
      resumeDocumentId: string;
      resumeFileName: string;
      resumeFileSize: number;
      status: OutreachMessageStatus;
      explicitUserApproval: boolean;
      approvedAt: string;
      provider: string;
      providerMessageId: string;
      providerThreadId: string;
      errorMessage: string;
      sentAt: string;
      repliedAt: string;
      followUpDueAt: string;
      replySummary: string;
      suggestedReply: string;
    }>
  ): Promise<OutreachMessage | null> {
    const cur = await this.getOutreachMessageById(userId, messageId);
    if (!cur) return null;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE outreach_messages
         SET email_account_id = ?, subject = ?, body_text = ?, resume_document_id = ?,
             resume_file_name = ?, resume_file_size = ?, status = ?, explicit_user_approval = ?,
             approved_at = ?, provider = ?, provider_message_id = ?, provider_thread_id = ?,
             error_message = ?, sent_at = ?, replied_at = ?, follow_up_due_at = ?,
             reply_summary = ?, suggested_reply = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .bind(
        patch.emailAccountId ?? cur.emailAccountId ?? null,
        patch.subject ?? cur.subject,
        patch.bodyText ?? cur.bodyText,
        patch.resumeDocumentId ?? cur.resumeDocumentId ?? null,
        patch.resumeFileName ?? cur.resumeFileName ?? null,
        patch.resumeFileSize ?? cur.resumeFileSize ?? null,
        patch.status ?? cur.status,
        (patch.explicitUserApproval ?? cur.explicitUserApproval) ? 1 : 0,
        patch.approvedAt ?? cur.approvedAt ?? null,
        patch.provider ?? cur.provider ?? null,
        patch.providerMessageId ?? cur.providerMessageId ?? null,
        patch.providerThreadId ?? cur.providerThreadId ?? null,
        patch.errorMessage ?? cur.errorMessage ?? null,
        patch.sentAt ?? cur.sentAt ?? null,
        patch.repliedAt ?? cur.repliedAt ?? null,
        patch.followUpDueAt ?? cur.followUpDueAt ?? null,
        patch.replySummary ?? cur.replySummary ?? null,
        patch.suggestedReply ?? cur.suggestedReply ?? null,
        now,
        messageId,
        userId
      )
      .run();

    return this.getOutreachMessageById(userId, messageId);
  }

  async getOutreachMessageById(userId: string, messageId: string): Promise<OutreachMessage | null> {
    const row = await this.db
      .prepare('SELECT * FROM outreach_messages WHERE id = ? AND user_id = ?')
      .bind(messageId, userId)
      .first<any>();
    return row ? mapOutreachMessageRow(row) : null;
  }

  async listOutreachMessages(userId: string, filters?: { status?: string; limit?: number }): Promise<OutreachMessage[]> {
    const limit = Math.min(200, Number(filters?.limit || 100));
    if (filters?.status && filters.status !== 'all') {
      const res = await this.db
        .prepare('SELECT * FROM outreach_messages WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT ?')
        .bind(userId, filters.status, limit)
        .all<any>();
      return (res.results || []).map(mapOutreachMessageRow);
    }
    const res = await this.db
      .prepare('SELECT * FROM outreach_messages WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?')
      .bind(userId, limit)
      .all<any>();
    return (res.results || []).map(mapOutreachMessageRow);
  }

  async countSentMessagesInWindow(userId: string, days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) as c FROM outreach_messages
         WHERE user_id = ? AND sent_at IS NOT NULL AND sent_at >= ?
         AND status IN ('sent', 'provider_accepted', 'delivered', 'replied', 'follow_up_due', 'closed')`
      )
      .bind(userId, since)
      .first<any>();
    return Number(row?.c || 0);
  }

  async recordOutreachEvent(
    userId: string,
    messageId: string,
    eventType: string,
    payload: Record<string, unknown>,
    providerEventId?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO outreach_events (id, message_id, user_id, event_type, provider_event_id, payload_json, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        `oevt_${crypto.randomUUID()}`,
        messageId,
        userId,
        eventType,
        providerEventId || null,
        JSON.stringify(payload),
        now
      )
      .run();
  }

  async listOutreachEvents(userId: string, messageId: string): Promise<OutreachEvent[]> {
    const res = await this.db
      .prepare('SELECT * FROM outreach_events WHERE user_id = ? AND message_id = ? ORDER BY occurred_at DESC')
      .bind(userId, messageId)
      .all<any>();
    return (res.results || []).map((r) => ({
      id: r.id,
      messageId: r.message_id,
      userId: r.user_id,
      eventType: r.event_type,
      providerEventId: r.provider_event_id || undefined,
      payload: JSON.parse(r.payload_json || '{}'),
      occurredAt: r.occurred_at,
    }));
  }

  async createOutreachCampaign(params: {
    userId: string;
    name: string;
    targetCountry?: string;
    targetRoles?: string[];
    dailyLimit?: number;
    notes?: string;
  }): Promise<OutreachCampaign> {
    const id = `camp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO outreach_campaigns (id, user_id, name, target_country, target_roles, status, daily_limit, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
      )
      .bind(
        id,
        params.userId,
        params.name.trim(),
        params.targetCountry || null,
        JSON.stringify(params.targetRoles || []),
        Math.min(50, Math.max(1, Number(params.dailyLimit || 10))),
        params.notes || null,
        now,
        now
      )
      .run();
    return (await this.getOutreachCampaignById(params.userId, id))!;
  }

  async getOutreachCampaignById(userId: string, campaignId: string): Promise<OutreachCampaign | null> {
    const r = await this.db
      .prepare('SELECT * FROM outreach_campaigns WHERE id = ? AND user_id = ?')
      .bind(campaignId, userId)
      .first<any>();
    if (!r) return null;
    const counts = await this.db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'drafted' THEN 1 ELSE 0 END) as drafted,
           SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
           SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
           SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied
         FROM outreach_campaign_contacts WHERE campaign_id = ? AND user_id = ?`
      )
      .bind(campaignId, userId)
      .first<any>();

    return {
      id: r.id,
      userId: r.user_id,
      name: r.name,
      targetCountry: r.target_country || undefined,
      targetRoles: safeJsonArray(r.target_roles),
      status: r.status,
      dailyLimit: Number(r.daily_limit || 10),
      notes: r.notes || undefined,
      contactsCount: Number(counts?.total || 0),
      draftsCount: Number(counts?.drafted || 0),
      approvedCount: Number(counts?.approved || 0),
      sentCount: Number(counts?.sent || 0),
      repliesCount: Number(counts?.replied || 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async listOutreachCampaigns(userId: string): Promise<OutreachCampaign[]> {
    const res = await this.db
      .prepare('SELECT id FROM outreach_campaigns WHERE user_id = ? ORDER BY updated_at DESC')
      .bind(userId)
      .all<any>();
    const campaigns: OutreachCampaign[] = [];
    for (const r of res.results || []) {
      const c = await this.getOutreachCampaignById(userId, r.id);
      if (c) campaigns.push(c);
    }
    return campaigns;
  }

  async addContactsToCampaign(userId: string, campaignId: string, contactIds: string[], jobId?: string): Promise<number> {
    const camp = await this.getOutreachCampaignById(userId, campaignId);
    if (!camp) throw new Error('Campaign not found or unauthorized.');
    const now = new Date().toISOString();
    let added = 0;
    for (const cid of contactIds) {
      const exists = await this.db.prepare('SELECT id FROM hr_contacts WHERE id = ?').bind(cid).first<any>();
      if (!exists) continue;
      const res = await this.db
        .prepare(
          `INSERT OR IGNORE INTO outreach_campaign_contacts (id, campaign_id, user_id, contact_id, job_id, status, added_at)
           VALUES (?, ?, ?, ?, ?, 'queued', ?)`
        )
        .bind(`occ_${crypto.randomUUID()}`, campaignId, userId, cid, jobId || null, now)
        .run();
      if (res.meta?.changes && res.meta.changes > 0) added++;
    }
    await this.db
      .prepare('UPDATE outreach_campaigns SET updated_at = ? WHERE id = ? AND user_id = ?')
      .bind(now, campaignId, userId)
      .run();
    return added;
  }

  async getCampaignContacts(userId: string, campaignId: string): Promise<OutreachCampaignContact[]> {
    const res = await this.db
      .prepare(
        `SELECT occ.*, hc.company_name, hc.contact_name, hc.designation, hc.role_category, hc.email, hc.country, hc.email_verification_status, hc.source_type, hc.source_url, hc.contact_confidence, hc.evidence, hc.discovered_at, hc.is_role_based, hc.contact_status, hc.associated_job_ids, hc.created_at, hc.updated_at
         FROM outreach_campaign_contacts occ
         JOIN hr_contacts hc ON hc.id = occ.contact_id
         WHERE occ.campaign_id = ? AND occ.user_id = ?
         ORDER BY occ.added_at DESC`
      )
      .bind(campaignId, userId)
      .all<any>();
    return (res.results || []).map((r) => ({
      id: r.id,
      campaignId: r.campaign_id,
      userId: r.user_id,
      contactId: r.contact_id,
      jobId: r.job_id || undefined,
      status: r.status,
      addedAt: r.added_at,
      contact: mapHrContactRow(r),
    }));
  }

  async getOverviewCounts(userId: string) {
    const safeCount = async (q: string, ...binds: any[]) => {
      try {
        const r = await this.db.prepare(q).bind(...binds).first<any>();
        return Number(r?.c || 0);
      } catch {
        return 0;
      }
    };

    const [contactsDiscovered, verifiedContacts, domainValidContacts, roleBasedContacts, jobsWithContacts, connectedAccountsCount] =
      await Promise.all([
        safeCount("SELECT COUNT(*) as c FROM hr_contacts WHERE contact_status != 'archived'"),
        safeCount("SELECT COUNT(*) as c FROM hr_contacts WHERE email_verification_status = 'Verified' AND contact_status != 'archived'"),
        safeCount("SELECT COUNT(*) as c FROM hr_contacts WHERE email_verification_status = 'Domain Valid' AND contact_status != 'archived'"),
        safeCount("SELECT COUNT(*) as c FROM hr_contacts WHERE email_verification_status = 'Role-Based' AND contact_status != 'archived'"),
        safeCount(
          `SELECT COUNT(DISTINCT j.id) as c FROM live_jobs_cache j
           WHERE EXISTS (
             SELECT 1 FROM hr_contacts h
             WHERE h.contact_status != 'archived'
               AND (h.associated_job_ids LIKE '%' || j.id || '%' OR LOWER(h.company_name) = LOWER(j.company))
           )`
        ),
        safeCount("SELECT COUNT(*) as c FROM email_accounts WHERE user_id = ? AND status = 'connected'", userId),
      ]);

    const msgStats = await this.db
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'draft' OR status = 'approved' THEN 1 ELSE 0 END) as drafted,
           SUM(CASE WHEN status IN ('sent', 'provider_accepted', 'delivered', 'replied', 'follow_up_due', 'closed') THEN 1 ELSE 0 END) as sent,
           SUM(CASE WHEN status = 'provider_accepted' THEN 1 ELSE 0 END) as accepted,
           SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
           SUM(CASE WHEN status IN ('bounced', 'failed') THEN 1 ELSE 0 END) as failed,
           SUM(CASE WHEN status = 'replied' OR replied_at IS NOT NULL THEN 1 ELSE 0 END) as replied,
           SUM(CASE WHEN status = 'follow_up_due' THEN 1 ELSE 0 END) as follow_up_due
         FROM outreach_messages WHERE user_id = ?`
      )
      .bind(userId)
      .first<any>();

    return {
      contactsDiscovered,
      verifiedContacts,
      domainValidContacts,
      roleBasedContacts,
      jobsWithContacts,
      emailsDrafted: Number(msgStats?.drafted || 0),
      emailsSent: Number(msgStats?.sent || 0),
      providerAcceptedCount: Number(msgStats?.accepted || 0),
      deliveredCount: Number(msgStats?.delivered || 0),
      bouncedOrFailedCount: Number(msgStats?.failed || 0),
      repliesReceived: Number(msgStats?.replied || 0),
      positiveResponses: Number(msgStats?.replied || 0),
      followUpsDue: Number(msgStats?.follow_up_due || 0),
      connectedAccountsCount,
    };
  }
}
