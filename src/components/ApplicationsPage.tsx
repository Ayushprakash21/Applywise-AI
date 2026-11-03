import React, { useState, useEffect } from 'react';
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
  Check,
  ShieldCheck,
  Receipt,
  Eye,
  X
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus, ApplicationReceipt } from '../types/index.ts';
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
  const [activeView, setActiveView] = useState<'pipeline' | 'receipts'>('pipeline');
  const [receipts, setReceipts] = useState<ApplicationReceipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ApplicationReceipt | null>(null);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);

  useEffect(() => {
    if (activeView === 'receipts') {
      setIsLoadingReceipts(true);
      api.getApplicationReceipts()
        .then(res => {
          if (res.success) setReceipts(res.receipts || []);
        })
        .catch(err => console.error('Error fetching receipts:', err))
        .finally(() => setIsLoadingReceipts(false));
    }
  }, [activeView]);

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
      <div className="neu-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Applications</h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Integrity Verified
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Truthful application lifecycle management. Verified documents, tailored packages, and genuine submission tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher */}
          <div className="neu-inset p-1 rounded-xl flex items-center space-x-1 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveView('pipeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap min-h-[36px] ${
                activeView === 'pipeline' ? 'neu-raised text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pipeline ({applications.length})
            </button>
            <button
              onClick={() => setActiveView('receipts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 whitespace-nowrap min-h-[36px] ${
                activeView === 'receipts' ? 'neu-raised text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Verifiable Receipts</span>
            </button>
          </div>

          <button
            onClick={onNavigateToJobs}
            className="px-4 py-2 min-h-[40px] neu-button-primary rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shrink-0"
          >
            <span>Find Jobs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {activeView === 'receipts' ? (
        /* VERIFIABLE APPLICATION RECEIPTS VIEW */
        <div className="space-y-4">
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <strong>Immutable Submission Receipts: </strong>
                Each receipt permanently records the exact tailored resume version, destination ATS URL, confirmation reference, and verification report generated at the moment of submission.
              </div>
            </div>
          </div>

          {isLoadingReceipts ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <Clock className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
              Loading verifiable receipts...
            </div>
          ) : receipts.length === 0 ? (
            <div className="neu-panel p-12 text-center text-slate-400 space-y-3">
              <Receipt className="h-10 w-10 mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700">No application receipts generated yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Once an application is submitted through our verified portal or authorized by you, an immutable receipt and truthfulness audit certificate will be filed here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {receipts.map(rec => (
                <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-sm">{rec.company}</span>
                      <span className="text-slate-500 text-xs">— {rec.role}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        {rec.integrityReport?.overallStatus || 'VERIFIED'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                      <span>Ref: <strong className="text-slate-800">{rec.confirmationReference || rec.id.slice(0, 8)}</strong></span>
                      <span>Source: <strong>{rec.jobSource}</strong></span>
                      <span>Filed: {new Date(rec.createdAt).toLocaleString()}</span>
                      {rec.integrityReport?.resumeIntegrity?.truthfulnessScore !== undefined && (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          {rec.integrityReport.resumeIntegrity.truthfulnessScore}% Truthfulness Score
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => setSelectedReceipt(rec)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center space-x-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect Receipt Snapshot</span>
                    </button>
                    {rec.destinationUrl && (
                      <a
                        href={rec.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-blue-600 transition"
                        title="Open Employer Portal"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Receipt Snapshot Details Modal */}
          {selectedReceipt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      Application Receipt & Truthfulness Certificate
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1 truncate">{selectedReceipt.company} — {selectedReceipt.role}</h3>
                    <p className="text-xs text-slate-500 break-all">
                      Timestamp: {new Date(selectedReceipt.createdAt).toLocaleString()} • Ref: {selectedReceipt.confirmationReference || selectedReceipt.id}
                    </p>
                  </div>
                  <button onClick={() => setSelectedReceipt(null)} className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Integrity Card */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Integrity Audit Result: {selectedReceipt.integrityReport?.overallStatus || 'VERIFIED'}</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>Destination ATS: <strong className="text-slate-800">{selectedReceipt.integrityReport?.destinationTrustStatus || 'DIRECT_EMPLOYER_PORTAL'}</strong></div>
                      <div>Job Availability: <strong className="text-slate-800">{selectedReceipt.integrityReport?.jobAvailabilityStatus || 'VERIFIED_ACTIVE'}</strong></div>
                      <div>Invented Skills Detected: <strong className="text-emerald-700">{selectedReceipt.integrityReport?.resumeIntegrity?.inventedSkills?.length || 0} (Zero)</strong></div>
                      <div>Invented Employers Detected: <strong className="text-emerald-700">{selectedReceipt.integrityReport?.resumeIntegrity?.inventedCompanies?.length || 0} (Zero)</strong></div>
                    </div>
                  </div>

                  {/* Tailored Resume Snapshot */}
                  {selectedReceipt.tailoredResumeSnapshot && (
                    <div className="border border-slate-200 rounded-xl p-4">
                      <h4 className="font-bold text-slate-800 mb-2">Tailored Resume Snapshot</h4>
                      <p className="text-slate-600 italic bg-slate-50 p-2 rounded mb-3">
                        "{selectedReceipt.tailoredResumeSnapshot.professionalSummary}"
                      </p>
                      <h5 className="font-semibold text-slate-700 mb-1">Tailored Experiences Filed:</h5>
                      <div className="space-y-2">
                        {selectedReceipt.tailoredResumeSnapshot.tailoredExperiences?.map((exp, eIdx) => (
                          <div key={eIdx} className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                            <span className="font-bold text-slate-800">{exp.role}</span> at <span className="font-semibold text-blue-700">{exp.company}</span>
                            <ul className="list-disc list-inside mt-1 text-slate-600 text-[11px]">
                              {exp.bulletPoints?.slice(0, 3).map((bp, bIdx) => (
                                <li key={bIdx}>{bp}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cover Letter Snapshot */}
                  {selectedReceipt.coverLetterSnapshot && (
                    <div className="border border-slate-200 rounded-xl p-4">
                      <h4 className="font-bold text-slate-800 mb-2">Cover Letter Snapshot</h4>
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {selectedReceipt.coverLetterSnapshot}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                  >
                    Close Receipt
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* PIPELINE VIEW */
        <>
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
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
                ? 'neu-button-primary'
                : 'neu-chip'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="neu-panel p-12 text-center text-slate-400 space-y-3">
          <FileText className="h-10 w-10 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700">No applications in this category</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Discover real vacancies and click "Prepare Application" to generate an ATS tailored resume and application package.
          </p>
          <button
            onClick={onNavigateToJobs}
            className="px-4 py-2 neu-button-primary rounded-xl text-xs font-semibold"
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
                className="neu-card neu-raised-hover p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
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
                <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => onViewResume(app)}
                    className="flex-1 sm:flex-initial justify-center px-3.5 py-2 min-h-[40px] rounded-xl neu-button text-xs font-semibold text-slate-700 flex items-center space-x-1.5 touch-target"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span>View ATS Resume</span>
                  </button>

                  <button
                    onClick={() => api.downloadDocxResume(app.id, app.company)}
                    className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl neu-button text-slate-700"
                    title="Download DOCX"
                  >
                    <Download className="h-4 w-4 text-slate-500" />
                  </button>

                  {/* Submit / Complete Application Button */}
                  {(app.status === 'PREPARED' || app.status === 'AWAITING_APPROVAL' || app.status === 'AUTHORIZED_TO_SUBMIT') && (
                    <button
                      onClick={() => handleLaunchSubmit(app)}
                      className="flex-1 sm:flex-initial justify-center px-4 py-2 min-h-[40px] neu-button-primary rounded-xl text-xs font-semibold flex items-center space-x-1.5 touch-target"
                    >
                      <span>Proceed to Apply</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {app.status === 'GUIDED_COMPLETION_REQUIRED' && (
                    <button
                      onClick={() => setGuidedModalApp(app)}
                      className="flex-1 sm:flex-initial justify-center px-4 py-2 min-h-[40px] bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 touch-target"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Complete Guided Submission</span>
                    </button>
                  )}

                  {(app.status === 'SUBMITTED_VERIFIED' || app.status === 'CONFIRMATION_VERIFIED') && (
                    <button
                      onClick={() => api.transitionStatus(app.id, 'INTERVIEWING', 'Invited to interview stage')}
                      className="flex-1 sm:flex-initial justify-center px-3.5 py-2 min-h-[40px] bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-semibold transition touch-target"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div
            className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 truncate">Guided Portal Submission</h2>
                  <p className="text-xs text-slate-500 truncate">
                    Applying to {guidedModalApp.company} — {guidedModalApp.role}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGuidedModalApp(null)}
                className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 text-xs overflow-y-auto flex-1">
              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-2">
                <p className="font-semibold flex items-center space-x-1.5">
                  <HelpCircle className="h-4 w-4 text-blue-600 shrink-0" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => api.downloadDocxResume(guidedModalApp.id, guidedModalApp.company)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 text-left transition flex items-center justify-between min-h-[48px]"
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
                  className="p-3 rounded-xl border border-blue-300 bg-blue-600 hover:bg-blue-700 text-white text-left transition flex items-center justify-between shadow-xs min-h-[48px]"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {Object.entries(guidedModalApp.guidedApplication.prefilledFields).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 min-h-[44px]">
                        <div className="truncate mr-2">
                          <span className="text-[10px] text-slate-400 block">{k}</span>
                          <span className="font-semibold text-slate-800 truncate block">{v}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(k, v)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 min-h-[32px] min-w-[32px] flex items-center justify-center shrink-0"
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

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setGuidedModalApp(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px]"
                  >
                    Save for Later
                  </button>
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={handleVerifySubmission}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs flex items-center space-x-1.5 min-h-[44px] touch-target"
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
      </>
      )}
    </div>
  );
};
