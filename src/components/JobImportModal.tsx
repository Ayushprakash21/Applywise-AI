import React, { useState, useEffect } from 'react';
import {
  X,
  Link2,
  Globe,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Building,
  MapPin,
  DollarSign,
  Briefcase,
  Layers,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Check,
  Edit3
} from 'lucide-react';
import {
  ExtractedJobData,
  JobImportExtractionMethod,
  JobImportExtractionStatus,
  JobVacancy,
  JobImportSaveRequest
} from '../types/index.ts';
import { api } from '../services/api.ts';

export interface JobImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobSaved: (vacancy: JobVacancy, movedToApplications?: boolean) => void;
  plan?: 'free' | 'pro' | 'black';
}

type ImportTab = 'url' | 'paste' | 'manual';
type Step = 'input' | 'extracting' | 'review' | 'saving';

export const JobImportModal: React.FC<JobImportModalProps> = ({
  isOpen,
  onClose,
  onJobSaved,
  plan = 'black'
}) => {
  const isBlack = plan === 'black';

  // Step and mode
  const [activeTab, setActiveTab] = useState<ImportTab>('url');
  const [step, setStep] = useState<Step>('input');
  const [extractionProgress, setExtractionProgress] = useState<string>('');

  // URL input
  const [urlInput, setUrlInput] = useState('');
  const [rawTextInput, setRawTextInput] = useState('');
  const [manualTitleInput, setManualTitleInput] = useState('');
  const [manualCompanyInput, setManualCompanyInput] = useState('');

  // Extracted data for review & editing
  const [extractedData, setExtractedData] = useState<ExtractedJobData | null>(null);
  const [sourceDomain, setSourceDomain] = useState<string>('');
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [canonicalUrl, setCanonicalUrl] = useState<string>('');
  const [extractionMethod, setExtractionMethod] = useState<JobImportExtractionMethod>('manual');
  const [extractionConfidence, setExtractionConfidence] = useState<number>(100);
  const [extractionStatus, setExtractionStatus] = useState<JobImportExtractionStatus>('verified_source');

  // Edit fields in review step
  const [editTitle, setEditTitle] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editWorkplaceType, setEditWorkplaceType] = useState<'Remote' | 'Hybrid' | 'On-site' | 'Unspecified'>('Remote');
  const [editEmploymentType, setEditEmploymentType] = useState<string>('Full-time');
  const [editSalaryCurrency, setEditSalaryCurrency] = useState('USD');
  const [editSalaryMin, setEditSalaryMin] = useState<string>('');
  const [editSalaryMax, setEditSalaryMax] = useState<string>('');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Options & warnings
  const [moveToApplication, setMoveToApplication] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [existingVacancy, setExistingVacancy] = useState<JobVacancy | null>(null);

  // Lock body scroll on open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setStep('input');
    setActiveTab('url');
    setUrlInput('');
    setRawTextInput('');
    setManualTitleInput('');
    setManualCompanyInput('');
    setExtractedData(null);
    setWarningMessage(null);
    setErrorMessage(null);
    setDuplicateWarning(null);
    setExistingVacancy(null);
    setMoveToApplication(false);
  };

  const populateReviewFields = (data: ExtractedJobData, sourceUrl: string) => {
    setExtractedData(data);
    setEditTitle(data.title || '');
    setEditCompany(data.company || '');
    setEditLocation(data.location || '');
    setEditWorkplaceType(data.workplaceType || 'Remote');
    setEditEmploymentType(data.employmentType || 'Full-time');
    setEditSalaryCurrency(data.salaryRange?.currency || 'USD');
    setEditSalaryMin(data.salaryRange?.min ? String(data.salaryRange.min) : '');
    setEditSalaryMax(data.salaryRange?.max ? String(data.salaryRange.max) : '');
    setEditSkills(data.requiredSkills || []);
    setEditDescription(data.description || '');

    setOriginalUrl(sourceUrl);
    setCanonicalUrl(data.originalUrl || sourceUrl);
    try {
      if (sourceUrl.startsWith('http')) {
        setSourceDomain(new URL(sourceUrl).hostname.replace(/^www\./, ''));
      } else {
        setSourceDomain('manual');
      }
    } catch {
      setSourceDomain('unknown');
    }
    setExtractionMethod(data.extractionMethod || 'manual');
    setExtractionConfidence(Math.round((data.extractionConfidence || 1) * 100));
    setExtractionStatus(data.extractionStatus || 'verified_source');
    setStep('review');
  };

  // URL extraction
  const handleExtractFromUrl = async () => {
    if (!urlInput.trim()) {
      setErrorMessage('Please enter a valid job URL to extract.');
      return;
    }

    setErrorMessage(null);
    setWarningMessage(null);
    setDuplicateWarning(null);
    setStep('extracting');

    setExtractionProgress('Connecting to source URL & verifying network safety...');
    await new Promise(r => setTimeout(r, 350));

    try {
      setExtractionProgress('Analyzing page structure and metadata...');
      const response = await api.extractJobFromUrl(urlInput.trim());

      setExtractionProgress('Synthesizing structured vacancy profile...');
      await new Promise(r => setTimeout(r, 250));

      if (response.isDuplicate && response.existingVacancy) {
        setDuplicateWarning(`This opportunity is already in your workspace: "${response.existingVacancy.title}" at ${response.existingVacancy.company}.`);
        setExistingVacancy(response.existingVacancy);
      }

      if (response.error && !response.extractedData) {
        throw new Error(response.error);
      }

      if (!response.extractedData) {
        throw new Error('Unable to extract job data from this URL.');
      }

      populateReviewFields(response.extractedData, urlInput.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setStep('input');
    }
  };

  // Raw JD text extraction
  const handleParseText = async () => {
    if (!rawTextInput.trim() || rawTextInput.trim().length < 20) {
      setErrorMessage('Please paste at least 20 characters of the job description.');
      return;
    }

    setErrorMessage(null);
    setWarningMessage(null);
    setStep('extracting');
    setExtractionProgress('Parsing job description and identifying skills...');

    try {
      const response = await api.parseJobFromText(
        rawTextInput.trim(),
        manualTitleInput.trim() || undefined,
        manualCompanyInput.trim() || undefined,
        urlInput.trim() || undefined
      );

      if (!response.extractedData) {
        throw new Error('Failed to parse text.');
      }

      populateReviewFields(response.extractedData, urlInput.trim() || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setStep('input');
    }
  };

  // Manual entry setup
  const handleStartManualBlank = () => {
    const blankData: ExtractedJobData = {
      title: manualTitleInput.trim() || 'Target Role',
      company: manualCompanyInput.trim() || 'Company',
      location: 'Remote',
      country: 'Global',
      workplaceType: 'Remote',
      employmentType: 'Full-time',
      salaryRange: null,
      requiredSkills: [],
      preferredSkills: [],
      responsibilities: [],
      qualifications: [],
      educationRequirements: [],
      description: rawTextInput.trim() || '',
      originalUrl: urlInput.trim() || '',
      sourceDomain: 'manual',
      extractionTimestamp: new Date().toISOString(),
      extractionMethod: 'manual',
      extractionConfidence: 1.0,
      extractionStatus: 'manual_entry',
      unavailableFields: [],
      reviewRecommendedFields: []
    };
    populateReviewFields(blankData, urlInput.trim() || '');
  };

  // Skills tag handling
  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !editSkills.includes(trimmed)) {
      setEditSkills([...editSkills, trimmed]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setEditSkills(editSkills.filter(s => s !== skillToRemove));
  };

  // Save imported job
  const handleSaveJob = async () => {
    if (!editTitle.trim()) {
      setErrorMessage('Job title is required.');
      return;
    }
    if (!editCompany.trim()) {
      setErrorMessage('Company name is required.');
      return;
    }

    setErrorMessage(null);
    setStep('saving');

    const salaryRange = (editSalaryMin || editSalaryMax)
      ? {
          min: editSalaryMin ? parseInt(editSalaryMin, 10) : null,
          max: editSalaryMax ? parseInt(editSalaryMax, 10) : null,
          currency: editSalaryCurrency,
          raw: editSalaryMin && editSalaryMax ? `${editSalaryCurrency} ${editSalaryMin} - ${editSalaryMax}` : null
        }
      : null;

    const fullExtracted: ExtractedJobData = {
      ...(extractedData || {}),
      title: editTitle.trim(),
      company: editCompany.trim(),
      location: editLocation.trim() || 'Remote',
      country: extractedData?.country || 'Global',
      workplaceType: editWorkplaceType,
      employmentType: editEmploymentType,
      salaryRange,
      requiredSkills: editSkills,
      preferredSkills: extractedData?.preferredSkills || [],
      responsibilities: extractedData?.responsibilities || [],
      qualifications: extractedData?.qualifications || [],
      educationRequirements: extractedData?.educationRequirements || [],
      description: editDescription.trim(),
      originalUrl: canonicalUrl || originalUrl,
      sourceDomain: sourceDomain || 'manual',
      extractionTimestamp: new Date().toISOString(),
      extractionMethod,
      extractionConfidence: extractionConfidence / 100,
      extractionStatus,
      unavailableFields: extractedData?.unavailableFields || [],
      reviewRecommendedFields: extractedData?.reviewRecommendedFields || []
    };

    const payload: JobImportSaveRequest = {
      extractedData: fullExtracted,
      applyDirectly: moveToApplication,
      candidateEdits: {
        title: editTitle.trim(),
        company: editCompany.trim(),
        location: editLocation.trim(),
        workplaceType: editWorkplaceType,
        employmentType: editEmploymentType,
        requiredSkills: editSkills,
        description: editDescription.trim()
      }
    };

    try {
      const res = await api.saveImportedJob(payload);
      if (res.success && res.vacancy) {
        onJobSaved(res.vacancy, moveToApplication);
        onClose();
      } else {
        throw new Error(res.error || 'Failed to save imported job opportunity.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setStep('review');
    }
  };

  if (!isOpen) return null;

  const supportedPlatforms = [
    'LinkedIn',
    'Greenhouse',
    'Lever',
    'Indeed',
    'Wellfound',
    'Workday',
    'SmartRecruiters',
    'Ashby',
    'Direct Career Portals'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-job-modal-title"
        className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto transition-all ${
          isBlack
            ? 'bg-[#0D0F12] border-[rgba(198,166,106,0.22)] text-[#F0EEE9]'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 sm:p-6 pb-4 border-b flex items-center justify-between shrink-0 ${
          isBlack ? 'border-[rgba(255,255,255,0.08)] bg-[#13161B]/80' : 'border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80'
        }`}>
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              isBlack
                ? 'bg-[rgba(198,166,106,0.1)] border-[rgba(198,166,106,0.25)] text-[#C6A66A]'
                : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600'
            }`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="import-job-modal-title" className="text-base sm:text-lg font-bold tracking-tight truncate">
                Import an Opportunity
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Found a role elsewhere? Paste its job posting URL and let ApplyVise extract the opportunity for you.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* Duplicate Warning Banner */}
          {duplicateWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-3 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">{duplicateWarning}</span>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  You can update this posting or save it as a refreshed opportunity record.
                </p>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start space-x-3 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Extraction notice:</span> {errorMessage}
                <div className="mt-2 flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setActiveTab('paste');
                      setErrorMessage(null);
                    }}
                    className="text-[11px] font-semibold underline hover:text-white"
                  >
                    Switch to Paste Job Description fallback ›
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP: INPUT */}
          {step === 'input' && (
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="flex items-center space-x-2 p-1 rounded-2xl bg-black/40 border border-white/5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center space-x-2 ${
                    activeTab === 'url'
                      ? isBlack ? 'bg-[#1C2028] text-[#C6A66A] shadow-sm border border-[rgba(198,166,106,0.3)]' : 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Job URL Extraction</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center space-x-2 ${
                    activeTab === 'paste'
                      ? isBlack ? 'bg-[#1C2028] text-[#C6A66A] shadow-sm border border-[rgba(198,166,106,0.3)]' : 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Description</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center space-x-2 ${
                    activeTab === 'manual'
                      ? isBlack ? 'bg-[#1C2028] text-[#C6A66A] shadow-sm border border-[rgba(198,166,106,0.3)]' : 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Field-by-Field Entry</span>
                </button>
              </div>

              {/* TAB 1: URL EXTRACTION */}
              {activeTab === 'url' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                      <span>Public Job Posting URL</span>
                      <span className="text-[11px] text-slate-500 font-normal">Tracking params are cleaned automatically</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-500">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleExtractFromUrl(); }}
                        placeholder="https://jobs.lever.co/company/job-id or LinkedIn, Greenhouse, etc."
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#13161B] border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#C6A66A] transition"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Primary Extract Button */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-slate-500">
                      Private IP & SSRF protected · Max 2MB payload cap
                    </div>
                    <button
                      type="button"
                      onClick={handleExtractFromUrl}
                      disabled={!urlInput.trim()}
                      className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isBlack
                          ? 'bg-gradient-to-r from-[#C6A66A] to-[#E8D49E] text-[#08090B] hover:opacity-95 shadow-md shadow-[#C6A66A]/10'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                      }`}
                    >
                      <span>Fetch Job Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Supported ATS / Platforms */}
                  <div className="pt-4 border-t border-white/5 space-y-2.5">
                    <div className="text-[11px] uppercase tracking-wider font-mono text-slate-400 font-semibold">
                      Supported Platforms & Ecosystems
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {supportedPlatforms.map(platform => (
                        <span
                          key={platform}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[11px] text-slate-300 font-mono"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PASTE DESCRIPTION */}
              {activeTab === 'paste' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Job Title (optional hint)</label>
                      <input
                        type="text"
                        value={manualTitleInput}
                        onChange={e => setManualTitleInput(e.target.value)}
                        placeholder="e.g. Senior Product Designer"
                        className="w-full px-3 py-2 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C6A66A]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Company (optional hint)</label>
                      <input
                        type="text"
                        value={manualCompanyInput}
                        onChange={e => setManualCompanyInput(e.target.value)}
                        placeholder="e.g. Stripe, OpenAI, etc."
                        className="w-full px-3 py-2 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C6A66A]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Paste Job Description Text
                    </label>
                    <textarea
                      rows={8}
                      value={rawTextInput}
                      onChange={e => setRawTextInput(e.target.value)}
                      placeholder="Paste the full job posting text here. ApplyVise will extract requirements, location, skills, and compensation..."
                      className="w-full p-3.5 rounded-2xl bg-[#13161B] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C6A66A] font-mono leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleParseText}
                      disabled={!rawTextInput.trim() || rawTextInput.trim().length < 20}
                      className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isBlack
                          ? 'bg-gradient-to-r from-[#C6A66A] to-[#E8D49E] text-[#08090B] hover:opacity-95 shadow-md shadow-[#C6A66A]/10'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Parse Description & Review</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: FIELD-BY-FIELD ENTRY */}
              {activeTab === 'manual' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Have a direct opportunity from personal outreach, agency recruiter, or referral? Create a clean opportunity record directly.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Job Title *</label>
                      <input
                        type="text"
                        value={manualTitleInput}
                        onChange={e => setManualTitleInput(e.target.value)}
                        placeholder="e.g. Lead Engineer"
                        className="w-full px-3 py-2 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C6A66A]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Company *</label>
                      <input
                        type="text"
                        value={manualCompanyInput}
                        onChange={e => setManualCompanyInput(e.target.value)}
                        placeholder="e.g. Linear"
                        className="w-full px-3 py-2 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C6A66A]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleStartManualBlank}
                      disabled={!manualTitleInput.trim() || !manualCompanyInput.trim()}
                      className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isBlack
                          ? 'bg-gradient-to-r from-[#C6A66A] to-[#E8D49E] text-[#08090B] hover:opacity-95 shadow-md shadow-[#C6A66A]/10'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                      }`}
                    >
                      <span>Continue to Details & Save</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP: EXTRACTING PROGRESS */}
          {step === 'extracting' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-5 text-center">
              <div className="relative flex items-center justify-center">
                <div className={`w-14 h-14 rounded-full border-2 border-t-transparent animate-spin ${
                  isBlack ? 'border-[#C6A66A]' : 'border-indigo-600'
                }`} />
                <Sparkles className={`w-6 h-6 absolute ${isBlack ? 'text-[#C6A66A]' : 'text-indigo-600'}`} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold tracking-tight text-white">
                  Extracting Opportunity Intelligence
                </div>
                <div className="text-xs text-slate-400 max-w-sm font-mono">
                  {extractionProgress}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-hallucination factual extraction guarantee</span>
              </div>
            </div>
          )}

          {/* STEP: REVIEW & EDITING SCREEN */}
          {(step === 'review' || step === 'saving') && (
            <div className="space-y-6">

              {/* Provenance and Extraction Status Card */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase font-mono ${
                      extractionStatus === 'verified_source'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'
                        : extractionStatus === 'extracted_review_recommended' || extractionStatus === 'partially_extracted'
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                        : 'bg-blue-500/10 text-blue-300 border border-blue-500/25'
                    }`}>
                      {extractionStatus === 'verified_source' && '✓ Verified from Source'}
                      {(extractionStatus === 'extracted_review_recommended' || extractionStatus === 'partially_extracted') && '⚠ Review Recommended'}
                      {extractionStatus === 'manual_entry' && '✎ Manual Entry'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Method: <span className="text-slate-200">{extractionMethod}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Confidence: <span className="text-slate-200">{extractionConfidence}%</span>
                    </span>
                  </div>

                  {originalUrl && (
                    <a
                      href={originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#C6A66A] hover:underline flex items-center space-x-1"
                    >
                      <span className="max-w-[200px] truncate">{sourceDomain || originalUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {warningMessage && (
                  <div className="text-[11px] text-amber-300/90 bg-amber-500/5 p-2 rounded-xl border border-amber-500/15">
                    {warningMessage}
                  </div>
                )}
              </div>

              {/* Editable Fields Grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Job Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder="e.g. Senior Backend Engineer"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C6A66A]"
                    />
                  </div>

                  {/* Company Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={editCompany}
                      onChange={e => setEditCompany(e.target.value)}
                      placeholder="e.g. Stripe, Acme Corp"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C6A66A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Location */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">
                      Location
                    </label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={e => setEditLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA / Remote"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C6A66A]"
                    />
                  </div>

                  {/* Workplace Type */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">
                      Workplace Type
                    </label>
                    <select
                      value={editWorkplaceType}
                      onChange={e => setEditWorkplaceType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white focus:outline-none focus:border-[#C6A66A]"
                    >
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                      <option value="Unspecified">Unspecified</option>
                    </select>
                  </div>

                  {/* Employment Type */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">
                      Employment Type
                    </label>
                    <select
                      value={editEmploymentType}
                      onChange={e => setEditEmploymentType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white focus:outline-none focus:border-[#C6A66A]"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>

                {/* Compensation / Salary Fields (Optional, factual only) */}
                <div className="p-3.5 rounded-2xl bg-black/20 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-[#C6A66A]" />
                      <span>Compensation (optional — only if disclosed)</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Never fabricated</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={editSalaryCurrency}
                      onChange={e => setEditSalaryCurrency(e.target.value)}
                      placeholder="Currency (USD)"
                      className="px-3 py-1.5 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white uppercase focus:outline-none focus:border-[#C6A66A]"
                    />
                    <input
                      type="number"
                      value={editSalaryMin}
                      onChange={e => setEditSalaryMin(e.target.value)}
                      placeholder="Min (e.g. 120000)"
                      className="px-3 py-1.5 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white focus:outline-none focus:border-[#C6A66A]"
                    />
                    <input
                      type="number"
                      value={editSalaryMax}
                      onChange={e => setEditSalaryMax(e.target.value)}
                      placeholder="Max (e.g. 160000)"
                      className="px-3 py-1.5 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white focus:outline-none focus:border-[#C6A66A]"
                    />
                  </div>
                </div>

                {/* Required Skills Tags */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                    <span>Required Competencies & Skills ({editSkills.length})</span>
                    <span className="text-[10px] text-slate-500 font-normal">Used by Match Engine & Interview Studio</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 rounded-xl bg-[#13161B] border border-white/10">
                    {editSkills.map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg bg-[rgba(198,166,106,0.1)] border border-[rgba(198,166,106,0.22)] text-[#E8D49E] text-xs font-mono"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-red-400 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="inline-flex items-center space-x-1">
                      <input
                        type="text"
                        value={newSkillInput}
                        onChange={e => setNewSkillInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill();
                          }
                        }}
                        placeholder="Add skill..."
                        className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none px-2 py-0.5 w-24"
                      />
                      {newSkillInput.trim() && (
                        <button
                          type="button"
                          onClick={handleAddSkill}
                          className="p-1 rounded bg-[#C6A66A] text-black text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Description Text */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider font-mono">
                    Full Job Description
                  </label>
                  <textarea
                    rows={6}
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="Full description text..."
                    className="w-full p-3 rounded-xl bg-[#13161B] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C6A66A] font-mono leading-relaxed"
                  />
                </div>

                {/* Move to Application Control Checkbox */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center space-x-3 cursor-pointer" onClick={() => setMoveToApplication(!moveToApplication)}>
                  <input
                    type="checkbox"
                    id="moveToApplication"
                    checked={moveToApplication}
                    onChange={e => setMoveToApplication(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 text-[#C6A66A] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="moveToApplication" className="text-xs text-slate-200 cursor-pointer flex-1 select-none">
                    <span className="font-semibold text-white">Immediately Move to Application Control</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Creates a tracked application in <span className="text-[#C6A66A]">READY_TO_SUBMIT</span> state with recruiter review and interview rehearsal enabled.
                    </p>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-4 sm:p-5 border-t flex items-center justify-between shrink-0 ${
          isBlack ? 'border-[rgba(255,255,255,0.08)] bg-[#13161B]/80' : 'border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80'
        }`}>
          {step === 'review' || step === 'saving' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={step === 'saving'}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition disabled:opacity-50"
              >
                ‹ Back to Extraction
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={step === 'saving'}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSaveJob}
                  disabled={step === 'saving' || !editTitle.trim() || !editCompany.trim()}
                  className={`flex items-center space-x-2 px-6 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isBlack
                      ? 'bg-gradient-to-r from-[#C6A66A] to-[#E8D49E] text-[#08090B] hover:opacity-95 shadow-lg shadow-[#C6A66A]/15'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                  }`}
                >
                  {step === 'saving' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Opportunity...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Opportunity</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] text-slate-500 font-mono">
                ApplyVise AI · Career Operating System
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
