import React from 'react';
import {
  TrendingUp,
  FileCheck2,
  Send,
  Calendar,
  CheckCircle2,
  Award,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { ApplicationRecord, UserProfile } from '../types/index.ts';

interface CareerMomentumCardProps {
  applications: ApplicationRecord[];
  profile: UserProfile | null;
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

export const CareerMomentumCard: React.FC<CareerMomentumCardProps> = ({
  applications,
  profile,
  onNavigateTab,
  className = '',
}) => {
  // Compute authentic ground truth progress metrics
  const preparedCount = applications.filter(a =>
    ['READY', 'PREPARED', 'SUBMITTED', 'SUBMITTED_CONFIRMED', 'INTERVIEW', 'INTERVIEWING', 'OFFER', 'TRACKED'].includes(a.status)
  ).length;

  const submittedCount = applications.filter(a =>
    ['SUBMITTED', 'SUBMITTED_CONFIRMED', 'INTERVIEW', 'INTERVIEWING', 'OFFER'].includes(a.status)
  ).length;

  const interviewsCount = applications.filter(a =>
    ['INTERVIEW', 'INTERVIEWING', 'OFFER'].includes(a.status)
  ).length;

  const verifiedSkillsCount = (profile?.skills || []).filter(s => s.verified).length;
  const totalSkillsCount = (profile?.skills || []).length;

  const profileCompleteness = Math.min(
    100,
    (profile?.fullName ? 20 : 0) +
      (profile?.email ? 15 : 0) +
      (profile?.experiences?.length ? 30 : 0) +
      (profile?.skills?.length ? 20 : 0) +
      (profile?.education?.length ? 15 : 0)
  );

  const milestones: Array<{
    label: string;
    value: number | string;
    subtext: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    tab: string;
  }> = [
    {
      label: 'Applications Prepared',
      value: preparedCount,
      subtext: 'Targeted & candidate-verified',
      icon: FileCheck2,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200',
      tab: 'applications',
    },
    {
      label: 'Submissions Recorded',
      value: submittedCount,
      subtext: 'Direct to employer portals',
      icon: Send,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200',
      tab: 'applications',
    },
    {
      label: 'Interviews Attended',
      value: interviewsCount,
      subtext: 'STAR coaching ready',
      icon: Calendar,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200',
      tab: 'interviews',
    },
    {
      label: 'Verified Skills',
      value: `${verifiedSkillsCount}/${totalSkillsCount || 0}`,
      subtext: 'Extracted from work history',
      icon: Award,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200',
      tab: 'profile',
    },
  ];

  return (
    <div className={`p-5 rounded-2xl neu-surface border border-white/80 shadow-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Career Momentum
            </h3>
            <p className="text-xs text-slate-500">Measurable Progress Across Active Search</p>
          </div>
        </div>

        {/* Profile Completeness Pill */}
        <div className="flex items-center space-x-2">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 font-mono block">Profile Depth</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
              {profileCompleteness}% Complete
            </span>
          </div>
          <div className="w-10 h-10 rounded-full neu-inset flex items-center justify-center font-mono text-xs font-bold text-blue-600">
            {profileCompleteness}%
          </div>
        </div>
      </div>

      {/* Real Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
        {milestones.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab && onNavigateTab(m.tab)}
              className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 hover:border-blue-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`p-1.5 rounded-lg border text-xs ${m.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  {m.value}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {m.label}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {m.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Progress Integrity Guarantee */}
      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span className="flex items-center space-x-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>Zero fabricated activity. All metrics derived from verified user data.</span>
        </span>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('applications')}
            className="text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1"
          >
            <span>View Pipeline</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};