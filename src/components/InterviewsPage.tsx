import React, { useState } from 'react';
import {
  Calendar,
  Building,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  FileText,
  UserCheck,
  ExternalLink,
  MessageSquare,
  Award,
  Zap
} from 'lucide-react';
import { ApplicationRecord, UserProfile } from '../types/index.ts';

interface InterviewsPageProps {
  applications: ApplicationRecord[];
  profile: UserProfile | null;
  onUpdateStatus: (id: string, newStatus: any) => Promise<void>;
  onNavigateToJobs: () => void;
  onNavigateToApplications: () => void;
  onAskCopilot: (prompt: string) => void;
}

export const InterviewsPage: React.FC<InterviewsPageProps> = ({
  applications,
  profile,
  onUpdateStatus,
  onNavigateToJobs,
  onNavigateToApplications,
  onAskCopilot,
}) => {
  const interviewApps = applications.filter(a => ['INTERVIEW', 'INTERVIEWING'].includes(a.status));
  const [selectedAppId, setSelectedAppId] = useState<string>(interviewApps[0]?.id || '');

  const activeApp = interviewApps.find(a => a.id === selectedAppId) || interviewApps[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Interviews & Preparation Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 text-xs font-mono font-bold">
              {interviewApps.length} Active {interviewApps.length === 1 ? 'Round' : 'Rounds'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Role-specific interview coaching, STAR achievement talking points, and company research.
          </p>
        </div>

        <button
          onClick={() => onAskCopilot(activeApp ? `Coach me for my upcoming interview with ${activeApp.company} for the ${activeApp.role} role.` : 'Provide an interview preparation checklist.')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md transition flex items-center space-x-2 w-fit"
        >
          <Sparkles className="h-4 w-4" />
          <span>Launch AI Interview Coach</span>
        </button>
      </div>

      {interviewApps.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500 flex items-center justify-center mx-auto">
            <Calendar className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Active Interviews Scheduled</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              When an employer schedules an interview or you advance in the hiring process, update your application status to "Interview" to unlock role-specific coaching.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onNavigateToApplications}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold transition"
            >
              Update Application Status
            </button>
            <button
              onClick={onNavigateToJobs}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition"
            >
              Discover More Jobs
            </button>
          </div>
        </div>
      ) : (
        /* Active Interview Details & Prep Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Interview Applications List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Select Active Pipeline
            </h3>
            {interviewApps.map(app => (
              <div
                key={app.id}
                onClick={() => setSelectedAppId(app.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                  app.id === (activeApp?.id)
                    ? 'bg-cyan-950/20 border-cyan-500 shadow-md'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {app.role}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                    {app.matchScore}% match
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Building className="h-3.5 w-3.5" />
                  <span>{app.company}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: In-Depth Prep Checklist */}
          {activeApp && (
            <div className="lg:col-span-2 space-y-6">
              {/* Target Briefing */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {activeApp.role}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Target Company: <strong className="text-slate-800 dark:text-slate-200">{activeApp.company}</strong>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateStatus(activeApp.id, 'OFFER')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                    >
                      Record Offer
                    </button>
                    <button
                      onClick={() => onUpdateStatus(activeApp.id, 'REJECTED')}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                    >
                      Archive
                    </button>
                  </div>
                </div>

                {/* Strategy Pillar 1: Verified STAR Talking Points */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold flex items-center space-x-1.5">
                    <Award className="h-4 w-4" />
                    <span>Verified STAR Talking Points</span>
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <p>
                      Highlight real achievements from your verified profile:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-[11px] leading-relaxed">
                      {profile?.experiences?.[0]?.achievements?.map((ach, i) => (
                        <li key={i}>{ach}</li>
                      )) || (
                        <li>Architected production workflows with verified latency reductions and high-availability outcomes.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Strategy Pillar 2: High-Impact Questions for the Interviewer */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold flex items-center space-x-1.5">
                    <MessageSquare className="h-4 w-4" />
                    <span>Inquisitive Questions to Ask {activeApp.company}</span>
                  </h4>
                  <div className="space-y-2">
                    {[
                      `What does success look like in the first 90 days for this ${activeApp.role} position?`,
                      `How does the engineering and product team resolve architectural trade-offs between speed and resilience?`,
                      `What is the biggest operational challenge the team is solving right now?`,
                    ].map((q, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-200 flex items-start space-x-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500 mt-0.5 shrink-0" />
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
