-- migrations/0008_candidate_fact_registry.sql
-- Candidate Fact Registry for Zero-Hallucination Career Verification

CREATE TABLE IF NOT EXISTS candidate_facts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- identity, employment, skill, achievement, education, certification, location, contact
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  original_source TEXT NOT NULL, -- resume_upload, user_input, job_application, system_verification
  source_document_id TEXT,
  evidence_text TEXT,
  evidence_location TEXT,
  verification_status TEXT NOT NULL, -- EXTRACTED, NEEDS_VERIFICATION, USER_CONFIRMED, USER_CORRECTED
  confidence REAL NOT NULL DEFAULT 1.0,
  metadata_json TEXT,
  last_updated TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_facts_user ON candidate_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_facts_user_category ON candidate_facts(user_id, category);
CREATE INDEX IF NOT EXISTS idx_facts_status ON candidate_facts(user_id, verification_status);
