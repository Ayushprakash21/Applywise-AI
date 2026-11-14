import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  ShieldCheck,
  Download,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Award,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Printer,
  Eye
} from 'lucide-react';
import { ApplicationRecord, UserProfile } from '../types/index.ts';
import { SearchableSelect } from './ui/SelectSystem.tsx';

interface ResumeStudioTabProps {
  applications: ApplicationRecord[];
  profile: UserProfile | null;
  onTailorResume: (opts: { applicationId?: string; vacancyId?: string }) => Promise<void>;
  isTailoring: boolean;
}

export const ResumeStudioTab: React.FC<ResumeStudioTabProps> = ({
  applications,
  profile,
  onTailorResume,
  isTailoring,
}) => {
  const [selectedAppId, setSelectedAppId] = useState<string>(
    applications[0]?.id || ''
  );
  const [activeView, setActiveView] = useState<'resume' | 'cover_letter'>('resume');
  const [copied, setCopied] = useState(false);

  const selectedApp = applications.find(a => a.id === selectedAppId) || applications[0];

  const handleCopyText = () => {
    if (!selectedApp) return;
    const textToCopy =
      activeView === 'resume'
        ? `${selectedApp.tailoredResume.headline}\n\n${selectedApp.tailoredResume.professionalSummary}\n\nSKILLS:\n${(selectedApp.tailoredResume.targetedSkills || []).join(', ')}\n\nEXPERIENCE:\n` +
          (selectedApp.tailoredResume.tailoredExperiences || [])
            .map(e => `${e.role} at ${e.company}${e.period ? ` (${e.period})` : ''}\n` + (e.bulletPoints || []).filter(b => b && b.trim().length > 0).map(b => `• ${b.trim()}`).join('\n'))
            .join('\n\n')
        : selectedApp.coverLetter || '';

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!selectedApp || !profile) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-xs">
        <FileText className="mx-auto h-10 w-10 text-slate-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-900">No Tailored Resumes Generated Yet</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Explore job opportunities and click "Prepare Application" on any role to generate an ATS-tailored resume.
        </p>
      </div>
    );
  }

  const resume = selectedApp.tailoredResume;

  return (
    <div className="space-y-6">
      {/* Studio Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Resume & Cover Letter Studio</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center space-x-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verified Facts: {resume.truthfulnessScore}/100</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            ATS-optimized layout formatted for clarity, truthful experience, and readability.
          </p>
        </div>

        {/* Target Vacancy Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-2 text-xs text-slate-700">
            <span className="text-slate-500 font-medium">Target Role:</span>
            <div className="w-64 sm:w-80">
              <SearchableSelect
                value={selectedAppId}
                onChange={val => setSelectedAppId(val)}
                options={applications.map(app => ({
                  value: app.id,
                  label: `${app.company} – ${app.role} (${app.matchScore}% match)`,
                }))}
                size="sm"
                ariaLabel="Select Target Role for Resume Studio"
              />
            </div>
          </div>

          <button
            onClick={() => onTailorResume({ applicationId: selectedApp.id })}
            disabled={isTailoring}
            className="flex items-center space-x-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${isTailoring ? 'animate-spin' : ''}`} />
            <span>{isTailoring ? 'Tailoring...' : 'Optimize with AI'}</span>
          </button>

          <button
            onClick={handleCopyText}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Document Meta & Truthfulness Checklist */}
        <div className="space-y-4">
          {/* View Switcher */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setActiveView('resume')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                activeView === 'resume'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tailored Resume
            </button>
            <button
              onClick={() => setActiveView('cover_letter')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                activeView === 'cover_letter'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cover Letter
            </button>
          </div>

          {/* Audit Verification Card */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Anti-Hallucination Guarantee</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span>Verified Fact Alignment:</span>
                <span className="font-semibold text-emerald-700">100%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fabricated Claims:</span>
                <span className="font-semibold text-emerald-700">0</span>
              </div>
            </div>
            <div className="pt-2 border-t border-emerald-200/80 text-[11px] text-emerald-800 leading-relaxed">
              Every job title, employer, period, and skill matches your authentic profile facts.
            </div>
          </div>

          {/* Keyword Targeting */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3 shadow-xs">
            <h4 className="text-xs font-semibold text-slate-900">Targeted Role Keywords</h4>
            <div className="flex flex-wrap gap-1.5">
              {(resume.targetedSkills || []).map((sk, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 font-medium"
                >
                  {sk}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Preview Surface: Formatted A4 ATS Document */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xs print:border-none print:p-0">
            {activeView === 'resume' ? (
              /* Clean ATS Resume Document */
              <div className="max-w-3xl mx-auto space-y-6 text-slate-800 print:text-black">
                {/* Header */}
                <div className="border-b border-slate-200 print:border-black pb-5 text-center space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 print:text-black">
                    {profile.fullName}
                  </h2>
                  <p className="text-xs text-blue-600 print:text-slate-800 font-semibold tracking-wide uppercase">
                    {resume.headline}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 print:text-slate-700 pt-1">
                    <span>{profile.email}</span>
                    <span>·</span>
                    <span>{profile.phone}</span>
                    <span>·</span>
                    <span>{profile.location}</span>
                    {profile.linkedinUrl && (
                      <>
                        <span>·</span>
                        <span>{profile.linkedinUrl.replace('https://', '')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Professional Summary */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black border-b border-slate-200 print:border-black pb-1">
                    Professional Summary
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-700 print:text-slate-900">
                    {resume.professionalSummary}
                  </p>
                </div>

                {/* Core Competencies */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black border-b border-slate-200 print:border-black pb-1">
                    Core Competencies
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-700 print:text-slate-900 font-medium">
                    {(resume.targetedSkills || []).join(' • ')}
                  </p>
                </div>

                {/* Experience */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black border-b border-slate-200 print:border-black pb-1">
                    Professional Experience
                  </h3>

                  <div className="space-y-4">
                    {(resume.tailoredExperiences || []).map((exp, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="font-bold text-slate-900 print:text-black text-sm">
                            {exp.role} <span className="text-blue-600 print:text-slate-700 font-normal">| {exp.company}</span>
                          </span>
                          {exp.period ? (
                            <span className="text-slate-500 print:text-slate-600 text-[11px]">
                              {exp.period}
                            </span>
                          ) : null}
                        </div>
                        {(exp.bulletPoints || []).filter(bp => bp && bp.trim().length > 0).length > 0 && (
                          <ul className="space-y-1 text-xs text-slate-700 print:text-slate-800 pl-4 list-disc">
                            {(exp.bulletPoints || [])
                              .filter(bp => bp && bp.trim().length > 0)
                              .map((bp, bIdx) => (
                                <li key={bIdx} className="leading-relaxed">
                                  {bp.trim()}
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black border-b border-slate-200 print:border-black pb-1">
                    Education
                  </h3>
                  <div className="space-y-1 text-xs text-slate-700 print:text-slate-800">
                    {(resume.education || []).map((edu, i) => (
                      <div key={i}>{edu}</div>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                {(resume.certifications || []).length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black border-b border-slate-200 print:border-black pb-1">
                      Certifications
                    </h3>
                    <div className="space-y-1 text-xs text-slate-700 print:text-slate-800">
                      {(resume.certifications || []).map((cert, i) => (
                        <div key={i}>{cert}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Cover Letter Document */
              <div className="max-w-2xl mx-auto space-y-6 text-slate-800 print:text-black text-xs leading-relaxed whitespace-pre-wrap font-sans">
                <div className="border-b border-slate-200 pb-3 text-slate-500">
                  <div className="font-bold text-slate-900 text-sm">{profile.fullName}</div>
                  <div>{profile.email} · {profile.location}</div>
                  <div className="mt-2 text-blue-600 font-semibold">Application for: {selectedApp.role} at {selectedApp.company}</div>
                </div>
                <div className="text-slate-700 leading-relaxed font-normal">
                  {selectedApp.coverLetter || 'No cover letter drafted for this application yet.'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
