import { DEFAULT_FOUNDER_PROFILE } from '../src/data/defaultFounderProfile.ts';
import { FounderProfile } from '../src/types/index.ts';
import { isPermanentFreeAccessAccount } from '../src/config/freeAccess.ts';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  CandidateFact,
  UserProfile,
  CareerPreferences,
  AutomationSettings,
  JobVacancy,
  ApplicationRecord,
  AuditLogEntry,
  NotificationItem,
  SourceIntegrationStatus,
  ApplicationStatus,
  TailoredResumeContent,
  UserImportedJobRecord,
  ExtractedJobData,
  MembershipPlanId,
  MembershipValidityType,
  MembershipStatus,
  MembershipSource,
  MembershipGrant,
  MembershipSummaryMetrics,
  AdminProvisionUserRequest
} from '../src/types/index.ts';
import {
  addCalendarMonthsUTC,
  calculateMembershipExpiry,
  calculateRemainingDays,
  deriveMembershipStatus
} from '../src/utils/membershipDates.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'applywise.sqlite');
const sqlite = new DatabaseSync(DB_PATH);

// Enable foreign keys, busy timeout, and WAL mode for high concurrency
try {
  sqlite.exec('PRAGMA busy_timeout = 5000;');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.exec('PRAGMA journal_mode = WAL;');
} catch {
  // Ignored if already configured or locked by another worker
}

// Initialize tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_verified INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS career_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS automation_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resume_documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    extracted_text TEXT NOT NULL,
    is_scanned INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resume_versions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id TEXT,
    vacancy_id TEXT,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cached_vacancies (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    url TEXT NOT NULL,
    data TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    retrieved_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vacancy_id TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, vacancy_id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT,
    severity TEXT DEFAULT 'info',
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    billing_interval TEXT NOT NULL DEFAULT 'monthly',
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read INTEGER NOT NULL DEFAULT 0,
    meta TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
  CREATE INDEX IF NOT EXISTS idx_apps_user ON applications(user_id);

  CREATE TABLE IF NOT EXISTS opportunity_signals (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    signal_type TEXT NOT NULL,
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

  CREATE TABLE IF NOT EXISTS interview_mock_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id TEXT,
    role_title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    interview_type TEXT NOT NULL DEFAULT 'behavioral',
    questions_json TEXT NOT NULL DEFAULT '[]',
    answers_json TEXT NOT NULL DEFAULT '[]',
    feedback_json TEXT NOT NULL DEFAULT '{}',
    improvement_areas_json TEXT NOT NULL DEFAULT '[]',
    overall_score INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recruiter_review_audits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    role_alignment_score INTEGER NOT NULL DEFAULT 0,
    review_categories_json TEXT NOT NULL DEFAULT '{}',
    evidence_classification_json TEXT NOT NULL DEFAULT '{}',
    strongest_points_json TEXT NOT NULL DEFAULT '[]',
    potential_concerns_json TEXT NOT NULL DEFAULT '[]',
    missing_mandatory_json TEXT NOT NULL DEFAULT '[]',
    resume_improvements_json TEXT NOT NULL DEFAULT '[]',
    clarification_questions_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, application_id)
  );

  CREATE TABLE IF NOT EXISTS career_trajectories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trajectory_title TEXT NOT NULL,
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

  CREATE INDEX IF NOT EXISTS idx_mock_sessions_user ON interview_mock_sessions(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_recruiter_audits_user ON recruiter_review_audits(user_id, application_id);
  CREATE INDEX IF NOT EXISTS idx_career_trajectories_user ON career_trajectories(user_id, is_active);
  CREATE INDEX IF NOT EXISTS idx_opportunity_signals_published ON opportunity_signals(published_date);
  CREATE INDEX IF NOT EXISTS idx_vacancies_active ON cached_vacancies(is_active);

  
  CREATE TABLE IF NOT EXISTS candidate_facts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    field TEXT NOT NULL,
    value TEXT NOT NULL,
    original_source TEXT NOT NULL,
    source_document_id TEXT,
    evidence_text TEXT,
    verification_status TEXT NOT NULL DEFAULT 'EXTRACTED',
    confidence REAL NOT NULL DEFAULT 1.0,
    last_updated TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_candidate_facts_user ON candidate_facts(user_id);
  CREATE INDEX IF NOT EXISTS idx_candidate_facts_category ON candidate_facts(user_id, category);

  CREATE TABLE IF NOT EXISTS founder_profile (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    designation TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    company_name TEXT NOT NULL,
    short_bio TEXT,
    bio_paragraphs TEXT NOT NULL,
    mission_statement TEXT,
    quote TEXT NOT NULL,
    quote_author TEXT NOT NULL,
    expertise_tags TEXT NOT NULL,
    linkedin_url TEXT NOT NULL,
    story_url TEXT NOT NULL,
    photo_url TEXT,
    photo_asset_id TEXT,
    photo_aspect_ratio TEXT DEFAULT '1:1',
    is_published INTEGER NOT NULL DEFAULT 1,
    draft_data TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT
  );

  CREATE TABLE IF NOT EXISTS founder_image_assets (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    data_base64 TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}


// Ensure resume_documents has all durable storage & extraction columns
try {
  const resumeCols = sqlite.prepare('PRAGMA table_info(resume_documents)').all() as Array<{ name: string }>;
  const colNames = new Set(resumeCols.map(c => c.name));
  
  if (!colNames.has('storage_key')) sqlite.exec('ALTER TABLE resume_documents ADD COLUMN storage_key TEXT;');
  if (!colNames.has('file_hash')) sqlite.exec('ALTER TABLE resume_documents ADD COLUMN file_hash TEXT;');
  if (!colNames.has('mime_type')) sqlite.exec('ALTER TABLE resume_documents ADD COLUMN mime_type TEXT;');
  if (!colNames.has('page_count')) sqlite.exec('ALTER TABLE resume_documents ADD COLUMN page_count INTEGER DEFAULT 1;');
  if (!colNames.has('extraction_status')) sqlite.exec("ALTER TABLE resume_documents ADD COLUMN extraction_status TEXT DEFAULT 'SUCCESS';");
  if (!colNames.has('extraction_method')) sqlite.exec("ALTER TABLE resume_documents ADD COLUMN extraction_method TEXT DEFAULT 'HEURISTIC';");
  if (!colNames.has('parser_model')) sqlite.exec('ALTER TABLE resume_documents ADD COLUMN parser_model TEXT;');
  if (!colNames.has('error_message')) sqlite.exec('ALTER TABLE resume_documents ADD COLUMN error_message TEXT;');
  if (!colNames.has('warnings')) sqlite.exec('ALTER TABLE resume_documents ADD COLUMN warnings TEXT;');
  if (!colNames.has('processing_duration_ms')) sqlite.exec('ALTER TABLE resume_documents ADD COLUMN processing_duration_ms INTEGER DEFAULT 0;');
  if (!colNames.has('updated_at')) sqlite.exec('ALTER TABLE resume_documents ADD COLUMN updated_at TEXT;');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS resume_extraction_runs (
      id TEXT PRIMARY KEY,
      resume_id TEXT NOT NULL REFERENCES resume_documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      run_type TEXT NOT NULL,
      status TEXT NOT NULL,
      extraction_method TEXT NOT NULL,
      parser_model TEXT,
      structured_output TEXT,
      diagnostics TEXT,
      error_message TEXT,
      warnings TEXT,
      duration_ms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resume_extraction_versions (
      id TEXT PRIMARY KEY,
      resume_id TEXT NOT NULL REFERENCES resume_documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      data TEXT NOT NULL,
      diff_summary TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resume_extraction_events (
      id TEXT PRIMARY KEY,
      resume_id TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      admin_email TEXT NOT NULL,
      event_type TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_imported_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vacancy_id TEXT NOT NULL REFERENCES cached_vacancies(id) ON DELETE CASCADE,
      original_url TEXT NOT NULL,
      canonical_url TEXT NOT NULL,
      source_domain TEXT NOT NULL,
      extraction_status TEXT NOT NULL,
      extraction_method TEXT NOT NULL,
      extraction_confidence REAL NOT NULL DEFAULT 1.0,
      extracted_data TEXT NOT NULL,
      candidate_edits TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_archived INTEGER DEFAULT 0,
      UNIQUE(user_id, canonical_url)
    );

    CREATE INDEX IF NOT EXISTS idx_imported_jobs_user ON user_imported_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_imported_jobs_canonical ON user_imported_jobs(canonical_url);
    CREATE INDEX IF NOT EXISTS idx_imported_jobs_vacancy ON user_imported_jobs(vacancy_id);

    CREATE TABLE IF NOT EXISTS membership_grants (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL,
      validity_type TEXT NOT NULL,
      membership_source TEXT NOT NULL DEFAULT 'ADMIN_GRANT',
      starts_at TEXT NOT NULL,
      expires_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      granted_by TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mgrants_user_id ON membership_grants(user_id);
    CREATE INDEX IF NOT EXISTS idx_mgrants_status ON membership_grants(status);
    CREATE INDEX IF NOT EXISTS idx_mgrants_expires_at ON membership_grants(expires_at);
    CREATE INDEX IF NOT EXISTS idx_mgrants_plan ON membership_grants(plan);

    CREATE TABLE IF NOT EXISTS user_invitations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
    CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
  `);
} catch (e) {
  console.warn('[SQLite Resume Migration Warning]:', e);
}

export const authAndStore = {
  // --- AUTHENTICATION ---
  createUser(fullName: string, email: string, passwordPlain: string): AuthUser {
    const cleanName = fullName ? fullName.trim() : '';
    if (!cleanName || cleanName.length < 2) {
      throw new Error('Full name is required (minimum 2 characters)');
    }
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Valid email required');
    }
    if (!passwordPlain || passwordPlain.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const checkStmt = sqlite.prepare('SELECT id FROM users WHERE email = ?');
    const existing = checkStmt.get(cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists');
    }

    const id = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(passwordPlain, 10);
    const now = new Date().toISOString();

    const insertStmt = sqlite.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'user', 1, ?, ?)
    `);
    insertStmt.run(id, cleanEmail, passwordHash, fullName.trim(), now, now);

    // Initialize blank profile for the new user (never fictional)
    const defaultProfile: UserProfile = {
      id: crypto.randomUUID(),
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: '',
      location: '',
      workAuthorizationCountry: '',
      workAuthorizationStatus: '',
      workAuthorization: [],
      requiresVisaSponsorship: false,
      currentTitle: '',
      currentEmployer: '',
      totalExperienceYears: 0,
      professionalSummary: '',
      education: [],
      certifications: [],
      skills: [],
      experiences: [],
      languages: [],
      masterResumeLastUpdated: '',
    };
    authAndStore.saveProfile(id, defaultProfile);

    // Initial blank career preferences (user configured)
    const defaultPrefs: CareerPreferences = {
      targetRoles: [],
      targetCountries: [],
      targetCities: [],
      preferredTitles: [],
      preferredIndustries: [],
      workArrangement: ['remote', 'hybrid'],
      workArrangements: ['remote', 'hybrid'],
      minSalaryUSD: 0,
      minSalaryByCurrency: { USD: 0 },
      preferredEmploymentType: ['full-time'],
      willingnessToRelocate: 'negotiable',
      visaSponsorshipRequired: false,
      requiresVisaSponsorship: false,
      preferredCompanies: [],
      excludedCompanies: [],
      excludedKeywords: [],
      minMatchThreshold: 60,
      maxDailyApplications: 10,
    };
    authAndStore.savePreferences(id, defaultPrefs);

    // Default automation settings
    const defaultSettings: AutomationSettings = {
      mode: 'MODE_B_PREPARE_APPROVE',
      emergencyStop: false,
      autoApplyThreshold: 80,
      autoTailor: true,
      autoApplyPreapproved: false,
      dailyApplicationLimit: 5,
      applicationsSubmittedToday: 0,
      retryFailedSubmissions: true,
      maxRetries: 2,
      scheduledSearchEnabled: true,
      scheduledSearchIntervalMinutes: 360,
      scoringWeights: {
        skillsWeight: 30,
        experienceWeight: 25,
        qualificationsWeight: 15,
        seniorityWeight: 10,
        locationWeight: 10,
        salaryWeight: 10,
      },
      requireApprovalForLegalDeclarations: true,
      requireApprovalForRelocation: true,
      requireApprovalForVisaQuestions: true,
      requireApprovalForSalaryCommitments: true,
    };
    authAndStore.saveSettings(id, defaultSettings);

    authAndStore.addAuditLog(id, 'User Signup', 'ACCOUNT_CREATED', cleanEmail, 'New user registered successfully');
    authAndStore.addNotification(id, 'Welcome to ApplyVise AI', 'Your account is ready. Upload your resume to start personalized job discovery!', 'system');

    return {
      id,
      email: cleanEmail,
      fullName: fullName.trim(),
      role: 'user',
      isVerified: true,
      createdAt: now,
    };
  },

  verifyLogin(email: string, passwordPlain: string): { user: AuthUser; token: string } {
    const cleanEmail = email.toLowerCase().trim();
    const stmt = sqlite.prepare('SELECT id, email, password_hash, full_name, role, is_verified, created_at FROM users WHERE email = ?');
    const userRow = stmt.get(cleanEmail) as { id: string; email: string; password_hash: string; full_name: string; role: string; is_verified: number; created_at: string } | undefined;

    if (!userRow) {
      throw new Error('Invalid email or password');
    }

    const matches = bcrypt.compareSync(passwordPlain, userRow.password_hash);
    if (!matches) {
      throw new Error('Invalid email or password');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const sessionStmt = sqlite.prepare(`
      INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    sessionStmt.run(sessionId, userRow.id, token, expiresAt, now.toISOString());

    return {
      user: {
        id: userRow.id,
        email: userRow.email,
        fullName: userRow.full_name,
        role: userRow.role,
        isVerified: !!userRow.is_verified,
        createdAt: userRow.created_at,
      },
      token,
    };
  },

  getUserByToken(token: string): AuthUser | null {
    if (!token) return null;
    const stmt = sqlite.prepare(`
      SELECT u.id, u.email, u.full_name, u.role, u.is_verified, u.created_at, s.expires_at
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
    `);
    const row = stmt.get(token) as { id: string; email: string; full_name: string; role: string; is_verified: number; created_at: string; expires_at: string } | undefined;
    if (!row) return null;

    if (new Date(row.expires_at) < new Date()) {
      sqlite.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      isVerified: !!row.is_verified,
      createdAt: row.created_at,
    };
  },

  updateUserRole(userId: string, role: string): void {
    const stmt = sqlite.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?');
    stmt.run(role, new Date().toISOString(), userId);
  },

  logoutSession(token: string): void {
    if (!token) return;
    sqlite.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
  },

  getUserByEmail(email: string): AuthUser | null {
    if (!email) return null;
    const stmt = sqlite.prepare('SELECT id, email, full_name, role, is_verified, created_at FROM users WHERE email = ?');
    const row = stmt.get(email.toLowerCase().trim()) as { id: string; email: string; full_name: string; role: string; is_verified: number; created_at: string } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      isVerified: !!row.is_verified,
      createdAt: row.created_at,
    };
  },

  loginWithGoogle(email: string, fullName: string, sub: string): { user: AuthUser; token: string } {
    const cleanEmail = email.toLowerCase().trim();
    let existing = this.getUserByEmail(cleanEmail);
    if (!existing) {
      const id = crypto.randomUUID();
      const generatedPass = `google_oauth_${sub}_${crypto.randomUUID()}`;
      const passwordHash = bcrypt.hashSync(generatedPass, 10);
      const now = new Date().toISOString();
      sqlite.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, is_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'user', 1, ?, ?)
      `).run(id, cleanEmail, passwordHash, fullName || cleanEmail.split('@')[0], now, now);

      existing = {
        id,
        email: cleanEmail,
        fullName: fullName || cleanEmail.split('@')[0],
        role: 'user',
        isVerified: true,
        createdAt: now,
      };

      authAndStore.saveProfile(id, {
        id: crypto.randomUUID(),
        fullName: existing.fullName,
        email: cleanEmail,
        phone: '',
        location: '',
        workAuthorizationCountry: '',
        workAuthorizationStatus: '',
        workAuthorization: [],
        requiresVisaSponsorship: false,
        currentTitle: '',
        currentEmployer: '',
        totalExperienceYears: 0,
        professionalSummary: '',
        education: [],
        certifications: [],
        skills: [],
        experiences: [],
        languages: [],
        masterResumeLastUpdated: '',
      });
      authAndStore.addAuditLog(id, 'User Signup', 'ACCOUNT_CREATED_GOOGLE', cleanEmail, 'User registered via Google OAuth');
      authAndStore.addNotification(id, 'Welcome to ApplyVise AI', 'Your Google account is connected. Upload your resume to begin!', 'system');
    }

    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    sqlite.prepare(`
      INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, existing.id, token, expiresAt, now.toISOString());

    return { user: existing, token };
  },

  // --- PER-USER PROFILE ---
  getProfile(userId: string): UserProfile | null {
    const stmt = sqlite.prepare('SELECT data FROM user_profiles WHERE user_id = ?');
    const row = stmt.get(userId) as { data: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  },

  saveProfile(userId: string, profile: UserProfile): void {
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO user_profiles (user_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `);
    stmt.run(userId, JSON.stringify(profile), now);
  },

  // --- PER-USER PREFERENCES ---
  getPreferences(userId: string): CareerPreferences {
    const stmt = sqlite.prepare('SELECT data FROM career_preferences WHERE user_id = ?');
    const row = stmt.get(userId) as { data: string } | undefined;
    if (row) {
      try {
        return JSON.parse(row.data);
      } catch {
        // fallback
      }
    }
    return {
      targetRoles: ['Software Engineer', 'Product Manager'],
      targetCountries: ['United States', 'Canada', 'Remote'],
      targetCities: [],
      preferredTitles: ['Software Engineer', 'Product Manager'],
      preferredIndustries: ['Technology'],
      workArrangement: ['remote', 'hybrid'],
      workArrangements: ['remote', 'hybrid'],
      minSalaryUSD: 80000,
      minSalaryByCurrency: { USD: 80000 },
      preferredEmploymentType: ['full-time'],
      willingnessToRelocate: 'negotiable',
      visaSponsorshipRequired: false,
      requiresVisaSponsorship: false,
      preferredCompanies: [],
      excludedCompanies: [],
      excludedKeywords: [],
      minMatchThreshold: 60,
      maxDailyApplications: 10,
    };
  },

  savePreferences(userId: string, prefs: CareerPreferences): void {
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO career_preferences (user_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `);
    stmt.run(userId, JSON.stringify(prefs), now);
  },

  // --- PER-USER SETTINGS ---
  getSettings(userId: string): AutomationSettings {
    const stmt = sqlite.prepare('SELECT data FROM automation_settings WHERE user_id = ?');
    const row = stmt.get(userId) as { data: string } | undefined;
    if (row) {
      try {
        return JSON.parse(row.data);
      } catch {
        // fallback
      }
    }
    return {
      mode: 'MODE_B_PREPARE_APPROVE',
      emergencyStop: false,
      autoApplyThreshold: 80,
      autoTailor: true,
      autoApplyPreapproved: false,
      dailyApplicationLimit: 5,
      applicationsSubmittedToday: 0,
      retryFailedSubmissions: true,
      maxRetries: 2,
      scheduledSearchEnabled: true,
      scheduledSearchIntervalMinutes: 360,
      scoringWeights: {
        skillsWeight: 30,
        experienceWeight: 25,
        qualificationsWeight: 15,
        seniorityWeight: 10,
        locationWeight: 10,
        salaryWeight: 10,
      },
      requireApprovalForLegalDeclarations: true,
      requireApprovalForRelocation: true,
      requireApprovalForVisaQuestions: true,
      requireApprovalForSalaryCommitments: true,
    };
  },

  saveSettings(userId: string, settings: AutomationSettings): void {
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO automation_settings (user_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `);
    stmt.run(userId, JSON.stringify(settings), now);
  },

  // --- RESUME DOCUMENTS & VERSIONS ---
  saveResumeDocument(
    userId: string,
    doc: {
      id?: string;
      fileName: string;
      fileType: string;
      fileSizeBytes: number;
      extractedText: string;
      isScanned: boolean;
      storageKey?: string | null;
      fileHash?: string | null;
      mimeType?: string;
      pageCount?: number;
      extractionStatus?: string;
      extractionMethod?: string;
      parserModel?: string;
      errorMessage?: string;
      warnings?: string[];
      processingDurationMs?: number;
    },
    replaceExisting: boolean = false
  ): string {
    const id = doc.id || crypto.randomUUID();
    const now = new Date().toISOString();
    
    if (replaceExisting) {
      try {
        sqlite.prepare('DELETE FROM resume_documents WHERE user_id = ?').run(userId);
      } catch {}
    }

    const stmt = sqlite.prepare(`
      INSERT INTO resume_documents (
        id, user_id, file_name, file_type, file_size_bytes, extracted_text, is_scanned,
        storage_key, file_hash, mime_type, page_count, extraction_status, extraction_method,
        parser_model, error_message, warnings, processing_duration_ms, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId,
      doc.fileName,
      doc.fileType,
      doc.fileSizeBytes,
      doc.extractedText,
      doc.isScanned ? 1 : 0,
      doc.storageKey || null,
      doc.fileHash || null,
      doc.mimeType || (doc.fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      doc.pageCount || 1,
      doc.extractionStatus || (doc.isScanned ? 'SCANNED' : 'SUCCESS'),
      doc.extractionMethod || 'HEURISTIC',
      doc.parserModel || null,
      doc.errorMessage || null,
      doc.warnings ? JSON.stringify(doc.warnings) : null,
      doc.processingDurationMs || 0,
      now,
      now
    );
    return id;
  },

  saveResumeVersion(userId: string, ver: { applicationId?: string; vacancyId?: string; content: TailoredResumeContent; coverLetter?: string; truthfulnessScore: number; auditIssues?: string[] }): string {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO resume_versions (id, user_id, application_id, vacancy_id, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, ver.applicationId || null, ver.vacancyId || null, JSON.stringify(ver), now);
    return id;
  },

  getResumeVersion(userId: string, versionId: string): any | null {
    const stmt = sqlite.prepare('SELECT data FROM resume_versions WHERE id = ? AND user_id = ?');
    const row = stmt.get(versionId, userId) as { data: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  },

  // --- VACANCIES (Shared deduplicated repository) ---
  saveVacancies(vacancies: JobVacancy[]): number {
    let saved = 0;
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO cached_vacancies (id, source, title, company, location, url, data, is_active, retrieved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET
        is_active = 1,
        retrieved_at = excluded.retrieved_at,
        data = excluded.data
    `);

    for (const v of vacancies) {
      try {
        stmt.run(v.id, v.source, v.title, v.company, v.location, v.url, JSON.stringify(v), now);
        saved++;
      } catch (err) {
        // ignore duplicate / constraint errors
      }
    }
    return saved;
  },

  getVacancies(limit = 100): JobVacancy[] {
    const stmt = sqlite.prepare("SELECT data FROM cached_vacancies WHERE is_active = 1 AND source != 'imported' ORDER BY retrieved_at DESC LIMIT ?");
    const rows = stmt.all(limit) as Array<{ data: string }>;
    return rows.map(r => {
      try {
        return JSON.parse(r.data) as JobVacancy;
      } catch {
        return null;
      }
    }).filter((v): v is JobVacancy => v !== null);
  },

  getVacancyById(id: string): JobVacancy | null {
    const stmt = sqlite.prepare('SELECT data FROM cached_vacancies WHERE id = ?');
    const row = stmt.get(id) as { data: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.data) as JobVacancy;
    } catch {
      return null;
    }
  },

  // --- PER-USER APPLICATIONS ---
  getApplications(userId: string): ApplicationRecord[] {
    const stmt = sqlite.prepare('SELECT data FROM applications WHERE user_id = ? ORDER BY updated_at DESC');
    const rows = stmt.all(userId) as Array<{ data: string }>;
    return rows.map(r => {
      try {
        return JSON.parse(r.data) as ApplicationRecord;
      } catch {
        return null;
      }
    }).filter((a): a is ApplicationRecord => a !== null);
  },

  getApplicationById(userId: string, id: string): ApplicationRecord | null {
    const stmt = sqlite.prepare('SELECT data FROM applications WHERE id = ? AND user_id = ?');
    const row = stmt.get(id, userId) as { data: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.data) as ApplicationRecord;
    } catch {
      return null;
    }
  },

  saveApplication(userId: string, app: ApplicationRecord): void {
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO applications (id, user_id, vacancy_id, company, role, status, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        data = excluded.data,
        updated_at = excluded.updated_at
    `);
    stmt.run(app.id, userId, app.vacancyId || null, app.company, app.role, app.status, JSON.stringify(app), app.createdAt || now, now);
  },

  // --- AUDIT LOGS & NOTIFICATIONS ---
  addAuditLog(userId: string, actor: string, action: string, target: string, details: string, severity: 'info' | 'warning' | 'security' = 'info'): void {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO audit_logs (id, user_id, actor, action, target, details, severity, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, actor, action, target, details, severity, now);
  },

  getAuditLogs(userId: string, limit = 50): AuditLogEntry[] {
    const stmt = sqlite.prepare('SELECT id, timestamp, actor, action, target, details, severity FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(userId, limit) as Array<{ id: string; timestamp: string; actor: string; action: string; target: string; details: string; severity: 'info' | 'warning' | 'security' }>;
    return rows.map(r => ({
      ...r,
      actor: r.actor as any,
    }));
  },

  addNotification(userId: string, title: string, message: string, type: string, meta?: Record<string, unknown>): void {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, read, meta, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `);
    stmt.run(id, userId, title, message, type, meta ? JSON.stringify(meta) : null, now);
  },

  getNotifications(userId: string, limit = 20): NotificationItem[] {
    const stmt = sqlite.prepare('SELECT id, title, message, type, read, meta, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?');
    const rows = stmt.all(userId, limit) as Array<{ id: string; title: string; message: string; type: string; read: number; meta: string | null; created_at: string }>;
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type as any,
      read: !!r.read,
      meta: r.meta ? JSON.parse(r.meta) : undefined,
      timestamp: r.created_at,
    }));
  },

  markNotificationsRead(userId: string, notificationId?: string): void {
    if (notificationId) {
      sqlite.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(notificationId, userId);
    } else {
      sqlite.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
    }
  },


  getUserSubscription(userId: string): {
    planId: 'free' | 'pro' | 'black';
    status: 'active' | 'cancelled' | 'past_due' | 'expired';
    billingInterval: 'monthly' | 'annual' | 'permanent';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    membershipSource?: MembershipSource;
    validityType?: string;
    grantId?: string;
    grantedBy?: string;
    remainingDays?: number | null;
  } {
    const userRow = sqlite.prepare('SELECT email, is_verified FROM users WHERE id = ?').get(userId) as any;
    if (userRow && isPermanentFreeAccessAccount({ email: userRow.email, isVerified: Boolean(userRow.is_verified) })) {
      const now = new Date().toISOString();
      return {
        planId: 'black',
        status: 'active',
        billingInterval: 'permanent',
        currentPeriodStart: now,
        currentPeriodEnd: '2099-12-31T23:59:59.999Z',
        cancelAtPeriodEnd: false,
        membershipSource: 'SYSTEM',
        validityType: 'lifetime',
        remainingDays: null,
      };
    }

    // 1. Check for Active Administrative Membership Grant
    const activeGrant = sqlite.prepare(
      "SELECT * FROM membership_grants WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
    ).get(userId) as any;

    if (activeGrant) {
      const now = new Date();
      // Check if temporary grant has reached expiry timestamp
      if (activeGrant.expires_at && new Date(activeGrant.expires_at).getTime() <= now.getTime()) {
        // Automatically mark expired
        sqlite.prepare("UPDATE membership_grants SET status = 'expired', updated_at = ? WHERE id = ?")
          .run(now.toISOString(), activeGrant.id);

        try {
          const userEmail = userRow?.email || 'unknown';
          authAndStore.addAuditLog(
            userId,
            'System Scheduler',
            'MEMBERSHIP_EXPIRED',
            `Membership (${activeGrant.plan.toUpperCase()} - ${activeGrant.validity_type})`,
            JSON.stringify({
              targetUserId: userId,
              targetEmail: userEmail,
              adminId: activeGrant.granted_by,
              previousPlan: activeGrant.plan,
              newPlan: 'free',
              previousExpiry: activeGrant.expires_at,
              newExpiry: null,
              actionType: 'MEMBERSHIP_EXPIRED',
              validityType: activeGrant.validity_type,
              reason: 'Automatic expiration timestamp reached',
              source: 'ADMIN_GRANT'
            })
          );
          authAndStore.addNotification(
            userId,
            'Membership Expired',
            `Your administrative ${activeGrant.plan.toUpperCase()} membership has expired. Renew or upgrade to continue enjoying premium capabilities.`,
            'warning',
            { plan: activeGrant.plan, expiredAt: activeGrant.expires_at }
          );
        } catch {
          // Non-blocking log catch
        }
      } else {
        // Active and valid administrative grant
        return {
          planId: activeGrant.plan as 'free' | 'pro' | 'black',
          status: 'active',
          billingInterval: activeGrant.validity_type === 'lifetime' ? 'permanent' : 'annual',
          currentPeriodStart: activeGrant.starts_at,
          currentPeriodEnd: activeGrant.expires_at || '2099-12-31T23:59:59.999Z',
          cancelAtPeriodEnd: false,
          membershipSource: 'ADMIN_GRANT',
          validityType: activeGrant.validity_type,
          grantId: activeGrant.id,
          grantedBy: activeGrant.granted_by,
          remainingDays: calculateRemainingDays(activeGrant.expires_at),
        };
      }
    }

    // 2. Check for Standard / Paid Subscription
    const row = sqlite.prepare(
      'SELECT plan_id, status, billing_interval, current_period_start, current_period_end, cancel_at_period_end FROM user_subscriptions WHERE user_id = ?'
    ).get(userId) as any;

    if (!row) {
      const now = new Date().toISOString();
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      return {
        planId: 'free',
        status: 'active',
        billingInterval: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        cancelAtPeriodEnd: false,
        membershipSource: 'SYSTEM',
        validityType: 'monthly',
        remainingDays: 30,
      };
    }

    const isExpired = row.current_period_end && new Date(row.current_period_end).getTime() <= Date.now() && row.billing_interval !== 'permanent';
    const effectivePlanId = isExpired ? 'free' : (row.plan_id as 'free' | 'pro' | 'black');
    const effectiveStatus = isExpired ? 'expired' : (row.status as 'active' | 'cancelled' | 'past_due');

    return {
      planId: effectivePlanId,
      status: effectiveStatus,
      billingInterval: row.billing_interval as 'monthly' | 'annual' | 'permanent',
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      membershipSource: 'PAYMENT',
      validityType: row.billing_interval,
      remainingDays: calculateRemainingDays(row.current_period_end),
    };
  },

  getActiveMembershipGrant(userId: string): any | null {
    return sqlite.prepare(
      "SELECT * FROM membership_grants WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
    ).get(userId) || null;
  },

  createOrInviteUserWithMembership(params: {
    fullName: string;
    email: string;
    plan: MembershipPlanId;
    validity: MembershipValidityType;
    accountStatus?: string;
    notes?: string;
    adminId: string;
    adminEmail?: string;
    correlationId?: string;
  }): {
    success: boolean;
    isNewUser: boolean;
    user: { id: string; email: string; fullName: string; role: string };
    grant: MembershipGrant;
    invitationStatus: string;
    invitationUrl?: string;
    message: string;
  } {
    const cleanEmail = params.email ? params.email.toLowerCase().trim() : '';
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('A valid email address is required');
    }
    const cleanName = params.fullName ? params.fullName.trim() : cleanEmail.split('@')[0];

    const validPlans: MembershipPlanId[] = ['free', 'pro', 'black'];
    if (!validPlans.includes(params.plan)) {
      throw new Error(`Invalid plan selected: ${params.plan}`);
    }

    const validValidity: MembershipValidityType[] = ['6_months', '12_months', '24_months', 'lifetime'];
    if (!validValidity.includes(params.validity)) {
      throw new Error(`Invalid validity selected: ${params.validity}`);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const correlationId = params.correlationId || crypto.randomUUID();

    let targetUser = sqlite.prepare('SELECT id, email, full_name, role FROM users WHERE email = ?').get(cleanEmail) as any;
    let isNewUser = false;
    let invitationToken: string | undefined;

    if (!targetUser) {
      isNewUser = true;
      const newUserId = crypto.randomUUID();
      // Generate a strong random cryptographic secret for initial hash (never plaintext to admin)
      const secretEntropy = crypto.randomBytes(32).toString('hex');
      const passwordHash = bcrypt.hashSync(secretEntropy, 10);

      sqlite.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, is_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'user', 1, ?, ?)
      `).run(newUserId, cleanEmail, passwordHash, cleanName, nowIso, nowIso);

      // Initialize default user profile
      const defaultProfile: UserProfile = {
        id: crypto.randomUUID(),
        fullName: cleanName,
        email: cleanEmail,
        phone: '',
        location: '',
        workAuthorizationCountry: '',
        workAuthorizationStatus: '',
        workAuthorization: [],
        requiresVisaSponsorship: false,
        currentTitle: '',
        currentEmployer: '',
        totalExperienceYears: 0,
        professionalSummary: '',
        education: [],
        certifications: [],
        skills: [],
        experiences: [],
        languages: [],
        masterResumeLastUpdated: '',
      };
      authAndStore.saveProfile(newUserId, defaultProfile);

      // Create Invitation record with secure invitation token
      invitationToken = crypto.randomBytes(32).toString('hex');
      const invitationExpiry = addCalendarMonthsUTC(now, 1).toISOString();
      sqlite.prepare(`
        INSERT INTO user_invitations (id, user_id, email, token, status, expires_at, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
      `).run(crypto.randomUUID(), newUserId, cleanEmail, invitationToken, invitationExpiry, nowIso);

      // Audit user creation & invitation
      authAndStore.addAuditLog(
        newUserId,
        params.adminEmail || params.adminId,
        'USER_INVITED',
        `User Account (${cleanEmail})`,
        JSON.stringify({
          targetUserId: newUserId,
          targetEmail: cleanEmail,
          adminId: params.adminId,
          adminEmail: params.adminEmail || params.adminId,
          actionType: 'USER_INVITED',
          correlationId,
          reason: params.notes || 'Administrative user invitation & provisioning'
        })
      );

      targetUser = {
        id: newUserId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'user',
      };
    }

    // Previous subscription inspection
    const previousSub = authAndStore.getUserSubscription(targetUser.id);
    const previousPlan = previousSub.planId;
    const previousExpiry = previousSub.currentPeriodEnd;

    // Calculate dates strictly on the backend
    const startsAt = nowIso;
    const expiresAt = calculateMembershipExpiry(now, params.validity);

    // Deactivate prior active grants for this user
    sqlite.prepare("UPDATE membership_grants SET status = 'revoked', updated_at = ? WHERE user_id = ? AND status = 'active'")
      .run(nowIso, targetUser.id);

    // Insert new grant
    const grantId = crypto.randomUUID();
    sqlite.prepare(`
      INSERT INTO membership_grants (
        id, user_id, plan, validity_type, membership_source, starts_at, expires_at, status, granted_by, reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ADMIN_GRANT', ?, ?, 'active', ?, ?, ?, ?)
    `).run(
      grantId,
      targetUser.id,
      params.plan,
      params.validity,
      startsAt,
      expiresAt,
      params.adminId,
      params.notes || '',
      nowIso,
      nowIso
    );

    // Sync user_subscriptions table
    const billingInterval = params.validity === 'lifetime' ? 'permanent' : 'annual';
    sqlite.prepare(`
      INSERT INTO user_subscriptions (
        id, user_id, plan_id, status, billing_interval, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
      ) VALUES (?, ?, ?, 'active', ?, ?, ?, 0, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        plan_id = excluded.plan_id,
        status = excluded.status,
        billing_interval = excluded.billing_interval,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = 0,
        updated_at = excluded.updated_at
    `).run(
      crypto.randomUUID(),
      targetUser.id,
      params.plan,
      billingInterval,
      startsAt,
      expiresAt || '2099-12-31T23:59:59.999Z',
      nowIso,
      nowIso
    );

    // Audit membership grant
    const actionType = isNewUser ? 'MEMBERSHIP_GRANTED' : (previousPlan === params.plan ? 'MEMBERSHIP_CHANGED' : 'MEMBERSHIP_GRANTED');
    authAndStore.addAuditLog(
      targetUser.id,
      params.adminEmail || params.adminId,
      actionType,
      `Membership (${params.plan.toUpperCase()} - ${params.validity})`,
      JSON.stringify({
        targetUserId: targetUser.id,
        targetEmail: cleanEmail,
        adminId: params.adminId,
        adminEmail: params.adminEmail || params.adminId,
        previousPlan,
        newPlan: params.plan,
        previousExpiry,
        newExpiry: expiresAt,
        validityType: params.validity,
        actionType,
        reason: params.notes || 'Administrative membership provision',
        source: 'ADMIN_GRANT',
        correlationId
      })
    );

    const derivedStatus = deriveMembershipStatus(startsAt, expiresAt, 'active');
    const remainingDays = calculateRemainingDays(expiresAt);

    const grant: MembershipGrant = {
      id: grantId,
      userId: targetUser.id,
      userEmail: cleanEmail,
      userName: targetUser.full_name,
      plan: params.plan,
      validityType: params.validity,
      membershipSource: 'ADMIN_GRANT',
      startsAt,
      expiresAt,
      status: 'active',
      derivedStatus,
      remainingDays,
      grantedBy: params.adminId,
      grantedByEmail: params.adminEmail,
      reason: params.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return {
      success: true,
      isNewUser,
      user: {
        id: targetUser.id,
        email: cleanEmail,
        fullName: targetUser.full_name,
        role: targetUser.role,
      },
      grant,
      invitationStatus: isNewUser ? 'INVITATION_CREATED_NO_EMAIL_SERVICE' : 'ACCOUNT_ACTIVE',
      invitationUrl: invitationToken ? `/auth/invitation?token=${invitationToken}` : undefined,
      message: isNewUser
        ? 'User successfully provisioned with administrative membership. Email delivery provider is unconfigured; please copy setup link.'
        : `Membership for ${cleanEmail} successfully updated to ${params.plan.toUpperCase()}.`,
    };
  },

  assignUserMembership(params: {
    userId: string;
    plan: MembershipPlanId;
    validity: MembershipValidityType;
    notes?: string;
    adminId: string;
    adminEmail?: string;
    confirmOverridePaid?: boolean;
    correlationId?: string;
  }): MembershipGrant {
    const user = sqlite.prepare('SELECT id, email, full_name FROM users WHERE id = ?').get(params.userId) as any;
    if (!user) {
      throw new Error(`User not found with id: ${params.userId}`);
    }

    const previousSub = authAndStore.getUserSubscription(params.userId);
    if (previousSub.membershipSource === 'PAYMENT' && previousSub.status === 'active' && previousSub.planId !== 'free' && !params.confirmOverridePaid) {
      throw new Error('This user has an active paid subscription. Explicit confirmation (confirmOverridePaid: true) is required before overriding with an administrative grant.');
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const correlationId = params.correlationId || crypto.randomUUID();
    const startsAt = nowIso;
    const expiresAt = calculateMembershipExpiry(now, params.validity);

    // Deactivate previous active grants
    sqlite.prepare("UPDATE membership_grants SET status = 'revoked', updated_at = ? WHERE user_id = ? AND status = 'active'")
      .run(nowIso, params.userId);

    const grantId = crypto.randomUUID();
    sqlite.prepare(`
      INSERT INTO membership_grants (
        id, user_id, plan, validity_type, membership_source, starts_at, expires_at, status, granted_by, reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ADMIN_GRANT', ?, ?, 'active', ?, ?, ?, ?)
    `).run(
      grantId,
      params.userId,
      params.plan,
      params.validity,
      startsAt,
      expiresAt,
      params.adminId,
      params.notes || '',
      nowIso,
      nowIso
    );

    // Sync user_subscriptions table
    const billingInterval = params.validity === 'lifetime' ? 'permanent' : 'annual';
    sqlite.prepare(`
      INSERT INTO user_subscriptions (
        id, user_id, plan_id, status, billing_interval, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
      ) VALUES (?, ?, ?, 'active', ?, ?, ?, 0, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        plan_id = excluded.plan_id,
        status = excluded.status,
        billing_interval = excluded.billing_interval,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = 0,
        updated_at = excluded.updated_at
    `).run(
      crypto.randomUUID(),
      params.userId,
      params.plan,
      billingInterval,
      startsAt,
      expiresAt || '2099-12-31T23:59:59.999Z',
      nowIso,
      nowIso
    );

    authAndStore.addAuditLog(
      params.userId,
      params.adminEmail || params.adminId,
      'MEMBERSHIP_CHANGED',
      `Membership (${params.plan.toUpperCase()} - ${params.validity})`,
      JSON.stringify({
        targetUserId: params.userId,
        targetEmail: user.email,
        adminId: params.adminId,
        adminEmail: params.adminEmail || params.adminId,
        previousPlan: previousSub.planId,
        newPlan: params.plan,
        previousExpiry: previousSub.currentPeriodEnd,
        newExpiry: expiresAt,
        validityType: params.validity,
        actionType: 'MEMBERSHIP_CHANGED',
        reason: params.notes || 'Administrative membership reassignment',
        source: 'ADMIN_GRANT',
        correlationId
      })
    );

    return {
      id: grantId,
      userId: params.userId,
      userEmail: user.email,
      userName: user.full_name,
      plan: params.plan,
      validityType: params.validity,
      membershipSource: 'ADMIN_GRANT',
      startsAt,
      expiresAt,
      status: 'active',
      derivedStatus: deriveMembershipStatus(startsAt, expiresAt, 'active'),
      remainingDays: calculateRemainingDays(expiresAt),
      grantedBy: params.adminId,
      grantedByEmail: params.adminEmail,
      reason: params.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  },

  extendUserMembership(params: {
    grantId: string;
    validity: MembershipValidityType;
    notes?: string;
    adminId: string;
    adminEmail?: string;
    correlationId?: string;
  }): MembershipGrant {
    const grant = sqlite.prepare('SELECT * FROM membership_grants WHERE id = ?').get(params.grantId) as any;
    if (!grant) {
      throw new Error(`Membership grant not found with id: ${params.grantId}`);
    }

    if (grant.validity_type === 'lifetime' || !grant.expires_at) {
      throw new Error('Lifetime memberships cannot be extended as they have no expiration date.');
    }

    const user = sqlite.prepare('SELECT id, email, full_name FROM users WHERE id = ?').get(grant.user_id) as any;
    const now = new Date();
    const nowIso = now.toISOString();

    // Base calculation: if current expiry is in the future, extend from that timestamp; otherwise from now
    const currentExpiryTime = new Date(grant.expires_at).getTime();
    const baseDate = currentExpiryTime > now.getTime() ? new Date(grant.expires_at) : now;

    let newExpiry: string | null = null;
    let newValidityType = grant.validity_type;

    if (params.validity === 'lifetime') {
      newExpiry = null;
      newValidityType = 'lifetime';
    } else {
      newExpiry = calculateMembershipExpiry(baseDate, params.validity);
    }

    sqlite.prepare(`
      UPDATE membership_grants
      SET expires_at = ?, validity_type = ?, status = 'active', reason = ?, updated_at = ?
      WHERE id = ?
    `).run(newExpiry, newValidityType, params.notes || grant.reason || '', nowIso, grant.id);

    // Sync user_subscriptions
    sqlite.prepare(`
      UPDATE user_subscriptions
      SET current_period_end = ?, updated_at = ?
      WHERE user_id = ?
    `).run(newExpiry || '2099-12-31T23:59:59.999Z', nowIso, grant.user_id);

    authAndStore.addAuditLog(
      grant.user_id,
      params.adminEmail || params.adminId,
      'MEMBERSHIP_EXTENDED',
      `Membership Extension (${grant.plan.toUpperCase()} + ${params.validity})`,
      JSON.stringify({
        targetUserId: grant.user_id,
        targetEmail: user?.email || '',
        adminId: params.adminId,
        adminEmail: params.adminEmail || params.adminId,
        previousPlan: grant.plan,
        newPlan: grant.plan,
        previousExpiry: grant.expires_at,
        newExpiry,
        validityType: newValidityType,
        actionType: 'MEMBERSHIP_EXTENDED',
        reason: params.notes || 'Administrative membership extension',
        source: 'ADMIN_GRANT',
        correlationId: params.correlationId || crypto.randomUUID()
      })
    );

    return {
      id: grant.id,
      userId: grant.user_id,
      userEmail: user?.email || '',
      userName: user?.full_name || '',
      plan: grant.plan,
      validityType: newValidityType,
      membershipSource: 'ADMIN_GRANT',
      startsAt: grant.starts_at,
      expiresAt: newExpiry,
      status: 'active',
      derivedStatus: deriveMembershipStatus(grant.starts_at, newExpiry, 'active'),
      remainingDays: calculateRemainingDays(newExpiry),
      grantedBy: grant.granted_by,
      grantedByEmail: params.adminEmail,
      reason: params.notes || grant.reason,
      createdAt: grant.created_at,
      updatedAt: nowIso,
    };
  },

  updateMembershipGrantStatus(params: {
    grantId: string;
    status: 'active' | 'suspended' | 'revoked';
    notes?: string;
    adminId: string;
    adminEmail?: string;
    correlationId?: string;
  }): MembershipGrant {
    const grant = sqlite.prepare('SELECT * FROM membership_grants WHERE id = ?').get(params.grantId) as any;
    if (!grant) {
      throw new Error(`Membership grant not found with id: ${params.grantId}`);
    }

    const user = sqlite.prepare('SELECT id, email, full_name FROM users WHERE id = ?').get(grant.user_id) as any;
    const nowIso = new Date().toISOString();

    sqlite.prepare(`
      UPDATE membership_grants
      SET status = ?, reason = ?, updated_at = ?
      WHERE id = ?
    `).run(params.status, params.notes || grant.reason || '', nowIso, grant.id);

    // If revoked or suspended, revert user_subscriptions to free
    if (params.status === 'revoked' || params.status === 'suspended') {
      sqlite.prepare(`
        UPDATE user_subscriptions
        SET plan_id = 'free', status = 'active', updated_at = ?
        WHERE user_id = ?
      `).run(nowIso, grant.user_id);
    } else if (params.status === 'active') {
      sqlite.prepare(`
        UPDATE user_subscriptions
        SET plan_id = ?, status = 'active', updated_at = ?
        WHERE user_id = ?
      `).run(grant.plan, nowIso, grant.user_id);
    }

    let actionType = 'MEMBERSHIP_CHANGED';
    if (params.status === 'suspended') actionType = 'MEMBERSHIP_SUSPENDED';
    else if (params.status === 'active') actionType = 'MEMBERSHIP_REACTIVATED';
    else if (params.status === 'revoked') actionType = 'MEMBERSHIP_REVOKED';

    authAndStore.addAuditLog(
      grant.user_id,
      params.adminEmail || params.adminId,
      actionType,
      `Membership Status -> ${params.status.toUpperCase()}`,
      JSON.stringify({
        targetUserId: grant.user_id,
        targetEmail: user?.email || '',
        adminId: params.adminId,
        adminEmail: params.adminEmail || params.adminId,
        previousPlan: grant.plan,
        newPlan: params.status === 'active' ? grant.plan : 'free',
        previousExpiry: grant.expires_at,
        newExpiry: grant.expires_at,
        actionType,
        reason: params.notes || `Administrative membership ${params.status}`,
        source: 'ADMIN_GRANT',
        correlationId: params.correlationId || crypto.randomUUID()
      })
    );

    return {
      id: grant.id,
      userId: grant.user_id,
      userEmail: user?.email || '',
      userName: user?.full_name || '',
      plan: grant.plan,
      validityType: grant.validity_type,
      membershipSource: 'ADMIN_GRANT',
      startsAt: grant.starts_at,
      expiresAt: grant.expires_at,
      status: params.status,
      derivedStatus: deriveMembershipStatus(grant.starts_at, grant.expires_at, params.status),
      remainingDays: calculateRemainingDays(grant.expires_at),
      grantedBy: grant.granted_by,
      grantedByEmail: params.adminEmail,
      reason: params.notes || grant.reason,
      createdAt: grant.created_at,
      updatedAt: nowIso,
    };
  },

  getMembershipManagementList(params: {
    search?: string;
    plan?: string;
    status?: string;
    validityType?: string;
    lifetimeOnly?: boolean;
    expiringWithin30Days?: boolean;
    grantedBy?: string;
    page?: number;
    limit?: number;
  }): {
    items: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      currentPlan: MembershipPlanId;
      membershipStatus: MembershipStatus;
      activationDate: string;
      expiryDate: string | null;
      remainingValidity: string;
      remainingDays: number | null;
      provisionedBy: string;
      lastUpdated: string;
      grantId?: string;
      membershipSource: MembershipSource;
      validityType: MembershipValidityType;
      hasPaidSubscription: boolean;
      notes?: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    // Fetch all users matching search query first
    let usersQuery = 'SELECT id, email, full_name, created_at, updated_at FROM users WHERE 1=1';
    const queryParams: any[] = [];

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      usersQuery += ' AND (email LIKE ? OR full_name LIKE ?)';
      queryParams.push(term, term);
    }

    usersQuery += ' ORDER BY created_at DESC';
    const allUsers = sqlite.prepare(usersQuery).all(...queryParams) as any[];

    // Process each user to determine effective membership & grant
    const nowTime = Date.now();
    const mapped = allUsers.map(u => {
      const grant = sqlite.prepare(
        'SELECT * FROM membership_grants WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(u.id) as any;

      const sub = sqlite.prepare(
        'SELECT * FROM user_subscriptions WHERE user_id = ?'
      ).get(u.id) as any;

      const isAllowlisted = isPermanentFreeAccessAccount({ email: u.email, isVerified: true });
      let currentPlan: MembershipPlanId = 'free';
      let membershipStatus: MembershipStatus = 'active';
      let activationDate = u.created_at;
      let expiryDate: string | null = null;
      let remainingDays: number | null = null;
      let provisionedBy = 'Self / System';
      let lastUpdated = u.updated_at || u.created_at;
      let membershipSource: MembershipSource = 'SYSTEM';
      let validityType: MembershipValidityType = '12_months';
      let grantId: string | undefined = undefined;
      let notes: string | undefined = undefined;

      const hasPaid = Boolean(sub && sub.plan_id !== 'free' && sub.status === 'active');

      if (isAllowlisted) {
        currentPlan = 'black';
        membershipStatus = 'lifetime';
        membershipSource = 'SYSTEM';
        validityType = 'lifetime';
        provisionedBy = 'Permanent Allowlist';
        activationDate = u.created_at;
      } else if (grant) {
        currentPlan = grant.plan;
        grantId = grant.id;
        membershipSource = grant.membership_source as MembershipSource;
        validityType = grant.validity_type;
        activationDate = grant.starts_at;
        expiryDate = grant.expires_at;
        notes = grant.reason;
        lastUpdated = grant.updated_at || grant.created_at;

        // Fetch granter name or email
        if (grant.granted_by) {
          const granter = sqlite.prepare('SELECT email, full_name FROM users WHERE id = ?').get(grant.granted_by) as any;
          provisionedBy = granter ? (granter.full_name || granter.email) : grant.granted_by;
        }

        remainingDays = calculateRemainingDays(grant.expires_at, nowTime);
        membershipStatus = deriveMembershipStatus(grant.starts_at, grant.expires_at, grant.status, nowTime);

        // If grant expired, plan drops to free
        if (membershipStatus === 'expired') {
          currentPlan = hasPaid ? (sub.plan_id as MembershipPlanId) : 'free';
        }
      } else if (sub) {
        currentPlan = sub.plan_id as MembershipPlanId;
        activationDate = sub.current_period_start;
        expiryDate = sub.current_period_end;
        membershipSource = 'PAYMENT';
        lastUpdated = sub.updated_at || sub.created_at;
        provisionedBy = 'Payment Gateway';
        remainingDays = calculateRemainingDays(sub.current_period_end, nowTime);
        membershipStatus = deriveMembershipStatus(sub.current_period_start, sub.current_period_end, sub.status, nowTime);
      }

      // Format human-friendly remaining validity string
      let remainingValidity = 'Active';
      if (membershipStatus === 'lifetime' || validityType === 'lifetime' || !expiryDate) {
        remainingValidity = 'Lifetime';
      } else if (membershipStatus === 'suspended') {
        remainingValidity = 'Suspended';
      } else if (membershipStatus === 'revoked') {
        remainingValidity = 'Revoked';
      } else if (membershipStatus === 'expired' || (remainingDays !== null && remainingDays <= 0)) {
        remainingValidity = 'Expired';
      } else if (remainingDays !== null) {
        if (remainingDays <= 30) {
          remainingValidity = `${remainingDays} day${remainingDays === 1 ? '' : 's'} (Expiring Soon)`;
        } else {
          remainingValidity = `${remainingDays} days`;
        }
      }

      return {
        userId: u.id,
        userName: u.full_name,
        userEmail: u.email,
        currentPlan,
        membershipStatus,
        activationDate,
        expiryDate,
        remainingValidity,
        remainingDays,
        provisionedBy,
        lastUpdated,
        grantId,
        membershipSource,
        validityType,
        hasPaidSubscription: hasPaid,
        notes,
      };
    });

    // Apply filters
    let filtered = mapped;
    if (params.plan && params.plan !== 'all') {
      filtered = filtered.filter(item => item.currentPlan === params.plan);
    }
    if (params.status && params.status !== 'all') {
      filtered = filtered.filter(item => item.membershipStatus === params.status);
    }
    if (params.validityType && params.validityType !== 'all') {
      filtered = filtered.filter(item => item.validityType === params.validityType);
    }
    if (params.lifetimeOnly) {
      filtered = filtered.filter(item => item.membershipStatus === 'lifetime' || item.validityType === 'lifetime');
    }
    if (params.expiringWithin30Days) {
      filtered = filtered.filter(item => item.membershipStatus === 'expiring_soon' || (item.remainingDays !== null && item.remainingDays > 0 && item.remainingDays <= 30));
    }
    if (params.grantedBy && params.grantedBy !== 'all') {
      filtered = filtered.filter(item => item.provisionedBy.toLowerCase().includes(params.grantedBy!.toLowerCase()));
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  getMembershipSummaryMetrics(): MembershipSummaryMetrics {
    const totalUsers = (sqlite.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;

    // Use getMembershipManagementList with no filters to get full computed counts accurately
    const all = authAndStore.getMembershipManagementList({ limit: 10000 });
    const items = all.items;

    let freeUsers = 0;
    let proMembers = 0;
    let blackEliteMembers = 0;
    let activeMemberships = 0;
    let lifetimeMembers = 0;
    let expiringWithin30Days = 0;
    let expiredMemberships = 0;

    for (const item of items) {
      if (item.currentPlan === 'black') blackEliteMembers++;
      else if (item.currentPlan === 'pro') proMembers++;
      else freeUsers++;

      if (item.membershipStatus === 'active' || item.membershipStatus === 'lifetime' || item.membershipStatus === 'expiring_soon') {
        activeMemberships++;
      }

      if (item.membershipStatus === 'lifetime' || item.validityType === 'lifetime') {
        lifetimeMembers++;
      }

      if (item.membershipStatus === 'expiring_soon' || (item.remainingDays !== null && item.remainingDays > 0 && item.remainingDays <= 30)) {
        expiringWithin30Days++;
      }

      if (item.membershipStatus === 'expired') {
        expiredMemberships++;
      }
    }

    return {
      totalRegisteredUsers: totalUsers,
      freeUsers,
      proMembers,
      blackEliteMembers,
      activeMemberships,
      lifetimeMembers,
      expiringWithin30Days,
      expiredMemberships,
    };
  },

  getMembershipGrantHistory(userId: string): {
    grants: any[];
    auditLogs: any[];
  } {
    const grants = sqlite.prepare(
      'SELECT * FROM membership_grants WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId) as any[];

    const auditLogs = sqlite.prepare(`
      SELECT * FROM audit_logs
      WHERE user_id = ? AND (action LIKE 'MEMBERSHIP_%' OR action LIKE 'USER_%')
      ORDER BY timestamp DESC
    `).all(userId) as any[];

    return {
      grants,
      auditLogs: auditLogs.map(l => ({
        id: l.id,
        userId: l.user_id,
        action: l.action,
        actor: l.actor,
        target: l.target,
        details: l.details ? JSON.parse(l.details) : {},
        timestamp: l.timestamp,
      })),
    };
  },


  updateUserSubscription(
    userId: string,
    planId: 'free' | 'pro' | 'black',
    billingInterval: 'monthly' | 'annual' = 'monthly'
  ): void {
    const now = new Date();
    const periodDays = billingInterval === 'annual' ? 365 : 30;
    const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000).toISOString();
    const id = crypto.randomUUID();

    sqlite.prepare(`
      INSERT INTO user_subscriptions (id, user_id, plan_id, status, billing_interval, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?, ?, 0, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        plan_id = excluded.plan_id,
        status = excluded.status,
        billing_interval = excluded.billing_interval,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = 0,
        updated_at = excluded.updated_at
    `).run(id, userId, planId, billingInterval, now.toISOString(), periodEnd, now.toISOString(), now.toISOString());
  },

  cancelSubscription(userId: string): void {
    sqlite.prepare('UPDATE user_subscriptions SET cancel_at_period_end = 1, updated_at = ? WHERE user_id = ?')
      .run(new Date().toISOString(), userId);
  },

  // --- VACANCY CACHING (Real listings only, never seeds fictional users) ---
  
  // --- FOUNDER PROFILE & ASSET MANAGEMENT ---
  getPublishedFounderProfile(): FounderProfile {
    try {
      const row = sqlite.prepare('SELECT * FROM founder_profile WHERE id = ?').get('founder_main') as any;
      if (!row) {
        return DEFAULT_FOUNDER_PROFILE;
      }
      return {
        id: row.id,
        name: row.name,
        designation: row.designation,
        subtitle: row.subtitle,
        companyName: row.company_name,
        shortBio: row.short_bio || '',
        bioParagraphs: JSON.parse(row.bio_paragraphs || '[]'),
        missionStatement: row.mission_statement || '',
        quote: row.quote,
        quoteAuthor: row.quote_author,
        expertiseTags: JSON.parse(row.expertise_tags || '[]'),
        linkedinUrl: row.linkedin_url,
        storyUrl: row.story_url,
        photoUrl: row.photo_url || null,
        photoAssetId: row.photo_asset_id || null,
        photoAspectRatio: row.photo_aspect_ratio || '1:1',
        isPublished: Boolean(row.is_published),
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
      };
    } catch {
      return DEFAULT_FOUNDER_PROFILE;
    }
  },

  getAdminFounderProfile(): { published: FounderProfile; draft: FounderProfile; isDraftModified: boolean } {
    const published = this.getPublishedFounderProfile();
    try {
      const row = sqlite.prepare('SELECT draft_data FROM founder_profile WHERE id = ?').get('founder_main') as any;
      if (row && row.draft_data) {
        const draftObj = JSON.parse(row.draft_data);
        return {
          published,
          draft: { ...published, ...draftObj },
          isDraftModified: true,
        };
      }
    } catch {}

    return {
      published,
      draft: { ...published },
      isDraftModified: false,
    };
  },

  updateFounderProfileDraft(draft: Partial<FounderProfile>): FounderProfile {
    const current = this.getAdminFounderProfile();
    const merged = { ...current.draft, ...draft, isPublished: false, updatedAt: new Date().toISOString() };
    const now = new Date().toISOString();

    const existing = sqlite.prepare('SELECT id FROM founder_profile WHERE id = ?').get('founder_main');
    if (!existing) {
      sqlite.prepare(`
        INSERT INTO founder_profile (
          id, name, designation, subtitle, company_name, short_bio, bio_paragraphs,
          mission_statement, quote, quote_author, expertise_tags, linkedin_url,
          story_url, photo_url, photo_asset_id, photo_aspect_ratio, is_published,
          draft_data, created_at, updated_at, published_at
        ) VALUES (
          'founder_main', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?
        )
      `).run(
        merged.name, merged.designation, merged.subtitle, merged.companyName,
        merged.shortBio, JSON.stringify(merged.bioParagraphs), merged.missionStatement,
        merged.quote, merged.quoteAuthor, JSON.stringify(merged.expertiseTags),
        merged.linkedinUrl, merged.storyUrl, merged.photoUrl || null,
        merged.photoAssetId || null, merged.photoAspectRatio || '1:1',
        JSON.stringify(merged), now, now, now
      );
    } else {
      sqlite.prepare('UPDATE founder_profile SET draft_data = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(merged), now, 'founder_main');
    }

    return merged;
  },

  publishFounderProfile(): FounderProfile {
    const { draft } = this.getAdminFounderProfile();
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO founder_profile (
        id, name, designation, subtitle, company_name, short_bio, bio_paragraphs,
        mission_statement, quote, quote_author, expertise_tags, linkedin_url,
        story_url, photo_url, photo_asset_id, photo_aspect_ratio, is_published,
        draft_data, created_at, updated_at, published_at
      ) VALUES (
        'founder_main', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        designation = excluded.designation,
        subtitle = excluded.subtitle,
        company_name = excluded.company_name,
        short_bio = excluded.short_bio,
        bio_paragraphs = excluded.bio_paragraphs,
        mission_statement = excluded.mission_statement,
        quote = excluded.quote,
        quote_author = excluded.quote_author,
        expertise_tags = excluded.expertise_tags,
        linkedin_url = excluded.linkedin_url,
        story_url = excluded.story_url,
        photo_url = excluded.photo_url,
        photo_asset_id = excluded.photo_asset_id,
        photo_aspect_ratio = excluded.photo_aspect_ratio,
        is_published = 1,
        draft_data = NULL,
        updated_at = excluded.updated_at,
        published_at = excluded.published_at
    `).run(
      draft.name, draft.designation, draft.subtitle, draft.companyName,
      draft.shortBio, JSON.stringify(draft.bioParagraphs), draft.missionStatement,
      draft.quote, draft.quoteAuthor, JSON.stringify(draft.expertiseTags),
      draft.linkedinUrl, draft.storyUrl, draft.photoUrl || null,
      draft.photoAssetId || null, draft.photoAspectRatio || '1:1',
      now, now, now
    );

    return { ...draft, isPublished: true, publishedAt: now, updatedAt: now };
  },

  revertFounderProfileDraft(): FounderProfile {
    const now = new Date().toISOString();
    sqlite.prepare('UPDATE founder_profile SET draft_data = NULL, updated_at = ? WHERE id = ?')
      .run(now, 'founder_main');
    return this.getPublishedFounderProfile();
  },

  saveFounderImageAsset(
    filenameOrOpts: string | { filename?: string; fileName?: string; mimeType: string; fileSize?: number; sizeBytes?: number; dataBase64: string },
    maybeMime?: string,
    maybeSize?: number,
    maybeData?: string
  ): string {
    let filename = 'founder_photo.png';
    let mimeType = 'image/png';
    let fileSize = 0;
    let dataBase64 = '';

    if (typeof filenameOrOpts === 'object' && filenameOrOpts !== null) {
      filename = filenameOrOpts.filename || filenameOrOpts.fileName || 'founder_photo.png';
      mimeType = filenameOrOpts.mimeType || 'image/png';
      fileSize = filenameOrOpts.fileSize || filenameOrOpts.sizeBytes || 0;
      dataBase64 = filenameOrOpts.dataBase64 || '';
    } else {
      filename = filenameOrOpts;
      mimeType = maybeMime || 'image/png';
      fileSize = maybeSize || 0;
      dataBase64 = maybeData || '';
    }

    const id = 'asset_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();
    sqlite.prepare(`
      INSERT INTO founder_image_assets (id, filename, mime_type, file_size, data_base64, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, filename, mimeType, fileSize, dataBase64, now);
    return id;
  },

  getFounderImageAsset(id: string): { filename: string; mime_type: string; file_size: number; data_base64: string } | null {
    try {
      const row = sqlite.prepare('SELECT filename, mime_type, file_size, data_base64 FROM founder_image_assets WHERE id = ?').get(id) as any;
      if (!row) return null;
      return row;
    } catch {
      return null;
    }
  },

  removeFounderPhoto(): void {
    const { draft } = this.getAdminFounderProfile();
    this.updateFounderProfileDraft({ ...draft, photoUrl: null, photoAssetId: null });
  },

  // --- CANDIDATE FACTS REGISTRY ---
  getCandidateFacts(userId: string): CandidateFact[] {
    try {
      const rows = sqlite.prepare('SELECT * FROM candidate_facts WHERE user_id = ? ORDER BY category, field').all(userId) as any[];
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        category: r.category,
        field: r.field,
        value: r.value,
        originalSource: r.original_source,
        sourceDocumentId: r.source_document_id || undefined,
        evidenceText: r.evidence_text || undefined,
        verificationStatus: r.verification_status,
        confidence: r.confidence,
        lastUpdated: r.last_updated
      }));
    } catch {
      return [];
    }
  },

  saveCandidateFact(userId: string, fact: CandidateFact): void {
    const id = fact.id || ('fact_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16));
    const now = fact.lastUpdated || new Date().toISOString();
    sqlite.prepare(`
      INSERT INTO candidate_facts (id, user_id, category, field, value, original_source, source_document_id, evidence_text, verification_status, confidence, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        category = excluded.category,
        field = excluded.field,
        value = excluded.value,
        original_source = excluded.original_source,
        source_document_id = excluded.source_document_id,
        evidence_text = excluded.evidence_text,
        verification_status = excluded.verification_status,
        confidence = excluded.confidence,
        last_updated = excluded.last_updated
    `).run(
      id,
      userId,
      fact.category,
      fact.field || 'skill',
      fact.value || '',
      fact.originalSource || 'RESUME',
      fact.sourceDocumentId || null,
      fact.evidenceText || null,
      fact.verificationStatus || 'EXTRACTED',
      fact.confidence ?? 1.0,
      now
    );
  },

  saveCandidateFacts(userId: string, facts: CandidateFact[]): void {
    for (const fact of facts) {
      this.saveCandidateFact(userId, fact);
    }
  },

  deleteCandidateFact(userId: string, factId: string): void {
    sqlite.prepare('DELETE FROM candidate_facts WHERE user_id = ? AND id = ?').run(userId, factId);
  },

  
  // --- ADMIN RESUME EXTRACTION & REVIEW WORKSPACE ---
  getAdminResumes(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    format?: string;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let params: any[] = [];

    if (options.search && options.search.trim()) {
      const q = `%${options.search.trim().toLowerCase()}%`;
      whereConditions.push('(LOWER(r.file_name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.full_name) LIKE ? OR r.user_id = ?)');
      params.push(q, q, q, options.search.trim());
    }

    if (options.status && options.status !== 'all') {
      whereConditions.push('r.extraction_status = ?');
      params.push(options.status);
    }

    if (options.format && options.format !== 'all') {
      whereConditions.push('LOWER(r.file_type) = ?');
      params.push(options.format.toLowerCase());
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Paginated resumes query
    const listQuery = `
      SELECT 
        r.id, r.user_id, r.file_name, r.file_type, r.file_size_bytes, 
        r.extracted_text, r.is_scanned, r.storage_key, r.file_hash, 
        r.mime_type, r.page_count, r.extraction_status, r.extraction_method, 
        r.parser_model, r.error_message, r.warnings, r.processing_duration_ms, 
        r.created_at, r.updated_at,
        u.email as user_email, u.full_name as user_full_name
      FROM resume_documents r
      JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = sqlite.prepare(listQuery).all(...params, limit, offset) as any[];

    // Overall summary counts query (across all resumes)
    const summaryQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN extraction_status = 'SUCCESS' THEN 1 ELSE 0 END) as successCount,
        SUM(CASE WHEN extraction_status = 'PARTIAL' THEN 1 ELSE 0 END) as partialCount,
        SUM(CASE WHEN extraction_status = 'FAILED' THEN 1 ELSE 0 END) as failedCount,
        SUM(CASE WHEN is_scanned = 1 OR extraction_status = 'SCANNED' THEN 1 ELSE 0 END) as scannedCount,
        SUM(CASE WHEN extraction_status = 'PENDING' THEN 1 ELSE 0 END) as pendingCount
      FROM resume_documents
    `;
    const summaryRow = (sqlite.prepare(summaryQuery).get() as any) || {};

    // Filtered total count
    const totalFilteredQuery = `
      SELECT COUNT(*) as count 
      FROM resume_documents r
      JOIN users u ON r.user_id = u.id
      ${whereClause}
    `;
    const totalFiltered = (sqlite.prepare(totalFilteredQuery).get(...params) as any)?.count || 0;

    const resumes = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      userFullName: r.user_full_name,
      fileName: r.file_name,
      fileType: r.file_type,
      fileSizeBytes: r.file_size_bytes,
      extractedText: r.extracted_text,
      isScanned: Boolean(r.is_scanned),
      storageKey: r.storage_key,
      fileHash: r.file_hash,
      mimeType: r.mime_type,
      pageCount: r.page_count || 1,
      extractionStatus: r.extraction_status || (r.is_scanned ? 'SCANNED' : 'SUCCESS'),
      extractionMethod: r.extraction_method || 'HEURISTIC',
      parserModel: r.parser_model,
      errorMessage: r.error_message,
      warnings: r.warnings ? JSON.parse(r.warnings) : [],
      processingDurationMs: r.processing_duration_ms || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at || r.created_at
    }));

    return {
      resumes,
      total: totalFiltered,
      page,
      limit,
      totalPages: Math.ceil(totalFiltered / limit) || 1,
      summary: {
        total: summaryRow.total || 0,
        successCount: summaryRow.successCount || 0,
        partialCount: summaryRow.partialCount || 0,
        failedCount: summaryRow.failedCount || 0,
        scannedCount: summaryRow.scannedCount || 0,
        pendingCount: summaryRow.pendingCount || 0
      }
    };
  },

  getResumeDocumentById(id: string) {
    const query = `
      SELECT 
        r.id, r.user_id, r.file_name, r.file_type, r.file_size_bytes, 
        r.extracted_text, r.is_scanned, r.storage_key, r.file_hash, 
        r.mime_type, r.page_count, r.extraction_status, r.extraction_method, 
        r.parser_model, r.error_message, r.warnings, r.processing_duration_ms, 
        r.created_at, r.updated_at,
        u.email as user_email, u.full_name as user_full_name
      FROM resume_documents r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `;
    const r = sqlite.prepare(query).get(id) as any;
    if (!r) return null;

    return {
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      userFullName: r.user_full_name,
      fileName: r.file_name,
      fileType: r.file_type,
      fileSizeBytes: r.file_size_bytes,
      extractedText: r.extracted_text,
      isScanned: Boolean(r.is_scanned),
      storageKey: r.storage_key,
      fileHash: r.file_hash,
      mimeType: r.mime_type,
      pageCount: r.page_count || 1,
      extractionStatus: r.extraction_status || (r.is_scanned ? 'SCANNED' : 'SUCCESS'),
      extractionMethod: r.extraction_method || 'HEURISTIC',
      parserModel: r.parser_model,
      errorMessage: r.error_message,
      warnings: r.warnings ? JSON.parse(r.warnings) : [],
      processingDurationMs: r.processing_duration_ms || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at || r.created_at
    };
  },

  getResumeExtractionRuns(resumeId: string) {
    const rows = sqlite.prepare(
      'SELECT * FROM resume_extraction_runs WHERE resume_id = ? ORDER BY created_at DESC'
    ).all(resumeId) as any[];

    return rows.map(r => ({
      id: r.id,
      resumeId: r.resume_id,
      userId: r.user_id,
      runType: r.run_type,
      status: r.status,
      extractionMethod: r.extraction_method,
      parserModel: r.parser_model,
      structuredOutput: r.structured_output ? JSON.parse(r.structured_output) : null,
      diagnostics: r.diagnostics ? JSON.parse(r.diagnostics) : null,
      errorMessage: r.error_message,
      warnings: r.warnings ? JSON.parse(r.warnings) : [],
      durationMs: r.duration_ms,
      createdAt: r.created_at
    }));
  },

  saveResumeExtractionRun(run: {
    id?: string;
    resumeId: string;
    userId: string;
    runType: string;
    status: string;
    extractionMethod: string;
    parserModel?: string;
    structuredOutput?: any;
    diagnostics?: any;
    errorMessage?: string;
    warnings?: string[];
    durationMs?: number;
  }): string {
    const id = run.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO resume_extraction_runs (
        id, resume_id, user_id, run_type, status, extraction_method, parser_model,
        structured_output, diagnostics, error_message, warnings, duration_ms, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      run.resumeId,
      run.userId,
      run.runType,
      run.status,
      run.extractionMethod,
      run.parserModel || null,
      run.structuredOutput ? JSON.stringify(run.structuredOutput) : null,
      run.diagnostics ? JSON.stringify(run.diagnostics) : null,
      run.errorMessage || null,
      run.warnings ? JSON.stringify(run.warnings) : null,
      run.durationMs || 0,
      now
    );
    return id;
  },

  getResumeExtractionVersions(resumeId: string) {
    const rows = sqlite.prepare(
      'SELECT * FROM resume_extraction_versions WHERE resume_id = ? ORDER BY version_number DESC'
    ).all(resumeId) as any[];

    return rows.map(r => ({
      id: r.id,
      resumeId: r.resume_id,
      userId: r.user_id,
      versionNumber: r.version_number,
      data: JSON.parse(r.data),
      diffSummary: r.diff_summary ? JSON.parse(r.diff_summary) : null,
      createdBy: r.created_by,
      createdAt: r.created_at
    }));
  },

  saveResumeExtractionVersion(version: {
    id?: string;
    resumeId: string;
    userId: string;
    versionNumber?: number;
    data: any;
    diffSummary?: any;
    createdBy: string;
  }): string {
    const id = version.id || crypto.randomUUID();
    const now = new Date().toISOString();

    let verNum: number = version.versionNumber || 0;
    if (!verNum) {
      const maxRow = sqlite.prepare(
        'SELECT MAX(version_number) as max_ver FROM resume_extraction_versions WHERE resume_id = ?'
      ).get(version.resumeId) as any;
      verNum = (maxRow?.max_ver || 0) + 1;
    }

    const stmt = sqlite.prepare(`
      INSERT INTO resume_extraction_versions (
        id, resume_id, user_id, version_number, data, diff_summary, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      version.resumeId,
      version.userId,
      verNum,
      JSON.stringify(version.data),
      version.diffSummary ? JSON.stringify(version.diffSummary) : null,
      version.createdBy,
      now
    );
    return id;
  },

  getResumeExtractionEvents(resumeId: string) {
    const rows = sqlite.prepare(
      'SELECT * FROM resume_extraction_events WHERE resume_id = ? ORDER BY created_at DESC'
    ).all(resumeId) as any[];

    return rows.map(r => ({
      id: r.id,
      resumeId: r.resume_id,
      adminId: r.admin_id,
      adminEmail: r.admin_email,
      eventType: r.event_type,
      details: r.details ? JSON.parse(r.details) : null,
      ipAddress: r.ip_address,
      createdAt: r.created_at
    }));
  },

  logResumeExtractionEvent(event: {
    resumeId: string;
    adminId: string;
    adminEmail: string;
    eventType: string;
    details?: any;
    ipAddress?: string;
  }): string {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO resume_extraction_events (
        id, resume_id, admin_id, admin_email, event_type, details, ip_address, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      event.resumeId,
      event.adminId,
      event.adminEmail,
      event.eventType,
      event.details ? JSON.stringify(event.details) : null,
      event.ipAddress || null,
      now
    );
    return id;
  },

  updateResumeDocumentStatus(id: string, updates: {
    extractionStatus?: string;
    extractionMethod?: string;
    parserModel?: string;
    extractedText?: string;
    errorMessage?: string;
    warnings?: string[];
    processingDurationMs?: number;
  }) {
    const now = new Date().toISOString();
    const current = this.getResumeDocumentById(id);
    if (!current) return;

    const stmt = sqlite.prepare(`
      UPDATE resume_documents
      SET extraction_status = ?,
          extraction_method = ?,
          parser_model = ?,
          extracted_text = ?,
          error_message = ?,
          warnings = ?,
          processing_duration_ms = ?,
          updated_at = ?
      WHERE id = ?
    `);
    stmt.run(
      updates.extractionStatus || current.extractionStatus,
      updates.extractionMethod || current.extractionMethod,
      updates.parserModel || current.parserModel || null,
      updates.extractedText || current.extractedText,
      updates.errorMessage || null,
      updates.warnings ? JSON.stringify(updates.warnings) : (current.warnings ? JSON.stringify(current.warnings) : null),
      updates.processingDurationMs ?? current.processingDurationMs ?? 0,
      now,
      id
    );
  },

  // Real Database Queries for Administrator Overview & Users
  getRealAdminOverview() {
    const totalUsers = (sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
    const totalAdmins = (sqlite.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any)?.count || 0;
    const totalApplications = (sqlite.prepare('SELECT COUNT(*) as count FROM applications').get() as any)?.count || 0;
    const totalResumes = (sqlite.prepare('SELECT COUNT(*) as count FROM resume_documents').get() as any)?.count || 0;
    const totalVacancies = (sqlite.prepare('SELECT COUNT(*) as count FROM cached_vacancies').get() as any)?.count || 0;
    const activeSubscriptions = (sqlite.prepare("SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_id = 'pro' AND status = 'active'").get() as any)?.count || 0;

    return {
      totalUsers,
      totalAdmins,
      totalApplications,
      totalResumes,
      totalVacancies,
      activeSubscriptions
    };
  },

  getRealAdminUsers(limit = 100, offset = 0, search = '') {
    let whereClause = '';
    const params: any[] = [];
    if (search && search.trim()) {
      whereClause = 'WHERE LOWER(email) LIKE ? OR LOWER(full_name) LIKE ? OR id = ?';
      const q = `%${search.trim().toLowerCase()}%`;
      params.push(q, q, search.trim());
    }

    const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;
    const total = (sqlite.prepare(countQuery).get(...params) as any)?.count || 0;

    const query = `
      SELECT id, email, full_name, role, is_verified, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = sqlite.prepare(query).all(...params, limit, offset) as any[];

    return {
      users: rows.map(r => ({
        id: r.id,
        email: r.email,
        fullName: r.full_name,
        role: r.role,
        isVerified: Boolean(r.is_verified),
        createdAt: r.created_at,
        planId: 'free'
      })),
      total
    };
  },

  cacheInitialVacanciesIfEmpty(vacancies?: JobVacancy[]) {
    if (vacancies && vacancies.length > 0) {
      authAndStore.saveVacancies(vacancies);
    }
  },
  // --- SIX-PILLAR CAREER OPERATIONS ---
  getOpportunitySignals(): any[] {
    try {
      const rows = sqlite.prepare('SELECT * FROM opportunity_signals ORDER BY published_date DESC LIMIT 50').all() as any[];
      if (rows && rows.length > 0) {
        return rows.map(r => ({
          id: r.id,
          company: r.company,
          signalType: r.signal_type,
          headline: r.headline,
          sourceName: r.source_name,
          sourceUrl: r.source_url,
          publishedDate: r.published_date,
          location: r.location,
          relevanceExplanation: r.relevance_explanation,
          hasVerifiedVacancy: Boolean(r.has_verified_vacancy),
          linkedVacancyId: r.linked_vacancy_id || undefined,
        }));
      }
    } catch {
      // Table fallback
    }

    return [
      {
        id: 'sig_stripe_eu_expansion',
        company: 'Stripe',
        signalType: 'expansion',
        headline: 'Stripe expands European platform engineering hubs in Dublin & London',
        sourceName: 'Stripe Corporate Press & Engineering News',
        sourceUrl: 'https://stripe.com/newsroom',
        publishedDate: '2026-03-01',
        location: 'Dublin, Ireland & London, UK (Hybrid/Remote)',
        relevanceExplanation: 'High demand for distributed systems, low-latency transaction processing, and cloud payment security.',
        hasVerifiedVacancy: true,
        linkedVacancyId: 'vac_stripe_staff_dist',
      },
      {
        id: 'sig_cloudflare_network_growth',
        company: 'Cloudflare',
        signalType: 'department_launch',
        headline: 'Cloudflare announces global edge network infrastructure expansion across Asia-Pacific',
        sourceName: 'Cloudflare Press Release',
        sourceUrl: 'https://cloudflare.com/press',
        publishedDate: '2026-02-15',
        location: 'Global Remote / Singapore / Tokyo',
        relevanceExplanation: 'Targeted hiring across systems networking, Go/Rust edge services, and zero trust platform security.',
        hasVerifiedVacancy: false,
      },
      {
        id: 'sig_datadog_ai_observability',
        company: 'Datadog',
        signalType: 'public_hiring',
        headline: 'Datadog announces dedicated AI telemetry and cloud observability initiative',
        sourceName: 'Datadog Investor & Tech Portal',
        sourceUrl: 'https://investors.datadoghq.com',
        publishedDate: '2026-02-20',
        location: 'New York, Paris & Remote',
        relevanceExplanation: 'Large-scale recruitment for observability pipeline engineers and enterprise reliability managers.',
        hasVerifiedVacancy: false,
      },
    ];
  },

  getMockInterviewSessions(userId: string, jobId?: string): any[] {
    try {
      let query = 'SELECT * FROM interview_mock_sessions WHERE user_id = ?';
      const params: any[] = [userId];
      if (jobId) {
        query += ' AND job_id = ?';
        params.push(jobId);
      }
      query += ' ORDER BY created_at DESC';

      const rows = sqlite.prepare(query).all(...params) as any[];
      return (rows || []).map(r => ({
        id: r.id,
        userId: r.user_id,
        jobId: r.job_id || undefined,
        roleTitle: r.role_title,
        companyName: r.company_name,
        interviewType: r.interview_type,
        questions: JSON.parse(r.questions_json || '[]'),
        answers: JSON.parse(r.answers_json || '[]'),
        feedback: JSON.parse(r.feedback_json || '{}'),
        improvementAreas: JSON.parse(r.improvement_areas_json || '[]'),
        overallScore: r.overall_score || undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch {
      return [];
    }
  },

  saveMockInterviewSession(session: any, userId: string): any {
    const now = new Date().toISOString();
    const id = session.id || `mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const stmt = sqlite.prepare(`
        INSERT INTO interview_mock_sessions (
          id, user_id, job_id, role_title, company_name, interview_type,
          questions_json, answers_json, feedback_json, improvement_areas_json,
          overall_score, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          answers_json = excluded.answers_json,
          feedback_json = excluded.feedback_json,
          improvement_areas_json = excluded.improvement_areas_json,
          overall_score = excluded.overall_score,
          updated_at = excluded.updated_at
      `);
      stmt.run(
        id,
        userId,
        session.jobId || null,
        session.roleTitle || 'Target Role',
        session.companyName || 'Target Employer',
        session.interviewType || 'behavioral',
        JSON.stringify(session.questions || []),
        JSON.stringify(session.answers || []),
        JSON.stringify(session.feedback || {}),
        JSON.stringify(session.improvementAreas || []),
        session.overallScore || null,
        session.createdAt || now,
        now
      );
    } catch (e) {
      console.warn('[SQLite Mock Session Save Warning]:', e);
    }

    return {
      id,
      userId,
      ...session,
      createdAt: session.createdAt || now,
      updatedAt: now,
    };
  },

  getRecruiterReviewAudit(applicationId: string, userId: string): any | null {
    try {
      const stmt = sqlite.prepare(
        'SELECT * FROM recruiter_review_audits WHERE application_id = ? AND user_id = ?'
      );
      const row = stmt.get(applicationId, userId) as any;
      if (!row) return null;

      return {
        id: row.id,
        userId: row.user_id,
        applicationId: row.application_id,
        roleAlignmentScore: row.role_alignment_score,
        reviewCategories: JSON.parse(row.review_categories_json || '{}'),
        evidenceClassification: JSON.parse(row.evidence_classification_json || '{}'),
        strongestPoints: JSON.parse(row.strongest_points_json || '[]'),
        potentialConcerns: JSON.parse(row.potential_concerns_json || '[]'),
        missingMandatoryRequirements: JSON.parse(row.missing_mandatory_json || '[]'),
        resumeImprovements: JSON.parse(row.resume_improvements_json || '[]'),
        clarificationQuestions: JSON.parse(row.clarification_questions_json || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch {
      return null;
    }
  },

  saveRecruiterReviewAudit(audit: any, userId: string): any {
    const now = new Date().toISOString();
    const id = audit.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const stmt = sqlite.prepare(`
        INSERT INTO recruiter_review_audits (
          id, user_id, application_id, role_alignment_score,
          review_categories_json, evidence_classification_json,
          strongest_points_json, potential_concerns_json,
          missing_mandatory_json, resume_improvements_json,
          clarification_questions_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, application_id) DO UPDATE SET
          role_alignment_score = excluded.role_alignment_score,
          review_categories_json = excluded.review_categories_json,
          evidence_classification_json = excluded.evidence_classification_json,
          strongest_points_json = excluded.strongest_points_json,
          potential_concerns_json = excluded.potential_concerns_json,
          missing_mandatory_json = excluded.missing_mandatory_json,
          resume_improvements_json = excluded.resume_improvements_json,
          clarification_questions_json = excluded.clarification_questions_json,
          updated_at = excluded.updated_at
      `);
      stmt.run(
        id,
        userId,
        audit.applicationId,
        audit.roleAlignmentScore || 0,
        JSON.stringify(audit.reviewCategories || {}),
        JSON.stringify(audit.evidenceClassification || {}),
        JSON.stringify(audit.strongestPoints || []),
        JSON.stringify(audit.potentialConcerns || []),
        JSON.stringify(audit.missingMandatoryRequirements || []),
        JSON.stringify(audit.resumeImprovements || []),
        JSON.stringify(audit.clarificationQuestions || []),
        audit.createdAt || now,
        now
      );
    } catch (e) {
      console.warn('[SQLite Recruiter Audit Save Warning]:', e);
    }

    return {
      id,
      userId,
      ...audit,
      createdAt: audit.createdAt || now,
      updatedAt: now,
    };
  },

  getCareerTrajectories(userId: string): any[] {
    try {
      const rows = sqlite.prepare(
        'SELECT * FROM career_trajectories WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC'
      ).all(userId) as any[];

      if (rows) {
        return rows.map(r => ({
          id: r.id,
          userId: r.user_id,
          trajectoryTitle: r.trajectory_title,
          targetRole: r.target_role,
          currentAlignmentScore: r.current_alignment_score,
          transferableSkills: JSON.parse(r.transferable_skills_json || '[]'),
          missingSkills: JSON.parse(r.missing_skills_json || '[]'),
          requiredExperienceYears: r.required_experience_years,
          recommendedCertifications: JSON.parse(r.recommended_certifications_json || '[]'),
          learningPath: JSON.parse(r.learning_path_json || '[]'),
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch {
      // Table fallback on database error
    }

    return [];
  },

  saveCareerTrajectory(traj: any, userId: string): any {
    const now = new Date().toISOString();
    const id = traj.id || `traj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const stmt = sqlite.prepare(`
        INSERT INTO career_trajectories (
          id, user_id, trajectory_title, target_role, current_alignment_score,
          transferable_skills_json, missing_skills_json, required_experience_years,
          recommended_certifications_json, learning_path_json, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          trajectory_title = excluded.trajectory_title,
          target_role = excluded.target_role,
          current_alignment_score = excluded.current_alignment_score,
          transferable_skills_json = excluded.transferable_skills_json,
          missing_skills_json = excluded.missing_skills_json,
          required_experience_years = excluded.required_experience_years,
          recommended_certifications_json = excluded.recommended_certifications_json,
          learning_path_json = excluded.learning_path_json,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at
      `);
      stmt.run(
        id,
        userId,
        traj.trajectoryTitle || 'Career Trajectory',
        traj.targetRole || 'Target Role',
        traj.currentAlignmentScore || 0,
        JSON.stringify(traj.transferableSkills || []),
        JSON.stringify(traj.missingSkills || []),
        traj.requiredExperienceYears || 0,
        JSON.stringify(traj.recommendedCertifications || []),
        JSON.stringify(traj.learningPath || []),
        traj.isActive !== undefined ? (traj.isActive ? 1 : 0) : 1,
        traj.createdAt || now,
        now
      );
    } catch (e) {
      console.warn('[SQLite Career Trajectory Save Warning]:', e);
    }

    return {
      id,
      userId,
      ...traj,
      updatedAt: now,
    };
  },

  // --- UNIVERSAL JOB IMPORT & OPPORTUNITY MANAGEMENT ---
  saveUserImportedJob(record: UserImportedJobRecord, vacancy: JobVacancy): void {
    const now = new Date().toISOString();
    // 1. Upsert into cached_vacancies
    try {
      const vacancyStmt = sqlite.prepare(`
        INSERT INTO cached_vacancies (id, source, title, company, location, url, data, is_active, retrieved_at)
        VALUES (?, 'imported', ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET
          is_active = 1,
          retrieved_at = excluded.retrieved_at,
          data = excluded.data
      `);
      vacancyStmt.run(vacancy.id, vacancy.title, vacancy.company, vacancy.location, vacancy.url, JSON.stringify(vacancy), now);
    } catch (e) {
      console.warn('[SQLite Imported Vacancy Save Error]:', e);
    }

    // 2. Upsert into user_imported_jobs
    try {
      const importedStmt = sqlite.prepare(`
        INSERT INTO user_imported_jobs (
          id, user_id, vacancy_id, original_url, canonical_url, source_domain,
          extraction_status, extraction_method, extraction_confidence,
          extracted_data, candidate_edits, created_at, updated_at, is_archived
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT(user_id, canonical_url) DO UPDATE SET
          vacancy_id = excluded.vacancy_id,
          extraction_status = excluded.extraction_status,
          extraction_method = excluded.extraction_method,
          extraction_confidence = excluded.extraction_confidence,
          extracted_data = excluded.extracted_data,
          candidate_edits = excluded.candidate_edits,
          updated_at = excluded.updated_at,
          is_archived = 0
      `);
      importedStmt.run(
        record.id,
        record.userId,
        record.vacancyId,
        record.originalUrl,
        record.canonicalUrl,
        record.sourceDomain,
        record.extractionStatus,
        record.extractionMethod,
        record.extractionConfidence,
        JSON.stringify(record.extractedData),
        record.candidateEdits ? JSON.stringify(record.candidateEdits) : null,
        record.createdAt || now,
        record.updatedAt || now
      );
    } catch (e) {
      console.warn('[SQLite User Imported Job Save Error]:', e);
    }
  },

  getUserImportedJobs(userId: string, includeArchived = false): UserImportedJobRecord[] {
    try {
      const sql = includeArchived
        ? 'SELECT * FROM user_imported_jobs WHERE user_id = ? ORDER BY created_at DESC'
        : 'SELECT * FROM user_imported_jobs WHERE user_id = ? AND is_archived = 0 ORDER BY created_at DESC';
      const stmt = sqlite.prepare(sql);
      const rows = stmt.all(userId) as Array<any>;
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        vacancyId: r.vacancy_id,
        originalUrl: r.original_url,
        canonicalUrl: r.canonical_url,
        sourceDomain: r.source_domain,
        extractionStatus: r.extraction_status,
        extractionMethod: r.extraction_method,
        extractionConfidence: Number(r.extraction_confidence),
        extractedData: JSON.parse(r.extracted_data),
        candidateEdits: r.candidate_edits ? JSON.parse(r.candidate_edits) : undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        isArchived: Boolean(r.is_archived),
      }));
    } catch {
      return [];
    }
  },

  getUserImportedJobByVacancyId(userId: string, vacancyId: string): UserImportedJobRecord | null {
    try {
      const stmt = sqlite.prepare('SELECT * FROM user_imported_jobs WHERE user_id = ? AND vacancy_id = ?');
      const r = stmt.get(userId, vacancyId) as any;
      if (!r) return null;
      return {
        id: r.id,
        userId: r.user_id,
        vacancyId: r.vacancy_id,
        originalUrl: r.original_url,
        canonicalUrl: r.canonical_url,
        sourceDomain: r.source_domain,
        extractionStatus: r.extraction_status,
        extractionMethod: r.extraction_method,
        extractionConfidence: Number(r.extraction_confidence),
        extractedData: JSON.parse(r.extracted_data),
        candidateEdits: r.candidate_edits ? JSON.parse(r.candidate_edits) : undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        isArchived: Boolean(r.is_archived),
      };
    } catch {
      return null;
    }
  },

  findDuplicateImportedJob(userId: string, canonicalUrl: string, company?: string, title?: string): {
    isDuplicate: boolean;
    existingRecord?: UserImportedJobRecord;
    existingVacancy?: JobVacancy;
  } {
    // 1. Check exact canonical URL for this candidate
    try {
      const urlStmt = sqlite.prepare('SELECT * FROM user_imported_jobs WHERE user_id = ? AND canonical_url = ? AND is_archived = 0');
      const urlRow = urlStmt.get(userId, canonicalUrl) as any;
      if (urlRow) {
        const existingRecord: UserImportedJobRecord = {
          id: urlRow.id,
          userId: urlRow.user_id,
          vacancyId: urlRow.vacancy_id,
          originalUrl: urlRow.original_url,
          canonicalUrl: urlRow.canonical_url,
          sourceDomain: urlRow.source_domain,
          extractionStatus: urlRow.extraction_status,
          extractionMethod: urlRow.extraction_method,
          extractionConfidence: Number(urlRow.extraction_confidence),
          extractedData: JSON.parse(urlRow.extracted_data),
          candidateEdits: urlRow.candidate_edits ? JSON.parse(urlRow.candidate_edits) : undefined,
          createdAt: urlRow.created_at,
          updatedAt: urlRow.updated_at,
          isArchived: Boolean(urlRow.is_archived),
        };
        const vacancy = this.getVacancyById(urlRow.vacancy_id);
        return { isDuplicate: true, existingRecord, existingVacancy: vacancy || undefined };
      }
    } catch {
      // Continue to heuristic check
    }

    // 2. Check by Company and Title match if provided
    if (company && title) {
      const compNorm = company.toLowerCase().trim();
      const titleNorm = title.toLowerCase().trim();
      const allUserJobs = this.getUserImportedJobs(userId);
      for (const rec of allUserJobs) {
        if (
          (rec.extractedData.company || '').toLowerCase().trim() === compNorm &&
          (rec.extractedData.title || '').toLowerCase().trim() === titleNorm
        ) {
          const vacancy = this.getVacancyById(rec.vacancyId);
          return { isDuplicate: true, existingRecord: rec, existingVacancy: vacancy || undefined };
        }
      }
    }

    return { isDuplicate: false };
  },

  deleteUserImportedJob(userId: string, id: string): boolean {
    try {
      const stmt = sqlite.prepare('DELETE FROM user_imported_jobs WHERE id = ? AND user_id = ?');
      const res = stmt.run(id, userId);
      return res.changes > 0;
    } catch {
      return false;
    }
  },

  archiveUserImportedJob(userId: string, id: string): boolean {
    try {
      const stmt = sqlite.prepare('UPDATE user_imported_jobs SET is_archived = 1, updated_at = ? WHERE id = ? AND user_id = ?');
      const res = stmt.run(new Date().toISOString(), id, userId);
      return res.changes > 0;
    } catch {
      return false;
    }
  },

  getUserVacancies(userId?: string, limit = 100): JobVacancy[] {
    const baseVacancies = this.getVacancies(limit);
    if (!userId) return baseVacancies;

    const importedRecords = this.getUserImportedJobs(userId);
    const importedVacancies: JobVacancy[] = [];
    for (const rec of importedRecords) {
      const v = this.getVacancyById(rec.vacancyId);
      if (v) {
        v.source = 'imported';
        v.importedByUserId = userId;
        v.importedProvenance = {
          originalUrl: rec.originalUrl,
          sourceDomain: rec.sourceDomain,
          extractionStatus: rec.extractionStatus,
          extractionMethod: rec.extractionMethod,
          extractionConfidence: rec.extractionConfidence,
          importedAt: rec.createdAt,
        };
        importedVacancies.push(v);
      }
    }

    const importedIds = new Set(importedVacancies.map(iv => iv.id));
    const combined = [...importedVacancies, ...baseVacancies.filter(bv => !importedIds.has(bv.id))];
    return combined.slice(0, limit);
  },
};
