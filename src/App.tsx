import React, { useState, useEffect } from 'react';
import { api, AuthUser } from './services/api.ts';
import {
  UserProfile,
  CareerPreferences,
  AutomationSettings,
  JobVacancy,
  ApplicationRecord,
  NotificationItem,
  AccountUsageStats,
} from './types/index.ts';
import { BrandLogo } from './components/BrandLogo.tsx';
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
import { AboutPage } from './components/AboutPage.tsx';
import { PricingPage } from './components/PricingPage.tsx';
import { AICopilot } from './components/AICopilot.tsx';
import { CareerTwinPage } from './components/CareerTwinPage.tsx';
import { UserSubscription } from './config/plans.ts';
import { isPermanentFreeAccessAccount } from './config/freeAccess.ts';

export default function App() {
  // Current user state (validated against server)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Client-side URL routing state ('/' | '/about' | '/pricing')
  const [currentRoute, setCurrentRoute] = useState<string>(() => window.location.pathname || '/');

  // Navigation: signed-in tabs
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications' | 'profile' | 'twin'>('jobs');

  // Core Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<CareerPreferences | null>(null);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<AccountUsageStats | null>(null);

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
  const [isSearching, setIsSearching] = useState(false);
  const [isPreparingApp, setIsPreparingApp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Client-side URL history synchronization
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentRoute(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Safe server-validated session boot
  useEffect(() => {
    const initSession = async () => {
      const token = localStorage.getItem('applywise_token');
      if (token) {
        try {
          const meData = await api.getMe();
          if (meData.success && meData.user) {
            setCurrentUser(meData.user);
            localStorage.setItem('applywise_user', JSON.stringify(meData.user));
          } else {
            localStorage.removeItem('applywise_token');
            localStorage.removeItem('applywise_user');
            setCurrentUser(null);
          }
        } catch {
          localStorage.removeItem('applywise_token');
          localStorage.removeItem('applywise_user');
          setCurrentUser(null);
        }
      }
      setIsCheckingSession(false);
    };

    initSession();
  }, []);

  // Load User / Public Data
  const loadUserData = async () => {
    try {
      if (currentUser) {
        const [profData, prefData, settData, vacData, appData, notifData, subData, usageData] = await Promise.all([
          api.getProfile(),
          api.getPreferences(),
          api.getSettings(),
          api.getVacancies(),
          api.getApplications(),
          api.getNotifications(),
          api.getSubscription().catch(() => ({ success: false, subscription: null })),
          api.getUserUsage().catch(() => ({ success: false, stats: null })),
        ]);
        setProfile(profData.profile);
        setPreferences(prefData.preferences);
        setSettings(settData.settings);
        setVacancies(vacData.vacancies);
        setApplications(appData.applications);
        setNotifications(notifData.notifications);
        if (subData?.subscription) {
          setSubscription(subData.subscription);
        }
        if (usageData?.stats) {
          setUsage(usageData.stats);
        }
      } else {
        const vacData = await api.getVacancies();
        setVacancies(vacData.vacancies);
        setSubscription(null);
        setUsage(null);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      if (currentUser) {
        handleLogout();
      }
    }
  };

  const handleUpgradePlan = async (plan: 'free' | 'pro', billingCycle: 'monthly' | 'annual') => {
    if (!currentUser) {
      setAuthModalMode('signup');
      setAuthModalOpen(true);
      return;
    }
    try {
      const res = await api.upgradeSubscription(plan, billingCycle);
      if (res.success && res.subscription) {
        setSubscription(res.subscription);
        showToast(res.message || 'Subscription successfully updated!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Upgrade error: ${msg}`);
    }
  };

  const handleCancelPlan = async () => {
    if (!currentUser) return;
    try {
      const res = await api.cancelSubscription();
      if (res.success && res.subscription) {
        setSubscription(res.subscription);
        showToast('Subscription scheduled to cancel at end of current period.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Cancel error: ${msg}`);
    }
  };

  useEffect(() => {
    if (!isCheckingSession) {
      loadUserData();
    }
  }, [currentUser?.id, isCheckingSession]);

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
      const res = await api.searchLiveJobs({
        q: query,
        location: country,
        workArrangement: remoteOnly ? 'remote' : undefined,
      });
      setVacancies(res.jobs);
      showToast(`Discovered ${res.total} live opportunities.`);
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

  // Branded Loading State with official AV minimal logo
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-5 animate-in fade-in duration-300">
          <div className="animate-pulse">
            <BrandLogo size="xl" showWordmark={true} />
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
            <span>Initializing ApplyWise AI...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom duration-200">
          {toastMessage}
        </div>
      )}

      {/* Main Signed-In Header OR Landing Page OR Dedicated Pages */}
      {currentRoute === '/about' ? (
        <AboutPage
          onGetStarted={() => {
            if (!currentUser) {
              setAuthModalMode('signup');
              setAuthModalOpen(true);
            } else {
              navigateTo('/');
            }
          }}
          onExplorePro={() => navigateTo('/pricing')}
          onNavigateHome={() => navigateTo('/')}
        />
      ) : currentRoute === '/pricing' ? (
        <PricingPage
          currentUser={currentUser}
          currentPlanId={isPermanentFreeAccessAccount(currentUser) ? 'pro' : (subscription?.planId || subscription?.plan || 'free')}
          onOpenAuth={mode => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
          onNavigateHome={() => navigateTo('/')}
          onSubscriptionUpdated={loadUserData}
        />
      ) : currentUser ? (
        <>
          <AppHeader
            user={currentUser}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            notifications={notifications}
            settings={settings}
            onToggleEmergencyStop={handleToggleEmergencyStop}
            onOpenSettingsModal={() => setSettingsModalOpen(true)}
            onOpenPrivacy={() => setPrivacyModalOpen(true)}
            onOpenTerms={() => setTermsModalOpen(true)}
            onLogout={handleLogout}
            onMarkNotificationRead={async id => {
              const res = await api.markNotificationRead(id);
              setNotifications(res.notifications);
            }}
            onMarkAllNotificationsRead={async () => {
              const res = await api.markAllNotificationsRead();
              setNotifications(res.notifications);
            }}
            plan={isPermanentFreeAccessAccount(currentUser) ? 'pro' : (subscription?.planId || subscription?.plan || 'free')}
            usage={usage}
            onOpenPricing={() => navigateTo('/pricing')}
            onOpenAbout={() => navigateTo('/about')}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
            {activeTab === 'jobs' && (
              <JobSearchPage
                vacancies={vacancies}
                onSelectVacancy={v => setSelectedVacancy(v)}
                onSearch={handleSearchJobs}
                isSearching={isSearching}
                hasProfile={!!profile?.fullName}
                onOpenOnboarding={() => setOnboardingOpen(true)}
                onRefreshLiveJobs={async () => {
                  const res = await api.refreshLiveJobs();
                  showToast(res.message);
                  await loadUserData();
                }}
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

            {activeTab === 'twin' && (
              <CareerTwinPage
                onShowToast={showToast}
              />
            )}
          </main>

          {/* Minimal Clean Footer */}
          <footer className="border-t border-slate-200/80 bg-white py-6 text-xs text-slate-500 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <BrandLogo size="xs" showWordmark={false} />
                <span>ApplyWise AI — Intelligent Job Discovery & Application Preparation</span>
              </div>
              <div className="flex items-center space-x-4">
                <button onClick={() => navigateTo('/about')} className="hover:text-blue-600 transition">About Us</button>
                <button onClick={() => navigateTo('/pricing')} className="hover:text-blue-600 transition">Pricing & Plans</button>
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
          onOpenAbout={() => navigateTo('/about')}
          onOpenPricing={() => navigateTo('/pricing')}
          featuredVacancies={vacancies}
          onSelectVacancy={v => { setSelectedVacancy(v); }}
          onSearch={q => {
            handleSearchJobs(q);
            setAuthModalMode('signup');
            setAuthModalOpen(true);
          }}
        />
      )}

      {/* Global AI Career Copilot */}
      <AICopilot
        currentUser={currentUser}
        currentPageContext={currentRoute === '/' ? (currentUser ? activeTab : 'landing') : currentRoute.replace('/', '')}
        contextDetails={{
          selectedJob: selectedVacancy ? {
            title: selectedVacancy.title,
            company: selectedVacancy.company,
            description: selectedVacancy.description,
          } : undefined,
          profileSummary: profile ? {
            title: profile.fullName || 'User Profile',
            skills: profile.skills || [],
            experienceYears: profile.experiences?.length || 0,
          } : undefined,
          activeApplicationsCount: applications.length,
          userPlan: isPermanentFreeAccessAccount(currentUser) ? 'pro' : (subscription?.planId || subscription?.plan || 'free'),
        }}
        onOpenPricing={() => navigateTo('/pricing')}
        onOpenAuth={mode => {
          setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
      />

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
        onApplicationCreated={newApp => setApplications(prev => [newApp, ...prev])}
        onShowToast={showToast}
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
