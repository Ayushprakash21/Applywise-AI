import React, { useState, useEffect } from 'react';
import { api } from './services/api.ts';
import {
  UserProfile,
  CareerPreferences,
  AutomationSettings,
  JobVacancy,
  ApplicationRecord,
  AuditLogEntry,
  NotificationItem,
  SourceIntegrationStatus,
  ApplicationStatus
} from './types/index.ts';
import { Header } from './components/Header.tsx';
import { OverviewTab } from './components/OverviewTab.tsx';
import { JobDiscoveryTab } from './components/JobDiscoveryTab.tsx';
import { ProfileTab } from './components/ProfileTab.tsx';
import { ResumeStudioTab } from './components/ResumeStudioTab.tsx';
import { QueueTab } from './components/QueueTab.tsx';
import { TrackerTab } from './components/TrackerTab.tsx';
import { PreferencesTab } from './components/PreferencesTab.tsx';
import { IntegrationsTab } from './components/IntegrationsTab.tsx';
import { AutomationSettingsTab } from './components/AutomationSettingsTab.tsx';
import { ReportsTab } from './components/ReportsTab.tsx';
import { AuditLogsTab } from './components/AuditLogsTab.tsx';
import { JobDetailModal } from './components/JobDetailModal.tsx';
import { ApplicationDetailModal } from './components/ApplicationDetailModal.tsx';
import { ManualJobModal } from './components/ManualJobModal.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<CareerPreferences | null>(null);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [integrations, setIntegrations] = useState<SourceIntegrationStatus[]>([]);

  // Modals & Selection
  const [selectedVacancy, setSelectedVacancy] = useState<JobVacancy | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationRecord | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingIntegrations, setIsTestingIntegrations] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllData = async () => {
    try {
      const [profData, prefData, settData, vacData, appData, logData, notifData, intData] =
        await Promise.all([
          api.getProfile(),
          api.getPreferences(),
          api.getSettings(),
          api.getVacancies(),
          api.getApplications(),
          api.getAuditLogs(),
          api.getNotifications(),
          api.getIntegrations(),
        ]);

      setProfile(profData.profile);
      setPreferences(prefData.preferences);
      setSettings(settData.settings);
      setVacancies(vacData.vacancies);
      setApplications(appData.applications);
      setAuditLogs(logData.logs);
      setNotifications(notifData.notifications);
      setIntegrations(intData.integrations);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handlers
  const handleToggleEmergencyStop = async () => {
    try {
      const resp = await api.toggleEmergencyStop();
      setSettings(resp.settings);
      showToast(resp.emergencyStop ? '🚨 Emergency Stop engaged' : '✅ Emergency Stop cleared');
      const [logs, notifs] = await Promise.all([api.getAuditLogs(), api.getNotifications()]);
      setAuditLogs(logs.logs);
      setNotifications(notifs.notifications);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Action failed: ${msg}`);
    }
  };

  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    try {
      const resp = await api.updateProfile(updated);
      setProfile(resp.profile);
      showToast('Master profile updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Error: ${msg}`);
    }
  };

  const handleUpdatePreferences = async (updated: Partial<CareerPreferences>) => {
    try {
      const resp = await api.updatePreferences(updated);
      setPreferences(resp.preferences);
      const vacs = await api.getVacancies();
      setVacancies(vacs.vacancies);
      showToast('Career preferences saved & matches recalculated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Error: ${msg}`);
    }
  };

  const handleUpdateSettings = async (updated: Partial<AutomationSettings>) => {
    try {
      const resp = await api.updateSettings(updated);
      setSettings(resp.settings);
      showToast('Automation settings saved');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Error: ${msg}`);
    }
  };

  const handleSearchSources = async (query?: string, source?: string) => {
    setIsSearching(true);
    try {
      const resp = await api.searchJobs(query, source);
      setVacancies(resp.vacancies);
      const [logs, notifs] = await Promise.all([api.getAuditLogs(), api.getNotifications()]);
      setAuditLogs(logs.logs);
      setNotifications(notifs.notifications);
      showToast(`Discovered ${resp.totalDiscovered} jobs (+${resp.newAdded} newly added)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Discovery error: ${msg}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePrepareApplication = async (vacancyId: string) => {
    try {
      const resp = await api.createFromVacancy(vacancyId);
      const [apps, logs, notifs] = await Promise.all([
        api.getApplications(),
        api.getAuditLogs(),
        api.getNotifications(),
      ]);
      setApplications(apps.applications);
      setAuditLogs(logs.logs);
      setNotifications(notifs.notifications);
      showToast(`Application prepared for ${resp.application.company} (${resp.application.status})`);
      setSelectedApplication(resp.application);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg);
    }
  };

  const handleRecheckVacancy = async (id: string) => {
    try {
      const resp = await api.recheckVacancy(id);
      setVacancies(prev => prev.map(v => (v.id === id ? resp.vacancy : v)));
      showToast(`Vacancy status verified: ${resp.vacancy.isActive ? 'Active' : 'Unreachable'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Recheck error: ${msg}`);
    }
  };

  const handleTransitionStatus = async (id: string, newStatus: ApplicationStatus, note?: string) => {
    try {
      const resp = await api.transitionStatus(id, newStatus, note);
      setApplications(prev => prev.map(a => (a.id === id ? resp.application : a)));
      if (selectedApplication?.id === id) setSelectedApplication(resp.application);
      showToast(`Status updated to ${newStatus}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Transition error: ${msg}`);
    }
  };

  const handleApproveApplication = async (id: string) => {
    try {
      const resp = await api.approveApplication(id);
      setApplications(prev => prev.map(a => (a.id === id ? resp.application : a)));
      if (selectedApplication?.id === id) setSelectedApplication(resp.application);
      showToast(`Application for ${resp.application.company} approved for submission`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg);
    }
  };

  const handleSubmitApplication = async (id: string) => {
    setIsSubmitting(true);
    try {
      const resp = await api.submitApplication(id);
      setApplications(prev => prev.map(a => (a.id === id ? resp.application : a)));
      if (selectedApplication?.id === id) setSelectedApplication(resp.application);
      const [logs, notifs] = await Promise.all([api.getAuditLogs(), api.getNotifications()]);
      setAuditLogs(logs.logs);
      setNotifications(notifs.notifications);
      showToast(`Application submitted! Receipt #${resp.application.submissionEvidence?.confirmationNumber}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTailorResume = async (opts: { applicationId?: string; vacancyId?: string }) => {
    setIsTailoring(true);
    try {
      const resp = await api.tailorResume(opts);
      const apps = await api.getApplications();
      setApplications(apps.applications);
      showToast(`Resume re-optimized with Gemini! Fact score: ${resp.audit.score}/100`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Tailoring error: ${msg}`);
    } finally {
      setIsTailoring(false);
    }
  };

  const handleParseResumeText = async (resumeText: string) => {
    setIsParsingResume(true);
    try {
      const resp = await api.parseResume(resumeText);
      setProfile(resp.profile);
      showToast('Resume parsed successfully! Master profile updated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Parse error: ${msg}`);
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleManualIngestJob = async (jobData: any) => {
    try {
      const resp = await api.manualIngestJob(jobData);
      setVacancies(prev => [resp.vacancy, ...prev]);
      showToast(`Custom vacancy added: ${resp.vacancy.title} at ${resp.vacancy.company}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Ingest error: ${msg}`);
    }
  };

  const handleTriggerScheduler = async () => {
    try {
      const resp = await api.triggerScheduler();
      const [vacs, logs, notifs] = await Promise.all([
        api.getVacancies(),
        api.getAuditLogs(),
        api.getNotifications(),
      ]);
      setVacancies(vacs.vacancies);
      setAuditLogs(logs.logs);
      setNotifications(notifs.notifications);
      showToast(resp.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Scheduler error: ${msg}`);
    }
  };

  const handleTestIntegrations = async () => {
    setIsTestingIntegrations(true);
    try {
      await api.searchJobs(undefined, 'all');
      const [ints, logs] = await Promise.all([api.getIntegrations(), api.getAuditLogs()]);
      setIntegrations(ints.integrations);
      setAuditLogs(logs.logs);
      showToast('All source adapters checked & active');
    } finally {
      setIsTestingIntegrations(false);
    }
  };

  const handleResetDemo = async () => {
    await api.resetDemoDatabase();
    await loadAllData();
    showToast('Database reset to fresh enterprise seed state');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs font-mono text-slate-400">Initializing Orion Career Agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 rounded-xl border border-indigo-500/50 bg-slate-900/95 px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        onToggleEmergencyStop={handleToggleEmergencyStop}
        notifications={notifications}
        onMarkNotificationRead={id => api.markNotificationRead(id).then(r => setNotifications(r.notifications))}
        onMarkAllNotificationsRead={() => api.markAllNotificationsRead().then(r => setNotifications(r.notifications))}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === 'overview' && (
          <OverviewTab
            profile={profile}
            preferences={preferences}
            settings={settings}
            vacancies={vacancies}
            applications={applications}
            auditLogs={auditLogs}
            onNavigateTab={setActiveTab}
            onRunDiscovery={() => handleSearchSources()}
            onTriggerScheduler={handleTriggerScheduler}
            isSearching={isSearching}
            onSelectApplication={app => setSelectedApplication(app)}
          />
        )}

        {activeTab === 'discovery' && (
          <JobDiscoveryTab
            vacancies={vacancies}
            preferences={preferences}
            onSearchSources={handleSearchSources}
            onPrepareApplication={handlePrepareApplication}
            onRecheckVacancy={handleRecheckVacancy}
            onOpenManualModal={() => setIsManualModalOpen(true)}
            onSelectVacancy={vac => setSelectedVacancy(vac)}
            isSearching={isSearching}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onParseResumeText={handleParseResumeText}
            isParsingResume={isParsingResume}
          />
        )}

        {activeTab === 'resume_studio' && (
          <ResumeStudioTab
            applications={applications}
            profile={profile}
            onTailorResume={handleTailorResume}
            isTailoring={isTailoring}
          />
        )}

        {activeTab === 'queue' && (
          <QueueTab
            applications={applications}
            settings={settings}
            onApproveApplication={handleApproveApplication}
            onSubmitApplication={handleSubmitApplication}
            onSelectApplication={app => setSelectedApplication(app)}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'tracker' && (
          <TrackerTab
            applications={applications}
            onSelectApplication={app => setSelectedApplication(app)}
            onTransitionStatus={handleTransitionStatus}
          />
        )}

        {activeTab === 'preferences' && (
          <PreferencesTab
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsTab
            integrations={integrations}
            onTestIntegrations={handleTestIntegrations}
            isTesting={isTestingIntegrations}
          />
        )}

        {activeTab === 'settings' && (
          <AutomationSettingsTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onToggleEmergencyStop={handleToggleEmergencyStop}
            onTriggerScheduler={handleTriggerScheduler}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab
            applications={applications}
            vacancies={vacancies}
          />
        )}

        {activeTab === 'audit_logs' && (
          <AuditLogsTab
            auditLogs={auditLogs}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      {/* Modals */}
      <JobDetailModal
        vacancy={selectedVacancy}
        onClose={() => setSelectedVacancy(null)}
        onPrepareApplication={handlePrepareApplication}
        isPreparing={false}
      />

      <ApplicationDetailModal
        application={selectedApplication}
        onClose={() => setSelectedApplication(null)}
        onTransitionStatus={handleTransitionStatus}
        onSubmitApplication={handleSubmitApplication}
        onApproveApplication={handleApproveApplication}
        isSubmitting={isSubmitting}
      />

      <ManualJobModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={handleManualIngestJob}
        isSubmitting={false}
      />
    </div>
  );
}
