import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  User,
  FileText,
  Search,
  Sparkles,
  Briefcase,
  Calendar,
  Bot,
  FileCheck,
  BarChart3,
  Shield,
  Bell,
  Sliders,
  LogOut,
  ChevronDown,
  Menu,
  X as CloseIcon,
  ChevronLeft,
  ChevronRight,
  Award,
  KeyRound,
  Compass,
  Command,
  CheckCircle2,
  AlertTriangle,
  Map,
  ShieldCheck,
  Radio,
  Send
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { RoyalCrownLogo } from './RoyalCrownLogo.tsx';
import { EliteCrownBadge } from './EliteCrownBadge.tsx';
import { GlobalSearchBar } from './GlobalSearchBar.tsx';
import { initBlackEliteTheme } from '../utils/blackEliteTheme.ts';
import { AuthUser } from '../services/api.ts';
import { NotificationItem, AutomationSettings, AccountUsageStats } from '../types/index.ts';
import { isPermanentFreeAccessAccount } from '../config/freeAccess.ts';
import { ProfileIdentityComponent } from './ProfileIdentityComponent.tsx';
import { HeaderLanguageSelector } from './HeaderLanguageSelector.tsx';
import { GlobalThemeSwitch } from './ui/GlobalThemeSwitch.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

export type DashboardTab =
  | 'desk'
  | 'radar'
  | 'autopilot'
  | 'control'
  | 'interview_studio'
  | 'recruiter_review'
  | 'atlas'
  | 'hr_outreach'
  | 'overview'
  | 'profile'
  | 'resume_intelligence'
  | 'jobs'
  | 'matches'
  | 'applications'
  | 'interviews'
  | 'copilot'
  | 'resume_studio'
  | 'career_report'
  | 'career_twin'
  | 'notifications'
  | 'settings'
  | 'privacy'
  | 'subscription';

export interface DashboardShellProps {
  user: AuthUser;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  settings: AutomationSettings | null;
  onToggleEmergencyStop: () => void;
  onOpenSettingsModal: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenPricing: () => void;
  onOpenAbout: () => void;
  onOpenAdmin?: () => void;
  onLogout: () => void;
  onUpdateUserPhoto?: (photoUrl: string | null) => Promise<void> | void;
  plan?: 'free' | 'pro' | 'black';
  usage?: AccountUsageStats | null;
  children: React.ReactNode;
}

interface NavItem {
  id: DashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  user,
  activeTab,
  onSelectTab,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  settings,
  onToggleEmergencyStop,
  onOpenSettingsModal,
  onOpenPrivacy,
  onOpenTerms,
  onOpenPricing,
  onOpenAbout,
  onOpenAdmin,
  onLogout,
  onUpdateUserPhoto,
  plan = 'free',
  usage,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isFounderAccount = isPermanentFreeAccessAccount(user);
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  // Synchronize BLACK ELITE art-directed theme tokens and appearance on boot / plan change
  useEffect(() => {
    initBlackEliteTheme(plan);
  }, [plan]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { t } = useLanguage();

  const navGroups: Array<{ group: string; items: NavItem[] }> = [
    {
      group: 'CAREER INTELLIGENCE & WORKSPACE',
      items: [
        { id: 'desk' as const, label: t('nav.desk') || 'Career Desk', icon: LayoutDashboard },
        { id: 'autopilot' as const, label: t('nav.autopilot') || 'AI Autopilot', icon: Bot },
        { id: 'radar' as const, label: t('nav.radar') || 'Opportunity Radar', icon: Radio },
        { id: 'control' as const, label: t('nav.control') || 'Application Control', icon: Briefcase },
        { id: 'interview_studio' as const, label: t('nav.interview_studio') || 'Interview Studio', icon: Calendar },
        { id: 'recruiter_review' as const, label: t('nav.recruiter_review') || 'Recruiter Review', icon: ShieldCheck },
        { id: 'atlas' as const, label: t('nav.atlas') || 'Career Atlas', icon: Map },
        { id: 'hr_outreach' as const, label: t('nav.hr_outreach') || 'AI HR Outreach', icon: Send },
      ],
    },
    {
      group: 'CAREER OPERATIONS & PROFILE',
      items: [
        { id: 'profile' as const, label: t('nav.profile') || 'Career Profile & Facts', icon: User },
        { id: 'resume_studio' as const, label: t('nav.resume_studio') || 'Resume Studio', icon: FileCheck },
        { id: 'career_report' as const, label: t('nav.career_report') || 'Skills & Gap Report', icon: BarChart3 },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [
        { id: 'notifications' as const, label: t('nav.notifications') || 'Notifications', icon: Bell, badge: unreadCount },
        { id: 'settings' as const, label: t('nav.settings') || 'Settings', icon: Sliders },
        { id: 'subscription' as const, label: t('nav.subscription') || 'Membership & Billing', icon: Award },
      ],
    },
  ];

  const isItemActive = (itemId: DashboardTab): boolean => {
    if (itemId === 'desk') {
      return activeTab === 'desk' || activeTab === 'overview';
    }
    if (itemId === 'radar') {
      return activeTab === 'radar';
    }
    if (itemId === 'control') {
      return activeTab === 'control' || activeTab === 'applications' || activeTab === 'jobs' || activeTab === 'matches';
    }
    if (itemId === 'interview_studio') {
      return activeTab === 'interview_studio' || activeTab === 'interviews';
    }
    if (itemId === 'recruiter_review') {
      return activeTab === 'recruiter_review';
    }
    if (itemId === 'autopilot') {
      return activeTab === 'autopilot';
    }
    if (itemId === 'atlas') {
      return activeTab === 'atlas';
    }
    if (itemId === 'hr_outreach') {
      return activeTab === 'hr_outreach';
    }
    if (itemId === 'profile') {
      return activeTab === 'profile' || activeTab === 'career_twin' || (activeTab as string) === 'twin';
    }
    if (itemId === 'resume_studio') {
      return activeTab === 'resume_studio' || activeTab === 'resume_intelligence';
    }
    if (itemId === 'career_report') {
      return activeTab === 'career_report';
    }
    if (itemId === 'notifications') {
      return activeTab === 'notifications';
    }
    if (itemId === 'settings') {
      return activeTab === 'settings';
    }
    if (itemId === 'subscription') {
      return activeTab === 'subscription';
    }
    return activeTab === itemId;
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans relative ${
        plan === 'black'
          ? 'bg-[var(--be-bg-primary,#090A0C)] text-[var(--be-text-primary,#F2F0EA)]'
          : 'bg-[#E9EEF6] text-slate-800 selection:bg-violet-200 selection:text-violet-900'
      }`}
      style={
        plan === 'black'
          ? {
              backgroundColor: 'var(--be-bg-primary, #090A0C)',
              color: 'var(--be-text-primary, #F2F0EA)',
            }
          : undefined
      }
    >
      {/* Ambient Flowing Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0" />

      {/* Top Fixed Header - Frosted Translucent Glass */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors shadow-2xs ${
          plan === 'black'
            ? 'border-[var(--be-border-subtle,rgba(255,255,255,0.09))]'
            : 'bg-white/60 border-white/80'
        }`}
        style={
          plan === 'black'
            ? {
                backgroundColor: 'var(--be-bg-sidebar, rgba(17, 19, 24, 0.94))',
                borderColor: 'var(--be-border-subtle, rgba(255, 255, 255, 0.09))',
              }
            : undefined
        }
      >
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Mobile Toggle */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/80 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Drawer"
            >
              {mobileMenuOpen ? <CloseIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center space-x-2">
              <BrandLogo
                variant="auto"
                size="md"
                onClick={() => onSelectTab('desk')}
                className="cursor-pointer"
              />
              {plan === 'black' && (
                <EliteCrownBadge />
              )}
            </div>
          </div>

          {/* Center: Integrated Command / Global Search */}
          <div className="hidden md:flex items-center flex-1 max-w-lg mx-6" role="search">
            <GlobalSearchBar
              plan={plan}
              onSelectTab={onSelectTab}
              onSearch={() => onSelectTab('jobs')}
              placeholder="Search verified opportunities, skills, companies..."
            />
            {/* Integrated accessible shortcut tag fallback: <kbd className="sr-only">⌘K</kbd> */}
            <kbd className="sr-only">⌘K</kbd>
          </div>

          {/* Right Toolbar: Unified Enterprise Header Group */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Search Toggle Icon */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className={`md:hidden h-10 w-10 flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                plan === 'black'
                  ? 'bg-[#101318] text-[#92949A] hover:text-[#F2F0EA] border-[rgba(255,255,255,0.08)] hover:border-[rgba(198,166,106,0.30)]'
                  : 'bg-white text-slate-500 hover:text-slate-900 border-slate-200 shadow-2xs'
              }`}
              aria-label="Toggle mobile search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* A. System Status Indicator (Active Safe Pill) */}
            <button
              type="button"
              onClick={onToggleEmergencyStop}
              aria-label={settings?.emergencyStop ? 'System status: Paused. Click to resume Active Safe.' : 'System status: Active Safe. Click to halt.'}
              title={settings?.emergencyStop ? 'Automation paused. Click to resume Active Safe.' : 'Autonomous Safety: Active Safe (Click to pause)'}
              className={`h-10 px-3.5 rounded-full border text-xs font-medium flex items-center space-x-2 shadow-2xs transition-all duration-200 cursor-pointer ${
                settings?.emergencyStop
                  ? plan === 'black'
                    ? 'bg-rose-950/40 border-rose-800/40 text-rose-300 hover:bg-rose-900/50'
                    : 'bg-rose-50/90 border-rose-200 text-rose-700 hover:bg-rose-100'
                  : plan === 'black'
                  ? 'bg-[rgba(53,184,135,0.08)] border-[rgba(53,184,135,0.22)] text-[#35B887] hover:bg-[rgba(53,184,135,0.14)] hover:border-[rgba(53,184,135,0.35)]'
                  : 'bg-emerald-50/90 border-emerald-200/90 text-emerald-700 hover:bg-emerald-100/70'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${settings?.emergencyStop ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${settings?.emergencyStop ? 'bg-rose-500' : 'bg-[#35B887]'}`} />
              </span>
              <span className="hidden sm:inline font-mono tracking-tight text-[11px] font-semibold">
                {settings?.emergencyStop ? 'Paused' : 'Active Safe'}
              </span>
            </button>

            {/* B. Compact Header Language Selector */}
            <HeaderLanguageSelector plan={plan} />

            {/* Global Theme Switch */}
            <GlobalThemeSwitch />

            {/* C. Notification Button & Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`relative h-10 w-10 flex items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer ${
                  plan === 'black'
                    ? 'bg-[#101318] hover:bg-[#141820] border-[rgba(255,255,255,0.08)] hover:border-[rgba(198,166,106,0.30)] text-[#C0BDB5] hover:text-[#F2F0EA] shadow-xs'
                    : 'bg-white/80 hover:bg-white border-slate-200/90 text-slate-600 hover:text-slate-900 shadow-2xs'
                }`}
                style={
                  plan === 'black'
                    ? {
                        backgroundColor: 'var(--be-bg-input, #101318)',
                        borderColor: 'var(--be-border-subtle, rgba(255, 255, 255, 0.08))',
                        color: 'var(--be-text-secondary, #C0BDB5)',
                      }
                    : undefined
                }
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-mono font-bold leading-none ring-2 ${
                      plan === 'black'
                        ? 'bg-[#C6A66A] text-[#101318] ring-[#101318]'
                        : 'bg-blue-600 text-white ring-white'
                    }`}
                    style={{
                      backgroundColor: plan === 'black' ? 'var(--be-accent, #C6A66A)' : '#8065F5',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  className={`absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-88 max-w-sm rounded-2xl border shadow-2xl p-3.5 z-50 animate-in fade-in slide-in-from-top-1 backdrop-blur-xl ${
                    plan === 'black'
                      ? 'bg-[#101318]/95 border-[rgba(255,255,255,0.10)] text-[#F2F0EA] shadow-black/80'
                      : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-900/10'
                  }`}
                  style={
                    plan === 'black'
                      ? {
                          backgroundColor: 'var(--be-bg-card, #101318)',
                          borderColor: 'var(--be-border-subtle, rgba(255, 255, 255, 0.10))',
                          color: 'var(--be-text-primary, #F2F0EA)',
                        }
                      : undefined
                  }
                >
                  <div className={`flex items-center justify-between pb-2.5 border-b ${plan === 'black' ? 'border-[rgba(255,255,255,0.08)]' : 'border-slate-100'}`}>
                    <span className={`font-bold text-[11px] uppercase tracking-wider font-mono ${plan === 'black' ? 'text-[#92949A]' : 'text-slate-500'}`}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className={`text-[11px] font-semibold hover:underline cursor-pointer ${plan === 'black' ? 'text-[#C6A66A]' : 'text-blue-600'}`}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className={`py-2 max-h-72 overflow-y-auto divide-y ${plan === 'black' ? 'divide-[rgba(255,255,255,0.06)]' : 'divide-slate-100'}`}>
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No notifications right now.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map(n => (
                        <div
                          key={n.id}
                          onClick={() => onMarkNotificationRead(n.id)}
                          className={`py-2.5 px-2.5 rounded-xl cursor-pointer transition ${
                            n.read
                              ? 'opacity-60'
                              : plan === 'black'
                              ? 'bg-white/[0.04] hover:bg-white/[0.07]'
                              : 'bg-blue-50/60 hover:bg-blue-50'
                          }`}
                        >
                          <div className={`text-xs font-semibold ${plan === 'black' ? 'text-[#F2F0EA]' : 'text-slate-900'}`}>{n.title}</div>
                          <div className={`text-[11px] mt-0.5 line-clamp-2 ${plan === 'black' ? 'text-[#92949A]' : 'text-slate-500'}`}>{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className={`pt-2 text-center border-t ${plan === 'black' ? 'border-[rgba(255,255,255,0.08)]' : 'border-slate-100'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        onSelectTab('notifications');
                      }}
                      className={`text-[11px] font-semibold hover:underline cursor-pointer ${plan === 'black' ? 'text-[#C6A66A]' : 'text-slate-800'}`}
                    >
                      View all in Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* C. User Profile Identity & Account Menu */}
            <div className="relative max-w-[calc(100vw-2rem)] flex items-center" ref={userMenuRef}>
              <ProfileIdentityComponent
                user={user}
                plan={plan}
                isFounderAccount={isFounderAccount}
                isAdmin={isAdmin}
                onSelectTab={onSelectTab}
                onOpenSettingsModal={onOpenSettingsModal}
                onOpenPrivacy={onOpenPrivacy}
                onOpenPricing={onOpenPricing}
                onOpenAbout={onOpenAbout}
                onOpenAdmin={onOpenAdmin}
                onLogout={onLogout}
                onUpdateUserPhoto={onUpdateUserPhoto}
              />
            </div>
          </div>
        </div>

        {/* Mobile Search Overlay Bar */}
        {mobileSearchOpen && (
          <div
            className={`md:hidden px-4 py-2.5 border-t transition-all duration-200 ${
              plan === 'black'
                ? 'bg-[#101318] border-[rgba(255,255,255,0.08)]'
                : 'bg-white/95 border-slate-200 shadow-xs'
            }`}
          >
            <GlobalSearchBar
              plan={plan}
              onSelectTab={tab => {
                onSelectTab(tab);
                setMobileSearchOpen(false);
              }}
              onSearch={() => {
                onSelectTab('jobs');
                setMobileSearchOpen(false);
              }}
              placeholder="Search opportunities, skills, companies..."
            />
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className={`mobile-nav-drawer lg:hidden border-b px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 shadow-md ${
            plan === 'black'
              ? 'bg-[#101318] border-[rgba(255,255,255,0.08)]'
              : 'bg-white/95 border-slate-200'
          }`}>
            {navGroups.map(grp => (
              <div key={grp.group} className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-3">
                  {grp.group}
                </span>
                {grp.items.map(item => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center px-3.5 py-3 rounded-xl text-xs font-semibold min-h-[44px] transition cursor-pointer ${
                        isActive
                          ? 'active bg-blue-600 text-white font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3 shrink-0" />
                      <span>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Main Workspace Body with Sidebar */}
      <div className="flex-1 flex w-full max-w-[1720px] mx-auto relative z-10">
        {/* Left Desktop Sidebar - Frosted Glass Navigation */}
        <aside
          data-user-sidebar="true"
          className={`hidden lg:flex flex-col border-r transition-all duration-300 relative select-none shrink-0 ${
            sidebarCollapsed ? 'w-20' : 'w-68'
          } ${
            plan === 'black'
              ? 'border-[var(--be-border-subtle,rgba(255,255,255,0.09))]'
              : 'border-[#E2E8F0] bg-[#F0F4F8] backdrop-blur-2xl dark:bg-[#111318]'
          }`}
          style={
            plan === 'black'
              ? {
                  backgroundColor: 'var(--be-bg-sidebar, #111318)',
                  borderColor: 'var(--be-border-subtle, rgba(255, 255, 255, 0.09))',
                }
              : undefined
          }
        >
          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-slate-700 shadow-xs flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:shadow-sm transition z-20 cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {/* Navigation Groups */}
          <div className="flex-1 py-6 px-3.5 space-y-6 overflow-y-auto scrollbar-none">
            {navGroups.map((grp) => (
              <div key={grp.group} className="space-y-1.5">
                {!sidebarCollapsed ? (
                  <h4 className="px-3 text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {grp.group}
                  </h4>
                ) : (
                  <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 mx-auto my-2" />
                )}

                <div className="space-y-1">
                  {grp.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isItemActive(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectTab(item.id)}
                        className={`user-nav-item w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group relative ${
                          isActive
                            ? plan === 'black'
                              ? 'active bg-[#181D26] border border-[rgba(255,255,255,0.12)] text-[#F2F0EA] shadow-xs font-bold'
                              : 'active bg-white border border-blue-200/80 text-blue-700 shadow-2xs font-bold'
                            : plan === 'black'
                            ? 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#15181F]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                        }`}
                        title={sidebarCollapsed ? item.label : undefined}
                        aria-label={item.label}
                      >
                        {/* Blue active-state indicator */}
                        {isActive && (
                          <span
                            className={`active-indicator absolute left-1 top-2 bottom-2 w-1 rounded-full ${
                              plan === 'black' ? 'bg-[var(--be-accent,#C6A66A)]' : 'bg-blue-600'
                            }`}
                          />
                        )}

                        <Icon
                          className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                            isActive
                              ? plan === 'black'
                                ? 'text-[var(--be-accent,#C6A66A)]'
                                : 'text-blue-600'
                              : plan === 'black'
                              ? 'text-[#92949A] group-hover:text-[#F2F0EA]'
                              : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />

                        {!sidebarCollapsed && (
                          <span className="ml-3 truncate">{item.label}</span>
                        )}

                        {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              plan === 'black'
                                ? 'bg-[var(--be-accent,#C6A66A)] text-black'
                                : 'bg-blue-600 text-white'
                            } shadow-2xs`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ${
                              plan === 'black' ? 'bg-[var(--be-accent,#C6A66A)]' : 'bg-blue-600'
                            } ring-2 ring-white dark:ring-[#111318]`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer Info */}
          {!sidebarCollapsed && (
            <div className="p-4 mx-3 mb-4 rounded-2xl bg-white/60 border border-white/80 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zero-Hallucination Safe</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                100% truthful profile grounding with zero fabricated skills.
              </p>
            </div>
          )}
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Preserves strict accessibility & test classes) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden sticky bottom-0 z-40 bg-white/85 backdrop-blur-xl border-t border-white/80 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-around px-2 py-1.5"
      >
        {[
          { id: 'overview' as const, label: 'Home', icon: LayoutDashboard },
          { id: 'jobs' as const, label: 'Jobs', icon: Search },
          { id: 'matches' as const, label: 'Matches', icon: Sparkles },
          { id: 'applications' as const, label: 'Tracker', icon: Briefcase },
          { id: 'profile' as const, label: 'Profile', icon: User },
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[44px] min-w-[48px] flex flex-col items-center justify-center rounded-xl px-2 py-1 transition-colors cursor-pointer ${
                isActive ? 'text-[#8065F5] font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
