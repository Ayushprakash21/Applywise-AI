-- migrations/0014_remote_d1_gcde_sync.sql
-- 1. Create company_directory table
CREATE TABLE IF NOT EXISTS company_directory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  careers_url TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'United States',
  region TEXT NOT NULL DEFAULT 'north_america',
  industry TEXT NOT NULL DEFAULT 'Technology',
  company_size TEXT DEFAULT '100-1000',
  detected_ats TEXT NOT NULL DEFAULT 'custom_web',
  public_board_token TEXT,
  public_endpoint TEXT,
  discovery_source TEXT NOT NULL DEFAULT 'admin_curated',
  verification_status TEXT NOT NULL DEFAULT 'verified',
  last_checked_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_companies_domain ON company_directory(domain);
CREATE INDEX IF NOT EXISTS idx_companies_country ON company_directory(country);
CREATE INDEX IF NOT EXISTS idx_companies_ats ON company_directory(detected_ats);
CREATE INDEX IF NOT EXISTS idx_companies_status ON company_directory(verification_status);

-- 2. Drop legacy empty job_sources table and recreate with full GCDE schema
DROP TABLE IF EXISTS job_sources;

CREATE TABLE job_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_id TEXT REFERENCES company_directory(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'official_careers',
  ats_provider TEXT,
  official_careers_url TEXT NOT NULL,
  public_endpoint TEXT NOT NULL,
  adapter_type TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'United States',
  region TEXT NOT NULL DEFAULT 'north_america',
  languages TEXT NOT NULL DEFAULT '["en"]',
  permission_status TEXT NOT NULL DEFAULT 'public_feed',
  rate_limit_seconds INTEGER NOT NULL DEFAULT 600,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  last_attempt_at TEXT,
  health_status TEXT NOT NULL DEFAULT 'healthy',
  total_discovered INTEGER NOT NULL DEFAULT 0,
  total_active INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  next_sync_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_sources_company ON job_sources(company_name);
CREATE INDEX IF NOT EXISTS idx_job_sources_country ON job_sources(country);
CREATE INDEX IF NOT EXISTS idx_job_sources_category ON job_sources(category);
CREATE INDEX IF NOT EXISTS idx_job_sources_health ON job_sources(health_status);
CREATE INDEX IF NOT EXISTS idx_job_sources_enabled ON job_sources(is_enabled);

-- 3. Add GCDE columns to live_jobs_cache (Already created in 0013)
-- ALTER TABLE live_jobs_cache ADD COLUMN company_id TEXT;
-- ALTER TABLE live_jobs_cache ADD COLUMN lifecycle_status TEXT DEFAULT 'ACTIVE';
-- ALTER TABLE live_jobs_cache ADD COLUMN source_type TEXT DEFAULT 'official_employer';
-- ALTER TABLE live_jobs_cache ADD COLUMN extraction_method TEXT DEFAULT 'api_adapter';
-- ALTER TABLE live_jobs_cache ADD COLUMN extraction_confidence REAL DEFAULT 1.0;
-- ALTER TABLE live_jobs_cache ADD COLUMN first_seen_at TEXT;
-- ALTER TABLE live_jobs_cache ADD COLUMN last_verified_at TEXT;
-- ALTER TABLE live_jobs_cache ADD COLUMN region TEXT DEFAULT 'north_america';
-- ALTER TABLE live_jobs_cache ADD COLUMN canonical_url TEXT;
-- ALTER TABLE live_jobs_cache ADD COLUMN responsibilities TEXT DEFAULT '[]';
-- ALTER TABLE live_jobs_cache ADD COLUMN preferred_skills TEXT DEFAULT '[]';

-- 4. Candidate Career Profiles
CREATE TABLE IF NOT EXISTS candidate_career_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  target_job_titles TEXT NOT NULL DEFAULT '[]',
  verified_technical_skills TEXT NOT NULL DEFAULT '[]',
  verified_domain_skills TEXT NOT NULL DEFAULT '[]',
  verified_experience_years REAL NOT NULL DEFAULT 0,
  verified_seniority_level TEXT NOT NULL DEFAULT 'mid',
  preferred_locations TEXT NOT NULL DEFAULT '[]',
  preferred_work_arrangements TEXT NOT NULL DEFAULT '["remote"]',
  target_countries TEXT NOT NULL DEFAULT '["United States"]',
  requires_visa_sponsorship INTEGER NOT NULL DEFAULT 0,
  has_security_clearance INTEGER NOT NULL DEFAULT 0,
  excluded_companies TEXT NOT NULL DEFAULT '[]',
  excluded_keywords TEXT NOT NULL DEFAULT '[]',
  minimum_acceptable_salary REAL,
  salary_currency TEXT DEFAULT 'USD',
  profile_completeness_score INTEGER NOT NULL DEFAULT 0,
  last_profile_sync_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Candidate Opportunity Matches
CREATE TABLE IF NOT EXISTS candidate_opportunity_matches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES live_jobs_cache(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL,
  technical_fit_score INTEGER NOT NULL,
  domain_fit_score INTEGER NOT NULL,
  seniority_fit_score INTEGER NOT NULL,
  preference_fit_score INTEGER NOT NULL,
  match_tier TEXT NOT NULL,
  reasons TEXT NOT NULL DEFAULT '[]',
  strengths TEXT NOT NULL DEFAULT '[]',
  missing_skills TEXT NOT NULL DEFAULT '[]',
  concerns TEXT NOT NULL DEFAULT '[]',
  recommendation_level TEXT NOT NULL,
  user_status TEXT NOT NULL DEFAULT 'NEW',
  dismissed_reason TEXT,
  discovered_at TEXT NOT NULL,
  last_updated_at TEXT NOT NULL,
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_user_tier ON candidate_opportunity_matches(user_id, match_tier);
CREATE INDEX IF NOT EXISTS idx_matches_user_score ON candidate_opportunity_matches(user_id, match_score DESC);
