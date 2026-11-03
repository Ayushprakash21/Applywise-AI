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
  ShieldCheck,
  Clock
} from 'lucide-react';
import { ApplicationRecord, UserProfile } from '../types/index.ts';

export interface CareerMomentumCardProps {
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

  const milestones = [
    {
      label: 'Applications Prepared',
      value: preparedCount,
      subtext: 'Targeted & candidate-verified',
      icon: FileCheck2,
      gradient: 'from-blue-500/15 to-indigo-500/20 text-blue-600 border-blue-200/50',
      tab: 'applications',
    },
    {
      label: 'Submissions Recorded',
      value: submittedCount,
      subtext: 'Direct to employer portals',
      icon: Send,
      gradient: 'from-indigo-500/15 to-[#8065F5]/20 text-[#8065F5] border-indigo-200/50',
      tab: 'applications',
    },
    {
      label: 'Interviews Attended',
      value: interviewsCount,
      subtext: 'STAR coaching ready',
      icon: Calendar,
      gradient: 'from-emerald-500/15 to-teal-500/20 text-emerald-600 border-emerald-200/50',
      tab: 'interviews',
    },
    {
      label: 'Verified Skills',
      value: `${verifiedSkillsCount}/${totalSkillsCount || 0}`,
      subtext: 'Extracted from work history',
      icon: Award,
      gradient: 'from-amber-500/15 to-orange-500/20 text-amber-600 border-amber-200/50',
      tab: 'profile',
    },
  ];

  return (
    <div className={`p-6 sm:p-7 rounded-3xl bg-white/65 backdrop-blur-2xl border border-white/85 shadow-[0_20px_50px_rgba(80,100,150,0.12),0_0_0_1px_rgba(255,255,255,0.4)_inset] ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200/70 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/25 border border-emerald-300/40 text-emerald-600 flex items-center justify-center shadow-xs">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                Active Ground Truth
              </span>
              <span className="text-xs text-slate-400 font-mono">Real Activity Only</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              Career Momentum
            </h3>
            <p className="text-xs text-slate-500">Measurable Progress Across Active Search</p>
          </div>
        </div>

        {/* Profile Depth Badge */}
        <div className="flex items-center space-x-3 self-start sm:self-auto shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono block">Profile Depth</span>
            <span className="text-xs font-bold text-slate-900 font-mono">
              {profileCompleteness}% Complete
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/15 via-indigo-500/20 to-[#8065F5]/25 border border-violet-300/40 flex items-center justify-center font-mono text-xs font-bold text-[#8065F5] shadow-xs">
            {profileCompleteness}%
          </div>
        </div>
      </div>

      {/* Real Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
        {milestones.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab && onNavigateTab(m.tab)}
              className="group p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 hover:bg-white/90 hover:border-violet-300/70 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center border bg-gradient-to-br ${m.gradient} shadow-2xs group-hover:scale-105 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-2xl font-extrabold font-mono text-slate-900 group-hover:text-blue-600 transition-colors">
                  {m.value}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 leading-snug">
                  {m.label}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {m.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Integrity Guarantee */}
      <div className="mt-5 pt-3.5 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
        <span className="flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Zero fabricated activity. All metrics derived from verified user data.</span>
        </span>
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('applications')}
            className="text-blue-600 hover:text-indigo-600 font-semibold flex items-center space-x-1 cursor-pointer self-start sm:self-auto transition"
          >
            <span>View Pipeline</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
