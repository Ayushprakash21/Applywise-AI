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
  KeyRound
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { AuthUser } from '../services/api.ts';
import { NotificationItem, AutomationSettings, AccountUsageStats } from '../types/index.ts';
import { isPermanentFreeAccessAccount } from '../config/freeAccess.ts';

export type DashboardTab =
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

interface DashboardShellProps {
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
  plan?: 'free' | 'pro';
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
      group: 'WORKSPACE',
      items: [
        { id: 'overview' as const, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'profile' as const, label: 'Career Profile', icon: User },
        { id: 'resume_intelligence' as const, label: 'Resume Intelligence', icon: FileText },
        { id: 'jobs' as const, label: 'Find Jobs', icon: Search },
        { id: 'matches' as const, label: 'Job Matches', icon: Sparkles },
        { id: 'applications' as const, label: 'My Applications', icon: Briefcase },
        { id: 'interviews' as const, label: 'Interview Prep', icon: Calendar },
      ],
    },
    {
      group: 'CAREER INTELLIGENCE',
      items: [
        { id: 'copilot' as const, label: 'AI Career Assistant', icon: Bot },
        { id: 'resume_studio' as const, label: 'Resume Studio', icon: FileCheck },
        { id: 'career_report' as const, label: 'Skills & Gap Report', icon: BarChart3 },
        { id: 'career_twin' as const, label: 'Career Twin', icon: Shield },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [
        { id: 'notifications' as const, label: 'Notifications', icon: Bell, badge: unreadCount },
        { id: 'settings' as const, label: 'Settings', icon: Sliders },
        { id: 'subscription' as const, label: 'Subscription Plan', icon: Award },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#E9EDF3] neu-bg text-slate-800 flex flex-col font-sans">
      {/* Top Fixed Header - Clean Consumer SaaS Header */}
      <header className="sticky top-0 z-40 bg-[#EEF2F7]/95 backdrop-blur-md border-b border-slate-300/60 transition-colors shadow-xs">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Mobile Toggle */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
              aria-label="Toggle Navigation Drawer"
            >
              {mobileMenuOpen ? <CloseIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <BrandLogo
              variant="light"
              size="sm"
              onClick={() => onSelectTab('overview')}
            />
          </div>

          {/* Right Toolbar */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Safe Mode Indicator */}
            <button
              onClick={onToggleEmergencyStop}
              className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                settings?.emergencyStop
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${settings?.emergencyStop ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span>{settings?.emergencyStop ? 'Paused' : 'Active Safe'}</span>
            </button>

            {/* Notifications Button & Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="py-2 max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No notifications right now.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map(n => (
                        <div
                          key={n.id}
                          onClick={() => onMarkNotificationRead(n.id)}
                          className={`py-2.5 px-2 rounded-lg cursor-pointer transition ${n.read ? 'opacity-60' : 'bg-blue-50/50'}`}
                        >
                          <div className="text-xs font-semibold text-slate-900">{n.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 transition text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                    {user.fullName || 'User'}
                  </div>
                  <div className="text-[10px] text-blue-600 font-semibold">
                    {isFounderAccount ? 'PRO · FOUNDER' : plan.toUpperCase()}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <div className="font-bold text-slate-900 truncate">{user.fullName}</div>
                    <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                  </div>

                  {isAdmin && onOpenAdmin && (
                    <button
                      onClick={() => { setUserMenuOpen(false); onOpenAdmin(); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-amber-700 hover:bg-amber-50 font-semibold flex items-center space-x-2"
                    >
                      <KeyRound className="h-4 w-4" />
                      <span>Admin Console</span>
                    </button>
                  )}

                  <button
                    onClick={() => { setUserMenuOpen(false); onOpenSettingsModal(); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center space-x-2"
                  >
                    <Sliders className="h-4 w-4" />
                    <span>Account Settings</span>
                  </button>

                  <button
                    onClick={() => { setUserMenuOpen(false); onOpenPricing(); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center space-x-2"
                  >
                    <Award className="h-4 w-4" />
                    <span>Subscription Plan</span>
                  </button>

                  <button
                    onClick={() => { setUserMenuOpen(false); onOpenPrivacy(); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center space-x-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Privacy & Data Rights</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => { setUserMenuOpen(false); onLogout(); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace with Responsive Sidebar */}
      <div className="flex-1 flex w-full">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-300/60 bg-[#EEF2F7] transition-all duration-300 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <div className="p-4 flex-1 space-y-6 overflow-y-auto">
            {navGroups.map(grp => (
              <div key={grp.group} className="space-y-1">
                {!sidebarCollapsed && (
                  <div className="px-3 text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
                    {grp.group}
                  </div>
                )}
                {grp.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center rounded-xl transition font-medium text-xs ${
                        sidebarCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 space-x-3'
                      } ${
                        isActive
                          ? 'neu-inset text-blue-600 font-bold border border-blue-200/50'
                          : 'text-slate-600 hover:text-slate-900 hover:neu-raised'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      {!sidebarCollapsed && Boolean(item.badge && item.badge > 0) && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Collapse Toggle */}
          <div className="p-3 border-t border-slate-200/80">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full py-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition flex items-center justify-center text-xs"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="space-y-6 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <BrandLogo variant="light" size="sm" />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                </div>

                {navGroups.map(grp => (
                  <div key={grp.group} className="space-y-1">
                    <div className="px-2 text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                      {grp.group}
                    </div>
                    {grp.items.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center px-3 py-2.5 rounded-xl space-x-3 text-xs font-medium ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/80 shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                  className="w-full py-2.5 rounded-xl bg-rose-50 text-rose-600 font-semibold text-xs flex items-center justify-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Quick 1-touch navigation) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around text-[10px] text-slate-500 shadow-lg">
        <button
          onClick={() => onSelectTab('overview')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 px-2 rounded-xl transition ${activeTab === 'overview' ? 'text-blue-600 font-bold bg-blue-50' : 'hover:text-slate-900'}`}
          aria-label="Dashboard Overview"
        >
          <LayoutDashboard className="h-4 w-4 mb-0.5" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => onSelectTab('jobs')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 px-2 rounded-xl transition ${activeTab === 'jobs' ? 'text-blue-600 font-bold bg-blue-50' : 'hover:text-slate-900'}`}
          aria-label="Find Jobs"
        >
          <Search className="h-4 w-4 mb-0.5" />
          <span>Jobs</span>
        </button>
        <button
          onClick={() => onSelectTab('applications')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 px-2 rounded-xl transition ${activeTab === 'applications' ? 'text-blue-600 font-bold bg-blue-50' : 'hover:text-slate-900'}`}
          aria-label="Applications Tracker"
        >
          <Briefcase className="h-4 w-4 mb-0.5" />
          <span>Tracker</span>
        </button>
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 px-2 rounded-xl transition ${activeTab === 'profile' ? 'text-blue-600 font-bold bg-blue-50' : 'hover:text-slate-900'}`}
          aria-label="Career Profile"
        >
          <User className="h-4 w-4 mb-0.5" />
          <span>Profile</span>
        </button>
        <button
          onClick={() => onSelectTab('copilot')}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] py-1 px-2 rounded-xl transition ${activeTab === 'copilot' ? 'text-blue-600 font-bold bg-blue-50' : 'hover:text-slate-900'}`}
          aria-label="AI Career Assistant"
        >
          <Bot className="h-4 w-4 mb-0.5" />
          <span>Assistant</span>
        </button>
      </nav>
    </div>
  );
};
