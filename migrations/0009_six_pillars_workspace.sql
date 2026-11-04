-- migrations/0009_six_pillars_workspace.sql
-- Six-Pillar Career Experience: Opportunity Signals, Mock Sessions, Recruiter Audits & Multi-Trajectory Pathways

-- 1. Verifiable Opportunity Hiring Signals (Pillar 2: Opportunity Radar)
CREATE TABLE IF NOT EXISTS opportunity_signals (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  signal_type TEXT NOT NULL, -- expansion, office_opening, public_hiring, industry_growth, department_launch
  headline TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  published_date TEXT NOT NULL,
  location TEXT NOT NULL,
  relevance_explanation TEXT NOT NULL,
  has_verified_vacancy INTEGER NOT NULL DEFAULT 0,
  linked_vacancy_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signals_company ON opportunity_signals(company);
CREATE INDEX IF NOT EXISTS idx_signals_date ON opportunity_signals(published_date);

-- 2. Interactive Mock Interview Sessions & Answers (Pillar 4: Interview Studio)
CREATE TABLE IF NOT EXISTS interview_mock_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT,
  role_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  interview_type TEXT NOT NULL, -- behavioral, technical, situational, leadership, hr
  questions_json TEXT NOT NULL DEFAULT '[]', -- Array of questions
  answers_json TEXT NOT NULL DEFAULT '[]', -- Candidate answers with timestamp and duration
  feedback_json TEXT NOT NULL DEFAULT '{}', -- Assessment of relevance, structure, clarity, evidence
  improvement_areas_json TEXT NOT NULL DEFAULT '[]',
  overall_score INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mock_sessions_user ON interview_mock_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_sessions_job ON interview_mock_sessions(job_id);

-- 3. Professional Recruiter Screening Audits (Pillar 5: Recruiter Review)
CREATE TABLE IF NOT EXISTS recruiter_review_audits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  role_alignment_score INTEGER NOT NULL DEFAULT 0,
  review_categories_json TEXT NOT NULL DEFAULT '{}', -- 12 review categories
  evidence_classification_json TEXT NOT NULL DEFAULT '{}', -- verified, indirect, unestablished
  strongest_points_json TEXT NOT NULL DEFAULT '[]',
  potential_concerns_json TEXT NOT NULL DEFAULT '[]',
  missing_mandatory_json TEXT NOT NULL DEFAULT '[]',
  resume_improvements_json TEXT NOT NULL DEFAULT '[]',
  clarification_questions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_recruiter_reviews_user ON recruiter_review_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_reviews_app ON recruiter_review_audits(application_id);

-- 4. Multi-Target Career Trajectories (Pillar 6: Career Atlas)
CREATE TABLE IF NOT EXISTS career_trajectories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trajectory_title TEXT NOT NULL, -- e.g. "Operations Leadership", "Supply Chain Transformation"
  target_role TEXT NOT NULL,
  current_alignment_score INTEGER NOT NULL DEFAULT 0,
  transferable_skills_json TEXT NOT NULL DEFAULT '[]',
  missing_skills_json TEXT NOT NULL DEFAULT '[]',
  required_experience_years INTEGER NOT NULL DEFAULT 0,
  recommended_certifications_json TEXT NOT NULL DEFAULT '[]',
  learning_path_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trajectories_user ON career_trajectories(user_id);
