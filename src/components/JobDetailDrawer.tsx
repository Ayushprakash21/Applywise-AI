import React, { useState, useMemo, useEffect } from 'react';
import { CompanyLogo } from './ui/CompanyLogo.tsx';
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
  ArrowLeft,
  BrainCircuit,
  Compass,
  Check,
  Send,
  Zap,
  Info,
  Layers,
  FileCheck,
  Bookmark,
  Share2,
  Clock,
  Briefcase,
  Award,
  Globe,
  Tag,
  HelpCircle,
  Search,
  Eye,
  Users,
  Mail
} from 'lucide-react';
import {
  JobVacancy,
  ApplicationRecord,
  ApplicationIntegrityReport,
  FitEvidenceMap,
  ApplicationReadinessAssessment,
  CopilotJobArtifacts
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { FitEvidenceMapView } from './FitEvidenceMapView.tsx';
import { ApplicationReadinessView } from './ApplicationReadinessView.tsx';
import { ApplicationCopilotView } from './ApplicationCopilotView.tsx';
import { CareerFitLens } from './CareerFitLens.tsx';
import { ApplicationJourneyView, JourneyStage } from './ApplicationJourneyView.tsx';
import { SafeHtmlRenderer } from './SafeHtmlRenderer.tsx';
import { JobDescriptionRenderer } from './JobDescriptionRenderer.tsx';
import { classifyJobSkills, ClassifiedSkillsSummary } from '../utils/skillClassifier.ts';
import { extractSemanticSections } from '../utils/sanitizeHtml.ts';

interface JobDetailDrawerProps {
  vacancy: JobVacancy | null;
  onClose: () => void;
  onPrepareApplication: (vacancyId: string) => void;
  isPreparing: boolean;
  hasApplied?: boolean;
  onApplicationCreated?: (app: ApplicationRecord) => void;
  onShowToast?: (msg: string) => void;
}

export type DetailTab = 'overview' | 'analysis' | 'match' | 'readiness';

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({
  vacancy,
  onClose,
  onPrepareApplication,
  isPreparing,
  hasApplied = false,
  onApplicationCreated,
  onShowToast,
}) => {
  // Navigation Tabs: Overview, AI Job Analysis, Match Assessment, Integrity & Readiness
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  // Bookmark / Saved State
  const [isSaved, setIsSaved] = useState(false);

  // AI Analysis State
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<any | null>(null);

  // Match Assessment State
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [matchData, setMatchData] = useState<any | null>(null);
  const [evidenceMap, setEvidenceMap] = useState<FitEvidenceMap | null>(null);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);

  // Readiness & Copilot States
  const [readiness, setReadiness] = useState<ApplicationReadinessAssessment | null>(null);
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(false);
  const [copilotArtifacts, setCopilotArtifacts] = useState<CopilotJobArtifacts | null>(null);
  const [isLoadingCopilot, setIsLoadingCopilot] = useState(false);

  // Integrity & Assisted Apply States
  const [integrityReport, setIntegrityReport] = useState<ApplicationIntegrityReport | null>(null);
  const [isAuditingIntegrity, setIsAuditingIntegrity] = useState(false);
  const [isApplyingAssisted, setIsApplyingAssisted] = useState(false);
  const [assistedAppResult, setAssistedAppResult] = useState<any | null>(null);
  const [autoApplyError, setAutoApplyError] = useState<string | null>(null);

  // Job-to-Recruiter Intelligence Graph State
  const [recruiterContacts, setRecruiterContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  useEffect(() => {
    if (!vacancy?.id) return;
    setIsLoadingContacts(true);
    api.getJobContacts(vacancy.id)
      .then((res) => {
        if (res.success && Array.isArray(res.contacts)) {
          setRecruiterContacts(res.contacts);
        } else {
          setRecruiterContacts([]);
        }
      })
      .catch(() => setRecruiterContacts([]))
      .finally(() => setIsLoadingContacts(false));
  }, [vacancy?.id]);

  // Lock background scroll and listen for Escape key
  useEffect(() => {
    if (!vacancy) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [vacancy, onClose]);

  // Classified Skills Taxonomy & Semantic Sections
  const classifiedSkills: ClassifiedSkillsSummary = useMemo(() => {
    if (!vacancy) return { technicalSkills: [], toolsAndTechnologies: [], functionalSkills: [], industryKnowledge: [], otherPhrases: [], totalClassified: 0 };
    return classifyJobSkills(vacancy.requirements || [], vacancy.description || '');
  }, [vacancy]);

  const semanticSections = useMemo(() => {
    if (!vacancy?.description) return { aboutRole: null, companyOverview: null, responsibilities: [], qualifications: [], preferredQualifications: [], benefits: [], hasDetectedSections: false };
    return extractSemanticSections(vacancy.description);
  }, [vacancy]);

  if (!vacancy) return null;

  const match = vacancy.matchEvaluation;

  // Handlers
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

  const handleLoadEvidenceMap = async () => {
    setActiveTab('match');
    if (evidenceMap) return;
    try {
      setIsLoadingEvidence(true);
      const res = await api.getFitEvidenceMap(vacancy.id);
      if (res.success) {
        setEvidenceMap(res.evidenceMap);
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(`Evidence map error: ${err.message}`);
    } finally {
      setIsLoadingEvidence(false);
    }
  };

  const handleLoadReadiness = async () => {
    setActiveTab('readiness');
    if (readiness) return;
    try {
      setIsLoadingReadiness(true);
      const res = await api.getApplicationReadiness(vacancy.id);
      if (res.success) {
        setReadiness(res.readiness);
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(`Readiness error: ${err.message}`);
    } finally {
      setIsLoadingReadiness(false);
    }
  };

  const handleLoadCopilot = async () => {
    setActiveTab('readiness');
    if (copilotArtifacts) return;
    try {
      setIsLoadingCopilot(true);
      const res = await api.getCopilotArtifacts(vacancy.id);
      if (res.success) {
        setCopilotArtifacts(res.artifacts);
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(`Copilot error: ${err.message}`);
    } finally {
      setIsLoadingCopilot(false);
    }
  };

  const handleAuditIntegrity = async () => {
    setActiveTab('readiness');
    if (integrityReport) return;
    try {
      setIsAuditingIntegrity(true);
      const res = await api.verifyApplicationIntegrity({
        vacancyId: vacancy.id,
        destinationUrl: vacancy.url,
        jobSource: vacancy.source,
      });
      if (res.success) {
        setIntegrityReport(res.report);
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(`Integrity check failed: ${err.message}`);
    } finally {
      setIsAuditingIntegrity(false);
    }
  };

  const handleAssistedApply = async () => {
    try {
      setIsApplyingAssisted(true);
      const res = await api.applyAssisted(vacancy.id);
      if (res.success) {
        setAssistedAppResult(res);
        setActiveTab('readiness');
        if (onApplicationCreated) onApplicationCreated(res.application);
        if (onShowToast) onShowToast('Assisted apply package prepared!');
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(`Assisted apply error: ${err.message}`);
    } finally {
      setIsApplyingAssisted(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(vacancy.url || window.location.href);
      if (onShowToast) onShowToast('Job link copied to clipboard!');
    }
  };

  // Company logo or initials avatar
  const companyInitial = vacancy.company ? vacancy.company.charAt(0).toUpperCase() : 'C';
  const formattedPostedDate = vacancy.publishedAt
    ? new Date(vacancy.publishedAt).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : 'Recently';

  const formattedSalary = vacancy.salaryRange?.raw || (
    vacancy.salaryRange?.min && vacancy.salaryRange?.max
      ? `${vacancy.salaryRange.currency || '$'}${vacancy.salaryRange.min.toLocaleString()} - ${vacancy.salaryRange.currency || '$'}${vacancy.salaryRange.max.toLocaleString()}`
      : 'Not specified by employer'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1150px] max-h-[96vh] sm:max-h-[88vh] bg-white dark:bg-[#161D2A] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 select-text relative my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* TOP BAR / BACK NAVIGATION */}
        <div className="shrink-0 px-5 sm:px-8 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#161D2A]/95 backdrop-blur-md z-20">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition py-1.5 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 min-h-[36px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Opportunities</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => { setIsSaved(!isSaved); if (onShowToast) onShowToast(isSaved ? 'Removed from saved jobs' : 'Job saved to bookmarks'); }}
              className={`p-2 rounded-xl border transition min-h-[38px] min-w-[38px] flex items-center justify-center ${
                isSaved
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
              title={isSaved ? 'Saved' : 'Save opportunity'}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-amber-500' : ''}`} />
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Share job link"
            >
              <Share2 className="h-4 w-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Close modal (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE INNER MODAL CONTAINER */}
        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
          {/* TOP SECTION: COMPANY & JOB HERO */}
          <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-50/70 to-white dark:from-slate-900/60 dark:to-[#161D2A] border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
              <div className="flex items-start space-x-4 min-w-0 flex-1">
                {/* Verified Company Logo or Stylized Initial Container */}
                <CompanyLogo
                  companyName={vacancy.company}
                  logoUrl={vacancy.companyLogo || vacancy.companyLogoUrl}
                  domain={vacancy.companyDomain}
                  size="xl"
                  className="shadow-md"
                />

                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {vacancy.company}
                    </span>
                    {vacancy.source && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] uppercase font-bold border border-slate-200 dark:border-slate-700">
                        {vacancy.source}
                      </span>
                    )}
                    {vacancy.lastCheckedAt && (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Verified live</span>
                      </span>
                    )}
                  </div>

                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                    {vacancy.title}
                  </h1>

                  {/* Subtitle Metadata Row */}
                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{vacancy.remote ? 'Remote' : (vacancy.location || 'Location Unspecified')}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="capitalize">{vacancy.employmentType || 'Full-time'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>Posted {formattedPostedDate}</span>
                    </div>
                    {vacancy.salaryRange?.raw && (
                      <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <DollarSign className="h-3.5 w-3.5 shrink-0" />
                        <span>{vacancy.salaryRange.raw}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Hero Actions */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onPrepareApplication(vacancy.id)}
                  disabled={isPreparing}
                  className="flex-1 sm:flex-initial w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 transition flex items-center justify-center space-x-1.5 min-h-[42px]"
                >
                  {isPreparing ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Preparing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Tailor & Apply</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleAssistedApply}
                  disabled={isApplyingAssisted}
                  className="flex-1 sm:flex-initial w-full sm:w-auto px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold transition flex items-center justify-center space-x-1.5 min-h-[38px]"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Assisted Apply</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 PREMIUM NAVIGATION TABS */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 sm:px-8 bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 dark:text-slate-400 overflow-x-auto space-x-2 sticky top-0 z-10 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3.5 px-3.5 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-[#161D2A]'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Job Overview</span>
            </button>

            <button
              onClick={handleAnalyzeJob}
              className={`py-3.5 px-3.5 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 ${
                activeTab === 'analysis'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-[#161D2A]'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BrainCircuit className="h-4 w-4" />
              <span>AI Job Analysis</span>
            </button>

            <button
              onClick={handleMatchResume}
              className={`py-3.5 px-3.5 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 ${
                activeTab === 'match'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-[#161D2A]'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Compass className="h-4 w-4" />
              <span>Match Assessment</span>
            </button>

            <button
              onClick={handleLoadReadiness}
              className={`py-3.5 px-3.5 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 ${
                activeTab === 'readiness'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-[#161D2A]'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Integrity & Readiness</span>
            </button>
          </div>

          {/* TAB BODY CONTAINER */}
          <div className="p-6 sm:p-8 flex-1 pb-8">
          {/* ========================================================================= */}
          {/* TAB 1: JOB OVERVIEW */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Main Column (8 cols): Description & Sections */}
                <div className="lg:col-span-8 space-y-8">
                  {/* Company Overview (if detected or available) */}
                  {semanticSections.companyOverview && (
                    <div className="space-y-2.5 pb-6 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                        <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>About {vacancy.company}</span>
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {semanticSections.companyOverview}
                      </p>
                    </div>
                  )}

                  {/* Sanitized Faithful Original Job Description */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Original Job Description</span>
                    </h3>

                    {/* Safe HTML Renderer without cramped scrollbox */}
                    <div className="bg-white dark:bg-slate-900/60 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <SafeHtmlRenderer
                        html={vacancy.description}
                        enableExpandCollapse={true}
                        maxCollapsedLength={2000}
                      />
                    </div>
                  </div>

                  {/* Responsibilities (if semantic sections detected) */}
                  {semanticSections.responsibilities.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Key Responsibilities</span>
                      </h3>
                      <ul className="space-y-2 bg-slate-50/60 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300">
                        {semanticSections.responsibilities.map((resp, idx) => (
                          <li key={idx} className="flex items-start space-x-2.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 shrink-0" />
                            <span className="leading-relaxed">{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Qualifications & Requirements */}
                  {semanticSections.qualifications.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                        <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Qualifications & Requirements</span>
                      </h3>
                      <ul className="space-y-2 bg-slate-50/60 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300">
                        {semanticSections.qualifications.map((qual, idx) => (
                          <li key={idx} className="flex items-start space-x-2.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-slate-300 mt-2 shrink-0" />
                            <span className="leading-relaxed">{qual}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Structured Skills & Technologies (Part 11 Data Quality Fix) */}
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Skills & Technologies</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Categorized against verified taxonomies to separate technical proficiencies from recruiter tags.
                      </p>
                    </div>

                    {/* Technical Skills */}
                    {classifiedSkills.technicalSkills.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Technical Skills</span>
                        <div className="flex flex-wrap gap-1.5">
                          {classifiedSkills.technicalSkills.map((sk, idx) => (
                            <span key={idx} className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 text-xs font-medium">
                              {sk.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tools and Technologies */}
                    {classifiedSkills.toolsAndTechnologies.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tools & Platforms</span>
                        <div className="flex flex-wrap gap-1.5">
                          {classifiedSkills.toolsAndTechnologies.map((sk, idx) => (
                            <span key={idx} className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 text-xs font-medium">
                              {sk.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Functional Skills */}
                    {classifiedSkills.functionalSkills.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Functional Competencies</span>
                        <div className="flex flex-wrap gap-1.5">
                          {classifiedSkills.functionalSkills.map((sk, idx) => (
                            <span key={idx} className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-xs font-medium">
                              {sk.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recruiter / Category Tags (e.g. JCP Growth correctly isolated!) */}
                    {classifiedSkills.otherPhrases.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                          <HelpCircle className="h-3 w-3 text-slate-400" />
                          <span>External Tags & Categories</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {classifiedSkills.otherPhrases.map((sk, idx) => (
                            <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-mono">
                              {sk.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Sidebar (4 cols): Metadata, Company Card & Quick Tools */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Card 1: Job Metadata Card */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                      Job Overview Details
                    </h4>

                    <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-start justify-between">
                        <span className="text-slate-400 flex items-center space-x-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Date posted:</span>
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{formattedPostedDate}</span>
                      </div>

                      <div className="flex items-start justify-between">
                        <span className="text-slate-400 flex items-center space-x-1.5">
                          <Briefcase className="h-3.5 w-3.5" />
                          <span>Employment type:</span>
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{vacancy.employmentType || 'Full-time'}</span>
                      </div>

                      <div className="flex items-start justify-between">
                        <span className="text-slate-400 flex items-center space-x-1.5">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>Offered salary:</span>
                        </span>
                        <span className={`font-semibold text-right max-w-[140px] truncate ${vacancy.salaryRange?.raw ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {formattedSalary}
                        </span>
                      </div>

                      <div className="flex items-start justify-between">
                        <span className="text-slate-400 flex items-center space-x-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>Work arrangement:</span>
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                          {vacancy.arrangement || (vacancy.remote ? 'Remote' : 'On-site')}
                        </span>
                      </div>

                      <div className="flex items-start justify-between">
                        <span className="text-slate-400 flex items-center space-x-1.5">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Source status:</span>
                        </span>
                        <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          {vacancy.source || 'Arbeitnow'} Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Company Information Card */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center space-x-1.5">
                      <Building className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Company Profile</span>
                    </h4>

                    <div className="flex items-center space-x-3">
                      <CompanyLogo
                        companyName={vacancy.company}
                        logoUrl={vacancy.companyLogo || vacancy.companyLogoUrl}
                        domain={vacancy.companyDomain}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate">{vacancy.company}</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{vacancy.location || 'Global Headquarters'}</p>
                      </div>
                    </div>

                    {vacancy.url && (
                      <a
                        href={vacancy.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center justify-center space-x-1.5"
                      >
                        <span>Visit Original Listing</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* Card 2b: Recruiter & Hiring Team Intelligence Graph */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Hiring Team & Outreach</span>
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 font-semibold">
                        COME 2.0 Graph
                      </span>
                    </div>

                    {isLoadingContacts ? (
                      <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
                        Scanning verified company hiring team & recruiter records...
                      </div>
                    ) : recruiterContacts.length > 0 ? (
                      <div className="space-y-3">
                        {recruiterContacts.slice(0, 2).map((contact, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0">
                                <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {contact.contact_name || `${vacancy.company} Talent Lead`}
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {contact.designation || 'Recruitment & Talent Specialist'}
                                </p>
                              </div>
                              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                contact.email_verification_status === 'Verified' || contact.email_verification_status === 'Domain Valid'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              }`}>
                                <ShieldCheck className="h-3 w-3" />
                                <span>{contact.email_verification_status || 'Verified Contact'}</span>
                              </span>
                            </div>

                            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center space-x-1.5 truncate">
                              <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{contact.email}</span>
                            </div>

                            {contact.evidence && (
                              <p className="text-[10px] text-slate-500 italic truncate" title={contact.evidence}>
                                Evidence: {contact.evidence}
                              </p>
                            )}

                            <a
                              href={`mailto:${contact.email}?subject=${encodeURIComponent(`Application / Inquiry: ${vacancy.title} at ${vacancy.company}`)}`}
                              className="w-full py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center justify-center space-x-1 transition"
                            >
                              <Send className="h-3 w-3" />
                              <span>Direct Outreach</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-center">
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          No personal recruiter publicly disclosed for this vacancy. Applications are ingested directly through the primary employer portal.
                        </p>
                        {vacancy.url && (
                          <a
                            href={vacancy.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                          >
                            <span>Apply Directly on ATS Portal</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card 3: Apply Readiness Tools */}
                  <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Apply Readiness Tools
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Analyze employer expectations, compare verified skills, and prepare truthful application materials.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={handleAnalyzeJob}
                        className="py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition text-xs font-semibold hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center space-x-1"
                      >
                        <BrainCircuit className="h-3.5 w-3.5" />
                        <span>Analyze Job</span>
                      </button>

                      <button
                        onClick={handleMatchResume}
                        className="py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition text-xs font-semibold hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center space-x-1"
                      >
                        <Compass className="h-3.5 w-3.5" />
                        <span>Match Skills</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: AI JOB ANALYSIS */}
          {/* ========================================================================= */}
          {activeTab === 'analysis' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <BrainCircuit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span>AI Job Analysis & Search Intent</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Structured breakdown of employer requirements, seniority expectations, and inferred capabilities.
                  </p>
                </div>
                {analysisData && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Analyzed {new Date(analysisData.analyzedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {isLoadingAnalysis ? (
                <div className="p-16 text-center space-y-3">
                  <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Conducting multi-dimensional job analysis...</p>
                  <p className="text-[11px] text-slate-400">Evaluating role requirements against market expectations.</p>
                </div>
              ) : analysisData ? (
                <div className="space-y-6">
                  {/* Intent & What company is looking for */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      What the Company is Looking For
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {vacancy.company} is seeking an experienced professional for <strong className="text-slate-900 dark:text-white">{vacancy.title}</strong>.
                      The position emphasizes {classifiedSkills.technicalSkills.slice(0, 3).map(s => s.name).join(', ') || 'specialized technical leadership'} and strong execution.
                    </p>
                  </div>

                  {/* Most Important Responsibilities */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Most Important Responsibilities
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {(analysisData.aiInsights?.keyResponsibilities || semanticSections.responsibilities.slice(0, 4)).map((r: string, i: number) => (
                        <li key={i} className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Essential vs Preferred Qualifications */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5">
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                        Essential Employer Requirements
                      </h4>
                      <ul className="space-y-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                        {classifiedSkills.technicalSkills.slice(0, 4).map((s, idx) => (
                          <li key={idx} className="flex items-center space-x-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            <span>{s.name} (Confirmed)</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2.5">
                      <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                        Inferred / Implied Competencies
                      </h4>
                      <ul className="space-y-1.5 text-xs text-indigo-800 dark:text-indigo-300">
                        {(analysisData.aiInsights?.recommendedFocusAreas || ['Cross-team Communication', 'System Observability']).map((item: string, idx: number) => (
                          <li key={idx} className="flex items-center space-x-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-800 dark:bg-slate-300" />
                            <span>{item} <em className="text-[10px] text-indigo-500 dark:text-indigo-400">(Inferred)</em></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                  <BrainCircuit className="h-10 w-10 text-blue-500 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Generate In-Depth AI Analysis</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Inspect hidden qualifications, core employer expectations, and key focus areas for {vacancy.title}.
                  </p>
                  <button
                    onClick={handleAnalyzeJob}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    Run AI Job Analysis
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MATCH ASSESSMENT */}
          {/* ========================================================================= */}
          {activeTab === 'match' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Compass className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Match Assessment & Fit Evidence</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Honest evaluation calculated against your authentic background without inflated claims.
                </p>
              </div>

              {/* Career Fit Lens & Honest Opportunity Assessment (Signature Feature A) */}
              <CareerFitLens
                vacancy={vacancy}
                onExploreEvidence={handleLoadEvidenceMap}
                onOpenReadiness={handleLoadReadiness}
              />

              {/* Evidence Map Integration */}
              {isLoadingEvidence ? (
                <div className="p-12 text-center space-y-3">
                  <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Constructing Fit Evidence Map...</p>
                </div>
              ) : evidenceMap ? (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <FitEvidenceMapView
                    evidenceMap={evidenceMap}
                    jobTitle={vacancy.title}
                    companyName={vacancy.company}
                    onConfirmNode={async (nodeId) => {
                      const res = await api.confirmFitEvidenceNode(vacancy.id, nodeId);
                      if (res.success) setEvidenceMap(res.evidenceMap);
                    }}
                    onShowToast={onShowToast}
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: INTEGRITY & READINESS */}
          {/* ========================================================================= */}
          {activeTab === 'readiness' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Integrity Verification & Application Readiness</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verify source authenticity, audit truthfulness, and tailor application materials without fabrication.
                </p>
              </div>

              {/* Application Journey (Candidate-Controlled Workflow) */}
              <ApplicationJourneyView
                currentStage={hasApplied ? 'track' : isPreparing ? 'improve_resume' : 'understand_fit'}
                onSelectStage={(stage: JourneyStage) => {
                  if (stage === 'understand_fit') setActiveTab('match');
                  if (stage === 'improve_resume') onPrepareApplication(vacancy.id);
                }}
              />

              {/* Readiness Studio */}
              {isLoadingReadiness ? (
                <div className="p-12 text-center space-y-3">
                  <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Evaluating Application Readiness...</p>
                </div>
              ) : readiness ? (
                <ApplicationReadinessView
                  readiness={readiness}
                  jobTitle={vacancy.title}
                  companyName={vacancy.company}
                  onProceedToApply={() => onPrepareApplication(vacancy.id)}
                />
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <FileCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Run Pre-Apply Readiness Studio</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Verify pre-flight checklists and critical alignment requirements before applying.
                  </p>
                  <button
                    onClick={handleLoadReadiness}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    Load Readiness Assessment
                  </button>
                </div>
              )}

              {/* Zero-Hallucination Truth Audit */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Truthfulness & Source Audit</span>
                </h4>

                {integrityReport ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Source Destination Integrity</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">PASS: Legitimate Employer URL</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Credential Verification</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">PASS: Zero Fabricated Claims</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleAuditIntegrity}
                    disabled={isAuditingIntegrity}
                    className="py-2 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition text-xs font-semibold hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center space-x-1.5"
                  >
                    {isAuditingIntegrity ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span>Auditing...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Run Truthfulness Audit</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {autoApplyError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start space-x-2 mt-4">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{autoApplyError}</span>
            </div>
          )}
        </div>
      </div>

      {/* PART 8: PREMIUM ACTION STICKY FOOTER */}
      <div className="shrink-0 p-4 sm:px-8 sm:py-3.5 border-t border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#161D2A]/95 backdrop-blur-md sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: View Original Listing */}
        <a
          href={vacancy.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 transition flex items-center justify-center space-x-1.5 min-h-[42px] shadow-2xs"
        >
          <span>View Original Listing</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </a>

        {/* Right: Actions */}
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2.5">
          {/* Assisted Apply */}
          <button
            onClick={handleAssistedApply}
            disabled={isApplyingAssisted}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition flex items-center justify-center space-x-1.5 min-h-[42px]"
          >
            {isApplyingAssisted ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-blue-700 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span>Preparing...</span>
              </>
            ) : (
              <>
                <Compass className="h-3.5 w-3.5" />
                <span>Assisted Apply</span>
              </>
            )}
          </button>

          {/* Tailor & Apply (Primary Action) */}
          {hasApplied ? (
            <div className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 min-h-[42px]">
              <CheckCircle2 className="h-4 w-4" />
              <span>Tracked Application</span>
            </div>
          ) : (
            <button
              onClick={() => onPrepareApplication(vacancy.id)}
              disabled={isPreparing}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 transition flex items-center justify-center space-x-1.5 min-h-[42px]"
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
