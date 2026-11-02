-- migrations/0003_live_jobs_cache.sql
-- Temporary Live Jobs Cache and Source Health Registry
-- Strictly temporary: records have an expires_at TTL and are not permanently archived.

CREATE TABLE IF NOT EXISTS live_jobs_cache (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_job_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_logo TEXT,
  location TEXT NOT NULL,
  country TEXT NOT NULL,
  work_arrangement TEXT NOT NULL DEFAULT 'remote', -- remote, hybrid, onsite
  employment_type TEXT NOT NULL DEFAULT 'full-time', -- full-time, part-time, contract, internship
  experience_level TEXT NOT NULL DEFAULT 'mid', -- entry, mid, senior, lead, executive
  salary_raw TEXT,
  salary_min REAL,
  salary_max REAL,
  salary_currency TEXT DEFAULT '$',
  url TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL DEFAULT '[]', -- JSON string array
  tags TEXT NOT NULL DEFAULT '[]', -- JSON string array
  published_at TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_checked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_jobs_source ON live_jobs_cache(source);
CREATE INDEX IF NOT EXISTS idx_live_jobs_company ON live_jobs_cache(company);
CREATE INDEX IF NOT EXISTS idx_live_jobs_arrangement ON live_jobs_cache(work_arrangement);
CREATE INDEX IF NOT EXISTS idx_live_jobs_expires ON live_jobs_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_live_jobs_title ON live_jobs_cache(title);

CREATE TABLE IF NOT EXISTS source_health_registry (
  source_id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  connector_type TEXT NOT NULL, -- ats_greenhouse, ats_lever, ats_ashby, aggregator_api, json_ld
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy', -- healthy, degraded, offline
  total_jobs INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  last_refreshed_at TEXT NOT NULL,
  last_error TEXT
);
