-- migrations/0006_career_intelligence_and_fit_evidence.sql
-- Fit Evidence Maps, Application Readiness, Copilot Artifacts, Interview Prep, Roadmaps & Alerts

-- 1. Fit Evidence Maps (Signature Feature: Requirement 2)
CREATE TABLE IF NOT EXISTS fit_evidence_maps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  overall_confidence TEXT NOT NULL, -- high, medium, low
  total_requirements INTEGER NOT NULL DEFAULT 0,
  verified_count INTEGER NOT NULL DEFAULT 0,
  inferred_count INTEGER NOT NULL DEFAULT 0,
  user_confirmed_count INTEGER NOT NULL DEFAULT 0,
  missing_count INTEGER NOT NULL DEFAULT 0,
  nodes_json TEXT NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'v2-career-intel',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_user ON fit_evidence_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_job ON fit_evidence_maps(job_id);

-- 2. Application Readiness Checklists (Requirement 5)
CREATE TABLE IF NOT EXISTS readiness_checklists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  status TEXT NOT NULL, -- READY_TO_APPLY, REVIEW_FIRST
  summary TEXT NOT NULL,
  items_json TEXT NOT NULL,
  questions_to_ask_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_readiness_user ON readiness_checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_readiness_job ON readiness_checklists(job_id);

-- 3. Application Copilot Artifacts (Requirement 6)
CREATE TABLE IF NOT EXISTS copilot_artifacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL, -- tailored_resume, cover_letter, recruiter_message, application_answers, improvement_plan
  content_json TEXT NOT NULL,
  verified_data_only INTEGER NOT NULL DEFAULT 1,
  user_reviewed INTEGER NOT NULL DEFAULT 0,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, job_id, artifact_type)
);

CREATE INDEX IF NOT EXISTS idx_copilot_user ON copilot_artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_job ON copilot_artifacts(job_id);

-- 4. Interview Preparations (Requirement 9)
CREATE TABLE IF NOT EXISTS interview_preparations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  competencies_json TEXT NOT NULL,
  questions_json TEXT NOT NULL,
  questions_to_ask_json TEXT NOT NULL,
  feedback_rubric_json TEXT NOT NULL,
  disclaimer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_prep_user ON interview_preparations(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_job ON interview_preparations(job_id);

-- 5. Personalized Career Roadmaps (Requirement 10)
CREATE TABLE IF NOT EXISTS career_roadmaps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL,
  prioritized_gaps_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, target_role)
);

CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON career_roadmaps(user_id);

-- 6. Job Alert Rules (Requirement 7)
CREATE TABLE IF NOT EXISTS job_alert_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  criteria_json TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily', -- instant, daily, weekly
  is_active INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_alerts_user ON job_alert_rules(user_id);

-- 7. Application Activity Timeline & Tracking (Requirement 8)
CREATE TABLE IF NOT EXISTS application_activity_timeline (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  note TEXT,
  actor TEXT NOT NULL DEFAULT 'user', -- user, system, recruiter
  follow_up_date TEXT,
  recruiter_contact TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timeline_app ON application_activity_timeline(application_id);
CREATE INDEX IF NOT EXISTS idx_timeline_user ON application_activity_timeline(user_id);
