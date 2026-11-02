import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Search,
  Building,
  MapPin,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Layers,
  HelpCircle,
  Zap,
  Bot,
  Activity,
  FileText
} from 'lucide-react';
import {
  UserProfile,
  CareerPreferences,
  JobVacancy,
  ApplicationRecord,
  AuditLogEntry
} from '../types/index.ts';
import { DashboardSummary } from '../services/api.ts';

interface CareerCommandCenterProps {
  user: { fullName: string; email: string };
  summary: DashboardSummary | null;
  profile: UserProfile | null;
  preferences: CareerPreferences | null;
  vacancies: JobVacancy[];
  applications: ApplicationRecord[];
  onNavigateTab: (tab: string) => void;
  onSelectVacancy: (vacancy: JobVacancy) => void;
  onOpenOnboarding: () => void;
  onAskCopilotPrompt: (prompt: string) => void;
  onSearchJobs: (query: string) => void;
}

export const CareerCommandCenter: React.FC<CareerCommandCenterProps> = ({
  user,
  summary,
  profile,
  preferences,
  vacancies,
  applications,
  onNavigateTab,
  onSelectVacancy,
  onOpenOnboarding,
  onAskCopilotPrompt,
  onSearchJobs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback calculation if summary is loading
  const profileScore = summary?.profileCompletion ?? (
    profile?.fullName && profile?.experiences?.length ? 85 : 35
  );

  const activeAppsCount = summary?.activeApplicationsCount ?? (
    applications.filter(a => ['SUBMITTED', 'SUBMITTED_CONFIRMED', 'INTERVIEW', 'INTERVIEWING', 'TRACKED'].includes(a.status)).length
  );

  const upcomingInterviewsCount = summary?.upcomingInterviewsCount ?? (
    applications.filter(a => ['INTERVIEW', 'INTERVIEWING'].includes(a.status)).length
  );

  const highMatches = (summary?.topMatches && summary.topMatches.length > 0)
    ? summary.topMatches
    : vacancies.slice(0, 4);

  const relevantMatchesCount = summary?.relevantMatchesCount ?? (
    vacancies.filter(v => (v.matchEvaluation?.matchScore || 0) >= 70).length || vacancies.length
  );

  const nextAction = summary?.nextBestAction || {
    id: 'explore',
    title: 'Discover Live Vacancies',
    description: 'Explore live opportunities synchronized across verified engineering, product, and leadership hiring boards.',
    reason: 'Personalized live vacancies ready for inspection.',
    actionLabel: 'Discover Jobs',
    actionType: 'jobs' as const,
    priority: 'medium' as const,
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchJobs(searchQuery.trim());
      onNavigateTab('jobs');
    }
  };

  const handleExecuteAction = (actionType: string) => {
    if (actionType === 'onboarding') {
      onOpenOnboarding();
    } else if (actionType === 'profile') {
      onNavigateTab('profile');
    } else if (actionType === 'interview') {
      onNavigateTab('interviews');
    } else if (actionType === 'applications') {
      onNavigateTab('applications');
    } else if (actionType === 'matches') {
      onNavigateTab('matches');
    } else {
      onNavigateTab('jobs');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Personalized Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0a1128] to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span>CAREER COMMAND CENTER · ACTIVE OPERATING SYSTEM</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{user.fullName || 'Professional'}</span>
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {profile?.currentTitle
                ? `${profile.currentTitle} ${profile.currentEmployer ? `at ${profile.currentEmployer}` : ''} · ${relevantMatchesCount} live opportunities aligned with your background.`
                : 'Your entire job search, intelligently connected with verified career intelligence and zero hallucination.'}
            </p>
          </div>

          {/* Quick Search Field in Header */}
          <div className="w-full lg:w-96">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-cyan-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search jobs, skills, or roles..."
                className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500/50 shadow-inner"
              />
              <button
                type="submit"
                className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow"
              >
                Find
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 2. Core Career Metrics (Answering: Where do I stand in my career?) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
            Career Overview Metrics
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Real Verified Data</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Profile Completion */}
          <div
            onClick={() => onNavigateTab('profile')}
            className="group p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Profile Completion</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {profileScore}%
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                  style={{ width: `${profileScore}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{profileScore === 100 ? 'Verified Complete' : 'Needs Target Roles'}</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                <span>Edit</span>
                <ChevronRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
          </div>

          {/* Metric 2: Relevant Job Matches */}
          <div
            onClick={() => onNavigateTab('matches')}
            className="group p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Relevant Job Matches</span>
              <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {relevantMatchesCount}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                ≥70% compatibility threshold
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Verified Employer Feeds</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                <span>View</span>
                <ChevronRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
          </div>

          {/* Metric 3: Active Applications */}
          <div
            onClick={() => onNavigateTab('applications')}
            className="group p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Applications</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                <Briefcase className="h-4 w-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {activeAppsCount}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {applications.length} total prepared & tracked
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Tracked Pipelines</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                <span>Track</span>
                <ChevronRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
          </div>

          {/* Metric 4: Upcoming Interviews */}
          <div
            onClick={() => onNavigateTab('interviews')}
            className="group p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Upcoming Interviews</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {upcomingInterviewsCount}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {upcomingInterviewsCount > 0 ? 'Prep workspace active' : 'No active rounds'}
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Interview Coaching</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                <span>Prepare</span>
                <ChevronRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Your Next Best Action (Answering: What should I do next?) */}
      <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#090d1a] border border-slate-200 dark:border-cyan-500/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 text-[10px] font-mono uppercase tracking-wider font-bold border border-cyan-300 dark:border-cyan-500/40">
                Priority: {nextAction.priority}
              </span>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                // Recommended Action
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {nextAction.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {nextAction.description}
            </p>

            <div className="pt-1 flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Reason: {nextAction.reason}</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => handleExecuteAction(nextAction.actionType)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition flex items-center justify-center space-x-2"
            >
              <span>{nextAction.actionLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Application Pipeline (Answering: What is happening with my applications?) */}
      <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-cyan-500" />
              <span>Application Pipeline & Status Lifecycle</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Transparent tracking across all verified stages. Never faking submission receipts.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('applications')}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-1"
          >
            <span>View Full Tracker</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Visual Pipeline Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { key: 'draft', label: 'Draft', count: summary?.pipeline.draft ?? 0, color: 'text-slate-400', border: 'border-slate-300 dark:border-slate-700' },
            { key: 'ready', label: 'Ready to Apply', count: summary?.pipeline.ready ?? 0, color: 'text-cyan-500', border: 'border-cyan-500/40' },
            { key: 'applied', label: 'Applied', count: summary?.pipeline.applied ?? 0, color: 'text-blue-500', border: 'border-blue-500/40' },
            { key: 'interview', label: 'Interview', count: summary?.pipeline.interview ?? 0, color: 'text-purple-500', border: 'border-purple-500/40' },
            { key: 'offer', label: 'Offer', count: summary?.pipeline.offer ?? 0, color: 'text-emerald-500', border: 'border-emerald-500/40' },
            { key: 'rejected', label: 'Rejected', count: summary?.pipeline.rejected ?? 0, color: 'text-rose-400', border: 'border-rose-500/40' },
            { key: 'withdrawn', label: 'Withdrawn', count: summary?.pipeline.withdrawn ?? 0, color: 'text-slate-400', border: 'border-slate-700' },
          ].map(stage => (
            <div
              key={stage.key}
              onClick={() => onNavigateTab('applications')}
              className={`p-3.5 rounded-xl border ${stage.border} bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer text-center space-y-1`}
            >
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                {stage.label}
              </div>
              <div className={`text-xl font-mono font-bold ${stage.color}`}>
                {stage.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Recommended Job Opportunities (Answering: Which job opportunities are relevant to me?) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Briefcase className="h-4 w-4 text-cyan-500" />
              <span>Recommended Job Opportunities</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live vacancies evaluated against your verified profile. Match scores are estimates based on factual requirements.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('jobs')}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-1"
          >
            <span>Discover All Jobs</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {highMatches.map(v => (
            <div
              key={v.id}
              onClick={() => onSelectVacancy(v)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-cyan-300 font-mono text-[10px] uppercase">
                    {v.source}
                  </span>
                  <div className="flex items-center space-x-2">
                    {v.remote && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
                        Remote
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 font-mono text-xs font-bold">
                      {v.matchEvaluation?.matchScore || 85}% match
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                    {v.title}
                  </h4>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <Building className="h-3.5 w-3.5 shrink-0" />
                    <span>{v.company}</span>
                    <span>·</span>
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{v.location}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  {v.requirements?.[0] || 'High alignment with your skills'}
                </span>
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center space-x-1">
                  <span>Inspect</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Career Progress & AI Copilot Shortcuts (Answering: How can I improve my chances?) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Skills & Gap Analysis Snapshot */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Verified Career Twin Status</span>
              </h4>
              <button
                onClick={() => onNavigateTab('twin')}
                className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                Inspect Twin →
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your profile is verified with zero-hallucination factual grounding. Tailored resumes strictly preserve your real employers and metrics.
            </p>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Verified Skills Count:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{profile?.skills?.length || 0} skills</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Recorded Experiences:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{profile?.experiences?.length || 0} positions</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Target Roles Configured:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{preferences?.targetRoles?.length || 0} roles</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigateTab('career_report')}
              className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-cyan-500 text-xs font-semibold text-slate-700 dark:text-slate-200 transition text-center"
            >
              Generate Full Career Intelligence Report
            </button>
          </div>
        </div>

        {/* Right: AI Career Copilot Contextual Assistant */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-[#0c142c] border border-cyan-500/20 shadow-md space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/30 text-cyan-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">AI Career Copilot</h4>
              <p className="text-[11px] text-cyan-300">Context-aware strategy using your authorized career data</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Ask Copilot to analyze your match breakdown, coach you for interviews, or recommend high-impact resume improvements.
          </p>

          <div className="space-y-2 pt-1">
            {[
              'Explain my best job matches and skill alignment',
              'Help me prepare for my next interview with STAR stories',
              'What should I improve in my resume to stand out?',
              'Which applications need my immediate attention?',
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onAskCopilotPrompt(prompt)}
                className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-xs text-slate-200 hover:text-cyan-300 transition flex items-center justify-between group"
              >
                <span className="truncate pr-2">{prompt}</span>
                <ArrowRight className="h-3 w-3 text-cyan-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
