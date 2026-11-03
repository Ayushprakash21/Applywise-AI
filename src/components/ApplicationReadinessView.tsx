import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  Send,
  MessageSquare,
  FileCheck,
  AlertTriangle
} from 'lucide-react';
import { ApplicationReadinessAssessment, ReadinessChecklistItem } from '../types/index.ts';

interface ApplicationReadinessViewProps {
  readiness: ApplicationReadinessAssessment;
  jobTitle: string;
  companyName: string;
  onProceedToApply: () => void;
  isApplying?: boolean;
}

export const ApplicationReadinessView: React.FC<ApplicationReadinessViewProps> = ({
  readiness,
  jobTitle,
  companyName,
  onProceedToApply,
  isApplying = false,
}) => {
  const isReady = readiness.status === 'READY_TO_APPLY';

  const getItemIcon = (status: ReadinessChecklistItem['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
      case 'fail':
        return <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-5 rounded-2xl border shadow-sm space-y-3 ${
        isReady
          ? 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40 border-emerald-200'
          : 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 border-amber-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl text-white ${isReady ? 'bg-emerald-600' : 'bg-amber-600'}`}>
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                  isReady
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {isReady ? 'Ready to Apply' : 'Review First'}
                </span>
                <span className="text-xs font-semibold text-slate-500">Readiness Studio</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Pre-Flight Application Audit for {jobTitle}
              </h3>
            </div>
          </div>

          <button
            onClick={onProceedToApply}
            disabled={isApplying}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center space-x-2 shrink-0 ${
              isReady
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <span>{isApplying ? 'Submitting...' : 'Proceed with Application'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
          {readiness.overallSummary}
        </p>
      </div>

      {/* Checklist Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Personalized Readiness Checklist ({readiness.items.length} Points Checked)
        </h4>

        <div className="grid grid-cols-1 gap-2.5">
          {readiness.items.map(item => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition space-y-1.5 ${
                item.status === 'pass'
                  ? 'bg-white border-slate-200'
                  : item.status === 'warning'
                  ? 'bg-amber-50/50 border-amber-200'
                  : 'bg-rose-50/50 border-rose-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-2">
                  {getItemIcon(item.status)}
                  <div>
                    <span className="text-xs font-bold text-slate-900">{item.label}</span>
                    <p className="text-xs text-slate-600 mt-0.5">{item.detail}</p>
                  </div>
                </div>

                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold shrink-0 ${
                  item.status === 'pass'
                    ? 'bg-emerald-100 text-emerald-800'
                    : item.status === 'warning'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {item.status}
                </span>
              </div>

              {item.actionableStep && (
                <div className="ml-6 text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-lg border border-amber-200/80 font-medium">
                  <span className="font-bold">Recommended action: </span>
                  <span>{item.actionableStep}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Questions to Ask Employer */}
      {readiness.questionsToAskEmployer && readiness.questionsToAskEmployer.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <span>Questions to Clarify with {companyName}</span>
          </div>
          <p className="text-xs text-slate-500">
            Asking targeted questions in recruiter screens signals high strategic preparation:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
            {readiness.questionsToAskEmployer.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
