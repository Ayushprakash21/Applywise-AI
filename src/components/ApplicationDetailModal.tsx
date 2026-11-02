import React, { useState } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Send,
  Calendar,
  FileText,
  AlertTriangle,
  Save,
  MessageSquare,
  Award
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus } from '../types/index.ts';

interface ApplicationDetailModalProps {
  application: ApplicationRecord | null;
  onClose: () => void;
  onTransitionStatus: (id: string, newStatus: ApplicationStatus, note?: string) => Promise<void>;
  onSubmitApplication: (id: string) => Promise<void>;
  onApproveApplication: (id: string) => Promise<void>;
  isSubmitting: boolean;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  application,
  onClose,
  onTransitionStatus,
  onSubmitApplication,
  onApproveApplication,
  isSubmitting,
}) => {
  if (!application) return null;

  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>(application.status);
  const [transitionNote, setTransitionNote] = useState('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'resume' | 'cover_letter'>('timeline');

  const handleStatusUpdate = async () => {
    if (selectedStatus === application.status) return;
    await onTransitionStatus(application.id, selectedStatus, transitionNote);
    setTransitionNote('');
  };

  const isAwaiting = application.status === 'AWAITING_APPROVAL';
  const isAuthorized = application.status === 'AUTHORIZED_TO_SUBMIT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-base text-white">{application.company}</span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-indigo-300 font-semibold">{application.role}</span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">{application.location}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>Match Relevance: <strong className="text-emerald-400">{application.matchScore}%</strong></span>
              <span>·</span>
              <span>Status: <strong className="font-mono text-indigo-400">{application.status.replace(/_/g, ' ')}</strong></span>
              <span>·</span>
              <span>Resume Ver: <strong className="font-mono text-slate-300">{application.resumeVersionId}</strong></span>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg p-1">
            ✕
          </button>
        </div>

        {/* Submission Confirmation Evidence Card (if verified) */}
        {application.submissionEvidence && (
          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4" />
                <span>Verified Employer Submission Evidence</span>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/40">
                Receipt #{application.submissionEvidence.confirmationNumber}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {application.submissionEvidence.receiptText}
            </p>
            <div className="text-[10px] text-slate-400">
              Verified at: {new Date(application.submissionEvidence.timestamp).toLocaleString()} via channel: {application.submissionEvidence.channel}
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-1.5 rounded-lg transition ${activeTab === 'timeline' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Lifecycle Audit Timeline ({application.timeline.length})
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={`flex-1 py-1.5 rounded-lg transition ${activeTab === 'resume' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Tailored ATS Resume
          </button>
          <button
            onClick={() => setActiveTab('cover_letter')}
            className={`flex-1 py-1.5 rounded-lg transition ${activeTab === 'cover_letter' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Cover Letter
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'timeline' && (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            <div className="space-y-2">
              {application.timeline.map((event, idx) => (
                <div key={idx} className="flex items-start space-x-3 text-xs p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/40">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 shrink-0 mt-0.5 text-[10px] font-bold">
                    {idx + 1}
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{event.stage.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-500">{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{event.note}</p>
                    <div className="text-[10px] text-slate-500 font-mono">Actor: {event.actor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'resume' && (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1 text-xs text-slate-300">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 space-y-1">
              <div className="font-bold text-white text-sm">{application.tailoredResume.headline}</div>
              <p className="text-slate-300 leading-relaxed text-[11px]">{application.tailoredResume.professionalSummary}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold text-[11px]">Selected Experience Bullets:</span>
              {application.tailoredResume.tailoredExperiences.map((exp, i) => (
                <div key={i} className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 space-y-1">
                  <div className="font-semibold text-white">{exp.role} at {exp.company} ({exp.period})</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {exp.bulletPoints.map((bp, j) => (
                      <li key={j}>{bp}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cover_letter' && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 max-h-72 overflow-y-auto text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
            {application.coverLetter || 'No cover letter drafted.'}
          </div>
        )}

        {/* Lifecycle State Transition & Submit Controls */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-200">Manual State Transition:</span>
            <div className="flex items-center space-x-2">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value as ApplicationStatus)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="APPLICATION_PREPARED">APPLICATION_PREPARED</option>
                <option value="AWAITING_APPROVAL">AWAITING_APPROVAL</option>
                <option value="AUTHORIZED_TO_SUBMIT">AUTHORIZED_TO_SUBMIT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="CONFIRMATION_VERIFIED">CONFIRMATION_VERIFIED</option>
                <option value="INTERVIEWING">INTERVIEWING</option>
                <option value="OFFER_RECEIVED">OFFER_RECEIVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="WITHDRAWN">WITHDRAWN</option>
              </select>

              <button
                onClick={handleStatusUpdate}
                disabled={selectedStatus === application.status}
                className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              >
                Update Status
              </button>
            </div>
          </div>

          {/* Quick Submit Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <span>View Vacancy Source</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <div className="flex items-center space-x-2">
              {isAwaiting && (
                <button
                  onClick={() => onApproveApplication(application.id)}
                  className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white shadow hover:bg-amber-500"
                >
                  1-Click Approve Package
                </button>
              )}

              <button
                onClick={() => onSubmitApplication(application.id)}
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Transmit via Browser Worker'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
