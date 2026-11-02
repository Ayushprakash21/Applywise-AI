import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
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
`);

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export const authAndStore = {
  // --- AUTHENTICATION ---
  createUser(fullName: string, email: string, passwordPlain: string): AuthUser {
    const cleanEmail = email.toLowerCase().trim();
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

    // Initialize default profile
    const defaultProfile: UserProfile = {
      id: crypto.randomUUID(),
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: '',
      location: '',
      workAuthorizationCountry: 'United States',
      workAuthorizationStatus: 'Citizen / Permanent Resident',
      workAuthorization: ['Citizen / Permanent Resident'],
      requiresVisaSponsorship: false,
      currentTitle: '',
      currentEmployer: '',
      totalExperienceYears: 0,
      professionalSummary: '',
      education: [],
      certifications: [],
      skills: [],
      experiences: [],
      languages: ['English'],
      masterResumeLastUpdated: now,
    };
    authAndStore.saveProfile(id, defaultProfile);

    // Default career preferences
    const defaultPrefs: CareerPreferences = {
      targetRoles: ['Software Engineer', 'Product Manager', 'Project Manager'],
      targetCountries: ['United States', 'Canada', 'United Kingdom', 'Germany', 'Remote'],
      targetCities: [],
      preferredTitles: ['Software Engineer', 'Product Manager', 'Project Manager'],
      preferredIndustries: ['Technology', 'Finance', 'Healthcare'],
      workArrangement: ['remote', 'hybrid'],
      workArrangements: ['remote', 'hybrid'],
      minSalaryUSD: 85000,
      minSalaryByCurrency: { USD: 85000, EUR: 75000, GBP: 70000, CAD: 100000 },
      preferredEmploymentType: ['full-time'],
      willingnessToRelocate: 'negotiable',
      visaSponsorshipRequired: false,
      requiresVisaSponsorship: false,
      preferredCompanies: [],
      excludedCompanies: [],
      excludedKeywords: ['internship', 'unpaid', 'entry level'],
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
    authAndStore.addNotification(id, 'Welcome to ApplyWise AI', 'Your account is ready. Upload your resume to start personalized job discovery!', 'system');

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
  saveResumeDocument(userId: string, doc: { fileName: string; fileType: string; fileSizeBytes: number; extractedText: string; isScanned: boolean }): string {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = sqlite.prepare(`
      INSERT INTO resume_documents (id, user_id, file_name, file_type, file_size_bytes, extracted_text, is_scanned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, doc.fileName, doc.fileType, doc.fileSizeBytes, doc.extractedText, doc.isScanned ? 1 : 0, now);
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

  // --- SEED / DEMO INITIALIZATION ---
  seedInitialDataIfEmpty(initialData: { vacancies?: JobVacancy[]; profile?: UserProfile; preferences?: CareerPreferences; applications?: ApplicationRecord[] }) {
    const countRow = sqlite.prepare('SELECT count(*) as count FROM users').get() as { count: number };
    if (countRow.count === 0) {
      const demoUser = authAndStore.createUser('Alex Mercer', 'alex.mercer@applywise.ai', 'ApplyWise2026!');
      if (initialData.profile) {
        authAndStore.saveProfile(demoUser.id, { ...initialData.profile, id: demoUser.id, email: demoUser.email });
      }
      if (initialData.preferences) {
        authAndStore.savePreferences(demoUser.id, initialData.preferences);
      }
      if (initialData.applications) {
        for (const app of initialData.applications) {
          authAndStore.saveApplication(demoUser.id, app);
        }
      }
    }

    if (initialData.vacancies && initialData.vacancies.length > 0) {
      authAndStore.saveVacancies(initialData.vacancies);
    }
  }
};
