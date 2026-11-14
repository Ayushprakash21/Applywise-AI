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
import { AuthUser } from '../services/api.ts';
import { NotificationItem, AutomationSettings, AccountUsageStats } from '../types/index.ts';
import { isPermanentFreeAccessAccount } from '../config/freeAccess.ts';
import { ProfileIdentityComponent } from './ProfileIdentityComponent.tsx';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isFounderAccount = isPermanentFreeAccessAccount(user);
  const isAdmin = user.role === 'admin';

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

  const navGroups: Array<{ group: string; items: NavItem[] }> = [
    {
      group: 'CAREER INTELLIGENCE & WORKSPACE',
      items: [
        { id: 'desk' as const, label: 'Career Desk', icon: LayoutDashboard },
        { id: 'autopilot' as const, label: 'AI Autopilot', icon: Bot },
        { id: 'radar' as const, label: 'Opportunity Radar', icon: Radio },
        { id: 'control' as const, label: 'Application Control', icon: Briefcase },
        { id: 'interview_studio' as const, label: 'Interview Studio', icon: Calendar },
        { id: 'recruiter_review' as const, label: 'Recruiter Review', icon: ShieldCheck },
        { id: 'atlas' as const, label: 'Career Atlas', icon: Map },
        { id: 'hr_outreach' as const, label: 'AI HR Outreach', icon: Send },
      ],
    },
    {
      group: 'CAREER OPERATIONS & PROFILE',
      items: [
        { id: 'profile' as const, label: 'Career Profile & Facts', icon: User },
        { id: 'resume_studio' as const, label: 'Resume Studio', icon: FileCheck },
        { id: 'career_report' as const, label: 'Skills & Gap Report', icon: BarChart3 },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [
        { id: 'notifications' as const, label: 'Notifications', icon: Bell, badge: unreadCount },
        { id: 'settings' as const, label: 'Settings', icon: Sliders },
        { id: 'subscription' as const, label: 'Membership & Billing', icon: Award },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#E9EEF6] text-slate-800 flex flex-col font-sans selection:bg-violet-200 selection:text-violet-900 relative">
      {/* Ambient Flowing Background (matching authentication experience) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute -top-[10%] right-[15%] w-[680px] h-[680px] rounded-full bg-gradient-to-br from-indigo-300/15 via-purple-300/10 to-transparent blur-[140px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[640px] h-[640px] rounded-full bg-gradient-to-tr from-blue-300/15 via-sky-200/20 to-transparent blur-[130px]" />
      </div>

      {/* Top Fixed Header - Frosted Translucent Glass */}
      <header className="sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-white/80 transition-colors shadow-2xs">
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

            <BrandLogo
              variant={plan === 'black' ? 'dark' : 'light'}
              size="md"
              badge={plan === 'black' ? 'ELITE' : undefined}
              onClick={() => onSelectTab('overview')}
              className="cursor-pointer"
            />
          </div>

          {/* Center: Command / Search Navigation */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div
              onClick={() => onSelectTab('jobs')}
              className="w-full px-4 py-2 rounded-2xl bg-white/65 hover:bg-white/85 border border-white/90 text-xs text-slate-400 flex items-center justify-between shadow-2xs transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <Search className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 font-medium">Search verified opportunities, skills, companies...</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-600 font-semibold border border-slate-300/50">
                ⌘K
              </span>
            </div>
          </div>

          {/* Right Toolbar */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Safe Mode Indicator */}
            <button
              type="button"
              onClick={onToggleEmergencyStop}
              className={`hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-2xs transition cursor-pointer ${
                settings?.emergencyStop
                  ? 'bg-rose-50/90 border-rose-200 text-rose-700'
                  : 'bg-emerald-50/90 border-emerald-200 text-emerald-700'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${settings?.emergencyStop ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span>{settings?.emergencyStop ? 'Paused' : 'Active Safe'}</span>
            </button>

            {/* Notifications Button & Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2.5 rounded-xl bg-white/70 hover:bg-white border border-white/85 text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#8065F5] ring-2 ring-white animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2.5 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-3xl bg-white/85 backdrop-blur-2xl border border-white/90 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-800 font-mono">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] font-semibold text-[#8065F5] hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="py-2 max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No notifications right now.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map(n => (
                        <div
                          key={n.id}
                          onClick={() => onMarkNotificationRead(n.id)}
                          className={`py-2.5 px-2.5 rounded-xl cursor-pointer transition ${n.read ? 'opacity-60' : 'bg-blue-50/60 hover:bg-blue-50'}`}
                        >
                          <div className="text-xs font-semibold text-slate-900">{n.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="pt-2 text-center border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        onSelectTab('notifications');
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      View all in Notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Identity & Account Menu */}
            <div className="relative max-w-[calc(100vw-2rem)]" ref={userMenuRef}>
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
      </header>

      {/* Main Workspace Body with Sidebar */}
      <div className="flex-1 flex w-full max-w-[1720px] mx-auto relative z-10">
        {/* Left Desktop Sidebar - Frosted Glass Navigation */}
        <aside
          className={`hidden lg:flex flex-col border-r border-white/80 bg-white/55 backdrop-blur-2xl transition-all duration-300 relative select-none ${
            sidebarCollapsed ? 'w-20' : 'w-68'
          }`}
        >
          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:shadow-sm transition z-20 cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {/* Navigation Groups */}
          <div className="flex-1 py-6 px-3.5 space-y-6 overflow-y-auto scrollbar-none">
            {navGroups.map((grp) => (
              <div key={grp.group} className="space-y-1.5">
                {!sidebarCollapsed && (
                  <h4 className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    {grp.group}
                  </h4>
                )}

                <div className="space-y-1">
                  {grp.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectTab(item.id)}
                        className={`w-full flex items-center px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-[#8065F5]/15 border border-violet-400/30 text-blue-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        {/* Active vertical glow indicator */}
                        {isActive && (
                          <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-blue-600 to-[#8065F5]" />
                        )}

                        <Icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                          isActive ? 'text-[#8065F5]' : 'text-slate-400 group-hover:text-slate-700'
                        }`} />

                        {!sidebarCollapsed && (
                          <span className="ml-3 truncate">{item.label}</span>
                        )}

                        {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#8065F5] text-white">
                            {item.badge}
                          </span>
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
