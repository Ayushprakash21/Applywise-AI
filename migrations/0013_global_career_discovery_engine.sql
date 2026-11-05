-- migrations/0013_global_career_discovery_engine.sql
-- Global Career Discovery Engine (GCDE): Company Directory, Multi-Source Registry, Canonical Jobs & Candidate Matching

-- 1. Company Career Discovery Directory
CREATE TABLE IF NOT EXISTS company_directory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  careers_url TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'United States',
  region TEXT NOT NULL DEFAULT 'north_america', -- north_america, europe, asia_pacific, middle_east, africa, global
  industry TEXT NOT NULL DEFAULT 'Technology',
  company_size TEXT DEFAULT '100-1000',
  detected_ats TEXT NOT NULL DEFAULT 'custom_web', -- greenhouse, lever, ashby, workable, smartrecruiters, recruitee, custom_web
  public_board_token TEXT,
  public_endpoint TEXT,
  discovery_source TEXT NOT NULL DEFAULT 'admin_curated', -- admin_curated, sitemap, public_directory, ats_registry, candidate_import
  verification_status TEXT NOT NULL DEFAULT 'verified', -- verified, pending, unsupported
  last_checked_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_companies_domain ON company_directory(domain);
CREATE INDEX IF NOT EXISTS idx_companies_country ON company_directory(country);
CREATE INDEX IF NOT EXISTS idx_companies_ats ON company_directory(detected_ats);
CREATE INDEX IF NOT EXISTS idx_companies_status ON company_directory(verification_status);

-- 2. Enhanced Job Sources Registry
CREATE TABLE IF NOT EXISTS job_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_id TEXT REFERENCES company_directory(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'official_careers', -- official_careers, ats_boards, general_portals, regional_boards, gov_portals, public_feeds, partner_apis, user_imported
  ats_provider TEXT, -- greenhouse, lever, ashby, workable, smartrecruiters, recruitee, remotive, arbeitnow, jobicy, custom
  official_careers_url TEXT NOT NULL,
  public_endpoint TEXT NOT NULL,
  adapter_type TEXT NOT NULL, -- ats_greenhouse, ats_lever, ats_ashby, ats_workable, ats_smartrecruiters, ats_recruitee, aggregator_api, json_ld, html_scraper
  country TEXT NOT NULL DEFAULT 'United States',
  region TEXT NOT NULL DEFAULT 'north_america',
  languages TEXT NOT NULL DEFAULT '["en"]',
  permission_status TEXT NOT NULL DEFAULT 'public_feed', -- authorized, public_feed, linking_only, partner_agreement
  rate_limit_seconds INTEGER NOT NULL DEFAULT 600,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 1, -- 1=high (official employer), 2=medium (aggregators), 3=low
  last_sync_at TEXT,
  last_attempt_at TEXT,
  health_status TEXT NOT NULL DEFAULT 'healthy', -- healthy, empty, degraded, rate_limited, offline
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

-- 3. Canonical Live Jobs Cache
CREATE TABLE IF NOT EXISTS live_jobs_cache (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_job_id TEXT NOT NULL,
  company_id TEXT REFERENCES company_directory(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_logo TEXT,
  location TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'United States',
  region TEXT NOT NULL DEFAULT 'north_america',
  work_arrangement TEXT NOT NULL DEFAULT 'remote', -- remote, hybrid, onsite
  employment_type TEXT NOT NULL DEFAULT 'full-time', -- full-time, part-time, contract, internship
  experience_level TEXT NOT NULL DEFAULT 'mid', -- entry, mid, senior, lead, executive
  salary_raw TEXT,
  salary_min REAL,
  salary_max REAL,
  salary_currency TEXT DEFAULT 'USD',
  url TEXT NOT NULL,
  canonical_url TEXT,
  description TEXT NOT NULL,
  responsibilities TEXT NOT NULL DEFAULT '[]',
  requirements TEXT NOT NULL DEFAULT '[]', -- JSON string array
  preferred_skills TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]', -- JSON string array
  source_type TEXT NOT NULL DEFAULT 'official_employer', -- official_employer, authorized_aggregator, candidate_imported
  lifecycle_status TEXT NOT NULL DEFAULT 'ACTIVE', -- DISCOVERED, ACTIVE, UPDATED, EXPIRING, EXPIRED, REMOVED, SOURCE_UNAVAILABLE, UNDER_REVIEW
  extraction_method TEXT NOT NULL DEFAULT 'api_adapter', -- api_adapter, json_ld, open_graph, heuristic
  extraction_confidence REAL NOT NULL DEFAULT 1.0,
  published_at TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  last_verified_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_checked_at TEXT NOT NULL,
  raw_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_live_jobs_source_id ON live_jobs_cache(source, source_job_id);
CREATE INDEX IF NOT EXISTS idx_live_jobs_canonical ON live_jobs_cache(canonical_url);
CREATE INDEX IF NOT EXISTS idx_live_jobs_lifecycle ON live_jobs_cache(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_live_jobs_source_type ON live_jobs_cache(source_type);

-- 4. Candidate Personalized Job Recommendations Cache
CREATE TABLE IF NOT EXISTS candidate_job_recommendations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vacancy_id TEXT NOT NULL,
  match_score INTEGER NOT NULL DEFAULT 0,
  algorithm_version TEXT NOT NULL DEFAULT '2.0.0',
  core_skill_score INTEGER NOT NULL DEFAULT 0,
  experience_score INTEGER NOT NULL DEFAULT 0,
  role_alignment_score INTEGER NOT NULL DEFAULT 0,
  qualification_score INTEGER NOT NULL DEFAULT 0,
  geo_compatibility_score INTEGER NOT NULL DEFAULT 0,
  matching_skills TEXT NOT NULL DEFAULT '[]',
  missing_skills TEXT NOT NULL DEFAULT '[]',
  mandatory_gaps TEXT NOT NULL DEFAULT '[]',
  recommendation_reason TEXT NOT NULL,
  is_bookmarked INTEGER NOT NULL DEFAULT 0,
  is_applied INTEGER NOT NULL DEFAULT 0,
  is_dismissed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, vacancy_id)
);

CREATE INDEX IF NOT EXISTS idx_cand_recs_user ON candidate_job_recommendations(user_id, match_score);
CREATE INDEX IF NOT EXISTS idx_cand_recs_vacancy ON candidate_job_recommendations(vacancy_id);
