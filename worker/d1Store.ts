// worker/d1Store.ts
// Cloudflare D1 Relational Store for ApplyWise AI

import {
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
    await this.addNotification(id, 'Welcome to ApplyWise AI', 'Your account is ready. Upload your resume to start personalized job discovery!', 'system');

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
    doc: { fileName: string; fileType: string; fileSizeBytes: number; extractedText: string; isScanned: boolean },
    replaceExisting: boolean = false
  ): Promise<string> {
    if (replaceExisting) {
      await this.db.prepare('DELETE FROM resume_documents WHERE user_id = ?').bind(userId).run();
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO resume_documents (id, user_id, file_name, file_type, file_size_bytes, extracted_text, is_scanned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, doc.fileName, doc.fileType, doc.fileSizeBytes, doc.extractedText, doc.isScanned ? 1 : 0, now).run();
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
  }

  // --- ADMINISTRATOR MANAGEMENT ---
  async getAllUsers(limit = 100, offset = 0, search = ''): Promise<{ users: Array<{ id: string; email: string; fullName: string; role: string; isVerified: boolean; createdAt: string; planId?: string }>; total: number }> {
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
  }

  async updateUserRole(userId: string, newRole: 'admin' | 'user'): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind(newRole, now, userId).run();
  }

  async getAdminOverviewStats(): Promise<{ totalUsers: number; totalAdmins: number; totalApplications: number; totalResumes: number; totalVacancies: number; activeSubscriptions: number }> {
    const [uRow, aRow, appRow, resRow, vacRow, subRow] = await Promise.all([
      this.db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
      this.db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").first<{ count: number }>(),
      this.db.prepare('SELECT COUNT(*) as count FROM applications').first<{ count: number }>(),
      this.db.prepare('SELECT COUNT(*) as count FROM resume_documents').first<{ count: number }>(),
      this.db.prepare('SELECT COUNT(*) as count FROM vacancies').first<{ count: number }>(),
      this.db.prepare("SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_id = 'pro' AND status = 'active'").first<{ count: number }>(),
    ]);

    return {
      totalUsers: uRow?.count || 0,
      totalAdmins: aRow?.count || 0,
      totalApplications: appRow?.count || 0,
      totalResumes: resRow?.count || 0,
      totalVacancies: vacRow?.count || 0,
      activeSubscriptions: subRow?.count || 0,
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
    planId: 'free' | 'pro';
    status: 'active' | 'cancelled' | 'past_due';
    billingInterval: 'monthly' | 'annual';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  }> {
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
      planId: row.plan_id === 'pro' ? 'pro' : 'free',
      status: (row.status as any) || 'active',
      billingInterval: (row.billing_interval as any) || 'monthly',
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: !!row.cancel_at_period_end,
    };
  }

  async updateUserSubscription(
    userId: string,
    planId: 'free' | 'pro',
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
    const { results } = await this.db.prepare(
      'SELECT * FROM source_health_registry ORDER BY last_refreshed_at DESC'
    ).all();
    return results || [];
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
    const row = await this.db.prepare('SELECT COUNT(*) as count FROM live_jobs_cache').first<{ count: number }>();
    return row?.count || 0;
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
}
