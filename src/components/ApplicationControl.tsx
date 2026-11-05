import React, { useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  X,
  ShieldCheck,
  AlertTriangle,
  Award,
  ArrowRight,
  Eye,
  Send,
  Calendar,
  Lock,
  Search
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus } from '../types/index.ts';
import { validateStateTransition } from '../utils/rules.ts';

export interface ApplicationControlProps {
  applications: ApplicationRecord[];
  onSelectApplication: (app: ApplicationRecord) => void;
  onUpdateStatus?: (id: string, newStatus: ApplicationStatus, notes?: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onNavigateToJobs?: () => void;
  onNavigateToRadar?: () => void;
  onOpenRecruiterReview?: (appId: string) => void;
  plan?: 'free' | 'pro' | 'black';
  className?: string;
}

const LIFECYCLE_STAGES: Array<{ status: ApplicationStatus; label: string; stageNumber: number }> = [
  { status: 'OPPORTUNITY_SELECTED', label: 'Opportunity Selected', stageNumber: 1 },
  { status: 'SUITABILITY_REVIEWED', label: 'Suitability Reviewed', stageNumber: 2 },
  { status: 'RESUME_PREPARED', label: 'Resume Prepared', stageNumber: 3 },
  { status: 'RECRUITER_REVIEW_COMPLETED', label: 'Recruiter Review Completed', stageNumber: 4 },
  { status: 'APPLICATION_READY', label: 'Application Ready', stageNumber: 5 },
  { status: 'AWAITING_USER_APPROVAL', label: 'Awaiting User Approval', stageNumber: 6 },
  { status: 'SUBMISSION_IN_PROGRESS', label: 'Submission In Progress', stageNumber: 7 },
  { status: 'SUBMITTED_CONFIRMED', label: 'Submitted — Confirmed', stageNumber: 8 },
  { status: 'INTERVIEW', label: 'Interview', stageNumber: 9 },
  { status: 'OFFER', label: 'Offer', stageNumber: 10 },
  { status: 'REJECTED', label: 'Rejected', stageNumber: 11 },
  { status: 'WITHDRAWN', label: 'Withdrawn', stageNumber: 12 },
];

export const ApplicationControl: React.FC<ApplicationControlProps> = ({
  applications,
  onSelectApplication,
  onUpdateStatus,
  onRefresh,
  onNavigateToJobs,
  onOpenRecruiterReview,
  plan = 'free',
}) => {
  const isBlack = plan === 'black';

  const [activeStageFilter, setActiveStageFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAppForApproval, setSelectedAppForApproval] = useState<ApplicationRecord | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [declaredConsent, setDeclaredConsent] = useState<boolean>(false);

  // Normalize status to canonical stages
  const normalizeStatus = (status: string): ApplicationStatus => {
    if (status === 'SAVED' || status === 'DISCOVERED') return 'OPPORTUNITY_SELECTED';
    if (status === 'MATCHED' || status === 'VALIDATED') return 'SUITABILITY_REVIEWED';
    if (status === 'TAILORING' || status === 'PREPARING' || status === 'RESUME_GENERATED') return 'RESUME_PREPARED';
    if (status === 'READY_TO_SUBMIT' || status === 'APPLICATION_PREPARED' || status === 'PREPARED') return 'APPLICATION_READY';
    if (status === 'AWAITING_USER_REVIEW' || status === 'AWAITING_APPROVAL') return 'AWAITING_USER_APPROVAL';
    if (status === 'SUBMITTING' || status === 'REDIRECTED_TO_EMPLOYER') return 'SUBMISSION_IN_PROGRESS';
    if (status === 'SUBMITTED' || status === 'SUBMITTED_VERIFIED' || status === 'CONFIRMATION_VERIFIED') return 'SUBMITTED_CONFIRMED';
    if (status === 'INTERVIEWING') return 'INTERVIEW';
    if (status === 'OFFER_RECEIVED') return 'OFFER';
    return (status as ApplicationStatus) || 'OPPORTUNITY_SELECTED';
  };

  // 1. Analytics Computations
  const totalCreated = applications.length;
  const awaitingApproval = applications.filter(a => normalizeStatus(a.status) === 'AWAITING_USER_APPROVAL').length;
  const submittedConfirmed = applications.filter(a => normalizeStatus(a.status) === 'SUBMITTED_CONFIRMED').length;
  const interviewsCount = applications.filter(a => normalizeStatus(a.status) === 'INTERVIEW').length;
  const offersCount = applications.filter(a => normalizeStatus(a.status) === 'OFFER').length;
  const rejectionsCount = applications.filter(a => normalizeStatus(a.status) === 'REJECTED').length;

  const responseRate = totalCreated > 0
    ? Math.round(((interviewsCount + offersCount + rejectionsCount) / totalCreated) * 100)
    : 0;

  // Filter Applications
  const filteredApps = applications.filter(a => {
    const canonical = normalizeStatus(a.status);
    if (activeStageFilter !== 'all' && canonical !== activeStageFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchComp = a.company?.toLowerCase().includes(q);
      const matchRole = a.role?.toLowerCase().includes(q);
      if (!matchComp && !matchRole) return false;
    }
    return true;
  });

  const handleApproveAndProceed = async (app: ApplicationRecord) => {
    if (!declaredConsent) return;
    setIsApproving(true);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(
          app.id,
          'SUBMISSION_IN_PROGRESS',
          'Candidate explicitly approved legal disclosures, credentials, and application submission.'
        );
      }
      setSelectedAppForApproval(null);
      setDeclaredConsent(false);
      await onRefresh();
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Stage Governance */}
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
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40'
              }`}>
                GOVERNED APPLICATION LIFECYCLE
              </span>
              <span className="text-xs text-slate-400 font-mono">· 12 Canonical Stages</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Application Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Prepare, review, approve, and track every application package. Applications undergo strict human approval gates before external submission.
            </p>
          </div>

          <button
            onClick={onNavigateToJobs}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 self-start lg:self-auto cursor-pointer"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Discover Opportunities</span>
          </button>
        </div>

        {/* 2. Analytical Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Total Created</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{totalCreated}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Awaiting Approval</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">{awaitingApproval}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Confirmed Submissions</span>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">{submittedConfirmed}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Interviews</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{interviewsCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Offers</span>
            <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400 font-mono">{offersCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Response Rate</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {totalCreated > 0 ? `${responseRate}%` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Stage Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:max-w-xs relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search company or role..."
            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1">
          <button
            onClick={() => setActiveStageFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeStageFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            All Stages ({applications.length})
          </button>
          {LIFECYCLE_STAGES.slice(4, 9).map(st => {
            const count = applications.filter(a => normalizeStatus(a.status) === st.status).length;
            if (count === 0) return null;
            return (
              <button
                key={st.status}
                onClick={() => setActiveStageFilter(st.status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeStageFilter === st.status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {st.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Applications List with Lifecycle Stepper */}
      {filteredApps.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400 space-y-3">
          <Briefcase className="w-8 h-8 mx-auto text-slate-400" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No applications in this stage</div>
          <p className="max-w-md mx-auto leading-relaxed">
            Select an active vacancy from Opportunity Radar to begin preparing an ATS-tailored resume and cover letter package.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map(app => {
            const canonical = normalizeStatus(app.status);
            const stageDef = LIFECYCLE_STAGES.find(s => s.status === canonical) || LIFECYCLE_STAGES[0];
            const isAwaitingApproval = canonical === 'AWAITING_USER_APPROVAL';

            return (
              <div
                key={app.id}
                className={`p-6 rounded-3xl border transition-all ${
                  isBlack
                    ? 'bg-[#13161B] border-[rgba(255,255,255,0.075)] text-[#F0EEE9] hover:border-[rgba(198,166,106,0.25)]'
                    : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <h2 className="text-base font-bold tracking-tight">{app.role}</h2>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">at {app.company}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 font-bold">
                        STAGE {stageDef.stageNumber}: {stageDef.label}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Location: {app.location || 'Remote'}</span>
                      <span>·</span>
                      <span>Match Score: {app.matchScore}%</span>
                      <span>·</span>
                      <span>Created: {new Date(app.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions & Lifecycle Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {onOpenRecruiterReview && (
                      <button
                        onClick={() => onOpenRecruiterReview(app.id)}
                        className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition flex items-center space-x-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Recruiter Review</span>
                      </button>
                    )}

                    <button
                      onClick={() => onSelectApplication(app)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 transition flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Package</span>
                    </button>

                    {isAwaitingApproval && (
                      <button
                        onClick={() => setSelectedAppForApproval(app)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition flex items-center space-x-1 shadow-xs cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Review & Approve Submission</span>
                      </button>
                    )}

                    {canonical === 'SUBMISSION_IN_PROGRESS' && app.url && (
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onUpdateStatus && onUpdateStatus(app.id, 'SUBMITTED_CONFIRMED', 'User completed external direct submission on employer portal.')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center space-x-1"
                      >
                        <span>Open Employer Portal & Confirm</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* 12-Stage Visual Progress Bar */}
                <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                    <span>PROGRESSION TIMELINE</span>
                    <span>Stage {stageDef.stageNumber} of 12</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 transition-all duration-300"
                      style={{ width: `${(stageDef.stageNumber / 12) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Approval Gate Modal */}
      {selectedAppForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 text-slate-900 dark:text-white">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Mandatory Candidate Review & Approval</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review disclosures for {selectedAppForApproval.role} at {selectedAppForApproval.company}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                <strong>Personal Disclosures & Consent:</strong> ApplyVise AI adheres to a strict prepare-review-approve-submit model. We do not automate CAPTCHA bypasses or submit unapproved representations on third-party employer websites.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500">
                <li>I confirm the tailored resume content is factually accurate and represents my genuine experience.</li>
                <li>I authorize proceeding with guided direct submission to {selectedAppForApproval.company}.</li>
              </ul>
            </div>

            <label className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={declaredConsent}
                onChange={e => setDeclaredConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>I have reviewed the application package and authorize proceeding to submission.</span>
            </label>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedAppForApproval(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveAndProceed(selectedAppForApproval)}
                disabled={!declaredConsent || isApproving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isApproving ? 'Authorizing...' : 'Authorize Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
