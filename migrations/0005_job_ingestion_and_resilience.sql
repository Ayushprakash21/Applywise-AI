-- migrations/0005_job_ingestion_and_resilience.sql
-- Job Ingestion Pipeline, Error Auditing, Payment Events & Missing Performance Indexes

-- 1. Registered Job Sources
CREATE TABLE IF NOT EXISTS job_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  connector_type TEXT NOT NULL, -- ats_greenhouse, ats_lever, ats_ashby, aggregator_api, json_ld
  endpoint TEXT NOT NULL,
  rate_limit_seconds INTEGER NOT NULL DEFAULT 600,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- 2. Job Ingestion Execution History
CREATE TABLE IF NOT EXISTS job_ingestion_runs (
  id TEXT PRIMARY KEY,
  trigger_type TEXT NOT NULL, -- cron, manual, startup, on_demand
  status TEXT NOT NULL, -- running, completed, partial, failed
  total_sources INTEGER NOT NULL DEFAULT 0,
  total_fetched INTEGER NOT NULL DEFAULT 0,
  total_accepted INTEGER NOT NULL DEFAULT 0,
  total_rejected INTEGER NOT NULL DEFAULT 0,
  total_duplicated INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status ON job_ingestion_runs(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_started ON job_ingestion_runs(started_at);

-- 3. Ingestion Error Audit Trail
CREATE TABLE IF NOT EXISTS job_ingestion_errors (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES job_ingestion_runs(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  error_type TEXT NOT NULL, -- http_error, timeout, rate_limited, schema_validation, db_error
  error_message TEXT NOT NULL,
  http_status INTEGER,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingestion_errors_run ON job_ingestion_errors(run_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_errors_source ON job_ingestion_errors(source_id);

-- 4. Payment Events & Webhook Ledger
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- checkout_completed, subscription_created, subscription_renewed, payment_failed
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_event_id TEXT,
  amount INTEGER,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL, -- success, pending, failed
  payload TEXT NOT NULL, -- Raw JSON payload
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_events_user ON payment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events(event_type);

-- 5. Missing Query Performance Indexes
CREATE INDEX IF NOT EXISTS idx_live_jobs_location ON live_jobs_cache(location);
CREATE INDEX IF NOT EXISTS idx_live_jobs_country ON live_jobs_cache(country);
CREATE INDEX IF NOT EXISTS idx_live_jobs_emp_type ON live_jobs_cache(employment_type);
CREATE INDEX IF NOT EXISTS idx_live_jobs_exp_lvl ON live_jobs_cache(experience_level);
CREATE INDEX IF NOT EXISTS idx_live_jobs_pub_at ON live_jobs_cache(published_at);
CREATE INDEX IF NOT EXISTS idx_live_jobs_active ON live_jobs_cache(is_active);

CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_notifs_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resume_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON user_subscriptions(status);
