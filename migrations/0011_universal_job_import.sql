-- migrations/0011_universal_job_import.sql
-- Production Universal Job Import & Candidate-Owned Opportunity Registry

CREATE TABLE IF NOT EXISTS user_imported_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vacancy_id TEXT NOT NULL REFERENCES cached_vacancies(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  extraction_status TEXT NOT NULL, -- 'verified_source', 'extracted_review_recommended', 'partially_extracted', 'manual_entry'
  extraction_method TEXT NOT NULL, -- 'json_ld', 'open_graph', 'adapter', 'html_heuristic', 'ai_assisted', 'manual'
  extraction_confidence REAL NOT NULL DEFAULT 1.0,
  extracted_data TEXT NOT NULL, -- JSON string of ExtractedJobData
  candidate_edits TEXT, -- JSON string of candidate adjustments
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_archived INTEGER DEFAULT 0,
  UNIQUE(user_id, canonical_url)
);

CREATE INDEX IF NOT EXISTS idx_imported_jobs_user ON user_imported_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_jobs_canonical ON user_imported_jobs(canonical_url);
CREATE INDEX IF NOT EXISTS idx_imported_jobs_vacancy ON user_imported_jobs(vacancy_id);
