-- migrations/0016_hr_discovery_repair_and_diagnostics.sql
-- HR Email Discovery Repair: Multi-Level Verification, Contact-Job Linking, Incremental Queue & Admin Diagnostics

-- 1. Extend hr_contacts with Part 4/5/7 fields cleanly (additive)
ALTER TABLE hr_contacts ADD COLUMN normalized_email TEXT;
ALTER TABLE hr_contacts ADD COLUMN contact_type TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE hr_contacts ADD COLUMN source_evidence TEXT;
ALTER TABLE hr_contacts ADD COLUMN associated_job_id TEXT;
ALTER TABLE hr_contacts ADD COLUMN last_seen_at TEXT;
ALTER TABLE hr_contacts ADD COLUMN level_syntax INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hr_contacts ADD COLUMN level_domain INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hr_contacts ADD COLUMN level_mx INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hr_contacts ADD COLUMN level_source_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hr_contacts ADD COLUMN level_mailbox INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hr_contacts ADD COLUMN is_user_submitted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hr_contacts ADD COLUMN submitted_by_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_hr_contacts_normalized ON hr_contacts(normalized_email);
CREATE INDEX IF NOT EXISTS idx_hr_contacts_type ON hr_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_hr_contacts_user_submitted ON hr_contacts(is_user_submitted, submitted_by_user_id);

-- Backfill normalized_email and last_seen_at for any existing rows safely
UPDATE hr_contacts
SET normalized_email = LOWER(TRIM(email)),
    last_seen_at = COALESCE(last_seen_at, discovered_at, created_at),
    source_evidence = COALESCE(source_evidence, evidence)
WHERE normalized_email IS NULL;

-- 2. Dedicated Contact-to-Job Relationship Links (Part 6 & 7)
CREATE TABLE IF NOT EXISTS hr_contact_job_links (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES hr_contacts(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  company_id TEXT,
  link_type TEXT NOT NULL DEFAULT 'company_only', -- direct_posting | recruitment_page | department_relationship | company_only
  relevance_score INTEGER NOT NULL DEFAULT 0,
  evidence TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(contact_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_hcjl_contact ON hr_contact_job_links(contact_id);
CREATE INDEX IF NOT EXISTS idx_hcjl_job ON hr_contact_job_links(job_id);
CREATE INDEX IF NOT EXISTS idx_hcjl_type ON hr_contact_job_links(link_type);

-- 3. Persistent Incremental HR Contact Discovery Queue (Part 8)
CREATE TABLE IF NOT EXISTS hr_contact_discovery_queue (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE,
  company_id TEXT,
  company_name TEXT NOT NULL,
  source TEXT NOT NULL,
  job_url TEXT,
  description_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | completed | no_contact_found | failed | dead_letter | unsupported_source
  diagnostic_category TEXT, -- no_contacts_published | description_unavailable | company_page_unavailable | extraction_failed | source_not_supported | contacts_extracted
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
CREATE INDEX IF NOT EXISTS idx_hcdq_company ON hr_contact_discovery_queue(company_name);

-- 4. Detailed HR Contact Discovery Runs Telemetry (Part 8 & 9)
CREATE TABLE IF NOT EXISTS hr_contact_discovery_runs (
  id TEXT PRIMARY KEY,
  triggered_by TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- manual | cron | post_sync | admin_retry
  status TEXT NOT NULL DEFAULT 'running', -- running | completed | partial | failed
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

CREATE INDEX IF NOT EXISTS idx_hcdr_started ON hr_contact_discovery_runs(started_at);

-- 5. Independent Email Verification Events Audit Log (Part 5 & 7)
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

CREATE INDEX IF NOT EXISTS idx_hcve_contact ON hr_contact_verification_events(contact_id, checked_at);

-- 6. Standardized Suppression Table Alias / View Sync (Part 7 & 13D)
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

CREATE INDEX IF NOT EXISTS idx_hcsup_user ON hr_contact_suppression(user_id, normalized_email);

-- 7. Seed core verified GCDE company_directory rows cleanly if absent in D1
INSERT OR IGNORE INTO company_directory (id, name, domain, careers_url, country, region, industry, detected_ats, public_board_token, public_endpoint, discovery_source, verification_status, last_checked_at, created_at, updated_at) VALUES
  ('comp_cloudflare', 'Cloudflare', 'cloudflare.com', 'https://www.cloudflare.com/careers/', 'United States', 'north_america', 'Cloud & Infrastructure', 'greenhouse', 'cloudflare', 'https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs', 'admin_curated', 'verified', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z'),
  ('comp_figma', 'Figma', 'figma.com', 'https://www.figma.com/careers/', 'United States', 'north_america', 'Design & Collaboration', 'greenhouse', 'figma', 'https://boards-api.greenhouse.io/v1/boards/figma/jobs', 'admin_curated', 'verified', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z'),
  ('comp_gitlab', 'GitLab', 'about.gitlab.com', 'https://about.gitlab.com/jobs/', 'United States', 'north_america', 'DevOps & Developer Tools', 'greenhouse', 'gitlab', 'https://boards-api.greenhouse.io/v1/boards/gitlab/jobs', 'admin_curated', 'verified', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z'),
  ('comp_databricks', 'Databricks', 'databricks.com', 'https://www.databricks.com/company/careers', 'United States', 'north_america', 'Data & AI', 'greenhouse', 'databricks', 'https://boards-api.greenhouse.io/v1/boards/databricks/jobs', 'admin_curated', 'verified', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z'),
  ('comp_spotify', 'Spotify', 'spotify.com', 'https://www.lifeatspotify.com/', 'Sweden', 'europe', 'Audio & Entertainment', 'lever', 'spotify', 'https://api.lever.co/v0/postings/spotify?mode=json', 'admin_curated', 'verified', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z'),
  ('comp_palantir', 'Palantir', 'palantir.com', 'https://www.palantir.com/careers/', 'United States', 'north_america', 'Enterprise Software', 'lever', 'palantir', 'https://api.lever.co/v0/postings/palantir?mode=json', 'admin_curated', 'verified', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z'),
  ('comp_notion', 'Notion', 'notion.so', 'https://www.notion.so/careers', 'United States', 'north_america', 'Productivity & Workspace', 'ashby', 'notion', 'https://api.ashbyhq.com/posting-api/job-board/notion', 'admin_curated', 'verified', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z'),
  ('comp_linear', 'Linear', 'linear.app', 'https://linear.app/careers', 'United States', 'north_america', 'Developer Productivity', 'ashby', 'linear', 'https://api.ashbyhq.com/posting-api/job-board/linear', 'admin_curated', 'verified', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z'),
  ('comp_bunq', 'bunq', 'bunq.com', 'https://www.bunq.com/jobs', 'Netherlands', 'europe', 'FinTech & Banking', 'recruitee', 'bunq', 'https://bunq.recruitee.com/api/offers/', 'admin_curated', 'verified', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z', '2026-11-12T00:00:00Z');
