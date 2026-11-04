-- migrations/0010_admin_resume_extraction.sql
-- Production Administrator Resume Extraction, Durable Document Storage & Audit Registry

-- 1. Extend resume_documents with durable storage metadata and extraction diagnostics
-- Note: SQLite allows adding columns with ALTER TABLE. If columns exist, IF NOT EXISTS avoids conflicts in fresh schemas.

CREATE TABLE IF NOT EXISTS resume_documents_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  extracted_text TEXT NOT NULL,
  is_scanned INTEGER DEFAULT 0,
  storage_key TEXT,
  file_hash TEXT,
  mime_type TEXT,
  page_count INTEGER DEFAULT 1,
  extraction_status TEXT DEFAULT 'SUCCESS', -- 'SUCCESS', 'PARTIAL', 'FAILED', 'SCANNED', 'PENDING'
  extraction_method TEXT DEFAULT 'HEURISTIC', -- 'GEMINI', 'HEURISTIC', 'NONE'
  parser_model TEXT,
  error_message TEXT,
  warnings TEXT, -- JSON array of strings
  processing_duration_ms INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- Copy existing data if resume_documents exists
INSERT OR IGNORE INTO resume_documents_new (
  id, user_id, file_name, file_type, file_size_bytes, extracted_text, is_scanned, created_at, updated_at, extraction_status
)
SELECT 
  id, user_id, file_name, file_type, file_size_bytes, extracted_text, is_scanned, created_at, created_at,
  CASE WHEN is_scanned = 1 THEN 'SCANNED' ELSE 'SUCCESS' END
FROM resume_documents;

DROP TABLE IF EXISTS resume_documents;
ALTER TABLE resume_documents_new RENAME TO resume_documents;

CREATE INDEX IF NOT EXISTS idx_resume_documents_user ON resume_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_documents_status ON resume_documents(extraction_status);
CREATE INDEX IF NOT EXISTS idx_resume_documents_created ON resume_documents(created_at);

-- 2. Processing run records (every initial upload or admin reprocess attempt)
CREATE TABLE IF NOT EXISTS resume_extraction_runs (
  id TEXT PRIMARY KEY,
  resume_id TEXT NOT NULL REFERENCES resume_documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL, -- 'INITIAL_UPLOAD', 'ADMIN_REPROCESS', 'AUTOMATED_RETRY'
  status TEXT NOT NULL, -- 'SUCCESS', 'PARTIAL', 'FAILED', 'SCANNED'
  extraction_method TEXT NOT NULL, -- 'GEMINI', 'HEURISTIC', 'OCR', 'NONE'
  parser_model TEXT,
  structured_output TEXT, -- JSON UserProfile snapshot
  diagnostics TEXT, -- JSON diagnostics details
  error_message TEXT,
  warnings TEXT, -- JSON array
  duration_ms INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resume_runs_doc ON resume_extraction_runs(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_runs_user ON resume_extraction_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_runs_created ON resume_extraction_runs(created_at);

-- 3. Versioned structured extractions for candidate profiles
CREATE TABLE IF NOT EXISTS resume_extraction_versions (
  id TEXT PRIMARY KEY,
  resume_id TEXT NOT NULL REFERENCES resume_documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data TEXT NOT NULL, -- Full JSON UserProfile
  diff_summary TEXT, -- JSON diff between this version and prior profile
  created_by TEXT NOT NULL, -- 'SYSTEM' or Admin user ID
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resume_versions_doc ON resume_extraction_versions(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_user ON resume_extraction_versions(user_id);

-- 4. Audit trail for administrator inspection and reprocessing events
CREATE TABLE IF NOT EXISTS resume_extraction_events (
  id TEXT PRIMARY KEY,
  resume_id TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'VIEW_METADATA', 'VIEW_TEXT', 'VIEW_EXTRACTION', 'REPROCESS_TRIGGERED', 'REPROCESS_COMPLETED', 'REPROCESS_FAILED'
  details TEXT, -- JSON
  ip_address TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resume_events_doc ON resume_extraction_events(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_events_admin ON resume_extraction_events(admin_id);
CREATE INDEX IF NOT EXISTS idx_resume_events_created ON resume_extraction_events(created_at);
