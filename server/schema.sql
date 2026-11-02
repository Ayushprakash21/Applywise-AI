-- ============================================================================
-- ApplyWise AI — Production PostgreSQL Relational Schema
-- Version: 2.0.0
-- ============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);

-- 3. User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    location VARCHAR(255),
    linkedin_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    current_title VARCHAR(255),
    current_employer VARCHAR(255),
    total_experience_years NUMERIC(4, 1) DEFAULT 0,
    professional_summary TEXT,
    education JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    experiences JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '[]'::jsonb,
    provenance JSONB DEFAULT '{}'::jsonb,
    master_resume_last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- 4. Resume Documents (Master uploaded documents)
CREATE TABLE IF NOT EXISTS resume_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    extracted_text TEXT NOT NULL,
    raw_storage_path VARCHAR(500),
    is_scanned BOOLEAN DEFAULT FALSE,
    extraction_status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resume_documents_user_id ON resume_documents(user_id);

-- 5. Resume Versions (Tailored versions for vacancies)
CREATE TABLE IF NOT EXISTS resume_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID,
    vacancy_id VARCHAR(255),
    headline VARCHAR(255) NOT NULL,
    professional_summary TEXT NOT NULL,
    targeted_skills JSONB DEFAULT '[]'::jsonb,
    tailored_experiences JSONB DEFAULT '[]'::jsonb,
    cover_letter TEXT,
    truthfulness_score INTEGER NOT NULL DEFAULT 100,
    audit_notes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resume_versions_user_id ON resume_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_application_id ON resume_versions(application_id);

-- 6. Career Preferences Table
CREATE TABLE IF NOT EXISTS career_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    target_roles JSONB DEFAULT '[]'::jsonb,
    target_countries JSONB DEFAULT '[]'::jsonb,
    work_arrangements JSONB DEFAULT '["remote", "hybrid"]'::jsonb,
    min_salary_usd INTEGER DEFAULT 0,
    requires_visa_sponsorship BOOLEAN DEFAULT FALSE,
    excluded_companies JSONB DEFAULT '[]'::jsonb,
    excluded_keywords JSONB DEFAULT '[]'::jsonb,
    min_match_threshold INTEGER DEFAULT 65,
    max_daily_applications INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_career_preferences_user_id ON career_preferences(user_id);

-- 7. Cached Vacancies Table (Shared deduplicated real vacancies)
CREATE TABLE IF NOT EXISTS cached_vacancies (
    id VARCHAR(255) PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    external_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    company_logo VARCHAR(500),
    location VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    remote BOOLEAN DEFAULT FALSE,
    arrangement VARCHAR(50) DEFAULT 'remote',
    url TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    salary_range JSONB,
    visa_sponsorship VARCHAR(50) DEFAULT 'unknown',
    published_at TIMESTAMP WITH TIME ZONE,
    retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_cached_vacancies_source ON cached_vacancies(source);
CREATE INDEX IF NOT EXISTS idx_cached_vacancies_title ON cached_vacancies(title);
CREATE INDEX IF NOT EXISTS idx_cached_vacancies_company ON cached_vacancies(company);

-- 8. Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vacancy_id VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DISCOVERED',
    match_score INTEGER DEFAULT 0,
    match_reasons JSONB DEFAULT '[]'::jsonb,
    missing_requirements JSONB DEFAULT '[]'::jsonb,
    tailored_resume_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
    submission_evidence JSONB,
    timeline JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_vacancy UNIQUE(user_id, vacancy_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- 9. Automation Settings Table
CREATE TABLE IF NOT EXISTS automation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    mode VARCHAR(50) NOT NULL DEFAULT 'MODE_B_PREPARE_APPROVE',
    emergency_stop BOOLEAN NOT NULL DEFAULT FALSE,
    auto_tailor BOOLEAN NOT NULL DEFAULT TRUE,
    auto_apply_approved BOOLEAN NOT NULL DEFAULT FALSE,
    daily_application_limit INTEGER NOT NULL DEFAULT 5,
    applications_submitted_today INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automation_settings_user_id ON automation_settings(user_id);

-- 10. Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target VARCHAR(255) NOT NULL,
    details TEXT,
    severity VARCHAR(50) DEFAULT 'info',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);

-- 11. Notification Items Table
CREATE TABLE IF NOT EXISTS notification_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_items_user_id ON notification_items(user_id);
