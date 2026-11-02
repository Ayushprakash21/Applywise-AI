import React, { useState } from 'react';
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
  ArrowRight,
  BrainCircuit,
  Compass,
  Check,
  Send,
  Zap,
  Info
} from 'lucide-react';
import { JobVacancy, ApplicationRecord } from '../types/index.ts';
import { api } from '../services/api.ts';

interface JobDetailDrawerProps {
  vacancy: JobVacancy | null;
  onClose: () => void;
  onPrepareApplication: (vacancyId: string) => void;
  isPreparing: boolean;
  hasApplied?: boolean;
  onApplicationCreated?: (app: ApplicationRecord) => void;
  onShowToast?: (msg: string) => void;
}

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({
  vacancy,
  onClose,
  onPrepareApplication,
  isPreparing,
  hasApplied = false,
  onApplicationCreated,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'match' | 'assisted'>('overview');
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [matchData, setMatchData] = useState<any | null>(null);
  const [isApplyingAssisted, setIsApplyingAssisted] = useState(false);
  const [assistedAppResult, setAssistedAppResult] = useState<any | null>(null);
  const [isApplyingAuto, setIsApplyingAuto] = useState(false);
  const [autoApplyError, setAutoApplyError] = useState<string | null>(null);

  if (!vacancy) return null;

  const match = vacancy.matchEvaluation;

  const handleAnalyzeJob = async () => {
    setActiveTab('analysis');
    if (analysisData) return;
    try {
      setIsLoadingAnalysis(true);
      const res = await api.analyzeJob(vacancy.id);
      if (res.success) {
        setAnalysisData(res.analysis);
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(`Analysis error: ${err.message}`);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleMatchResume = async () => {
    setActiveTab('match');
    if (matchData) return;
    try {
      setIsLoadingMatch(true);
      const res = await api.matchJob(vacancy.id);
      if (res.success) {
        setMatchData(res.match);
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(`Match error: ${err.message}`);
    } finally {
      setIsLoadingMatch(false);
    }
  };

  const handleAssistedApply = async () => {
    try {
      setIsApplyingAssisted(true);
      const res = await api.applyAssisted(vacancy.id);
      if (res.success) {
        setAssistedAppResult(res);
        setActiveTab('assisted');
        if (onApplicationCreated) onApplicationCreated(res.application);
        if (onShowToast) onShowToast('Assisted apply package prepared!');
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(`Assisted apply error: ${err.message}`);
    } finally {
      setIsApplyingAssisted(false);
    }
  };

  const handleAutoApply = async () => {
    setAutoApplyError(null);
    try {
      setIsApplyingAuto(true);
      const res = await api.applyAuto(vacancy.id);
      if (res.success) {
        if (onApplicationCreated) onApplicationCreated(res.application);
        if (onShowToast) onShowToast(res.message || 'Auto-Apply completed!');
        onClose();
      } else {
        setAutoApplyError(res.error || 'Failed to submit application.');
      }
    } catch (err: any) {
      setAutoApplyError(err.message || 'Auto-Apply request failed.');
      if (onShowToast) onShowToast(`Auto-apply: ${err.message}`);
    } finally {
      setIsApplyingAuto(false);
    }
  };

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
            <span className={`px-2.5 py-0.5 rounded-full font-medium text-[11px] ${
              vacancy.arrangement === 'remote' || vacancy.remote
                ? 'bg-emerald-50 text-emerald-700'
                : vacancy.arrangement === 'hybrid'
                ? 'bg-indigo-50 text-indigo-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {vacancy.arrangement ? vacancy.arrangement.toUpperCase() : (vacancy.remote ? 'REMOTE' : 'ONSITE')}
            </span>
            {vacancy.lastCheckedAt && (
              <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] text-slate-400">
                <Check className="h-3 w-3 text-emerald-500" />
                <span>Verified live</span>
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50 text-xs font-semibold text-slate-500 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Job Overview
          </button>
          <button
            onClick={handleAnalyzeJob}
            className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'analysis'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            <span>AI Job Analysis</span>
          </button>
          <button
            onClick={handleMatchResume}
            className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'match'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Match Assessment</span>
          </button>
          {assistedAppResult && (
            <button
              onClick={() => setActiveTab('assisted')}
              className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'assisted'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Assisted Apply Portal</span>
            </button>
          )}
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
                <span>Posted {new Date(vacancy.publishedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Quick AI Readiness Action Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/60 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>Apply Readiness Tools</span>
                  </p>
                  <p className="text-[11px] text-slate-500">Analyze expectations, match your authentic resume, and prepare tailored materials.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAnalyzeJob}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    Analyze Job
                  </button>
                  <button
                    onClick={handleMatchResume}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    Match Skills
                  </button>
                </div>
              </div>

              {/* Requirements & Tags */}
              {vacancy.requirements && vacancy.requirements.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Required Skills & Technologies</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {vacancy.requirements.map((req, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Job Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Original Job Description</h3>
                <div className="text-xs text-slate-600 leading-relaxed space-y-3 whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-96 overflow-y-auto">
                  {vacancy.description}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: AI JOB ANALYSIS */}
          {activeTab === 'analysis' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {isLoadingAnalysis ? (
                <div className="p-12 text-center space-y-3">
                  <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Extracting structured requirements and responsibilities...</p>
                </div>
              ) : analysisData ? (
                <>
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2">
                    <h4 className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                      <BrainCircuit className="h-4 w-4 text-blue-600" />
                      <span>Extracted Job Facts</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">Experience Level:</span>
                        <p className="font-semibold text-slate-800 capitalize">{analysisData.extractedRequirements.experienceLevel}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Work Arrangement:</span>
                        <p className="font-semibold text-slate-800 capitalize">{analysisData.extractedRequirements.workArrangement}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Salary Published:</span>
                        <p className="font-semibold text-slate-800">{analysisData.extractedRequirements.salaryRange}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Visa / Tax Guidance:</span>
                        <p className="font-semibold text-slate-800 text-[11px]">{analysisData.aiInsights.sponsorshipInsight}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Key Responsibilities</h4>
                    <div className="space-y-1.5">
                      {analysisData.aiInsights.keyResponsibilities.map((resp: string, idx: number) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{resp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recommended Preparation Focus</h4>
                    <div className="space-y-1.5">
                      {analysisData.aiInsights.recommendedFocusAreas.map((area: string, idx: number) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">Analysis unavailable.</p>
              )}
            </div>
          )}

          {/* TAB 3: MATCH BREAKDOWN */}
          {activeTab === 'match' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {isLoadingMatch ? (
                <div className="p-12 text-center space-y-3">
                  <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Evaluating factual skill and experience alignment...</p>
                </div>
              ) : (matchData || match) ? (
                (() => {
                  const m = matchData || match;
                  return (
                    <>
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-200/80 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            <h3 className="font-bold text-xs text-slate-900">Approximate Match Assessment</h3>
                          </div>
                          <span className="text-xl font-extrabold text-blue-700">
                            {m.matchScore}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 italic">
                          Heuristic alignment indicator based on verified skills, title relevance, and experience. Not a scientific predictor.
                        </p>
                      </div>

                      {/* Matching Skills */}
                      {m.matchedSkills && m.matchedSkills.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Evidenced Alignments</p>
                          <div className="space-y-1">
                            {m.matchedSkills.map((r: string, i: number) => (
                              <div key={i} className="flex items-center space-x-2 text-xs text-slate-700">
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Requirements */}
                      {m.missingSkills && m.missingSkills.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Unverified Requirements</p>
                          <div className="flex flex-wrap gap-1.5">
                            {m.missingSkills.map((s: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-600 font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">Sign in and complete your profile to view match breakdown.</p>
              )}
            </div>
          )}

          {/* TAB 4: ASSISTED APPLY PORTAL */}
          {activeTab === 'assisted' && assistedAppResult && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Assisted Application Package Ready</span>
                </div>
                <p className="text-xs text-emerald-700">
                  Your ATS-tailored resume and cover letter have been generated and attached to your application tracker.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Assisted Apply Checklist</h4>
                <div className="space-y-2">
                  {assistedAppResult.application?.guidedApplication?.instructions?.map((inst: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                      <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span>{inst}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={assistedAppResult.officialApplicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-2"
                >
                  <span>Open Official Employer Application Portal</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {autoApplyError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{autoApplyError}</span>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3">
          <a
            href={vacancy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5"
          >
            <span>Original Listing</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>

          <div className="flex items-center space-x-2">
            {/* Assisted Apply (Mode A) */}
            <button
              onClick={handleAssistedApply}
              disabled={isApplyingAssisted}
              className="px-4 py-2.5 rounded-xl border border-blue-300 bg-blue-50/60 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition flex items-center space-x-1.5"
            >
              {isApplyingAssisted ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Compass className="h-3.5 w-3.5" />
                  <span>Assisted Apply</span>
                </>
              )}
            </button>

            {/* Standard Prepare / Tailor */}
            {hasApplied ? (
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                <span>Tracked</span>
              </div>
            ) : (
              <button
                onClick={() => onPrepareApplication(vacancy.id)}
                disabled={isPreparing}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 transition flex items-center space-x-1.5"
              >
                {isPreparing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Tailoring...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Tailor & Apply</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
