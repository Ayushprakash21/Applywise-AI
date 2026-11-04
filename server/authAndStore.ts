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
  TailoredResumeContent
} from '../src/types/index.ts';

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
    const stmt = sqlite.prepare('SELECT data FROM cached_vacancies WHERE is_active = 1 ORDER BY retrieved_at DESC LIMIT ?');
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
    stmt.run(app.id, userId, app.vacancyId, app.company, app.role, app.status, JSON.stringify(app), app.createdAt || now, now);
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
    status: 'active' | 'cancelled' | 'past_due';
    billingInterval: 'monthly' | 'annual';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } {
    const userRow = sqlite.prepare('SELECT email, is_verified FROM users WHERE id = ?').get(userId) as any;
    if (userRow && isPermanentFreeAccessAccount({ email: userRow.email, isVerified: Boolean(userRow.is_verified) })) {
      const now = new Date().toISOString();
      return {
        planId: 'black',
        status: 'active',
        billingInterval: 'annual',
        currentPeriodStart: now,
        currentPeriodEnd: '2099-12-31T23:59:59.999Z',
        cancelAtPeriodEnd: false,
      };
    }
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
      };
    }

    return {
      planId: row.plan_id as 'free' | 'pro' | 'black',
      status: row.status as 'active' | 'cancelled' | 'past_due',
      billingInterval: row.billing_interval as 'monthly' | 'annual',
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
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
      fact.field,
      fact.value,
      fact.originalSource,
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
  }
};
