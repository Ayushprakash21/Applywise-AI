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
} from '../types/index.ts';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    let errMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.error) errMsg = errData.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Profile
  getProfile: () => fetchJson<{ success: boolean; profile: UserProfile }>('/api/profile'),
  updateProfile: (profile: Partial<UserProfile>) =>
    fetchJson<{ success: boolean; profile: UserProfile }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),

  // Preferences
  getPreferences: () => fetchJson<{ success: boolean; preferences: CareerPreferences }>('/api/preferences'),
  updatePreferences: (preferences: Partial<CareerPreferences>) =>
    fetchJson<{ success: boolean; preferences: CareerPreferences }>('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }),

  // Settings & Emergency Stop
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

  // Vacancies
  getVacancies: () => fetchJson<{ success: boolean; vacancies: JobVacancy[] }>('/api/vacancies'),
  searchJobs: (query?: string, source?: string) =>
    fetchJson<{
      success: boolean;
      totalDiscovered: number;
      newAdded: number;
      totalStored: number;
      vacancies: JobVacancy[];
      errors: string[];
    }>('/api/jobs/search', {
      method: 'POST',
      body: JSON.stringify({ query, source }),
    }),
  manualIngestJob: (jobData: Partial<JobVacancy> & { salaryRaw?: string }) =>
    fetchJson<{ success: boolean; vacancy: JobVacancy }>('/api/jobs/manual', {
      method: 'POST',
      body: JSON.stringify(jobData),
    }),
  recheckVacancy: (id: string) =>
    fetchJson<{ success: boolean; vacancy: JobVacancy }>(`/api/vacancies/${id}/recheck`, {
      method: 'POST',
    }),

  // Applications
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
  submitApplication: (id: string) =>
    fetchJson<{ success: boolean; application: ApplicationRecord }>(`/api/applications/${id}/submit`, {
      method: 'POST',
    }),

  // AI Resume & Tailoring
  parseResume: (resumeText: string) =>
    fetchJson<{ success: boolean; profile: UserProfile }>('/api/ai/parse-resume', {
      method: 'POST',
      body: JSON.stringify({ resumeText }),
    }),
  tailorResume: (opts: { applicationId?: string; vacancyId?: string }) =>
    fetchJson<{
      success: boolean;
      tailoredResume: TailoredResumeContent;
      coverLetter: string;
      audit: { passed: boolean; score: number; issues: string[] };
    }>('/api/ai/tailor-resume', {
      method: 'POST',
      body: JSON.stringify(opts),
    }),

  // Scheduler
  triggerScheduler: () =>
    fetchJson<{ success: boolean; message: string; lastRun: string; newAdded?: number }>('/api/scheduler/trigger', {
      method: 'POST',
    }),

  // Notifications & Audit Logs
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

  // Integrations & Analytics
  getIntegrations: () => fetchJson<{ success: boolean; integrations: SourceIntegrationStatus[] }>('/api/integrations'),
  getAnalytics: () =>
    fetchJson<{
      success: boolean;
      analytics: {
        totalDiscovered: number;
        highMatchCount: number;
        applicationsCount: number;
        statusCounts: Record<string, number>;
        sourceCounts: Record<string, number>;
        truthfulnessAuditRate: number;
        emergencyStop: boolean;
        mode: string;
      };
    }>('/api/reports/analytics'),

  // System
  resetDemoDatabase: () => fetchJson<{ success: boolean; message: string }>('/api/system/reset-demo', { method: 'POST' }),
};
