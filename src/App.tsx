import React, { useState, useEffect } from 'react';
import { api, AuthUser } from './services/api.ts';
import {
  UserProfile,
  CareerPreferences,
  AutomationSettings,
  JobVacancy,
  ApplicationRecord,
  NotificationItem,
} from './types/index.ts';
import { AppHeader } from './components/AppHeader.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthModals } from './components/AuthModals.tsx';
import { ResumeOnboardingModal } from './components/ResumeOnboardingModal.tsx';
import { JobSearchPage } from './components/JobSearchPage.tsx';
import { JobDetailDrawer } from './components/JobDetailDrawer.tsx';
import { ApplicationsPage } from './components/ApplicationsPage.tsx';
import { ProfileAndPreferencesPage } from './components/ProfileAndPreferencesPage.tsx';
import { ResumePreviewModal } from './components/ResumePreviewModal.tsx';
import {
  PrivacyPolicyModal,
  TermsOfUseModal,
  AccountSettingsModal
} from './components/LegalModals.tsx';

export default function App() {
  // Current user state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('applywise_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Navigation: minimal 3 tabs for signed-in user
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications' | 'profile'>('jobs');

  // Core Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<CareerPreferences | null>(null);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Modals & Drawers
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'recovery'>('login');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<JobVacancy | null>(null);
  const [previewResumeApp, setPreviewResumeApp] = useState<ApplicationRecord | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isPreparingApp, setIsPreparingApp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial Data Fetch
  const loadUserData = async () => {
    try {
      if (currentUser) {
        const [profData, prefData, settData, vacData, appData, notifData] = await Promise.all([
          api.getProfile(),
          api.getPreferences(),
          api.getSettings(),
          api.getVacancies(),
          api.getApplications(),
          api.getNotifications(),
        ]);
        setProfile(profData.profile);
        setPreferences(prefData.preferences);
        setSettings(settData.settings);
        setVacancies(vacData.vacancies);
        setApplications(appData.applications);
        setNotifications(notifData.notifications);
      } else {
        // Public vacancies preview for guest landing page
        const vacData = await api.getVacancies();
        setVacancies(vacData.vacancies);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      // If token expired, clear user
      if (currentUser) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [currentUser?.id]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    showToast(`Welcome back, ${user.fullName}!`);
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setProfile(null);
    setPreferences(null);
    setSettings(null);
    setApplications([]);
    showToast('Signed out successfully.');
  };

  const handleSearchJobs = async (query: string, country?: string, remoteOnly?: boolean) => {
    try {
      setIsSearching(true);
      const res = await api.searchJobs(query, country, remoteOnly);
      setVacancies(res.vacancies);
      showToast(`Discovered ${res.totalDiscovered} verified vacancies.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Search error: ${msg}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePrepareApplication = async (vacancyId: string) => {
    if (!currentUser) {
      setAuthModalMode('signup');
      setAuthModalOpen(true);
      return;
    }

    try {
      setIsPreparingApp(true);
      const res = await api.createFromVacancy(vacancyId);
      setApplications(prev => [res.application, ...prev]);
      showToast('ATS Tailored resume & application package generated!');
      setSelectedVacancy(null);
      setActiveTab('applications');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Failed to prepare application: ${msg}`);
    } finally {
      setIsPreparingApp(false);
    }
  };

  const handleToggleEmergencyStop = async () => {
    try {
      const res = await api.toggleEmergencyStop();
      setSettings(res.settings);
      showToast(res.emergencyStop ? '🚨 Emergency Stop engaged' : '✅ Automation safely active');
    } catch (err) {
      console.error('Failed to toggle emergency stop:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom duration-200">
          {toastMessage}
        </div>
      )}

      {/* Main Signed-In Header OR Landing Page */}
      {currentUser ? (
        <>
          <AppHeader
            user={currentUser}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            notifications={notifications}
            onMarkNotificationRead={id => api.markNotificationRead(id).then(r => setNotifications(r.notifications))}
            onMarkAllNotificationsRead={() => api.markAllNotificationsRead().then(r => setNotifications(r.notifications))}
            settings={settings}
            onToggleEmergencyStop={handleToggleEmergencyStop}
            onOpenSettingsModal={() => setSettingsModalOpen(true)}
            onOpenPrivacy={() => setPrivacyModalOpen(true)}
            onOpenTerms={() => setTermsModalOpen(true)}
            onLogout={handleLogout}
          />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
            {activeTab === 'jobs' && (
              <JobSearchPage
                vacancies={vacancies}
                onSelectVacancy={setSelectedVacancy}
                onSearch={handleSearchJobs}
                isSearching={isSearching}
                onOpenOnboarding={() => setOnboardingOpen(true)}
                hasProfile={!!profile && profile.skills.length > 0}
              />
            )}

            {activeTab === 'applications' && (
              <ApplicationsPage
                applications={applications}
                onSelectApplication={app => setPreviewResumeApp(app)}
                onRefresh={loadUserData}
                onViewResume={app => setPreviewResumeApp(app)}
                onNavigateToJobs={() => setActiveTab('jobs')}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileAndPreferencesPage
                profile={profile}
                preferences={preferences}
                onUpdateProfile={p => { setProfile(p); showToast('Profile updated!'); }}
                onUpdatePreferences={pref => { setPreferences(pref); showToast('Preferences updated!'); }}
                onOpenOnboarding={() => setOnboardingOpen(true)}
              />
            )}
          </main>

          {/* Minimal Clean Footer */}
          <footer className="border-t border-slate-200/80 bg-white py-6 text-xs text-slate-500 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span>ApplyWise AI — Intelligent Job Discovery & Application Preparation</span>
              <div className="flex items-center space-x-4">
                <button onClick={() => setPrivacyModalOpen(true)} className="hover:text-blue-600 transition">Privacy Policy</button>
                <button onClick={() => setTermsModalOpen(true)} className="hover:text-blue-600 transition">Terms of Use</button>
                <span>Zero Hallucination Guarantee</span>
              </div>
            </div>
          </footer>
        </>
      ) : (
        <LandingPage
          onOpenAuth={mode => { setAuthModalMode(mode); setAuthModalOpen(true); }}
          onOpenPrivacy={() => setPrivacyModalOpen(true)}
          onOpenTerms={() => setTermsModalOpen(true)}
          featuredVacancies={vacancies}
          onSelectVacancy={v => { setSelectedVacancy(v); }}
          onSearch={q => {
            handleSearchJobs(q);
            setAuthModalMode('signup');
            setAuthModalOpen(true);
          }}
        />
      )}

      {/* Global Modals */}
      <AuthModals
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      <ResumeOnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onProfileUpdated={newProf => {
          setProfile(newProf);
          showToast('Master profile verified and updated!');
        }}
      />

      <JobDetailDrawer
        vacancy={selectedVacancy}
        onClose={() => setSelectedVacancy(null)}
        onPrepareApplication={handlePrepareApplication}
        isPreparing={isPreparingApp}
        hasApplied={applications.some(a => a.vacancyId === selectedVacancy?.id)}
      />

      <ResumePreviewModal
        application={previewResumeApp}
        profile={profile}
        onClose={() => setPreviewResumeApp(null)}
      />

      <AccountSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={async upd => {
          const res = await api.updateSettings(upd);
          setSettings(res.settings);
          showToast('Settings saved.');
        }}
        onToggleEmergencyStop={handleToggleEmergencyStop}
      />

      <PrivacyPolicyModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
      />

      <TermsOfUseModal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
      />
    </div>
  );
}
