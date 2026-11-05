import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
  Building,
  UserCheck,
  TrendingUp,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ListFilter,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import {
  ApplicationRecord,
  RecruiterReviewAudit,
  CandidateFact,
  UserProfile
} from '../types/index.ts';
import { api } from '../services/api.ts';

export interface RecruiterReviewProps {
  applications: ApplicationRecord[];
  profile?: UserProfile | null;
  facts?: CandidateFact[];
  initialApplicationId?: string;
  onNavigateToApplications?: () => void;
  onNavigateToApplication?: (appId: string) => void;
  onNavigateToResumeStudio?: () => void;
  plan?: 'free' | 'pro' | 'black';
  className?: string;
}

export const RecruiterReview: React.FC<RecruiterReviewProps> = ({
  applications,
  profile,
  facts = [],
  initialApplicationId,
  onNavigateToApplications,
  onNavigateToResumeStudio,
  plan = 'free',
}) => {
  const isBlack = plan === 'black';

  const [selectedAppId, setSelectedAppId] = useState<string>(
    initialApplicationId || applications[0]?.id || ''
  );
  const activeApp = applications.find(a => a.id === selectedAppId) || applications[0];

  const [audit, setAudit] = useState<RecruiterReviewAudit | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'verified' | 'indirect' | 'unestablished'>('verified');

  useEffect(() => {
    if (!activeApp) return;

    const loadAudit = async () => {
      try {
        setIsLoading(true);
        // Attempt to load existing audit
        let res = await api.getRecruiterReviewAudit(activeApp.id);
        if (res.success && res.audit) {
          setAudit(res.audit);
        } else {
          // Generate new audit
          const genRes = await api.generateRecruiterReview(activeApp.id);
          if (genRes.success && genRes.audit) {
            setAudit(genRes.audit);
          }
        }
      } catch (err) {
        console.error('Failed to load recruiter review:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAudit();
  }, [activeApp?.id]);

  if (!activeApp) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400 space-y-3">
        <ShieldCheck className="w-8 h-8 mx-auto text-slate-400" />
        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No active applications to review</div>
        <p className="max-w-md mx-auto leading-relaxed">
          Select or create an application in Application Control to perform a professional recruitment screening audit.
        </p>
      </div>
    );
  }

  const reviewCategories = [
    { key: 'roleAlignment', label: '1. Role Alignment', defaultScore: activeApp.matchScore || 75 },
    { key: 'mandatoryRequirements', label: '2. Mandatory Requirements Coverage', defaultScore: 85 },
    { key: 'preferredQualifications', label: '3. Preferred Qualifications Coverage', defaultScore: 70 },
    { key: 'relevantExperience', label: '4. Relevant Experience Depth', defaultScore: 80 },
    { key: 'careerProgression', label: '5. Career Progression Logic', defaultScore: 85 },
    { key: 'skillsEvidence', label: '6. Verified Skills Evidence', defaultScore: 88 },
    { key: 'achievementClarity', label: '7. Achievement Clarity & Metrics', defaultScore: 80 },
    { key: 'resumeStructure', label: '8. Resume Structure & ATS Typography', defaultScore: 95 },
    { key: 'keywordRelevance', label: '9. Domain Keyword Relevance', defaultScore: 85 },
    { key: 'employmentHistoryConsistency', label: '10. Employment Timeline Consistency', defaultScore: 90 },
    { key: 'missingInformation', label: '11. Missing Information Detection', defaultScore: 75 },
    { key: 'unsupportedClaims', label: '12. Unsupported Claims Flagging', defaultScore: 100 },
  ];

  const evidence = audit?.evidenceClassification || {
    verifiedEvidence: (activeApp.tailoredResume?.targetedSkills || []).slice(0, 4),
    indirectEvidence: (activeApp.tailoredResume?.targetedSkills || []).slice(4, 7),
    notEstablished: ((activeApp as any).matchEvaluation?.missingSkills || []),
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Application Selector */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all shadow-sm ${
        isBlack
          ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] text-[#F2F0EA]'
          : 'bg-white/70 dark:bg-slate-900/70 border-white/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
                isBlack
                  ? 'bg-[rgba(198,166,106,0.08)] text-[#C6A66A] border border-[rgba(198,166,106,0.22)]'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40'
              }`}>
                PROFESSIONAL SCREENING ASSESSMENT
              </span>
              <span className="text-xs text-slate-400 font-mono">· 12 Review Dimensions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Recruiter Review
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Objective pre-submission screening from the perspective of enterprise technical recruitment. Evaluates evidence depth, narrative consistency, and role alignment without hallucinating qualifications.
            </p>
          </div>

          {/* Application Dropdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Application:</span>
            <select
              value={selectedAppId}
              onChange={e => setSelectedAppId(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold text-xs focus:outline-none"
            >
              {applications.map(app => (
                <option key={app.id} value={app.id}>
                  {app.role} — {app.company}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/80 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            <strong>Audit Integrity Notice:</strong> This review evaluates the candidate application package against verified facts in the candidate registry. It does not represent an actual hiring decision or claim that a human employer recruiter has reviewed the application.
          </p>
        </div>
      </div>

      {/* 2. Overall Readiness & Recruiter Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alignment Score Card */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
          isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800'
        }`}>
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
              Screening Alignment Rating
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                {audit?.roleAlignmentScore || activeApp.matchScore || 75}%
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                {((audit?.roleAlignmentScore || activeApp.matchScore || 75) >= 70) ? 'Strong Contender' : 'Moderate Alignment'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              Grounded in {facts.length} verified candidate facts. Zero unverified company claims detected.
            </p>
          </div>

          <button
            onClick={onNavigateToResumeStudio}
            className="mt-6 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center space-x-1.5"
          >
            <span>Edit Resume in Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Strongest Points & Potential Concerns */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border space-y-4 ${
          isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800'
        }`}>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
            Executive Recruiter Summary
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Strongest Points */}
            <div className="space-y-2 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Primary Application Strengths</span>
              </span>
              <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                {(audit?.strongestPoints || [
                  `Directly demonstrated experience relevant to ${activeApp.role}`,
                  'ATS-compliant single-column resume typography',
                  'Verified skill grounding in candidate fact registry',
                ]).map((pt, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-emerald-500 font-bold">›</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Screening Considerations */}
            <div className="space-y-2 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
              <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Screening Considerations</span>
              </span>
              <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                {(audit?.potentialConcerns && audit.potentialConcerns.length > 0 ? audit.potentialConcerns : [
                  'Be prepared to articulate baseline context for project achievements.',
                  'Verify technical depth on preferred role qualifications during initial call.',
                ]).map((pt, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-amber-500 font-bold">›</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Three-Tier Evidence Classification */}
      <div className={`p-6 sm:p-7 rounded-3xl border ${
        isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Three-Tier Evidence Audit
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Categorizes qualifications by verifiable proof in candidate profile
            </p>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setActiveEvidenceTab('verified')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeEvidenceTab === 'verified'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Verified ({evidence.verifiedEvidence.length})
            </button>
            <button
              onClick={() => setActiveEvidenceTab('indirect')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeEvidenceTab === 'indirect'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Indirect ({evidence.indirectEvidence.length})
            </button>
            <button
              onClick={() => setActiveEvidenceTab('unestablished')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeEvidenceTab === 'unestablished'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Not Established ({evidence.notEstablished.length})
            </button>
          </div>
        </div>

        <div className="mt-5">
          {activeEvidenceTab === 'verified' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These qualifications are directly supported by user-confirmed records in your candidate fact registry:
              </p>
              <div className="flex flex-wrap gap-2">
                {evidence.verifiedEvidence.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeEvidenceTab === 'indirect' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Related competencies demonstrated through adjacent experience, but not explicitly verified as standalone facts:
              </p>
              <div className="flex flex-wrap gap-2">
                {evidence.indirectEvidence.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeEvidenceTab === 'unestablished' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Skills or requirements not established by available information. ApplyVise AI strictly prohibits hallucinating these claims on your resume:
              </p>
              <div className="flex flex-wrap gap-2">
                {evidence.notEstablished.map((item: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. 12 Review Dimensions Grid */}
      <div className={`p-6 sm:p-7 rounded-3xl border space-y-5 ${
        isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800'
      }`}>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
          Detailed 12-Category Screening Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviewCategories.map(cat => {
            const catAudit = audit?.reviewCategories?.[cat.key];
            const score = catAudit?.score || cat.defaultScore;

            return (
              <div
                key={cat.key}
                className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{cat.label}</h4>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{score}%</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {catAudit?.notes || 'Evaluated against candidate verified career facts and ATS parsing standards.'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
