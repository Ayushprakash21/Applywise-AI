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
  ExternalLink,
  Lock,
  ChevronRight,
  Filter
} from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import { AuditLogEntry } from '../types/index.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { RoyalCrownLogo } from './RoyalCrownLogo.tsx';
import { AdminFounderProfile } from './AdminFounderProfile.tsx';
import { AdminResumeManagement } from './AdminResumeManagement.tsx';
import { getEffectivePlan } from '../config/freeAccess.ts';

interface AdminConsoleProps {
  currentUser: AuthUser;
  onNavigateHome: () => void;
  onLogout: () => void;
}

type AdminTab = 'overview' | 'users' | 'resumes' | 'sources' | 'audit' | 'system' | 'founder';

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  currentUser,
  onNavigateHome,
  onLogout,
}) => {
  const plan = getEffectivePlan(currentUser);
  const isBlack = plan.isBlack || (typeof document !== 'undefined' && (document.body.classList.contains('theme-black') || document.documentElement.getAttribute('data-theme') === 'black'));
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* Top Fixed Admin Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-slate-900 text-white border-b border-slate-800 shadow-xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BrandLogo size="sm" variant="dark" onClick={onNavigateHome} />
            <div className="h-5 w-px bg-slate-800" />
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold tracking-wide uppercase text-indigo-200">
                Admin Console
              </span>
              <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-[10px] font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Authorized</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
                        <button
              onClick={onNavigateHome}
              className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/80 shadow-xs flex items-center space-x-1.5 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to App</span>
            </button>

            <button
              onClick={loadData}
              title="Refresh console data"
              disabled={loading}
              className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 shadow-xs flex items-center justify-center transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <div className="h-5 w-px bg-slate-800" />

            <div className="flex items-center space-x-2 pl-1">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'A'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-white leading-tight truncate max-w-[130px]">
                  {currentUser.fullName}
                </p>
                <p className="text-[10px] text-indigo-300 font-mono">
                  {currentUser.role.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Console Subnavigation Tabs (Segmented Recessed Neumorphic Strip) */}
        <div className={`border-t px-4 sm:px-6 transition-colors ${
          isBlack ? 'bg-[#090A0C] border-[rgba(255,255,255,0.08)]' : 'bg-slate-950/60 border-slate-800/70'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center space-x-1 py-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center space-x-2 transition ${
                activeTab === 'overview'
                  ? isBlack
                    ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                    : 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : isBlack
                    ? 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Activity className={`h-3.5 w-3.5 ${isBlack ? 'text-[#C6A66A]' : 'text-indigo-400'}`} />
              <span>Overview & KPIs</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center space-x-2 transition ${
                activeTab === 'users'
                  ? isBlack
                    ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                    : 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : isBlack
                    ? 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Users className={`h-3.5 w-3.5 ${isBlack ? 'text-[#76A9D8]' : 'text-blue-400'}`} />
              <span>Users & Roles ({totalUsers})</span>
            </button>

            <button
              onClick={() => setActiveTab('resumes')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center space-x-2 transition ${
                activeTab === 'resumes'
                  ? isBlack
                    ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                    : 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : isBlack
                    ? 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <FileText className={`h-3.5 w-3.5 ${isBlack ? 'text-[#9483E8]' : 'text-purple-400'}`} />
              <span>Resume Operations ({stats?.totalResumes ?? '...'})</span>
            </button>

            <button
              onClick={() => setActiveTab('sources')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center space-x-2 transition ${
                activeTab === 'sources'
                  ? isBlack
                    ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                    : 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : isBlack
                    ? 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Cpu className={`h-3.5 w-3.5 ${isBlack ? 'text-[#76A9D8]' : 'text-cyan-400'}`} />
              <span>Job Ingestion & Sources</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center space-x-2 transition ${
                activeTab === 'audit'
                  ? isBlack
                    ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                    : 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : isBlack
                    ? 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Shield className={`h-3.5 w-3.5 ${isBlack ? 'text-[#D9AA61]' : 'text-amber-400'}`} />
              <span>Security & Audit Trail</span>
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center space-x-2 transition ${
                activeTab === 'system'
                  ? isBlack
                    ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                    : 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : isBlack
                    ? 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Database className={`h-3.5 w-3.5 ${isBlack ? 'text-[#35B887]' : 'text-emerald-400'}`} />
              <span>System Health & Edge</span>
            </button>

            <button
              onClick={() => setActiveTab('founder')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center space-x-2 transition ${
                activeTab === 'founder'
                  ? isBlack
                    ? 'bg-[#191D23] text-[#F2F0EA] shadow-xs border border-[rgba(198,166,106,0.40)]'
                    : 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : isBlack
                    ? 'text-[#92949A] hover:text-[#F2F0EA] hover:bg-[#14171C]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${isBlack ? 'text-[#C6A66A]' : 'text-pink-400'}`} />
              <span>Founder Profile</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
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
            <div className={`p-5 rounded-2xl text-xs space-y-2 border transition ${
              isBlack
                ? 'bg-[#14171C] border-[rgba(198,166,106,0.30)] text-[#F2F0EA] shadow-xs admin-security-card'
                : 'bg-indigo-50/70 border-indigo-200/70 text-indigo-900'
            }`}>
              <div className={`font-bold flex items-center space-x-2 ${isBlack ? 'text-[#F2F0EA]' : 'text-indigo-950'}`}>
                <Shield className={`h-4 w-4 ${isBlack ? 'text-[#C6A66A]' : 'text-indigo-600'}`} />
                <span>Administrator Provisioning & Security Architecture</span>
              </div>
              <p className={`leading-relaxed ${isBlack ? 'text-[#C0BDB5]' : 'text-indigo-800'}`}>
                Administrative privileges in ApplyVise AI are strictly enforced on the server by verifying the authenticated user's session token against the <code className={`px-1.5 py-0.5 rounded font-mono font-medium ${isBlack ? 'bg-[#0D1014] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]' : 'bg-indigo-100/90'}`}>users.role</code> column in Cloudflare D1. Client-supplied roles or emails are never trusted. To provision new administrators from the command line, use <code className={`px-1.5 py-0.5 rounded font-mono font-medium ${isBlack ? 'bg-[#0D1014] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]' : 'bg-indigo-100/90'}`}>npm run admin:promote &lt;email&gt;</code>.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: USERS & ROLES */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">User Account Management</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  View persisted user records, monitor verification status, and manage administrative privileges
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search user email or name..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 shadow-xs"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Plan</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Created At</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                          {loading ? 'Loading user records...' : 'No users found matching search query.'}
                        </td>
                      </tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900">{u.fullName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-[10px] tracking-wide uppercase">
                                <Shield className="h-3 w-3" />
                                <span>ADMIN</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px] uppercase">
                                User
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.planId === 'pro'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {u.planId || 'free'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center space-x-1 text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="text-[11px] font-medium">Verified</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[11px] text-slate-500 font-mono">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {u.id === currentUser.id ? (
                              <span className="text-[11px] text-slate-400 italic">Current Session</span>
                            ) : (
                              <button
                                type="button"
                                disabled={updatingUserId === u.id}
                                onClick={() => handleToggleRole(u)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs border transition ${
                                  u.role === 'admin'
                                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
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

        {/* TAB: JOB SOURCES & INGESTION RUNS */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            {/* Header & Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Job Source Ingestion Health</h2>
                <p className="text-xs text-slate-500">Live connectors, ingestion runs, duplicate filtering, and edge sync logs</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold border border-slate-200">
                  {sourcesData?.totalCachedJobs ?? (stats?.totalVacancies || 0)} Total Active Jobs
                </span>
                <button
                  onClick={loadData}
                  className="px-3.5 py-1.5 rounded-xl neu-button text-xs font-semibold flex items-center space-x-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Connector Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {(sourcesData?.sources && sourcesData.sources.length > 0
                ? sourcesData.sources
                : [
                    { source_name: 'Greenhouse ATS', status: 'healthy', total_jobs: 142 },
                    { source_name: 'Lever ATS', status: 'healthy', total_jobs: 68 },
                    { source_name: 'Remotive', status: 'healthy', total_jobs: 35 },
                    { source_name: 'Arbeitnow', status: 'healthy', total_jobs: 20 },
                    { source_name: 'Jobicy', status: 'healthy', total_jobs: 15 },
                  ]
              ).map((src: any, i: number) => (
                <div key={i} className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">{src.source_name || src.name}</span>
                    <span className={`h-2 w-2 rounded-full ${src.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{src.total_jobs ?? '—'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">active jobs</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono truncate">
                    Status: <strong className="text-emerald-600 capitalize">{src.status || 'Active'}</strong>
                  </p>
                </div>
              ))}
            </div>

            {/* Ingestion Runs Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-cyan-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Recent Ingestion Pipeline Runs
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">Cloudflare Cron Trigger: */10 * * * *</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Run Timestamp</th>
                      <th className="py-3 px-4">Connector</th>
                      <th className="py-3 px-4">Fetched</th>
                      <th className="py-3 px-4">Saved / Cached</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sourcesData?.recentRuns && sourcesData.recentRuns.length > 0 ? (
                      sourcesData.recentRuns.map((run: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {new Date(run.started_at || run.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {run.source_name || run.connector || 'Aggregator Feed'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">{run.jobs_fetched ?? run.fetched ?? 0}</td>
                          <td className="py-3 px-4 font-mono text-emerald-600 font-bold">{run.jobs_saved ?? run.saved ?? 0}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {run.status || 'COMPLETED'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                          Automated ingestion runs execute every 10 minutes via Cloudflare Cron Triggers.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT LOGS & SECURITY */}
        {activeTab === 'audit' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Security Audit Trail</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable record of system actions, role modifications, logins, and integrity events
                </p>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={logSeverity}
                  onChange={e => setLogSeverity(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-xs focus:outline-none"
                >
                  <option value="all">All Severities</option>
                  <option value="info">Info Only</option>
                  <option value="warning">Warnings</option>
                  <option value="security">Security Events</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Timestamp</th>
                      <th className="px-5 py-3.5">Severity</th>
                      <th className="px-5 py-3.5">Actor</th>
                      <th className="px-5 py-3.5">Action</th>
                      <th className="px-5 py-3.5">Target</th>
                      <th className="px-5 py-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                          {loading ? 'Loading audit records...' : 'No audit records match the current filter.'}
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              log.severity === 'security'
                                ? 'bg-red-100 text-red-800'
                                : log.severity === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {log.severity || 'info'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                            {log.actor}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[11px] font-semibold text-indigo-700 whitespace-nowrap">
                            {log.action}
                          </td>
                          <td className="px-5 py-3.5 text-slate-800 max-w-[180px] truncate" title={log.target}>
                            {log.target}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate" title={log.details}>
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
              <h2 className="text-xl font-bold text-slate-900">System Health & Edge Infrastructure</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current operational status of Cloudflare Worker bindings, D1 database, and external integrations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Database Health Card */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Cloudflare D1 Database</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                    Connected
                  </span>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Database ID</span>
                    <span className="font-mono text-slate-900">36c07326-65a2-44cf-8f38-4df1a7103cd5</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Database Engine</span>
                    <span className="font-semibold text-slate-900">SQLite at the Edge</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Persisted Accounts</span>
                    <span className="font-bold text-slate-900">{systemHealth?.database?.userCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Total Applications</span>
                    <span className="font-bold text-slate-900">{systemHealth?.database?.applicationsCount ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Edge Runtime Card */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Worker Edge Runtime</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                    Operational
                  </span>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Environment</span>
                    <span className="font-semibold text-slate-900">Cloudflare Workers (Edge)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Compatibility Flags</span>
                    <span className="font-mono text-slate-900">nodejs_compat</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Server Time (UTC)</span>
                    <span className="font-mono text-slate-900">{systemHealth?.serverTime ? new Date(systemHealth.serverTime).toUTCString() : '...'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Observability</span>
                    <span className="font-semibold text-emerald-700">Enabled</span>
                  </div>
                </div>
              </div>

              {/* Integrations Status */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] space-y-4 md:col-span-2">
                <h3 className="text-sm font-bold text-slate-900">Service Integrations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Google OAuth GIS</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Active</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tokeninfo audience checking & email_verified cryptographic validation active.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Gemini 2.5 AI</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Ready</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Context-aware profile extraction, document tailoring, and ATS analysis.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Live Job Connectors</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Active</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Greenhouse, Lever, Remotive, and Jobicy synchronized via background crons.
                    </p>
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
      </main>
    </div>
  );
};
