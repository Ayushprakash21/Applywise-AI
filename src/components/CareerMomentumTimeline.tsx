import React from 'react';
import { Check, Clock, Sparkles, CheckCircle2, ChevronRight, User, FileText, Cpu, Compass, FileCheck, Send } from 'lucide-react';
import { ApplicationRecord, UserProfile, JobVacancy } from '../types/index.ts';

export interface CareerMomentumTimelineProps {
  applications: ApplicationRecord[];
  profile: UserProfile | null;
  vacancies: JobVacancy[];
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

export const CareerMomentumTimeline: React.FC<CareerMomentumTimelineProps> = ({
  applications,
  profile,
  vacancies,
  onNavigateTab,
  className = '',
}) => {
  const hasProfile = Boolean(profile?.fullName);
  const hasResume = Boolean((profile?.experiences && profile.experiences.length > 0) || profile?.skills?.some(s => s.verified));
  const hasSkills = Boolean(profile?.skills && profile.skills.length > 0);
  const hasJobs = vacancies.length > 0;
  const preparedCount = applications.filter(a =>
    ['READY', 'PREPARED', 'SUBMITTED', 'SUBMITTED_CONFIRMED', 'INTERVIEW', 'INTERVIEWING', 'OFFER', 'TRACKED'].includes(a.status)
  ).length;
  const submittedCount = applications.filter(a =>
    ['SUBMITTED', 'SUBMITTED_CONFIRMED', 'INTERVIEW', 'INTERVIEWING', 'OFFER'].includes(a.status)
  ).length;

  const stages = [
    {
      id: 'profile',
      label: 'PROFILE CREATED',
      desc: profile?.fullName ? `Verified for ${profile.fullName}` : 'Basic account initialized',
      completed: hasProfile,
      current: !hasResume,
      icon: User,
      tab: 'profile',
    },
    {
      id: 'resume',
      label: 'RESUME VERIFIED',
      desc: hasResume ? `${profile?.experiences?.length || 0} roles parsed` : 'Pending document upload',
      completed: hasResume,
      current: hasProfile && !hasResume,
      icon: FileText,
      tab: 'resume_intelligence',
    },
    {
      id: 'skills',
      label: 'SKILLS ANALYZED',
      desc: hasSkills ? `${profile?.skills?.length || 0} skills mapped` : 'Awaiting profile extraction',
      completed: hasSkills,
      current: hasResume && !hasSkills,
      icon: Cpu,
      tab: 'profile',
    },
    {
      id: 'jobs',
      label: 'JOBS DISCOVERED',
      desc: hasJobs ? `${vacancies.length} live openings matched` : 'Ingesting official hiring feeds',
      completed: hasJobs,
      current: hasSkills && !hasJobs,
      icon: Compass,
      tab: 'jobs',
    },
    {
      id: 'prepared',
      label: 'APPLICATION PREPARED',
      desc: preparedCount > 0 ? `${preparedCount} materials tailored` : 'Tailor resume to match target job',
      completed: preparedCount > 0,
      current: hasJobs && preparedCount === 0,
      icon: FileCheck,
      tab: 'applications',
    },
    {
      id: 'submitted',
      label: 'APPLICATION SUBMITTED',
      desc: submittedCount > 0 ? `${submittedCount} confirmed submissions` : 'Ready for candidate submission',
      completed: submittedCount > 0,
      current: preparedCount > 0 && submittedCount === 0,
      icon: Send,
      tab: 'applications',
    },
  ];

  const completedStages = stages.filter(s => s.completed).length;
  const progressPct = Math.round((completedStages / stages.length) * 100);

  return (
    <div className={`p-5 sm:p-6 rounded-3xl bg-white/65 backdrop-blur-2xl border border-white/85 shadow-[0_16px_40px_rgba(80,100,150,0.1)] ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200/60 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 border border-blue-400/20 uppercase tracking-wider">
              Journey Progression
            </span>
            <span className="text-xs text-slate-400 font-mono">Real ground-truth verification</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1">
            Career Momentum Timeline
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage-by-stage progression derived strictly from your authentic account activity.
          </p>
        </div>

        {/* Overall Progress Indicator */}
        <div className="flex items-center space-x-3 self-start sm:self-auto shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 font-mono block">Progression</span>
            <span className="text-xs font-bold text-slate-900 font-mono">
              {completedStages} of {stages.length} Milestones
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/15 via-indigo-500/20 to-[#8065F5]/25 border border-violet-300/40 flex items-center justify-center font-mono text-xs font-bold text-[#8065F5] shadow-xs">
            {progressPct}%
          </div>
        </div>
      </div>

      {/* Horizontal Illuminated Timeline */}
      <div className="pt-6 overflow-x-auto pb-2 scrollbar-none">
        <div className="min-w-[720px] relative">
          {/* Background Connecting Rail */}
          <div className="absolute top-5 left-6 right-6 h-1 bg-slate-200/70 rounded-full" />

          {/* Active Filled Rail */}
          <div
            className="absolute top-5 left-6 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-[#8065F5] rounded-full transition-all duration-700"
            style={{ width: `${Math.max(0, ((completedStages - 1) / (stages.length - 1)) * 100)}%` }}
          />

          {/* Nodes Grid */}
          <div className="relative grid grid-cols-6 gap-2">
            {stages.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.id}
                  onClick={() => onNavigateTab && onNavigateTab(stage.tab)}
                  className="group flex flex-col items-center text-center cursor-pointer select-none"
                >
                  {/* Node Circle */}
                  <div
                    className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      stage.completed
                        ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/30 scale-100 group-hover:scale-110'
                        : stage.current
                        ? 'bg-gradient-to-tr from-blue-600 to-[#8065F5] text-white shadow-md shadow-violet-500/35 ring-4 ring-violet-500/20 animate-pulse'
                        : 'bg-white/90 border border-slate-300 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {stage.completed ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>

                  {/* Stage Label */}
                  <span className={`text-[11px] font-bold tracking-tight mt-2.5 transition-colors line-clamp-1 ${
                    stage.completed ? 'text-slate-900 group-hover:text-blue-600' : stage.current ? 'text-[#8065F5]' : 'text-slate-500'
                  }`}>
                    {stage.label}
                  </span>

                  {/* Stage Context Description */}
                  <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 max-w-[110px] leading-tight">
                    {stage.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
