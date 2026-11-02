import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  X,
  Sparkles
} from 'lucide-react';
import { ApplicationRecord, UserProfile } from '../types/index.ts';
import { api } from '../services/api.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface ResumePreviewModalProps {
  application: ApplicationRecord | null;
  profile: UserProfile | null;
  onClose: () => void;
}

export const ResumePreviewModal: React.FC<ResumePreviewModalProps> = ({
  application,
  profile,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'resume' | 'cover_letter'>('resume');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  React.useEffect(() => {
    if (!application || !profile) return;
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
  }, [application, profile, onClose]);

  if (!application || !profile) return null;

  const resume = application.tailoredResume;

  const handleCopy = () => {
    const textToCopy =
      activeTab === 'resume'
        ? `${profile.fullName}\n${profile.email} | ${profile.phone} | ${profile.location}\n\n${resume.headline}\n\n${resume.professionalSummary}\n\nSKILLS:\n${resume.targetedSkills.join(', ')}\n\nEXPERIENCE:\n` +
          resume.tailoredExperiences
            .map(e => `${e.role} at ${e.company} (${e.period})\n` + e.bulletPoints.map(b => `• ${b}`).join('\n'))
            .join('\n\n')
        : application.coverLetter || '';

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = async () => {
    try {
      setDownloading(true);
      await api.downloadDocxResume(application.id, application.company);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <BrandLogo size="sm" showWordmark={false} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 truncate">Tailored ATS Document Studio</h2>
                <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Truthfulness: {resume.truthfulnessScore}/100</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Custom-tailored for <span className="font-semibold text-slate-700">{application.role}</span> at <span className="font-semibold text-slate-700">{application.company}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition"
              title="Copy text to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
            <button
              onClick={() => window.print()}
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition"
              title="Print document"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={handleDownloadDocx}
              disabled={downloading}
              className="px-3.5 py-1.5 min-h-[38px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition touch-target"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloading ? 'Downloading...' : 'Download DOCX'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-6 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center space-x-2 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('resume')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'resume' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ATS Tailored Resume
          </button>
          <button
            onClick={() => setActiveTab('cover_letter')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'cover_letter' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tailored Cover Letter
          </button>
        </div>

        {/* Document Body (Clean ATS Paper Styling) */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-white space-y-6 text-slate-800">
          {activeTab === 'resume' ? (
            <div className="max-w-2xl mx-auto space-y-5 text-xs font-sans">
              {/* Header Contact */}
              <div className="text-center pb-3 border-b border-slate-200 space-y-1">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{profile.fullName}</h1>
                <p className="text-slate-600 text-xs">
                  {profile.email} • {profile.phone} • {profile.location}
                </p>
                {profile.linkedinUrl && (
                  <p className="text-blue-600 text-[11px]">{profile.linkedinUrl}</p>
                )}
              </div>

              {/* Headline & Summary */}
              <div className="space-y-1.5">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-800">
                  {resume.headline}
                </h2>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {resume.professionalSummary}
                </p>
              </div>

              {/* Targeted Skills */}
              <div className="space-y-1.5">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-800 border-b border-slate-100 pb-1">
                  Core Competencies & Skills
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {resume.targetedSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-medium"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-800 border-b border-slate-100 pb-1">
                  Professional Experience
                </h2>
                <div className="space-y-3">
                  {resume.tailoredExperiences.map((exp, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-slate-900 text-xs">{exp.role}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{exp.period}</span>
                      </div>
                      <div className="font-medium text-blue-700 text-xs">{exp.company}</div>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 text-xs pl-1">
                        {exp.bulletPoints.map((b, j) => (
                          <li key={j} className="leading-relaxed">{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              {profile.education.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-800 border-b border-slate-100 pb-1">
                    Education
                  </h2>
                  {profile.education.map((edu, i) => (
                    <div key={i} className="flex justify-between items-baseline text-xs">
                      <span className="font-semibold text-slate-900">
                        {edu.degree} in {edu.fieldOfStudy}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">{edu.graduationYear}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4 text-xs font-sans whitespace-pre-line leading-relaxed text-slate-700 p-4 bg-slate-50 rounded-xl border border-slate-200">
              {application.coverLetter || 'No cover letter generated for this vacancy.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
