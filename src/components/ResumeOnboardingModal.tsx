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
  EyeOff
} from 'lucide-react';
import { api } from '../services/api.ts';
import { UserProfile } from '../types/index.ts';
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
  const [errorType, setErrorType] = useState<'scanned' | 'encrypted' | 'malformed' | 'size' | 'general' | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [showReplaceOption, setShowReplaceOption] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    setErrorType(null);
    setWarningMsg(null);

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setErrorMsg('Unsupported format. Please select a text-based PDF (.pdf) or Word document (.docx).');
      setErrorType('general');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 10MB limit. Please upload a smaller resume document.');
      setErrorType('size');
      return false;
    }

    if (file.size === 0) {
      setErrorMsg('The selected file is empty (0 bytes). Please upload a valid document.');
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
    setErrorType(null);
    setWarningMsg(null);

    try {
      // 1. Uploading
      setStep('uploading');
      await new Promise(r => setTimeout(r, 300));

      // 2. Extracting text
      setStep('extracting');
      await new Promise(r => setTimeout(r, 300));

      // 3. Analyzing with Server
      setStep('analyzing');
      const res = await api.uploadResumeFile(selectedFile, replaceExisting);

      // 4. Validating fields
      setStep('validating');
      await new Promise(r => setTimeout(r, 300));

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
      setErrorMsg(msg);

      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('scanned') || lowerMsg.includes('image') || lowerMsg.includes('no readable text')) {
        setErrorType('scanned');
      } else if (lowerMsg.includes('password') || lowerMsg.includes('encrypted')) {
        setErrorType('encrypted');
      } else if (lowerMsg.includes('malformed') || lowerMsg.includes('header')) {
        setErrorType('malformed');
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
    { id: 'uploading', label: '1. Uploading document' },
    { id: 'extracting', label: '2. Extracting text' },
    { id: 'analyzing', label: '3. Analyzing profile' },
    { id: 'validating', label: '4. Validating fields' },
    { id: 'review', label: '5. Ready for review' },
  ];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <BrandLogo size="sm" showWordmark={false} />
            <div>
              <h2 className="text-base font-bold text-slate-900">Resume Intelligence Onboarding</h2>
              <p className="text-xs text-slate-500">Zero-hallucination factual extraction for truthful matching</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Tracker Bar */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between overflow-x-auto text-[11px] gap-2">
          {stepsList.map(s => {
            const status = getStepStatus(s.id);
            return (
              <div
                key={s.id}
                className={`flex items-center space-x-1.5 shrink-0 px-2.5 py-1 rounded-full font-medium transition ${
                  status === 'completed'
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : status === 'current'
                    ? 'text-blue-700 bg-blue-50 border border-blue-200 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                ) : status === 'current' ? (
                  <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                )}
                <span>{s.label}</span>
              </div>
            );
          })}
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
                    ? 'Image-Only / Scanned PDF Detected'
                    : errorType === 'encrypted'
                    ? 'Encrypted / Password-Protected PDF'
                    : errorType === 'malformed'
                    ? 'Invalid Document Format'
                    : errorType === 'size'
                    ? 'File Size Limit Exceeded'
                    : 'Resume Extraction Failed'}
                </p>
                <p className="mt-1 leading-relaxed">{errorMsg}</p>
                {errorType === 'scanned' && (
                  <p className="mt-2 text-rose-700 font-medium">
                    ApplyWise AI requires a standard text-based PDF or Microsoft Word (.docx) file to verify your actual employment history without hallucination. Please re-export your resume from Word/Google Docs or upload a DOCX file.
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
                      <span>{formatFileSize(selectedFile.size)} · Ready to parse</span>
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
                  Your resume document is processed strictly for profile extraction and verified ATS matching. ApplyWise AI guarantees zero fabrication of work history, employers, dates, or credentials.
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

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  disabled={!selectedFile}
                  onClick={handleProcessFile}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5 active:scale-95"
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
                <label className="font-semibold text-slate-700 mb-1.5 block text-xs">
                  Preserved Employment Records ({extractedProfile.experiences.length})
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {extractedProfile.experiences.map((exp, i) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>{exp.role}</span>
                        <span className="text-slate-500 font-normal">{exp.startDate} - {exp.endDate || 'Present'}</span>
                      </div>
                      <div className="text-blue-600 font-medium">{exp.company}</div>
                      <p className="text-slate-600 mt-1 line-clamp-2 leading-relaxed">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Close Without Saving
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveVerifiedProfile}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center space-x-1.5 active:scale-95"
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
