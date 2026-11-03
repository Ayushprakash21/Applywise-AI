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
  TailoredResumeContent,
  CareerDigitalTwin,
  ApplicationIntegrityReport,
  ApplicationReceipt,
  CareerOutcomeItem,
  TransferableSkillBridge,
  AccountUsageStats,
  FitEvidenceMap,
  ApplicationReadinessAssessment,
  CopilotJobArtifacts,
  InterviewIntelligenceReport,
  ResumeIntelligenceReport,
  ResumeToJobComparison,
  CareerRoadmap,
  JobAlertRule,
  ApplicationActivityEvent
} from '../types/index.ts';

export interface DashboardSummary {
  profileCompletion: number;
  breakdown: {
    hasBasicInfo: boolean;
    hasTitle: boolean;
    hasSummary: boolean;
    hasExperience: boolean;
    hasSkills: boolean;
    hasEducation: boolean;
    hasPreferences: boolean;
    hasMasterResume: boolean;
  };
  pipeline: {
    draft: number;
    ready: number;
    applied: number;
    interview: number;
    offer: number;
    rejected: number;
    withdrawn: number;
  };
  activeApplicationsCount: number;
  upcomingInterviewsCount: number;
  upcomingInterviews: Array<{
    id: string;
    company: string;
    role: string;
    status: string;
    matchScore: number;
  }>;
  relevantMatchesCount: number;
  topMatches: JobVacancy[];
  nextBestAction: {
    id: string;
    title: string;
    description: string;
    reason: string;
    actionLabel: string;
    actionType: 'onboarding' | 'profile' | 'interview' | 'applications' | 'jobs' | 'matches';
    targetId?: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  };
  allRecommendations: Array<{
    id: string;
    title: string;
    description: string;
    reason: string;
    actionLabel: string;
    actionType: 'onboarding' | 'profile' | 'interview' | 'applications' | 'jobs' | 'matches';
    targetId?: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  recentActivity: AuditLogEntry[];
  unreadNotificationsCount: number;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('applyvise_token') || localStorage.getItem('applywise_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options?.headers,
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const errData = await res.json() as any;
      if (errData?.error) errMsg = errData.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
}

let cachedAuthConfig: { googleClientId: string | null; googleAuthEnabled: boolean } | null = null;
let authConfigPromise: Promise<{ googleClientId: string | null; googleAuthEnabled: boolean }> | null = null;

export const getCachedOrFetchAuthConfig = async (): Promise<{ googleClientId: string | null; googleAuthEnabled: boolean }> => {
  const envClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || null;
  if (cachedAuthConfig) return cachedAuthConfig;
  if (!authConfigPromise) {
    authConfigPromise = fetchJson<{ googleClientId: string | null; googleAuthEnabled: boolean }>('/api/auth/config')
      .then(res => {
        const id = res.googleClientId || envClientId;
        cachedAuthConfig = {
          googleClientId: id,
          googleAuthEnabled: Boolean(id),
        };
        return cachedAuthConfig;
      })
      .catch(() => {
        cachedAuthConfig = {
          googleClientId: envClientId,
          googleAuthEnabled: Boolean(envClientId),
        };
        return cachedAuthConfig;
      });
  }
  return authConfigPromise;
};

// Start eager fetching auth config in the browser
if (typeof window !== 'undefined') {
  getCachedOrFetchAuthConfig().catch(() => {});
}

export const api = {
  // --- AUTHENTICATION ---
  signup: (data: { fullName: string; email: string; password: string; confirmPassword?: string }) =>
    fetchJson<{ success: boolean; user: AuthUser; token: string; message: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    fetchJson<{ success: boolean; user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  loginWithGoogle: (credential: string) =>
    fetchJson<{ success: boolean; user: AuthUser; token: string }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),

  logout: async () => {
    try {
      await fetchJson<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('applyvise_token');
      localStorage.removeItem('applywise_token');
      localStorage.removeItem('applyvise_user');
      localStorage.removeItem('applywise_user');
    }
  },

  getMe: () => fetchJson<{ success: boolean; user: AuthUser }>('/api/auth/me'),

  recoverPassword: (email: string) =>
    fetchJson<{ success: boolean; message: string }>('/api/auth/recover-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  getAuthConfig: () => getCachedOrFetchAuthConfig(),

  changeEmail: (data: { currentPassword?: string; newEmail: string }) =>
    fetchJson<{ success: boolean; user: AuthUser; message: string }>('/api/auth/change-email', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUserUsage: () =>
    fetchJson<{ success: boolean; stats: AccountUsageStats }>('/api/user/usage'),

  getDashboardSummary: () =>
    fetchJson<{ success: boolean; summary: DashboardSummary }>('/api/dashboard/summary'),

  // --- ADMINISTRATOR APIS ---
  getAdminMe: () =>
    fetchJson<{ success: boolean; user: AuthUser }>('/api/admin/me'),

  getAdminOverview: () =>
    fetchJson<{
      success: boolean;
      stats: {
        totalUsers: number;
        totalAdmins: number;
        totalApplications: number;
        totalResumes: number;
        totalVacancies: number;
        activeSubscriptions: number;
      };
    }>('/api/admin/overview'),

  getAdminUsers: (params?: { limit?: number; offset?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    if (params?.search) q.set('search', params.search);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    return fetchJson<{
      users: Array<{
        id: string;
        email: string;
        fullName: string;
        role: string;
        isVerified: boolean;
        createdAt: string;
        planId?: string;
      }>;
      total: number;
    }>(`/api/admin/users${queryString}`);
  },

  updateAdminUserRole: (id: string, newRole: 'admin' | 'user') =>
    fetchJson<{ success: boolean; message: string }>(`/api/admin/users/${id}/role`, {
      method: 'POST',
      body: JSON.stringify({ newRole }),
    }),

  getAdminAuditLogs: (params?: { limit?: number; severity?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.severity) q.set('severity', params.severity);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    return fetchJson<{ success: boolean; logs: AuditLogEntry[] }>(`/api/admin/audit-logs${queryString}`);
  },

  getAdminSystemHealth: () =>
    fetchJson<{ success: boolean; system: any }>('/api/admin/system-health'),

  getAdminSourcesHealth: () =>
    fetchJson<{
      success: boolean;
      totalCachedJobs: number;
      sources: any[];
      recentRuns: any[];
      recentErrors: any[];
      serverTime: string;
    }>('/api/admin/sources/health'),

  // --- PROFILE ---
  getProfile: () => fetchJson<{ success: boolean; profile: UserProfile }>('/api/profile'),
  updateProfile: (profile: Partial<UserProfile>) =>
    fetchJson<{ success: boolean; profile: UserProfile }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),

  // --- PREFERENCES ---
  getPreferences: () => fetchJson<{ success: boolean; preferences: CareerPreferences }>('/api/preferences'),
  updatePreferences: (preferences: Partial<CareerPreferences>) =>
    fetchJson<{ success: boolean; preferences: CareerPreferences }>('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }),

  // --- SETTINGS & SAFETY ---
  getSettings: () => fetchJson<{ success: boolean; settings: AutomationSettings }>('/api/settings'),
  updateSettings: (settings: Partial<AutomationSettings>) =>
    fetchJson<{ success: boolean; settings: AutomationSettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  toggleEmergencyStop: (enabled?: boolean) =>
    fetchJson<{ success: boolean; emergencyStop: boolean; settings: AutomationSettings }>('/api/settings/emergency-stop', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),

  // --- VACANCIES & SEARCH ---
  getVacancies: () => fetchJson<{ success: boolean; vacancies: JobVacancy[] }>('/api/vacancies'),
  searchJobs: (query?: string, country?: string, remoteOnly?: boolean) =>
    fetchJson<{
      success: boolean;
      totalDiscovered: number;
      vacancies: JobVacancy[];
      jobs?: JobVacancy[];
      errors: string[];
    }>('/api/jobs/search', {
      method: 'POST',
      body: JSON.stringify({ query, country, remoteOnly }),
    }),
  searchLiveJobs: (params: {
    q?: string;
    company?: string;
    location?: string;
    workArrangement?: string;
    employmentType?: string;
    experienceLevel?: string;
    salaryMin?: number;
    salaryMax?: number;
    source?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.company) sp.set('company', params.company);
    if (params.location && params.location !== 'All Locations' && params.location !== 'All Countries') sp.set('location', params.location);
    if (params.workArrangement && params.workArrangement !== 'all') sp.set('workArrangement', params.workArrangement);
    if (params.employmentType && params.employmentType !== 'all') sp.set('employmentType', params.employmentType);
    if (params.experienceLevel && params.experienceLevel !== 'all') sp.set('experienceLevel', params.experienceLevel);
    if (params.salaryMin) sp.set('salaryMin', String(params.salaryMin));
    if (params.salaryMax) sp.set('salaryMax', String(params.salaryMax));
    if (params.source && params.source !== 'all') sp.set('source', params.source);
    if (params.sort) sp.set('sort', params.sort);
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));

    return fetchJson<{
      success: boolean;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      jobs: JobVacancy[];
    }>(`/api/jobs/search?${sp.toString()}`);
  },
  getLiveJobsStatus: () =>
    fetchJson<{
      success: boolean;
      totalCachedJobs: number;
      refreshCadence: string;
      sources: Array<{
        source_id: string;
        source_name: string;
        connector_type: string;
        endpoint: string;
        status: string;
        total_jobs: number;
        latency_ms: number;
        last_refreshed_at: string;
        last_error?: string;
      }>;
      lastChecked: string;
    }>('/api/jobs/status'),

  // --- CAREER INTELLIGENCE & NEXT-GEN APPLICATION SUITE (PART 2) ---
  getFitEvidenceMap: (jobId: string) =>
    fetchJson<{ success: boolean; evidenceMap: FitEvidenceMap }>(`/api/jobs/${jobId}/evidence-map`),

  confirmFitEvidenceNode: (jobId: string, nodeId: string) =>
    fetchJson<{ success: boolean; evidenceMap: FitEvidenceMap }>(`/api/jobs/${jobId}/evidence-map/confirm`, {
      method: 'POST',
      body: JSON.stringify({ nodeId }),
    }),

  getApplicationReadiness: (jobId: string) =>
    fetchJson<{ success: boolean; readiness: ApplicationReadinessAssessment }>(`/api/jobs/${jobId}/readiness`),

  getCopilotArtifacts: (jobId: string) =>
    fetchJson<{ success: boolean; artifacts: CopilotJobArtifacts; userReviewed: boolean }>(`/api/jobs/${jobId}/copilot`),

  reviewCopilotArtifacts: (jobId: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/jobs/${jobId}/copilot/review`, {
      method: 'POST',
    }),

  getInterviewPrep: (jobId: string) =>
    fetchJson<{ success: boolean; interviewPrep: InterviewIntelligenceReport }>(`/api/jobs/${jobId}/interview-prep`),

  getResumeIntelligence: () =>
    fetchJson<{ success: boolean; report: ResumeIntelligenceReport }>('/api/resume/intelligence'),

  compareResumeToJob: (jobId: string) =>
    fetchJson<{ success: boolean; comparison: ResumeToJobComparison }>(`/api/resume/compare/${jobId}`, {
      method: 'POST',
    }),

  getCareerRoadmap: (role?: string) =>
    fetchJson<{ success: boolean; roadmap: CareerRoadmap }>(`/api/career/roadmap${role ? `?role=${encodeURIComponent(role)}` : ''}`),

  getJobAlerts: () =>
    fetchJson<{ success: boolean; alerts: JobAlertRule[] }>('/api/alerts'),

  createJobAlert: (alert: Partial<JobAlertRule>) =>
    fetchJson<{ success: boolean; alert: JobAlertRule }>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(alert),
    }),

  deleteJobAlert: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/alerts/${id}`, {
      method: 'DELETE',
    }),

  getApplicationTimeline: (appId: string) =>
    fetchJson<{ success: boolean; timeline: ApplicationActivityEvent[] }>(`/api/applications/${appId}/timeline`),

  addApplicationActivity: (appId: string, event: Partial<ApplicationActivityEvent>) =>
    fetchJson<{ success: boolean; timeline: ApplicationActivityEvent[] }>(`/api/applications/${appId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(event),
    }),
  getLiveJobsSources: () =>
    fetchJson<{
      success: boolean;
      sources: Array<{
        id: string;
        name: string;
        company: string;
        type: string;
        endpoint: string;
        rateLimitSeconds: number;
        status: string;
        totalJobs: number;
        lastRefreshedAt: string | null;
      }>;
    }>('/api/jobs/sources'),
  getLiveJob: (source: string, jobId: string) =>
    fetchJson<{ success: boolean; job: JobVacancy }>(`/api/jobs/${encodeURIComponent(source)}/${encodeURIComponent(jobId)}`),
  refreshLiveJobs: () =>
    fetchJson<{
      success: boolean;
      syncResult: any;
      message: string;
    }>('/api/jobs/refresh', { method: 'POST' }),
  analyzeJob: (id: string) =>
    fetchJson<{
      success: boolean;
      analysis: {
        jobId: string;
        title: string;
        company: string;
        extractedRequirements: {
          coreSkills: string[];
          workArrangement: string;
          experienceLevel: string;
          salaryPublished: boolean;
          salaryRange: string;
        };
        aiInsights: {
          keyResponsibilities: string[];
          recommendedFocusAreas: string[];
          sponsorshipInsight: string;
        };
        analyzedAt: string;
      };
    }>(`/api/jobs/${id}/analyze`, { method: 'POST' }),
  matchJob: (id: string) =>
    fetchJson<{
      success: boolean;
      match: {
        matchScore: number;
        heuristicDisclaimer: string;
        breakdown: Record<string, number>;
        matchedSkills: string[];
        missingSkills: string[];
        recommendation: string;
        evaluatedAt: string;
      };
    }>(`/api/jobs/${id}/match`, { method: 'POST' }),
  applyAssisted: (id: string) =>
    fetchJson<{
      success: boolean;
      application: ApplicationRecord;
      officialApplicationUrl: string;
      message: string;
    }>(`/api/jobs/${id}/apply-assisted`, { method: 'POST' }),
  applyAuto: (id: string) =>
    fetchJson<{
      success: boolean;
      application: ApplicationRecord;
      status: ApplicationStatus;
      message: string;
      error?: string;
      requiresConsent?: boolean;
      quotaExceeded?: boolean;
    }>(`/api/jobs/${id}/apply-auto`, { method: 'POST' }),
  recheckVacancy: (id: string) =>
    fetchJson<{ success: boolean; vacancy: JobVacancy }>(`/api/vacancies/${id}/recheck`, {
      method: 'POST',
    }),

  // --- APPLICATIONS ---
  getApplications: () => fetchJson<{ success: boolean; applications: ApplicationRecord[] }>('/api/applications'),
  createFromVacancy: (vacancyId: string) =>
    fetchJson<{ success: boolean; application: ApplicationRecord }>('/api/applications/create-from-vacancy', {
      method: 'POST',
      body: JSON.stringify({ vacancyId }),
    }),
  transitionStatus: (id: string, newStatus: ApplicationStatus, note?: string) =>
    fetchJson<{ success: boolean; application: ApplicationRecord }>(`/api/applications/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ newStatus, note }),
    }),
  approveApplication: (id: string) =>
    fetchJson<{ success: boolean; application: ApplicationRecord }>(`/api/applications/${id}/approve`, {
      method: 'POST',
    }),
  submitApplication: (id: string, userEvidence?: { confirmationCode?: string; employerConfirmationUrl?: string; notes?: string }) =>
    fetchJson<{ success: boolean; application: ApplicationRecord; guidedApplication?: any; message: string }>(`/api/applications/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ userEvidence }),
    }),

  // --- RESUME UPLOAD & PARSING (CRITICAL BUG FIX) ---
  uploadResumeFile: async (file: File, replace = false) => {
    const formData = new FormData();
    formData.append('file', file);
    if (replace) {
      formData.append('replace', 'true');
    }

    const token = localStorage.getItem('applyvise_token') || localStorage.getItem('applywise_token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch('/api/resumes/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errMsg = `Upload failed: ${res.status}`;
      try {
        const data = await res.json() as any;
        if (data?.error) errMsg = data.error;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    return res.json() as Promise<{
      success: boolean;
      profile: UserProfile;
      extractedTextSummary: string;
      warning?: string;
      identityMismatch?: boolean;
    }>;
  },

  parseResumeText: (resumeText: string) =>
    fetchJson<{ success: boolean; profile: UserProfile }>('/api/ai/parse-resume', {
      method: 'POST',
      body: JSON.stringify({ resumeText }),
    }),

  downloadDocxResume: async (applicationId: string, companyName: string) => {
    const token = localStorage.getItem('applyvise_token') || localStorage.getItem('applywise_token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(`/api/resumes/${applicationId}/export/docx`, {
      headers,
    });

    if (!res.ok) throw new Error('Failed to download resume document');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Resume.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // --- NOTIFICATIONS & AUDIT ---
  getAuditLogs: () => fetchJson<{ success: boolean; logs: AuditLogEntry[] }>('/api/audit-logs'),
  getNotifications: () => fetchJson<{ success: boolean; notifications: NotificationItem[] }>('/api/notifications'),
  markNotificationRead: (id: string) =>
    fetchJson<{ success: boolean; notifications: NotificationItem[] }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  markAllNotificationsRead: () =>
    fetchJson<{ success: boolean; notifications: NotificationItem[] }>('/api/notifications/mark-all-read', {
      method: 'POST',
    }),

  // --- INTEGRATIONS ---
  getIntegrations: () => fetchJson<{ success: boolean; integrations: SourceIntegrationStatus[] }>('/api/integrations'),

  // --- SUBSCRIPTIONS & ENTITLEMENTS ---
  getSubscription: () =>
    fetchJson<{
      success: boolean;
      subscription: {
        planId: 'free' | 'pro' | 'black';
        status: 'active' | 'cancelled' | 'past_due';
        billingInterval: 'monthly' | 'annual';
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
      };
      usage: {
        used: number;
        limit: number;
        remaining: number;
        periodStart: string;
        periodEnd: string;
      };
    }>('/api/subscription/current'),

  upgradeSubscription: (planId = 'pro', billingInterval = 'monthly') =>
    fetchJson<{
      success: boolean;
      subscription: any;
      message: string;
    }>('/api/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planId, billingInterval }),
    }),

  createRazorpayOrder: (planId: 'pro' | 'black' = 'pro', billingInterval: 'monthly' | 'annual' = 'monthly') =>
    fetchJson<{
      success: boolean;
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      planId: string;
      billingInterval: string;
    }>('/api/subscription/razorpay/create-order', {
      method: 'POST',
      body: JSON.stringify({ planId, billingInterval }),
    }),

  verifyRazorpayPayment: (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: 'pro' | 'black';
    billingInterval: 'monthly' | 'annual';
  }) =>
    fetchJson<{
      success: boolean;
      subscription: any;
      message: string;
    }>('/api/subscription/razorpay/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelSubscription: () =>
    fetchJson<{
      success: boolean;
      subscription: any;
      message: string;
    }>('/api/subscription/cancel', {
      method: 'POST',
    }),

  // --- UNIFIED AI COPILOT ---
  askCopilot: (message: string, context?: Record<string, unknown>) =>
    fetchJson<{
      success: boolean;
      reply: string;
      conversationId?: string;
      usage: {
        used: number;
        limit: number;
        remaining: number;
      };
    }>('/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    }),

  getCopilotHistory: () =>
    fetchJson<{
      success: boolean;
      conversation?: {
        id: string;
        title: string;
        messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
      };
    }>('/api/ai/copilot/history'),

  // --- CAREER DIGITAL TWIN & APPLICATION INTEGRITY ---
  getCareerTwin: () =>
    fetchJson<{ success: boolean; twin: CareerDigitalTwin }>('/api/career-twin'),

  updateCareerTwin: (twin: Partial<CareerDigitalTwin>) =>
    fetchJson<{ success: boolean; twin: CareerDigitalTwin }>('/api/career-twin', {
      method: 'PUT',
      body: JSON.stringify(twin),
    }),

  getTransferableSkills: (jobTitle: string, jobDescription: string) =>
    fetchJson<{ success: boolean; bridges: TransferableSkillBridge[] }>('/api/career-twin/transferable-skills', {
      method: 'POST',
      body: JSON.stringify({ jobTitle, jobDescription }),
    }),

  verifyApplicationIntegrity: (params: {
    vacancyId: string;
    destinationUrl?: string;
    jobSource?: string;
    tailoredResume?: TailoredResumeContent;
    coverLetter?: string;
    screeningAnswers?: Record<string, string>;
  }) =>
    fetchJson<{ success: boolean; report: ApplicationIntegrityReport }>('/api/integrity/verify', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getApplicationReceipts: () =>
    fetchJson<{ success: boolean; receipts: ApplicationReceipt[] }>('/api/receipts'),

  getApplicationReceiptById: (id: string) =>
    fetchJson<{ success: boolean; receipt: ApplicationReceipt }>(`/api/receipts/${id}`),

  recordCareerOutcome: (outcome: {
    applicationId?: string;
    company: string;
    role: string;
    outcomeType: string;
    outcomeSource?: string;
    notes?: string;
  }) =>
    fetchJson<{ success: boolean; outcome: CareerOutcomeItem }>('/api/career-twin/outcomes', {
      method: 'POST',
      body: JSON.stringify(outcome),
    }),

  getCareerOutcomes: () =>
    fetchJson<{ success: boolean; outcomes: CareerOutcomeItem[] }>('/api/career-twin/outcomes'),

  getCareerTwinInsights: () =>
    fetchJson<{
      success: boolean;
      insights: {
        recurringSkillGaps: Array<{ skill: string; frequency: number }>;
        conversionStats: { applied: number; interview: number; offer: number; rejected: number };
        recommendations: string[];
      };
    }>('/api/career-twin/insights'),
};
