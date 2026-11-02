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
  TailoredResumeContent
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
  async saveResumeDocument(userId: string, doc: { fileName: string; fileType: string; fileSizeBytes: number; extractedText: string; isScanned: boolean }): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO resume_documents (id, user_id, file_name, file_type, file_size_bytes, extracted_text, is_scanned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, doc.fileName, doc.fileType, doc.fileSizeBytes, doc.extractedText, doc.isScanned ? 1 : 0, now).run();
    return id;
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
      employmentType: row.employment_type,
      experienceLevel: row.experience_level,
      salaryRaw: row.salary_raw,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      salaryCurrency: row.salary_currency,
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
      employmentType: row.employment_type,
      experienceLevel: row.experience_level,
      salaryRaw: row.salary_raw,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      salaryCurrency: row.salary_currency,
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
}
