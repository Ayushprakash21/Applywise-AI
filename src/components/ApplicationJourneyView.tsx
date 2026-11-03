import React from 'react';
import {
  Search,
  Sparkles,
  FileText,
  FileCheck2,
  UserCheck,
  Send,
  Activity,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { JobVacancy, ApplicationRecord } from '../types/index.ts';

export type JourneyStage =
  | 'discover'
  | 'understand_fit'
  | 'improve_resume'
  | 'prepare_application'
  | 'review'
  | 'apply'
  | 'track';

interface ApplicationJourneyViewProps {
  currentStage: JourneyStage;
  onSelectStage?: (stage: JourneyStage) => void;
  vacancy?: JobVacancy;
  application?: ApplicationRecord;
  userReviewed?: boolean;
  onConfirmReview?: (reviewed: boolean) => void;
  onTriggerNextAction?: () => void;
  className?: string;
}

export const JOURNEY_STEPS: Array<{
  id: JourneyStage;
  number: number;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'discover', number: 1, label: 'Discover', shortDesc: 'Verified opening', icon: Search },
  { id: 'understand_fit', number: 2, label: 'Understand Fit', shortDesc: 'Evidence audit', icon: Sparkles },
  { id: 'improve_resume', number: 3, label: 'Improve Resume', shortDesc: 'Targeted framing', icon: FileText },
  { id: 'prepare_application', number: 4, label: 'Prepare Application', shortDesc: 'Tailored artifacts', icon: FileCheck2 },
  { id: 'review', number: 5, label: 'Candidate Review', shortDesc: 'Verification gate', icon: UserCheck },
  { id: 'apply', number: 6, label: 'Apply', shortDesc: 'Direct submission', icon: Send },
  { id: 'track', number: 7, label: 'Track', shortDesc: 'Follow-up pipeline', icon: Activity },
];

export const ApplicationJourneyView: React.FC<ApplicationJourneyViewProps> = ({
  currentStage,
  onSelectStage,
  vacancy,
  application,
  userReviewed = false,
  onConfirmReview,
  onTriggerNextAction,
  className = '',
}) => {
  const currentIndex = JOURNEY_STEPS.findIndex(s => s.id === currentStage);

  return (
    <div className={`p-5 rounded-2xl neu-surface border border-white/80 shadow-md ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700/60 gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 font-bold block">
            Candidate-Controlled Workflow
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Application Journey</span>
            {vacancy && (
              <span className="text-xs font-normal text-slate-500 truncate max-w-xs">
                — {vacancy.title} at {vacancy.company}
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-500">Stage {currentIndex + 1} of 7:</span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200">
            {JOURNEY_STEPS[currentIndex]?.label}
          </span>
        </div>
      </div>

      {/* Stepper Flow */}
      <div className="py-6 overflow-x-auto overflow-touch no-tap-highlight">
        <div className="flex items-center min-w-[640px] px-2">
          {JOURNEY_STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isUpcoming = idx > currentIndex;
            const StepIcon = step.icon;

            return (
              <React.Fragment key={step.id}>
                {/* Step Item */}
                <div
                  onClick={() => onSelectStage && onSelectStage(step.id)}
                  className={`flex flex-col items-center text-center cursor-pointer group transition-all duration-200 flex-1 ${
                    onSelectStage ? 'hover:scale-105' : ''
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-100 dark:ring-blue-900/40'
                        : 'neu-inset text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                  </div>

                  <span
                    className={`mt-2 text-xs font-semibold whitespace-nowrap ${
                      isCurrent
                        ? 'text-blue-600 font-bold'
                        : isCompleted
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:block whitespace-nowrap">
                    {step.shortDesc}
                  </span>
                </div>

                {/* Connector Line */}
                {idx < JOURNEY_STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1.5 transition-all ${
                      idx < currentIndex ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Current Step Guidance & Action Card */}
      <div className="p-4 rounded-xl neu-inset flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              {currentStage === 'discover' && 'Select an opportunity with transparent fit evidence.'}
              {currentStage === 'understand_fit' && 'Examine verified qualifications, inferred bridges, and missing requirements.'}
              {currentStage === 'improve_resume' && 'Target your factual achievements toward role competencies.'}
              {currentStage === 'prepare_application' && 'Generate grounded cover letter and outreach messaging.'}
              {currentStage === 'review' && 'Mandatory candidate gate: Verify all statements before submitting.'}
              {currentStage === 'apply' && 'Direct submission to employer hiring portal.'}
              {currentStage === 'track' && 'Log interview milestones and follow-up activities.'}
            </span>
          </p>
          <p className="text-[11px] text-slate-500">
            {currentStage === 'review'
              ? 'ApplyVise AI will never submit fabricated information or send applications without your explicit consent.'
              : 'You remain in full control at every stage of the application workflow.'}
          </p>
        </div>

        {/* Action Button */}
        {onTriggerNextAction && (
          <button
            onClick={onTriggerNextAction}
            className="px-4 py-2 rounded-xl neu-button-primary text-xs font-semibold flex items-center justify-center space-x-1.5 shrink-0"
          >
            <span>Proceed to Next Step</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};