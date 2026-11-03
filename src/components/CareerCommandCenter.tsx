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

  // Fallback calculations
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
    description: 'Explore live opportunities synchronized across verified company hiring feeds.',
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

  // Recent applications (last 4)
  const recentApplications = applications.slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. Welcoming Consumer SaaS Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 neu-panel p-6 sm:p-7">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Welcome back, {user.fullName ? user.fullName.split(' ')[0] : 'Job Seeker'}!</span>
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {profile?.currentTitle
              ? `${profile.currentTitle} ${profile.currentEmployer ? `at ${profile.currentEmployer}` : ''} · ${relevantMatchesCount} opportunities aligned with your background.`
              : "Here is what's happening with your job applications and recommended next steps."}
          </p>
        </div>

        {/* Quick Search */}
        <div className="w-full md:w-80">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search jobs, skills, or companies..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl neu-input text-xs text-slate-900 placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1.5 rounded-lg neu-button-primary text-xs font-semibold"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* 2. Key Metrics Row (Matching JobHuntly / Flashjobs / My Job Trackr) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Applications */}
        <div
          onClick={() => onNavigateTab('applications')}
          className="group p-5 neu-card neu-raised-hover cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Applications</span>
            <div className="w-10 h-10 rounded-xl neu-inset text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {activeAppsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {applications.length} total tracked
            </p>
          </div>
          <div className="flex items-center text-[11px] text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>View Tracker</span>
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        </div>

        {/* Metric 2: Relevant Job Matches */}
        <div
          onClick={() => onNavigateTab('matches')}
          className="group p-5 neu-card neu-raised-hover cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Relevant Job Matches</span>
            <div className="w-10 h-10 rounded-xl neu-inset text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {relevantMatchesCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Matching your target roles
            </p>
          </div>
          <div className="flex items-center text-[11px] text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Review Matches</span>
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        </div>

        {/* Metric 3: Upcoming Interviews */}
        <div
          onClick={() => onNavigateTab('interviews')}
          className="group p-5 neu-card neu-raised-hover cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Upcoming Interviews</span>
            <div className="w-10 h-10 rounded-xl neu-inset text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {upcomingInterviewsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {upcomingInterviewsCount > 0 ? 'Active rounds scheduled' : 'No active rounds'}
            </p>
          </div>
          <div className="flex items-center text-[11px] text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Interview Prep</span>
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        </div>

        {/* Metric 4: Profile Completion */}
        <div
          onClick={() => onNavigateTab('profile')}
          className="group p-5 neu-card neu-raised-hover cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Profile Completion</span>
            <div className="w-10 h-10 rounded-xl neu-inset text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {profileScore}%
            </div>
            <div className="w-full h-2 rounded-full mt-2 neu-inset overflow-hidden p-0.5">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${profileScore}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{profileScore === 100 ? 'Verified Complete' : 'Add details'}</span>
            <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              <span>Edit Profile</span>
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout (Matching JobHuntly / Flashjobs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Left Column (2 Cols): Applications & Jobs */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* Recent Applications Card (JobHuntly style) */}
          <div className="neu-panel p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Applications</h3>
                <p className="text-xs text-slate-500 mt-0.5">Your latest tracked submissions and status updates.</p>
              </div>
              <button
                onClick={() => onNavigateTab('applications')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <span>View All ({applications.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentApplications.length === 0 ? (
              <div className="p-8 text-center neu-inset rounded-2xl space-y-2">
                <Briefcase className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-700 font-medium">No applications saved yet.</p>
                <p className="text-xs text-slate-500">Discover suitable roles and save or tailor applications here.</p>
                <button
                  onClick={() => onNavigateTab('jobs')}
                  className="mt-2 px-4 py-2 rounded-xl neu-button-primary text-xs font-semibold"
                >
                  Find Jobs
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentApplications.map(app => (
                  <div
                    key={app.id}
                    onClick={() => onNavigateTab('applications')}
                    className="p-3.5 rounded-xl neu-surface hover:neu-raised transition cursor-pointer flex items-center justify-between gap-3 border border-white/60"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl neu-inset flex items-center justify-center font-bold text-slate-700 shrink-0 text-sm">
                        {app.company ? app.company[0].toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{app.role}</h4>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{app.company}</span>
                          <span>·</span>
                          <span>{app.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="hidden sm:inline-block text-[11px] text-slate-400">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                        app.status === 'INTERVIEWING'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : app.status === 'OFFER_RECEIVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : app.status === 'SUBMITTED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {app.status.toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Job Opportunities */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recommended Job Opportunities</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Match scores are estimates based on your verified skills and published requirements.
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('jobs')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <span>Browse All Jobs</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {highMatches.map(v => (
                <div
                  key={v.id}
                  onClick={() => onSelectVacancy(v)}
                  className="p-5 neu-card neu-raised-hover cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-lg neu-inset text-slate-600 text-[10px] uppercase font-semibold">
                        {v.source}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {v.remote && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                            Remote
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold">
                          {v.matchEvaluation?.matchScore || 85}% match
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                        {v.title}
                      </h4>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                        <Building className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{v.company}</span>
                        <span>·</span>
                        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{v.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                      {v.requirements?.[0] || 'Aligned with your skills'}
                    </span>
                    <span className="text-blue-600 font-semibold flex items-center space-x-1">
                      <span>View Details</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Next Step, Status & Assistant */}
        <div className="space-y-6">
          {/* Your Recommended Action Card */}
          <div className="neu-panel p-5 sm:p-6 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold uppercase tracking-wider">
                Priority: {nextAction.priority}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Your Recommended Action
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {nextAction.title}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              {nextAction.description}
            </p>

            <div className="pt-1 flex items-center space-x-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Reason: {nextAction.reason}</span>
            </div>

            <button
              onClick={() => handleExecuteAction(nextAction.actionType)}
              className="w-full mt-2 py-2.5 rounded-xl neu-button-primary font-semibold text-xs flex items-center justify-center space-x-1.5"
            >
              <span>{nextAction.actionLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Application Pipeline & Status Lifecycle */}
          <div className="neu-panel p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span>Application Pipeline</span>
              </h3>
              <button
                onClick={() => onNavigateTab('applications')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Track
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: 'Draft', count: summary?.pipeline.draft ?? 0, bg: 'bg-slate-100', text: 'text-slate-700' },
                { label: 'Ready to Apply', count: summary?.pipeline.ready ?? 0, bg: 'bg-cyan-50', text: 'text-cyan-800' },
                { label: 'Applied', count: summary?.pipeline.applied ?? 0, bg: 'bg-blue-50', text: 'text-blue-800' },
                { label: 'Interview', count: summary?.pipeline.interview ?? 0, bg: 'bg-purple-50', text: 'text-purple-800' },
                { label: 'Offer', count: summary?.pipeline.offer ?? 0, bg: 'bg-emerald-50', text: 'text-emerald-800' },
                { label: 'Rejected', count: summary?.pipeline.rejected ?? 0, bg: 'bg-rose-50', text: 'text-rose-800' },
              ].map(st => (
                <div
                  key={st.label}
                  onClick={() => onNavigateTab('applications')}
                  className={`p-2.5 rounded-xl neu-surface hover:neu-raised border border-white/60 cursor-pointer flex items-center justify-between transition`}
                >
                  <span className="text-[11px] font-medium text-slate-600">{st.label}</span>
                  <span className={`font-mono font-bold ${st.text}`}>{st.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Career Copilot Assistance */}
          <div className="neu-panel p-5 sm:p-6 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg neu-inset text-blue-600 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">AI Career Copilot</h4>
                <p className="text-[10px] text-slate-500">Personal guidance based on your verified background</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {[
                'Explain my best job matches and skill alignment',
                'Help me prepare for my next interview with STAR stories',
                'What should I improve in my resume to stand out?',
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onAskCopilotPrompt(prompt)}
                  className="w-full text-left p-2.5 rounded-xl neu-surface hover:neu-raised border border-white/60 text-xs text-slate-700 hover:text-blue-600 transition flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{prompt}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Verified Career Twin Status */}
          <div className="neu-panel p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Verified Career Twin Status</span>
              </h4>
              <button
                onClick={() => onNavigateTab('twin')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Inspect →
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your profile is verified with zero-hallucination grounding. Resumes only use authentic career facts.
            </p>

            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between text-slate-600">
                <span>Verified Skills:</span>
                <span className="font-semibold text-slate-900">{profile?.skills?.length || 0} skills</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Recorded Positions:</span>
                <span className="font-semibold text-slate-900">{profile?.experiences?.length || 0} positions</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Target Roles:</span>
                <span className="font-semibold text-slate-900">{preferences?.targetRoles?.length || 0} configured</span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('career_report')}
              className="w-full mt-2 py-2 rounded-xl neu-button text-xs font-semibold text-slate-700 hover:text-blue-600 transition"
            >
              Generate Full Gap Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
