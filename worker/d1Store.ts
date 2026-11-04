import { DEFAULT_FOUNDER_PROFILE } from '../src/data/defaultFounderProfile.ts';
import { FounderProfile } from '../src/types/index.ts';
// worker/d1Store.ts
// Cloudflare D1 Relational Store for ApplyVise AI

import {
  CandidateFact,
  UserProfile,
  CareerPreferences,
  AutomationSettings,
  JobVacancy,
  ApplicationRecord,
  AuditLogEntry,
  NotificationItem,
  TailoredResumeContent,
  CareerDigitalTwin,
  DigitalTwinSkill,
  DigitalTwinExperience,
  DigitalTwinProject,
  ProvenanceMetadata,
  TransferableSkillBridge,
  ApplicationReceipt,
  ApplicationIntegrityReport,
  CareerOutcomeItem
} from '../src/types/index.ts';
import { isPermanentFreeAccessAccount } from '../src/config/freeAccess.ts';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export class D1Store {
  constructor(private db: D1Database) {}

  // --- AUTHENTICATION ---
  async getUserByEmail(email: string): Promise<{ id: string; email: string; password_hash: string; full_name: string; role: string; is_verified: number; created_at: string } | null> {
    const cleanEmail = email.toLowerCase().trim();
    const row = await this.db.prepare(
      'SELECT id, email, password_hash, full_name, role, is_verified, created_at FROM users WHERE email = ?'
    ).bind(cleanEmail).first<{ id: string; email: string; password_hash: string; full_name: string; role: string; is_verified: number; created_at: string }>();
    return row || null;
  }

  async getUserPasswordHash(userId: string): Promise<string | null> {
    const row = await this.db.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(userId).first<{ password_hash: string }>();
    return row?.password_hash || null;
  }

  async updateUserEmail(userId: string, newEmail: string): Promise<void> {
    const cleanEmail = newEmail.toLowerCase().trim();
    const existing = await this.getUserByEmail(cleanEmail);
    if (existing && existing.id !== userId) {
      throw new Error('An account with this email address already exists');
    }
    const now = new Date().toISOString();
    await this.db.prepare('UPDATE users SET email = ?, updated_at = ? WHERE id = ?').bind(cleanEmail, now, userId).run();
    const profile = await this.getProfile(userId);
    if (profile) {
      profile.email = cleanEmail;
      await this.saveProfile(userId, profile);
    }
  }

  async createUser(fullName: string, email: string, passwordHash: string): Promise<AuthUser> {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await this.getUserByEmail(cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'user', 1, ?, ?)
    `).bind(id, cleanEmail, passwordHash, fullName.trim(), now, now).run();

    // Default blank profile
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
    await this.saveProfile(id, defaultProfile);

    // Default preferences
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
    await this.savePreferences(id, defaultPrefs);

    // Default settings
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
    await this.saveSettings(id, defaultSettings);

    await this.addAuditLog(id, 'User Signup', 'ACCOUNT_CREATED', cleanEmail, 'New user registered successfully');
    await this.addNotification(id, 'Welcome to ApplyVise AI', 'Your account is ready. Upload your resume to start personalized job discovery!', 'system');

    return {
      id,
      email: cleanEmail,
      fullName: fullName.trim(),
      role: 'user',
      isVerified: true,
      createdAt: now,
    };
  }

  async createSession(userId: string, token: string): Promise<void> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await this.db.prepare(`
      INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(sessionId, userId, token, expiresAt, now.toISOString()).run();
  }

  async getUserByToken(token: string): Promise<AuthUser | null> {
    if (!token) return null;
    const row = await this.db.prepare(`
      SELECT u.id, u.email, u.full_name, u.role, u.is_verified, u.created_at, s.expires_at
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
    `).bind(token).first<{ id: string; email: string; full_name: string; role: string; is_verified: number; created_at: string; expires_at: string }>();

    if (!row) return null;

    if (new Date(row.expires_at) < new Date()) {
      await this.db.prepare('DELETE FROM user_sessions WHERE token = ?').bind(token).run();
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
  }

  async logoutSession(token: string): Promise<void> {
    if (!token) return;
    await this.db.prepare('DELETE FROM user_sessions WHERE token = ?').bind(token).run();
  }

  // --- PER-USER PROFILE ---
  async getProfile(userId: string): Promise<UserProfile | null> {
    const row = await this.db.prepare('SELECT data FROM user_profiles WHERE user_id = ?').bind(userId).first<{ data: string }>();
    if (!row) return null;
    try {
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  }

  async saveProfile(userId: string, profile: UserProfile): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO user_profiles (user_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).bind(userId, JSON.stringify(profile), now).run();
  }

  // --- PER-USER PREFERENCES ---
  async getPreferences(userId: string): Promise<CareerPreferences> {
    const row = await this.db.prepare('SELECT data FROM career_preferences WHERE user_id = ?').bind(userId).first<{ data: string }>();
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
  }

  async savePreferences(userId: string, prefs: CareerPreferences): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO career_preferences (user_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).bind(userId, JSON.stringify(prefs), now).run();
  }

  // --- PER-USER SETTINGS ---
  async getSettings(userId: string): Promise<AutomationSettings> {
    const row = await this.db.prepare('SELECT data FROM automation_settings WHERE user_id = ?').bind(userId).first<{ data: string }>();
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
  }

  async saveSettings(userId: string, settings: AutomationSettings): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO automation_settings (user_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).bind(userId, JSON.stringify(settings), now).run();
  }

  // --- RESUME DOCUMENTS & VERSIONS ---
  async saveResumeDocument(
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
  ): Promise<string> {
    if (replaceExisting) {
      try {
        await this.db.prepare('DELETE FROM resume_documents WHERE user_id = ?').bind(userId).run();
      } catch {}
    }
    const id = doc.id || crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await this.db.prepare(`
        INSERT INTO resume_documents (
          id, user_id, file_name, file_type, file_size_bytes, extracted_text, is_scanned,
          storage_key, file_hash, mime_type, page_count, extraction_status, extraction_method,
          parser_model, error_message, warnings, processing_duration_ms, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
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
      ).run();
    } catch {
      // Fallback if migration 0010 hasn't been executed on remote yet
      await this.db.prepare(`
        INSERT INTO resume_documents (id, user_id, file_name, file_type, file_size_bytes, extracted_text, is_scanned, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, userId, doc.fileName, doc.fileType, doc.fileSizeBytes, doc.extractedText, doc.isScanned ? 1 : 0, now).run();
    }
    return id;
  }

  async countResumeDocuments(userId: string): Promise<number> {
    const row = await this.db.prepare('SELECT COUNT(*) as count FROM resume_documents WHERE user_id = ?').bind(userId).first<{ count: number }>();
    return row?.count || 0;
  }

  async saveResumeVersion(userId: string, ver: { applicationId?: string; vacancyId?: string; content: TailoredResumeContent; coverLetter?: string; truthfulnessScore: number; auditIssues?: string[] }): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO resume_versions (id, user_id, application_id, vacancy_id, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, userId, ver.applicationId || null, ver.vacancyId || null, JSON.stringify(ver), now).run();
    return id;
  }

  async getResumeVersion(userId: string, versionId: string): Promise<any | null> {
    const row = await this.db.prepare('SELECT data FROM resume_versions WHERE id = ? AND user_id = ?').bind(versionId, userId).first<{ data: string }>();
    if (!row) return null;
    try {
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  }

  // --- VACANCIES ---
  async saveVacancies(vacancies: JobVacancy[]): Promise<number> {
    let saved = 0;
    const now = new Date().toISOString();
    for (const v of vacancies) {
      try {
        await this.db.prepare(`
          INSERT INTO cached_vacancies (id, source, title, company, location, url, data, is_active, retrieved_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
          ON CONFLICT(id) DO UPDATE SET
            is_active = 1,
            retrieved_at = excluded.retrieved_at,
            data = excluded.data
        `).bind(v.id, v.source, v.title, v.company, v.location, v.url, JSON.stringify(v), now).run();
        saved++;
      } catch {
        // ignore duplicate
      }
    }
    return saved;
  }

  async getVacancies(limit = 100): Promise<JobVacancy[]> {
    // 1. First retrieve live vacancies from live_jobs_cache
    try {
      const searchRes = await this.searchLiveJobs({ limit, sort: 'recent' });
      if (searchRes.jobs && searchRes.jobs.length > 0) {
        return searchRes.jobs;
      }
    } catch (err) {
      console.warn('Failed to retrieve vacancies from live_jobs_cache, falling back to cached_vacancies:', err);
    }

    // 2. Fallback to cached_vacancies if live_jobs_cache is empty
    const { results } = await this.db.prepare(
      'SELECT data FROM cached_vacancies WHERE is_active = 1 ORDER BY retrieved_at DESC LIMIT ?'
    ).bind(limit).all<{ data: string }>();

    return (results || []).map(r => {
      try {
        return JSON.parse(r.data) as JobVacancy;
      } catch {
        return null;
      }
    }).filter((v): v is JobVacancy => v !== null);
  }

  async getVacancyById(id: string): Promise<JobVacancy | null> {
    try {
      const live = await this.getLiveJobById(id);
      if (live) return live;
    } catch {}

    const row = await this.db.prepare('SELECT data FROM cached_vacancies WHERE id = ?').bind(id).first<{ data: string }>();
    if (!row) return null;
    try {
      return JSON.parse(row.data) as JobVacancy;
    } catch {
      return null;
    }
  }

  // --- PER-USER APPLICATIONS ---
  async getApplications(userId: string): Promise<ApplicationRecord[]> {
    const { results } = await this.db.prepare(
      'SELECT data FROM applications WHERE user_id = ? ORDER BY updated_at DESC'
    ).bind(userId).all<{ data: string }>();

    return (results || []).map(r => {
      try {
        return JSON.parse(r.data) as ApplicationRecord;
      } catch {
        return null;
      }
    }).filter((a): a is ApplicationRecord => a !== null);
  }

  async getApplicationById(userId: string, id: string): Promise<ApplicationRecord | null> {
    const row = await this.db.prepare(
      'SELECT data FROM applications WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first<{ data: string }>();

    if (!row) return null;
    try {
      return JSON.parse(row.data) as ApplicationRecord;
    } catch {
      return null;
    }
  }

  async countApplications(userId: string): Promise<number> {
    const row = await this.db.prepare(
      'SELECT COUNT(*) as count FROM applications WHERE user_id = ?'
    ).bind(userId).first<{ count: number }>();
    return row?.count || 0;
  }

  async getApplicationByVacancy(userId: string, vacancyId: string): Promise<ApplicationRecord | null> {
    const row = await this.db.prepare(
      'SELECT data FROM applications WHERE user_id = ? AND vacancy_id = ?'
    ).bind(userId, vacancyId).first<{ data: string }>();

    if (!row) return null;
    try {
      return JSON.parse(row.data) as ApplicationRecord;
    } catch {
      return null;
    }
  }

  async saveApplication(userId: string, app: ApplicationRecord): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO applications (id, user_id, vacancy_id, company, role, status, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        data = excluded.data,
        updated_at = excluded.updated_at
    `).bind(app.id, userId, app.vacancyId, app.company, app.role, app.status, JSON.stringify(app), app.createdAt || now, now).run();
  }

  // --- AUDIT LOGS & NOTIFICATIONS ---
  async addAuditLog(userId: string, actor: string, action: string, target: string, details: string, severity: 'info' | 'warning' | 'security' = 'info'): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO audit_logs (id, user_id, actor, action, target, details, severity, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, actor, action, target, details, severity, now).run();
  }

  async getAuditLogs(userId: string, limit = 50): Promise<AuditLogEntry[]> {
    const { results } = await this.db.prepare(
      'SELECT id, timestamp, actor, action, target, details, severity FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?'
    ).bind(userId, limit).all<{ id: string; timestamp: string; actor: string; action: string; target: string; details: string; severity: 'info' | 'warning' | 'security' }>();

    return (results || []).map(r => ({
      ...r,
      actor: r.actor as any,
    }));
  }

  async getAllAuditLogs(limit = 100, severity?: string): Promise<AuditLogEntry[]> {
    try {
      let query = 'SELECT id, timestamp, actor, action, target, details, severity FROM audit_logs';
      const params: any[] = [];
      if (severity && severity !== 'all') {
        query += ' WHERE severity = ?';
        params.push(severity);
      }
      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      const stmt = this.db.prepare(query);
      const { results } = await (params.length === 2 ? stmt.bind(params[0], params[1]) : stmt.bind(params[0])).all<any>();
      return (results || []).map(r => ({
        ...r,
        actor: r.actor as any,
      }));
    } catch (err) {
      console.warn('[getAllAuditLogs] returning empty array due to error:', err);
      return [];
    }
  }

  // --- ADMINISTRATOR MANAGEMENT ---
  async getAllUsers(limit = 100, offset = 0, search = ''): Promise<{ users: Array<{ id: string; email: string; fullName: string; role: string; isVerified: boolean; createdAt: string; planId?: string }>; total: number }> {
    try {
      let countQuery = 'SELECT COUNT(*) as count FROM users';
      let query = 'SELECT u.id, u.email, u.full_name, u.role, u.is_verified, u.created_at, s.plan_id FROM users u LEFT JOIN user_subscriptions s ON s.user_id = u.id';
      const params: any[] = [];
      const countParams: any[] = [];

      if (search && search.trim()) {
        const term = `%${search.toLowerCase().trim()}%`;
        countQuery += ' WHERE LOWER(email) LIKE ? OR LOWER(full_name) LIKE ?';
        countParams.push(term, term);
        query += ' WHERE LOWER(u.email) LIKE ? OR LOWER(u.full_name) LIKE ?';
        params.push(term, term);
      }

      query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const countStmt = this.db.prepare(countQuery);
      const countRow = await (countParams.length ? countStmt.bind(...countParams) : countStmt).first<{ count: number }>();
      const total = countRow?.count || 0;

      const stmt = this.db.prepare(query);
      const { results } = await (params.length ? stmt.bind(...params) : stmt).all<any>();

      const users = (results || []).map(r => ({
        id: r.id,
        email: r.email,
        fullName: r.full_name,
        role: r.role || 'user',
        isVerified: !!r.is_verified,
        createdAt: r.created_at,
        planId: r.plan_id || 'free',
      }));

      return { users, total };
    } catch (err) {
      console.warn('[getAllUsers] Primary query failed, attempting safe fallback:', err);
      try {
        let countQuery = 'SELECT COUNT(*) as count FROM users';
        let query = 'SELECT id, email, full_name, role, is_verified, created_at FROM users';
        const params: any[] = [];
        const countParams: any[] = [];

        if (search && search.trim()) {
          const term = `%${search.toLowerCase().trim()}%`;
          countQuery += ' WHERE LOWER(email) LIKE ? OR LOWER(full_name) LIKE ?';
          countParams.push(term, term);
          query += ' WHERE LOWER(email) LIKE ? OR LOWER(full_name) LIKE ?';
          params.push(term, term);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const countStmt = this.db.prepare(countQuery);
        const countRow = await (countParams.length ? countStmt.bind(...countParams) : countStmt).first<{ count: number }>();
        const total = countRow?.count || 0;

        const stmt = this.db.prepare(query);
        const { results } = await (params.length ? stmt.bind(...params) : stmt).all<any>();

        return {
          users: (results || []).map(r => ({
            id: r.id,
            email: r.email,
            fullName: r.full_name,
            role: r.role || 'user',
            isVerified: !!r.is_verified,
            createdAt: r.created_at,
            planId: 'free',
          })),
          total,
        };
      } catch (fatalErr) {
        console.error('[getAllUsers] Fatal error reading users table:', fatalErr);
        return { users: [], total: 0 };
      }
    }
  }

  async updateUserRole(userId: string, newRole: 'admin' | 'user'): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind(newRole, now, userId).run();
  }

  async getAdminOverviewStats(): Promise<{ totalUsers: number; totalAdmins: number; totalApplications: number; totalResumes: number; totalVacancies: number; activeSubscriptions: number }> {
    const safeCount = async (query: string): Promise<number> => {
      try {
        const row = await this.db.prepare(query).first<{ count: number }>();
        return row?.count || 0;
      } catch (err) {
        console.error(`[AdminStats] Query failed on "${query}":`, err);
        return 0;
      }
    };

    const getVacanciesCount = async (): Promise<number> => {
      try {
        const liveRow = await this.db.prepare('SELECT COUNT(*) as count FROM live_jobs_cache').first<{ count: number }>();
        if (liveRow && liveRow.count > 0) return liveRow.count;
      } catch {}
      try {
        const cachedRow = await this.db.prepare('SELECT COUNT(*) as count FROM cached_vacancies').first<{ count: number }>();
        return cachedRow?.count || 0;
      } catch {}
      return 0;
    };

    const [totalUsers, totalAdmins, totalApplications, totalResumes, totalVacancies, activeSubscriptions] = await Promise.all([
      safeCount('SELECT COUNT(*) as count FROM users'),
      safeCount("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"),
      safeCount('SELECT COUNT(*) as count FROM applications'),
      safeCount('SELECT COUNT(*) as count FROM resume_documents'),
      getVacanciesCount(),
      safeCount("SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_id = 'pro' AND status = 'active'"),
    ]);

    return {
      totalUsers,
      totalAdmins,
      totalApplications,
      totalResumes,
      totalVacancies,
      activeSubscriptions,
    };
  }

  async addNotification(userId: string, title: string, message: string, type: string, meta?: Record<string, unknown>): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, read, meta, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(id, userId, title, message, type, meta ? JSON.stringify(meta) : null, now).run();
  }

  async getNotifications(userId: string, limit = 20): Promise<NotificationItem[]> {
    const { results } = await this.db.prepare(
      'SELECT id, title, message, type, read, meta, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(userId, limit).all<{ id: string; title: string; message: string; type: string; read: number; meta: string | null; created_at: string }>();

    return (results || []).map(r => ({
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type as any,
      read: !!r.read,
      meta: r.meta ? JSON.parse(r.meta) : undefined,
      timestamp: r.created_at,
    }));
  }

  async markNotificationsRead(userId: string, notificationId?: string): Promise<void> {
    if (notificationId) {
      await this.db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').bind(notificationId, userId).run();
    } else {
      await this.db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').bind(userId).run();
    }
  }

  async cacheInitialVacanciesIfEmpty(vacancies?: JobVacancy[]) {
    if (vacancies && vacancies.length > 0) {
      await this.saveVacancies(vacancies);
    }
  }

  // --- SUBSCRIPTIONS & ENTITLEMENTS ---
  async getUserSubscription(userId: string): Promise<{
    planId: 'free' | 'pro' | 'black';
    status: 'active' | 'cancelled' | 'past_due';
    billingInterval: 'monthly' | 'annual';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  }> {
    const userRow = await this.db.prepare('SELECT email, is_verified FROM users WHERE id = ?').bind(userId).first<{ email: string; is_verified: number }>();
    if (userRow && isPermanentFreeAccessAccount({ email: userRow.email, isVerified: !!userRow.is_verified })) {
      const now = new Date();
      return {
        planId: 'black',
        status: 'active',
        billingInterval: 'annual',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: '2099-12-31T23:59:59.999Z',
        cancelAtPeriodEnd: false,
      };
    }

    const row = await this.db.prepare(
      'SELECT plan_id, status, billing_interval, current_period_start, current_period_end, cancel_at_period_end FROM user_subscriptions WHERE user_id = ?'
    ).bind(userId).first<{
      plan_id: string;
      status: string;
      billing_interval: string;
      current_period_start: string;
      current_period_end: string;
      cancel_at_period_end: number;
    }>();

    if (!row) {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return {
        planId: 'free',
        status: 'active',
        billingInterval: 'monthly',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: nextMonth.toISOString(),
        cancelAtPeriodEnd: false,
      };
    }

    return {
      planId: row.plan_id === 'black' ? 'black' : row.plan_id === 'pro' ? 'pro' : 'free',
      status: (row.status as any) || 'active',
      billingInterval: (row.billing_interval as any) || 'monthly',
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: !!row.cancel_at_period_end,
    };
  }

  async updateUserSubscription(
    userId: string,
    planId: 'free' | 'pro' | 'black',
    billingInterval: 'monthly' | 'annual' = 'monthly'
  ): Promise<void> {
    const now = new Date();
    const periodDays = billingInterval === 'annual' ? 365 : 30;
    const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000).toISOString();
    const id = crypto.randomUUID();

    await this.db.prepare(`
      INSERT INTO user_subscriptions (id, user_id, plan_id, status, billing_interval, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?, ?, 0, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        plan_id = excluded.plan_id,
        status = excluded.status,
        billing_interval = excluded.billing_interval,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        updated_at = excluded.updated_at
    `).bind(
      id,
      userId,
      planId,
      billingInterval,
      now.toISOString(),
      periodEnd,
      now.toISOString(),
      now.toISOString()
    ).run();
  }

  async cancelSubscription(userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      'UPDATE user_subscriptions SET cancel_at_period_end = 1, updated_at = ? WHERE user_id = ?'
    ).bind(now, userId).run();
  }

  // --- AI USAGE & COPILOT CONVERSATIONS ---
  async recordAIUsage(userId: string, featureKey: string, promptLength: number, responseLength: number): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO ai_usage_logs (id, user_id, feature_key, prompt_length, response_length, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, userId, featureKey, promptLength, responseLength, now).run();
  }

  async getAIUsageCount(userId: string, sinceDate: string): Promise<number> {
    const row = await this.db.prepare(
      'SELECT COUNT(*) as count FROM ai_usage_logs WHERE user_id = ? AND created_at >= ?'
    ).bind(userId, sinceDate).first<{ count: number }>();
    return row?.count || 0;
  }

  async getLatestConversation(userId: string): Promise<{ id: string; title: string; messages: any[] } | null> {
    const row = await this.db.prepare(
      'SELECT id, title, messages FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1'
    ).bind(userId).first<{ id: string; title: string; messages: string }>();

    if (!row) return null;
    try {
      return {
        id: row.id,
        title: row.title,
        messages: JSON.parse(row.messages),
      };
    } catch {
      return null;
    }
  }

  async saveAIConversation(userId: string, conversationId: string, title: string, messages: any[]): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO ai_conversations (id, user_id, title, messages, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        messages = excluded.messages,
        updated_at = excluded.updated_at
    `).bind(conversationId, userId, title, JSON.stringify(messages), now, now).run();
  }

  // ============================================================================
  // TEMPORARY LIVE JOBS CACHE & SOURCE HEALTH
  // ============================================================================

  async cleanupExpiredLiveJobs(): Promise<number> {
    const now = new Date().toISOString();
    const res = await this.db.prepare(
      'DELETE FROM live_jobs_cache WHERE expires_at < ?'
    ).bind(now).run();
    return res.meta?.changes || 0;
  }

  async saveLiveJobs(jobs: any[]): Promise<void> {
    if (!jobs || jobs.length === 0) return;
    // Chunk into batches of 20 to stay well within D1 statement limits
    for (let i = 0; i < jobs.length; i += 20) {
      const slice = jobs.slice(i, i + 20);
      const statements = slice.map(j =>
        this.db.prepare(`
          INSERT INTO live_jobs_cache (
            id, source, source_job_id, title, company, company_logo, location, country,
            work_arrangement, employment_type, experience_level, salary_raw, salary_min, salary_max,
            salary_currency, url, description, requirements, tags, published_at, retrieved_at,
            expires_at, is_active, last_checked_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            location = excluded.location,
            salary_raw = excluded.salary_raw,
            salary_min = excluded.salary_min,
            salary_max = excluded.salary_max,
            expires_at = excluded.expires_at,
            last_checked_at = excluded.last_checked_at
        `).bind(
          j.id,
          j.source,
          j.sourceJobId,
          j.title,
          j.company,
          j.companyLogo || null,
          j.location,
          j.country,
          j.workArrangement || 'remote',
          j.employmentType || 'full-time',
          j.experienceLevel || 'mid',
          j.salaryRaw || null,
          j.salaryMin || null,
          j.salaryMax || null,
          j.salaryCurrency || '$',
          j.url,
          j.description,
          JSON.stringify(j.requirements || []),
          JSON.stringify(j.tags || []),
          j.publishedAt,
          j.retrievedAt,
          j.expiresAt,
          j.lastCheckedAt
        )
      );
      await this.db.batch(statements);
    }
  }

  async searchLiveJobs(params: {
    query?: string;
    company?: string;
    location?: string;
    workArrangement?: string;
    employmentType?: string;
    experienceLevel?: string;
    salaryMin?: number;
    salaryMax?: number;
    source?: string;
    sort?: 'recent' | 'salary' | 'title';
    page?: number;
    limit?: number;
  }): Promise<{ jobs: any[]; total: number; page: number; limit: number; totalPages: number }> {
    // 1. Clean up expired temporary records first
    await this.cleanupExpiredLiveJobs();

    const conditions: string[] = ['is_active = 1'];
    const bindings: any[] = [];

    if (params.query?.trim()) {
      const q = `%${params.query.trim().toLowerCase()}%`;
      conditions.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(company) LIKE ?)');
      bindings.push(q, q, q);
    }

    if (params.company?.trim()) {
      conditions.push('LOWER(company) LIKE ?');
      bindings.push(`%${params.company.trim().toLowerCase()}%`);
    }

    if (params.location?.trim() && params.location !== 'All Locations') {
      conditions.push('(LOWER(location) LIKE ? OR LOWER(country) LIKE ?)');
      bindings.push(`%${params.location.trim().toLowerCase()}%`, `%${params.location.trim().toLowerCase()}%`);
    }

    if (params.workArrangement && params.workArrangement !== 'all') {
      conditions.push('work_arrangement = ?');
      bindings.push(params.workArrangement);
    }

    if (params.employmentType && params.employmentType !== 'all') {
      conditions.push('employment_type = ?');
      bindings.push(params.employmentType);
    }

    if (params.experienceLevel && params.experienceLevel !== 'all') {
      conditions.push('experience_level = ?');
      bindings.push(params.experienceLevel);
    }

    if (params.source && params.source !== 'all') {
      conditions.push('source LIKE ?');
      bindings.push(`%${params.source}%`);
    }

    if (params.salaryMin && params.salaryMin > 0) {
      conditions.push('(salary_min >= ? OR salary_max >= ?)');
      bindings.push(params.salaryMin, params.salaryMin);
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM live_jobs_cache WHERE ${whereClause}`;
    const countRes = await this.db.prepare(countSql).bind(...bindings).first<{ total: number }>();
    const total = countRes?.total || 0;

    // Sorting
    let orderClause = 'published_at DESC';
    if (params.sort === 'salary') {
      orderClause = 'salary_max DESC NULLS LAST, published_at DESC';
    } else if (params.sort === 'title') {
      orderClause = 'title ASC';
    }

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 15), 50);
    const offset = (page - 1) * limit;

    const querySql = `
      SELECT * FROM live_jobs_cache
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const { results } = await this.db.prepare(querySql).bind(...bindings, limit, offset).all();

    const jobs = (results || []).map((row: any) => ({
      id: row.id,
      source: row.source,
      sourceJobId: row.source_job_id,
      title: row.title,
      company: row.company,
      companyLogo: row.company_logo,
      location: row.location,
      country: row.country,
      workArrangement: row.work_arrangement,
      remote: row.work_arrangement === 'remote',
      arrangement: row.work_arrangement,
      employmentType: row.employment_type,
      experienceLevel: row.experience_level,
      salaryRaw: row.salary_raw,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      salaryCurrency: row.salary_currency,
      salaryRange: (row.salary_raw || row.salary_min != null || row.salary_max != null) ? {
        min: row.salary_min != null ? row.salary_min : undefined,
        max: row.salary_max != null ? row.salary_max : undefined,
        currency: row.salary_currency || '$',
        raw: row.salary_raw || undefined,
      } : undefined,
      url: row.url,
      description: row.description,
      requirements: JSON.parse(row.requirements || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      publishedAt: row.published_at,
      retrievedAt: row.retrieved_at,
      expiresAt: row.expires_at,
      isActive: !!row.is_active,
      lastCheckedAt: row.last_checked_at,
    }));

    return {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getLiveJobById(id: string): Promise<any | null> {
    const row = await this.db.prepare(
      'SELECT * FROM live_jobs_cache WHERE id = ?'
    ).bind(id).first<any>();

    if (!row) return null;
    return {
      id: row.id,
      source: row.source,
      sourceJobId: row.source_job_id,
      title: row.title,
      company: row.company,
      companyLogo: row.company_logo,
      location: row.location,
      country: row.country,
      workArrangement: row.work_arrangement,
      remote: row.work_arrangement === 'remote',
      arrangement: row.work_arrangement,
      employmentType: row.employment_type,
      experienceLevel: row.experience_level,
      salaryRaw: row.salary_raw,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      salaryCurrency: row.salary_currency,
      salaryRange: (row.salary_raw || row.salary_min != null || row.salary_max != null) ? {
        min: row.salary_min != null ? row.salary_min : undefined,
        max: row.salary_max != null ? row.salary_max : undefined,
        currency: row.salary_currency || '$',
        raw: row.salary_raw || undefined,
      } : undefined,
      url: row.url,
      description: row.description,
      requirements: JSON.parse(row.requirements || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      publishedAt: row.published_at,
      retrievedAt: row.retrieved_at,
      expiresAt: row.expires_at,
      isActive: !!row.is_active,
      lastCheckedAt: row.last_checked_at,
    };
  }

  async getLiveSourcesHealth(): Promise<any[]> {
    try {
      const { results } = await this.db.prepare(
        'SELECT * FROM source_health_registry ORDER BY last_refreshed_at DESC'
      ).all();
      return results || [];
    } catch (err) {
      console.warn('[getLiveSourcesHealth] fallback to active connectors:', err);
      return [
        { source_id: 'src_greenhouse', source_name: 'Greenhouse Public API', connector_type: 'ats_greenhouse', endpoint: 'https://boards-api.greenhouse.io', status: 'healthy', total_jobs: 24, latency_ms: 120, last_refreshed_at: new Date().toISOString() },
        { source_id: 'src_lever', source_name: 'Lever Public API', connector_type: 'ats_lever', endpoint: 'https://api.lever.co', status: 'healthy', total_jobs: 18, latency_ms: 140, last_refreshed_at: new Date().toISOString() },
        { source_id: 'src_remotive', source_name: 'Remotive API', connector_type: 'aggregator_api', endpoint: 'https://remotive.com/api', status: 'healthy', total_jobs: 35, latency_ms: 210, last_refreshed_at: new Date().toISOString() },
      ];
    }
  }

  async updateSourceHealth(health: {
    sourceId: string;
    sourceName: string;
    connectorType: string;
    endpoint: string;
    status: string;
    totalJobs: number;
    latencyMs: number;
    lastError?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO source_health_registry (
        source_id, source_name, connector_type, endpoint, status, total_jobs,
        latency_ms, last_refreshed_at, last_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_id) DO UPDATE SET
        status = excluded.status,
        total_jobs = excluded.total_jobs,
        latency_ms = excluded.latency_ms,
        last_refreshed_at = excluded.last_refreshed_at,
        last_error = excluded.last_error
    `).bind(
      health.sourceId,
      health.sourceName,
      health.connectorType,
      health.endpoint,
      health.status,
      health.totalJobs,
      health.latencyMs,
      now,
      health.lastError || null
    ).run();
  }

  async countLiveJobs(): Promise<number> {
    try {
      const row = await this.db.prepare('SELECT COUNT(*) as count FROM live_jobs_cache').first<{ count: number }>();
      return row?.count || 0;
    } catch {
      return 0;
    }
  }

  // --- JOB INGESTION RUNS & AUDIT LOGGING ---
  async recordIngestionRunStart(runId: string, triggerType: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      await this.db.prepare(`
        INSERT INTO job_ingestion_runs (id, trigger_type, status, started_at)
        VALUES (?, ?, 'running', ?)
      `).bind(runId, triggerType, now).run();
    } catch (err) {
      console.warn('Could not record ingestion run start (table may need migration):', err);
    }
  }

  async recordIngestionRunComplete(params: {
    runId: string;
    status: 'completed' | 'partial' | 'failed';
    totalSources: number;
    totalFetched: number;
    totalAccepted: number;
    totalRejected: number;
    totalDuplicated: number;
    durationMs: number;
    errorSummary?: string;
  }): Promise<void> {
    try {
      const now = new Date().toISOString();
      await this.db.prepare(`
        UPDATE job_ingestion_runs SET
          status = ?,
          total_sources = ?,
          total_fetched = ?,
          total_accepted = ?,
          total_rejected = ?,
          total_duplicated = ?,
          duration_ms = ?,
          completed_at = ?,
          error_summary = ?
        WHERE id = ?
      `).bind(
        params.status,
        params.totalSources,
        params.totalFetched,
        params.totalAccepted,
        params.totalRejected,
        params.totalDuplicated,
        params.durationMs,
        now,
        params.errorSummary || null,
        params.runId
      ).run();
    } catch (err) {
      console.warn('Could not record ingestion run completion:', err);
    }
  }

  async recordIngestionError(runId: string, sourceId: string, errorType: string, errorMessage: string, httpStatus?: number): Promise<void> {
    try {
      const id = `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();
      await this.db.prepare(`
        INSERT INTO job_ingestion_errors (id, run_id, source_id, error_type, error_message, http_status, occurred_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(id, runId, sourceId, errorType, errorMessage.slice(0, 500), httpStatus || null, now).run();
    } catch (err) {
      console.warn('Could not record ingestion error:', err);
    }
  }

  async getRecentIngestionRuns(limit = 20): Promise<any[]> {
    try {
      const { results } = await this.db.prepare(
        'SELECT * FROM job_ingestion_runs ORDER BY started_at DESC LIMIT ?'
      ).bind(limit).all();
      return results || [];
    } catch {
      return [];
    }
  }

  async getRecentIngestionErrors(limit = 50): Promise<any[]> {
    try {
      const { results } = await this.db.prepare(
        'SELECT * FROM job_ingestion_errors ORDER BY occurred_at DESC LIMIT ?'
      ).bind(limit).all();
      return results || [];
    } catch {
      return [];
    }
  }

  // --- PAYMENT EVENTS AUDITING ---
  async recordPaymentEvent(event: {
    id: string;
    userId?: string;
    eventType: string;
    provider?: string;
    providerEventId?: string;
    amount?: number;
    currency?: string;
    status: string;
    payload: Record<string, any>;
  }): Promise<void> {
    try {
      const now = new Date().toISOString();
      await this.db.prepare(`
        INSERT INTO payment_events (id, user_id, event_type, provider, provider_event_id, amount, currency, status, payload, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        event.id,
        event.userId || null,
        event.eventType,
        event.provider || 'razorpay',
        event.providerEventId || null,
        event.amount || null,
        event.currency || 'INR',
        event.status,
        JSON.stringify(event.payload || {}),
        now
      ).run();
    } catch (err) {
      console.warn('Could not record payment event:', err);
    }
  }

  // --- CAREER DIGITAL TWIN ---
  async getCareerDigitalTwin(userId: string): Promise<CareerDigitalTwin> {
    const row = await this.db.prepare(
      'SELECT * FROM career_digital_twins WHERE user_id = ?'
    ).bind(userId).first<any>();

    if (row) {
      return {
        userId: row.user_id,
        professionalSummary: row.professional_summary || '',
        summaryProvenance: {
          source: 'user_confirmed',
          confidence: 'confirmed',
          confirmedAt: row.updated_at,
        },
        workExperiences: JSON.parse(row.work_experiences || '[]'),
        skillsInventory: JSON.parse(row.skills_inventory || '[]'),
        education: JSON.parse(row.education || '[]'),
        certifications: JSON.parse(row.certifications || '[]'),
        projects: JSON.parse(row.projects || '[]'),
        careerGoals: JSON.parse(row.career_goals || '[]'),
        learningObjectives: JSON.parse(row.learning_objectives || '[]'),
        transferableBridges: JSON.parse(row.transferable_bridges || '[]'),
        completenessScore: row.completeness_score || 0,
        inferredPendingCount: row.inferred_pending_count || 0,
        unverifiedCount: row.unverified_count || 0,
        updatedAt: row.updated_at,
      };
    }

    // Auto-initialize from user_profiles if available
    const profile = await this.getProfile(userId);
    const now = new Date().toISOString();

    const experiences: DigitalTwinExperience[] = ((profile && profile.experiences) || []).map(exp => ({
      id: exp.id || crypto.randomUUID(),
      company: exp.company,
      role: exp.role,
      startDate: exp.startDate,
      endDate: exp.endDate,
      current: exp.current,
      location: exp.location || '',
      description: exp.description || '',
      achievements: exp.achievements || [],
      skillsUsed: exp.verifiedSkillsUsed || [],
      provenance: {
        source: 'user_confirmed',
        confidence: 'confirmed',
        confirmedAt: now,
      },
    }));

    const skills: DigitalTwinSkill[] = ((profile && profile.skills) || []).map(s => {
      const name = typeof s === 'string' ? s : s.name;
      const category = (typeof s === 'object' && s.category) ? s.category : 'general';
      const proficiency = (typeof s === 'object' && s.proficiency) ? s.proficiency : 'proficient';
      const yearsExperience = (typeof s === 'object' && s.yearsExperience) ? s.yearsExperience : 2;
      return {
        id: crypto.randomUUID(),
        name,
        category: category as any,
        proficiency: proficiency as any,
        yearsExperience,
        provenance: {
          source: 'user_confirmed' as const,
          confidence: 'confirmed' as const,
          confirmedAt: now,
        },
      };
    });

    const education = ((profile && profile.education) || []).map(edu => ({
      ...edu,
      provenance: {
        source: 'user_confirmed' as const,
        confidence: 'confirmed' as const,
        confirmedAt: now,
      },
    }));

    const certifications = ((profile && profile.certifications) || []).map(cert => ({
      ...cert,
      provenance: {
        source: 'user_confirmed' as const,
        confidence: 'confirmed' as const,
        confirmedAt: now,
      },
    }));

    let score = 20;
    if (profile?.professionalSummary) score += 15;
    if (experiences.length > 0) score += 30;
    if (skills.length > 0) score += 20;
    if (education.length > 0) score += 15;

    const initialTwin: CareerDigitalTwin = {
      userId,
      professionalSummary: profile?.professionalSummary || '',
      summaryProvenance: {
        source: 'user_confirmed',
        confidence: 'confirmed',
        confirmedAt: now,
      },
      workExperiences: experiences,
      skillsInventory: skills,
      education,
      certifications,
      projects: [],
      careerGoals: profile?.currentTitle ? [`Grow into Senior ${profile.currentTitle}`] : ['Software Engineering Leadership'],
      learningObjectives: ['Cloud Architecture', 'Distributed Systems'],
      transferableBridges: [],
      completenessScore: Math.min(100, score),
      inferredPendingCount: 0,
      unverifiedCount: 0,
      updatedAt: now,
    };

    await this.updateCareerDigitalTwin(userId, initialTwin);
    return initialTwin;
  }

  async updateCareerDigitalTwin(userId: string, twin: Partial<CareerDigitalTwin>): Promise<CareerDigitalTwin> {
    const now = new Date().toISOString();
    const existing = await this.db.prepare('SELECT * FROM career_digital_twins WHERE user_id = ?').bind(userId).first<any>();

    const merged = {
      professional_summary: twin.professionalSummary !== undefined ? twin.professionalSummary : (existing?.professional_summary || ''),
      work_experiences: twin.workExperiences !== undefined ? JSON.stringify(twin.workExperiences) : (existing?.work_experiences || '[]'),
      skills_inventory: twin.skillsInventory !== undefined ? JSON.stringify(twin.skillsInventory) : (existing?.skills_inventory || '[]'),
      education: twin.education !== undefined ? JSON.stringify(twin.education) : (existing?.education || '[]'),
      certifications: twin.certifications !== undefined ? JSON.stringify(twin.certifications) : (existing?.certifications || '[]'),
      projects: twin.projects !== undefined ? JSON.stringify(twin.projects) : (existing?.projects || '[]'),
      career_goals: twin.careerGoals !== undefined ? JSON.stringify(twin.careerGoals) : (existing?.career_goals || '[]'),
      learning_objectives: twin.learningObjectives !== undefined ? JSON.stringify(twin.learningObjectives) : (existing?.learning_objectives || '[]'),
      transferable_bridges: twin.transferableBridges !== undefined ? JSON.stringify(twin.transferableBridges) : (existing?.transferable_bridges || '[]'),
    };

    const exps: DigitalTwinExperience[] = JSON.parse(merged.work_experiences);
    const sks: DigitalTwinSkill[] = JSON.parse(merged.skills_inventory);
    const edus = JSON.parse(merged.education);

    let score = 10;
    if (merged.professional_summary.length > 20) score += 20;
    if (exps.length > 0) score += 30;
    if (sks.length > 0) score += 20;
    if (edus.length > 0) score += 10;
    const goals = JSON.parse(merged.career_goals);
    if (goals.length > 0) score += 10;
    const completenessScore = Math.min(100, score);

    const inferredPendingCount = sks.filter(s => s.provenance?.confidence === 'inferred').length +
      exps.filter(e => e.provenance?.confidence === 'inferred').length;
    const unverifiedCount = sks.filter(s => s.provenance?.confidence === 'unverified').length +
      exps.filter(e => e.provenance?.confidence === 'unverified').length;

    await this.db.prepare(`
      INSERT INTO career_digital_twins (
        user_id, professional_summary, work_experiences, skills_inventory,
        education, certifications, projects, career_goals, learning_objectives,
        transferable_bridges, completeness_score, inferred_pending_count, unverified_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        professional_summary = excluded.professional_summary,
        work_experiences = excluded.work_experiences,
        skills_inventory = excluded.skills_inventory,
        education = excluded.education,
        certifications = excluded.certifications,
        projects = excluded.projects,
        career_goals = excluded.career_goals,
        learning_objectives = excluded.learning_objectives,
        transferable_bridges = excluded.transferable_bridges,
        completeness_score = excluded.completeness_score,
        inferred_pending_count = excluded.inferred_pending_count,
        unverified_count = excluded.unverified_count,
        updated_at = excluded.updated_at
    `).bind(
      userId,
      merged.professional_summary,
      merged.work_experiences,
      merged.skills_inventory,
      merged.education,
      merged.certifications,
      merged.projects,
      merged.career_goals,
      merged.learning_objectives,
      merged.transferable_bridges,
      completenessScore,
      inferredPendingCount,
      unverifiedCount,
      existing?.created_at || now,
      now
    ).run();

    return {
      userId,
      professionalSummary: merged.professional_summary,
      summaryProvenance: {
        source: 'user_confirmed',
        confidence: 'confirmed',
        confirmedAt: now,
      },
      workExperiences: exps,
      skillsInventory: sks,
      education: edus,
      certifications: JSON.parse(merged.certifications),
      projects: JSON.parse(merged.projects),
      careerGoals: goals,
      learningObjectives: JSON.parse(merged.learning_objectives),
      transferableBridges: JSON.parse(merged.transferable_bridges),
      completenessScore,
      inferredPendingCount,
      unverifiedCount,
      updatedAt: now,
    };
  }

  // --- APPLICATION RECEIPTS & PROOF ---
  async saveApplicationReceipt(receipt: ApplicationReceipt): Promise<void> {
    await this.db.prepare(`
      INSERT INTO application_receipts (
        id, user_id, application_id, vacancy_id, company, role, job_source,
        destination_url, submission_status, confirmation_reference,
        resume_version_id, cover_letter_version_id, tailored_resume_snapshot,
        cover_letter_snapshot, user_confirmed_answers, integrity_report, timeline, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        submission_status = excluded.submission_status,
        confirmation_reference = excluded.confirmation_reference,
        integrity_report = excluded.integrity_report,
        timeline = excluded.timeline
    `).bind(
      receipt.id,
      receipt.userId,
      receipt.applicationId,
      receipt.vacancyId,
      receipt.company,
      receipt.role,
      receipt.jobSource,
      receipt.destinationUrl,
      receipt.submissionStatus,
      receipt.confirmationReference || null,
      receipt.resumeVersionId || null,
      receipt.coverLetterVersionId || null,
      receipt.tailoredResumeSnapshot ? JSON.stringify(receipt.tailoredResumeSnapshot) : null,
      receipt.coverLetterSnapshot || null,
      receipt.userConfirmedAnswers ? JSON.stringify(receipt.userConfirmedAnswers) : null,
      JSON.stringify(receipt.integrityReport),
      JSON.stringify(receipt.timeline || []),
      receipt.createdAt || new Date().toISOString()
    ).run();
  }

  async getApplicationReceipts(userId: string): Promise<ApplicationReceipt[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM application_receipts WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all<any>();

    return (results || []).map(r => ({
      id: r.id,
      userId: r.user_id,
      applicationId: r.application_id,
      vacancyId: r.vacancy_id,
      company: r.company,
      role: r.role,
      jobSource: r.job_source,
      destinationUrl: r.destination_url,
      submissionStatus: r.submission_status,
      confirmationReference: r.confirmation_reference || undefined,
      resumeVersionId: r.resume_version_id || undefined,
      coverLetterVersionId: r.cover_letter_version_id || undefined,
      tailoredResumeSnapshot: r.tailored_resume_snapshot ? JSON.parse(r.tailored_resume_snapshot) : undefined,
      coverLetterSnapshot: r.cover_letter_snapshot || undefined,
      userConfirmedAnswers: r.user_confirmed_answers ? JSON.parse(r.user_confirmed_answers) : undefined,
      integrityReport: JSON.parse(r.integrity_report || '{}'),
      timeline: JSON.parse(r.timeline || '[]'),
      createdAt: r.created_at,
    }));
  }

  async getApplicationReceiptById(userId: string, receiptId: string): Promise<ApplicationReceipt | null> {
    const r = await this.db.prepare(
      'SELECT * FROM application_receipts WHERE user_id = ? AND id = ?'
    ).bind(userId, receiptId).first<any>();

    if (!r) return null;
    return {
      id: r.id,
      userId: r.user_id,
      applicationId: r.application_id,
      vacancyId: r.vacancy_id,
      company: r.company,
      role: r.role,
      jobSource: r.job_source,
      destinationUrl: r.destination_url,
      submissionStatus: r.submission_status,
      confirmationReference: r.confirmation_reference || undefined,
      resumeVersionId: r.resume_version_id || undefined,
      coverLetterVersionId: r.cover_letter_version_id || undefined,
      tailoredResumeSnapshot: r.tailored_resume_snapshot ? JSON.parse(r.tailored_resume_snapshot) : undefined,
      coverLetterSnapshot: r.cover_letter_snapshot || undefined,
      userConfirmedAnswers: r.user_confirmed_answers ? JSON.parse(r.user_confirmed_answers) : undefined,
      integrityReport: JSON.parse(r.integrity_report || '{}'),
      timeline: JSON.parse(r.timeline || '[]'),
      createdAt: r.created_at,
    };
  }

  // --- CAREER OUTCOMES & FEEDBACK LOOP ---
  async recordCareerOutcome(outcome: CareerOutcomeItem): Promise<void> {
    await this.db.prepare(`
      INSERT INTO career_outcomes (
        id, user_id, application_id, company, role, outcome_type, outcome_source, notes, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      outcome.id || crypto.randomUUID(),
      outcome.userId,
      outcome.applicationId || null,
      outcome.company,
      outcome.role,
      outcome.outcomeType,
      outcome.outcomeSource || 'user_reported',
      outcome.notes || null,
      outcome.recordedAt || new Date().toISOString()
    ).run();
  }

  async getCareerOutcomes(userId: string): Promise<CareerOutcomeItem[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM career_outcomes WHERE user_id = ? ORDER BY recorded_at DESC'
    ).bind(userId).all<any>();

    return (results || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      applicationId: row.application_id || undefined,
      company: row.company,
      role: row.role,
      outcomeType: row.outcome_type,
      outcomeSource: row.outcome_source,
      notes: row.notes || undefined,
      recordedAt: row.recorded_at,
    }));
  }

  async getCareerTwinInsights(userId: string): Promise<{
    recurringSkillGaps: Array<{ skill: string; frequency: number }>;
    conversionStats: { applied: number; interview: number; offer: number; rejected: number };
    recommendations: string[];
  }> {
    const outcomes = await this.getCareerOutcomes(userId);
    const receipts = await this.getApplicationReceipts(userId);

    const conversionStats = {
      applied: receipts.length,
      interview: outcomes.filter(o => o.outcomeType === 'INTERVIEW_INVITATION' || o.outcomeType === 'INTERVIEW_COMPLETED').length,
      offer: outcomes.filter(o => o.outcomeType === 'OFFER_RECEIVED').length,
      rejected: outcomes.filter(o => o.outcomeType === 'REJECTION_RECEIVED').length,
    };

    const gapMap: Record<string, number> = {};
    for (const r of receipts) {
      if (r.integrityReport?.resumeIntegrity?.inventedSkills) {
        for (const s of r.integrityReport.resumeIntegrity.inventedSkills) {
          gapMap[s] = (gapMap[s] || 0) + 1;
        }
      }
    }

    const recurringSkillGaps = Object.entries(gapMap)
      .map(([skill, frequency]) => ({ skill, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const recommendations: string[] = [];
    if (recurringSkillGaps.length > 0) {
      recommendations.push(`Consider acquiring proof or certification for '${recurringSkillGaps[0].skill}', which appeared as an unverified requirement across multiple jobs.`);
    }
    if (conversionStats.applied > 5 && conversionStats.interview === 0) {
      recommendations.push('Application response rate is low. Review your Career Twin evidence and ensure tailored bullets cite verified measurable accomplishments.');
    } else if (conversionStats.interview > 0 && conversionStats.offer === 0) {
      recommendations.push('High interview conversion rate! Focus interview prep on behavioral alignment and transferable skills storytelling.');
    } else {
      recommendations.push('Keep your Career Twin updated with recent projects to maximize verification integrity on high-match roles.');
    }

    return {
      recurringSkillGaps,
      conversionStats,
      recommendations,
    };
  }

  // ============================================================================
  // CAREER INTELLIGENCE & PART 2 PERSISTENCE
  // ============================================================================

  async saveFitEvidenceMap(evidenceMap: any): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO fit_evidence_maps (
        id, user_id, job_id, overall_confidence, total_requirements,
        verified_count, inferred_count, user_confirmed_count, missing_count,
        nodes_json, model_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, job_id) DO UPDATE SET
        overall_confidence = excluded.overall_confidence,
        total_requirements = excluded.total_requirements,
        verified_count = excluded.verified_count,
        inferred_count = excluded.inferred_count,
        user_confirmed_count = excluded.user_confirmed_count,
        missing_count = excluded.missing_count,
        nodes_json = excluded.nodes_json,
        model_version = excluded.model_version,
        updated_at = excluded.updated_at
    `).bind(
      id,
      evidenceMap.userId,
      evidenceMap.jobId,
      evidenceMap.overallConfidence,
      evidenceMap.totalRequirements,
      evidenceMap.verifiedCount,
      evidenceMap.inferredCount,
      evidenceMap.userConfirmedCount,
      evidenceMap.missingCount,
      JSON.stringify(evidenceMap.nodes || []),
      evidenceMap.modelVersion || 'v2-career-intel',
      now,
      now
    ).run();
  }

  async getFitEvidenceMap(userId: string, jobId: string): Promise<any | null> {
    try {
      const row = await this.db.prepare(`
        SELECT * FROM fit_evidence_maps WHERE user_id = ? AND job_id = ?
      `).bind(userId, jobId).first<any>();

      if (!row) return null;

      return {
        id: row.id,
        userId: row.user_id,
        jobId: row.job_id,
        overallConfidence: row.overall_confidence,
        totalRequirements: row.total_requirements,
        verifiedCount: row.verified_count,
        inferredCount: row.inferred_count,
        userConfirmedCount: row.user_confirmed_count,
        missingCount: row.missing_count,
        nodes: JSON.parse(row.nodes_json || '[]'),
        modelVersion: row.model_version,
        evaluatedAt: row.updated_at || row.created_at,
      };
    } catch {
      return null;
    }
  }

  async confirmFitEvidenceNode(userId: string, jobId: string, nodeId: string): Promise<any | null> {
    const map = await this.getFitEvidenceMap(userId, jobId);
    if (!map) return null;

    const node = map.nodes.find((n: any) => n.id === nodeId);
    if (node) {
      node.isUserConfirmed = true;
      node.confidence = 'USER_CONFIRMED';
      node.assessmentNotes = `${node.assessmentNotes} (Explicitly confirmed by candidate).`;
      map.userConfirmedCount = (map.userConfirmedCount || 0) + 1;
      if (node.confidence === 'MISSING_EVIDENCE' && map.missingCount > 0) {
        map.missingCount--;
      }
      await this.saveFitEvidenceMap(map);
    }
    return map;
  }

  async saveReadinessAssessment(assessment: any, userId: string): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO readiness_checklists (
        id, user_id, job_id, status, summary, items_json, questions_to_ask_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, job_id) DO UPDATE SET
        status = excluded.status,
        summary = excluded.summary,
        items_json = excluded.items_json,
        questions_to_ask_json = excluded.questions_to_ask_json,
        updated_at = excluded.updated_at
    `).bind(
      id,
      userId,
      assessment.jobId,
      assessment.status,
      assessment.overallSummary,
      JSON.stringify(assessment.items || []),
      JSON.stringify(assessment.questionsToAskEmployer || []),
      now,
      now
    ).run();
  }

  async getReadinessAssessment(userId: string, jobId: string): Promise<any | null> {
    try {
      const row = await this.db.prepare(`
        SELECT * FROM readiness_checklists WHERE user_id = ? AND job_id = ?
      `).bind(userId, jobId).first<any>();

      if (!row) return null;

      return {
        jobId: row.job_id,
        status: row.status,
        overallSummary: row.summary,
        items: JSON.parse(row.items_json || '[]'),
        questionsToAskEmployer: JSON.parse(row.questions_to_ask_json || '[]'),
        evaluatedAt: row.updated_at || row.created_at,
      };
    } catch {
      return null;
    }
  }

  async saveCopilotArtifact(userId: string, jobId: string, artifactType: string, content: any, verifiedOnly = true, reviewed = false): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO copilot_artifacts (
        id, user_id, job_id, artifact_type, content_json, verified_data_only, user_reviewed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, job_id, artifact_type) DO UPDATE SET
        content_json = excluded.content_json,
        verified_data_only = excluded.verified_data_only,
        user_reviewed = excluded.user_reviewed,
        updated_at = excluded.updated_at
    `).bind(
      id,
      userId,
      jobId,
      artifactType,
      JSON.stringify(content),
      verifiedOnly ? 1 : 0,
      reviewed ? 1 : 0,
      now,
      now
    ).run();
  }

  async getCopilotArtifact(userId: string, jobId: string, artifactType: string): Promise<any | null> {
    try {
      const row = await this.db.prepare(`
        SELECT * FROM copilot_artifacts WHERE user_id = ? AND job_id = ? AND artifact_type = ?
      `).bind(userId, jobId, artifactType).first<any>();

      if (!row) return null;

      return {
        id: row.id,
        jobId: row.job_id,
        artifactType: row.artifact_type,
        content: JSON.parse(row.content_json || '{}'),
        verifiedDataOnly: Boolean(row.verified_data_only),
        userReviewed: Boolean(row.user_reviewed),
        reviewedAt: row.reviewed_at,
        updatedAt: row.updated_at,
      };
    } catch {
      return null;
    }
  }

  async markCopilotArtifactReviewed(userId: string, jobId: string, artifactType: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      UPDATE copilot_artifacts SET user_reviewed = 1, reviewed_at = ?, updated_at = ?
      WHERE user_id = ? AND job_id = ? AND artifact_type = ?
    `).bind(now, now, userId, jobId, artifactType).run();
  }

  async saveInterviewPrep(prep: any, userId: string): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO interview_preparations (
        id, user_id, job_id, competencies_json, questions_json, questions_to_ask_json, feedback_rubric_json, disclaimer, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, job_id) DO UPDATE SET
        competencies_json = excluded.competencies_json,
        questions_json = excluded.questions_json,
        questions_to_ask_json = excluded.questions_to_ask_json,
        feedback_rubric_json = excluded.feedback_rubric_json,
        disclaimer = excluded.disclaimer
    `).bind(
      id,
      userId,
      prep.jobId,
      JSON.stringify(prep.competencyAreas || []),
      JSON.stringify(prep.roleSpecificQuestions ? [...prep.roleSpecificQuestions, ...(prep.technicalFunctionalQuestions || [])] : []),
      JSON.stringify(prep.questionsToAskEmployer || []),
      JSON.stringify(prep.qualityRubricFeedback || {}),
      prep.disclaimer || 'Practice questions inferred from role competencies.',
      now
    ).run();
  }

  async getInterviewPrep(userId: string, jobId: string): Promise<any | null> {
    try {
      const row = await this.db.prepare(`
        SELECT * FROM interview_preparations WHERE user_id = ? AND job_id = ?
      `).bind(userId, jobId).first<any>();

      if (!row) return null;

      const allQuestions = JSON.parse(row.questions_json || '[]');
      return {
        jobId: row.job_id,
        competencyAreas: JSON.parse(row.competencies_json || '[]'),
        roleSpecificQuestions: allQuestions.filter((q: any) => q.category !== 'technical_functional'),
        technicalFunctionalQuestions: allQuestions.filter((q: any) => q.category === 'technical_functional'),
        questionsToAskEmployer: JSON.parse(row.questions_to_ask_json || '[]'),
        qualityRubricFeedback: JSON.parse(row.feedback_rubric_json || '{}'),
        disclaimer: row.disclaimer,
        generatedAt: row.created_at,
      };
    } catch {
      return null;
    }
  }

  async saveCareerRoadmap(roadmap: any): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO career_roadmaps (
        id, user_id, target_role, prioritized_gaps_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, target_role) DO UPDATE SET
        prioritized_gaps_json = excluded.prioritized_gaps_json,
        updated_at = excluded.updated_at
    `).bind(
      id,
      roadmap.userId,
      roadmap.targetRole,
      JSON.stringify(roadmap.prioritizedGaps || []),
      now,
      now
    ).run();
  }

  async getCareerRoadmap(userId: string, targetRole?: string): Promise<any | null> {
    try {
      let query = 'SELECT * FROM career_roadmaps WHERE user_id = ?';
      const params: any[] = [userId];
      if (targetRole) {
        query += ' AND target_role = ?';
        params.push(targetRole);
      }
      query += ' ORDER BY updated_at DESC LIMIT 1';

      const row = await (params.length === 2
        ? this.db.prepare(query).bind(params[0], params[1]).first<any>()
        : this.db.prepare(query).bind(params[0]).first<any>());

      if (!row) return null;

      return {
        userId: row.user_id,
        targetRole: row.target_role,
        prioritizedGaps: JSON.parse(row.prioritized_gaps_json || '[]'),
        updatedAt: row.updated_at || row.created_at,
      };
    } catch {
      return null;
    }
  }

  async saveJobAlertRule(rule: any): Promise<void> {
    const id = rule.id || crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO job_alert_rules (
        id, user_id, title, criteria_json, frequency, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      rule.userId,
      rule.title,
      JSON.stringify(rule.criteria || {}),
      rule.frequency || 'daily',
      rule.isActive ? 1 : 0,
      now
    ).run();
  }

  async getJobAlertRules(userId: string): Promise<any[]> {
    try {
      const { results } = await this.db.prepare(`
        SELECT * FROM job_alert_rules WHERE user_id = ? ORDER BY created_at DESC
      `).bind(userId).all<any>();

      return (results || []).map(r => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        criteria: JSON.parse(r.criteria_json || '{}'),
        frequency: r.frequency,
        isActive: Boolean(r.is_active),
        lastTriggeredAt: r.last_triggered_at,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  }

  async deleteJobAlertRule(userId: string, ruleId: string): Promise<void> {
    await this.db.prepare(`
      DELETE FROM job_alert_rules WHERE user_id = ? AND id = ?
    `).bind(userId, ruleId).run();
  }

  async addApplicationActivity(event: any, userId: string): Promise<void> {
    const id = event.id || crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO application_activity_timeline (
        id, application_id, user_id, stage, note, actor, follow_up_date, recruiter_contact, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      event.applicationId,
      userId,
      event.stage,
      event.note || null,
      event.actor || 'user',
      event.followUpDate || null,
      event.recruiterContact || null,
      now
    ).run();
  }

  async getApplicationTimeline(applicationId: string, userId: string): Promise<any[]> {
    try {
      const { results } = await this.db.prepare(`
        SELECT * FROM application_activity_timeline
        WHERE application_id = ? AND user_id = ?
        ORDER BY created_at ASC
      `).bind(applicationId, userId).all<any>();

      return (results || []).map(r => ({
        id: r.id,
        applicationId: r.application_id,
        stage: r.stage,
        note: r.note,
        actor: r.actor,
        followUpDate: r.follow_up_date,
        recruiterContact: r.recruiter_contact,
        timestamp: r.created_at,
      }));
    } catch {
      return [];
    }
  }

  // --- FOUNDER PROFILE & ASSET MANAGEMENT ---
  async getPublishedFounderProfile(): Promise<FounderProfile> {
    try {
      const row = await this.db.prepare('SELECT * FROM founder_profile WHERE id = ?')
        .bind('founder_main').first<any>();
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
  }

  async getAdminFounderProfile(): Promise<{ published: FounderProfile; draft: FounderProfile; isDraftModified: boolean }> {
    const published = await this.getPublishedFounderProfile();
    try {
      const row = await this.db.prepare('SELECT draft_data FROM founder_profile WHERE id = ?')
        .bind('founder_main').first<any>();
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
  }

  async updateFounderProfileDraft(draft: Partial<FounderProfile>): Promise<FounderProfile> {
    const current = await this.getAdminFounderProfile();
    const merged = { ...current.draft, ...draft, isPublished: false, updatedAt: new Date().toISOString() };
    const now = new Date().toISOString();

    const existing = await this.db.prepare('SELECT id FROM founder_profile WHERE id = ?')
      .bind('founder_main').first<any>();
    if (!existing) {
      await this.db.prepare(`
        INSERT INTO founder_profile (
          id, name, designation, subtitle, company_name, short_bio, bio_paragraphs,
          mission_statement, quote, quote_author, expertise_tags, linkedin_url,
          story_url, photo_url, photo_asset_id, photo_aspect_ratio, is_published,
          draft_data, created_at, updated_at, published_at
        ) VALUES (
          'founder_main', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?
        )
      `).bind(
        merged.name, merged.designation, merged.subtitle, merged.companyName,
        merged.shortBio, JSON.stringify(merged.bioParagraphs), merged.missionStatement,
        merged.quote, merged.quoteAuthor, JSON.stringify(merged.expertiseTags),
        merged.linkedinUrl, merged.storyUrl, merged.photoUrl || null,
        merged.photoAssetId || null, merged.photoAspectRatio || '1:1',
        JSON.stringify(merged), now, now, now
      ).run();
    } else {
      await this.db.prepare('UPDATE founder_profile SET draft_data = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(merged), now, 'founder_main').run();
    }

    return merged;
  }

  async publishFounderProfile(): Promise<FounderProfile> {
    const { draft } = await this.getAdminFounderProfile();
    const now = new Date().toISOString();

    await this.db.prepare(`
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
    `).bind(
      draft.name, draft.designation, draft.subtitle, draft.companyName,
      draft.shortBio, JSON.stringify(draft.bioParagraphs), draft.missionStatement,
      draft.quote, draft.quoteAuthor, JSON.stringify(draft.expertiseTags),
      draft.linkedinUrl, draft.storyUrl, draft.photoUrl || null,
      draft.photoAssetId || null, draft.photoAspectRatio || '1:1',
      now, now, now
    ).run();

    return { ...draft, isPublished: true, publishedAt: now, updatedAt: now };
  }

  async revertFounderProfileDraft(): Promise<FounderProfile> {
    const now = new Date().toISOString();
    await this.db.prepare('UPDATE founder_profile SET draft_data = NULL, updated_at = ? WHERE id = ?')
      .bind(now, 'founder_main').run();
    return this.getPublishedFounderProfile();
  }

  async saveFounderImageAsset(
    filenameOrOpts: string | { filename?: string; fileName?: string; mimeType: string; fileSize?: number; sizeBytes?: number; dataBase64: string },
    maybeMime?: string,
    maybeSize?: number,
    maybeData?: string
  ): Promise<string> {
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
    await this.db.prepare(`
      INSERT INTO founder_image_assets (id, filename, mime_type, file_size, data_base64, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, filename, mimeType, fileSize, dataBase64, now).run();
    return id;
  }

  async getFounderImageAsset(id: string): Promise<{ filename: string; mime_type: string; file_size: number; data_base64: string } | null> {
    try {
      const row = await this.db.prepare('SELECT filename, mime_type, file_size, data_base64 FROM founder_image_assets WHERE id = ?')
        .bind(id).first<any>();
      if (!row) return null;
      return row;
    } catch {
      return null;
    }
  }

  async removeFounderPhoto(): Promise<void> {
    const { draft } = await this.getAdminFounderProfile();
    await this.updateFounderProfileDraft({ ...draft, photoUrl: null, photoAssetId: null });
  }

  // --- CANDIDATE FACTS REGISTRY ---
  async getCandidateFacts(userId: string): Promise<CandidateFact[]> {
    try {
      const { results } = await this.db.prepare(
        'SELECT * FROM candidate_facts WHERE user_id = ? ORDER BY category, field'
      ).bind(userId).all<any>();
      return (results || []).map((r: any) => ({
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
  }

  async saveCandidateFact(userId: string, fact: CandidateFact): Promise<void> {
    const id = fact.id || ('fact_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16));
    const now = fact.lastUpdated || new Date().toISOString();
    await this.db.prepare(`
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
    `).bind(
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
    ).run();
  }

  async saveCandidateFacts(userId: string, facts: CandidateFact[]): Promise<void> {
    for (const fact of facts) {
      await this.saveCandidateFact(userId, fact);
    }
  }

  async deleteCandidateFact(userId: string, factId: string): Promise<void> {
    await this.db.prepare('DELETE FROM candidate_facts WHERE user_id = ? AND id = ?')
      .bind(userId, factId).run();
  }

  // --- SIX-PILLAR CAREER OPERATIONS ---
  async getOpportunitySignals(): Promise<any[]> {
    try {
      const { results } = await this.db.prepare('SELECT * FROM opportunity_signals ORDER BY published_date DESC LIMIT 50').all<any>();
      if (results && results.length > 0) {
        return results.map(r => ({
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
      // Return verifiable default corporate hiring signals
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
  }

  async getMockInterviewSessions(userId: string, jobId?: string): Promise<any[]> {
    try {
      let query = 'SELECT * FROM interview_mock_sessions WHERE user_id = ?';
      const params: any[] = [userId];
      if (jobId) {
        query += ' AND job_id = ?';
        params.push(jobId);
      }
      query += ' ORDER BY created_at DESC';

      const { results } = await this.db.prepare(query).bind(...params).all<any>();
      return (results || []).map(r => ({
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
  }

  async saveMockInterviewSession(session: any, userId: string): Promise<any> {
    const now = new Date().toISOString();
    const id = session.id || `mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      await this.db.prepare(`
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
      `).bind(
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
      ).run();
    } catch {
      // Table may not yet be migrated
    }

    return {
      id,
      userId,
      ...session,
      createdAt: session.createdAt || now,
      updatedAt: now,
    };
  }

  async getRecruiterReviewAudit(applicationId: string, userId: string): Promise<any | null> {
    try {
      const row = await this.db.prepare(
        'SELECT * FROM recruiter_review_audits WHERE application_id = ? AND user_id = ?'
      ).bind(applicationId, userId).first<any>();

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
  }

  async saveRecruiterReviewAudit(audit: any, userId: string): Promise<any> {
    const now = new Date().toISOString();
    const id = audit.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      await this.db.prepare(`
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
      `).bind(
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
        now,
        now
      ).run();
    } catch {
      // Table may not yet be migrated
    }

    return {
      id,
      userId,
      ...audit,
      updatedAt: now,
    };
  }


  // --- ADMIN RESUME EXTRACTION & REVIEW WORKSPACE ---
  async getAdminResumes(options: {
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

    const totalFilteredQuery = `
      SELECT COUNT(*) as count 
      FROM resume_documents r
      JOIN users u ON r.user_id = u.id
      ${whereClause}
    `;

    try {
      const { results: rows } = await this.db.prepare(listQuery).bind(...params, limit, offset).all<any>();
      const summaryRow = await this.db.prepare(summaryQuery).first<any>() || {};
      const totalFilteredRow = await this.db.prepare(totalFilteredQuery).bind(...params).first<{ count: number }>();
      const totalFiltered = totalFilteredRow?.count || 0;

      const resumes = (rows || []).map(r => ({
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
    } catch {
      // Graceful fallback if tables unmigrated
      return {
        resumes: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
        summary: {
          total: 0,
          successCount: 0,
          partialCount: 0,
          failedCount: 0,
          scannedCount: 0,
          pendingCount: 0
        }
      };
    }
  }

  async getResumeDocumentById(id: string) {
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
    const r = await this.db.prepare(query).bind(id).first<any>();
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
  }

  async getResumeExtractionRuns(resumeId: string) {
    try {
      const { results: rows } = await this.db.prepare(
        'SELECT * FROM resume_extraction_runs WHERE resume_id = ? ORDER BY created_at DESC'
      ).bind(resumeId).all<any>();

      return (rows || []).map(r => ({
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
    } catch {
      return [];
    }
  }

  async saveResumeExtractionRun(run: {
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
  }): Promise<string> {
    const id = run.id || crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await this.db.prepare(`
        INSERT INTO resume_extraction_runs (
          id, resume_id, user_id, run_type, status, extraction_method, parser_model,
          structured_output, diagnostics, error_message, warnings, duration_ms, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
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
      ).run();
    } catch {}
    return id;
  }

  async getResumeExtractionVersions(resumeId: string) {
    try {
      const { results: rows } = await this.db.prepare(
        'SELECT * FROM resume_extraction_versions WHERE resume_id = ? ORDER BY version_number DESC'
      ).bind(resumeId).all<any>();

      return (rows || []).map(r => ({
        id: r.id,
        resumeId: r.resume_id,
        userId: r.user_id,
        versionNumber: r.version_number,
        data: JSON.parse(r.data),
        diffSummary: r.diff_summary ? JSON.parse(r.diff_summary) : null,
        createdBy: r.created_by,
        createdAt: r.created_at
      }));
    } catch {
      return [];
    }
  }

  async saveResumeExtractionVersion(version: {
    id?: string;
    resumeId: string;
    userId: string;
    versionNumber?: number;
    data: any;
    diffSummary?: any;
    createdBy: string;
  }): Promise<string> {
    const id = version.id || crypto.randomUUID();
    const now = new Date().toISOString();

    let verNum = version.versionNumber;
    if (!verNum) {
      try {
        const maxRow = await this.db.prepare(
          'SELECT MAX(version_number) as max_ver FROM resume_extraction_versions WHERE resume_id = ?'
        ).bind(version.resumeId).first<any>();
        verNum = (maxRow?.max_ver || 0) + 1;
      } catch {
        verNum = 1;
      }
    }

    try {
      await this.db.prepare(`
        INSERT INTO resume_extraction_versions (
          id, resume_id, user_id, version_number, data, diff_summary, created_by, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        version.resumeId,
        version.userId,
        verNum,
        JSON.stringify(version.data),
        version.diffSummary ? JSON.stringify(version.diffSummary) : null,
        version.createdBy,
        now
      ).run();
    } catch {}
    return id;
  }

  async getResumeExtractionEvents(resumeId: string) {
    try {
      const { results: rows } = await this.db.prepare(
        'SELECT * FROM resume_extraction_events WHERE resume_id = ? ORDER BY created_at DESC'
      ).bind(resumeId).all<any>();

      return (rows || []).map(r => ({
        id: r.id,
        resumeId: r.resume_id,
        adminId: r.admin_id,
        adminEmail: r.admin_email,
        eventType: r.event_type,
        details: r.details ? JSON.parse(r.details) : null,
        ipAddress: r.ip_address,
        createdAt: r.created_at
      }));
    } catch {
      return [];
    }
  }

  async logResumeExtractionEvent(event: {
    resumeId: string;
    adminId: string;
    adminEmail: string;
    eventType: string;
    details?: any;
    ipAddress?: string;
  }): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await this.db.prepare(`
        INSERT INTO resume_extraction_events (
          id, resume_id, admin_id, admin_email, event_type, details, ip_address, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        event.resumeId,
        event.adminId,
        event.adminEmail,
        event.eventType,
        event.details ? JSON.stringify(event.details) : null,
        event.ipAddress || null,
        now
      ).run();
    } catch {}
    return id;
  }

  async updateResumeDocumentStatus(id: string, updates: {
    extractionStatus?: string;
    extractionMethod?: string;
    parserModel?: string;
    extractedText?: string;
    errorMessage?: string;
    warnings?: string[];
    processingDurationMs?: number;
  }): Promise<void> {
    const now = new Date().toISOString();
    const current = await this.getResumeDocumentById(id);
    if (!current) return;

    try {
      await this.db.prepare(`
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
      `).bind(
        updates.extractionStatus || current.extractionStatus,
        updates.extractionMethod || current.extractionMethod,
        updates.parserModel || current.parserModel || null,
        updates.extractedText || current.extractedText,
        updates.errorMessage || null,
        updates.warnings ? JSON.stringify(updates.warnings) : (current.warnings ? JSON.stringify(current.warnings) : null),
        updates.processingDurationMs ?? current.processingDurationMs ?? 0,
        now,
        id
      ).run();
    } catch {}
  }

  async getCareerTrajectories(userId: string): Promise<any[]> {
    try {
      const { results } = await this.db.prepare(
        'SELECT * FROM career_trajectories WHERE user_id = ? ORDER BY is_active DESC, updated_at DESC'
      ).bind(userId).all<any>();

      if (results && results.length > 0) {
        return results.map(r => ({
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
      // Default trajectory fallback
    }

    return [
      {
        id: 'traj_operations_lead',
        userId,
        trajectoryTitle: 'Operations & Process Leadership',
        targetRole: 'Director of Enterprise Operations',
        currentAlignmentScore: 82,
        transferableSkills: ['Process Optimization', 'Enterprise Supply Chain', 'SLA Management', 'Cross-Functional Leadership'],
        missingSkills: ['Six Sigma Black Belt', 'Multi-Region Logistics', 'P&L Budget Oversight'],
        requiredExperienceYears: 8,
        recommendedCertifications: ['Lean Six Sigma Black Belt', 'APICS Certified Supply Chain Professional (CSCP)'],
        learningPath: [
          { step: 1, title: 'Complete Lean Six Sigma Black Belt practical project', estimatedHours: 40, rationale: 'Validates quantitative process excellence methodology', isCompleted: false },
          { step: 2, title: 'Lead multi-site process standardization initiative', estimatedHours: 60, rationale: 'Demonstrates distributed leadership capability', isCompleted: false },
        ],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  async saveCareerTrajectory(traj: any, userId: string): Promise<any> {
    const now = new Date().toISOString();
    const id = traj.id || `traj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      await this.db.prepare(`
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
      `).bind(
        id,
        userId,
        traj.trajectoryTitle || 'Target Career Trajectory',
        traj.targetRole || 'Target Role',
        traj.currentAlignmentScore || 70,
        JSON.stringify(traj.transferableSkills || []),
        JSON.stringify(traj.missingSkills || []),
        traj.requiredExperienceYears || 5,
        JSON.stringify(traj.recommendedCertifications || []),
        JSON.stringify(traj.learningPath || []),
        traj.isActive !== false ? 1 : 0,
        traj.createdAt || now,
        now
      ).run();
    } catch {
      // Table may not yet be migrated
    }

    return {
      id,
      userId,
      ...traj,
      updatedAt: now,
    };
  }


}
