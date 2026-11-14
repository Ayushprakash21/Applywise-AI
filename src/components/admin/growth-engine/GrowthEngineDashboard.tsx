// src/components/admin/growth-engine/GrowthEngineDashboard.tsx
// Dedicated BLACK ELITE Autonomous AI Marketing Command Center for ApplyVise

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Sparkles,
  Bot,
  Search,
  FileText,
  Share2,
  Users,
  Compass,
  Filter,
  ShieldCheck,
  AlertOctagon,
  Pause,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  Sliders,
  DollarSign,
  Layers,
  ArrowUpRight,
  Award,
  Globe,
  PlusCircle,
  Clock,
  Send,
  Zap
} from 'lucide-react';
import { api } from '../../../services/api.ts';
import {
  GrowthCommandCenterOverview,
  GrowthAgentSettings,
  GrowthAgentType,
  GrowthAgentTask,
  MarketingContentItem,
  SeoProperty,
  SeoKeywordGroup,
  CompetitorProfile,
  SocialPost,
  MarketingIntegration,
  MarketingFunnelMetrics
} from '../../../types/growthEngine.ts';

type DashboardTab = 'overview' | 'seo' | 'content' | 'social_competitors' | 'funnel' | 'settings';

interface GrowthEngineDashboardProps {
  onNavigateRoute?: (route: string) => void;
}

export const GrowthEngineDashboard: React.FC<GrowthEngineDashboardProps> = ({ onNavigateRoute }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<GrowthCommandCenterOverview | null>(null);
  const [tasks, setTasks] = useState<GrowthAgentTask[]>([]);
  const [seoProperties, setSeoProperties] = useState<SeoProperty[]>([]);
  const [seoKeywords, setSeoKeywords] = useState<SeoKeywordGroup[]>([]);
  const [contentList, setContentList] = useState<MarketingContentItem[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [integrations, setIntegrations] = useState<MarketingIntegration[]>([]);
  const [funnelMetrics, setFunnelMetrics] = useState<MarketingFunnelMetrics[]>([]);

  // Selected article for preview/editing
  const [selectedArticle, setSelectedArticle] = useState<MarketingContentItem | null>(null);
  const [isCreatingArticle, setIsCreatingArticle] = useState<boolean>(false);
  const [newArticleTitle, setNewArticleTitle] = useState<string>('');
  const [newArticleCategory, setNewArticleCategory] = useState<string>('ats_optimization');
  const [newArticleKeyword, setNewArticleKeyword] = useState<string>('');
  const [newArticleMarkdown, setNewArticleMarkdown] = useState<string>('');

  // Agent execution running state
  const [runningAgent, setRunningAgent] = useState<GrowthAgentType | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Fetch complete data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getGrowthOverview();
      if (res.success && res.overview) {
        setOverview(res.overview);
        setTasks(res.overview.pendingTasks || []);
      }

      // Fetch supplementary tabs data concurrently
      const [seoRes, contentRes, compRes, socialRes, intRes, funnelRes] = await Promise.allSettled([
        api.getGrowthSeo(),
        api.getGrowthMarketingContent(),
        api.getGrowthCompetitors(),
        api.getGrowthSocialPosts(),
        api.getGrowthIntegrations(),
        api.getGrowthFunnelMetrics(),
      ]);

      if (seoRes.status === 'fulfilled' && seoRes.value.success) {
        setSeoProperties(seoRes.value.properties || []);
        setSeoKeywords(seoRes.value.keywords || []);
      }
      if (contentRes.status === 'fulfilled' && contentRes.value.success) {
        setContentList(contentRes.value.content || []);
      }
      if (compRes.status === 'fulfilled' && compRes.value.success) {
        setCompetitors(compRes.value.competitors || []);
      }
      if (socialRes.status === 'fulfilled' && socialRes.value.success) {
        setSocialPosts(socialRes.value.posts || []);
      }
      if (intRes.status === 'fulfilled' && intRes.value.success) {
        setIntegrations(intRes.value.integrations || []);
      }
      if (funnelRes.status === 'fulfilled' && funnelRes.value.success) {
        setFunnelMetrics(funnelRes.value.metrics || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to initialize Growth Engine data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Agent manual run
  const handleRunAgent = async (agentType: GrowthAgentType) => {
    try {
      setRunningAgent(agentType);
      const res = await api.runGrowthAgent(agentType);
      if (res.success) {
        showNotification(res.message);
        await loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Agent execution failed: ${msg}`);
    } finally {
      setRunningAgent(null);
    }
  };

  // Task Approve
  const handleApproveTask = async (taskId: string) => {
    try {
      const res = await api.approveGrowthTask(taskId);
      if (res.success) {
        showNotification(`Task "${res.task.title}" approved.`);
        await loadData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Task Reject
  const handleRejectTask = async (taskId: string) => {
    try {
      const res = await api.rejectGrowthTask(taskId);
      if (res.success) {
        showNotification(`Task "${res.task.title}" rejected.`);
        await loadData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Toggle Pause
  const handleTogglePause = async () => {
    if (!overview) return;
    const nextState = !overview.settings.isPaused;
    try {
      const res = await api.pauseGrowthAgents(nextState);
      if (res.success) {
        showNotification(nextState ? 'Marketing agents paused.' : 'Marketing agents resumed.');
        await loadData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Emergency Stop
  const handleEmergencyStop = async () => {
    if (!overview) return;
    const nextState = !overview.settings.emergencyStopped;
    const confirmPrompt = nextState
      ? 'EMERGENCY STOP: Halt all autonomous marketing agents immediately?'
      : 'Clear emergency stop and resume normal operational mode?';
    if (!window.confirm(confirmPrompt)) return;

    try {
      const res = await api.emergencyStopGrowthEngine(nextState);
      if (res.success) {
        showNotification(nextState ? 'EMERGENCY STOP ACTIVE.' : 'Emergency stop cleared.');
        await loadData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Autonomy Mode Switch
  const handleModeChange = async (mode: GrowthAgentSettings['autonomyMode']) => {
    try {
      const res = await api.updateGrowthSettings({ autonomyMode: mode });
      if (res.success) {
        showNotification(`Autonomy mode updated to: ${mode.toUpperCase()}`);
        await loadData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Publish Article
  const handlePublishArticle = async (id: string) => {
    try {
      const res = await api.publishGrowthMarketingContent(id);
      if (res.success) {
        showNotification(`Article "${res.content.title}" is now PUBLISHED and indexable.`);
        if (selectedArticle && selectedArticle.id === id) {
          setSelectedArticle(res.content);
        }
        await loadData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Create New Article Draft
  const handleCreateArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticleTitle.trim()) return;
    try {
      const res = await api.createGrowthMarketingContent({
        title: newArticleTitle.trim(),
        contentType: newArticleCategory as any,
        primaryKeyword: newArticleKeyword.trim(),
        bodyMarkdown: newArticleMarkdown.trim() || '## Overview\n\nDraft content being researched.',
        status: 'REVIEW_REQUIRED',
        readTimeMinutes: 5,
        targetAudience: 'Active Job Seekers and Professionals',
        searchIntent: 'informational',
      });
      if (res.success) {
        showNotification(`Created draft "${res.content.title}".`);
        setIsCreatingArticle(false);
        setNewArticleTitle('');
        setNewArticleKeyword('');
        setNewArticleMarkdown('');
        await loadData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-stone-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm tracking-wide font-medium">Booting ApplyVise Growth Engine & Agent Workforce...</p>
      </div>
    );
  }

  const s = overview?.settings;

  return (
    <div className="space-y-6 text-stone-100 font-sans pb-16">
      {/* Top Banner / Notification */}
      {actionSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/80 border border-rose-500/40 text-rose-200 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header & Autonomous Command Bar */}
      <div className="bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                BLACK ELITE MARKETING AGENT
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-stone-800 text-stone-300 border border-stone-700">
                8 Autonomous Workers Active
              </span>
              {s?.emergencyStopped ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <AlertOctagon className="w-3.5 h-3.5" /> EMERGENCY STOP
                </span>
              ) : s?.isPaused ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Pause className="w-3.5 h-3.5" /> PAUSED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE & DISPATCHING
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              ApplyVise Growth Engine
            </h1>
            <p className="text-sm text-stone-400 mt-1 max-w-2xl">
              Coordinated AI marketing department optimizing SEO, authoritative editorial publishing, multi-platform thought leadership, competitor benchmark monitoring, and conversion funnels.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Autonomy Selector */}
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-1 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => handleModeChange('assisted')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  s?.autonomyMode === 'assisted'
                    ? 'bg-amber-500 text-black font-semibold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Assisted
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('supervised')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  s?.autonomyMode === 'supervised'
                    ? 'bg-amber-500 text-black font-semibold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Supervised Autopilot
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('autonomous')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  s?.autonomyMode === 'autonomous'
                    ? 'bg-amber-500 text-black font-semibold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Controlled Autonomous
              </button>
            </div>

            {/* Pause / Resume */}
            <button
              type="button"
              onClick={handleTogglePause}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-200 flex items-center gap-1.5 transition"
            >
              {s?.isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              {s?.isPaused ? 'Resume Agents' : 'Pause Agents'}
            </button>

            {/* Emergency Stop */}
            <button
              type="button"
              onClick={handleEmergencyStop}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                s?.emergencyStopped
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                  : 'bg-rose-950/70 hover:bg-rose-900 text-rose-300 border-rose-800'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              {s?.emergencyStopped ? 'Clear Emergency Stop' : 'EMERGENCY STOP'}
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 mt-6 pt-5 border-t border-stone-800/80 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Strategy & Workforce', icon: Bot },
            { id: 'seo', label: 'SEO & Keywords', icon: Search },
            { id: 'content', label: 'Content Studio', icon: FileText, badge: contentList.length },
            { id: 'social_competitors', label: 'Social & Competitors', icon: Share2 },
            { id: 'funnel', label: 'Funnel & Analytics', icon: TrendingUp },
            { id: 'settings', label: 'Autonomy Settings', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-black text-amber-400' : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: STRATEGY & WORKFORCE OVERVIEW */}
      {/* ==================================================================== */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl relative overflow-hidden">
              <div className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1 flex items-center justify-between">
                <span>30-Day Organic Visitors</span>
                <Globe className="w-4 h-4 text-amber-400/80" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-1">
                {overview.kpis.totalVisitors30d.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-400 font-medium mt-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +22.4% vs prior month
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl relative overflow-hidden">
              <div className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1 flex items-center justify-between">
                <span>Total Registrations</span>
                <Users className="w-4 h-4 text-amber-400/80" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-1">
                {overview.kpis.signups30d.toLocaleString()}
              </div>
              <div className="text-xs text-stone-400 font-medium mt-2 flex items-center gap-1">
                <span>{((overview.kpis.signups30d / overview.kpis.totalVisitors30d) * 100).toFixed(1)}% conversion rate</span>
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl relative overflow-hidden">
              <div className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1 flex items-center justify-between">
                <span>Avg SEO Health Score</span>
                <Award className="w-4 h-4 text-emerald-400/80" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-1">
                {overview.kpis.averageSeoHealthScore} <span className="text-lg font-normal text-stone-500">/ 100</span>
              </div>
              <div className="text-xs text-emerald-400 font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {overview.kpis.indexedPagesCount} indexed canonical routes
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl relative overflow-hidden">
              <div className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-1 flex items-center justify-between">
                <span>Active Paying Subscriptions</span>
                <DollarSign className="w-4 h-4 text-amber-400/80" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-1">
                {overview.kpis.activeSubscribers}
              </div>
              <div className="text-xs text-amber-400 font-medium mt-2 flex items-center gap-1">
                <span>Pro ($19) & Black Elite ($29)</span>
              </div>
            </div>
          </div>

          {/* Weekly Growth Memo */}
          {overview.weeklyGrowthMemo && (
            <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-amber-500/30 rounded-2xl p-6 relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Weekly Executive Memo — Week {overview.weeklyGrowthMemo.weekNumber}, {overview.weeklyGrowthMemo.year}
                </span>
                <span className="text-xs text-stone-400">
                  Produced autonomously by Chief Growth Intelligence Agent
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">
                {overview.weeklyGrowthMemo.headline}
              </h2>
              <p className="text-sm text-stone-300 leading-relaxed mb-4">
                {overview.weeklyGrowthMemo.executiveSummary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-stone-800 text-xs">
                <div>
                  <h4 className="font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Key Initiatives Completed
                  </h4>
                  <ul className="space-y-1.5 text-stone-300">
                    {overview.weeklyGrowthMemo.keyInitiativesCompleted.map((init: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{init}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5" /> Bottlenecks Identified
                  </h4>
                  <ul className="space-y-1.5 text-stone-300">
                    {overview.weeklyGrowthMemo.bottlenecksIdentified.map((bot: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{bot}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Recommendations
                  </h4>
                  <ul className="space-y-1.5 text-stone-300">
                    {overview.weeklyGrowthMemo.recommendationsNextWeek.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-sky-400 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Pending Action Approvals Queue */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  Agent Actions Requiring Human Sign-Off
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Supervised Autopilot holds editorial releases, ad campaigns, and external distribution for explicit operator confirmation.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {overview.pendingTasks.length} Pending Actions
              </span>
            </div>

            {overview.pendingTasks.length === 0 ? (
              <div className="text-center py-8 text-stone-500 text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60 mb-2" />
                All agent tasks up to date. Zero items awaiting review.
              </div>
            ) : (
              <div className="space-y-3">
                {overview.pendingTasks.map((t: GrowthAgentTask) => (
                  <div
                    key={t.id}
                    className="bg-stone-950 border border-stone-800 hover:border-stone-700 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-800 text-stone-300">
                          {t.agentType.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.priority === 'high' || t.priority === 'critical'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {t.priority} Priority
                        </span>
                        <span className="text-[11px] text-stone-500">
                          {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-stone-100">{t.title}</h4>
                      {t.payload?.expectedLiftPercent && (
                        <p className="text-xs text-stone-400 mt-1">
                          Projected impact: <strong className="text-emerald-400">+{t.payload.expectedLiftPercent}%</strong> lift on target metric.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => handleRejectTask(t.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700 transition"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveTask(t.id)}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition shadow-sm"
                      >
                        Approve & Execute
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Autonomous Workforce Roster */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-amber-400" />
                  Marketing Agent Workforce (8 Specialized Agents)
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Each agent operates dedicated intelligence domains with deterministic rule constraints and zero score fabrication.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {overview.workforceStatus.map((agent: any) => {
                const isRunning = runningAgent === agent.agentType;
                return (
                  <div
                    key={agent.agentType}
                    className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between hover:border-stone-700 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-mono text-stone-400">
                          {agent.successRatePercent}% Success
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-100">{agent.name}</h4>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                        {agent.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                      <span className="text-[10px] text-stone-500">
                        Run: {new Date(agent.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={() => handleRunAgent(agent.agentType)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-amber-500 hover:text-black text-amber-400 border border-stone-700 transition flex items-center gap-1 disabled:opacity-50"
                      >
                        {isRunning ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        <span>{isRunning ? 'Running...' : 'Run Now'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: SEO & KEYWORDS */}
      {/* ==================================================================== */}
      {activeTab === 'seo' && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 p-5 rounded-2xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-amber-400" />
                Technical SEO Audits & Keyword Clusters
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Real-time crawl verification, canonical tag integrity, robots directives, and search volume clustering.
              </p>
            </div>
            <button
              type="button"
              disabled={runningAgent === 'seo_intelligence'}
              onClick={() => handleRunAgent('seo_intelligence')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-2 transition disabled:opacity-50 self-start sm:self-auto"
            >
              {runningAgent === 'seo_intelligence' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Run On-Page SEO Audit</span>
            </button>
          </div>

          {/* Crawled Pages Health */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-stone-200 uppercase tracking-wider mb-3">
              Audited Landing & Resource Pages
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950 text-stone-400 uppercase font-mono text-[10px] border-b border-stone-800">
                  <tr>
                    <th className="py-2.5 px-3">Page Route</th>
                    <th className="py-2.5 px-3">SEO Health Score</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Word Count</th>
                    <th className="py-2.5 px-3">Schema Type</th>
                    <th className="py-2.5 px-3">Robots Directive</th>
                    <th className="py-2.5 px-3">Canonical Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {seoProperties.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-850/50 transition">
                      <td className="py-3 px-3 font-semibold text-white font-mono">
                        {p.url}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {p.seoScore} / 100
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400 font-mono font-semibold">
                          HTTP {p.statusCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-300 font-mono">
                        {p.wordCount.toLocaleString()} words
                      </td>
                      <td className="py-3 px-3 text-stone-400 font-mono">
                        {p.structuredDataType || 'None'}
                      </td>
                      <td className="py-3 px-3 text-stone-400 font-mono">
                        {p.robotsDirective}
                      </td>
                      <td className="py-3 px-3 text-stone-400 truncate max-w-xs font-mono text-[11px]">
                        {p.canonicalUrl}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Keyword Clusters */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-stone-200 uppercase tracking-wider mb-3">
              High-Intent Keyword Clusters & Target Content
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seoKeywords.map((k) => (
                <div
                  key={k.id}
                  className="bg-stone-950 border border-stone-800 p-4 rounded-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {k.primaryIntent}
                      </span>
                      <span className="text-xs font-mono text-stone-400">
                        {k.monthlySearchVolume.toLocaleString()} searches/mo
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-white">{k.clusterName}</h5>
                    <p className="text-xs text-amber-300 font-mono mt-1">
                      Target: "{k.primaryKeyword}"
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {k.keywords.slice(0, 3).map((kw: string, i: number) => (
                        <span key={i} className="text-[11px] bg-stone-900 text-stone-400 px-2 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {k.targetContentUrl && (
                    <div className="mt-4 pt-3 border-t border-stone-850 flex items-center justify-between text-xs">
                      <span className="text-stone-500 truncate">{k.targetContentUrl}</span>
                      <a
                        href={k.targetContentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        Preview <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: CONTENT STUDIO */}
      {/* ==================================================================== */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 p-5 rounded-2xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Authoritative Content Studio & Editorial Pipeline
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Long-form career, ATS, and interview guides with canonical indexation, reading time, and zero-hallucination verification.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                disabled={runningAgent === 'content_marketing'}
                onClick={() => handleRunAgent('content_marketing')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                AI Generate Guide
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingArticle(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5 transition"
              >
                <PlusCircle className="w-4 h-4" />
                Create New Draft
              </button>
            </div>
          </div>

          {/* New Article Creation Form Modal / Drawer */}
          {isCreatingArticle && (
            <div className="bg-stone-900 border border-amber-500/40 p-6 rounded-2xl animate-fade-in shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-amber-400" /> Draft New Educational Guide
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreatingArticle(false)}
                  className="text-stone-400 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={handleCreateArticleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Article Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Master the STAR Method for Behavioral Interviews in 2026"
                      value={newArticleTitle}
                      onChange={(e) => setNewArticleTitle(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">
                      Primary Target Keyword
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. behavioral interview framework"
                      value={newArticleKeyword}
                      onChange={(e) => setNewArticleKeyword(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Body Content (Markdown Supported)
                  </label>
                  <textarea
                    rows={6}
                    placeholder="## 1. Introduction&#10;&#10;Explain the structured methodology with concrete metrics..."
                    value={newArticleMarkdown}
                    onChange={(e) => setNewArticleMarkdown(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingArticle(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-850 hover:bg-stone-800 text-stone-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md"
                  >
                    Save Draft Article
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Articles Table */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-stone-200 uppercase tracking-wider mb-3">
              Editorial Inventory ({contentList.length} Articles)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950 text-stone-400 uppercase font-mono text-[10px] border-b border-stone-800">
                  <tr>
                    <th className="py-2.5 px-3">Title & Slug</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Primary Keyword</th>
                    <th className="py-2.5 px-3">Read Time</th>
                    <th className="py-2.5 px-3">Organic Views</th>
                    <th className="py-2.5 px-3">Conversions</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {contentList.map((a) => (
                    <tr key={a.id} className="hover:bg-stone-850/50 transition">
                      <td className="py-3 px-3 max-w-sm">
                        <div className="font-bold text-white truncate">{a.title}</div>
                        <div className="text-[11px] font-mono text-stone-500 truncate">/resources/{a.slug}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            a.status === 'PUBLISHED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : a.status === 'REVIEW_REQUIRED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-300 font-mono">
                        {a.primaryKeyword || '—'}
                      </td>
                      <td className="py-3 px-3 text-stone-400 font-mono">
                        {a.readTimeMinutes} min
                      </td>
                      <td className="py-3 px-3 text-stone-300 font-mono font-semibold">
                        {a.viewsCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-mono font-semibold">
                        {a.conversionsCount}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedArticle(a)}
                            className="px-2.5 py-1 rounded-lg text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
                          >
                            Inspect
                          </button>
                          {!a.isPublished && (
                            <button
                              type="button"
                              onClick={() => handlePublishArticle(a.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition"
                            >
                              Publish
                            </button>
                          )}
                          {a.isPublished && (
                            <a
                              href={`/resources/${a.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-stone-400 hover:text-amber-400 transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Article Detail Drawer / Inspector */}
          {selectedArticle && (
            <div className="bg-stone-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <div>
                  <span className="text-xs font-mono text-amber-400 font-bold uppercase">
                    Editorial Preview & Metadata
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedArticle.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="text-stone-400 hover:text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div className="md:col-span-2 space-y-4">
                  <div className="bg-stone-950 border border-stone-800 p-4 rounded-xl">
                    <h5 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                      Article Body (Markdown)
                    </h5>
                    <div className="text-xs text-stone-300 font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                      {selectedArticle.bodyMarkdown}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="bg-stone-950 border border-stone-800 p-4 rounded-xl space-y-2">
                    <h5 className="font-bold text-stone-300 uppercase tracking-wider mb-2">
                      SEO & Social Meta
                    </h5>
                    <div>
                      <span className="text-stone-500">SEO Title:</span>
                      <p className="text-white font-medium">{selectedArticle.seoTitle}</p>
                    </div>
                    <div>
                      <span className="text-stone-500">Meta Description:</span>
                      <p className="text-stone-300 mt-0.5">{selectedArticle.metaDescription}</p>
                    </div>
                    <div>
                      <span className="text-stone-500">Canonical URL:</span>
                      <p className="text-amber-400 font-mono break-all mt-0.5">{selectedArticle.canonicalUrl}</p>
                    </div>
                    <div>
                      <span className="text-stone-500">Call to Action:</span>
                      <p className="text-emerald-400 font-semibold">{selectedArticle.callToAction?.text} ({selectedArticle.callToAction?.url})</p>
                    </div>
                  </div>

                  {!selectedArticle.isPublished && (
                    <button
                      type="button"
                      onClick={() => handlePublishArticle(selectedArticle.id)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg transition"
                    >
                      Publish to Live Website Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: SOCIAL & COMPETITORS */}
      {/* ==================================================================== */}
      {activeTab === 'social_competitors' && (
        <div className="space-y-6">
          {/* Social Posts Section */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-amber-400" />
                  Multi-Platform Social Marketing Pipeline
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Automated distribution drafts for LinkedIn and X highlighting zero-hallucination resume tailoring.
                </p>
              </div>
              <button
                type="button"
                disabled={runningAgent === 'social_media'}
                onClick={() => handleRunAgent('social_media')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-amber-500 hover:text-black text-amber-400 border border-stone-700 flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" /> Draft New Social Post
              </button>
            </div>

            <div className="space-y-3">
              {socialPosts.length === 0 ? (
                <div className="text-center py-6 text-stone-500 text-xs">
                  Zero social drafts generated. Click "Draft New Social Post" to trigger the Social Media Agent.
                </div>
              ) : (
                socialPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-stone-950 border border-stone-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-800 text-amber-400">
                          {post.platform}
                        </span>
                        <span className="text-[11px] text-stone-500 font-mono">
                          {post.postText.length} characters
                        </span>
                      </div>
                      <p className="text-xs text-stone-200 whitespace-pre-wrap leading-relaxed">
                        {post.postText}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <span className="text-[11px] font-mono text-stone-400 px-2 py-1 rounded bg-stone-900 border border-stone-800">
                        {post.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Connected Integrations Status */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-stone-200 uppercase tracking-wider mb-2">
              External Marketing Integrations Status
            </h4>
            <p className="text-xs text-stone-400 mb-4">
              ApplyVise practices honest connection transparency: APIs without verified keys display disconnected badges.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {integrations.map((i) => (
                <div
                  key={i.id}
                  className="bg-stone-950 border border-stone-800 p-4 rounded-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">{i.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          i.status === 'connected'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {i.status}
                      </span>
                    </div>
                    {i.errorMessage && (
                      <p className="text-[11px] text-stone-400 leading-normal mt-1">
                        {i.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t border-stone-850 text-[10px] text-stone-500 font-mono">
                    Key: {i.integrationKey}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor Benchmarks */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-stone-200 uppercase tracking-wider">
                  Verified Competitor Intelligence Radar
                </h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Continuously benchmarked against Simplify, Teal, Jobscan, and Huntr for feature parity and pricing advantage.
                </p>
              </div>
              <button
                type="button"
                disabled={runningAgent === 'competitor_intelligence'}
                onClick={() => handleRunAgent('competitor_intelligence')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Scan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {competitors.map((c) => (
                <div
                  key={c.id}
                  className="bg-stone-950 border border-stone-800 p-5 rounded-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-base font-bold text-white">{c.name}</h5>
                      <a
                        href={c.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                      >
                        {c.websiteUrl.replace('https://', '')} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-xs text-stone-300 mb-3">{c.positioningSummary}</p>

                    <div className="text-xs space-y-1.5 mb-3">
                      <div className="text-stone-400 font-semibold">Public Pricing:</div>
                      <div className="flex flex-wrap gap-2">
                        {c.pricingTiers.map((p: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-stone-900 text-stone-300 font-mono text-[11px] border border-stone-800">
                            {p.tierName}: <strong className="text-amber-400">{p.price}</strong>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="text-stone-400 font-semibold">Identified Weaknesses vs ApplyVise:</div>
                      <ul className="text-stone-400 space-y-0.5">
                        {c.weaknesses.map((w: string, i: number) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: FUNNEL & ANALYTICS */}
      {/* ==================================================================== */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              7-Stage User Acquisition & Conversion Funnel
            </h3>
            <p className="text-xs text-stone-400 mb-6">
              Track candidate progression from first anonymous visit to verified paid subscriber with automated step drop-off calculations.
            </p>

            {funnelMetrics.length > 0 && (
              <div className="space-y-3">
                {[
                  { stage: '1. Website Visitors', count: funnelMetrics[0].visitorsCount, rate: 100 },
                  { stage: '2. Registered Signups', count: funnelMetrics[0].signupsCount, rate: (funnelMetrics[0].signupsCount / funnelMetrics[0].visitorsCount) * 100 },
                  { stage: '3. Profile & Facts Completed', count: funnelMetrics[0].profileCompletedCount, rate: (funnelMetrics[0].profileCompletedCount / funnelMetrics[0].signupsCount) * 100 },
                  { stage: '4. First Tailored Resume', count: funnelMetrics[0].resumeTailoredCount, rate: (funnelMetrics[0].resumeTailoredCount / funnelMetrics[0].profileCompletedCount) * 100 },
                  { stage: '5. First Autonomous Application', count: funnelMetrics[0].firstApplicationCount, rate: (funnelMetrics[0].firstApplicationCount / funnelMetrics[0].resumeTailoredCount) * 100 },
                  { stage: '6. Started Plan Checkout', count: funnelMetrics[0].checkoutStartedCount, rate: (funnelMetrics[0].checkoutStartedCount / funnelMetrics[0].firstApplicationCount) * 100 },
                  { stage: '7. Paid Pro / Black Subscriber', count: funnelMetrics[0].paidSubscribersCount, rate: (funnelMetrics[0].paidSubscribersCount / funnelMetrics[0].checkoutStartedCount) * 100 },
                ].map((step, idx) => (
                  <div key={idx} className="bg-stone-950 border border-stone-800 p-4 rounded-xl">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-white">{step.stage}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-stone-300 font-mono font-semibold">
                          {step.count.toLocaleString()} candidates
                        </span>
                        <span className="text-amber-400 font-mono font-bold">
                          {step.rate.toFixed(1)}% conversion
                        </span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(4, step.rate))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: SETTINGS */}
      {/* ==================================================================== */}
      {activeTab === 'settings' && overview && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              Growth Engine Autonomy & Safety Governance
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Configure operational boundaries, human sign-off gates, and marketing budget limits.
            </p>
          </div>

          <div className="space-y-4 max-w-xl text-xs">
            <div>
              <label className="block font-semibold text-stone-300 mb-1.5">
                Autonomy Operating Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { mode: 'assisted', label: 'Mode 1: Assisted', desc: 'All agent actions require approval' },
                  { mode: 'supervised', label: 'Mode 2: Supervised', desc: 'Routine automated; publish held' },
                  { mode: 'autonomous', label: 'Mode 3: Autonomous', desc: 'Auto-publish approved categories' },
                ].map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => handleModeChange(item.mode as any)}
                    className={`p-3 rounded-xl border text-left transition ${
                      s?.autonomyMode === item.mode
                        ? 'bg-amber-500/10 border-amber-500 text-white'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-stone-200">{item.label}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-300 mb-1">
                Content Publishing Frequency
              </label>
              <input
                type="number"
                min="1"
                max="14"
                defaultValue={s?.contentFrequencyPerWeek}
                onChange={(e) => api.updateGrowthSettings({ contentFrequencyPerWeek: Number(e.target.value) })}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <span className="text-[11px] text-stone-500">Articles drafted per week</span>
            </div>

            <div>
              <label className="block font-semibold text-stone-300 mb-1">
                Monthly Advertising & Distribution Budget Ceiling ($)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                defaultValue={s?.budgetCeilingMonthly}
                onChange={(e) => api.updateGrowthSettings({ budgetCeilingMonthly: Number(e.target.value) })}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <span className="text-[11px] text-stone-500">Hard limit on paid campaign execution ($0 = strictly organic)</span>
            </div>

            <div className="pt-4 border-t border-stone-800">
              <button
                type="button"
                onClick={handleEmergencyStop}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  s?.emergencyStopped
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900'
                }`}
              >
                <AlertOctagon className="w-4 h-4" />
                {s?.emergencyStopped ? 'Clear Emergency Stop' : 'Activate Immediate Emergency Stop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
