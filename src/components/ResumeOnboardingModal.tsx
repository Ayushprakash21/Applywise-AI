import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  X,
  FileUp,
  AlertTriangle,
  Lock,
  EyeOff,
  Edit3,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  GitMerge,
  Split
} from 'lucide-react';
import { api } from '../services/api.ts';
import { UserProfile, ExperienceItem } from '../types/index.ts';
import { LocationAutocomplete } from './ui/SelectSystem.tsx';
import { BrandLogo } from './BrandLogo.tsx';

interface ResumeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (profile: UserProfile) => void;
}

type Step = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'validating' | 'review';

export const ResumeOnboardingModal: React.FC<ResumeOnboardingModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [step, setStep] = useState<Step>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedProfile, setExtractedProfile] = useState<UserProfile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'scanned' | 'encrypted' | 'malformed' | 'size' | 'unsupported' | 'general' | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [showReplaceOption, setShowReplaceOption] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingExpIndex, setEditingExpIndex] = useState<number | null>(null);
  const [editExpForm, setEditExpForm] = useState<ExperienceItem | null>(null);
  const [expandedEvidenceIndex, setExpandedEvidenceIndex] = useState<number | null>(null);

  const handleStartEdit = (index: number) => {
    if (!extractedProfile) return;
    const item = extractedProfile.experiences[index];
    const resp = item.responsibilities && item.responsibilities.length > 0
      ? item.responsibilities
      : (item.description ? item.description.split(/\s*•\s*/).map(s => s.trim()).filter(Boolean) : []);
    setEditingExpIndex(index);
    setEditExpForm({ ...item, responsibilities: resp });
  };

  const handleSaveEdit = () => {
    if (editingExpIndex === null || !editExpForm || !extractedProfile) return;
    const updated = [...extractedProfile.experiences];
    const cleanResp = (editExpForm.responsibilities || []).map(r => r.trim()).filter(Boolean);
    const hasDates = Boolean(editExpForm.startDate && (editExpForm.endDate || editExpForm.current));
    const hasCore = Boolean(editExpForm.company?.trim() && editExpForm.role?.trim());
    updated[editingExpIndex] = {
      ...editExpForm,
      responsibilities: cleanResp,
      achievements: cleanResp.slice(0, 5),
      description: cleanResp.join(' • '),
      isDateUncertain: !hasDates,
      needsVerification: !hasDates || !hasCore,
      confidenceCategory: hasDates && hasCore ? 'High confidence' : 'Needs review',
      validationWarnings: [],
    };
    setExtractedProfile({
      ...extractedProfile,
      experiences: updated,
    });
    setEditingExpIndex(null);
    setEditExpForm(null);
  };

  const handleMergeWithNext = (index: number) => {
    if (!extractedProfile || index < 0 || index >= extractedProfile.experiences.length - 1) return;
    const curr = extractedProfile.experiences[index];
    const next = extractedProfile.experiences[index + 1];
    const mergedResp = Array.from(
      new Set([
        ...(curr.responsibilities || []),
        ...(next.responsibilities || []),
        ...(curr.description ? curr.description.split(/\s*•\s*/).filter(Boolean) : []),
        ...(next.description ? next.description.split(/\s*•\s*/).filter(Boolean) : []),
      ].map(s => s.trim()).filter(Boolean))
    );
    const mergedEvidence = Array.from(
      new Set([...(curr.sourceEvidence || []), ...(next.sourceEvidence || [])].filter(Boolean))
    );
    const merged: ExperienceItem = {
      ...curr,
      company: curr.company && curr.company !== 'Employer not detected' ? curr.company : next.company,
      role: curr.role && curr.role !== 'Title not detected' ? curr.role : next.role,
      location: curr.location || next.location,
      startDate: curr.startDate || next.startDate,
      endDate: curr.current ? 'Present' : (curr.endDate || next.endDate),
      current: Boolean(curr.current || next.current),
      responsibilities: mergedResp,
      achievements: mergedResp.slice(0, 5),
      description: mergedResp.join(' • '),
      sourceEvidence: mergedEvidence,
      sourceText: [curr.sourceText, next.sourceText].filter(Boolean).join('\n'),
    };
    const updated = [...extractedProfile.experiences];
    updated.splice(index, 2, merged);
    setExtractedProfile({
      ...extractedProfile,
      experiences: updated,
    });
  };

  const handleSplitRecord = (index: number) => {
    if (!extractedProfile) return;
    const item = extractedProfile.experiences[index];
    const existingResp = item.responsibilities && item.responsibilities.length > 0
      ? item.responsibilities
      : (item.description ? item.description.split(/\s*•\s*/).map(s => s.trim()).filter(Boolean) : []);
    const midpoint = Math.ceil(existingResp.length / 2);
    const firstHalf = existingResp.slice(0, midpoint);
    const secondHalf = existingResp.slice(midpoint);

    const updatedFirst: ExperienceItem = {
      ...item,
      responsibilities: firstHalf,
      achievements: firstHalf.slice(0, 5),
      description: firstHalf.join(' • '),
    };
    const newSecond: ExperienceItem = {
      id: crypto.randomUUID(),
      company: item.company,
      role: '',
      startDate: '',
      endDate: '',
      current: false,
      location: item.location || '',
      description: secondHalf.join(' • '),
      responsibilities: secondHalf,
      achievements: secondHalf.slice(0, 5),
      verifiedSkillsUsed: [],
      needsVerification: true,
      confidenceCategory: 'Needs review',
      sourceEvidence: item.sourceEvidence,
    };
    const updated = [...extractedProfile.experiences];
    updated.splice(index, 1, updatedFirst, newSecond);
    setExtractedProfile({
      ...extractedProfile,
      experiences: updated,
    });
    setEditingExpIndex(index + 1);
    setEditExpForm(newSecond);
  };

  const handleDeleteExp = (index: number) => {
    if (!extractedProfile) return;
    const updated = extractedProfile.experiences.filter((_, idx) => idx !== index);
    setExtractedProfile({
      ...extractedProfile,
      experiences: updated,
    });
    if (editingExpIndex === index) {
      setEditingExpIndex(null);
      setEditExpForm(null);
    }
  };

  const handleAddExp = () => {
    if (!extractedProfile) return;
    const newExp: ExperienceItem = {
      id: crypto.randomUUID(),
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      current: false,
      location: '',
      description: '',
      achievements: [],
      verifiedSkillsUsed: [],
    };
    setExtractedProfile({
      ...extractedProfile,
      experiences: [newExp, ...extractedProfile.experiences],
    });
    setEditingExpIndex(0);
    setEditExpForm(newExp);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    setErrorCode(null);
    setErrorType(null);
    setWarningMsg(null);

    const lower = file.name.toLowerCase();
    if (lower.endsWith('.doc') && !lower.endsWith('.docx')) {
      setErrorMsg('Legacy Microsoft Word (.doc) format is not supported. Please save/export as .docx or PDF and try again.');
      setErrorCode('DOCX_UNSUPPORTED_FEATURE');
      setErrorType('unsupported');
      return false;
    }
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setErrorMsg('Unsupported format. Please select a text-based PDF (.pdf) or Microsoft Word (.docx) document.');
      setErrorCode('DOCX_UNSUPPORTED_FEATURE');
      setErrorType('unsupported');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 10MB limit. Please upload a smaller resume document.');
      setErrorCode('UPLOAD_TOO_LARGE');
      setErrorType('size');
      return false;
    }

    if (file.size === 0) {
      setErrorMsg('The selected file is empty (0 bytes). Please upload a valid document.');
      setErrorCode(lower.endsWith('.docx') ? 'DOCX_EMPTY_DOCUMENT' : 'PDF_PARSE_FAILURE');
      setErrorType('malformed');
      return false;
    }

    setSelectedFile(file);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;
    setErrorMsg(null);
    setErrorCode(null);
    setErrorType(null);
    setWarningMsg(null);

    try {
      // 1. Uploading document & validating
      setStep('uploading');
      await new Promise(r => setTimeout(r, 150));

      // 2. Extracting text & 3. Analyzing profile on server
      setStep('extracting');
      const res = await api.uploadResumeFile(selectedFile, replaceExisting);

      // 4. Validating extracted fields
      setStep('validating');
      await new Promise(r => setTimeout(r, 150));

      if (!res.profile) {
        throw new Error('No profile data could be extracted from this document.');
      }

      setExtractedProfile(res.profile);
      if (res.warning) {
        setWarningMsg(res.warning);
      }
      setStep('review');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code || null;
      setErrorMsg(msg);
      setErrorCode(code);

      const lowerMsg = msg.toLowerCase();
      if (code === 'UPLOAD_TOO_LARGE' || lowerMsg.includes('10mb limit')) {
        setErrorType('size');
      } else if (code === 'DOCX_ENCRYPTED' || lowerMsg.includes('password') || lowerMsg.includes('encrypted')) {
        setErrorType('encrypted');
      } else if (
        code === 'DOCX_EMPTY_DOCUMENT' ||
        lowerMsg.includes('scanned') ||
        lowerMsg.includes('image') ||
        lowerMsg.includes('no readable text') ||
        lowerMsg.includes('minimal or no extractable text')
      ) {
        setErrorType('scanned');
      } else if (
        code === 'DOCX_INVALID_ARCHIVE' ||
        code === 'DOCX_MISSING_DOCUMENT_XML' ||
        code === 'DOCX_UPLOAD_CORRUPTED' ||
        lowerMsg.includes('malformed') ||
        lowerMsg.includes('header') ||
        lowerMsg.includes('corrupted')
      ) {
        setErrorType('malformed');
      } else if (code === 'DOCX_UNSUPPORTED_FEATURE' || lowerMsg.includes('legacy word')) {
        setErrorType('unsupported');
      } else if (lowerMsg.includes('limit reached') || lowerMsg.includes('replace')) {
        setShowReplaceOption(true);
      } else {
        setErrorType('general');
      }

      setStep('idle');
    }
  };

  const handleSaveVerifiedProfile = async () => {
    if (!extractedProfile) return;
    try {
      setIsSaving(true);
      const res = await api.updateProfile(extractedProfile);
      onProfileUpdated(res.profile);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to save verified profile: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const stepsList = [
    { id: 'uploading', label: 'Uploading document', stepNum: 1 },
    { id: 'extracting', label: 'Extracting text', stepNum: 2 },
    { id: 'analyzing', label: 'Analyzing profile', stepNum: 3 },
    { id: 'validating', label: 'Validating fields', stepNum: 4 },
    { id: 'review', label: 'Ready for review', stepNum: 5 },
  ];

  const getProgressPercentage = () => {
    switch (step) {
      case 'uploading': return 20;
      case 'extracting': return 40;
      case 'analyzing': return 60;
      case 'validating': return 80;
      case 'review': return 100;
      case 'idle':
      default: return 0;
    }
  };

  const getCurrentStepInfo = () => {
    switch (step) {
      case 'uploading':
        return { stepNum: 1, title: 'Uploading document' };
      case 'extracting':
        return { stepNum: 2, title: 'Extracting text' };
      case 'analyzing':
        return { stepNum: 3, title: 'Analyzing profile' };
      case 'validating':
        return { stepNum: 4, title: 'Validating fields' };
      case 'review':
        return { stepNum: 5, title: 'Ready for review' };
      case 'idle':
      default:
        return { stepNum: 1, title: 'Ready to upload' };
    }
  };

  const getStepStatus = (stepId: string) => {
    const order = ['idle', 'uploading', 'extracting', 'analyzing', 'validating', 'review'];
    const currentIndex = order.indexOf(step);
    const targetIndex = order.indexOf(stepId);
    if (currentIndex > targetIndex) return 'completed';
    if (currentIndex === targetIndex) return 'current';
    return 'pending';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
        className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] overflow-hidden max-h-[90vh] flex flex-col my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <BrandLogo size="sm" showWordmark={false} />
            <div className="min-w-0">
              <h2 id="onboarding-modal-title" className="text-base font-bold text-slate-900 truncate">Resume Intelligence Onboarding</h2>
              <p className="text-xs text-slate-500 truncate">Zero-hallucination factual extraction for truthful matching</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Tracker Bar - Responsive 5-Step Grid & Independent Track */}
        <div
          data-testid="onboarding-progress-container"
          className="w-full max-w-full box-border px-4 sm:px-6 py-3.5 bg-slate-50/70 border-b border-slate-100 overflow-hidden shrink-0"
        >
          {/* Mobile View (< 640px): Compact Step Indicator */}
          <div className="sm:hidden space-y-2 w-full max-w-full box-border" data-testid="progress-mobile-compact">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="font-bold text-slate-900 shrink-0">
                  Step {getCurrentStepInfo().stepNum} of 5:
                </span>
                <span className="text-slate-600 font-medium truncate">
                  {getCurrentStepInfo().title}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 shrink-0 ml-2">
                {getProgressPercentage()}%
              </span>
            </div>
            {/* Mobile Progress Track */}
            <div className="w-full h-1 bg-slate-200/80 rounded-full overflow-hidden box-border">
              <div
                data-testid="progress-fill-mobile"
                className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(getProgressPercentage(), step === 'idle' ? 4 : getProgressPercentage())}%` }}
              />
            </div>
          </div>

          {/* Desktop & Tablet View (>= 640px): Full 5-Step Equal-Width Grid + Independent Track */}
          <div className="hidden sm:block space-y-2.5 w-full max-w-full box-border" data-testid="progress-desktop-grid">
            {/* 5-Column Grid */}
            <div
              className="grid w-full max-w-full box-border items-center"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              {stepsList.map((s, idx) => {
                const status = getStepStatus(s.id);
                return (
                  <div
                    key={s.id}
                    data-testid={`progress-step-${idx + 1}`}
                    className="min-w-0 flex flex-col items-center justify-center text-center px-1"
                    style={{ minWidth: 0, boxSizing: 'border-box' }}
                  >
                    <div className="flex items-center space-x-1.5 max-w-full min-w-0">
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : status === 'current' ? (
                        <div className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                        </div>
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                      )}
                      <span
                        className={`text-[10px] sm:text-[11px] md:text-xs truncate transition-colors leading-tight ${
                          status === 'completed'
                            ? 'text-emerald-700 font-semibold'
                            : status === 'current'
                            ? 'text-blue-700 font-bold'
                            : 'text-slate-400 font-medium'
                        }`}
                        title={`${idx + 1}. ${s.label}`}
                      >
                        {idx + 1}. {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Independent Thin Elegant Progress Track */}
            <div className="w-full max-w-full box-border px-1">
              <div className="w-full h-1 bg-slate-200/80 rounded-full overflow-hidden box-border">
                <div
                  data-testid="progress-fill-desktop"
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(getProgressPercentage(), step === 'idle' ? 4 : getProgressPercentage())}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Body Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Error Message Banners with Specific Diagnostics */}
          {errorMsg && (
            <div className="flex items-start space-x-3 p-4 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-800 text-xs animate-in fade-in duration-200">
              {errorType === 'encrypted' ? (
                <Lock className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              ) : errorType === 'scanned' ? (
                <EyeOff className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              )}
              <div className="flex-1">
                <p className="font-bold">
                  {errorType === 'scanned'
                    ? 'Empty / Scanned Document Detected'
                    : errorType === 'encrypted'
                    ? 'Encrypted / Password-Protected Document'
                    : errorType === 'malformed'
                    ? 'Invalid or Corrupted Document'
                    : errorType === 'unsupported'
                    ? 'Unsupported Document Format'
                    : errorType === 'size'
                    ? 'File Size Limit Exceeded'
                    : 'Resume Extraction Failed'}
                  {errorCode && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-100/80 text-rose-700 font-mono text-[10px]">
                      {errorCode}
                    </span>
                  )}
                </p>
                <p className="mt-1 leading-relaxed">{errorMsg}</p>
                {selectedFile && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleProcessFile}
                      className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition cursor-pointer inline-flex items-center space-x-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Retry Extraction</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setErrorCode(null);
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-2.5 py-1 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-100/60 transition cursor-pointer"
                    >
                      Choose Different File
                    </button>
                  </div>
                )}
                {errorType === 'scanned' && (
                  <p className="mt-2 text-rose-700 font-medium">
                    ApplyVise AI requires a standard text-based PDF or Microsoft Word (.docx) file to verify your actual employment history without hallucination. Please re-export your resume from Word/Google Docs or upload a DOCX file.
                  </p>
                )}
              </div>
            </div>
          )}

          {warningMsg && (
            <div className="flex items-start space-x-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{warningMsg}</span>
            </div>
          )}

          {/* STEP: File Selection / Upload Area */}
          {step === 'idle' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 group ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/50 scale-[1.01]'
                    : selectedFile
                    ? 'border-blue-300 bg-blue-50/20 hover:border-blue-400'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20'
                }`}
              >
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200/80 group-hover:scale-105 transition neu-button">
                  <Upload className={`h-7 w-7 ${isDragging ? 'text-blue-700' : 'text-blue-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedFile ? (
                      <span className="text-blue-700 font-bold">{selectedFile.name}</span>
                    ) : isDragging ? (
                      <span className="text-blue-600 font-bold">Drop your resume here</span>
                    ) : (
                      'Click to select or drag and drop your resume'
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports text-based PDF (.pdf) and Microsoft Word (.docx) up to 10MB
                  </p>
                </div>

                {selectedFile && (
                  <div className="flex items-center space-x-2">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-100/80 text-blue-800 rounded-lg text-xs font-semibold">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{formatFileSize(selectedFile.size)} · File selected</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setErrorMsg(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded text-xs transition"
                    >
                      Change file
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Privacy & Extraction Guarantee</span>
                </div>
                <p className="leading-relaxed">
                  Your resume document is processed strictly for profile extraction and verified ATS matching. ApplyVise AI guarantees zero fabrication of work history, employers, dates, or credentials.
                </p>
              </div>

              {(showReplaceOption || replaceExisting) && (
                <label className="flex items-start space-x-2.5 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={e => setReplaceExisting(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0"
                  />
                  <div className="text-xs text-blue-900">
                    <span className="font-semibold">Replace active master resume:</span> Overwrite previous master resume to stay within your Free tier 1-resume limit.
                  </div>
                </label>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="be-btn-tertiary px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-slate-600 dark:text-[#C0BDB5] hover:bg-slate-100 dark:hover:bg-[rgba(255,255,255,0.05)] transition order-2 sm:order-1 text-center cursor-pointer"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  disabled={!selectedFile}
                  onClick={handleProcessFile}
                  className="be-btn-primary px-5 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white dark:text-[#17130C] rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-1.5 active:scale-95 touch-target order-1 sm:order-2 cursor-pointer"
                >
                  <span>Extract & Analyze Profile</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP: Loading / In-Progress Animation */}
          {['uploading', 'extracting', 'analyzing', 'validating'].includes(step) && (
            <div className="py-14 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="h-16 w-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <Sparkles className="h-6 w-6 text-blue-600 absolute inset-0 m-auto" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  {step === 'uploading' && 'Uploading document to secure memory...'}
                  {step === 'extracting' && 'Extracting raw document text cleanly...'}
                  {step === 'analyzing' && 'Structuring profile with ATS resume intelligence...'}
                  {step === 'validating' && 'Validating work history & skills taxonomy...'}
                </h3>
                <p className="text-xs text-slate-500">
                  Ensuring 100% factual fidelity and zero-hallucination compliance.
                </p>
              </div>
            </div>
          )}

          {/* STEP: Profile Review & Verification Form */}
          {step === 'review' && extractedProfile && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Successfully extracted verified profile. Please review and edit before saving.</span>
                </div>
                <button
                  onClick={() => setStep('idle')}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Re-upload</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    value={extractedProfile.fullName}
                    onChange={e => setExtractedProfile({ ...extractedProfile, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Current / Target Title</label>
                  <input
                    type="text"
                    value={extractedProfile.currentTitle}
                    onChange={e => setExtractedProfile({ ...extractedProfile, currentTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={extractedProfile.email}
                    onChange={e => setExtractedProfile({ ...extractedProfile, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Phone</label>
                  <input
                    type="text"
                    value={extractedProfile.phone}
                    onChange={e => setExtractedProfile({ ...extractedProfile, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 mb-1 block">Location</label>
                  <LocationAutocomplete
                    value={extractedProfile.location || ''}
                    onChange={(nextVal, structured) =>
                      setExtractedProfile({
                        ...extractedProfile,
                        location: nextVal,
                        structuredLocation: structured || undefined,
                      })
                    }
                    placeholder="Search city, state, or country..."
                    theme="light"
                    ariaLabel="Extracted Resume Location"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block text-xs">Professional Summary</label>
                <textarea
                  rows={3}
                  value={extractedProfile.professionalSummary}
                  onChange={e => setExtractedProfile({ ...extractedProfile, professionalSummary: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-blue-500 outline-none leading-relaxed"
                />
              </div>

              {/* Skills Chips */}
              <div>
                <label className="font-semibold text-slate-700 mb-1.5 block text-xs">
                  Verified Skills ({extractedProfile.skills.length})
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  {extractedProfile.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-medium shadow-xs"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Work History Summary */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700 block text-xs">
                    Preserved Employment Records ({extractedProfile.experiences.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddExp}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Role</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {extractedProfile.experiences.map((exp, i) => {
                    const isEditing = editingExpIndex === i;

                    if (isEditing && editExpForm) {
                      return (
                        <div key={i} className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between border-b border-blue-200/60 pb-1.5 font-bold text-blue-900">
                            <span>Edit Employment Record #{i + 1}</span>
                            <button
                              type="button"
                              onClick={() => setEditingExpIndex(null)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Company Name *</label>
                              <input
                                type="text"
                                value={editExpForm.company}
                                onChange={e => setEditExpForm({ ...editExpForm, company: e.target.value })}
                                placeholder="e.g. Tata Consultancy Services"
                                className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Job Title *</label>
                              <input
                                type="text"
                                value={editExpForm.role}
                                onChange={e => setEditExpForm({ ...editExpForm, role: e.target.value })}
                                placeholder="e.g. Senior Process Associate"
                                className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Location</label>
                              <LocationAutocomplete
                                value={editExpForm.location || ''}
                                onChange={(val) => setEditExpForm({ ...editExpForm, location: val })}
                                placeholder="e.g. Indore, India"
                                theme="light"
                                ariaLabel="Experience Role Location"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Start Date</label>
                              <input
                                type="text"
                                value={editExpForm.startDate}
                                onChange={e => setEditExpForm({ ...editExpForm, startDate: e.target.value })}
                                placeholder="e.g. September 2024 or 2024-09"
                                className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">End Date</label>
                              <input
                                type="text"
                                disabled={editExpForm.current}
                                value={editExpForm.current ? 'Present' : editExpForm.endDate}
                                onChange={e => setEditExpForm({ ...editExpForm, endDate: e.target.value })}
                                placeholder="e.g. December 2024 or 2024-12"
                                className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                              />
                            </div>

                            <div className="flex items-center pt-4">
                              <label className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editExpForm.current}
                                  onChange={e => setEditExpForm({
                                    ...editExpForm,
                                    current: e.target.checked,
                                    endDate: e.target.checked ? 'Present' : (editExpForm.endDate === 'Present' ? '' : editExpForm.endDate)
                                  })}
                                  className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span>I currently work in this role</span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Responsibilities (one bullet per line)</label>
                            <textarea
                              rows={3}
                              value={(editExpForm.responsibilities || []).join('\n')}
                              onChange={e => setEditExpForm({
                                ...editExpForm,
                                responsibilities: e.target.value.split('\n')
                              })}
                              placeholder="Enter key responsibilities, one per line"
                              className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteExp(i)}
                              className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Remove Record</span>
                            </button>

                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => setEditingExpIndex(null)}
                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-xs"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Format honest date display (never invents default dates)
                    let dateDisplay = '';
                    if (exp.startDate && (exp.endDate || exp.current)) {
                      dateDisplay = `${exp.startDate} – ${exp.current ? 'Present' : exp.endDate}`;
                    } else if (exp.startDate && !exp.endDate && !exp.current) {
                      dateDisplay = `${exp.startDate}`;
                    } else if (!exp.startDate && exp.current) {
                      dateDisplay = 'Present';
                    }

                    const confidenceCategory =
                      exp.confidenceCategory ||
                      (exp.needsVerification || exp.isDateUncertain
                        ? 'Needs review'
                        : exp.company && exp.role && dateDisplay
                          ? 'High confidence'
                          : 'Medium confidence');

                    const badgeStyle =
                      confidenceCategory === 'High confidence'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : confidenceCategory === 'Medium confidence'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200';

                    const responsibilities =
                      exp.responsibilities && exp.responsibilities.length > 0
                        ? exp.responsibilities
                        : (exp.achievements && exp.achievements.length > 0
                            ? exp.achievements
                            : (exp.description ? exp.description.split(/\s*•\s*/).filter(Boolean) : []));

                    const evidenceLines =
                      exp.sourceEvidence && exp.sourceEvidence.length > 0
                        ? exp.sourceEvidence
                        : (exp.sourceText ? exp.sourceText.split('\n').filter(Boolean) : []);

                    const isEvidenceExpanded = expandedEvidenceIndex === i;

                    return (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 relative group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-extrabold text-slate-900 text-xs tracking-tight">
                                {exp.company || 'Employer not detected'}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${badgeStyle}`}>
                                {confidenceCategory}
                              </span>
                            </div>
                            <div className="text-blue-700 font-semibold text-xs mt-0.5">
                              {exp.role && exp.role.toLowerCase() !== 'present' ? exp.role : 'Title not detected'}
                              {exp.location ? <span className="text-slate-500 font-normal"> | {exp.location}</span> : null}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            {dateDisplay ? (
                              <span className="font-medium text-slate-600 text-[11px] whitespace-nowrap bg-white px-2 py-0.5 rounded border border-slate-200">
                                {dateDisplay}
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap">
                                Dates need review
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleStartEdit(i)}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                              title="Edit record"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSplitRecord(i)}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                              title="Split into two records"
                            >
                              <Split className="h-3.5 w-3.5" />
                            </button>

                            {i < extractedProfile.experiences.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMergeWithNext(i)}
                                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                                title="Merge with next record"
                              >
                                <GitMerge className="h-3.5 w-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteExp(i)}
                              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                              title="Delete record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {exp.validationWarnings && exp.validationWarnings.length > 0 && (
                          <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                            {exp.validationWarnings[0]}
                          </div>
                        )}

                        {responsibilities.length > 0 && (
                          <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px] leading-relaxed">
                            {responsibilities.slice(0, 3).map((r, rIdx) => (
                              <li key={rIdx}>{r}</li>
                            ))}
                            {responsibilities.length > 3 && (
                              <li className="text-slate-400 list-none">+{responsibilities.length - 3} more responsibilities</li>
                            )}
                          </ul>
                        )}

                        {evidenceLines.length > 0 && (
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => setExpandedEvidenceIndex(isEvidenceExpanded ? null : i)}
                              className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 flex items-center space-x-1"
                            >
                              {isEvidenceExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              <span>{isEvidenceExpanded ? 'Hide Source Evidence' : 'View Source Evidence'}</span>
                            </button>
                            {isEvidenceExpanded && (
                              <pre className="mt-1 p-2 bg-white border border-slate-200 rounded text-[10px] text-slate-600 whitespace-pre-wrap font-mono leading-snug">
                                {evidenceLines.join('\n')}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition order-2 sm:order-1 text-center"
                >
                  Close Without Saving
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveVerifiedProfile}
                  className="px-5 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center justify-center space-x-1.5 active:scale-95 touch-target order-1 sm:order-2"
                >
                  {isSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm & Save Verified Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
