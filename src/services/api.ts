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

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('applywise_token');
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
      localStorage.removeItem('applywise_token');
      localStorage.removeItem('applywise_user');
    }
  },

  getMe: () => fetchJson<{ success: boolean; user: AuthUser }>('/api/auth/me'),

  recoverPassword: (email: string) =>
    fetchJson<{ success: boolean; message: string }>('/api/auth/recover-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

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
      errors: string[];
    }>('/api/jobs/search', {
      method: 'POST',
      body: JSON.stringify({ query, country, remoteOnly }),
    }),
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
  uploadResumeFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('applywise_token');
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
    }>;
  },

  parseResumeText: (resumeText: string) =>
    fetchJson<{ success: boolean; profile: UserProfile }>('/api/ai/parse-resume', {
      method: 'POST',
      body: JSON.stringify({ resumeText }),
    }),

  downloadDocxResume: async (applicationId: string, companyName: string) => {
    const token = localStorage.getItem('applywise_token');
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
};
