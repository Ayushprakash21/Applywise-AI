import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Award,
  ShieldCheck,
  ChevronRight,
  Info,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { JobVacancy, JobMatchEvaluation, OpportunityAlignmentTier } from '../types/index.ts';

interface CareerFitLensProps {
  vacancy: JobVacancy;
  evaluation?: JobMatchEvaluation;
  onExploreEvidence?: () => void;
  onOpenReadiness?: () => void;
  className?: string;
}

export const CareerFitLens: React.FC<CareerFitLensProps> = ({
  vacancy,
  evaluation = vacancy.matchEvaluation,
  onExploreEvidence,
  onOpenReadiness,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'snapshot' | 'evidence'>('snapshot');

  const score = evaluation?.matchScore ?? 0;
  const tier: OpportunityAlignmentTier = evaluation?.alignmentTier || (
    score >= 80 ? 'STRONG_ALIGNMENT' : score >= 65 ? 'GOOD_ALIGNMENT_WITH_GAPS' : score >= 45 ? 'STRETCH_OPPORTUNITY' : 'LOW_ALIGNMENT'
  );

  const tierMeta: Record<OpportunityAlignmentTier, { label: string; bg: string; text: string; border: string; desc: string }> = {
    STRONG_ALIGNMENT: {
      label: 'Strong Alignment',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      desc: 'Extensive factual evidence directly satisfies published requirements.',
    },
    GOOD_ALIGNMENT_WITH_GAPS: {
      label: 'Good Alignment with Gaps',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      desc: 'Solid core foundation; addressable skill gaps require strategic framing.',
    },
    STRETCH_OPPORTUNITY: {
      label: 'Stretch Opportunity',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      desc: 'Transferable background; highlights potential growth vs strict match.',
    },
    LOW_ALIGNMENT: {
      label: 'Low Alignment',
      bg: 'bg-slate-100 dark:bg-slate-800/40',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700',
      desc: 'Significant divergence from required functional skills or experience.',
    },
  };

  const meta = tierMeta[tier];
  const assessment = evaluation?.honestAssessment;

  // Arc gauge calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const scoreColor =
    score >= 75
      ? '#10B981' // Emerald
      : score >= 60
      ? '#2563EB' // Blue
      : score >= 45
      ? '#F59E0B' // Amber
      : '#64748B'; // Slate

  return (
    <div className={`p-5 rounded-2xl neu-surface border border-white/80 shadow-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Career Fit Lens
            </h3>
            <p className="text-xs text-slate-500">Transparent 5-Second Suitability Audit</p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-1 rounded-xl neu-inset text-xs font-medium">
          <button
            onClick={() => setViewMode('snapshot')}
            className={`px-3 py-1 rounded-lg transition-all ${
              viewMode === 'snapshot'
                ? 'bg-white shadow-xs text-blue-600 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Snapshot
          </button>
          <button
            onClick={() => setViewMode('evidence')}
            className={`px-3 py-1 rounded-lg transition-all ${
              viewMode === 'evidence'
                ? 'bg-white shadow-xs text-blue-600 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Evidence Pillars
          </button>
        </div>
      </div>

      {/* Main Body */}
      {viewMode === 'snapshot' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4 items-center">
          {/* Gauge Column */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl neu-inset text-center">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-200 dark:text-slate-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={scoreColor}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {score}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Match Fit</span>
              </div>
            </div>

            <div className="mt-3">
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${meta.bg} ${meta.text} ${meta.border}`}>
                {meta.label}
              </span>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[180px] leading-tight">
                {meta.desc}
              </p>
            </div>
          </div>

          {/* Snapshot Pillars */}
          <div className="md:col-span-8 space-y-3">
            {/* Essential Matched */}
            <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center space-x-1.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Essential Requirements Matched</span>
                </span>
                <span className="font-mono text-emerald-600">
                  {evaluation?.essentialRequirementsMatched?.length || 0} verified
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {evaluation?.essentialRequirementsMatched && evaluation.essentialRequirementsMatched.length > 0 ? (
                  evaluation.essentialRequirementsMatched.slice(0, 5).map((req, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      {req}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No direct essential requirements matched.</span>
                )}
              </div>
            </div>

            {/* Missing Gaps */}
            <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center space-x-1.5 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Identified Gaps to Address</span>
                </span>
                <span className="font-mono text-amber-600">
                  {evaluation?.missingEssentialRequirements?.length || 0} gaps
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {evaluation?.missingEssentialRequirements && evaluation.missingEssentialRequirements.length > 0 ? (
                  evaluation.missingEssentialRequirements.slice(0, 4).map((gap, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                      {gap}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-emerald-600 font-medium">Zero missing essential qualifications detected.</span>
                )}
              </div>
            </div>

            {/* Strategic Advice */}
            {assessment && (
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-100 flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Recommendation:</strong> {assessment.whatYouShouldImprove?.[0] || 'Align resume framing around verified achievements and target role competencies.'}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Detailed Evidence Pillars */
        <div className="pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* What makes you relevant */}
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center space-x-1.5 mb-2 font-mono">
                <ShieldCheck className="h-4 w-4" />
                <span>What Makes You Relevant</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {assessment?.whatMakesYouRelevant && assessment.whatMakesYouRelevant.length > 0 ? (
                  assessment.whatMakesYouRelevant.map((point, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No strong matches recorded yet.</li>
                )}
              </ul>
            </div>

            {/* What may reduce competitiveness */}
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center space-x-1.5 mb-2 font-mono">
                <AlertTriangle className="h-4 w-4" />
                <span>Points to Clarify or Improve</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {assessment?.whatMayReduceCompetitiveness && assessment.whatMayReduceCompetitiveness.length > 0 ? (
                  assessment.whatMayReduceCompetitiveness.map((point, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-emerald-600 font-medium">No major competitiveness detractors identified.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            {onExploreEvidence && (
              <button
                onClick={onExploreEvidence}
                className="px-3.5 py-1.5 rounded-xl neu-button text-xs font-semibold text-blue-600 flex items-center space-x-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Open Fit Evidence Map</span>
              </button>
            )}
            {onOpenReadiness && (
              <button
                onClick={onOpenReadiness}
                className="px-3.5 py-1.5 rounded-xl neu-button-primary text-xs font-semibold flex items-center space-x-1.5"
              >
                <span>Pre-Flight Readiness</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ground Truth Disclaimer */}
      <p className="mt-3 text-[10px] text-slate-400 text-center font-mono">
        Scores represent algorithmic profile alignment, not guaranteed hiring probability.
      </p>
    </div>
  );
};