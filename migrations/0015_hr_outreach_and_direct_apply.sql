-- migrations/0015_hr_outreach_and_direct_apply.sql
-- ApplyVise AI — AI HR Outreach & Direct Application Automation Schema
-- Additive migration extending GCDE, Resume Management, and Candidate Workspaces

-- 1. Persistent Resume File Blobs for Secure Attachment & Inline Preview (SQLite & D1 parity)
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

-- 2. HR Contact Intelligence Database
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
CREATE INDEX IF NOT EXISTS idx_hr_contacts_company_id ON hr_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_contacts_country ON hr_contacts(country);
CREATE INDEX IF NOT EXISTS idx_hr_contacts_verification ON hr_contacts(email_verification_status);
CREATE INDEX IF NOT EXISTS idx_hr_contacts_status ON hr_contacts(contact_status);

-- 3. Multi-Source Contact Provenance Tracking
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

-- 4. Encrypted Email Account OAuth Connections (Gmail & Microsoft Outlook)
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

-- 5. Short-Lived OAuth State Nonces for CSRF Protection
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON oauth_states(user_id);

-- 6. AI Outreach Campaigns (Organizational Grouping)
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

-- 7. Campaign-to-Contact Membership Join Table
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

CREATE INDEX IF NOT EXISTS idx_occ_campaign ON outreach_campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_occ_user ON outreach_campaign_contacts(user_id);

-- 8. Individual Outreach Email Messages & Provider State
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
CREATE INDEX IF NOT EXISTS idx_outreach_messages_contact ON outreach_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_thread ON outreach_messages(provider_thread_id);

-- 9. Outreach Lifecycle Events Audit Log
CREATE TABLE IF NOT EXISTS outreach_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES outreach_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outreach_events_message ON outreach_events(message_id);
CREATE INDEX IF NOT EXISTS idx_outreach_events_user ON outreach_events(user_id);

-- 10. Per-Candidate Do-Not-Contact Suppression Registry
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

CREATE INDEX IF NOT EXISTS idx_dnc_user_email ON do_not_contact(user_id, email);

-- 11. Background Contact Discovery Run History & Checkpointing
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

CREATE INDEX IF NOT EXISTS idx_cdr_status ON contact_discovery_runs(status, started_at);
