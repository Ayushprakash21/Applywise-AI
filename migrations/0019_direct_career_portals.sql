-- migrations/0019_direct_career_portals.sql
-- Direct Company Career Portal Job Discovery Engine Schema
-- Enhances company_directory, job_sources, live_jobs_cache, and adds employer_source_health

-- 1. Direct Employer Source Health Logging
CREATE TABLE IF NOT EXISTS employer_source_health (
  id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  ats_provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy', -- healthy, empty, degraded, rate_limited, offline, error
  http_status INTEGER,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  jobs_fetched INTEGER NOT NULL DEFAULT 0,
  new_jobs INTEGER NOT NULL DEFAULT 0,
  duplicate_jobs INTEGER NOT NULL DEFAULT 0,
  closed_jobs INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  checked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_esh_employer ON employer_source_health(employer_id);
CREATE INDEX IF NOT EXISTS idx_esh_status ON employer_source_health(status);
CREATE INDEX IF NOT EXISTS idx_esh_checked ON employer_source_health(checked_at);

-- 2. Ensure company_directory has all required direct discovery columns
-- (In SQLite, ALTER TABLE ADD COLUMN is safe and idempotent when wrapped or handled in store initialization)
