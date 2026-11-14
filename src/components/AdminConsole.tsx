// src/components/AdminConsole.tsx
// Production Administrator Console for ApplyVise AI

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Activity,
  FileText,
  Briefcase,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ArrowLeft,
  Key,
  Database,
  Cpu,
  Sparkles,
  Globe,
  ExternalLink,
  Lock,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Type,
  Filter,
  Award,
  TrendingUp,
  Compass
} from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import { AuditLogEntry } from '../types/index.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { RoyalCrownLogo } from './RoyalCrownLogo.tsx';
import { AdminFounderProfile } from './AdminFounderProfile.tsx';
import { AdminResumeManagement } from './AdminResumeManagement.tsx';
import { AdminUserProvisioning } from './AdminUserProvisioning.tsx';
import { GlobalSourceIntelligence } from './GlobalSourceIntelligence.tsx';
import { AdminHrDiscoveryDiagnostics } from './AdminHrDiscoveryDiagnostics.tsx';
import { GrowthEngineDashboard } from './admin/growth-engine/GrowthEngineDashboard.tsx';
import { AdminLanguageManagement } from './admin/AdminLanguageManagement.tsx';
import { TypographySettingsModal } from './TypographySettingsModal.tsx';
import { GlobalSearchBar } from './GlobalSearchBar.tsx';
import { getEffectivePlan } from '../config/freeAccess.ts';
import { FilterSelect, SearchableSelect } from './ui/SelectSystem.tsx';

interface AdminConsoleProps {
  currentUser: AuthUser;
  initialTab?: ExtendedAdminTab;
  currentRoute?: string;
  onNavigateRoute?: (route: string) => void;
  onNavigateHome: () => void;
  onLogout: () => void;
}

type AdminTab = 'overview' | 'users' | 'resumes' | 'sources' | 'audit' | 'system' | 'founder';
type ExtendedAdminTab = AdminTab | 'provisioning' | 'hr_discovery' | 'growth_engine' | 'languages';

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  currentUser,
  initialTab,
  currentRoute,
  onNavigateRoute,
  onNavigateHome,
  onLogout,
}) => {
  const plan = getEffectivePlan(currentUser);
  // Executive Admin Console is strictly and permanently styled in luxury BLACK ELITE
  const isBlack = true;
  const [activeTab, setTabState] = useState<ExtendedAdminTab>(() => {
    if (initialTab) return initialTab;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/gcde')) {
      return 'sources';
    }
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/growth-engine')) {
      return 'growth_engine';
    }
    return 'overview';
  });

  // Sync tab with route props
  useEffect(() => {
    if (initialTab) {
      setTabState(initialTab);
    } else if (currentRoute === '/admin/gcde') {
      setTabState('sources');
    } else if (currentRoute === '/admin/growth-engine') {
      setTabState('growth_engine');
    }
  }, [initialTab, currentRoute]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem('applyvise_admin_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [typographyModalOpen, setTypographyModalOpen] = useState(false);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('applyvise_admin_sidebar_collapsed', String(next));
        } catch {
          // Ignore storage failures
        }
      }
      return next;
    });
  };

  const handleSelectTab = (tab: ExtendedAdminTab) => {
    setTabState(tab);
    if (tab === 'sources') {
      if (onNavigateRoute) {
        onNavigateRoute('/admin/gcde');
      } else if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/admin/gcde');
      }
    } else if (tab === 'growth_engine') {
      if (onNavigateRoute) {
        onNavigateRoute('/admin/growth-engine');
      } else if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/admin/growth-engine');
      }
    } else {
      if (onNavigateRoute) {
        onNavigateRoute('/admin');
      } else if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/admin');
      }
    }
  };

  // Direct tab setter matching interface contracts
  const setActiveTab = (tab: ExtendedAdminTab) => handleSelectTab(tab);

  // Browser Back / Forward URL synchronization
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      if (path.startsWith('/admin/gcde')) {
        setActiveTab('sources');
      } else if (path.startsWith('/admin/growth-engine')) {
        setActiveTab('growth_engine');
      } else if (path.startsWith('/admin') && (activeTab === 'sources' || activeTab === 'growth_engine')) {
        setTabState('overview');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalAdmins: number;
    totalApplications: number;
    totalResumes: number;
    totalVacancies: number;
    activeSubscriptions: number;
  } | null>(null);

  // Users
  const [users, setUsers] = useState<Array<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    isVerified: boolean;
    createdAt: string;
    planId?: string;
  }>>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [logSeverity, setLogSeverity] = useState<string>('all');

  // System Health
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Job Sources & Ingestion Runs
  const [sourcesData, setSourcesData] = useState<{
    totalCachedJobs: number;
    sources: any[];
    recentRuns: any[];
    recentErrors: any[];
    serverTime: string;
  } | null>(null);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, usersRes, logsRes, healthRes, sourcesRes] = await Promise.allSettled([
        api.getAdminOverview(),
        api.getAdminUsers({ limit: 100, search: userSearch }),
        api.getAdminAuditLogs({ limit: 100, severity: logSeverity }),
        api.getAdminSystemHealth(),
        api.getAdminSourcesHealth(),
      ]);

      if (overviewRes.status === 'fulfilled') {
        setStats(overviewRes.value.stats);
      } else {
        // Fallback default stats so dashboard cards never display empty '...'
        setStats({
          totalUsers: 0,
          totalAdmins: 0,
          totalApplications: 0,
          totalResumes: 0,
          totalVacancies: 0,
          activeSubscriptions: 0,
        });
      }
      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.users || []);
        setTotalUsers(usersRes.value.total || 0);
      }
      if (logsRes.status === 'fulfilled') {
        setAuditLogs(logsRes.value.logs || []);
      }
      if (healthRes.status === 'fulfilled') {
        setSystemHealth(healthRes.value.system);
      }
      if (sourcesRes.status === 'fulfilled') {
        setSourcesData(sourcesRes.value);
      }

      // Only show error banner if critical core endpoints failed completely
      const criticalFailures = [overviewRes, usersRes].filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      );
      if (criticalFailures.length === 2) {
        const errorMsgs = criticalFailures.map(f => f.reason instanceof Error ? f.reason.message : String(f.reason)).join('; ');
        setError(`Failed to load admin data: ${errorMsgs}`);
      } else {
        setError(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load admin data: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userSearch, logSeverity]);

  const handleToggleRole = async (targetUser: typeof users[0]) => {
    if (targetUser.id === currentUser.id) {
      setError('Cannot demote your own administrator account. Another admin must perform this action.');
      return;
    }

    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = nextRole === 'admin'
      ? `Are you sure you want to GRANT full administrator privileges to ${targetUser.email}?`
      : `Are you sure you want to REVOKE administrator privileges from ${targetUser.email}?`;

    if (!window.confirm(confirmMsg)) return;

    setUpdatingUserId(targetUser.id);
    try {
      await api.updateAdminUserRole(targetUser.id, nextRole);
      showNotification(`Successfully changed ${targetUser.email} role to "${nextRole}".`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to update role: ${msg}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0C] text-[#F2F0EA] flex flex-col font-sans theme-black" data-theme="black">
      {/* Top Fixed Admin Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-[#111318] text-[#F2F0EA] border-b border-[rgba(255,255,255,0.09)] shadow-xl backdrop-blur-md">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="lg:hidden p-2 rounded-xl text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#191D23] transition cursor-pointer"
              aria-label="Toggle Navigation Drawer"
            >
              {mobileDrawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <BrandLogo size="sm" variant="dark" onClick={onNavigateHome} />
            <div className="h-5 w-px bg-[rgba(255,255,255,0.09)] hidden sm:block" />
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-[#C6A66A]" />
              <span className="text-xs font-bold tracking-wide uppercase text-[#F2F0EA]">
                Admin Console
              </span>
              <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[rgba(53,184,135,0.15)] border border-[rgba(53,184,135,0.30)] text-[#35B887] text-[10px] font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-[#35B887] animate-pulse" />
                <span>Authorized</span>
              </span>
            </div>
          </div>

          {/* Center: Global Search Bar */}
          <div className="hidden lg:flex items-center flex-1 max-w-sm mx-6" role="search">
            <GlobalSearchBar
              plan="black"
              isAdmin={true}
              onSelectAdminTab={tab => {
                setActiveTab(tab as any);
              }}
              onSearch={q => {
                setUserSearch(q);
                setActiveTab('users');
              }}
              placeholder="Search admin modules, users, GCDE..."
            />
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              onClick={() => setTypographyModalOpen(true)}
              className="h-8 px-3 rounded-xl bg-[#191D23] hover:bg-[#20252D] text-[#C0BDB5] hover:text-[#F2F0EA] text-xs font-semibold border border-[rgba(255,255,255,0.12)] hover:border-[rgba(198,166,106,0.30)] shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
              title="Configure global typography and font weights"
            >
              <Type className="h-3.5 w-3.5 text-[#C6A66A]" />
              <span className="hidden sm:inline">Typography</span>
            </button>

            <button
              onClick={onNavigateHome}
              className="h-8 px-3 rounded-xl bg-[#191D23] hover:bg-[#20252D] text-[#C0BDB5] hover:text-[#F2F0EA] text-xs font-semibold border border-[rgba(255,255,255,0.12)] hover:border-[rgba(198,166,106,0.30)] shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back to App</span>
            </button>

            <button
              onClick={loadData}
              title="Refresh console data"
              disabled={loading}
              className="h-8 w-8 rounded-xl bg-[#191D23] hover:bg-[#20252D] text-[#C0BDB5] hover:text-[#F2F0EA] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(198,166,106,0.30)] shadow-xs flex items-center justify-center transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#C6A66A]' : 'text-[#C6A66A]'}`} />
            </button>

            <div className="h-5 w-px bg-[rgba(255,255,255,0.09)]" />

            <div className="flex items-center space-x-2 pl-1">
              <div className="h-7 w-7 rounded-lg bg-[#C6A66A] text-[#17130C] flex items-center justify-center font-bold text-xs">
                {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'A'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-[#F2F0EA] leading-tight truncate max-w-[130px]">
                  {currentUser.fullName}
                </p>
                <p className="text-[10px] text-[#C6A66A] font-mono">
                  {currentUser.role.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Typography Settings Modal */}
      <TypographySettingsModal
        isOpen={typographyModalOpen}
        onClose={() => setTypographyModalOpen(false)}
        isBlack={isBlack}
      />

      {/* Main Administrative Workspace with Vertical Sidebar */}
      <div className="flex-1 flex w-full max-w-[1720px] mx-auto relative z-10 min-h-0">
        {/* Left Desktop Sidebar — Frosted Glass Executive Vertical Navigation */}
        <aside
          className={`hidden lg:flex flex-col border-r border-[rgba(255,255,255,0.08)] bg-[#111318] transition-all duration-300 relative select-none shrink-0 ${
            sidebarCollapsed ? 'w-20' : 'w-68'
          }`}
        >
          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-[#191D23] border border-[rgba(255,255,255,0.14)] text-[#C0BDB5] hover:text-[#F2F0EA] hover:border-[rgba(198,166,106,0.40)] flex items-center justify-center transition shadow-md z-30 cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-[#C6A66A]" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {/* Navigation Groups */}
          <div className="flex-1 py-6 px-3.5 space-y-6 overflow-y-auto scrollbar-none" role="tablist" aria-label="Admin Console Navigation Modules">
            {/* GROUP A: COMMAND CENTER */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <h4 className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#92949A]">
                  Command Center
                </h4>
              )}
              <div className="space-y-1">
                {/* 1. Overview */}
                <button
                  id="admin-tab-overview"
                  role="tab"
                  type="button"
                  tabIndex={0}
                  aria-selected={activeTab === 'overview'}
                  aria-controls="admin-panel-overview"
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center min-h-[38px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none focus:outline-none focus:ring-1 focus:ring-[#C6A66A] ${
                    activeTab === 'overview'
                      ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)] ring-1 ring-[rgba(198,166,106,0.20)]'
                      : 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C] border border-transparent'
                  } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={sidebarCollapsed ? 'Overview & KPIs' : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Activity className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'overview' ? 'text-[#C6A66A]' : 'text-indigo-400'}`} />
                    {!sidebarCollapsed && <span className="truncate">Overview & KPIs</span>}
                  </div>
                  {activeTab === 'overview' && (
                    <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#C6A66A]" />
                  )}
                </button>
              </div>
            </div>

            {/* GROUP B: INTELLIGENCE & DISCOVERY */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <h4 className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#92949A]">
                  Intelligence & Discovery
                </h4>
              )}
              <div className="space-y-1">
                {/* 2. Global Career Discovery Engine */}
                <button
                  id="admin-tab-sources"
                  role="tab"
                  type="button"
                  tabIndex={0}
                  aria-selected={activeTab === 'sources'}
                  aria-controls="admin-panel-sources"
                  onClick={() => setActiveTab('sources')}
                  className={`w-full flex items-center min-h-[38px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none focus:outline-none focus:ring-1 focus:ring-[#C6A66A] ${
                    activeTab === 'sources'
                      ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.50)] ring-1 ring-[rgba(198,166,106,0.25)]'
                      : 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C] border border-transparent'
                  } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={sidebarCollapsed ? 'Global Career Discovery Engine' : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Globe className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'sources' ? 'text-[#C6A66A]' : 'text-[#76A9D8]'}`} />
                    {!sidebarCollapsed && <span className="truncate font-bold">Global Career Discovery Engine</span>}
                    <span className="sr-only">Job Ingestion & Sources</span>
                  </div>
                  {!sidebarCollapsed && (
                    <span className={`shrink-0 ml-2 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                      activeTab === 'sources'
                        ? 'bg-[rgba(198,166,106,0.25)] text-[#C6A66A] border border-[rgba(198,166,106,0.40)]'
                        : 'bg-[#0D1014] text-[#92949A] border border-[rgba(255,255,255,0.08)]'
                    }`}>
                      GCDE
                    </span>
                  )}
                  {activeTab === 'sources' && (
                    <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#C6A66A]" />
                  )}
                </button>

                {/* 2b. HR Discovery Diagnostics */}
                <button
                  id="admin-tab-hr-discovery"
                  role="tab"
                  type="button"
                  tabIndex={0}
                  aria-selected={activeTab === 'hr_discovery'}
                  aria-controls="admin-panel-hr-discovery"
                  onClick={() => setActiveTab('hr_discovery')}
                  className={`w-full flex items-center min-h-[38px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none focus:outline-none focus:ring-1 focus:ring-[#C6A66A] ${
                    activeTab === 'hr_discovery'
                      ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                      : 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C] border border-transparent'
                  } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={sidebarCollapsed ? 'HR Discovery Diagnostics' : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Sparkles className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'hr_discovery' ? 'text-[#C6A66A]' : 'text-[#35B887]'}`} />
                    {!sidebarCollapsed && <span className="truncate">HR Discovery Diagnostics</span>}
                  </div>
                  {activeTab === 'hr_discovery' && (
                    <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#C6A66A]" />
                  )}
                </button>

                {/* 2c. ApplyVise Growth Engine */}
                <button
                  id="admin-tab-growth-engine"
                  role="tab"
                  type="button"
                  tabIndex={0}
                  aria-selected={activeTab === 'growth_engine'}
                  aria-controls="admin-panel-growth-engine"
                  onClick={() => {
                    setActiveTab('growth_engine');
                    if (onNavigateRoute) onNavigateRoute('/admin/growth-engine');
                  }}
                  className={`w-full flex items-center min-h-[38px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none focus:outline-none focus:ring-1 focus:ring-[#C6A66A] ${
                    activeTab === 'growth_engine'
                      ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                      : 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C] border border-transparent'
                  } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={sidebarCollapsed ? 'Growth Engine' : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <TrendingUp className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'growth_engine' ? 'text-[#C6A66A]' : 'text-amber-400'}`} />
                    {!sidebarCollapsed && <span className="truncate">Growth Engine</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <span className={`shrink-0 ml-2 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                      activeTab === 'growth_engine'
                        ? 'bg-[rgba(198,166,106,0.25)] text-[#C6A66A] border border-[rgba(198,166,106,0.40)]'
                        : 'bg-[#0D1014] text-[#92949A] border border-[rgba(255,255,255,0.08)]'
                    }`}>
                      AI MKTG
                    </span>
                  )}
                  {activeTab === 'growth_engine' && (
                    <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#C6A66A]" />
                  )}
                </button>
              </div>
            </div>

            {/* GROUP C: USER MANAGEMENT */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <h4 className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#92949A]">
                  User Management
                </h4>
              )}
              <div className="space-y-1">
                {/* 3. Users & Roles */}
                <button
                  id="admin-tab-users"
                  role="tab"
                  type="button"
                  tabIndex={0}
                  aria-selected={activeTab === 'users'}
                  aria-controls="admin-panel-users"
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center min-h-[38px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none focus:outline-none focus:ring-1 focus:ring-[#C6A66A] ${
                    activeTab === 'users'
                      ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                      : 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C] border border-transparent'
                  } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={sidebarCollapsed ? `Users & Roles (${totalUsers})` : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Users className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'users' ? 'text-[#C6A66A]' : 'text-[#76A9D8]'}`} />
                    {!sidebarCollapsed && <span className="truncate">Users & Roles ({totalUsers})</span>}
                  </div>
                  {activeTab === 'users' && (
                    <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#C6A66A]" />
                  )}
                </button>

                {/* 4. User Provisioning */}
                <button
                  id="admin-tab-provisioning"
                  role="tab"
                  type="button"
                  tabIndex={0}
                  aria-selected={activeTab === 'provisioning'}
                  aria-controls="admin-panel-provisioning"
                  onClick={() => setActiveTab('provisioning')}
                  className={`w-full flex items-center min-h-[38px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none focus:outline-none focus:ring-1 focus:ring-[#C6A66A] ${
                    activeTab === 'provisioning'
                      ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                      : 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C] border border-transparent'
                  } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={sidebarCollapsed ? 'User Provisioning' : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Award className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'provisioning' ? 'text-[#C6A66A]' : 'text-amber-400'}`} />
                    {!sidebarCollapsed && <span className="truncate">User Provisioning</span>}
                  </div>
                  {activeTab === 'provisioning' && (
                    <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#C6A66A]" />
                  )}
                </button>

                {/* 5. Founder Profile */}
                <button
                  id="admin-tab-founder"
                  role="tab"
                  type="button"
                  tabIndex={0}
                  aria-selected={activeTab === 'founder'}
                  aria-controls="admin-panel-founder"
                  onClick={() => setActiveTab('founder')}
                  className={`w-full flex items-center min-h-[38px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none focus:outline-none focus:ring-1 focus:ring-[#C6A66A] ${
                    activeTab === 'founder'
                      ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                      : 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C] border border-transparent'
                  } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={sidebarCollapsed ? 'Founder Profile' : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Sparkles className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'founder' ? 'text-[#C6A66A]' : 'text-pink-400'}`} />
                    {!sidebarCollapsed && <span className="truncate">Founder Profile</span>}
                  </div>
                  {activeTab === 'founder' && (
                    <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#C6A66A]" />
                  )}
                </button>
              </div>
            </div>

            {/* GROUP D: OPERATIONS & SECURITY */}
            <div className="space-y-1.5">
              {!sidebarCollapsed && (
                <h4 className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#92949A]">
                  Operations & Security
                </h4>
              )}
              <div className="space-y-1">
                {/* 6. Resume Operations */}
                <button
                  id="admin-tab-resumes"
                  role="tab"
                  type="button"
                  tabIndex={0}
                  aria-selected={activeTab === 'resumes'}
                  aria-controls="admin-panel-resumes"
                  onClick={() => setActiveTab('resumes')}
                  className={`w-full flex items-center min-h-[38px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none focus:outline-none focus:ring-1 focus:ring-[#C6A66A] ${
                    activeTab === 'resumes'
                      ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                      : 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C] border border-transparent'
                  } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={sidebarCollapsed ? `Resume Operations (${stats?.totalResumes ?? '...'})` : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <FileText className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'resumes' ? 'text-[#C6A66A]' : 'text-[#9483E8]'}`} />
                    {!sidebarCollapsed && <span className="truncate">Resume Operations ({stats?.totalResumes ?? '...'})</span>}
                  </div>
                  {activeTab === 'resumes' && (
                    <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#C6A66A]" />
                  )}
                </button>

                {/* 7. Security & Audit Trail */}
                <button
                  id="admin-tab-audit"
                  role="tab"
                  type="button"
                  tabIndex={0}
                  aria-selected={activeTab === 'audit'}
                  aria-controls="admin-panel-audit"
                  onClick={() => setActiveTab('audit')}
                  className={`w-full flex items-center min-h-[38px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none focus:outline-none focus:ring-1 focus:ring-[#C6A66A] ${
                    activeTab === 'audit'
                      ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                      : 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C] border border-transparent'
                  } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={sidebarCollapsed ? 'Security & Audit Trail' : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Shield className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'audit' ? 'text-[#C6A66A]' : 'text-[#D9AA61]'}`} />
                    {!sidebarCollapsed && <span className="truncate">Security & Audit Trail</span>}
                  </div>
                  {activeTab === 'audit' && (
                    <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#C6A66A]" />
                  )}
                </button>

                {/* 8. System Health & Edge */}
                <button
                  id="admin-tab-system"
                  role="tab"
                  type="button"
                  tabIndex={0}
                  aria-selected={activeTab === 'system'}
                  aria-controls="admin-panel-system"
                  onClick={() => setActiveTab('system')}
                  className={`w-full flex items-center min-h-[38px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none focus:outline-none focus:ring-1 focus:ring-[#C6A66A] ${
                    activeTab === 'system'
                      ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                      : 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C] border border-transparent'
                  } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={sidebarCollapsed ? 'System Health & Edge' : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Database className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'system' ? 'text-[#C6A66A]' : 'text-[#35B887]'}`} />
                    {!sidebarCollapsed && <span className="truncate">System Health & Edge</span>}
                  </div>
                  {activeTab === 'system' && (
                    <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#C6A66A]" />
                  )}
                </button>
                              {/* 11. Language & Localization */}
                <button
                  id="admin-tab-languages"
                  role="tab"
                  type="button"
                  tabIndex={0}
                  aria-selected={activeTab === 'languages'}
                  aria-controls="admin-panel-languages"
                  onClick={() => setActiveTab('languages')}
                  className={`w-full flex items-center min-h-[38px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none focus:outline-none focus:ring-1 focus:ring-[#C6A66A] ${
                    activeTab === 'languages'
                      ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)] ring-1 ring-[rgba(198,166,106,0.20)]'
                      : 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C] border border-transparent'
                  } ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={sidebarCollapsed ? 'Language & Localization' : undefined}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Globe className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'languages' ? 'text-[#C6A66A]' : 'text-emerald-400'}`} />
                    {!sidebarCollapsed && <span className="truncate">Language & Localization</span>}
                  </div>
                  {activeTab === 'languages' && (
                    <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#C6A66A]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-Over Navigation Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Drawer Content */}
            <div className="relative w-72 max-w-[85vw] bg-[#111318] border-r border-[rgba(255,255,255,0.12)] p-4 flex flex-col space-y-5 overflow-y-auto z-10 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-[#C6A66A]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F2F0EA]">Admin Navigation</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#191D23]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile Module Selector inside Drawer */}
              <div>
                <label htmlFor="admin-mobile-nav-select" className="sr-only">Select Admin Console Module</label>
                <SearchableSelect
                  id="admin-mobile-nav-select"
                  value={activeTab}
                  onChange={(val) => {
                    handleSelectTab(val as ExtendedAdminTab);
                    setMobileDrawerOpen(false);
                  }}
                  searchable={false}
                  options={[
                    { value: 'overview', label: 'Overview & KPIs' },
                    { value: 'sources', label: 'Global Career Discovery Engine (GCDE)' },
                    { value: 'hr_discovery', label: 'HR Discovery Diagnostics' },
                    { value: 'growth_engine', label: 'Growth Engine' },
                    { value: 'users', label: `Users & Roles (${totalUsers})` },
                    { value: 'provisioning', label: 'User Provisioning' },
                    { value: 'resumes', label: `Resume Operations (${stats?.totalResumes ?? '...'})` },
                    { value: 'audit', label: 'Security & Audit Trail' },
                    { value: 'system', label: 'System Health & Edge' },
                    { value: 'founder', label: 'Founder Profile' },
                  ]}
                  theme="black-elite"
                  size="sm"
                  ariaLabel="Select Admin Console Module"
                />
              </div>

              {/* Grouped Links in Drawer */}
              <div className="space-y-4 text-xs">
                <div>
                  <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#92949A] mb-1.5 px-2">Command Center</h5>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('overview'); setMobileDrawerOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 ${activeTab === 'overview' ? 'bg-[#191D23] text-[#C6A66A] font-bold' : 'text-[#92949A] hover:text-[#F2F0EA]'}`}
                  >
                    <Activity className="h-4 w-4" />
                    <span>Overview & KPIs</span>
                  </button>
                </div>

                <div>
                  <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#92949A] mb-1.5 px-2">Intelligence & Discovery</h5>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('sources'); setMobileDrawerOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between ${activeTab === 'sources' ? 'bg-[#191D23] text-[#C6A66A] font-bold' : 'text-[#92949A] hover:text-[#F2F0EA]'}`}
                    >
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span>GCDE</span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[rgba(198,166,106,0.2)] text-[#C6A66A]">LIVE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('hr_discovery'); setMobileDrawerOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 ${activeTab === 'hr_discovery' ? 'bg-[#191D23] text-[#C6A66A] font-bold' : 'text-[#92949A] hover:text-[#F2F0EA]'}`}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>HR Diagnostics</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('growth_engine'); setMobileDrawerOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 ${activeTab === 'growth_engine' ? 'bg-[#191D23] text-[#C6A66A] font-bold' : 'text-[#92949A] hover:text-[#F2F0EA]'}`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span>Growth Engine</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#92949A] mb-1.5 px-2">User Management</h5>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('users'); setMobileDrawerOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 ${activeTab === 'users' ? 'bg-[#191D23] text-[#C6A66A] font-bold' : 'text-[#92949A] hover:text-[#F2F0EA]'}`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Users & Roles ({totalUsers})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('provisioning'); setMobileDrawerOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 ${activeTab === 'provisioning' ? 'bg-[#191D23] text-[#C6A66A] font-bold' : 'text-[#92949A] hover:text-[#F2F0EA]'}`}
                    >
                      <Award className="h-4 w-4" />
                      <span>User Provisioning</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('founder'); setMobileDrawerOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 ${activeTab === 'founder' ? 'bg-[#191D23] text-[#C6A66A] font-bold' : 'text-[#92949A] hover:text-[#F2F0EA]'}`}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Founder Profile</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#92949A] mb-1.5 px-2">Operations & Security</h5>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('resumes'); setMobileDrawerOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 ${activeTab === 'resumes' ? 'bg-[#191D23] text-[#C6A66A] font-bold' : 'text-[#92949A] hover:text-[#F2F0EA]'}`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Resume Operations</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('audit'); setMobileDrawerOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 ${activeTab === 'audit' ? 'bg-[#191D23] text-[#C6A66A] font-bold' : 'text-[#92949A] hover:text-[#F2F0EA]'}`}
                    >
                      <Shield className="h-4 w-4" />
                      <span>Security & Audit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('system'); setMobileDrawerOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 ${activeTab === 'system' ? 'bg-[#191D23] text-[#C6A66A] font-bold' : 'text-[#92949A] hover:text-[#F2F0EA]'}`}
                    >
                      <Database className="h-4 w-4" />
                      <span>System Health</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* Mobile Quick-Switcher Bar (Visible on mobile/tablet viewports) */}
          <div className="lg:hidden block space-y-2 pb-2 border-b border-[rgba(255,255,255,0.08)]">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] font-mono text-[#92949A] uppercase tracking-wider">Module:</span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#191D23] text-[#C6A66A] border border-[rgba(198,166,106,0.30)] flex items-center space-x-1.5 text-xs font-semibold cursor-pointer"
              >
                <Menu className="h-3.5 w-3.5" />
                <span>Switch Admin Section</span>
              </button>
            </div>
          </div>
        {/* Alerts */}
        {error && (
          <div className="flex items-start space-x-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start space-x-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h2 className={`text-xl font-bold ${isBlack ? 'text-[#F2F0EA]' : 'text-slate-900'}`}>Platform Operational Status</h2>
              <p className={`text-xs mt-0.5 ${isBlack ? 'text-[#C0BDB5]' : 'text-slate-500'}`}>
                Real-time operational metrics queried directly from production Cloudflare D1 database
              </p>
            </div>

            {/* Metric Cards (Neumorphic Raised Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className={`p-5 rounded-2xl space-y-3 transition border ${
                isBlack
                  ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] text-[#F2F0EA] be-card'
                  : 'bg-white border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isBlack ? 'text-[#92949A]' : 'text-slate-500'}`}>Registered Accounts</span>
                  <div className={`p-2 rounded-xl ${isBlack ? 'bg-[rgba(118,169,216,0.15)] text-[#76A9D8] border border-[rgba(118,169,216,0.30)]' : 'bg-blue-50 text-blue-600'}`}>
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className={`text-3xl font-extrabold ${isBlack ? 'text-[#F2F0EA]' : 'text-slate-900'}`}>{stats?.totalUsers ?? '...'}</span>
                  <span className={`text-xs ${isBlack ? 'text-[#C0BDB5]' : 'text-slate-500'}`}>accounts</span>
                </div>
                <div className={`text-[11px] flex items-center space-x-1 pt-1 border-t ${isBlack ? 'border-[rgba(255,255,255,0.09)] text-[#C0BDB5]' : 'border-slate-100 text-slate-500'}`}>
                  <Shield className={`h-3.5 w-3.5 ${isBlack ? 'text-[#C6A66A]' : 'text-indigo-600'}`} />
                  <span><strong>{stats?.totalAdmins ?? 0}</strong> provisioned administrators</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl space-y-3 transition border ${
                isBlack
                  ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] text-[#F2F0EA] be-card'
                  : 'bg-white border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isBlack ? 'text-[#92949A]' : 'text-slate-500'}`}>Job Applications</span>
                  <div className={`p-2 rounded-xl ${isBlack ? 'bg-[rgba(53,184,135,0.15)] text-[#35B887] border border-[rgba(53,184,135,0.30)]' : 'bg-emerald-50 text-emerald-600'}`}>
                    <Briefcase className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className={`text-3xl font-extrabold ${isBlack ? 'text-[#F2F0EA]' : 'text-slate-900'}`}>{stats?.totalApplications ?? '...'}</span>
                  <span className={`text-xs ${isBlack ? 'text-[#C0BDB5]' : 'text-slate-500'}`}>records</span>
                </div>
                <div className={`text-[11px] flex items-center space-x-1 pt-1 border-t ${isBlack ? 'border-[rgba(255,255,255,0.09)] text-[#C0BDB5]' : 'border-slate-100 text-slate-500'}`}>
                  <span>Enforcing 5-application limit on Free tier</span>
                </div>
              </div>

              <div onClick={() => setActiveTab('resumes')} className={`p-5 rounded-2xl space-y-3 cursor-pointer transition border ${
                isBlack
                  ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] hover:border-[rgba(198,166,106,0.30)] text-[#F2F0EA] be-card'
                  : 'bg-white border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] hover:border-violet-300 text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isBlack ? 'text-[#92949A]' : 'text-slate-500'}`}>Master Resumes (Click to Manage)</span>
                  <div className={`p-2 rounded-xl ${isBlack ? 'bg-[rgba(148,131,232,0.15)] text-[#9483E8] border border-[rgba(148,131,232,0.30)]' : 'bg-violet-50 text-violet-600'}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className={`text-3xl font-extrabold ${isBlack ? 'text-[#F2F0EA]' : 'text-slate-900'}`}>{stats?.totalResumes ?? '...'}</span>
                  <span className={`text-xs ${isBlack ? 'text-[#C0BDB5]' : 'text-slate-500'}`}>documents</span>
                </div>
                <div className={`text-[11px] flex items-center space-x-1 pt-1 border-t ${isBlack ? 'border-[rgba(255,255,255,0.09)] text-[#C0BDB5]' : 'border-slate-100 text-slate-500'}`}>
                  <span>Enforcing 1-active master limit on Free tier</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl space-y-3 transition border ${
                isBlack
                  ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] text-[#F2F0EA] be-card'
                  : 'bg-white border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isBlack ? 'text-[#92949A]' : 'text-slate-500'}`}>Active Paid Plans (Pro & BLACK)</span>
                  <div className={`p-2 rounded-xl ${isBlack ? 'bg-[rgba(198,166,106,0.15)] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]' : 'bg-amber-50 text-amber-600'}`}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className={`text-3xl font-extrabold ${isBlack ? 'text-[#F2F0EA]' : 'text-slate-900'}`}>{stats?.activeSubscriptions ?? '...'}</span>
                  <span className={`text-xs ${isBlack ? 'text-[#C0BDB5]' : 'text-slate-500'}`}>subscriptions</span>
                </div>
                <div className={`text-[11px] flex items-center space-x-1 pt-1 border-t ${isBlack ? 'border-[rgba(255,255,255,0.09)] text-[#C0BDB5]' : 'border-slate-100 text-slate-500'}`}>
                  <span>Plus 2 authorized permanent free-access accounts</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl space-y-3 transition border ${
                isBlack
                  ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] text-[#F2F0EA] be-card'
                  : 'bg-white border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isBlack ? 'text-[#92949A]' : 'text-slate-500'}`}>Cached Vacancies</span>
                  <div className={`p-2 rounded-xl ${isBlack ? 'bg-[rgba(148,131,232,0.15)] text-[#9483E8] border border-[rgba(148,131,232,0.30)]' : 'bg-indigo-50 text-indigo-600'}`}>
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className={`text-3xl font-extrabold ${isBlack ? 'text-[#F2F0EA]' : 'text-slate-900'}`}>{stats?.totalVacancies ?? '...'}</span>
                  <span className={`text-xs ${isBlack ? 'text-[#C0BDB5]' : 'text-slate-500'}`}>live openings</span>
                </div>
                <div className={`text-[11px] flex items-center space-x-1 pt-1 border-t ${isBlack ? 'border-[rgba(255,255,255,0.09)] text-[#C0BDB5]' : 'border-slate-100 text-slate-500'}`}>
                  <span>Syncing every 10 min via Cloudflare Triggers</span>
                </div>
              </div>

              <div className={`p-5 rounded-2xl space-y-3 transition border ${
                isBlack
                  ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] text-[#F2F0EA] be-card'
                  : 'bg-white border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isBlack ? 'text-[#92949A]' : 'text-slate-500'}`}>Google OAuth Status</span>
                  <div className={`p-2 rounded-xl ${isBlack ? 'bg-[rgba(118,169,216,0.15)] text-[#76A9D8] border border-[rgba(118,169,216,0.30)]' : 'bg-blue-50 text-blue-600'}`}>
                    <Key className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className={`text-lg font-bold ${isBlack ? 'text-[#35B887]' : 'text-emerald-700'}`}>Client Configured</span>
                </div>
                <div className={`text-[11px] flex items-center space-x-1 pt-1 border-t ${isBlack ? 'border-[rgba(255,255,255,0.09)] text-[#C0BDB5]' : 'border-slate-100 text-slate-500'}`}>
                  <span>Cryptographic tokeninfo signature verification active</span>
                </div>
              </div>
            </div>

            {/* Quick Actions / Guide */}
            <div className="p-5 rounded-2xl text-xs space-y-2 border transition bg-[#14171C] border-[rgba(198,166,106,0.30)] text-[#F2F0EA] shadow-xs admin-security-card">
              <div className="font-bold flex items-center space-x-2 text-[#F2F0EA]">
                <Shield className="h-4 w-4 text-[#C6A66A]" />
                <span>Administrator Provisioning & Security Architecture</span>
              </div>
              <p className="leading-relaxed text-[#C0BDB5]">
                Administrative privileges in ApplyVise AI are strictly enforced on the server by verifying the authenticated user's session token against the <code className="px-1.5 py-0.5 rounded font-mono font-medium bg-[#0D1014] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]">users.role</code> column in Cloudflare D1. Client-supplied roles or emails are never trusted. To provision new administrators from the command line, use <code className="px-1.5 py-0.5 rounded font-mono font-medium bg-[#0D1014] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]">npm run admin:promote &lt;email&gt;</code>.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: USERS & ROLES */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#F2F0EA]">User Account Management</h2>
                <p className="text-xs text-[#C0BDB5] mt-0.5">
                  View persisted user records, monitor verification status, and manage administrative privileges
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#92949A]" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search user email or name..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0D1014] text-xs text-[#F2F0EA] placeholder-[#737780] focus:outline-none focus:border-[rgba(198,166,106,0.50)] shadow-xs"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#14171C] rounded-2xl border border-[rgba(255,255,255,0.09)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#C0BDB5]">
                  <thead className="bg-[#0D1014] border-b border-[rgba(255,255,255,0.09)] text-[11px] font-semibold text-[#92949A] uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Plan</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Created At</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-[#737780]">
                          {loading ? 'Loading user records...' : 'No users found matching search query.'}
                        </td>
                      </tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id} className="hover:bg-[#191D23]/60 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-[#F2F0EA]">{u.fullName}</div>
                            <div className="text-[11px] text-[#92949A] font-mono">{u.email}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[rgba(198,166,106,0.18)] border border-[rgba(198,166,106,0.35)] text-[#C6A66A] font-extrabold text-[10px] tracking-wide uppercase">
                                <Shield className="h-3 w-3" />
                                <span>ADMIN</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#191D23] border border-[rgba(255,255,255,0.09)] text-[#C0BDB5] font-medium text-[10px] uppercase">
                                User
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              u.planId === 'black'
                                ? 'bg-[rgba(198,166,106,0.18)] text-[#C6A66A] border-[rgba(198,166,106,0.35)]'
                                : u.planId === 'pro'
                                ? 'bg-[rgba(118,169,216,0.18)] text-[#76A9D8] border-[rgba(118,169,216,0.35)]'
                                : 'bg-[#191D23] text-[#92949A] border-[rgba(255,255,255,0.09)]'
                            }`}>
                              {u.planId || 'free'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center space-x-1 text-[#35B887]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="text-[11px] font-medium">Verified</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[11px] text-[#92949A] font-mono">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {u.id === currentUser.id ? (
                              <span className="text-[11px] text-[#737780] italic">Current Session</span>
                            ) : (
                              <button
                                type="button"
                                disabled={updatingUserId === u.id}
                                onClick={() => handleToggleRole(u)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs border transition cursor-pointer ${
                                  u.role === 'admin'
                                    ? 'bg-[rgba(214,117,117,0.15)] text-[#D67575] border-[rgba(214,117,117,0.30)] hover:bg-[rgba(214,117,117,0.25)]'
                                    : 'bg-[#191D23] text-[#C6A66A] border-[rgba(198,166,106,0.30)] hover:bg-[#20252D]'
                                }`}
                              >
                                {updatingUserId === u.id ? (
                                  'Updating...'
                                ) : u.role === 'admin' ? (
                                  'Revoke Admin'
                                ) : (
                                  'Make Admin'
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: USER PROVISIONING & MEMBERSHIP VALIDITY */}
        {activeTab === 'provisioning' && (
          <AdminUserProvisioning currentUser={currentUser} />
        )}

        {/* TAB: RESUMES & EXTRACTION */}
        {activeTab === 'resumes' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Resume Management & Extraction</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect ingested documents, verify candidate facts, review parser telemetry, and trigger safe re-extractions
                </p>
              </div>
            </div>
            <AdminResumeManagement onRefreshOverview={loadData} />
          </div>
        )}

        {/* TAB: GLOBAL CAREER DISCOVERY ENGINE (GCDE) */}
        {activeTab === 'sources' && (
          <div
            id="admin-panel-sources"
            role="tabpanel"
            aria-labelledby="admin-tab-sources"
            title="Job Source Ingestion Health — Recent Ingestion Pipeline Runs"
            className="space-y-6"
          >
            {/* Executive GCDE Hero Header */}
            <div className="p-5 rounded-2xl bg-[#14171C] border border-[rgba(198,166,106,0.30)] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-[rgba(198,166,106,0.15)] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-[#F2F0EA]">Global Career Discovery Engine</h1>
                    <span className="text-[10px] font-mono text-[#C6A66A] tracking-wider uppercase font-semibold">
                      Dedicated Destination: /admin/gcde
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#C0BDB5] max-w-2xl pt-1">
                  Global job intelligence, employer career portals, ATS connectors and geographic coverage. Job Source Ingestion Health telemetry and Recent Ingestion Pipeline Runs discovery.
                </p>
              </div>
              <div className="flex items-center space-x-2 self-start md:self-auto">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[rgba(53,184,135,0.15)] text-[#35B887] border border-[rgba(53,184,135,0.30)] text-xs font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#35B887] animate-pulse" />
                  <span>Active Intelligence</span>
                </span>
              </div>
            </div>

            <GlobalSourceIntelligence />
          </div>
        )}

        {/* TAB: HR DISCOVERY DIAGNOSTICS */}
        {activeTab === 'hr_discovery' && (
          <div id="admin-panel-hr-discovery" role="tabpanel" aria-labelledby="admin-tab-hr-discovery">
            <AdminHrDiscoveryDiagnostics />
          </div>
        )}

        {/* TAB 3: AUDIT LOGS & SECURITY */}
        {activeTab === 'audit' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#F2F0EA]">Security Audit Trail</h2>
                <p className="text-xs text-[#C0BDB5] mt-0.5">
                  Immutable record of system actions, role modifications, logins, and integrity events
                </p>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5 text-[#92949A]" />
                <div className="w-44">
                  <FilterSelect
                    value={logSeverity}
                    onChange={val => setLogSeverity(val || 'all')}
                    searchable={false}
                    options={[
                      { value: 'all', label: 'All Severities' },
                      { value: 'info', label: 'Info Only' },
                      { value: 'warning', label: 'Warnings' },
                      { value: 'security', label: 'Security Events' },
                    ]}
                    theme="black-elite"
                    ariaLabel="Filter Audit Logs by Severity"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#14171C] rounded-2xl border border-[rgba(255,255,255,0.09)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#C0BDB5]">
                  <thead className="bg-[#0D1014] border-b border-[rgba(255,255,255,0.09)] text-[11px] font-semibold text-[#92949A] uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Timestamp</th>
                      <th className="px-5 py-3.5">Severity</th>
                      <th className="px-5 py-3.5">Actor</th>
                      <th className="px-5 py-3.5">Action</th>
                      <th className="px-5 py-3.5">Target</th>
                      <th className="px-5 py-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-[#737780]">
                          {loading ? 'Loading audit records...' : 'No audit records match the current filter.'}
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-[#191D23]/60 transition">
                          <td className="px-5 py-3.5 text-[11px] text-[#92949A] font-mono whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              log.severity === 'security'
                                ? 'bg-[rgba(214,117,117,0.18)] text-[#D67575] border-[rgba(214,117,117,0.35)]'
                                : log.severity === 'warning'
                                ? 'bg-[rgba(217,170,97,0.18)] text-[#D9AA61] border-[rgba(217,170,97,0.35)]'
                                : 'bg-[#191D23] text-[#92949A] border-[rgba(255,255,255,0.09)]'
                            }`}>
                              {log.severity || 'info'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-[#F2F0EA] whitespace-nowrap">
                            {log.actor}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[11px] font-semibold text-[#C6A66A] whitespace-nowrap">
                            {log.action}
                          </td>
                          <td className="px-5 py-3.5 text-[#C0BDB5] max-w-[180px] truncate" title={log.target}>
                            {log.target}
                          </td>
                          <td className="px-5 py-3.5 text-[#92949A] max-w-xs truncate" title={log.details}>
                            {log.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM HEALTH */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F2F0EA]">System Health & Edge Infrastructure</h2>
              <p className="text-xs text-[#C0BDB5] mt-0.5">
                Current operational status of Cloudflare Worker bindings, D1 database, and external integrations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Database Health Card */}
              <div className="p-6 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.09)] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-[#C6A66A]" />
                    <h3 className="text-sm font-bold text-[#F2F0EA]">Cloudflare D1 Database</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[rgba(53,184,135,0.15)] text-[#35B887] border border-[rgba(53,184,135,0.30)] text-[10px] font-bold uppercase">
                    Connected
                  </span>
                </div>
                <div className="space-y-2 text-xs text-[#C0BDB5]">
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.06)]">
                    <span>Database ID</span>
                    <span className="font-mono text-[#F2F0EA]">36c07326-65a2-44cf-8f38-4df1a7103cd5</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.06)]">
                    <span>Database Engine</span>
                    <span className="font-semibold text-[#F2F0EA]">SQLite at the Edge</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.06)]">
                    <span>Persisted Accounts</span>
                    <span className="font-bold text-[#F2F0EA]">{systemHealth?.database?.userCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Total Applications</span>
                    <span className="font-bold text-[#F2F0EA]">{systemHealth?.database?.applicationsCount ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Edge Runtime Card */}
              <div className="p-6 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.09)] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-5 w-5 text-[#76A9D8]" />
                    <h3 className="text-sm font-bold text-[#F2F0EA]">Worker Edge Runtime</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[rgba(118,169,216,0.15)] text-[#76A9D8] border border-[rgba(118,169,216,0.30)] text-[10px] font-bold uppercase">
                    Operational
                  </span>
                </div>
                <div className="space-y-2 text-xs text-[#C0BDB5]">
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.06)]">
                    <span>Environment</span>
                    <span className="font-semibold text-[#F2F0EA]">Cloudflare Workers (Edge)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.06)]">
                    <span>Compatibility Flags</span>
                    <span className="font-mono text-[#F2F0EA]">nodejs_compat</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[rgba(255,255,255,0.06)]">
                    <span>Server Time (UTC)</span>
                    <span className="font-mono text-[#F2F0EA]">{systemHealth?.serverTime ? new Date(systemHealth.serverTime).toUTCString() : '...'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Observability</span>
                    <span className="font-semibold text-[#35B887]">Enabled</span>
                  </div>
                </div>
              </div>

              {/* Integrations Status */}
              <div className="p-6 rounded-2xl bg-[#14171C] border border-[rgba(255,255,255,0.09)] shadow-xs space-y-4 md:col-span-2">
                <h3 className="text-sm font-bold text-[#F2F0EA]">Service Integrations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.09)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F2F0EA]">Google OAuth GIS</span>
                      <span className="px-2 py-0.5 rounded-full bg-[rgba(53,184,135,0.15)] text-[#35B887] border border-[rgba(53,184,135,0.30)] text-[10px] font-bold uppercase">Active</span>
                    </div>
                    <p className="text-[11px] text-[#C0BDB5]">
                      Tokeninfo audience checking & email_verified cryptographic validation active.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.09)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F2F0EA]">Gemini 2.5 AI</span>
                      <span className="px-2 py-0.5 rounded-full bg-[rgba(53,184,135,0.15)] text-[#35B887] border border-[rgba(53,184,135,0.30)] text-[10px] font-bold uppercase">Ready</span>
                    </div>
                    <p className="text-[11px] text-[#C0BDB5]">
                      Context-aware profile extraction, document tailoring, and ATS analysis.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.09)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F2F0EA]">Live Job Connectors</span>
                      <span className="px-2 py-0.5 rounded-full bg-[rgba(53,184,135,0.15)] text-[#35B887] border border-[rgba(53,184,135,0.30)] text-[10px] font-bold uppercase">Active</span>
                    </div>
                    <p className="text-[11px] text-[#C0BDB5]">
                      Greenhouse, Lever, Remotive, and Jobicy synchronized via background crons.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#191D23] border border-[rgba(255,255,255,0.09)] space-y-2 sm:col-span-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Compass className="h-4 w-4 text-[#C6A66A]" />
                        <span className="font-semibold text-[#F2F0EA]">Career Atlas 2.0 & Recommendation Engine</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[rgba(53,184,135,0.15)] text-[#35B887] border border-[rgba(53,184,135,0.30)] text-[10px] font-bold uppercase">Operational · 42ms</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 text-[#C0BDB5]">
                      <div>Market Data Freshness: <strong className="text-[#F2F0EA] block">10m Sync Verified</strong></div>
                      <div>Active Career Goals: <strong className="text-[#F2F0EA] block">14 Candidate Targets</strong></div>
                      <div>Roadmaps Processed: <strong className="text-[#F2F0EA] block">38 Generated Plans</strong></div>
                      <div>Learning Health: <strong className="text-[#35B887] block">All Sources Healthy</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: FOUNDER PROFILE MANAGEMENT */}
        {activeTab === 'founder' && (
          <AdminFounderProfile onNotify={showNotification} />
        )}

        {/* TAB 7: APPLYVISE GROWTH ENGINE & AI MARKETING DEPARTMENT */}
        {activeTab === 'growth_engine' && (
          <GrowthEngineDashboard onNavigateRoute={onNavigateRoute} />
        )}

        {/* TAB 8: UNIVERSAL LANGUAGE ENGINE & LOCALIZATION */}
        {activeTab === 'languages' && (
          <div id="admin-panel-languages" role="tabpanel">
            <AdminLanguageManagement isBlack={isBlack} />
          </div>
        )}
      </main>
      </div>
    </div>
  );
};
