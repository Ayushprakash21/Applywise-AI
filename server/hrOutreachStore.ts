// server/hrOutreachStore.ts
// Relational SQLite Persistence Layer for AI HR Outreach & Direct Application Automation
// Enforces candidate tenant isolation, OAuth token encryption, duplicate prevention, and full provenance.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sqlite } from './authAndStore.ts';
import {
  ContactDiscoveryRun,
  DoNotContactEntry,
  EmailAccountProvider,
  EmailAccountSummary,
  EmailVerificationLevels,
  EmailVerificationStatus,
  HrContact,
  HrContactClassificationType,
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

// Ensure all HR Outreach tables exist idempotently in local SQLite
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS resume_file_blobs (
    resume_id TEXT PRIMARY KEY REFERENCES resume_documents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    data_base64 TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_resume_blobs_user ON resume_file_blobs(user_id);

  CREATE TABLE IF NOT EXISTS hr_contacts (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES company_directory(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    company_website TEXT,
    contact_name TEXT,
    designation TEXT NOT NULL,
    role_category TEXT NOT NULL DEFAULT 'General Recruitment Contact',
    email TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Global',
    city TEXT,
    department TEXT,
    source_type TEXT NOT NULL,
    source_url TEXT NOT NULL,
    associated_job_ids TEXT NOT NULL DEFAULT '[]',
    email_verification_status TEXT NOT NULL DEFAULT 'Discovered',
    contact_confidence REAL NOT NULL DEFAULT 0.5,
    evidence TEXT NOT NULL DEFAULT '',
    discovered_at TEXT NOT NULL,
    last_verified_at TEXT,
    last_contacted_at TEXT,
    contact_status TEXT NOT NULL DEFAULT 'active',
    is_role_based INTEGER NOT NULL DEFAULT 0,
    dedupe_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_hr_contacts_email ON hr_contacts(email);
  CREATE INDEX IF NOT EXISTS idx_hr_contacts_company ON hr_contacts(company_name);
  CREATE INDEX IF NOT EXISTS idx_hr_contacts_country ON hr_contacts(country);
  CREATE INDEX IF NOT EXISTS idx_hr_contacts_verification ON hr_contacts(email_verification_status);

  CREATE TABLE IF NOT EXISTS hr_contact_sources (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL REFERENCES hr_contacts(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    extracted_snippet TEXT,
    confidence_score REAL NOT NULL DEFAULT 0.5,
    discovered_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_hr_contact_sources_contact ON hr_contact_sources(contact_id);

  CREATE TABLE IF NOT EXISTS email_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_expires_at TEXT,
    scopes TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'connected',
    last_error TEXT,
    last_synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, provider, email)
  );
  CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id, status);

  CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_country TEXT,
    target_roles TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    daily_limit INTEGER NOT NULL DEFAULT 10,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_user ON outreach_campaigns(user_id, status);

  CREATE TABLE IF NOT EXISTS outreach_campaign_contacts (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id TEXT NOT NULL REFERENCES hr_contacts(id) ON DELETE CASCADE,
    job_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    added_at TEXT NOT NULL,
    UNIQUE(campaign_id, contact_id)
  );

  CREATE TABLE IF NOT EXISTS outreach_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id TEXT NOT NULL REFERENCES hr_contacts(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES outreach_campaigns(id) ON DELETE SET NULL,
    email_account_id TEXT REFERENCES email_accounts(id) ON DELETE SET NULL,
    job_id TEXT,
    company_name TEXT NOT NULL,
    job_title TEXT,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    template_type TEXT NOT NULL DEFAULT 'Direct Job Application',
    tone TEXT NOT NULL DEFAULT 'Professional',
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    resume_document_id TEXT,
    resume_file_name TEXT,
    resume_file_size INTEGER,
    status TEXT NOT NULL DEFAULT 'draft',
    explicit_user_approval INTEGER NOT NULL DEFAULT 0,
    approved_at TEXT,
    idempotency_key TEXT UNIQUE,
    provider TEXT,
    provider_message_id TEXT,
    provider_thread_id TEXT,
    error_message TEXT,
    sent_at TEXT,
    replied_at TEXT,
    follow_up_due_at TEXT,
    reply_summary TEXT,
    suggested_reply TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_outreach_messages_user ON outreach_messages(user_id, status);

  CREATE TABLE IF NOT EXISTS outreach_events (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES outreach_messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    provider_event_id TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}',
    occurred_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS do_not_contact (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    domain TEXT,
    reason TEXT NOT NULL DEFAULT 'Candidate opt-out / suppression',
    source TEXT NOT NULL DEFAULT 'user_action',
    created_at TEXT NOT NULL,
    UNIQUE(user_id, email)
  );

  CREATE TABLE IF NOT EXISTS contact_discovery_runs (
    id TEXT PRIMARY KEY,
    triggered_by TEXT NOT NULL,
    company_id TEXT,
    company_name TEXT,
    job_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    sources_scanned INTEGER NOT NULL DEFAULT 0,
    contacts_discovered INTEGER NOT NULL DEFAULT 0,
    contacts_verified INTEGER NOT NULL DEFAULT 0,
    duplicates_skipped INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    checkpoint TEXT,
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS hr_contact_job_links (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL REFERENCES hr_contacts(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL,
    company_id TEXT,
    link_type TEXT NOT NULL DEFAULT 'company_only',
    relevance_score INTEGER NOT NULL DEFAULT 0,
    evidence TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(contact_id, job_id)
  );
  CREATE INDEX IF NOT EXISTS idx_hcjl_contact ON hr_contact_job_links(contact_id);
  CREATE INDEX IF NOT EXISTS idx_hcjl_job ON hr_contact_job_links(job_id);

  CREATE TABLE IF NOT EXISTS hr_contact_discovery_queue (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE,
    company_id TEXT,
    company_name TEXT NOT NULL,
    source TEXT NOT NULL,
    job_url TEXT,
    description_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    diagnostic_category TEXT,
    failure_reason TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TEXT,
    emails_extracted INTEGER NOT NULL DEFAULT 0,
    emails_accepted INTEGER NOT NULL DEFAULT 0,
    last_processed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_hcdq_status ON hr_contact_discovery_queue(status, next_retry_at);
  CREATE INDEX IF NOT EXISTS idx_hcdq_source ON hr_contact_discovery_queue(source);

  CREATE TABLE IF NOT EXISTS hr_contact_discovery_runs (
    id TEXT PRIMARY KEY,
    triggered_by TEXT NOT NULL,
    trigger_type TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'running',
    jobs_scanned INTEGER NOT NULL DEFAULT 0,
    descriptions_inspected INTEGER NOT NULL DEFAULT 0,
    company_pages_inspected INTEGER NOT NULL DEFAULT 0,
    emails_extracted INTEGER NOT NULL DEFAULT 0,
    valid_syntax_count INTEGER NOT NULL DEFAULT 0,
    domains_validated_count INTEGER NOT NULL DEFAULT 0,
    mx_validated_count INTEGER NOT NULL DEFAULT 0,
    source_confirmed_count INTEGER NOT NULL DEFAULT 0,
    duplicates_skipped INTEGER NOT NULL DEFAULT 0,
    invalid_rejected INTEGER NOT NULL DEFAULT 0,
    sources_failing INTEGER NOT NULL DEFAULT 0,
    source_breakdown_json TEXT NOT NULL DEFAULT '{}',
    error_summary TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS hr_contact_verification_events (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL REFERENCES hr_contacts(id) ON DELETE CASCADE,
    syntax_valid INTEGER NOT NULL DEFAULT 0,
    domain_valid INTEGER NOT NULL DEFAULT 0,
    mx_valid INTEGER NOT NULL DEFAULT 0,
    mx_hosts_json TEXT NOT NULL DEFAULT '[]',
    source_confirmed INTEGER NOT NULL DEFAULT 0,
    mailbox_verified INTEGER NOT NULL DEFAULT 0,
    resulting_status TEXT NOT NULL,
    evidence TEXT,
    checked_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS hr_contact_suppression (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id TEXT REFERENCES hr_contacts(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    normalized_email TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT 'Candidate opt-out / suppression',
    source TEXT NOT NULL DEFAULT 'user_action',
    created_at TEXT NOT NULL,
    UNIQUE(user_id, normalized_email)
  );
`);

// Additive column migration guards for existing SQLite databases
try {
  const cols = new Set((sqlite.prepare('PRAGMA table_info(hr_contacts)').all() as Array<{ name: string }>).map((c) => c.name));
  if (!cols.has('normalized_email')) sqlite.exec('ALTER TABLE hr_contacts ADD COLUMN normalized_email TEXT;');
  if (!cols.has('contact_type')) sqlite.exec("ALTER TABLE hr_contacts ADD COLUMN contact_type TEXT NOT NULL DEFAULT 'Unknown';");
  if (!cols.has('source_evidence')) sqlite.exec('ALTER TABLE hr_contacts ADD COLUMN source_evidence TEXT;');
  if (!cols.has('associated_job_id')) sqlite.exec('ALTER TABLE hr_contacts ADD COLUMN associated_job_id TEXT;');
  if (!cols.has('last_seen_at')) sqlite.exec('ALTER TABLE hr_contacts ADD COLUMN last_seen_at TEXT;');
  if (!cols.has('level_syntax')) sqlite.exec('ALTER TABLE hr_contacts ADD COLUMN level_syntax INTEGER NOT NULL DEFAULT 0;');
  if (!cols.has('level_domain')) sqlite.exec('ALTER TABLE hr_contacts ADD COLUMN level_domain INTEGER NOT NULL DEFAULT 0;');
  if (!cols.has('level_mx')) sqlite.exec('ALTER TABLE hr_contacts ADD COLUMN level_mx INTEGER NOT NULL DEFAULT 0;');
  if (!cols.has('level_source_confirmed')) sqlite.exec('ALTER TABLE hr_contacts ADD COLUMN level_source_confirmed INTEGER NOT NULL DEFAULT 0;');
  if (!cols.has('level_mailbox')) sqlite.exec('ALTER TABLE hr_contacts ADD COLUMN level_mailbox INTEGER NOT NULL DEFAULT 0;');
  if (!cols.has('is_user_submitted')) sqlite.exec('ALTER TABLE hr_contacts ADD COLUMN is_user_submitted INTEGER NOT NULL DEFAULT 0;');
  if (!cols.has('submitted_by_user_id')) sqlite.exec('ALTER TABLE hr_contacts ADD COLUMN submitted_by_user_id TEXT;');
} catch {
  // Ignore if already applied
}

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

export function mapHrContactRow(row: any): HrContact {
  const levels: EmailVerificationLevels | undefined =
    row.level_syntax !== undefined
      ? {
          level1SyntaxValid: Boolean(row.level_syntax),
          level2DomainExists: Boolean(row.level_domain),
          level3MxAvailable: row.level_mx === null || row.level_mx === undefined ? null : Boolean(row.level_mx),
          level4SourceEvidenceConfirmed: Boolean(row.level_source_confirmed),
          level5MailboxVerified: Boolean(row.level_mailbox),
        }
      : undefined;

  return {
    id: row.id,
    companyId: row.company_id || undefined,
    companyName: row.company_name,
    companyWebsite: row.company_website || undefined,
    contactName: row.contact_name || undefined,
    designation: row.designation,
    roleCategory: row.role_category as HrContactRoleCategory,
    contactType: (row.contact_type || 'Unknown') as HrContactClassificationType,
    email: row.email,
    normalizedEmail: row.normalized_email || row.email,
    country: row.country || 'Global',
    city: row.city || undefined,
    department: row.department || undefined,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    associatedJobId: row.associated_job_id || undefined,
    associatedJobIds: safeJsonArray(row.associated_job_ids),
    emailVerificationStatus: row.email_verification_status as EmailVerificationStatus,
    verificationLevels: levels,
    contactConfidence: Number(row.contact_confidence ?? 0.5),
    evidence: row.evidence || row.source_evidence || '',
    sourceEvidence: row.source_evidence || row.evidence || '',
    discoveredAt: row.discovered_at,
    lastVerifiedAt: row.last_verified_at || undefined,
    lastSeenAt: row.last_seen_at || row.discovered_at,
    lastContactedAt: row.last_contacted_at || undefined,
    contactStatus: (row.contact_status || 'active') as HrContact['contactStatus'],
    isRoleBased: Boolean(row.is_role_based),
    isUserSubmitted: Boolean(row.is_user_submitted),
    submittedByUserId: row.submitted_by_user_id || undefined,
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

export const hrOutreachStore = {
  // --- RESUME BLOB & ATTACHMENT ENGINE ---
  saveResumeFileBlob(params: {
    resumeId: string;
    userId: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    dataBase64: string;
  }): void {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO resume_file_blobs (resume_id, user_id, file_name, mime_type, file_size_bytes, data_base64, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(resume_id) DO UPDATE SET
           file_name = excluded.file_name,
           mime_type = excluded.mime_type,
           file_size_bytes = excluded.file_size_bytes,
           data_base64 = excluded.data_base64`
      )
      .run(params.resumeId, params.userId, params.fileName, params.mimeType, params.fileSizeBytes, params.dataBase64, now);
  },

  getResumeFileBlobForUser(userId: string, resumeId: string): {
    resumeId: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    buffer: Buffer;
  } | null {
    const blob = sqlite
      .prepare('SELECT * FROM resume_file_blobs WHERE resume_id = ? AND user_id = ?')
      .get(resumeId, userId) as any;
    if (blob) {
      return {
        resumeId: blob.resume_id,
        fileName: blob.file_name,
        mimeType: blob.mime_type,
        fileSizeBytes: Number(blob.file_size_bytes),
        buffer: Buffer.from(blob.data_base64, 'base64'),
      };
    }

    // Fallback to disk storage_key from resume_documents if present
    const doc = sqlite
      .prepare('SELECT id, user_id, file_name, file_type, mime_type, file_size_bytes, storage_key FROM resume_documents WHERE id = ? AND user_id = ?')
      .get(resumeId, userId) as any;
    if (doc && doc.storage_key) {
      const resolved = path.resolve(process.cwd(), doc.storage_key);
      if (fs.existsSync(resolved)) {
        const buf = fs.readFileSync(resolved);
        const mime =
          doc.mime_type ||
          (doc.file_name.toLowerCase().endsWith('.pdf')
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        return {
          resumeId: doc.id,
          fileName: doc.file_name,
          mimeType: mime,
          fileSizeBytes: buf.length,
          buffer: buf,
        };
      }
    }
    return null;
  },

  listCandidateResumeAttachments(userId: string): ResumeAttachmentOption[] {
    const docs = sqlite
      .prepare(
        `SELECT d.id, d.file_name, d.file_type, d.mime_type, d.file_size_bytes, d.storage_key, d.created_at,
                (b.resume_id IS NOT NULL) as has_blob
         FROM resume_documents d
         LEFT JOIN resume_file_blobs b ON b.resume_id = d.id AND b.user_id = d.user_id
         WHERE d.user_id = ?
         ORDER BY d.created_at DESC`
      )
      .all(userId) as any[];

    const options: ResumeAttachmentOption[] = docs.map((d, idx) => {
      const mime =
        d.mime_type ||
        (String(d.file_name).toLowerCase().endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf');
      let hasDisk = false;
      if (!d.has_blob && d.storage_key) {
        try {
          hasDisk = fs.existsSync(path.resolve(process.cwd(), d.storage_key));
        } catch {
          hasDisk = false;
        }
      }
      return {
        id: d.id,
        sourceType: 'uploaded_document',
        fileName: d.file_name,
        mimeType: mime,
        fileSizeBytes: Number(d.file_size_bytes || 0),
        createdAt: d.created_at,
        hasBinaryPreview: Boolean(d.has_blob || hasDisk),
        isDefault: idx === 0,
      };
    });

    // Also include tailored resumes linked to applications
    const apps = sqlite
      .prepare('SELECT id, company, role, updated_at, data FROM applications WHERE user_id = ? ORDER BY updated_at DESC LIMIT 25')
      .all(userId) as any[];

    for (const a of apps) {
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
  },

  // --- HR CONTACTS & PROVENANCE ---
  upsertHrContact(params: {
    companyId?: string;
    companyName: string;
    companyWebsite?: string;
    contactName?: string;
    designation: string;
    roleCategory: HrContactRoleCategory;
    contactType?: HrContactClassificationType;
    email: string;
    country: string;
    city?: string;
    department?: string;
    sourceType: string;
    sourceName: string;
    sourceUrl: string;
    associatedJobId?: string;
    associatedJobIds?: string[];
    linkType?: 'direct_posting' | 'recruitment_page' | 'department_relationship' | 'company_only' | 'user_submitted';
    emailVerificationStatus: EmailVerificationStatus;
    verificationLevels?: EmailVerificationLevels;
    mxHosts?: string[];
    contactConfidence: number;
    evidence: string;
    sourceEvidence?: string;
    isRoleBased: boolean;
    lastVerifiedAt?: string;
    lastSeenAt?: string;
    isUserSubmitted?: boolean;
    submittedByUserId?: string;
  }): { contact: HrContact; created: boolean } {
    const normalizedEmail = params.email.trim().toLowerCase();
    const isUserSub = Boolean(params.isUserSubmitted && params.submittedByUserId);
    const dedupeKey = isUserSub ? `${normalizedEmail}::user::${params.submittedByUserId}` : normalizedEmail;
    const now = new Date().toISOString();
    const incomingJobs = Array.from(
      new Set([
        ...(params.associatedJobId ? [params.associatedJobId] : []),
        ...(params.associatedJobIds || []),
      ].filter(Boolean))
    );
    const linkType = params.linkType || (isUserSub ? 'user_submitted' : incomingJobs.length > 0 ? 'direct_posting' : 'company_only');
    const statusPriority: Record<string, number> = {
      'Mailbox Verified': 7,
      Verified: 7,
      'Source Confirmed': 6,
      'MX Valid': 5,
      'Domain Valid': 4,
      'Role-Based': 3,
      Unverified: 2,
      Stale: 1,
      'Verification Failed': 1,
      Invalid: 0,
    };

    const existing = sqlite.prepare('SELECT * FROM hr_contacts WHERE dedupe_key = ?').get(dedupeKey) as any;

    const upsertJobLinks = (contactId: string, jobIds: string[]) => {
      if (jobIds.length === 0) return;
      const linkStmt = sqlite.prepare(
        `INSERT INTO hr_contact_job_links (id, contact_id, job_id, company_id, link_type, relevance_score, evidence, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(contact_id, job_id) DO UPDATE SET
           link_type = CASE WHEN excluded.link_type = 'direct_posting' THEN 'direct_posting' ELSE hr_contact_job_links.link_type END,
           relevance_score = MAX(hr_contact_job_links.relevance_score, excluded.relevance_score),
           evidence = COALESCE(excluded.evidence, hr_contact_job_links.evidence)`
      );
      for (const jid of jobIds) {
        linkStmt.run(
          `hcjl_${crypto.randomUUID()}`,
          contactId,
          jid,
          params.companyId || null,
          linkType,
          Math.round(params.contactConfidence * 100),
          (params.sourceEvidence || params.evidence).slice(0, 500),
          now
        );
      }
    };

    const recordVerificationEvent = (contactId: string, status: EmailVerificationStatus) => {
      if (!params.verificationLevels) return;
      sqlite
        .prepare(
          `INSERT INTO hr_contact_verification_events (
             id, contact_id, syntax_valid, domain_valid, mx_valid, mx_hosts_json,
             source_confirmed, mailbox_verified, resulting_status, evidence, checked_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `hcve_${crypto.randomUUID()}`,
          contactId,
          params.verificationLevels.level1SyntaxValid ? 1 : 0,
          params.verificationLevels.level2DomainExists ? 1 : 0,
          params.verificationLevels.level3MxAvailable ? 1 : 0,
          JSON.stringify(params.mxHosts || []),
          params.verificationLevels.level4SourceEvidenceConfirmed ? 1 : 0,
          params.verificationLevels.level5MailboxVerified ? 1 : 0,
          status,
          (params.sourceEvidence || params.evidence).slice(0, 500),
          params.lastVerifiedAt || now
        );
    };

    if (existing) {
      const mergedJobs = Array.from(
        new Set([...safeJsonArray(existing.associated_job_ids), ...incomingJobs])
      );
      const nextConfidence = Math.max(Number(existing.contact_confidence || 0), params.contactConfidence);
      const nextName = existing.contact_name || params.contactName || null;
      const existingPri = statusPriority[String(existing.email_verification_status)] ?? 0;
      const incomingPri = statusPriority[String(params.emailVerificationStatus)] ?? 0;
      const nextVerification =
        incomingPri >= existingPri ? params.emailVerificationStatus : existing.email_verification_status;
      const levels = params.verificationLevels;

      sqlite
        .prepare(
          `UPDATE hr_contacts
           SET company_id = COALESCE(company_id, ?),
               company_website = COALESCE(company_website, ?),
               contact_name = COALESCE(contact_name, ?),
               contact_type = CASE WHEN COALESCE(contact_type, 'Unknown') = 'Unknown' THEN COALESCE(?, 'Unknown') ELSE contact_type END,
               normalized_email = COALESCE(normalized_email, ?),
               source_evidence = COALESCE(?, source_evidence),
               associated_job_id = COALESCE(associated_job_id, ?),
               associated_job_ids = ?,
               contact_confidence = ?,
               email_verification_status = ?,
               level_syntax = CASE WHEN ? IS NOT NULL THEN ? ELSE level_syntax END,
               level_domain = CASE WHEN ? IS NOT NULL THEN ? ELSE level_domain END,
               level_mx = CASE WHEN ? IS NOT NULL THEN ? ELSE level_mx END,
               level_source_confirmed = CASE WHEN ? IS NOT NULL THEN MAX(COALESCE(level_source_confirmed, 0), ?) ELSE level_source_confirmed END,
               level_mailbox = CASE WHEN ? IS NOT NULL THEN MAX(COALESCE(level_mailbox, 0), ?) ELSE level_mailbox END,
               last_verified_at = COALESCE(?, last_verified_at),
               last_seen_at = ?,
               updated_at = ?
           WHERE id = ?`
        )
        .run(
          params.companyId || null,
          params.companyWebsite || null,
          nextName,
          params.contactType || 'Unknown',
          normalizedEmail,
          params.sourceEvidence || params.evidence,
          params.associatedJobId || incomingJobs[0] || null,
          JSON.stringify(mergedJobs),
          nextConfidence,
          nextVerification,
          levels ? 1 : null,
          levels?.level1SyntaxValid ? 1 : 0,
          levels ? 1 : null,
          levels?.level2DomainExists ? 1 : 0,
          levels ? 1 : null,
          levels?.level3MxAvailable ? 1 : 0,
          levels ? 1 : null,
          levels?.level4SourceEvidenceConfirmed ? 1 : 0,
          levels ? 1 : null,
          levels?.level5MailboxVerified ? 1 : 0,
          params.lastVerifiedAt || null,
          params.lastSeenAt || now,
          now,
          existing.id
        );

      const srcExists = sqlite
        .prepare('SELECT id FROM hr_contact_sources WHERE contact_id = ? AND source_url = ?')
        .get(existing.id, params.sourceUrl);
      if (!srcExists) {
        sqlite
          .prepare(
            `INSERT INTO hr_contact_sources (id, contact_id, source_type, source_name, source_url, extracted_snippet, confidence_score, discovered_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            `hcs_${crypto.randomUUID()}`,
            existing.id,
            params.sourceType,
            params.sourceName,
            params.sourceUrl,
            (params.sourceEvidence || params.evidence).slice(0, 500),
            params.contactConfidence,
            now
          );
      }

      upsertJobLinks(existing.id, incomingJobs);
      recordVerificationEvent(existing.id, nextVerification as EmailVerificationStatus);

      const updated = sqlite.prepare('SELECT * FROM hr_contacts WHERE id = ?').get(existing.id) as any;
      return { contact: mapHrContactRow(updated), created: false };
    }

    const id = `hrc_${crypto.randomUUID()}`;
    const levels = params.verificationLevels;
    sqlite
      .prepare(
        `INSERT INTO hr_contacts (
           id, company_id, company_name, company_website, contact_name, designation, role_category, contact_type,
           email, normalized_email, country, city, department, source_type, source_url,
           associated_job_id, associated_job_ids, email_verification_status, contact_confidence, evidence, source_evidence,
           discovered_at, last_verified_at, last_seen_at, contact_status, is_role_based,
           level_syntax, level_domain, level_mx, level_source_confirmed, level_mailbox,
           is_user_submitted, submitted_by_user_id, dedupe_key, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        params.companyId || null,
        params.companyName,
        params.companyWebsite || null,
        params.contactName || null,
        params.designation,
        params.roleCategory,
        params.contactType || 'Unknown',
        normalizedEmail,
        normalizedEmail,
        params.country || 'Global',
        params.city || null,
        params.department || null,
        params.sourceType,
        params.sourceUrl,
        params.associatedJobId || incomingJobs[0] || null,
        JSON.stringify(incomingJobs),
        params.emailVerificationStatus,
        params.contactConfidence,
        params.evidence,
        params.sourceEvidence || params.evidence,
        now,
        params.lastVerifiedAt || null,
        params.lastSeenAt || now,
        params.isRoleBased ? 1 : 0,
        levels?.level1SyntaxValid ? 1 : 0,
        levels?.level2DomainExists ? 1 : 0,
        levels?.level3MxAvailable ? 1 : 0,
        levels?.level4SourceEvidenceConfirmed ? 1 : 0,
        levels?.level5MailboxVerified ? 1 : 0,
        isUserSub ? 1 : 0,
        isUserSub ? (params.submittedByUserId || null) : null,
        dedupeKey,
        now,
        now
      );

    sqlite
      .prepare(
        `INSERT INTO hr_contact_sources (id, contact_id, source_type, source_name, source_url, extracted_snippet, confidence_score, discovered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `hcs_${crypto.randomUUID()}`,
        id,
        params.sourceType,
        params.sourceName,
        params.sourceUrl,
        (params.sourceEvidence || params.evidence).slice(0, 500),
        params.contactConfidence,
        now
      );

    upsertJobLinks(id, incomingJobs);
    recordVerificationEvent(id, params.emailVerificationStatus);

    const row = sqlite.prepare('SELECT * FROM hr_contacts WHERE id = ?').get(id) as any;
    return { contact: mapHrContactRow(row), created: true };
  },

  listHrContacts(filters?: {
    userId?: string;
    search?: string;
    country?: string;
    company?: string;
    designation?: string;
    contactType?: string;
    verificationStatus?: string;
    sourceType?: string;
    jobId?: string;
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  }): { contacts: HrContact[]; total: number } {
    const clauses: string[] = [];
    const args: any[] = [];

    if (filters?.userId) {
      clauses.push('(COALESCE(is_user_submitted, 0) = 0 OR submitted_by_user_id = ?)');
      args.push(filters.userId);
    } else {
      clauses.push('COALESCE(is_user_submitted, 0) = 0');
    }

    if (!filters?.includeArchived) {
      clauses.push("contact_status != 'archived'");
    }
    if (filters?.search) {
      clauses.push('(LOWER(company_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(contact_name, \'\')) LIKE ? OR LOWER(designation) LIKE ?)');
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
    if (filters?.contactType && filters.contactType !== 'all') {
      clauses.push('contact_type = ?');
      args.push(filters.contactType);
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
      clauses.push('(associated_job_ids LIKE ? OR EXISTS (SELECT 1 FROM hr_contact_job_links l WHERE l.contact_id = hr_contacts.id AND l.job_id = ?))');
      args.push(`%${filters.jobId}%`, filters.jobId);
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const totalRow = sqlite.prepare(`SELECT COUNT(*) as total FROM hr_contacts ${whereSql}`).get(...args) as any;
    const limit = Math.min(200, Math.max(1, Number(filters?.limit || 50)));
    const offset = Math.max(0, Number(filters?.offset || 0));

    const rows = sqlite
      .prepare(
        `SELECT * FROM hr_contacts ${whereSql} ORDER BY contact_confidence DESC, updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(...args, limit, offset) as any[];

    return {
      contacts: rows.map(mapHrContactRow),
      total: Number(totalRow?.total || 0),
    };
  },

  getHrContactById(id: string): { contact: HrContact; sources: HrContactSource[] } | null {
    const row = sqlite.prepare('SELECT * FROM hr_contacts WHERE id = ?').get(id) as any;
    if (!row) return null;
    const sourcesRows = sqlite
      .prepare('SELECT * FROM hr_contact_sources WHERE contact_id = ? ORDER BY discovered_at DESC')
      .all(id) as any[];
    return {
      contact: mapHrContactRow(row),
      sources: sourcesRows.map((s) => ({
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
  },

  updateHrContactVerification(
    id: string,
    status: EmailVerificationStatus,
    isRoleBased: boolean,
    checkedAt: string,
    details?: {
      verificationLevels?: EmailVerificationLevels;
      mxHosts?: string[];
      evidence?: string;
    }
  ): HrContact | null {
    const levels = details?.verificationLevels;
    if (levels) {
      sqlite
        .prepare(
          `UPDATE hr_contacts
           SET email_verification_status = ?, is_role_based = ?, last_verified_at = ?, updated_at = ?,
               level_syntax = ?, level_domain = ?, level_mx = ?,
               level_source_confirmed = MAX(COALESCE(level_source_confirmed, 0), ?),
               level_mailbox = MAX(COALESCE(level_mailbox, 0), ?)
           WHERE id = ?`
        )
        .run(
          status,
          isRoleBased ? 1 : 0,
          checkedAt,
          checkedAt,
          levels.level1SyntaxValid ? 1 : 0,
          levels.level2DomainExists ? 1 : 0,
          levels.level3MxAvailable ? 1 : 0,
          levels.level4SourceEvidenceConfirmed ? 1 : 0,
          levels.level5MailboxVerified ? 1 : 0,
          id
        );

      sqlite
        .prepare(
          `INSERT INTO hr_contact_verification_events (
             id, contact_id, syntax_valid, domain_valid, mx_valid, mx_hosts_json,
             source_confirmed, mailbox_verified, resulting_status, evidence, checked_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `hcve_${crypto.randomUUID()}`,
          id,
          levels.level1SyntaxValid ? 1 : 0,
          levels.level2DomainExists ? 1 : 0,
          levels.level3MxAvailable ? 1 : 0,
          JSON.stringify(details?.mxHosts || []),
          levels.level4SourceEvidenceConfirmed ? 1 : 0,
          levels.level5MailboxVerified ? 1 : 0,
          status,
          (details?.evidence || '').slice(0, 500) || null,
          checkedAt
        );
    } else {
      sqlite
        .prepare(
          `UPDATE hr_contacts
           SET email_verification_status = ?, is_role_based = ?, last_verified_at = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(status, isRoleBased ? 1 : 0, checkedAt, checkedAt, id);
    }
    const row = sqlite.prepare('SELECT * FROM hr_contacts WHERE id = ?').get(id) as any;
    return row ? mapHrContactRow(row) : null;
  },

  updateHrContactStatus(id: string, contactStatus: 'active' | 'archived' | 'suppressed', lastContactedAt?: string): HrContact | null {
    const now = new Date().toISOString();
    if (lastContactedAt) {
      sqlite
        .prepare('UPDATE hr_contacts SET contact_status = ?, last_contacted_at = ?, updated_at = ? WHERE id = ?')
        .run(contactStatus, lastContactedAt, now, id);
    } else {
      sqlite
        .prepare('UPDATE hr_contacts SET contact_status = ?, updated_at = ? WHERE id = ?')
        .run(contactStatus, now, id);
    }
    const row = sqlite.prepare('SELECT * FROM hr_contacts WHERE id = ?').get(id) as any;
    return row ? mapHrContactRow(row) : null;
  },

  // --- BACKGROUND DISCOVERY RUNS ---
  createDiscoveryRun(params: {
    triggeredBy: string;
    companyId?: string;
    companyName?: string;
    jobId?: string;
    status?: ContactDiscoveryRun['status'];
  }): ContactDiscoveryRun {
    const id = `cdrun_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const status = params.status || 'running';
    sqlite
      .prepare(
        `INSERT INTO contact_discovery_runs (id, triggered_by, company_id, company_name, job_id, status, started_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, params.triggeredBy, params.companyId || null, params.companyName || null, params.jobId || null, status, now);
    return this.getDiscoveryRunById(id)!;
  },

  getDiscoveryRunById(id: string): ContactDiscoveryRun | null {
    const r = sqlite.prepare('SELECT * FROM contact_discovery_runs WHERE id = ?').get(id) as any;
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
  },

  updateDiscoveryRun(
    id: string,
    patch: Partial<{
      status: ContactDiscoveryRun['status'];
      sourcesScanned: number;
      contactsDiscovered: number;
      contactsVerified: number;
      duplicatesSkipped: number;
      retryCount: number;
      checkpoint: string;
      errorMessage: string;
      completedAt: string;
    }>
  ): void {
    const cur = this.getDiscoveryRunById(id);
    if (!cur) return;
    sqlite
      .prepare(
        `UPDATE contact_discovery_runs
         SET status = ?, sources_scanned = ?, contacts_discovered = ?, contacts_verified = ?,
             duplicates_skipped = ?, retry_count = ?, checkpoint = ?, error_message = ?, completed_at = ?
         WHERE id = ?`
      )
      .run(
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
      );
  },

  listDiscoveryRuns(limit = 20): ContactDiscoveryRun[] {
    const rows = sqlite
      .prepare('SELECT * FROM contact_discovery_runs ORDER BY started_at DESC LIMIT ?')
      .all(limit) as any[];
    return rows.map((r) => ({
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
  },

  // --- OAUTH STATES & ENCRYPTED EMAIL ACCOUNTS ---
  createOAuthState(userId: string, provider: EmailAccountProvider, redirectUri: string, state: string, ttlSeconds = 600): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    sqlite
      .prepare('INSERT INTO oauth_states (state, user_id, provider, redirect_uri, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(state, userId, provider, redirectUri, expiresAt, now.toISOString());
  },

  consumeOAuthState(state: string, userId: string, provider: EmailAccountProvider): { redirectUri: string } | null {
    const row = sqlite
      .prepare('SELECT * FROM oauth_states WHERE state = ? AND user_id = ? AND provider = ?')
      .get(state, userId, provider) as any;
    if (!row) return null;
    sqlite.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
    if (Date.parse(row.expires_at) < Date.now()) {
      return null;
    }
    return { redirectUri: row.redirect_uri };
  },

  upsertEmailAccount(params: {
    userId: string;
    provider: EmailAccountProvider;
    email: string;
    displayName?: string;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string;
    tokenExpiresAt?: string;
    scopes: string[];
  }): EmailAccountSummary {
    const now = new Date().toISOString();
    const cleanEmail = params.email.trim().toLowerCase();
    const existing = sqlite
      .prepare('SELECT id FROM email_accounts WHERE user_id = ? AND provider = ? AND email = ?')
      .get(params.userId, params.provider, cleanEmail) as any;

    const id = existing?.id || `emacc_${crypto.randomUUID()}`;
    sqlite
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
      .run(
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
      );

    const row = sqlite.prepare('SELECT * FROM email_accounts WHERE id = ?').get(id);
    return sanitizeEmailAccountRow(row);
  },

  listUserEmailAccounts(userId: string): EmailAccountSummary[] {
    const rows = sqlite
      .prepare('SELECT * FROM email_accounts WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId) as any[];
    return rows.map(sanitizeEmailAccountRow);
  },

  getEmailAccountWithSecrets(userId: string, accountId: string): {
    summary: EmailAccountSummary;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string;
  } | null {
    const row = sqlite
      .prepare('SELECT * FROM email_accounts WHERE id = ? AND user_id = ?')
      .get(accountId, userId) as any;
    if (!row) return null;
    return {
      summary: sanitizeEmailAccountRow(row),
      encryptedAccessToken: row.encrypted_access_token,
      encryptedRefreshToken: row.encrypted_refresh_token || undefined,
    };
  },

  updateEmailAccountTokens(params: {
    userId: string;
    accountId: string;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string;
    tokenExpiresAt?: string;
    status?: EmailAccountSummary['status'];
    lastError?: string | null;
  }): void {
    const now = new Date().toISOString();
    sqlite
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
      .run(
        params.encryptedAccessToken,
        params.encryptedRefreshToken || null,
        params.tokenExpiresAt || null,
        params.status || null,
        params.lastError ?? null,
        now,
        params.accountId,
        params.userId
      );
  },

  disconnectEmailAccount(userId: string, accountId: string): boolean {
    const now = new Date().toISOString();
    const res = sqlite
      .prepare(
        `UPDATE email_accounts
         SET status = 'disconnected',
             encrypted_access_token = '',
             encrypted_refresh_token = NULL,
             updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .run(now, accountId, userId);
    return Number(res.changes || 0) > 0;
  },

  // --- DO NOT CONTACT SUPPRESSION LIST ---
  addDoNotContact(userId: string, email: string, reason: string, source = 'user_action'): DoNotContactEntry {
    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1] || '';
    const now = new Date().toISOString();
    const id = `dnc_${crypto.randomUUID()}`;
    sqlite
      .prepare(
        `INSERT INTO do_not_contact (id, user_id, email, domain, reason, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, email) DO UPDATE SET reason = excluded.reason`
      )
      .run(id, userId, cleanEmail, domain, reason, source, now);

    const matchedContact = sqlite
      .prepare('SELECT id FROM hr_contacts WHERE LOWER(email) = ? LIMIT 1')
      .get(cleanEmail) as { id?: string } | undefined;

    sqlite
      .prepare(
        `INSERT INTO hr_contact_suppression (id, user_id, contact_id, email, normalized_email, reason, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, normalized_email) DO UPDATE SET reason = excluded.reason`
      )
      .run(`hcsup_${crypto.randomUUID()}`, userId, matchedContact?.id || null, cleanEmail, cleanEmail, reason, source, now);

    const row = sqlite
      .prepare('SELECT * FROM do_not_contact WHERE user_id = ? AND email = ?')
      .get(userId, cleanEmail) as any;
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      domain: row.domain || undefined,
      reason: row.reason,
      source: row.source,
      createdAt: row.created_at,
    };
  },

  isDoNotContact(userId: string, email: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    const row = sqlite
      .prepare('SELECT id FROM do_not_contact WHERE user_id = ? AND LOWER(email) = ?')
      .get(userId, cleanEmail);
    if (row) return true;
    const supRow = sqlite
      .prepare('SELECT id FROM hr_contact_suppression WHERE user_id = ? AND normalized_email = ?')
      .get(userId, cleanEmail);
    return Boolean(supRow);
  },

  listDoNotContact(userId: string): DoNotContactEntry[] {
    const rows = sqlite
      .prepare('SELECT * FROM do_not_contact WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as any[];
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      email: r.email,
      domain: r.domain || undefined,
      reason: r.reason,
      source: r.source,
      createdAt: r.created_at,
    }));
  },

  removeDoNotContact(userId: string, id: string): boolean {
    const existing = sqlite.prepare('SELECT email FROM do_not_contact WHERE id = ? AND user_id = ?').get(id, userId) as any;
    const res = sqlite.prepare('DELETE FROM do_not_contact WHERE id = ? AND user_id = ?').run(id, userId);
    if (existing?.email) {
      sqlite
        .prepare('DELETE FROM hr_contact_suppression WHERE user_id = ? AND normalized_email = ?')
        .run(userId, String(existing.email).trim().toLowerCase());
    }
    return Number(res.changes || 0) > 0;
  },

  // --- OUTREACH MESSAGES & EVENTS ---
  findOutreachMessageByIdempotencyKey(userId: string, idempotencyKey: string): OutreachMessage | null {
    const row = sqlite
      .prepare('SELECT * FROM outreach_messages WHERE user_id = ? AND idempotency_key = ?')
      .get(userId, idempotencyKey) as any;
    return row ? mapOutreachMessageRow(row) : null;
  },

  createOutreachMessage(params: {
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
  }): OutreachMessage {
    const id = `omsg_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const approvedAt = params.explicitUserApproval ? now : null;
    sqlite
      .prepare(
        `INSERT INTO outreach_messages (
           id, user_id, contact_id, campaign_id, email_account_id, job_id, company_name, job_title,
           recipient_email, recipient_name, template_type, tone, subject, body_text,
           resume_document_id, resume_file_name, resume_file_size, status,
           explicit_user_approval, approved_at, idempotency_key, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
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
      );

    this.recordOutreachEvent(params.userId, id, 'draft_created', {
      recipientEmail: params.recipientEmail,
      templateType: params.templateType,
    });

    return this.getOutreachMessageById(params.userId, id)!;
  },

  updateOutreachMessage(
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
  ): OutreachMessage | null {
    const cur = this.getOutreachMessageById(userId, messageId);
    if (!cur) return null;
    const now = new Date().toISOString();

    sqlite
      .prepare(
        `UPDATE outreach_messages
         SET email_account_id = ?, subject = ?, body_text = ?, resume_document_id = ?,
             resume_file_name = ?, resume_file_size = ?, status = ?, explicit_user_approval = ?,
             approved_at = ?, provider = ?, provider_message_id = ?, provider_thread_id = ?,
             error_message = ?, sent_at = ?, replied_at = ?, follow_up_due_at = ?,
             reply_summary = ?, suggested_reply = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .run(
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
      );

    return this.getOutreachMessageById(userId, messageId);
  },

  getOutreachMessageById(userId: string, messageId: string): OutreachMessage | null {
    const row = sqlite
      .prepare('SELECT * FROM outreach_messages WHERE id = ? AND user_id = ?')
      .get(messageId, userId) as any;
    return row ? mapOutreachMessageRow(row) : null;
  },

  listOutreachMessages(userId: string, filters?: { status?: string; limit?: number }): OutreachMessage[] {
    const limit = Math.min(200, Number(filters?.limit || 100));
    if (filters?.status && filters.status !== 'all') {
      const rows = sqlite
        .prepare('SELECT * FROM outreach_messages WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT ?')
        .all(userId, filters.status, limit) as any[];
      return rows.map(mapOutreachMessageRow);
    }
    const rows = sqlite
      .prepare('SELECT * FROM outreach_messages WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?')
      .all(userId, limit) as any[];
    return rows.map(mapOutreachMessageRow);
  },

  countSentMessagesInWindow(userId: string, days: number): number {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const row = sqlite
      .prepare(
        `SELECT COUNT(*) as c FROM outreach_messages
         WHERE user_id = ? AND sent_at IS NOT NULL AND sent_at >= ?
         AND status IN ('sent', 'provider_accepted', 'delivered', 'replied', 'follow_up_due', 'closed')`
      )
      .get(userId, since) as any;
    return Number(row?.c || 0);
  },

  recordOutreachEvent(
    userId: string,
    messageId: string,
    eventType: string,
    payload: Record<string, unknown>,
    providerEventId?: string
  ): void {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO outreach_events (id, message_id, user_id, event_type, provider_event_id, payload_json, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `oevt_${crypto.randomUUID()}`,
        messageId,
        userId,
        eventType,
        providerEventId || null,
        JSON.stringify(payload),
        now
      );
  },

  listOutreachEvents(userId: string, messageId: string): OutreachEvent[] {
    const rows = sqlite
      .prepare('SELECT * FROM outreach_events WHERE user_id = ? AND message_id = ? ORDER BY occurred_at DESC')
      .all(userId, messageId) as any[];
    return rows.map((r) => ({
      id: r.id,
      messageId: r.message_id,
      userId: r.user_id,
      eventType: r.event_type,
      providerEventId: r.provider_event_id || undefined,
      payload: JSON.parse(r.payload_json || '{}'),
      occurredAt: r.occurred_at,
    }));
  },

  // --- CAMPAIGNS ---
  createOutreachCampaign(params: {
    userId: string;
    name: string;
    targetCountry?: string;
    targetRoles?: string[];
    dailyLimit?: number;
    notes?: string;
  }): OutreachCampaign {
    const id = `camp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO outreach_campaigns (id, user_id, name, target_country, target_roles, status, daily_limit, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
      )
      .run(
        id,
        params.userId,
        params.name.trim(),
        params.targetCountry || null,
        JSON.stringify(params.targetRoles || []),
        Math.min(50, Math.max(1, Number(params.dailyLimit || 10))),
        params.notes || null,
        now,
        now
      );
    return this.getOutreachCampaignById(params.userId, id)!;
  },

  getOutreachCampaignById(userId: string, campaignId: string): OutreachCampaign | null {
    const r = sqlite
      .prepare('SELECT * FROM outreach_campaigns WHERE id = ? AND user_id = ?')
      .get(campaignId, userId) as any;
    if (!r) return null;
    const counts = sqlite
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'drafted' THEN 1 ELSE 0 END) as drafted,
           SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
           SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
           SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied
         FROM outreach_campaign_contacts WHERE campaign_id = ? AND user_id = ?`
      )
      .get(campaignId, userId) as any;

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
  },

  listOutreachCampaigns(userId: string): OutreachCampaign[] {
    const rows = sqlite
      .prepare('SELECT id FROM outreach_campaigns WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId) as any[];
    return rows.map((r) => this.getOutreachCampaignById(userId, r.id)!).filter(Boolean);
  },

  addContactsToCampaign(userId: string, campaignId: string, contactIds: string[], jobId?: string): number {
    const camp = this.getOutreachCampaignById(userId, campaignId);
    if (!camp) throw new Error('Campaign not found or unauthorized.');
    const now = new Date().toISOString();
    let added = 0;
    const stmt = sqlite.prepare(
      `INSERT OR IGNORE INTO outreach_campaign_contacts (id, campaign_id, user_id, contact_id, job_id, status, added_at)
       VALUES (?, ?, ?, ?, ?, 'queued', ?)`
    );
    for (const cid of contactIds) {
      const exists = sqlite.prepare('SELECT id FROM hr_contacts WHERE id = ?').get(cid);
      if (!exists) continue;
      const res = stmt.run(`occ_${crypto.randomUUID()}`, campaignId, userId, cid, jobId || null, now);
      if (Number(res.changes || 0) > 0) added++;
    }
    sqlite.prepare('UPDATE outreach_campaigns SET updated_at = ? WHERE id = ? AND user_id = ?').run(now, campaignId, userId);
    return added;
  },

  getCampaignContacts(userId: string, campaignId: string): OutreachCampaignContact[] {
    const rows = sqlite
      .prepare(
        `SELECT occ.*, hc.company_name, hc.contact_name, hc.designation, hc.role_category, hc.email, hc.country, hc.email_verification_status, hc.source_type, hc.source_url, hc.contact_confidence, hc.evidence, hc.discovered_at, hc.is_role_based, hc.contact_status, hc.associated_job_ids, hc.created_at, hc.updated_at
         FROM outreach_campaign_contacts occ
         JOIN hr_contacts hc ON hc.id = occ.contact_id
         WHERE occ.campaign_id = ? AND occ.user_id = ?
         ORDER BY occ.added_at DESC`
      )
      .all(campaignId, userId) as any[];
    return rows.map((r) => ({
      id: r.id,
      campaignId: r.campaign_id,
      userId: r.user_id,
      contactId: r.contact_id,
      jobId: r.job_id || undefined,
      status: r.status,
      addedAt: r.added_at,
      contact: mapHrContactRow(r),
    }));
  },

  // --- REAL DATABASE-BACKED OVERVIEW METRICS ---
  getOverviewCounts(userId: string) {
    const visibilityClause = "(contact_status != 'archived' AND (COALESCE(is_user_submitted, 0) = 0 OR submitted_by_user_id = ?))";
    const contactsTotal = (sqlite.prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE ${visibilityClause}`).get(userId) as any)?.c || 0;
    const verifiedCount = (
      sqlite
        .prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE email_verification_status IN ('Verified', 'Mailbox Verified') AND ${visibilityClause}`)
        .get(userId) as any
    )?.c || 0;
    const sourceConfirmedContacts = (
      sqlite
        .prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE (email_verification_status = 'Source Confirmed' OR COALESCE(level_source_confirmed, 0) = 1) AND ${visibilityClause}`)
        .get(userId) as any
    )?.c || 0;
    const mxValidatedContacts = (
      sqlite
        .prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE (email_verification_status = 'MX Valid' OR COALESCE(level_mx, 0) = 1) AND ${visibilityClause}`)
        .get(userId) as any
    )?.c || 0;
    const domainValidCount = (
      sqlite
        .prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE (email_verification_status = 'Domain Valid' OR COALESCE(level_domain, 0) = 1) AND ${visibilityClause}`)
        .get(userId) as any
    )?.c || 0;
    const roleBasedCount = (
      sqlite
        .prepare(`SELECT COUNT(*) as c FROM hr_contacts WHERE (email_verification_status = 'Role-Based' OR is_role_based = 1) AND ${visibilityClause}`)
        .get(userId) as any
    )?.c || 0;

    const totalActiveJobs = (sqlite.prepare('SELECT COUNT(*) as c FROM live_jobs_cache').get() as any)?.c || 0;

    // Jobs that have at least one matching HR contact by link table, associatedJobIds, or company name
    const jobsWithContacts = (sqlite.prepare(
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
    ).get(userId) as any)?.c || 0;

    const jobCoveragePercent =
      Number(totalActiveJobs) > 0 ? Math.round((Number(jobsWithContacts) / Number(totalActiveJobs)) * 1000) / 10 : 0;

    const msgStats = sqlite
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
      .get(userId) as any;

    const connectedAccountsCount = (sqlite.prepare("SELECT COUNT(*) as c FROM email_accounts WHERE user_id = ? AND status = 'connected'").get(userId) as any)?.c || 0;

    return {
      contactsDiscovered: Number(contactsTotal),
      verifiedContacts: Number(verifiedCount),
      sourceConfirmedContacts: Number(sourceConfirmedContacts),
      mxValidatedContacts: Number(mxValidatedContacts),
      domainValidContacts: Number(domainValidCount),
      roleBasedContacts: Number(roleBasedCount),
      jobsWithContacts: Number(jobsWithContacts),
      totalActiveJobs: Number(totalActiveJobs),
      jobCoveragePercent,
      emailsDrafted: Number(msgStats?.drafted || 0),
      emailsSent: Number(msgStats?.sent || 0),
      providerAcceptedCount: Number(msgStats?.accepted || 0),
      deliveredCount: Number(msgStats?.delivered || 0),
      bouncedOrFailedCount: Number(msgStats?.failed || 0),
      repliesReceived: Number(msgStats?.replied || 0),
      positiveResponses: Number(msgStats?.replied || 0),
      followUpsDue: Number(msgStats?.follow_up_due || 0),
      connectedAccountsCount: Number(connectedAccountsCount),
    };
  },
};
