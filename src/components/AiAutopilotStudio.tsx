import React, { useState, useEffect } from 'react';
import {
  Bot,
  Play,
  Pause,
  Compass,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Settings,
  Shield,
  FileText,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import {
  AutopilotDashboardSummary,
  AutopilotJobItem,
  AutopilotOperatingMode,
} from '../types/autopilot.ts';

interface AiAutopilotStudioProps {
  currentUser: AuthUser;
  onNavigateRadar?: () => void;
  onNavigateHome?: () => void;
}

export const AiAutopilotStudio: React.FC<AiAutopilotStudioProps> = ({
  currentUser,
  onNavigateRadar,
  onNavigateHome,
}) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AutopilotDashboardSummary | null>(null);
  const [jobs, setJobs] = useState<AutopilotJobItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'activity' | 'settings'>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isBlack = true; // High-end BLACK ELITE design system integration

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, jobsRes] = await Promise.all([
        api.getAutopilotSummary(),
        api.getAutopilotJobs(),
      ]);
      if (sumRes.success) setSummary(sumRes.summary);
      if (jobsRes.success) setJobs(jobsRes.jobs);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to load Autopilot state.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleToggleAutomation = async () => {
    if (!summary) return;
    try {
      setActionLoading('toggle');
      const nextActive = !summary.settings.automationActive;
      const res = await api.updateAutopilotSettings({
        automationActive: nextActive,
        consentGiven: true,
      });
      if (res.success) {
        setSummary(prev => prev ? { ...prev, settings: res.settings } : prev);
        setFeedback({
          type: 'success',
          message: nextActive
            ? '🚀 Autopilot Agent active! Eligible applications will be automatically prepared.'
            : '⏸️ Autopilot Agent paused safely.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDiscoverJobs = async () => {
    try {
      setActionLoading('discover');
      const res = await api.discoverAutopilotJobs();
      if (res.success) {
        setJobs(res.jobs);
        setFeedback({ type: 'success', message: `Discovered and evaluated ${res.count} vacancies from GCDE.` });
        await loadData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitJob = async (jobId: string) => {
    try {
      setActionLoading(`submit_${jobId}`);
      const res = await api.submitAutopilotJob(jobId);
      if (res.success) {
        setFeedback({ type: 'success', message: `✅ ${res.message} (Ref: ${res.submissionReference})` });
      } else {
        setFeedback({
          type: res.requiresAttention ? 'error' : 'error',
          message: res.requiresAttention ? `⚠️ Action needed: ${res.message}` : `❌ Submission stopped: ${res.message}`,
        });
      }
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !summary) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="h-8 w-8 text-[#C6A66A] animate-spin mb-3" />
        <p className="text-xs text-[#B7B4AD]">Initializing ApplyVise Autopilot Agent & Quotas...</p>
      </div>
    );
  }

  const entitlement = summary?.entitlement;
  const stats = summary?.stats;
  const isFounder = entitlement?.unlimited || entitlement?.planId === 'founder';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 font-sans text-[#F0EEE9]">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          feedback.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center space-x-2 text-xs font-medium">
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#13161B] via-[#171B22] to-[#101216] border border-[#292D34] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Bot className="h-48 w-48 text-[#C6A66A]" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#08090B] border border-[#C6A66A]/30 text-[#C6A66A] text-[11px] font-semibold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              <span>Autonomous AI Job Application Agent</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F0EEE9]">
              ApplyVise Autopilot
            </h1>
            <p className="text-xs sm:text-sm text-[#B7B4AD] max-w-2xl leading-relaxed">
              Discovers verified vacancies, evaluates 6-dimension candidate eligibility, personalises application materials without hallucination, and truthfully executes supported ATS submissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDiscoverJobs}
              disabled={actionLoading === 'discover'}
              className="px-4 py-2.5 rounded-xl bg-[#191D23] hover:bg-[#222730] border border-[#292D34] text-xs font-bold text-[#F0EEE9] flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
            >
              <Compass className={`h-3.5 w-3.5 text-[#C6A66A] ${actionLoading === 'discover' ? 'animate-spin' : ''}`} />
              <span>Find New Jobs</span>
            </button>

            <button
              onClick={handleToggleAutomation}
              disabled={actionLoading === 'toggle'}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-lg ${
                summary?.settings.automationActive
                  ? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200'
                  : 'bg-gradient-to-r from-[#C6A66A] to-[#E2C58A] hover:from-[#D4B579] hover:to-[#EED69F] text-[#08090B]'
              }`}
            >
              {summary?.settings.automationActive ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause Autopilot</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Activate Autopilot</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quota & Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Quota Card */}
        <div className="p-5 rounded-xl bg-[#13161B] border border-[#292D34] space-y-3">
          <div className="flex items-center justify-between text-xs text-[#B7B4AD]">
            <span>Monthly Submission Quota</span>
            <span className="font-mono text-[10px] text-[#C6A66A] uppercase font-bold">
              {isFounder ? 'FOUNDER PRIVILEGE' : `${entitlement?.planId} PLAN`}
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-[#F0EEE9]">
              {isFounder ? 'Unlimited' : `${entitlement?.usageCount || 0} / ${entitlement?.monthlyLimit || 2}`}
            </span>
            {!isFounder && (
              <span className="text-xs text-[#8E8B83]">
                ({entitlement?.remainingCount || 0} remaining)
              </span>
            )}
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#08090B] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C6A66A] to-[#E2C58A] transition-all duration-300"
              style={{
                width: isFounder ? '100%' : `${Math.min(100, (((entitlement?.usageCount || 0) / (entitlement?.monthlyLimit || 2)) * 100))}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-[#8E8B83]">
            {isFounder
              ? 'Exclusively verified founder account. Unrestricted auto-apply submissions active.'
              : `Resets on ${new Date(entitlement?.billingPeriodEnd || Date.now()).toLocaleDateString()}`}
          </p>
        </div>

        {/* In-Flight Applications */}
        <div className="p-5 rounded-xl bg-[#13161B] border border-[#292D34] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#B7B4AD]">
            <span>Active Queue & In-Progress</span>
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-[#F0EEE9]">
            {stats?.inProgress || 0}
          </div>
          <p className="text-[10px] text-[#8E8B83]">
            {stats?.awaitingApproval || 0} awaiting review, {stats?.needsAttention || 0} needs screening input.
          </p>
        </div>

        {/* Successfully Submitted */}
        <div className="p-5 rounded-xl bg-[#13161B] border border-[#292D34] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#B7B4AD]">
            <span>Verified Submissions</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-[#F0EEE9]">
            {stats?.submittedCount || 0}
          </div>
          <p className="text-[10px] text-emerald-400/80">
            {stats?.successRate || 100}% verified ATS confirmation rate.
          </p>
        </div>

        {/* Total Discovered Opportunities */}
        <div className="p-5 rounded-xl bg-[#13161B] border border-[#292D34] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#B7B4AD]">
            <span>Discovered Vacancies</span>
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-[#F0EEE9]">
            {stats?.jobsDiscovered || 0}
          </div>
          <p className="text-[10px] text-[#8E8B83]">
            {stats?.eligibleJobs || 0} match candidate eligibility threshold.
          </p>
        </div>
      </div>

      {/* Subnavigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#292D34] pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#191D23] text-[#E2C58A] border border-[#292D34]'
              : 'text-[#B7B4AD] hover:text-[#F0EEE9]'
          }`}
        >
          Autopilot Overview
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'queue'
              ? 'bg-[#191D23] text-[#E2C58A] border border-[#292D34]'
              : 'text-[#B7B4AD] hover:text-[#F0EEE9]'
          }`}
        >
          <span>Application Queue</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#08090B] text-[#C6A66A]">
            {jobs.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-[#191D23] text-[#E2C58A] border border-[#292D34]'
              : 'text-[#B7B4AD] hover:text-[#F0EEE9]'
          }`}
        >
          Agent Activity Log
        </button>
      </div>

      {/* Tab 1: Queue Table */}
      {(activeTab === 'overview' || activeTab === 'queue') && (
        <div className="p-5 rounded-2xl bg-[#13161B] border border-[#292D34] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#F0EEE9]">Target Opportunities</h2>
              <p className="text-xs text-[#B7B4AD]">Evaluated vacancies ready for autonomous execution or assisted review.</p>
            </div>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-[#191D23] hover:bg-[#222730] text-[#B7B4AD] hover:text-[#F0EEE9] border border-[#292D34] transition cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Bot className="h-10 w-10 text-[#737780] mx-auto" />
              <p className="text-xs text-[#B7B4AD]">No vacancies currently in your Autopilot queue.</p>
              <button
                onClick={handleDiscoverJobs}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C6A66A] to-[#E2C58A] text-[#08090B] text-xs font-bold cursor-pointer"
              >
                Scan GCDE for Vacancies
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#292D34] text-[#8E8B83]">
                    <th className="pb-3 font-semibold">Job Title & Company</th>
                    <th className="pb-3 font-semibold">Location</th>
                    <th className="pb-3 font-semibold">Match Score</th>
                    <th className="pb-3 font-semibold">Eligibility</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292D34]/50">
                  {jobs.map(job => (
                    <tr key={job.id} className="hover:bg-[#191D23]/50 transition">
                      <td className="py-3 pr-4">
                        <div className="font-bold text-[#F0EEE9] flex items-center space-x-1.5">
                          <span>{job.jobTitle}</span>
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-[#B7B4AD] hover:text-[#C6A66A]">
                            <ExternalLink className="h-3 w-3 inline" />
                          </a>
                        </div>
                        <div className="text-[11px] text-[#8E8B83]">{job.company}</div>
                      </td>
                      <td className="py-3 pr-4 text-[#B7B4AD]">
                        {job.location}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          job.matchScore >= 80
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                            : job.matchScore >= 65
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                        }`}>
                          {job.matchScore}%
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] font-medium text-[#B7B4AD]">
                          {job.eligibilityStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          job.status === 'SUBMITTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : job.status === 'NEEDS_ATTENTION'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : job.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-[#292D34] text-[#B7B4AD]'
                        }`}>
                          {job.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {job.status === 'SUBMITTED' ? (
                          <span className="text-[11px] text-emerald-400 font-medium">Submitted ✓</span>
                        ) : (
                          <button
                            onClick={() => handleSubmitJob(job.id)}
                            disabled={actionLoading === `submit_${job.id}`}
                            className="px-3 py-1.5 rounded-lg bg-[#191D23] hover:bg-[#C6A66A] hover:text-[#08090B] border border-[#292D34] hover:border-transparent text-xs font-semibold text-[#E2C58A] transition cursor-pointer disabled:opacity-50"
                          >
                            {actionLoading === `submit_${job.id}` ? 'Submitting...' : 'Auto-Apply'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Activity Log */}
      {activeTab === 'activity' && (
        <div className="p-5 rounded-2xl bg-[#13161B] border border-[#292D34] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#F0EEE9]">Agent Activity Log</h2>
            <span className="text-xs text-[#8E8B83]">Ground-truth execution provenance</span>
          </div>

          <div className="space-y-3">
            {(summary?.recentActivity || []).length === 0 ? (
              <p className="text-xs text-[#8E8B83] text-center py-8">No agent activity logged yet.</p>
            ) : (
              (summary?.recentActivity || []).map(act => (
                <div key={act.id} className="p-3 rounded-xl bg-[#08090B]/60 border border-[#292D34]/80 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold text-[#C6A66A]">{act.agentName}</span>
                      <span className="text-xs text-[#8E8B83]">•</span>
                      <span className="text-xs font-semibold text-[#F0EEE9]">{act.action}</span>
                    </div>
                    {act.details && (
                      <p className="text-[11px] text-[#B7B4AD]">{act.details}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-[#737780]">
                      {new Date(act.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAutopilotStudio;
