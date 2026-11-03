import React from 'react';
import {
  X,
  Building,
  MapPin,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Scale
} from 'lucide-react';
import { JobVacancy, UserProfile } from '../types/index.ts';

interface JobComparisonDrawerProps {
  jobA: JobVacancy;
  jobB: JobVacancy;
  profile: UserProfile | null;
  onClose: () => void;
  onSelectJob: (job: JobVacancy) => void;
}

export const JobComparisonDrawer: React.FC<JobComparisonDrawerProps> = ({
  jobA,
  jobB,
  profile,
  onClose,
  onSelectJob,
}) => {
  const scoreA = jobA.matchEvaluation?.matchScore ?? 0;
  const scoreB = jobB.matchEvaluation?.matchScore ?? 0;

  const winner = scoreA >= scoreB ? jobA : jobB;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-4xl bg-[#EEF2F7] dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-300 dark:border-slate-800 animate-slideInRight overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/70 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Side-by-Side Opportunity Comparison
              </h2>
              <p className="text-xs text-slate-500">
                Direct evidence audit of 2 live vacancies against your candidate profile
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl neu-button text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Winner Recommendation Banner */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-start space-x-3 text-xs">
            <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-blue-900 dark:text-blue-200">
                Strategic Alignment Recommendation
              </p>
              <p className="text-blue-800/90 dark:text-blue-300">
                <strong>{winner.title} at {winner.company}</strong> ({winner.matchEvaluation?.matchScore}% match) offers higher immediate qualification alignment compared to the alternative.
              </p>
            </div>
          </div>

          {/* Side-by-Side Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Job A */}
            <div className="p-5 rounded-2xl neu-surface border border-white/80 space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-[10px] font-mono uppercase font-bold text-blue-600 block">
                  Option A
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {jobA.title}
                </h3>
                <p className="text-xs text-slate-500">{jobA.company}</p>
              </div>

              {/* Match Score */}
              <div className="flex items-center justify-between p-3 rounded-xl neu-inset">
                <span className="text-xs font-bold text-slate-700">Fit Alignment</span>
                <span className="text-lg font-black font-mono text-blue-600">
                  {scoreA}%
                </span>
              </div>

              {/* Location & Comp */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{jobA.location || (jobA.remote ? 'Remote' : 'Unspecified')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                  <span>{jobA.salaryRange?.raw || 'Compensation unstated'}</span>
                </div>
              </div>

              {/* Matched Requirements */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Matched Requirements ({jobA.matchEvaluation?.essentialRequirementsMatched?.length || 0})</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {jobA.matchEvaluation?.essentialRequirementsMatched?.slice(0, 4).map((r, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {r}
                    </span>
                  )) || <span className="text-xs text-slate-400 italic">None</span>}
                </div>
              </div>

              {/* Gaps */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-amber-600 flex items-center space-x-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Identified Gaps ({jobA.matchEvaluation?.missingEssentialRequirements?.length || 0})</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {jobA.matchEvaluation?.missingEssentialRequirements?.slice(0, 3).map((g, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                      {g}
                    </span>
                  )) || <span className="text-xs text-emerald-600 italic">Zero gaps</span>}
                </div>
              </div>

              <button
                onClick={() => onSelectJob(jobA)}
                className="w-full py-2 rounded-xl neu-button text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Inspect Opportunity A
              </button>
            </div>

            {/* Job B */}
            <div className="p-5 rounded-2xl neu-surface border border-white/80 space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 block">
                  Option B
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {jobB.title}
                </h3>
                <p className="text-xs text-slate-500">{jobB.company}</p>
              </div>

              {/* Match Score */}
              <div className="flex items-center justify-between p-3 rounded-xl neu-inset">
                <span className="text-xs font-bold text-slate-700">Fit Alignment</span>
                <span className="text-lg font-black font-mono text-indigo-600">
                  {scoreB}%
                </span>
              </div>

              {/* Location & Comp */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{jobB.location || (jobB.remote ? 'Remote' : 'Unspecified')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                  <span>{jobB.salaryRange?.raw || 'Compensation unstated'}</span>
                </div>
              </div>

              {/* Matched Requirements */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Matched Requirements ({jobB.matchEvaluation?.essentialRequirementsMatched?.length || 0})</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {jobB.matchEvaluation?.essentialRequirementsMatched?.slice(0, 4).map((r, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {r}
                    </span>
                  )) || <span className="text-xs text-slate-400 italic">None</span>}
                </div>
              </div>

              {/* Gaps */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-amber-600 flex items-center space-x-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Identified Gaps ({jobB.matchEvaluation?.missingEssentialRequirements?.length || 0})</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {jobB.matchEvaluation?.missingEssentialRequirements?.slice(0, 3).map((g, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                      {g}
                    </span>
                  )) || <span className="text-xs text-emerald-600 italic">Zero gaps</span>}
                </div>
              </div>

              <button
                onClick={() => onSelectJob(jobB)}
                className="w-full py-2 rounded-xl neu-button text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                Inspect Opportunity B
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Side-by-side comparison generated from live criteria models.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl neu-button text-xs font-bold"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};