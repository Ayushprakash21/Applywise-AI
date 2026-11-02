import React from 'react';
import {
  X,
  ExternalLink,
  Sparkles,
  Building,
  MapPin,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { JobVacancy } from '../types/index.ts';

interface JobDetailDrawerProps {
  vacancy: JobVacancy | null;
  onClose: () => void;
  onPrepareApplication: (vacancyId: string) => void;
  isPreparing: boolean;
  hasApplied?: boolean;
}

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({
  vacancy,
  onClose,
  onPrepareApplication,
  isPreparing,
  hasApplied = false,
}) => {
  if (!vacancy) return null;

  const match = vacancy.matchEvaluation;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 overflow-y-auto flex flex-col animate-in slide-in-from-right duration-250"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] uppercase">
              {vacancy.source}
            </span>
            {vacancy.remote && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[11px]">
                Remote
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Vacancy Title & Company Card */}
          <div className="space-y-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {vacancy.title}
            </h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600">
              <div className="flex items-center space-x-1.5 font-semibold text-blue-600">
                <Building className="h-4 w-4 shrink-0" />
                <span>{vacancy.company}</span>
              </div>

              <div className="flex items-center space-x-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{vacancy.location}</span>
              </div>

              {vacancy.salaryRange?.raw && (
                <div className="flex items-center space-x-1.5 font-medium text-emerald-700">
                  <DollarSign className="h-4 w-4 shrink-0" />
                  <span>{vacancy.salaryRange.raw}</span>
                </div>
              )}

              <div className="flex items-center space-x-1.5 text-slate-400">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Published {new Date(vacancy.publishedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* AI Match Intelligence Card */}
          {match && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">ApplyWise AI Match Intelligence</span>
                </div>
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-white border border-blue-200 rounded-full shadow-xs">
                  <span className="text-xs font-extrabold text-blue-700 font-mono">
                    {match.matchScore}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Match</span>
                </div>
              </div>

              {/* Strongest Qualifications */}
              {match.reasons && match.reasons.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Strongest Alignment</p>
                  <div className="space-y-1">
                    {match.reasons.map((r, i) => (
                      <div key={i} className="flex items-start space-x-2 text-xs text-slate-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Requirements */}
              {match.missingSkills && match.missingSkills.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Missing Requirements</p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.missingSkills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-600 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Potential Eligibility Concerns */}
              {match.eligibilityIssues && match.eligibilityIssues.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Eligibility Concerns</p>
                  {match.eligibilityIssues.map((issue, i) => (
                    <div key={i} className="flex items-start space-x-2 text-xs text-amber-800">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Full Job Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Job Description</h3>
            <div className="text-xs text-slate-600 leading-relaxed space-y-3 whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
              {vacancy.description}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex items-center justify-between gap-3">
          <a
            href={vacancy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5"
          >
            <span>Original Listing</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>

          {hasApplied ? (
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              <span>Application Already Prepared</span>
            </div>
          ) : (
            <button
              onClick={() => onPrepareApplication(vacancy.id)}
              disabled={isPreparing}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 transition flex items-center space-x-1.5"
            >
              {isPreparing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Tailoring ATS Resume...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Prepare Application</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
