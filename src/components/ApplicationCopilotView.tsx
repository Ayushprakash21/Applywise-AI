import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  FileText,
  Mail,
  Send,
  ShieldCheck,
  Layers,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { CopilotJobArtifacts } from '../types/index.ts';
import { api } from '../services/api.ts';

interface ApplicationCopilotViewProps {
  artifacts: CopilotJobArtifacts;
  jobId: string;
  jobTitle: string;
  companyName: string;
  onShowToast?: (msg: string) => void;
}

export const ApplicationCopilotView: React.FC<ApplicationCopilotViewProps> = ({
  artifacts,
  jobId,
  jobTitle,
  companyName,
  onShowToast,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [userReviewed, setUserReviewed] = useState<boolean>(artifacts.userReviewed || false);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    if (onShowToast) onShowToast(`${section} copied to clipboard.`);
    setTimeout(() => setCopiedSection(null), 3000);
  };

  const handleToggleReviewed = async () => {
    try {
      setIsReviewing(true);
      await api.reviewCopilotArtifacts(jobId);
      setUserReviewed(true);
      if (onShowToast) onShowToast('Application materials confirmed as candidate-reviewed.');
    } catch (err: any) {
      if (onShowToast) onShowToast(`Error updating review status: ${err.message}`);
    } finally {
      setIsReviewing(false);
    }
  };

  const coverLetterText = artifacts.coverLetter
    ? `${artifacts.coverLetter.salutation}\n\n${artifacts.coverLetter.opening}\n\n${artifacts.coverLetter.bodyParagraphs.join('\n\n')}\n\n${artifacts.coverLetter.callToAction}\n\n${artifacts.coverLetter.closing}`
    : '';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 border border-blue-100 shadow-sm space-y-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Application Copilot
            </h3>
            <p className="text-xs text-slate-500">
              Assisted drafting for {jobTitle} at {companyName} grounded strictly in verified candidate facts.
            </p>
          </div>
        </div>

        {/* Ethical Review Gate */}
        <div className="pt-2 border-t border-blue-100 flex items-center justify-between gap-3 text-xs">
          <label className="flex items-center space-x-2 text-slate-700 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={userReviewed}
              onChange={handleToggleReviewed}
              disabled={isReviewing || userReviewed}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>I have reviewed these materials and confirm they represent only verified facts.</span>
          </label>

          {userReviewed && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              <ShieldCheck className="h-3 w-3" />
              <span>Candidate Reviewed</span>
            </span>
          )}
        </div>
      </div>

      {/* Tailored Resume Highlights */}
      {artifacts.tailoredResumeVersion && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Tailored Resume Framing
              </h4>
            </div>
            <button
              onClick={() => copyToClipboard(artifacts.tailoredResumeVersion?.professionalSummary || '', 'Summary')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              {copiedSection === 'Summary' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSection === 'Summary' ? 'Copied' : 'Copy Summary'}</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 text-xs text-slate-700 leading-relaxed font-mono">
            {artifacts.tailoredResumeVersion.professionalSummary}
          </div>

          {artifacts.tailoredResumeVersion.highlightedExperiences && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Verified Achievement Highlights</span>
              {artifacts.tailoredResumeVersion.highlightedExperiences.map((exp, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-xs font-bold text-slate-800">{exp.role} &middot; <span className="text-slate-500">{exp.company}</span></div>
                  <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                    {exp.bulletPoints.map((bp, bidx) => (
                      <li key={bidx}>{bp}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tailored Cover Letter */}
      {artifacts.coverLetter && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Tailored Cover Letter
              </h4>
            </div>
            <button
              onClick={() => copyToClipboard(coverLetterText, 'Cover Letter')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              {copiedSection === 'Cover Letter' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSection === 'Cover Letter' ? 'Copied' : 'Copy Letter'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-700 leading-relaxed space-y-2 whitespace-pre-wrap">
            {coverLetterText}
          </div>
        </div>
      )}

      {/* Recruiter Outreach */}
      {artifacts.recruiterMessage && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Send className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recruiter Outreach Message (LinkedIn / Email)
              </h4>
            </div>
            <button
              onClick={() => copyToClipboard(artifacts.recruiterMessage?.message || '', 'Recruiter Message')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              {copiedSection === 'Recruiter Message' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSection === 'Recruiter Message' ? 'Copied' : 'Copy Message'}</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 text-xs text-slate-700 leading-relaxed font-mono">
            {artifacts.recruiterMessage.message}
          </div>
        </div>
      )}

      {/* Skills-Gap Learning Plan */}
      {artifacts.skillsGapImprovementPlan && artifacts.skillsGapImprovementPlan.learningPath.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-purple-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Skills-Gap Improvement Plan
            </h4>
          </div>

          <div className="space-y-2">
            {artifacts.skillsGapImprovementPlan.learningPath.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-start justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-purple-900">{item.skill}</span>
                  <p className="text-slate-600 mt-0.5">{item.suggestedAction}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono text-[10px] font-bold shrink-0">
                  ~{item.estimatedHours} hrs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
