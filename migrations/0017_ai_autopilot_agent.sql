-- migrations/0017_ai_autopilot_agent.sql
-- ApplyVise Autopilot — Autonomous AI Job Application Agent Schema

CREATE TABLE IF NOT EXISTS auto_apply_entitlements (
  user_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL DEFAULT 'free',
  monthly_limit INTEGER NOT NULL DEFAULT 2,
  unlimited INTEGER NOT NULL DEFAULT 0,
  billing_period_start TEXT NOT NULL,
  billing_period_end TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  reserved_count INTEGER NOT NULL DEFAULT 0,
  remaining_count INTEGER NOT NULL DEFAULT 2,
  entitlement_source TEXT NOT NULL DEFAULT 'plan',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auto_apply_entitlements_user ON auto_apply_entitlements(user_id);

CREATE TABLE IF NOT EXISTS auto_apply_agent_settings (
  user_id TEXT PRIMARY KEY,
  operating_mode TEXT NOT NULL DEFAULT 'MODE_A_ASSISTED', -- MODE_A_ASSISTED, MODE_B_SUPERVISED, MODE_C_AUTONOMOUS
  automation_active INTEGER NOT NULL DEFAULT 0,
  consent_given INTEGER NOT NULL DEFAULT 0,
  consent_timestamp TEXT,
  daily_limit INTEGER NOT NULL DEFAULT 5,
  min_match_score INTEGER NOT NULL DEFAULT 75,
  target_job_titles TEXT NOT NULL DEFAULT '[]', -- JSON string array
  target_locations TEXT NOT NULL DEFAULT '[]', -- JSON string array
  target_industries TEXT NOT NULL DEFAULT '[]', -- JSON string array
  excluded_employers TEXT NOT NULL DEFAULT '[]', -- JSON string array
  preferred_work_arrangement TEXT NOT NULL DEFAULT 'all', -- all, remote, hybrid, onsite
  min_salary INTEGER NOT NULL DEFAULT 0,
  auto_submit_eligible INTEGER NOT NULL DEFAULT 0,
  pause_on_screening INTEGER NOT NULL DEFAULT 1,
  default_resume_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auto_apply_settings_user ON auto_apply_agent_settings(user_id);

CREATE TABLE IF NOT EXISTS auto_apply_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  vacancy_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  country TEXT,
  url TEXT NOT NULL,
  match_score INTEGER NOT NULL DEFAULT 0,
  eligibility_status TEXT NOT NULL DEFAULT 'STRONG_MATCH', -- STRONG_MATCH, GOOD_MATCH, POTENTIAL_MATCH, MISSING_INFO, NOT_ELIGIBLE
  match_explanation TEXT,
  missing_qualifications TEXT NOT NULL DEFAULT '[]', -- JSON array
  tailored_resume_id TEXT,
  status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED, PREPARING, READY_FOR_REVIEW, RESERVED, SUBMITTING, SUBMITTED, FAILED, NEEDS_ATTENTION, SKIPPED
  submission_method TEXT NOT NULL DEFAULT 'OFFICIAL_ATS_ADAPTER', -- OFFICIAL_ATS_ADAPTER, GUIDED_PORTAL, DIRECT_API
  failure_reason TEXT,
  attention_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_apply_jobs_unique_user_vacancy ON auto_apply_jobs(user_id, vacancy_id);
CREATE INDEX IF NOT EXISTS idx_auto_apply_jobs_user_status ON auto_apply_jobs(user_id, status);

CREATE TABLE IF NOT EXISTS auto_apply_reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  vacancy_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RESERVED', -- RESERVED, COMMITTED, RELEASED
  reserved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  committed_at TEXT,
  released_at TEXT,
  release_reason TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auto_apply_reservations_user ON auto_apply_reservations(user_id, status);

CREATE TABLE IF NOT EXISTS auto_apply_executions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  vacancy_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILED, REQUIRES_ACTION
  provider TEXT NOT NULL DEFAULT 'greenhouse', -- greenhouse, lever, workday, ashby, guided_portal
  submission_reference TEXT,
  submission_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  provider_response TEXT, -- JSON
  error_message TEXT,
  resume_version TEXT,
  cover_letter_version TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auto_apply_executions_user ON auto_apply_executions(user_id);

CREATE TABLE IF NOT EXISTS auto_apply_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  related_job_title TEXT,
  related_company TEXT,
  result TEXT NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, INFO, WARNING, FAILED
  duration_ms INTEGER NOT NULL DEFAULT 0,
  details TEXT,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auto_apply_activity_user ON auto_apply_activity(user_id, timestamp DESC);
