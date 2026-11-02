import React, { useState } from 'react';
import {
  FileText,
  Building,
  MapPin,
  ExternalLink,
  Download,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ChevronRight,
  Filter,
  Copy,
  Check
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus } from '../types/index.ts';
import { api } from '../services/api.ts';

interface ApplicationsPageProps {
  applications: ApplicationRecord[];
  onSelectApplication: (app: ApplicationRecord) => void;
  onRefresh: () => void;
  onViewResume: (app: ApplicationRecord) => void;
  onNavigateToJobs: () => void;
}

export const ApplicationsPage: React.FC<ApplicationsPageProps> = ({
  applications,
  onSelectApplication,
  onRefresh,
  onViewResume,
  onNavigateToJobs,
}) => {
  const [filter, setFilter] = useState<'all' | 'PREPARED' | 'AWAITING_APPROVAL' | 'GUIDED_COMPLETION_REQUIRED' | 'SUBMITTED_VERIFIED' | 'INTERVIEWING' | 'OFFER_RECEIVED'>('all');
  const [guidedModalApp, setGuidedModalApp] = useState<ApplicationRecord | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmUrl, setConfirmUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const statusBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
    DISCOVERED: { label: 'Discovered', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    PREPARED: { label: 'Prepared', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    AWAITING_APPROVAL: { label: 'Awaiting Approval', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    AUTHORIZED_TO_SUBMIT: { label: 'Authorized', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    GUIDED_COMPLETION_REQUIRED: { label: 'Guided Completion Required', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    SUBMITTED_VERIFIED: { label: 'Submitted (Verified)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    CONFIRMATION_VERIFIED: { label: 'Submitted (Verified)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    INTERVIEW: { label: 'Interviewing', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    INTERVIEWING: { label: 'Interviewing', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    OFFER_RECEIVED: { label: 'Offer Received', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
    REJECTED: { label: 'Archived / Rejected', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  };

  const filteredApps = applications.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'SUBMITTED_VERIFIED') return a.status === 'SUBMITTED_VERIFIED' || a.status === 'CONFIRMATION_VERIFIED';
    if (filter === 'INTERVIEWING') return a.status === 'INTERVIEWING' || a.status === 'INTERVIEW';
    return a.status === filter;
  });

  const handleLaunchSubmit = async (app: ApplicationRecord) => {
    try {
      const res = await api.submitApplication(app.id);
      if (res.guidedApplication) {
        setGuidedModalApp({ ...app, guidedApplication: res.guidedApplication, status: res.application.status });
      }
      onRefresh();
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  const handleVerifySubmission = async () => {
    if (!guidedModalApp) return;
    try {
      setIsVerifying(true);
      await api.submitApplication(guidedModalApp.id, {
        confirmationCode: confirmCode.trim() || undefined,
        employerConfirmationUrl: confirmUrl.trim() || undefined,
      });
      setGuidedModalApp(null);
      setConfirmCode('');
      setConfirmUrl('');
      onRefresh();
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyText = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="glass-card rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Applications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Truthful application lifecycle management. Verified documents, tailored packages, and genuine submission tracking.
          </p>
        </div>

        <button
          onClick={onNavigateToJobs}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition flex items-center space-x-1.5 shrink-0"
        >
          <span>Find More Vacancies</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {[
          { id: 'all', label: `All (${applications.length})` },
          { id: 'PREPARED', label: 'Prepared Packages' },
          { id: 'GUIDED_COMPLETION_REQUIRED', label: 'Guided Completion' },
          { id: 'SUBMITTED_VERIFIED', label: 'Verified Submitted' },
          { id: 'INTERVIEWING', label: 'Interviewing' },
          { id: 'OFFER_RECEIVED', label: 'Offers' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              filter === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'glass-card text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <FileText className="h-10 w-10 mx-auto text-slate-300" />
          <h3 className="text-sm font-bold text-slate-700">No applications in this category</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Discover real vacancies and click "Prepare Application" to generate an ATS tailored resume and application package.
          </p>
          <button
            onClick={onNavigateToJobs}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Explore Jobs Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApps.map(app => {
            const badge = statusBadges[app.status] || { label: app.status, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };

            return (
              <div
                key={app.id}
                className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Job Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-mono text-blue-700 font-bold">{app.matchScore}% Match</span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900">{app.role}</h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="font-semibold text-blue-600 flex items-center space-x-1">
                      <Building className="h-3.5 w-3.5" />
                      <span>{app.company}</span>
                    </span>
                    <span className="flex items-center space-x-1 text-slate-400">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{app.location}</span>
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Updated {new Date(app.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => onViewResume(app)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span>View ATS Resume</span>
                  </button>

                  <button
                    onClick={() => api.downloadDocxResume(app.id, app.company)}
                    className="p-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                    title="Download DOCX"
                  >
                    <Download className="h-4 w-4 text-slate-500" />
                  </button>

                  {/* Submit / Complete Application Button */}
                  {(app.status === 'PREPARED' || app.status === 'AWAITING_APPROVAL' || app.status === 'AUTHORIZED_TO_SUBMIT') && (
                    <button
                      onClick={() => handleLaunchSubmit(app)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center space-x-1.5"
                    >
                      <span>Proceed to Apply</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {app.status === 'GUIDED_COMPLETION_REQUIRED' && (
                    <button
                      onClick={() => setGuidedModalApp(app)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center space-x-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Complete Guided Submission</span>
                    </button>
                  )}

                  {(app.status === 'SUBMITTED_VERIFIED' || app.status === 'CONFIRMATION_VERIFIED') && (
                    <button
                      onClick={() => api.transitionStatus(app.id, 'INTERVIEWING', 'Invited to interview stage')}
                      className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-semibold transition"
                    >
                      Mark Interviewing
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guided Submission Modal */}
      {guidedModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Guided Portal Submission</h2>
                  <p className="text-xs text-slate-500">
                    Applying to {guidedModalApp.company} — {guidedModalApp.role}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGuidedModalApp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-2">
                <p className="font-semibold flex items-center space-x-1.5">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                  <span>Submission Steps (Zero Faked Confirmation)</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                  <li>Download your tailored ATS resume below.</li>
                  <li>Click "Open Employer Portal" to access the direct application page.</li>
                  <li>Paste the pre-filled contact details provided below into the form.</li>
                  <li>After submitting on the employer's website, paste your confirmation receipt or code here to verify.</li>
                </ol>
              </div>

              {/* Action Buttons for Documents and Portal */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => api.downloadDocxResume(guidedModalApp.id, guidedModalApp.company)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 text-left transition flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-800">Tailored Resume</p>
                    <p className="text-[11px] text-slate-500">Download ATS DOCX</p>
                  </div>
                  <Download className="h-4 w-4 text-blue-600" />
                </button>

                <a
                  href={guidedModalApp.url || guidedModalApp.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl border border-blue-300 bg-blue-600 hover:bg-blue-700 text-white text-left transition flex items-center justify-between shadow-xs"
                >
                  <div>
                    <p className="font-bold">Employer Portal</p>
                    <p className="text-[11px] text-blue-100">Open External Link</p>
                  </div>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {/* Prefilled Fields for quick copy */}
              {guidedModalApp.guidedApplication?.prefilledFields && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Pre-filled Form Data (1-Click Copy)
                  </p>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {Object.entries(guidedModalApp.guidedApplication.prefilledFields).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200">
                        <div className="truncate mr-2">
                          <span className="text-[10px] text-slate-400 block">{k}</span>
                          <span className="font-semibold text-slate-800 truncate block">{v}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(k, v)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                        >
                          {copiedField === k ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Record Genuine Confirmation Evidence */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="font-bold text-slate-800">Confirm Your Submission</p>
                <div>
                  <label className="text-slate-600 block mb-1">Employer Confirmation Number / Reference ID (Optional)</label>
                  <input
                    type="text"
                    value={confirmCode}
                    onChange={e => setConfirmCode(e.target.value)}
                    placeholder="e.g. APP-94821 or Job Reference ID"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">Confirmation Page URL / Screenshot Link (Optional)</label>
                  <input
                    type="text"
                    value={confirmUrl}
                    onChange={e => setConfirmUrl(e.target.value)}
                    placeholder="https://company.greenhouse.io/.../thank-you"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setGuidedModalApp(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Save for Later
                  </button>
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={handleVerifySubmission}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verify & Track Application</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
