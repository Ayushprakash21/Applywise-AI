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
  ApplicationActivityEvent,
  FounderProfile,
  OpportunitySignal,
  InterviewMockSession,
  InterviewEvaluationOutput,
  RecruiterReviewAudit,
  CareerTrajectory,
  ResumeDocument,
  ResumeExtractionRun,
  ResumeExtractionVersion,
  ResumeExtractionEvent,
  AdminResumesResponse,
  ExtractedJobData,
  UserImportedJobRecord,
  JobImportExtractResponse,
  JobImportSaveRequest,
  JobImportSaveResponse,
  MembershipGrant,
  MembershipSummaryMetrics,
  AdminProvisionUserRequest,
  AdminProvisionUserResponse,
  AdminAssignMembershipRequest,
  AdminExtendMembershipRequest,
  AdminUpdateMembershipStatusRequest,
  MembershipHistoryItem,
  CompanyDirectoryItem,
  GlobalJobSource,
  CanonicalLiveJob,
  ExplainableMatchBreakdown,
  GeographicCoverageSummary,
  GlobalSourceIntelligenceSummary,
  HrContactWithRelevance,
  HrDiscoverySourceMeta,
  EmailAccountSummary,
  OutreachTemplateType,
  OutreachEmailTone,
  OutreachMessage,
  OutreachEvent,
  OutreachCampaign,
  OutreachCampaignContact,
  DoNotContactEntry,
  ContactDiscoveryRun,
  HrAdminDiagnosticsSummary,
  HrContactDiscoveryRunRecord,
  OutreachOverviewMetrics,
  ResumeAttachmentOption
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
  photoUrl?: string | null;
  avatarUrl?: string | null;
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

  // --- ADMIN USER PROVISIONING & MEMBERSHIP MANAGEMENT ---
  getAdminMemberships: (params?: {
    search?: string;
    plan?: string;
    status?: string;
    validityType?: string;
    lifetimeOnly?: boolean;
    expiringWithin30Days?: boolean;
    grantedBy?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.plan && params.plan !== 'all') q.set('plan', params.plan);
    if (params?.status && params.status !== 'all') q.set('status', params.status);
    if (params?.validityType && params.validityType !== 'all') q.set('validityType', params.validityType);
    if (params?.lifetimeOnly) q.set('lifetimeOnly', 'true');
    if (params?.expiringWithin30Days) q.set('expiringWithin30Days', 'true');
    if (params?.grantedBy && params.grantedBy !== 'all') q.set('grantedBy', params.grantedBy);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJson<{
      success: boolean;
      items: Array<{
        userId: string;
        userName: string;
        userEmail: string;
        currentPlan: 'free' | 'pro' | 'black';
        membershipStatus: any;
        activationDate: string;
        expiryDate: string | null;
        remainingValidity: string;
        remainingDays: number | null;
        provisionedBy: string;
        lastUpdated: string;
        grantId?: string;
        membershipSource: any;
        validityType: any;
        hasPaidSubscription: boolean;
        notes?: string;
      }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/admin/memberships${qs}`);
  },

  getAdminMembershipSummary: () =>
    fetchJson<{ success: boolean; summary: MembershipSummaryMetrics }>('/api/admin/memberships/summary'),

  provisionAdminUser: (data: AdminProvisionUserRequest) =>
    fetchJson<AdminProvisionUserResponse>('/api/admin/memberships/provision', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  assignAdminMembership: (userId: string, data: AdminAssignMembershipRequest) =>
    fetchJson<{ success: boolean; grant: MembershipGrant; message: string }>(`/api/admin/memberships/${userId}/assign`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  extendAdminMembership: (grantId: string, data: AdminExtendMembershipRequest) =>
    fetchJson<{ success: boolean; grant: MembershipGrant; message: string }>(`/api/admin/memberships/${grantId}/extend`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateAdminMembershipStatus: (grantId: string, data: AdminUpdateMembershipStatusRequest) =>
    fetchJson<{ success: boolean; grant: MembershipGrant; message: string }>(`/api/admin/memberships/${grantId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getAdminMembershipHistory: (userId: string) =>
    fetchJson<{
      success: boolean;
      grants: any[];
      auditLogs: MembershipHistoryItem[];
    }>(`/api/admin/memberships/${userId}/history`),

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

  getGlobalSourceIntelligence: () =>
    fetchJson<{
      success: boolean;
      summary: GlobalSourceIntelligenceSummary;
      sources: GlobalJobSource[];
      geographicCoverage: GeographicCoverageSummary;
    }>('/api/admin/sources/intelligence'),

  getCompanyDirectory: (params?: { query?: string; country?: string; detectedAts?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.query) q.set('query', params.query);
    if (params?.country) q.set('country', params.country);
    if (params?.detectedAts) q.set('detectedAts', params.detectedAts);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJson<{ success: boolean; companies: CompanyDirectoryItem[] }>(`/api/admin/sources/companies${qs}`);
  },

  addCompanyDirectory: (item: Partial<CompanyDirectoryItem>) =>
    fetchJson<{ success: boolean; company: CompanyDirectoryItem }>('/api/admin/sources/companies', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  getGeographicCoverage: () =>
    fetchJson<{ success: boolean; coverage: GeographicCoverageSummary }>('/api/admin/sources/coverage'),

  triggerSourceSync: (sourceId?: string) =>
    fetchJson<{ success: boolean; message: string; results?: any }>('/api/admin/sources/sync', {
      method: 'POST',
      body: JSON.stringify({ sourceId }),
    }),

  getCandidateJobRecommendations: (limit = 20) =>
    fetchJson<{
      success: boolean;
      recommendations: Array<{ vacancy: JobVacancy; matchBreakdown: ExplainableMatchBreakdown }>;
    }>(`/api/opportunity-radar/recommendations?limit=${limit}`),

  refreshCandidateJobRecommendations: () =>
    fetchJson<{
      success: boolean;
      recommendations: Array<{ vacancy: JobVacancy; matchBreakdown: ExplainableMatchBreakdown }>;
    }>('/api/opportunity-radar/refresh-recommendations', { method: 'POST' }),

  getGlobalLiveJobs: (params?: {
    query?: string;
    country?: string;
    location?: string;
    workArrangement?: string;
    sourceType?: string;
    limit?: number;
    page?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.query) q.set('query', params.query);
    if (params?.country) q.set('country', params.country);
    if (params?.location) q.set('location', params.location);
    if (params?.workArrangement) q.set('workArrangement', params.workArrangement);
    if (params?.sourceType) q.set('sourceType', params.sourceType);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.page) q.set('page', String(params.page));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJson<{
      success: boolean;
      jobs: CanonicalLiveJob[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/opportunity-radar/live-jobs${qs}`);
  },

  // --- ADMIN RESUME MANAGEMENT ---
  getAdminResumes: (params?: { page?: number; limit?: number; search?: string; status?: string; format?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.format) q.set('format', params.format);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJson<AdminResumesResponse>(`/api/admin/resumes${qs}`);
  },

  getAdminResumeById: (resumeId: string) =>
    fetchJson<{
      success: boolean;
      resume: ResumeDocument;
      runs: ResumeExtractionRun[];
      versions: ResumeExtractionVersion[];
      candidateFacts: any[];
    }>(`/api/admin/resumes/${resumeId}`),

  getAdminResumeText: (resumeId: string) =>
    fetchJson<{
      success: boolean;
      resumeId: string;
      fileName: string;
      fileType: string;
      pageCount: number;
      extractedText: string;
      characterCount: number;
    }>(`/api/admin/resumes/${resumeId}/text`),

  getAdminResumeExtraction: (resumeId: string) =>
    fetchJson<{
      success: boolean;
      resumeId: string;
      latestRun: ResumeExtractionRun | null;
      extractionStatus: string;
      extractionMethod: string;
      parserModel?: string;
      warnings?: string[];
      candidateFacts: any[];
    }>(`/api/admin/resumes/${resumeId}/extraction`),

  reprocessAdminResume: (resumeId: string) =>
    fetchJson<{
      success: boolean;
      runId: string;
      versionId: string;
      diffSummary: any;
      status: string;
      extractionMethod: string;
      parserModel?: string;
      warnings?: string[];
    }>(`/api/admin/resumes/${resumeId}/reprocess`, {
      method: 'POST',
    }),

  getAdminResumeHistory: (resumeId: string) =>
    fetchJson<{
      success: boolean;
      resumeId: string;
      runs: ResumeExtractionRun[];
      versions: ResumeExtractionVersion[];
      events: ResumeExtractionEvent[];
    }>(`/api/admin/resumes/${resumeId}/history`),

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

  // --- UNIVERSAL JOB IMPORT & URL-BASED OPPORTUNITY EXTRACTION ---
  extractJobFromUrl: (url: string) =>
    fetchJson<JobImportExtractResponse>('/api/jobs/import/extract', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  parseJobFromText: (text: string, title?: string, company?: string, url?: string) =>
    fetchJson<{ success: boolean; extractedData: ExtractedJobData }>('/api/jobs/import/parse-text', {
      method: 'POST',
      body: JSON.stringify({ text, title, company, url }),
    }),

  saveImportedJob: (data: JobImportSaveRequest) =>
    fetchJson<JobImportSaveResponse>('/api/jobs/import/save', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getImportedJobs: () =>
    fetchJson<{ success: boolean; importedJobs: UserImportedJobRecord[] }>('/api/jobs/imported'),

  deleteImportedJob: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/jobs/imported/${id}`, {
      method: 'DELETE',
    }),

  archiveImportedJob: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/jobs/imported/${id}/archive`, {
      method: 'POST',
    }),

  moveImportedJobToApplication: (id: string) =>
    fetchJson<{ success: boolean; message: string; applicationId: string; application: ApplicationRecord }>(`/api/jobs/imported/${id}/to-application`, {
      method: 'POST',
    }),

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
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      let errMsg = `Upload failed: ${res.status}`;
      let errCode: string | undefined;
      try {
        const data = await res.json() as any;
        if (data?.error) errMsg = data.error;
        if (data?.code) errCode = data.code;
      } catch {
        // ignore
      }
      const err = new Error(errMsg) as Error & { code?: string };
      if (errCode) err.code = errCode;
      throw err;
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

  // --- FOUNDER PROFILE & WEBSITE MANAGEMENT ---
  getFounderProfile: () =>
    fetchJson<{ success: boolean; profile: FounderProfile }>('/api/founder-profile'),

  getAdminFounderProfile: () =>
    fetchJson<{ success: boolean; published: FounderProfile; draft: FounderProfile; isDraftModified: boolean }>('/api/admin/founder-profile'),

  updateFounderProfileDraft: (draft: Partial<FounderProfile>) =>
    fetchJson<{ success: boolean; draft: FounderProfile }>('/api/admin/founder-profile/draft', {
      method: 'PUT',
      body: JSON.stringify(draft),
    }),

  publishFounderProfile: () =>
    fetchJson<{ success: boolean; profile: FounderProfile }>('/api/admin/founder-profile/publish', {
      method: 'POST',
    }),

  revertFounderProfileDraft: () =>
    fetchJson<{ success: boolean; draft: FounderProfile }>('/api/admin/founder-profile/revert', {
      method: 'POST',
    }),

  uploadFounderPhoto: async (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const token = localStorage.getItem('applyvise_token') || localStorage.getItem('applywise_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    const res = await fetch('/api/admin/founder-profile/photo', {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' })) as { error?: string };
      throw new Error(err?.error || 'Failed to upload photo');
    }
    return res.json() as Promise<{ success: boolean; photoUrl: string; assetId: string; draft: FounderProfile }>;
  },

  removeFounderPhoto: () =>
    fetchJson<{ success: boolean; message: string }>('/api/admin/founder-profile/photo', {
      method: 'DELETE',
    }),

  // --- SIX-PILLAR CAREER OPERATIONS ---

  /** Canonical: GET /api/opportunity-radar/signals */
  getOpportunitySignals: () =>
    fetchJson<{ success: boolean; signals: OpportunitySignal[] }>('/api/opportunity-radar/signals'),

  /** @deprecated Compatibility alias using legacy /api/opportunity-signals path */
  getOpportunitySignalsLegacy: () =>
    fetchJson<{ success: boolean; signals: OpportunitySignal[] }>('/api/opportunity-signals'),

  /** Canonical: GET /api/interview-studio/sessions */
  getMockInterviewSessions: (jobId?: string) =>
    fetchJson<{ success: boolean; sessions: InterviewMockSession[] }>(jobId ? `/api/interview-studio/sessions?jobId=${jobId}` : '/api/interview-studio/sessions'),

  /** Canonical: POST /api/interview-studio/sessions */
  saveMockInterviewSession: (session: Partial<InterviewMockSession>) =>
    fetchJson<{ success: boolean; session: InterviewMockSession }>('/api/interview-studio/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    }),

  /** Canonical: POST /api/interview-studio/evaluate */
  evaluateInterviewAnswer: (payload: {
    questionId?: string;
    question: string;
    answer: string;
    roleTitle?: string;
    companyName?: string;
    category?: string;
    context?: string;
    expectedPoints?: string[];
  }) =>
    fetchJson<{ success: boolean; evaluation?: InterviewEvaluationOutput; error?: string; noSyntheticScores?: boolean }>('/api/interview-studio/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** @deprecated Compatibility alias using legacy /api/interviews/mock-sessions/evaluate path */
  evaluateInterviewAnswerLegacy: (payload: {
    questionId?: string;
    question: string;
    answer: string;
    roleTitle?: string;
    companyName?: string;
    category?: string;
    context?: string;
    expectedPoints?: string[];
  }) =>
    fetchJson<{ success: boolean; evaluation?: InterviewEvaluationOutput; error?: string; noSyntheticScores?: boolean }>('/api/interviews/mock-sessions/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Canonical: GET /api/applications/:id/recruiter-review */
  getRecruiterReviewAudit: (applicationId: string) =>
    fetchJson<{ success: boolean; audit: RecruiterReviewAudit }>(`/api/applications/${applicationId}/recruiter-review`),

  /** Canonical: POST /api/applications/:id/recruiter-review */
  generateRecruiterReview: (applicationId: string) =>
    fetchJson<{ success: boolean; audit: RecruiterReviewAudit }>(`/api/applications/${applicationId}/recruiter-review`, {
      method: 'POST',
    }),

  /** Canonical: GET /api/career-atlas/trajectories */
  getCareerTrajectories: () =>
    fetchJson<{ success: boolean; trajectories: CareerTrajectory[] }>('/api/career-atlas/trajectories'),

  /** Canonical: POST /api/career-atlas/trajectories */
  saveCareerTrajectory: (trajectory: Partial<CareerTrajectory>) =>
    fetchJson<{ success: boolean; trajectory: CareerTrajectory }>('/api/career-atlas/trajectories', {
      method: 'POST',
      body: JSON.stringify(trajectory),
    }),

  // --- AI HR OUTREACH & DIRECT APPLICATION AUTOMATION ---
  getHrOutreachOverview: () =>
    fetchJson<{
      success: boolean;
      overview: OutreachOverviewMetrics;
      recentRuns: ContactDiscoveryRun[];
      templates: OutreachTemplateType[];
      tones: OutreachEmailTone[];
    }>('/api/hr-outreach/overview'),

  getHrDiscoverySources: () =>
    fetchJson<{ success: boolean; sources: HrDiscoverySourceMeta[] }>('/api/hr-outreach/sources'),

  getHrContacts: (params?: {
    search?: string;
    country?: string;
    company?: string;
    designation?: string;
    contactType?: string;
    verificationStatus?: string;
    sourceType?: string;
    jobId?: string;
    includeArchived?: boolean;
    sortBy?: 'relevance' | 'confidence';
    limit?: number;
    offset?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
      });
    }
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return fetchJson<{ success: boolean; contacts: HrContactWithRelevance[]; total: number }>(`/api/hr-outreach/contacts${qs}`);
  },

  getHrCompanies: (params?: { search?: string; onlyWithContacts?: boolean; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.onlyWithContacts) sp.set('onlyWithContacts', 'true');
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.offset) sp.set('offset', String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return fetchJson<{
      success: boolean;
      companies: Array<{
        companyId?: string;
        companyName: string;
        companyWebsite?: string;
        careersUrl?: string;
        atsType?: string;
        country: string;
        activeJobsCount: number;
        contactsCount: number;
        sourceConfirmedCount: number;
        verifiedCount: number;
        contacts: HrContactWithRelevance[];
      }>;
      total: number;
    }>(`/api/hr-outreach/companies${qs}`);
  },

  getHrJobsWithContacts: (params?: { search?: string; onlyWithContacts?: boolean; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set('search', params.search);
    if (params?.onlyWithContacts) sp.set('onlyWithContacts', 'true');
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.offset) sp.set('offset', String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return fetchJson<{
      success: boolean;
      jobs: Array<{
        id: string;
        title: string;
        company: string;
        country: string;
        location: string;
        url: string;
        source: string;
        retrievedAt: string;
        discoveryStatus: string;
        diagnosticCategory?: string;
        diagnosticReason?: string;
        contacts: Array<HrContactWithRelevance & { linkType?: string }>;
      }>;
      summary: {
        totalActiveJobs: number;
        jobsWithContacts: number;
        jobCoveragePercent: number;
      };
    }>(`/api/hr-outreach/jobs-with-contacts${qs}`);
  },

  submitManualHrContact: (payload: {
    companyName: string;
    companyWebsite?: string;
    contactName?: string;
    designation?: string;
    email: string;
    country?: string;
    jobId?: string;
    sourceUrl?: string;
    evidence?: string;
  }) =>
    fetchJson<{ success: boolean; contact: HrContactWithRelevance; created: boolean; verification: any }>(
      '/api/hr-outreach/contacts/manual',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getHrContactDetail: (id: string, jobId?: string) =>
    fetchJson<{ success: boolean; contact: HrContactWithRelevance }>(
      jobId ? `/api/hr-outreach/contacts/${encodeURIComponent(id)}?jobId=${encodeURIComponent(jobId)}` : `/api/hr-outreach/contacts/${encodeURIComponent(id)}`
    ),

  discoverHrContacts: (payload: { companyName?: string; companyWebsite?: string; jobId?: string; forceRefresh?: boolean }) =>
    fetchJson<{
      success: boolean;
      run: ContactDiscoveryRun;
      discoveredContacts: HrContactWithRelevance[];
      unavailableReason?: string;
      sourcesChecked: Array<{ source: string; status: string; found: number; note?: string }>;
    }>('/api/hr-outreach/contacts/discover', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyHrContact: (id: string) =>
    fetchJson<{ success: boolean; contact: HrContactWithRelevance; verification: any }>(`/api/hr-outreach/contacts/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
    }),

  updateHrContactStatus: (id: string, status: 'active' | 'archived' | 'suppressed', markContacted = false) =>
    fetchJson<{ success: boolean; contact: HrContactWithRelevance }>(`/api/hr-outreach/contacts/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, markContacted }),
    }),

  generateHrEmail: (
    contactId: string,
    payload: {
      jobId?: string;
      templateType: OutreachTemplateType;
      tone: OutreachEmailTone;
      customNotes?: string;
    }
  ) =>
    fetchJson<{
      success: boolean;
      generated: {
        subject: string;
        bodyText: string;
        usedGemini: boolean;
        groundedQualifications: string[];
        missingDataNotices: string[];
        integrityAudit: { passed: boolean; warnings: string[] };
      };
    }>(`/api/hr-outreach/contacts/${encodeURIComponent(contactId)}/generate-email`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getHrOutreachResumes: () =>
    fetchJson<{ success: boolean; resumes: ResumeAttachmentOption[] }>('/api/hr-outreach/resumes'),

  fetchHrOutreachResumePreviewBlobUrl: async (resumeId: string): Promise<{ url: string; mimeType: string }> => {
    const token = localStorage.getItem('applyvise_token') || localStorage.getItem('applywise_token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/hr-outreach/resumes/${encodeURIComponent(resumeId)}/preview`, {
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Preview failed (${res.status})`);
    }
    const blob = await res.blob();
    return {
      url: URL.createObjectURL(blob),
      mimeType: res.headers.get('Content-Type') || blob.type,
    };
  },

  getHrEmailAccounts: () =>
    fetchJson<{
      success: boolean;
      accounts: EmailAccountSummary[];
      oauthConfigured: { gmail: boolean; outlook: boolean };
    }>('/api/hr-outreach/email-accounts'),

  connectGoogleEmailAccount: () =>
    fetchJson<{ success: boolean; authorizationUrl: string; state: string }>('/api/hr-outreach/email-accounts/google/connect', {
      method: 'POST',
    }),

  connectMicrosoftEmailAccount: () =>
    fetchJson<{ success: boolean; authorizationUrl: string; state: string }>('/api/hr-outreach/email-accounts/microsoft/connect', {
      method: 'POST',
    }),

  disconnectEmailAccount: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/hr-outreach/email-accounts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  previewOutreachMessage: (payload: {
    contactId: string;
    campaignId?: string;
    emailAccountId?: string;
    jobId?: string;
    templateType: OutreachTemplateType;
    tone: OutreachEmailTone;
    subject: string;
    bodyText: string;
    resumeDocumentId?: string;
    saveDraft?: boolean;
    draftId?: string;
  }) =>
    fetchJson<{
      success: boolean;
      readyToSend: boolean;
      warnings: string[];
      attachment?: { fileName: string; mimeType: string; sizeBytes: number };
      message: OutreachMessage | null;
    }>('/api/hr-outreach/messages/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendApprovedOutreachMessage: (payload: {
    contactId: string;
    campaignId?: string;
    emailAccountId: string;
    jobId?: string;
    templateType: OutreachTemplateType;
    tone: OutreachEmailTone;
    subject: string;
    bodyText: string;
    resumeDocumentId?: string;
    resumeConfirmed?: boolean;
    explicitApproval: boolean;
    idempotencyKey?: string;
    draftId?: string;
  }) =>
    fetchJson<{ success: boolean; message: OutreachMessage; notice?: string }>('/api/hr-outreach/messages/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getOutreachMessages: (status?: string) =>
    fetchJson<{ success: boolean; messages: OutreachMessage[] }>(
      status && status !== 'all' ? `/api/hr-outreach/messages?status=${encodeURIComponent(status)}` : '/api/hr-outreach/messages'
    ),

  getOutreachMessageDetail: (id: string) =>
    fetchJson<{ success: boolean; message: OutreachMessage; events: OutreachEvent[] }>(`/api/hr-outreach/messages/${encodeURIComponent(id)}`),

  getOutreachReplies: (sync = false) =>
    fetchJson<{ success: boolean; items: OutreachMessage[] }>(sync ? '/api/hr-outreach/replies?sync=true' : '/api/hr-outreach/replies'),

  getOutreachCampaigns: () =>
    fetchJson<{ success: boolean; campaigns: OutreachCampaign[] }>('/api/hr-outreach/campaigns'),

  createOutreachCampaign: (payload: { name: string; targetCountry?: string; targetRoles?: string[]; dailyLimit?: number; notes?: string }) =>
    fetchJson<{ success: boolean; campaign: OutreachCampaign }>('/api/hr-outreach/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getOutreachCampaignDetail: (id: string) =>
    fetchJson<{ success: boolean; campaign: OutreachCampaign; contacts: OutreachCampaignContact[] }>(`/api/hr-outreach/campaigns/${encodeURIComponent(id)}`),

  addContactsToOutreachCampaign: (campaignId: string, contactIds: string[], jobId?: string) =>
    fetchJson<{ success: boolean; added: number; campaign: OutreachCampaign }>(`/api/hr-outreach/campaigns/${encodeURIComponent(campaignId)}/contacts`, {
      method: 'POST',
      body: JSON.stringify({ contactIds, jobId }),
    }),

  getDoNotContactList: () =>
    fetchJson<{ success: boolean; entries: DoNotContactEntry[] }>('/api/hr-outreach/do-not-contact'),

  addDoNotContactEntry: (email: string, reason?: string) =>
    fetchJson<{ success: boolean; entry: DoNotContactEntry }>('/api/hr-outreach/do-not-contact', {
      method: 'POST',
      body: JSON.stringify({ email, reason }),
    }),

  removeDoNotContactEntry: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/hr-outreach/do-not-contact/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // --- ADMIN HR DISCOVERY DIAGNOSTICS ---
  getAdminHrDiscoveryDiagnostics: () =>
    fetchJson<{ success: boolean; diagnostics: HrAdminDiagnosticsSummary }>('/api/admin/hr-discovery/diagnostics'),

  runAdminHrDiscoveryBatch: (payload?: { batchLimit?: number; fetchBudget?: number; forceRefresh?: boolean }) =>
    fetchJson<{
      success: boolean;
      run: HrContactDiscoveryRunRecord;
      discoveredContacts: HrContactWithRelevance[];
      diagnostics: HrAdminDiagnosticsSummary;
    }>('/api/admin/hr-discovery/run', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  retryFailedHrDiscovery: () =>
    fetchJson<{
      success: boolean;
      requeuedCount: number;
      run: HrContactDiscoveryRunRecord;
      diagnostics: HrAdminDiagnosticsSummary;
    }>('/api/admin/hr-discovery/retry-failed', {
      method: 'POST',
    }),

  reprocessHrDiscoveryJob: (jobId: string) =>
    fetchJson<{
      success: boolean;
      run: HrContactDiscoveryRunRecord;
      discoveredContacts: HrContactWithRelevance[];
      diagnostics: HrAdminDiagnosticsSummary;
    }>(`/api/admin/hr-discovery/reprocess-job/${encodeURIComponent(jobId)}`, {
      method: 'POST',
    }),

  revalidateStaleHrContacts: (limit = 30) =>
    fetchJson<{
      success: boolean;
      result: { checked: number; stillValid: number; markedStaleOrFailed: number };
      diagnostics: HrAdminDiagnosticsSummary;
    }>('/api/admin/hr-discovery/revalidate-stale', {
      method: 'POST',
      body: JSON.stringify({ limit }),
    }),

};
