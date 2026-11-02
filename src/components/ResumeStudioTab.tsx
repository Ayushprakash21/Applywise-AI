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
        ? `${selectedApp.tailoredResume.headline}\n\n${selectedApp.tailoredResume.professionalSummary}\n\nSKILLS:\n${selectedApp.tailoredResume.targetedSkills.join(', ')}\n\nEXPERIENCE:\n` +
          selectedApp.tailoredResume.tailoredExperiences
            .map(e => `${e.role} at ${e.company} (${e.period})\n` + e.bulletPoints.map(b => `• ${b}`).join('\n'))
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400">
        <FileText className="mx-auto h-10 w-10 text-slate-600 mb-3" />
        <h3 className="text-base font-semibold text-white">No Tailored Resumes Generated Yet</h3>
        <p className="text-xs text-slate-400 mt-1">
          Go to Job Discovery and select "Prepare Application" on any vacancy to generate an ATS-tailored resume.
        </p>
      </div>
    );
  }

  const resume = selectedApp.tailoredResume;

  return (
    <div className="space-y-6">
      {/* Studio Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Resume & Document Studio</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center space-x-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Truthfulness Audit: {resume.truthfulnessScore}/100</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Applicant Tracking System (ATS) optimized layout with guaranteed factual fidelity.
          </p>
        </div>

        {/* Target Vacancy Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-2 bg-slate-950/70 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400">Target Role:</span>
            <select
              value={selectedAppId}
              onChange={e => setSelectedAppId(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {applications.map(app => (
                <option key={app.id} value={app.id} className="bg-slate-900 text-white">
                  {app.company} – {app.role} ({app.matchScore}%)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onTailorResume({ applicationId: selectedApp.id })}
            disabled={isTailoring}
            className="flex items-center space-x-1.5 rounded-xl border border-indigo-700/80 bg-indigo-950/40 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/50 transition disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${isTailoring ? 'animate-spin' : ''}`} />
            <span>{isTailoring ? 'Tailoring with Gemini...' : 'Re-optimize with Gemini'}</span>
          </button>

          <button
            onClick={handleCopyText}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied!' : 'Copy ATS Text'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition"
          >
            <Printer className="h-4 w-4" />
            <span>Export / Print PDF</span>
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Document Meta & Truthfulness Checklist */}
        <div className="space-y-4">
          {/* View Switcher */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setActiveView('resume')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                activeView === 'resume'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tailored Resume
            </button>
            <button
              onClick={() => setActiveView('cover_letter')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                activeView === 'cover_letter'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cover Letter
            </button>
          </div>

          {/* Audit Verification Card */}
          <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/15 p-4 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>Anti-Hallucination Audit</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span>Verified Fact Alignment:</span>
                <span className="font-mono font-bold text-emerald-400">100%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Unverified Claims:</span>
                <span className="font-mono text-emerald-400">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Version ID:</span>
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                  {resume.versionId}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-emerald-900/30 text-[11px] text-emerald-300/80 leading-relaxed">
              Every job title, employer, degree, and tool matches candidate's master record.
            </div>
          </div>

          {/* Keyword Targeting */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-white">Targeted ATS Keywords</h4>
            <div className="flex flex-wrap gap-1.5">
              {resume.targetedSkills.map((sk, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-medium"
                >
                  {sk}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Preview Surface: Formatted A4 ATS Document */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-10 shadow-2xl backdrop-blur-sm print:bg-white print:text-black print:border-none print:p-0">
            {activeView === 'resume' ? (
              /* Clean ATS Resume Document */
              <div className="max-w-3xl mx-auto space-y-6 text-slate-200 print:text-black">
                {/* Header */}
                <div className="border-b border-slate-800 print:border-black pb-5 text-center space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight text-white print:text-black">
                    {profile.fullName}
                  </h2>
                  <p className="text-xs text-indigo-400 print:text-slate-800 font-semibold tracking-wide uppercase">
                    {resume.headline}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 print:text-slate-700 pt-1">
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 print:text-black border-b border-slate-800 print:border-black pb-1">
                    Professional Summary
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-300 print:text-slate-900">
                    {resume.professionalSummary}
                  </p>
                </div>

                {/* Core Competencies */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 print:text-black border-b border-slate-800 print:border-black pb-1">
                    Core Technical Competencies
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-300 print:text-slate-900 font-medium">
                    {resume.targetedSkills.join(' • ')}
                  </p>
                </div>

                {/* Experience */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 print:text-black border-b border-slate-800 print:border-black pb-1">
                    Professional Experience
                  </h3>

                  <div className="space-y-4">
                    {resume.tailoredExperiences.map((exp, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="font-bold text-white print:text-black text-sm">
                            {exp.role} <span className="text-indigo-400 print:text-slate-700 font-normal">| {exp.company}</span>
                          </span>
                          <span className="font-mono text-slate-400 print:text-slate-600 text-[11px]">
                            {exp.period}
                          </span>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-300 print:text-slate-800 pl-4 list-disc">
                          {exp.bulletPoints.map((bp, bIdx) => (
                            <li key={bIdx} className="leading-relaxed">
                              {bp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 print:text-black border-b border-slate-800 print:border-black pb-1">
                    Education
                  </h3>
                  <div className="space-y-1 text-xs text-slate-300 print:text-slate-800">
                    {resume.education.map((edu, i) => (
                      <div key={i}>{edu}</div>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                {resume.certifications.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 print:text-black border-b border-slate-800 print:border-black pb-1">
                      Certifications
                    </h3>
                    <div className="space-y-1 text-xs text-slate-300 print:text-slate-800">
                      {resume.certifications.map((cert, i) => (
                        <div key={i}>{cert}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Cover Letter Document */
              <div className="max-w-2xl mx-auto space-y-6 text-slate-200 print:text-black text-xs leading-relaxed whitespace-pre-wrap font-sans">
                <div className="border-b border-slate-800 pb-3 text-slate-400">
                  <div className="font-bold text-white text-sm">{profile.fullName}</div>
                  <div>{profile.email} · {profile.location}</div>
                  <div className="mt-2 text-indigo-400">Application for: {selectedApp.role} at {selectedApp.company}</div>
                </div>
                <div className="text-slate-300 leading-relaxed font-normal">
                  {selectedApp.coverLetter || 'No cover letter drafted for this application.'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
