import React from 'react';
import {
  ExternalLink,
  MapPin,
  Building2,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { JobVacancy } from '../types/index.ts';

interface JobDetailModalProps {
  vacancy: JobVacancy | null;
  onClose: () => void;
  onPrepareApplication: (vacancyId: string) => Promise<void>;
  isPreparing: boolean;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  vacancy,
  onClose,
  onPrepareApplication,
  isPreparing,
}) => {
  if (!vacancy) return null;

  const match = vacancy.matchEvaluation;
  const breakdown = match?.breakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 my-8">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {vacancy.source}
              </span>
              {vacancy.remote && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                  Remote
                </span>
              )}
              <span className="text-xs text-slate-400">{vacancy.company}</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{vacancy.title}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center"><MapPin className="h-3.5 w-3.5 mr-1" />{vacancy.location}</span>
              {vacancy.salaryRange?.raw && (
                <span className="flex items-center text-amber-300 font-medium">
                  <DollarSign className="h-3.5 w-3.5 mr-0.5" />{vacancy.salaryRange.raw}
                </span>
              )}
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg p-1">
            ✕
          </button>
        </div>

        {/* Match Score & Multidimensional Breakdown */}
        {match && (
          <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span className="font-bold text-sm text-white">Relevance Score Breakdown</span>
              </div>
              <span className="text-base font-bold font-mono text-emerald-400 bg-emerald-950/50 px-2.5 py-0.5 rounded border border-emerald-800/50">
                {match.matchScore}% – {match.recommendation.replace(/_/g, ' ')}
              </span>
            </div>

            {breakdown && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Skills (30% wt)</div>
                  <div className="font-mono font-bold text-white">{breakdown.skills}/100</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Experience (25% wt)</div>
                  <div className="font-mono font-bold text-white">{breakdown.experience}/100</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Qualifications (15% wt)</div>
                  <div className="font-mono font-bold text-white">{breakdown.qualifications}/100</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Seniority (10% wt)</div>
                  <div className="font-mono font-bold text-white">{breakdown.seniority}/100</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Location (10% wt)</div>
                  <div className="font-mono font-bold text-white">{breakdown.location}/100</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Salary (10% wt)</div>
                  <div className="font-mono font-bold text-white">{breakdown.salary}/100</div>
                </div>
              </div>
            )}

            {/* Overlap Skills */}
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex flex-wrap gap-1">
                <span className="text-slate-400 mr-1">Matched Skills:</span>
                {match.matchedSkills.map((s, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800/40">
                    ✓ {s}
                  </span>
                ))}
              </div>
              {match.missingSkills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-slate-400 mr-1">Missing / Unlisted:</span>
                  {match.missingSkills.map((s, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2 text-xs">
          <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">Job Description</h4>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-300 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
            {vacancy.description}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <a
            href={vacancy.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            <span>View Original Listing</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Close
            </button>
            <button
              onClick={() => {
                onPrepareApplication(vacancy.id);
                onClose();
              }}
              disabled={isPreparing}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <span>{isPreparing ? 'Preparing...' : 'Prepare Application Package'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
