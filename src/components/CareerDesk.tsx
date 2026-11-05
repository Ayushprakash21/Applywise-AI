import React, { useState } from 'react';
import {
  Compass,
  Briefcase,
  Calendar,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Target,
  Sparkles,
  Award,
  ChevronRight,
  CheckCircle,
  Building,
  MapPin,
  DollarSign,
  FileText,
  SlidersHorizontal,
  BookmarkCheck,
  Plus
} from 'lucide-react';
import {
  UserProfile,
  CareerPreferences,
  ApplicationRecord,
  JobVacancy,
  CandidateFact
} from '../types/index.ts';
import { AuthUser, DashboardSummary } from '../services/api.ts';

export interface CareerDeskProps {
  user: AuthUser;
  profile: UserProfile | null;
  preferences: CareerPreferences | null;
  applications: ApplicationRecord[];
  vacancies: JobVacancy[];
  facts?: CandidateFact[];
  summary?: DashboardSummary | null;
  onNavigateTab: (tab: any) => void;
  onSelectVacancy: (vacancy: JobVacancy) => void;
  onOpenPreferences?: () => void;
  onOpenProfile?: () => void;
  onOpenOnboarding?: () => void;
  onOpenImportModal?: () => void;
  onAskCopilotPrompt?: (prompt: string) => void;
  plan?: 'free' | 'pro' | 'black';
  className?: string;
}

interface ActionTask {
  id: string;
  title: string;
  description: string;
  category: 'profile' | 'opportunity' | 'application' | 'interview';
  targetTab: string;
  isCompleted: boolean;
}

export const CareerDesk: React.FC<CareerDeskProps> = ({
  user,
  profile,
  preferences,
  applications,
  vacancies,
  facts = [],
  summary,
  onNavigateTab,
  onSelectVacancy,
  onOpenPreferences,
  onOpenProfile,
  onOpenImportModal,
  plan = 'free',
}) => {
  const isBlack = plan === 'black';

  // 1. Calculate profile completion from verified facts
  const verifiedFacts = facts.filter(f => f.verificationStatus === 'USER_CONFIRMED' || f.verificationStatus === 'EXTRACTED');
  const hasEmployment = (profile?.experiences || profile?.employmentHistory || []).length > 0;
  const hasSkills = (profile?.skills || []).length > 0;
  const hasEducation = (profile?.education || []).length > 0;
  const hasSummary = Boolean(profile?.summary && profile.summary.length > 20);
  const hasPreferences = Boolean(preferences?.targetRoles && preferences.targetRoles.length > 0);

  let completionScore = 20;
  if (hasEmployment) completionScore += 25;
  if (hasSkills) completionScore += 20;
  if (hasEducation) completionScore += 15;
  if (hasSummary) completionScore += 10;
  if (hasPreferences) completionScore += 10;
  completionScore = Math.min(100, completionScore);

  // 2. Real application pipeline counts
  const totalApps = applications.length;
  const inReviewApps = applications.filter(a => ['AWAITING_USER_APPROVAL', 'AWAITING_USER_REVIEW', 'READY_TO_SUBMIT', 'APPLICATION_READY'].includes(a.status)).length;
  const submittedApps = applications.filter(a => ['SUBMITTED_CONFIRMED', 'SUBMITTED', 'REDIRECTED_TO_EMPLOYER'].includes(a.status)).length;
  const interviewApps = applications.filter(a => ['INTERVIEW', 'INTERVIEWING'].includes(a.status)).length;
  const offerApps = applications.filter(a => ['OFFER', 'OFFER_RECEIVED'].includes(a.status)).length;

  // 3. Relevant opportunities (matched with candidate)
  const highMatchVacancies = vacancies
    .filter(v => (v.matchEvaluation?.matchScore || 0) >= 70)
    .slice(0, 3);

  // 4. Action Tasks
  const [tasks, setTasks] = useState<ActionTask[]>([
    {
      id: 'task_profile',
      title: 'Complete Career Facts',
      description: completionScore < 100 ? 'Verify your employment history and skills for accurate ATS alignment.' : 'Your factual candidate registry is complete.',
      category: 'profile',
      targetTab: 'profile',
      isCompleted: completionScore >= 90,
    },
    {
      id: 'task_opps',
      title: 'Review Verified Match Opportunities',
      description: highMatchVacancies.length > 0 ? `${highMatchVacancies.length} high-alignment vacancies are waiting for your review.` : 'Explore verified opportunities on the Opportunity Radar.',
      category: 'opportunity',
      targetTab: 'radar',
      isCompleted: false,
    },
    {
      id: 'task_interview',
      title: 'Prepare Interview Talking Points',
      description: interviewApps > 0 ? `You have ${interviewApps} active interview rounds. Review your STAR responses.` : 'Rehearse role-specific technical questions in the Interview Studio.',
      category: 'interview',
      targetTab: 'interview_studio',
      isCompleted: false,
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Executive Greeting */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all shadow-sm ${
        isBlack
          ? 'bg-[#13161B] border-[rgba(255,255,255,0.075)] text-[#F0EEE9]'
          : 'bg-white/70 dark:bg-slate-900/70 border-white/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
                isBlack
                  ? 'bg-[rgba(198,166,106,0.08)] text-[#C6A66A] border border-[rgba(198,166,106,0.22)]'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40'
              }`}>
                {isBlack ? 'BLACK ELITE CAREER WORKSPACE' : 'EXECUTIVE CAREER DESK'}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">· Active Session</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {profile?.fullName?.split(' ')[0] || user.fullName?.split(' ')[0] || 'Executive'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Your centralized career operations center. Manage professional positioning, monitor market opportunities, and govern application lifecycles.
            </p>
          </div>

          {/* Profile Completion Badge */}
          <div className={`p-4 rounded-2xl border flex items-center space-x-4 min-w-[240px] ${
            isBlack
              ? 'bg-[#0D0F12] border-[rgba(255,255,255,0.08)]'
              : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800'
          }`}>
            <div className="relative flex items-center justify-center">
              <svg className="w-14 h-14 transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-slate-200 dark:text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  stroke="currentColor"
                  strokeWidth="5"
                  className={isBlack ? 'text-[#C6A66A]' : 'text-indigo-600 dark:text-indigo-400'}
                  fill="transparent"
                  strokeDasharray="144"
                  strokeDashoffset={144 - (144 * completionScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute font-mono text-xs font-bold">{completionScore}%</span>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">Profile Status</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {completionScore >= 90 ? 'Verified & Optimized' : 'Action Recommended'}
              </div>
              <button
                onClick={onOpenProfile}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5 block"
              >
                Edit Career Profile ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Personalized Career Brief */}
      <div className={`p-6 sm:p-7 rounded-3xl border ${
        isBlack
          ? 'bg-[#13161B] border-[rgba(255,255,255,0.075)] text-[#F0EEE9]'
          : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl'
      }`}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <Compass className={`w-5 h-5 ${isBlack ? 'text-[#C6A66A]' : 'text-indigo-600 dark:text-indigo-400'}`} />
            <h2 className="text-base sm:text-lg font-bold tracking-tight">Your Career Brief</h2>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenImportModal && (
              <button
                onClick={onOpenImportModal}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isBlack
                    ? 'bg-[rgba(198,166,106,0.1)] hover:bg-[rgba(198,166,106,0.2)] text-[#E8D49E] border border-[rgba(198,166,106,0.25)]'
                    : 'bg-indigo-50 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Import Job</span>
              </button>
            )}
            <button
              onClick={onOpenPreferences}
              className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Search Parameters</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-5 text-xs">
          {/* Professional Positioning */}
          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
            <div className="text-slate-400 uppercase tracking-wider font-mono text-[10px] font-semibold">Current Positioning</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {profile?.currentTitle || 'Professional Candidate'}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-2">
              {profile?.summary || 'Add a professional summary to ground your career positioning in verified facts.'}
            </p>
          </div>

          {/* Target Direction */}
          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
            <div className="text-slate-400 uppercase tracking-wider font-mono text-[10px] font-semibold">Target Roles</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {preferences?.targetRoles && preferences.targetRoles.length > 0 ? preferences.targetRoles[0] : 'General Leadership'}
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {(preferences?.targetRoles || ['Operations', 'Engineering', 'Strategy']).slice(0, 2).map((r: string, i: number) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 font-medium">
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* Strongest Verified Qualifications */}
          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
            <div className="text-slate-400 uppercase tracking-wider font-mono text-[10px] font-semibold">Verified Qualifications</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {verifiedFacts.length} Ground-Truth Facts
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              {(profile?.skills || []).slice(0, 3).map(s => s.name).join(' · ') || 'No skills registered yet.'}
            </p>
          </div>

          {/* Search Preferences */}
          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
            <div className="text-slate-400 uppercase tracking-wider font-mono text-[10px] font-semibold">Arrangement & Locations</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {preferences?.workArrangements?.join(' / ') || 'Remote & Hybrid'}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              {preferences?.targetLocations?.slice(0, 2).join(', ') || 'Global Remote'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Pipeline Metrics & Activity Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('control')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer hover:border-indigo-400 ${
            isBlack ? 'bg-[#13161B] border-[rgba(255,255,255,0.075)] hover:border-[rgba(198,166,106,0.3)]' : 'bg-white/70 dark:bg-slate-900/70 border-white/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Applications</span>
            <Briefcase className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-mono">
            {totalApps}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Active lifecycle</span>
        </div>

        <div
          onClick={() => onNavigateTab('control')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer hover:border-indigo-400 ${
            isBlack ? 'bg-[#13161B] border-[rgba(255,255,255,0.075)] hover:border-[rgba(198,166,106,0.3)]' : 'bg-white/70 dark:bg-slate-900/70 border-white/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Ready for Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-mono">
            {inReviewApps}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Pending approval</span>
        </div>

        <div
          onClick={() => onNavigateTab('interview_studio')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer hover:border-indigo-400 ${
            isBlack ? 'bg-[#13161B] border-[rgba(255,255,255,0.075)] hover:border-[rgba(198,166,106,0.3)]' : 'bg-white/70 dark:bg-slate-900/70 border-white/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Interviews</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-mono">
            {interviewApps}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Rounds scheduled</span>
        </div>

        <div
          onClick={() => onNavigateTab('control')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer hover:border-indigo-400 ${
            isBlack ? 'bg-[#13161B] border-[rgba(255,255,255,0.075)] hover:border-[rgba(198,166,106,0.3)]' : 'bg-white/70 dark:bg-slate-900/70 border-white/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Confirmed Offers</span>
            <Award className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-mono">
            {offerApps}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Total compensation</span>
        </div>
      </div>

      {/* 4. Action Queue & High-Alignment Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Actions */}
        <div className={`lg:col-span-1 p-6 rounded-3xl border space-y-4 ${
          isBlack ? 'bg-[#13161B] border-[rgba(255,255,255,0.075)]' : 'bg-white/70 dark:bg-slate-900/70 border-white/80 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Priority Actions
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {tasks.filter(t => t.isCompleted).length} / {tasks.length} Done
            </span>
          </div>

          <div className="space-y-3">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-start space-x-3 ${
                  task.isCompleted
                    ? 'opacity-60 bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-800/40'
                    : 'bg-white dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800 hover:border-indigo-500'
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="mt-0.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                >
                  {task.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-400" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {task.title}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {task.description}
                  </p>
                  <button
                    onClick={() => onNavigateTab(task.targetTab)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-flex items-center space-x-1"
                  >
                    <span>Execute</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High-Alignment Opportunities */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border space-y-4 ${
          isBlack ? 'bg-[#13161B] border-[rgba(255,255,255,0.075)]' : 'bg-white/70 dark:bg-slate-900/70 border-white/80 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Relevant Market Opportunities
            </h3>
            <button
              onClick={() => onNavigateTab('radar')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Open Opportunity Radar ›
            </button>
          </div>

          {highMatchVacancies.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 space-y-2">
              <Sparkles className="w-6 h-6 mx-auto text-slate-400" />
              <div>No 70%+ alignment vacancies currently cached.</div>
              <button
                onClick={() => onNavigateTab('radar')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 transition"
              >
                Scan Live Radar Feeds
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {highMatchVacancies.map(vac => (
                <div
                  key={vac.id}
                  onClick={() => onSelectVacancy(vac)}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-950/40 hover:border-indigo-400 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {vac.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50">
                        {vac.matchEvaluation?.matchScore || 75}% MATCH
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Building className="w-3.5 h-3.5" />
                        <span>{vac.company}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{vac.location}</span>
                      </span>
                      {vac.salaryRange?.raw && (
                        <>
                          <span>·</span>
                          <span className="flex items-center space-x-1 font-mono">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{vac.salaryRange.raw}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1">
                      <span>View Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
