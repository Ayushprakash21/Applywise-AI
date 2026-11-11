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
import { DashboardShell, DashboardTab } from './components/DashboardShell.tsx';
import { CareerCommandCenter } from './components/CareerCommandCenter.tsx';
import { InterviewsPage } from './components/InterviewsPage.tsx';
import { CareerIntelligenceReport } from './components/CareerIntelligenceReport.tsx';
import { ResumeStudioTab } from './components/ResumeStudioTab.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthModals } from './components/AuthModals.tsx';
import { ResumeOnboardingModal } from './components/ResumeOnboardingModal.tsx';
import { JobImportModal } from './components/JobImportModal.tsx';
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
import { AICopilot } from './components/AICopilot.tsx';
import { FlowLogin } from './components/FlowLogin.tsx';
import { FlowSignup } from './components/FlowSignup.tsx';
import { NotFoundPage } from './components/NotFoundPage.tsx';
import { NotificationsPage } from './components/NotificationsPage.tsx';
import { CareerDesk } from './components/CareerDesk.tsx';
import { OpportunityRadar } from './components/OpportunityRadar.tsx';
import { ApplicationControl } from './components/ApplicationControl.tsx';
import { InterviewStudio } from './components/InterviewStudio.tsx';
import { RecruiterReview } from './components/RecruiterReview.tsx';
import { CareerAtlas } from './components/CareerAtlas.tsx';

// Code-split heavy routes and administrative modules for production performance
const AdminConsole = React.lazy(() => import('./components/AdminConsole.tsx').then(m => ({ default: m.AdminConsole })));
const AdminLoginPage = React.lazy(() => import('./components/AdminLoginPage.tsx').then(m => ({ default: m.AdminLoginPage })));
const CareerTwinPage = React.lazy(() => import('./components/CareerTwinPage.tsx').then(m => ({ default: m.CareerTwinPage })));
const PricingPage = React.lazy(() => import('./components/PricingPage.tsx').then(m => ({ default: m.PricingPage })));
const AboutPage = React.lazy(() => import('./components/AboutPage.tsx').then(m => ({ default: m.AboutPage })));
const HrOutreachPage = React.lazy(() => import('./components/HrOutreachPage.tsx').then(m => ({ default: m.HrOutreachPage })));

const normalizePath = (rawPath: string): string => {
  const path = (rawPath || '/').split('?')[0].split('#')[0] || '/';
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path || '/';
};

const PROTECTED_ROUTES = new Set([
  '/dashboard',
  '/dashboard/hr-outreach',
  '/overview',
  '/jobs',
  '/matches',
  '/applications',
  '/interviews',
  '/profile',
  '/career_twin',
  '/twin',
  '/career_report',
  '/resume_studio',
  '/resume_intelligence',
  '/settings',
  '/notifications',
]);

const KNOWN_ROUTES = new Set([
  '/',
  '/about',
  '/pricing',
  '/admin',
  '/admin/gcde',
  '/admin/login',
  '/login',
  '/signin',
  '/signup',
  '/register',
  '/dashboard',
  '/dashboard/hr-outreach',
  '/overview',
  '/jobs',
  '/matches',
  '/applications',
  '/interviews',
  '/profile',
  '/career_twin',
  '/twin',
  '/career_report',
  '/resume_studio',
  '/resume_intelligence',
  '/settings',
  '/notifications',
]);
import { UserSubscription } from './config/plans.ts';
import { isPermanentFreeAccessAccount } from './config/freeAccess.ts';
import { DashboardSummary } from './services/api.ts';

export default function App() {
  // Current user state (validated against server)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Client-side URL routing state ('/' | '/about' | '/pricing')
  const [currentRoute, setCurrentRoute] = useState<string>(() => normalizePath(window.location.pathname || '/'));

  // Navigation: signed-in tabs (Career Command Center is default overview)
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [recruiterReviewAppId, setRecruiterReviewAppId] = useState<string | undefined>(undefined);

  // Core Data State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<CareerPreferences | null>(null);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<AccountUsageStats | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);

  // Centralized Theme Management System
  // Backend subscription entitlement & allowlist are the authoritative source of truth
  const isBlackSubscriber = !!currentUser && (
    subscription?.planId === 'black' ||
    subscription?.plan === 'black' ||
    isPermanentFreeAccessAccount(currentUser)
  );

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isBlackSubscriber) {
      root.setAttribute('data-theme', 'black');
      root.classList.add('theme-black');
      body.classList.add('theme-black');
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('theme-black');
      body.classList.remove('theme-black');
    }
  }, [isBlackSubscriber]);


  // Modals & Drawers
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'recovery'>('login');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [jobImportOpen, setJobImportOpen] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState<JobVacancy | null>(null);
  const [previewResumeApp, setPreviewResumeApp] = useState<ApplicationRecord | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState<string | null>(null);

  // Loading States
  const [isSearching, setIsSearching] = useState(false);
  const [isPreparingApp, setIsPreparingApp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Client-side URL history synchronization
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(normalizePath(window.location.pathname || '/'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentRoute(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Redirect authenticated users away from standalone auth pages to overview
  useEffect(() => {
    if (currentUser && (currentRoute === '/login' || currentRoute === '/signin' || currentRoute === '/signup' || currentRoute === '/register')) {
      navigateTo('/');
    }
  }, [currentUser, currentRoute]);

  useEffect(() => {
    if (currentUser && currentRoute === '/notifications' && activeTab !== 'notifications') {
      setActiveTab('notifications');
    } else if (currentUser && currentRoute === '/dashboard/hr-outreach' && activeTab !== 'hr_outreach') {
      setActiveTab('hr_outreach');
    }
  }, [currentRoute, currentUser, activeTab]);

  // Redirect candidate / non-admin users away from admin routes
  useEffect(() => {
    if (!isCheckingSession && currentUser && currentUser.role !== 'admin' && (currentRoute === '/admin' || currentRoute === '/admin/gcde')) {
      showToast('Access denied: Administrator privileges required.');
      navigateTo('/');
    }
  }, [currentUser, isCheckingSession, currentRoute]);

  // Redirect unauthenticated users away from protected routes to login
  useEffect(() => {
    if (!isCheckingSession && !currentUser && PROTECTED_ROUTES.has(currentRoute)) {
      navigateTo('/login');
    }
  }, [currentUser, isCheckingSession, currentRoute]);

  // Safe server-validated session boot
  useEffect(() => {
    const initSession = async () => {
      const token = localStorage.getItem('applyvise_token') || localStorage.getItem('applywise_token');
      if (token) {
        try {
          const meData = await api.getMe();
          if (meData.success && meData.user) {
            setCurrentUser(meData.user);
            localStorage.setItem('applyvise_user', JSON.stringify(meData.user));
            localStorage.setItem('applywise_user', JSON.stringify(meData.user));
          } else {
            localStorage.removeItem('applyvise_token');
            localStorage.removeItem('applywise_token');
            localStorage.removeItem('applyvise_user');
            localStorage.removeItem('applywise_user');
            setCurrentUser(null);
          }
        } catch {
          localStorage.removeItem('applyvise_token');
          localStorage.removeItem('applywise_token');
          localStorage.removeItem('applyvise_user');
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
        const [profData, prefData, settData, vacData, appData, notifData, subData, usageData, summaryData] = await Promise.all([
          api.getProfile(),
          api.getPreferences(),
          api.getSettings(),
          api.getVacancies(),
          api.getApplications(),
          api.getNotifications().catch(() => ({ success: false, notifications: [] as NotificationItem[] })),
          api.getSubscription().catch(() => ({ success: false, subscription: null })),
          api.getUserUsage().catch(() => ({ success: false, stats: null })),
          api.getDashboardSummary().catch(() => ({ success: false, summary: null })),
        ]);
        setProfile(profData.profile);
        setPreferences(prefData.preferences);
        setSettings(settData.settings);
        setVacancies(vacData.vacancies);
        setApplications(appData.applications);
        setNotifications(notifData.notifications || []);
        if (subData?.subscription) {
          setSubscription(subData.subscription);
        }
        if (usageData?.stats) {
          setUsage(usageData.stats);
        }
        if (summaryData?.summary) {
          setDashboardSummary(summaryData.summary);
        }

        // Check if newly created account without profile and not previously dismissed
        const dismissed = localStorage.getItem(`applyvise_onboarding_dismissed_${currentUser.id}`) || localStorage.getItem(`applywise_onboarding_dismissed_${currentUser.id}`);
        if (!dismissed && (!profData.profile?.fullName || !profData.profile?.experiences || profData.profile.experiences.length === 0)) {
          setOnboardingOpen(true);
        }
      } else {
        const vacData = await api.getVacancies();
        setVacancies(vacData.vacancies);
        setSubscription(null);
        setUsage(null);
        setDashboardSummary(null);
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
      navigateTo('/signup');
      return;
    }
    try {
      if (!isPermanentFreeAccessAccount(currentUser)) {
        navigateTo('/pricing');
        return;
      }
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


  // Notification handlers
  const handleMarkNotificationRead = async (id: string) => {
    try {
      const res = await api.markNotificationRead(id);
      if (res && res.notifications) {
        setNotifications(res.notifications);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Failed to update notification: ${msg}`);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const res = await api.markAllNotificationsRead();
      if (res && res.notifications) {
        setNotifications(res.notifications);
        showToast('All notifications marked as read');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Failed to mark all as read: ${msg}`);
    }
  };

  const handleRefreshNotifications = async () => {
    setIsLoadingNotifications(true);
    setNotificationsError(null);
    try {
      const res = await api.getNotifications();
      if (res && res.notifications) {
        setNotifications(res.notifications);
      } else {
        setNotificationsError('Could not retrieve notifications from server');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotificationsError(msg || 'Unable to connect to notifications service');
    } finally {
      setIsLoadingNotifications(false);
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

  const handleLoginSuccess = (user: AuthUser, _token?: string, isNewRegistration = false) => {
    setCurrentUser(user);
    if (isNewRegistration) {
      showToast(`Welcome to ApplyVise AI, ${user.fullName}! Let's set up your master resume.`);
      setOnboardingOpen(true);
    } else {
      showToast(`Welcome back, ${user.fullName}!`);
    }
  };

  const handleOnboardingClose = () => {
    if (currentUser) {
      localStorage.setItem(`applyvise_onboarding_dismissed_${currentUser.id}`, 'true');
      localStorage.setItem(`applywise_onboarding_dismissed_${currentUser.id}`, 'true');
    }
    setOnboardingOpen(false);
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
        limit: 50,
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
      navigateTo('/signup');
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

  const handleUpdateUserPhoto = async (newPhotoUrl: string | null) => {
    if (currentUser) {
      if (newPhotoUrl) {
        localStorage.setItem(`applyvise_user_photo_${currentUser.id}`, newPhotoUrl);
      } else {
        localStorage.removeItem(`applyvise_user_photo_${currentUser.id}`);
      }
      setCurrentUser(prev => prev ? { ...prev, photoUrl: newPhotoUrl } : prev);
      if (profile) {
        await api.updateProfile({ photoUrl: newPhotoUrl }).catch(() => {});
        setProfile(prev => prev ? { ...prev, photoUrl: newPhotoUrl } : prev);
      }
      showToast(newPhotoUrl ? 'Profile photo updated and saved.' : 'Profile photo removed.');
    }
  };

  const handleSelectTab = (tab: DashboardTab) => {
    if (tab === 'settings') {
      setSettingsModalOpen(true);
    } else if (tab === 'privacy') {
      setPrivacyModalOpen(true);
    } else if (tab === 'subscription') {
      navigateTo('/pricing');
    } else if (tab === 'copilot') {
      setCopilotOpen(true);
    } else if (tab === 'hr_outreach') {
      setActiveTab('hr_outreach');
      if (currentRoute !== '/dashboard/hr-outreach') {
        window.history.pushState({}, '', '/dashboard/hr-outreach');
        setCurrentRoute('/dashboard/hr-outreach');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveTab(tab);
      if (currentRoute === '/dashboard/hr-outreach') {
        window.history.pushState({}, '', '/');
        setCurrentRoute('/');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <span>Initializing ApplyVise AI...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E9EDF3] neu-bg text-slate-800 antialiased flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom duration-200">
          {toastMessage}
        </div>
      )}

      {/* Main Signed-In Header OR Landing Page OR Dedicated Pages */}
      <React.Suspense fallback={
        <div className="min-h-screen bg-slate-950/20 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-xl flex items-center space-x-3 text-slate-200 text-xs font-semibold">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span>Loading view...</span>
          </div>
        </div>
      }>
      {!KNOWN_ROUTES.has(currentRoute) ? (
        <NotFoundPage
          onNavigateHome={() => navigateTo('/')}
          onNavigateLogin={() => navigateTo('/login')}
        />
      ) : currentRoute === '/about' ? (
        <AboutPage
          onGetStarted={() => {
            if (!currentUser) {
              navigateTo('/signup');
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
          currentPlanId={isBlackSubscriber ? 'black' : (subscription?.planId || subscription?.plan || 'free')}
          onOpenAuth={mode => {
            if (mode === 'signup') {
              navigateTo('/signup');
            } else {
              navigateTo('/login');
            }
          }}
          onNavigateHome={() => navigateTo('/')}
          onSubscriptionUpdated={loadUserData}
        />
      ) : currentRoute === '/admin' || currentRoute === '/admin/gcde' ? (
        currentUser && currentUser.role === 'admin' ? (
          <AdminConsole
            currentUser={currentUser}
            initialTab={currentRoute === '/admin/gcde' ? 'sources' : 'overview'}
            currentRoute={currentRoute}
            onNavigateRoute={route => navigateTo(route)}
            onNavigateHome={() => navigateTo('/')}
            onLogout={async () => {
              await handleLogout();
              navigateTo('/admin/login');
            }}
          />
        ) : (
          <AdminLoginPage
            onSuccess={adminUser => {
              setCurrentUser(adminUser);
              navigateTo(currentRoute);
            }}
            onNavigateHome={() => navigateTo('/')}
          />
        )
      ) : currentRoute === '/admin/login' ? (
        <AdminLoginPage
          onSuccess={adminUser => {
            setCurrentUser(adminUser);
            navigateTo('/admin');
          }}
          onNavigateHome={() => navigateTo('/')}
        />
      ) : (currentRoute === '/signup' || currentRoute === '/register') && !currentUser ? (
        <FlowSignup
          onSuccess={(user, token) => {
            handleLoginSuccess(user, token, true);
            navigateTo('/');
          }}
          onNavigateToLogin={() => navigateTo('/login')}
          onNavigateHome={() => navigateTo('/')}
          onOpenTerms={() => setTermsModalOpen(true)}
          onOpenPrivacy={() => setPrivacyModalOpen(true)}
        />
      ) : ((currentRoute === '/login' || currentRoute === '/signin') || PROTECTED_ROUTES.has(currentRoute)) && !currentUser ? (
        <FlowLogin
          onSuccess={(user, token) => {
            handleLoginSuccess(user, token, false);
            navigateTo('/');
          }}
          onNavigateToSignup={() => navigateTo('/signup')}
          onNavigateHome={() => navigateTo('/')}
        />
      ) : currentUser ? (
        <div className="flex-1 w-full pb-24 lg:pb-8">
          <DashboardShell
            user={currentUser}
            activeTab={activeTab}
            onUpdateUserPhoto={handleUpdateUserPhoto}
            onSelectTab={handleSelectTab}
            notifications={notifications}
          onMarkNotificationRead={async id => {
            const res = await api.markNotificationRead(id);
            setNotifications(res.notifications);
          }}
          onMarkAllNotificationsRead={async () => {
            const res = await api.markAllNotificationsRead();
            setNotifications(res.notifications);
          }}
          settings={settings}
          onToggleEmergencyStop={handleToggleEmergencyStop}
          onOpenSettingsModal={() => setSettingsModalOpen(true)}
          onOpenPrivacy={() => setPrivacyModalOpen(true)}
          onOpenTerms={() => setTermsModalOpen(true)}
          onOpenPricing={() => navigateTo('/pricing')}
          onOpenAbout={() => navigateTo('/about')}
          onOpenAdmin={() => navigateTo('/admin')}
          onLogout={handleLogout}
          plan={isBlackSubscriber ? 'black' : ((subscription?.planId as 'free' | 'pro' | 'black') || subscription?.plan || 'free')}
          usage={usage}
        >
          {activeTab === 'desk' && (
            <CareerDesk
              user={currentUser}
              profile={profile}
              preferences={preferences}
              applications={applications}
              vacancies={vacancies}
              onNavigateTab={tab => handleSelectTab(tab as DashboardTab)}
              onSelectVacancy={v => setSelectedVacancy(v)}
              onOpenOnboarding={() => setOnboardingOpen(true)}
              onOpenImportModal={() => setJobImportOpen(true)}
              onAskCopilotPrompt={(prompt: string) => {
                setCopilotPrompt(prompt);
                setCopilotOpen(true);
              }}
            />
          )}

          {activeTab === 'radar' && (
            <OpportunityRadar
              vacancies={vacancies}
              profile={profile}
              onSelectVacancy={v => setSelectedVacancy(v)}
              onOpenImportModal={() => setJobImportOpen(true)}
              onRefreshLiveJobs={async () => {
                const res = await api.refreshLiveJobs();
                showToast(res.message);
                await loadUserData();
              }}
              onPrepareApplication={async v => { await handlePrepareApplication(typeof v === 'string' ? v : (v as any).id); }}
            />
          )}

          {activeTab === 'control' && (
            <ApplicationControl
              applications={applications}
              onSelectApplication={app => setPreviewResumeApp(app)}
              onOpenRecruiterReview={(appId: string) => {
                setRecruiterReviewAppId(appId);
                setActiveTab('recruiter_review');
              }}
              onRefresh={loadUserData}
              onNavigateToRadar={() => setActiveTab('radar')}
            />
          )}

          {activeTab === 'interview_studio' && (
            <InterviewStudio
              applications={applications}
              profile={profile}
              onAskCopilot={(prompt: string) => {
                setCopilotPrompt(prompt);
                setCopilotOpen(true);
              }}
            />
          )}

          {activeTab === 'recruiter_review' && (
            <RecruiterReview
              applications={applications}
              initialApplicationId={recruiterReviewAppId}
              onNavigateToApplication={() => {
                setActiveTab('control');
              }}
            />
          )}

          {activeTab === 'atlas' && (
            <CareerAtlas
              profile={profile}
              preferences={preferences}
              onAskCopilot={(prompt: string) => {
                setCopilotPrompt(prompt);
                setCopilotOpen(true);
              }}
            />
          )}

          {activeTab === 'hr_outreach' && (
            <HrOutreachPage
              user={currentUser}
              profile={profile}
              preferences={preferences}
              vacancies={vacancies}
              plan={isBlackSubscriber ? 'black' : ((subscription?.planId as 'free' | 'pro' | 'black') || subscription?.plan || 'free')}
              onOpenPricing={() => navigateTo('/pricing')}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'overview' && (
            <CareerCommandCenter
              user={currentUser}
              summary={dashboardSummary}
              profile={profile}
              preferences={preferences}
              vacancies={vacancies}
              applications={applications}
              onNavigateTab={tab => handleSelectTab(tab as DashboardTab)}
              onSelectVacancy={v => setSelectedVacancy(v)}
              onOpenOnboarding={() => setOnboardingOpen(true)}
              onOpenImportModal={() => setJobImportOpen(true)}
              onAskCopilotPrompt={prompt => {
                setCopilotPrompt(prompt);
                setCopilotOpen(true);
              }}
              onSearchJobs={q => handleSearchJobs(q)}
            />
          )}

          {(activeTab === 'jobs' || activeTab === 'matches') && (
            <JobSearchPage
              vacancies={activeTab === 'matches' ? vacancies.filter(v => (v.matchEvaluation?.matchScore || 0) >= 70 || (dashboardSummary?.relevantMatchesCount && (v.matchEvaluation?.matchScore || 0) >= 60)) : vacancies}
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

          {activeTab === 'interviews' && (
            <InterviewsPage
              applications={applications}
              profile={profile}
              onUpdateStatus={async (id, newStatus) => {
                try {
                  await api.transitionStatus(id, newStatus, 'Status updated in Interviews Workspace');
                  showToast(`Application advanced to ${newStatus}`);
                  await loadUserData();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err);
                  showToast(`Update error: ${msg}`);
                }
              }}
              onNavigateToJobs={() => setActiveTab('jobs')}
              onNavigateToApplications={() => setActiveTab('applications')}
              onAskCopilot={(prompt: string) => {
                setCopilotPrompt(prompt);
                setCopilotOpen(true);
              }}
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

          {(activeTab === 'career_twin' || (activeTab as string) === 'twin') && (
            <CareerTwinPage
              onShowToast={showToast}
            />
          )}

          {activeTab === 'career_report' && (
            <CareerIntelligenceReport
              profile={profile}
              preferences={preferences}
              vacancies={vacancies}
              onOpenOnboarding={() => setOnboardingOpen(true)}
              onNavigateToJobs={() => setActiveTab('jobs')}
              onAskCopilot={(prompt: string) => {
                setCopilotPrompt(prompt);
                setCopilotOpen(true);
              }}
            />
          )}

          {(activeTab === 'resume_studio' || activeTab === 'resume_intelligence') && (
            <ResumeStudioTab
              applications={applications}
              profile={profile}
              onTailorResume={async () => {
                showToast('Choose a job vacancy to tailor your ATS resume package.');
                setActiveTab('jobs');
              }}
              isTailoring={false}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsPage
              notifications={notifications}
              isLoading={isLoadingNotifications}
              error={notificationsError}
              onRefresh={handleRefreshNotifications}
              onMarkAsRead={handleMarkNotificationRead}
              onMarkAllAsRead={handleMarkAllNotificationsRead}
              onNavigateToJobs={() => setActiveTab('jobs')}
              onNavigateToApplications={() => setActiveTab('applications')}
            />
          )}

          {/* Minimal Clean Footer */}
          <footer className="border-t border-slate-200/80 dark:border-white/10 bg-transparent py-6 text-xs text-slate-500 mt-12">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <BrandLogo size="xs" showWordmark={false} />
                <span>ApplyVise AI — Unified AI Career Operating System</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button onClick={() => navigateTo('/about')} className="hover:text-cyan-500 transition">About Us</button>
                <button onClick={() => navigateTo('/pricing')} className="hover:text-cyan-500 transition">Pricing & Plans</button>
                <button onClick={() => navigateTo('/admin')} className="hover:text-cyan-500 transition">Admin Portal</button>
                <button onClick={() => setPrivacyModalOpen(true)} className="hover:text-cyan-500 transition">Privacy Policy</button>
                <button onClick={() => setTermsModalOpen(true)} className="hover:text-cyan-500 transition">Terms of Use</button>
                <span className="text-slate-400">Zero Hallucination Standard</span>
              </div>
            </div>
          </footer>
        </DashboardShell>
      </div>
      ) : (
        <LandingPage
          onOpenAuth={mode => {
            if (mode === 'signup') {
              navigateTo('/signup');
            } else {
              navigateTo('/login');
            }
          }}
          onOpenPrivacy={() => setPrivacyModalOpen(true)}
          onOpenTerms={() => setTermsModalOpen(true)}
          onOpenAbout={() => navigateTo('/about')}
          onOpenPricing={() => navigateTo('/pricing')}
          onOpenAdmin={() => navigateTo('/admin')}
          featuredVacancies={vacancies}
          onSelectVacancy={v => { setSelectedVacancy(v); }}
          onSearch={q => {
            handleSearchJobs(q);
            navigateTo('/signup');
          }}
        />
      )}
      </React.Suspense>

      {/* Global AI Career Copilot */}
      {!['/login', '/signin', '/signup', '/register', '/admin/login'].includes(currentRoute) && (
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
          userPlan: isBlackSubscriber ? 'black' : (subscription?.planId || subscription?.plan || 'free'),
        }}
        onOpenPricing={() => navigateTo('/pricing')}
        onOpenAuth={mode => {
          navigateTo(mode === 'signup' ? '/signup' : '/login');
        }}
        isOpenControlled={copilotOpen}
        onToggleOpen={setCopilotOpen}
        externalTriggerPrompt={copilotPrompt}
      />
      )}

      {/* Global Modals */}
      <AuthModals
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
        onOpenTerms={() => setTermsModalOpen(true)}
        onOpenPrivacy={() => setPrivacyModalOpen(true)}
      />

      <ResumeOnboardingModal
        isOpen={onboardingOpen}
        onClose={handleOnboardingClose}
        onProfileUpdated={newProf => {
          setProfile(newProf);
          if (currentUser) {
            localStorage.setItem(`applyvise_onboarding_dismissed_${currentUser.id}`, 'true');
            localStorage.setItem(`applywise_onboarding_dismissed_${currentUser.id}`, 'true');
          }
          showToast('Master profile verified and updated!');
        }}
      />

      <JobImportModal
        isOpen={jobImportOpen}
        onClose={() => setJobImportOpen(false)}
        onJobSaved={async (savedVacancy, movedToApplications) => {
          await loadUserData();
          setSelectedVacancy(savedVacancy);
          if (movedToApplications) {
            setActiveTab('control');
            showToast(`Opportunity "${savedVacancy.title}" saved & moved to Application Control.`);
          } else {
            setActiveTab('radar');
            showToast(`Opportunity "${savedVacancy.title}" saved to Opportunity Radar.`);
          }
        }}
        plan={isBlackSubscriber ? 'black' : ((subscription?.planId as 'free' | 'pro' | 'black') || subscription?.plan || 'free')}
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
        user={currentUser}
        onUpdateUserPhoto={handleUpdateUserPhoto}
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
