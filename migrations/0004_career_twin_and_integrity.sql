-- migrations/0004_career_twin_and_integrity.sql
-- Career Digital Twin, Application Integrity Engine & Verifiable Application Receipts

CREATE TABLE IF NOT EXISTS career_digital_twins (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  professional_summary TEXT NOT NULL DEFAULT '',
  work_experiences TEXT NOT NULL DEFAULT '[]', -- JSON array of experiences with provenance
  skills_inventory TEXT NOT NULL DEFAULT '[]', -- JSON array of skills with provenance (verified vs inferred)
  education TEXT NOT NULL DEFAULT '[]',
  certifications TEXT NOT NULL DEFAULT '[]',
  projects TEXT NOT NULL DEFAULT '[]',
  career_goals TEXT NOT NULL DEFAULT '[]',
  learning_objectives TEXT NOT NULL DEFAULT '[]',
  transferable_bridges TEXT NOT NULL DEFAULT '[]',
  completeness_score INTEGER NOT NULL DEFAULT 20,
  inferred_pending_count INTEGER NOT NULL DEFAULT 0,
  unverified_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS application_receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL,
  vacancy_id TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  job_source TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  submission_status TEXT NOT NULL, -- SUBMITTED_CONFIRMED, REDIRECTED_TO_EMPLOYER, SUBMISSION_ATTEMPTED, STATUS_UNKNOWN
  confirmation_reference TEXT,
  resume_version_id TEXT,
  cover_letter_version_id TEXT,
  tailored_resume_snapshot TEXT, -- JSON
  cover_letter_snapshot TEXT,
  user_confirmed_answers TEXT, -- JSON
  integrity_report TEXT NOT NULL, -- JSON verification report
  timeline TEXT NOT NULL, -- JSON timeline events
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_receipts_user ON application_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_app ON application_receipts(application_id);

CREATE TABLE IF NOT EXISTS career_outcomes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id TEXT,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  outcome_type TEXT NOT NULL, -- APPLICATION_SUBMITTED, RECRUITER_CONTACTED, INTERVIEW_INVITATION, INTERVIEW_COMPLETED, REJECTION_RECEIVED, OFFER_RECEIVED, WITHDRAWN
  outcome_source TEXT NOT NULL DEFAULT 'user_reported', -- user_reported, system_verified
  notes TEXT,
  recorded_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outcomes_user ON career_outcomes(user_id);
