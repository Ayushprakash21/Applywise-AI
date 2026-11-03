import React from 'react';
import {
  Compass,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  FileCheck,
  RefreshCw,
  Eye,
  Sliders
} from 'lucide-react';
import {
  UserProfile,
  CareerPreferences,
  AutomationSettings,
  JobVacancy,
  ApplicationRecord,
  AuditLogEntry
} from '../types/index.ts';

interface OverviewTabProps {
  profile: UserProfile | null;
  preferences: CareerPreferences | null;
  settings: AutomationSettings | null;
  vacancies: JobVacancy[];
  applications: ApplicationRecord[];
  auditLogs: AuditLogEntry[];
  onNavigateTab: (tab: string) => void;
  onRunDiscovery: () => void;
  onTriggerScheduler: () => void;
  isSearching: boolean;
  onSelectApplication: (app: ApplicationRecord) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  profile,
  preferences,
  settings,
  vacancies,
  applications,
  auditLogs,
  onNavigateTab,
  onRunDiscovery,
  onTriggerScheduler,
  isSearching,
  onSelectApplication,
}) => {
  const highMatches = vacancies.filter(v => (v.matchEvaluation?.matchScore || 0) >= 80);
  const awaitingApproval = applications.filter(a => a.status === 'AWAITING_APPROVAL');
  const confirmedSubmissions = applications.filter(a => a.status === 'CONFIRMATION_VERIFIED' || a.status === 'SUBMITTED');
  const interviewing = applications.filter(a => a.status === 'INTERVIEWING');

  return (
    <div className="space-y-6">
      {/* Agent Autonomous Loop Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-900/60 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-6 shadow-xl">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${settings?.emergencyStop ? 'bg-red-400' : 'bg-emerald-400'} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${settings?.emergencyStop ? 'bg-red-500' : 'bg-emerald-500'}`} />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Autonomous Career Agent is {settings?.emergencyStop ? 'Halted' : 'Active'}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {settings?.mode.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
              Monitoring official career pages and live job feeds. Evaluating eligibility, calculating multidimensional match scores, generating truthful ATS-tailored resumes, and executing authorized submissions.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Truthfulness Guard: <strong>100% Verified Facts</strong></span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span>Next Scheduled Run: <strong>Every {settings?.scheduledSearchIntervalMinutes ? settings.scheduledSearchIntervalMinutes / 60 : 6} hrs</strong></span>
              </span>
              <span className="flex items-center space-x-1.5">
                <FileCheck className="h-4 w-4 text-cyan-400" />
                <span>Auto-apply Match Threshold: <strong>{settings?.autoApplyThreshold || 85}%</strong></span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onRunDiscovery}
              disabled={isSearching}
              className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isSearching ? 'animate-spin' : ''}`} />
              <span>{isSearching ? 'Querying Sources...' : 'Discover Jobs Now'}</span>
            </button>
            <button
              onClick={onTriggerScheduler}
              className="flex items-center space-x-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 active:scale-95 transition"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Trigger Background Cycle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => onNavigateTab('discovery')}
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-indigo-500/50 hover:bg-slate-800/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Discovered</span>
            <Briefcase className="h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{vacancies.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">Live verified feeds</div>
        </div>

        <div
          onClick={() => onNavigateTab('discovery')}
          className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4 hover:border-indigo-500/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-300">High Matches</span>
            <TrendingUp className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-300">{highMatches.length}</div>
          <div className="mt-1 text-[11px] text-indigo-400/80">Relevance &ge; 80%</div>
        </div>

        <div
          onClick={() => onNavigateTab('queue')}
          className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 hover:border-amber-500/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300">Awaiting Approval</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-300">{awaitingApproval.length}</div>
          <div className="mt-1 text-[11px] text-amber-400/80">1-click review needed</div>
        </div>

        <div
          onClick={() => onNavigateTab('resume_studio')}
          className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-4 hover:border-cyan-500/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-cyan-300">Resumes Tailored</span>
            <FileCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-cyan-300">{applications.length}</div>
          <div className="mt-1 text-[11px] text-cyan-400/80">ATS truthful versions</div>
        </div>

        <div
          onClick={() => onNavigateTab('tracker')}
          className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 hover:border-emerald-500/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300">Confirmed Submitted</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-300">{confirmedSubmissions.length}</div>
          <div className="mt-1 text-[11px] text-emerald-400/80">With verified receipt</div>
        </div>

        <div
          onClick={() => onNavigateTab('tracker')}
          className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-4 hover:border-purple-500/50 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-300">Active Interviews</span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-300">{interviewing.length}</div>
          <div className="mt-1 text-[11px] text-purple-400/80">Pipeline stage</div>
        </div>
      </div>

      {/* Main Grid: Active Queue Preview + High Match Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Active Applications Pipeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Active Application Pipeline</h2>
              <p className="text-xs text-slate-400">Applications currently being prepared, awaiting approval, or tracked</p>
            </div>
            <button
              onClick={() => onNavigateTab('tracker')}
              className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <span>View Full Tracker</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {applications.slice(0, 4).map(app => {
              const statusColors: Record<string, string> = {
                AWAITING_APPROVAL: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                CONFIRMATION_VERIFIED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                SUBMITTED: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
                APPLICATION_PREPARED: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
                DISCOVERED: 'bg-slate-700/30 text-slate-300 border-slate-600',
              };

              return (
                <div
                  key={app.id}
                  onClick={() => onSelectApplication(app)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-800/60 transition cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-sm">{app.company}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-300">{app.role}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{app.location}</span>
                      <span>·</span>
                      <span>{app.salaryRange || 'Salary negotiable'}</span>
                      {app.submissionEvidence?.confirmationNumber && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-emerald-400">Receipt: {app.submissionEvidence.confirmationNumber}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-sm font-bold text-indigo-400">{app.matchScore}%</div>
                      <div className="text-[10px] text-slate-500">Relevance</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium border ${statusColors[app.status] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                      {app.status.replace(/_/g, ' ')}
                    </span>
                    <button className="p-1 text-slate-400 hover:text-white">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Truthfulness Guarantee Box */}
          <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/15 text-slate-300 text-xs leading-relaxed space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>ApplyVise AI Truthfulness & Compliance Guard</span>
            </div>
            <p>
              ApplyVise AI enforces zero-hallucination resume tailoring. All dates, employer names, degrees, and technical skills in tailored documents are derived exclusively from your verified master profile. The platform never fabricates answers to legal declarations or screening questions.
            </p>
          </div>
        </div>

        {/* Right Column: High Match Discovered Vacancies & Recent Audit Logs */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Top Opportunities</h3>
              <button
                onClick={() => onNavigateTab('discovery')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Browse All ({vacancies.length})
              </button>
            </div>

            <div className="space-y-2.5">
              {highMatches.slice(0, 3).map(vac => (
                <div
                  key={vac.id}
                  className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white">{vac.title}</h4>
                      <p className="text-[11px] text-slate-400">{vac.company} · {vac.location}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {vac.matchEvaluation?.matchScore}%
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {vac.requirements.slice(0, 3).map((req, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Activity Stream */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Recent Agent Audit Trail</h3>
              <button
                onClick={() => onNavigateTab('audit_logs')}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Full Log
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {auditLogs.slice(0, 4).map(log => (
                <div key={log.id} className="text-xs p-2 rounded bg-slate-950/50 border border-slate-800/60 space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-indigo-300">{log.action}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-snug">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
