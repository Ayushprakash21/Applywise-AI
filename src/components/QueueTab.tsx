import React, { useState } from 'react';
import {
  ListOrdered,
  CheckCircle2,
  Send,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText,
  UserCheck,
  ArrowRight,
  Eye,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { ApplicationRecord, AutomationSettings } from '../types/index.ts';

interface QueueTabProps {
  applications: ApplicationRecord[];
  settings: AutomationSettings | null;
  onApproveApplication: (id: string) => Promise<void>;
  onSubmitApplication: (id: string) => Promise<void>;
  onSelectApplication: (app: ApplicationRecord) => void;
  onNavigateTab: (tab: string) => void;
}

export const QueueTab: React.FC<QueueTabProps> = ({
  applications,
  settings,
  onApproveApplication,
  onSubmitApplication,
  onSelectApplication,
  onNavigateTab,
}) => {
  const [actingId, setActingId] = useState<string | null>(null);

  const pendingApps = applications.filter(
    a => a.status === 'AWAITING_APPROVAL' || a.status === 'APPLICATION_PREPARED' || a.status === 'AUTHORIZED_TO_SUBMIT'
  );

  const handleApprove = async (id: string) => {
    setActingId(id);
    try {
      await onApproveApplication(id);
    } finally {
      setActingId(null);
    }
  };

  const handleSubmit = async (id: string) => {
    setActingId(id);
    try {
      await onSubmitApplication(id);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Queue Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Application Approval & Submission Queue</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              {pendingApps.length} in Active Queue
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Human-in-the-loop review station. Verify tailored packages before transmitting to employer ATS portals.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Current Mode:</span>
          <span className="font-mono text-indigo-400 font-semibold bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-800/40">
            {settings?.mode.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Safety Notice */}
      {settings?.emergencyStop && (
        <div className="rounded-xl border border-red-800/70 bg-red-950/30 p-4 text-xs text-red-200 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-red-300">Emergency Stop is Active</div>
            <p className="mt-0.5 text-red-300/80">
              All automated application submissions are blocked. To proceed with submissions, click "EMERGENCY STOP" in the top header to disengage the safety lock.
            </p>
          </div>
        </div>
      )}

      {/* Pending Items List */}
      <div className="space-y-4">
        {pendingApps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
            <UserCheck className="mx-auto h-10 w-10 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-white">All Application Queues Cleared</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              There are no applications awaiting approval. Newly discovered vacancies meeting your match threshold will appear here automatically.
            </p>
            <button
              onClick={() => onNavigateTab('discovery')}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              Browse Discovered Vacancies
            </button>
          </div>
        ) : (
          pendingApps.map(app => {
            const isAwaiting = app.status === 'AWAITING_APPROVAL';
            const isAuthorized = app.status === 'AUTHORIZED_TO_SUBMIT';
            const isPrepared = app.status === 'APPLICATION_PREPARED';

            return (
              <div
                key={app.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-md space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Job Meta */}
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-base text-white">{app.company}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-indigo-300 font-semibold">{app.role}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-400">{app.location}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Salary: <strong className="text-slate-200">{app.salaryRange || 'Unspecified'}</strong></span>
                      <span>·</span>
                      <span>Match Relevance: <strong className="text-emerald-400">{app.matchScore}%</strong></span>
                      <span>·</span>
                      <span>Resume Version: <strong className="font-mono text-slate-300">{app.resumeVersionId}</strong></span>
                    </div>

                    {/* Approval Trigger Reason */}
                    {app.requiresApprovalReason && (
                      <div className="flex items-center space-x-1.5 text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 px-3 py-1.5 rounded-lg">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{app.requiresApprovalReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center">
                    <button
                      onClick={() => onSelectApplication(app)}
                      className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect Package</span>
                    </button>

                    {isAwaiting && (
                      <button
                        onClick={() => handleApprove(app.id)}
                        disabled={actingId === app.id || settings?.emergencyStop}
                        className="flex items-center space-x-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-amber-500 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{actingId === app.id ? 'Approving...' : '1-Click Approve'}</span>
                      </button>
                    )}

                    {(isAuthorized || isAwaiting || isPrepared) && (
                      <button
                        onClick={() => handleSubmit(app.id)}
                        disabled={actingId === app.id || settings?.emergencyStop}
                        className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>
                          {actingId === app.id ? 'Submitting & Verifying...' : 'Submit via Browser Worker'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Resume Snippet Preview */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-semibold text-slate-300">Tailored Resume Summary</span>
                    <span className="text-emerald-400 flex items-center space-x-1 text-[11px]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Fact-Audit 100/100 Passed</span>
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {app.tailoredResume.professionalSummary}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {app.tailoredResume.targetedSkills.slice(0, 5).map((sk, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
