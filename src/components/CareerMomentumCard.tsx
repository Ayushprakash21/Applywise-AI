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
    <div
      className={`p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#14171C] border border-slate-200 dark:border-[rgba(255,255,255,0.09)] text-slate-900 dark:text-[#F2F0EA] transition-colors ${className}`}
      style={{
        backgroundColor: 'var(--be-bg-card, #FFFFFF)',
        borderColor: 'var(--be-border-subtle, rgba(0,0,0,0.08))',
        boxShadow: 'var(--be-shadow-card, 0 4px 20px -2px rgba(0, 0, 0, 0.08))',
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 dark:border-[rgba(255,255,255,0.08)] gap-3"
        style={{ borderColor: 'var(--be-border-subtle, rgba(0,0,0,0.08))' }}
      >
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-2xl border flex items-center justify-center shadow-xs bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
            style={{
              backgroundColor: 'var(--be-hover-bg, rgba(53,184,135,0.12))',
              borderColor: 'var(--be-border-subtle, rgba(53,184,135,0.25))',
              color: 'var(--be-status-success, #147A58)',
            }}
          >
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
                style={{
                  backgroundColor: 'var(--be-hover-bg, rgba(20,122,88,0.10))',
                  borderColor: 'var(--be-border-subtle, rgba(20,122,88,0.20))',
                  color: 'var(--be-status-success, #147A58)',
                }}
              >
                Active Ground Truth
              </span>
              <span
                className="text-xs font-mono text-slate-500 dark:text-slate-400"
                style={{ color: 'var(--be-text-muted, #707782)' }}
              >
                Real Activity Only
              </span>
            </div>
            <h3
              className="text-base sm:text-lg font-bold tracking-tight mt-0.5 text-slate-900 dark:text-[#F2F0EA]"
              style={{ color: 'var(--be-text-primary, #20242B)' }}
            >
              Career Momentum
            </h3>
            <p
              className="text-xs text-slate-600 dark:text-[#C0BDB5]"
              style={{ color: 'var(--be-text-secondary, #555C66)' }}
            >
              Measurable Progress Across Active Search
            </p>
          </div>
        </div>

        {/* Profile Depth Badge */}
        <div className="flex items-center space-x-3 self-start sm:self-auto shrink-0">
          <div className="text-right">
            <span
              className="text-[10px] font-mono block text-slate-500 dark:text-slate-400"
              style={{ color: 'var(--be-text-muted, #707782)' }}
            >
              Profile Depth
            </span>
            <span
              className="text-xs font-bold font-mono text-slate-900 dark:text-[#F2F0EA]"
              style={{ color: 'var(--be-text-primary, #20242B)' }}
            >
              {profileCompleteness}% Complete
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl border flex items-center justify-center font-mono text-xs font-bold shadow-xs bg-slate-100 dark:bg-[#191D23] border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-900 dark:text-[#F2F0EA]"
            style={{
              backgroundColor: 'var(--be-bg-elevated, #FAF8F5)',
              borderColor: 'var(--be-border-subtle, rgba(0,0,0,0.08))',
              color: 'var(--be-text-primary, #20242B)',
            }}
          >
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
              className="group p-4 rounded-2xl bg-slate-50 dark:bg-[#191D23] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] hover:border-slate-300 dark:hover:border-[var(--be-border-focus,rgba(198,166,106,0.40))] transition duration-200 cursor-pointer flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--be-bg-elevated, #FAF8F5)',
                borderColor: 'var(--be-border-subtle, rgba(0,0,0,0.08))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--be-border-focus, rgba(198,166,106,0.40))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--be-border-subtle, rgba(0,0,0,0.08))';
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center border bg-gradient-to-br ${m.gradient} shadow-2xs group-hover:scale-105 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className="text-2xl font-extrabold font-mono transition-colors text-slate-900 dark:text-[#F2F0EA]"
                  style={{ color: 'var(--be-text-primary, #20242B)' }}
                >
                  {m.value}
                </span>
              </div>
              <div>
                <p
                  className="text-xs font-bold leading-snug text-slate-800 dark:text-[#F2F0EA]"
                  style={{ color: 'var(--be-text-primary, #20242B)' }}
                >
                  {m.label}
                </p>
                <p
                  className="text-[11px] mt-0.5 truncate text-slate-500 dark:text-[#92949A]"
                  style={{ color: 'var(--be-text-muted, #707782)' }}
                >
                  {m.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Integrity Guarantee */}
      <div
        className="mt-5 pt-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-2"
        style={{
          borderColor: 'var(--be-border-subtle, rgba(0,0,0,0.08))',
          color: 'var(--be-text-muted, #707782)',
        }}
      >
        <span className="flex items-center space-x-2">
          <CheckCircle2
            className="h-4 w-4 shrink-0"
            style={{ color: 'var(--be-status-success, #147A58)' }}
          />
          <span>Zero fabricated activity. All metrics derived from verified user data.</span>
        </span>
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('applications')}
            className="font-semibold flex items-center space-x-1 cursor-pointer self-start sm:self-auto transition"
            style={{ color: 'var(--be-accent, #C6A66A)' }}
          >
            <span>View Pipeline</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
