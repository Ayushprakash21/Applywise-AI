// src/components/hr-outreach/HrOutreachStudio.tsx
import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Paperclip,
  Eye,
  Send,
  Save,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Trash2,
  Lock,
  X,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import {
  EmailAccountSummary,
  HrContactWithRelevance,
  JobVacancy,
  OutreachCampaign,
  OutreachEmailTone,
  OutreachTemplateType,
  ResumeAttachmentOption,
} from '../../types/index.ts';
import { OUTREACH_TEMPLATES, OUTREACH_TONES } from '../../utils/hrEmailGenerator.ts';
import { VerificationBadge } from './HrOutreachModals.tsx';
import { SearchableSelect } from '../ui/SelectSystem.tsx';

export interface HrOutreachStudioProps {
  isBlack: boolean;
  contacts: HrContactWithRelevance[];
  jobs: JobVacancy[];
  emailAccounts: EmailAccountSummary[];
  resumes: ResumeAttachmentOption[];
  campaigns: OutreachCampaign[];
  canSendOutreach: boolean;
  oauthConfigured: { gmail: boolean; outlook: boolean };
  selectedContactId: string;
  selectedJobId: string;
  onSelectContactId: (id: string) => void;
  onSelectJobId: (id: string) => void;
  onOpenPricing: () => void;
  onGoToAccounts: () => void;
  onMessageSavedOrSent: () => Promise<void>;
  onShowToast: (msg: string) => void;
  prefilledSubject?: string;
  prefilledBody?: string;
}

export const HrOutreachStudio: React.FC<HrOutreachStudioProps> = ({
  isBlack,
  contacts,
  jobs,
  emailAccounts,
  resumes,
  campaigns,
  canSendOutreach,
  oauthConfigured,
  selectedContactId,
  selectedJobId,
  onSelectContactId,
  onSelectJobId,
  onOpenPricing,
  onGoToAccounts,
  onMessageSavedOrSent,
  onShowToast,
  prefilledSubject,
  prefilledBody,
}) => {
  const [templateType, setTemplateType] = useState<OutreachTemplateType>('Direct Job Application');
  const [tone, setTone] = useState<OutreachEmailTone>('Professional');
  const [customNotes, setCustomNotes] = useState('');
  const [subject, setSubject] = useState(prefilledSubject || '');
  const [bodyText, setBodyText] = useState(prefilledBody || '');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [resumeConfirmed, setResumeConfirmed] = useState(false);
  const [explicitApproval, setExplicitApproval] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [auditInfo, setAuditInfo] = useState<{
    usedGemini?: boolean;
    groundedQualifications: string[];
    missingDataNotices: string[];
    warnings: string[];
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Secure Resume Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const connectedAccounts = emailAccounts.filter((a) => a.status === 'connected');
  const selectedContact = contacts.find((c) => c.id === selectedContactId) || null;
  const selectedResume = resumes.find((r) => r.id === selectedResumeId) || null;

  useEffect(() => {
    if (prefilledSubject) setSubject(prefilledSubject);
    if (prefilledBody) setBodyText(prefilledBody);
  }, [prefilledSubject, prefilledBody]);

  useEffect(() => {
    if (!selectedAccountId && connectedAccounts.length > 0) {
      setSelectedAccountId(connectedAccounts[0].id);
    }
  }, [connectedAccounts, selectedAccountId]);

  useEffect(() => {
    if (!selectedResumeId && resumes.length > 0) {
      const def = resumes.find((r) => r.isDefault) || resumes[0];
      setSelectedResumeId(def.id);
      setResumeConfirmed(false);
    }
  }, [resumes, selectedResumeId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleGenerate = async () => {
    if (!selectedContactId) {
      onShowToast('Select an HR contact first.');
      return;
    }
    setSendError(null);
    setGenerating(true);
    try {
      const res = await api.generateHrEmail(selectedContactId, {
        jobId: selectedJobId || undefined,
        templateType,
        tone,
        customNotes: customNotes.trim() || undefined,
      });
      setSubject(res.generated.subject);
      setBodyText(res.generated.bodyText);
      setAuditInfo({
        usedGemini: res.generated.usedGemini,
        groundedQualifications: res.generated.groundedQualifications,
        missingDataNotices: res.generated.missingDataNotices,
        warnings: res.generated.integrityAudit.warnings,
      });
      setExplicitApproval(false);
      onShowToast('Personalized email generated from your verified profile.');
    } catch (err: any) {
      setSendError(err.message || 'Failed to generate AI email.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewAttachment = async () => {
    if (!selectedResumeId) return;
    setPreviewLoading(true);
    try {
      const { url } = await api.fetchHrOutreachResumePreviewBlobUrl(selectedResumeId);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setPreviewTitle(selectedResume?.fileName || 'Resume Preview');
    } catch (err: any) {
      onShowToast(err.message || 'Could not load attachment preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedContactId || !subject.trim() || !bodyText.trim()) {
      setSendError('Select a contact and provide subject and email body.');
      return;
    }
    setSaving(true);
    setSendError(null);
    try {
      const res = await api.previewOutreachMessage({
        contactId: selectedContactId,
        campaignId: selectedCampaignId || undefined,
        emailAccountId: selectedAccountId || undefined,
        jobId: selectedJobId || undefined,
        templateType,
        tone,
        subject,
        bodyText,
        resumeDocumentId: selectedResumeId || undefined,
        saveDraft: true,
        draftId,
      });
      if (res.message) setDraftId(res.message.id);
      await onMessageSavedOrSent();
      onShowToast('Outreach email draft saved.');
    } catch (err: any) {
      setSendError(err.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    setSendError(null);
    if (!explicitApproval) {
      setSendError('Explicit approval is required before sending.');
      return;
    }
    if (!selectedAccountId) {
      setSendError('Connect and select a Gmail or Outlook sending account first.');
      return;
    }
    if (selectedResumeId && !resumeConfirmed) {
      setSendError('Please confirm your selected resume attachment before sending.');
      return;
    }

    setSending(true);
    try {
      const res = await api.sendApprovedOutreachMessage({
        contactId: selectedContactId,
        campaignId: selectedCampaignId || undefined,
        emailAccountId: selectedAccountId,
        jobId: selectedJobId || undefined,
        templateType,
        tone,
        subject,
        bodyText,
        resumeDocumentId: selectedResumeId || undefined,
        resumeConfirmed: selectedResumeId ? resumeConfirmed : true,
        explicitApproval: true,
        draftId,
      });
      await onMessageSavedOrSent();
      setExplicitApproval(false);
      setDraftId(undefined);
      onShowToast(res.notice || 'Email accepted by your mail provider!');
    } catch (err: any) {
      setSendError(err.message || 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  if (!canSendOutreach) {
    return (
      <div className={`p-8 rounded-2xl border text-center space-y-4 ${isBlack ? 'bg-[#13161B] border-white/10' : 'bg-white border-slate-200'}`}>
        <Lock className="w-10 h-10 mx-auto text-[#C6A66A]" />
        <h3 className="text-lg font-bold">AI Email Studio & Direct Apply Requires Pro or BLACK ELITE</h3>
        <p className="text-xs opacity-75 max-w-lg mx-auto">
          Upgrade your plan to generate zero-hallucination outreach emails with Gemini, attach verified resumes, connect Gmail or Outlook via OAuth, and track recruiter replies.
        </p>
        <button
          onClick={onOpenPricing}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
            isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
          }`}
        >
          View Plans & Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Steps 1-3 & Attachment + Account */}
      <div className="lg:col-span-5 space-y-4">
        {/* Recipient & Job */}
        <div className={`p-5 rounded-2xl border space-y-3 ${isBlack ? 'bg-[#13161B] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">1. Recipient & Opportunity</h3>
            {selectedContact && <VerificationBadge status={selectedContact.emailVerificationStatus} />}
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="font-semibold block mb-1">Target HR Contact *</label>
              <SearchableSelect
                ariaLabel="Target HR Contact"
                value={selectedContactId}
                placeholder="-- Choose an HR Contact --"
                onChange={(val) => {
                  onSelectContactId(val);
                  setDraftId(undefined);
                }}
                options={[
                  { value: '', label: '-- Choose an HR Contact --' },
                  ...contacts.map((c) => ({
                    value: c.id,
                    label: `${c.companyName} — ${c.contactName || c.designation} (${c.email})`,
                    badge: c.emailVerificationStatus,
                    disabled: Boolean(c.isDoNotContact || c.emailVerificationStatus === 'Invalid'),
                  })),
                ]}
                theme={isBlack ? 'black-elite' : 'light'}
                size="sm"
              />
            </div>

            {selectedContact && (
              <div className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${isBlack ? 'bg-[#0C0E12] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <strong>Role:</strong> {selectedContact.designation} ({selectedContact.country})
                </div>
                <div className="truncate opacity-80">
                  <strong>Source:</strong> {selectedContact.sourceUrl}
                </div>
              </div>
            )}

            <div>
              <label className="font-semibold block mb-1">Associated Job Opportunity (Optional)</label>
              <SearchableSelect
                ariaLabel="Associated Job Opportunity"
                value={selectedJobId}
                placeholder="-- General / Company Talent Outreach --"
                onChange={(val) => onSelectJobId(val)}
                options={[
                  { value: '', label: '-- General / Company Talent Outreach --' },
                  ...jobs.slice(0, 60).map((j) => ({
                    value: j.id,
                    label: `${j.company} — ${j.title} (${j.country || j.location})`,
                  })),
                ]}
                theme={isBlack ? 'black-elite' : 'light'}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold block mb-1">Template</label>
                <SearchableSelect
                  ariaLabel="Email Template"
                  value={templateType}
                  onChange={(val) => setTemplateType(val as OutreachTemplateType)}
                  searchable={false}
                  options={OUTREACH_TEMPLATES.map((t) => ({ value: t, label: t }))}
                  theme={isBlack ? 'black-elite' : 'light'}
                  size="sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Tone</label>
                <SearchableSelect
                  ariaLabel="Email Tone"
                  value={tone}
                  onChange={(val) => setTone(val as OutreachEmailTone)}
                  searchable={false}
                  options={OUTREACH_TONES.map((t) => ({ value: t, label: t }))}
                  theme={isBlack ? 'black-elite' : 'light'}
                  size="sm"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Optional Focus Instructions</label>
              <input
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Emphasize ERP rollout and EU availability"
                className={`w-full px-3 py-2 rounded-xl border ${
                  isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !selectedContactId}
              className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-45 ${
                isBlack ? 'bg-[#C6A66A] hover:bg-[#E2C58A] text-[#08090B]' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{generating ? 'Drafting with Verified Profile...' : 'Generate Personalized Email'}</span>
            </button>
          </div>
        </div>

        {/* Step 2: Resume Attachment Engine */}
        <div className={`p-5 rounded-2xl border space-y-3 text-xs ${isBlack ? 'bg-[#13161B] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-[#C6A66A]" />
              <span>2. Resume Attachment</span>
            </h3>
            {selectedResumeId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedResumeId('');
                  setResumeConfirmed(false);
                }}
                className="text-rose-500 hover:underline inline-flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            )}
          </div>

          {resumes.length === 0 ? (
            <p className="opacity-70">No uploaded or tailored resumes found. Upload a resume in Career Profile / Onboarding first.</p>
          ) : (
            <>
              <SearchableSelect
                ariaLabel="Resume Attachment"
                value={selectedResumeId}
                placeholder="-- No Attachment --"
                onChange={(val) => {
                  setSelectedResumeId(val);
                  setResumeConfirmed(false);
                }}
                options={[
                  { value: '', label: '-- No Attachment --' },
                  ...resumes.map((r) => ({
                    value: r.id,
                    label: `${r.fileName} (${Math.max(1, Math.round(r.fileSizeBytes / 1024))} KB)${
                      r.sourceType === 'tailored_application' ? ` — Tailored (${r.company})` : ' — Master Resume'
                    }`,
                  })),
                ]}
                theme={isBlack ? 'black-elite' : 'light'}
                size="sm"
              />

              {selectedResume && (
                <div className={`p-3 rounded-xl border space-y-2 ${isBlack ? 'bg-[#0C0E12] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{selectedResume.fileName}</p>
                      <p className="opacity-65 text-[11px]">
                        {selectedResume.mimeType === 'application/pdf' ? 'PDF Document' : 'DOCX Document'} ·{' '}
                        {Math.max(1, Math.round(selectedResume.fileSizeBytes / 1024))} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handlePreviewAttachment}
                      disabled={previewLoading}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer ${
                        isBlack ? 'border-white/15 hover:bg-white/5' : 'border-slate-300 bg-white hover:bg-slate-100'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{previewLoading ? 'Loading...' : 'Preview'}</span>
                    </button>
                  </div>

                  <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={resumeConfirmed}
                      onChange={(e) => setResumeConfirmed(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-[11px] font-medium">
                      Confirm attaching <strong>{selectedResume.fileName}</strong> to this email.
                    </span>
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        {/* Step 3: Sending Account & Campaign */}
        <div className={`p-5 rounded-2xl border space-y-3 text-xs ${isBlack ? 'bg-[#13161B] border-white/10' : 'bg-white border-slate-200'}`}>
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-[#C6A66A]" />
            <span>3. Sending Account & Campaign</span>
          </h3>

          {connectedAccounts.length === 0 ? (
            <div className={`p-3 rounded-xl border space-y-2 ${isBlack ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <p className="font-semibold">No Gmail or Outlook account connected.</p>
              <p className="text-[11px] opacity-85">
                {oauthConfigured.gmail || oauthConfigured.outlook
                  ? 'Connect your mailbox via OAuth 2.0 before sending.'
                  : 'Server OAuth credentials are not configured yet. You can draft and save emails, and connect your account once OAuth is enabled.'}
              </p>
              <button
                type="button"
                onClick={onGoToAccounts}
                className="underline font-bold cursor-pointer"
              >
                Manage Email Accounts →
              </button>
            </div>
          ) : (
            <SearchableSelect
              ariaLabel="Sending Email Account"
              value={selectedAccountId}
              onChange={(val) => setSelectedAccountId(val)}
              searchable={false}
              options={connectedAccounts.map((acc) => ({
                value: acc.id,
                label: `${acc.provider.toUpperCase()} — ${acc.email}`,
              }))}
              theme={isBlack ? 'black-elite' : 'light'}
              size="sm"
            />
          )}

          {campaigns.length > 0 && (
            <div>
              <label className="font-semibold block mb-1">Link to Campaign (Optional)</label>
              <SearchableSelect
                ariaLabel="Campaign"
                value={selectedCampaignId}
                placeholder="-- Individual Outreach --"
                onChange={(val) => setSelectedCampaignId(val)}
                options={[
                  { value: '', label: '-- Individual Outreach --' },
                  ...campaigns.map((c) => ({ value: c.id, label: c.name })),
                ]}
                theme={isBlack ? 'black-elite' : 'light'}
                size="sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Editable Email Composer & Explicit Send Approval */}
      <div className="lg:col-span-7 space-y-4">
        <div className={`p-6 rounded-2xl border space-y-4 ${isBlack ? 'bg-[#13161B] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold">Email Composer & Review</h3>
              <p className="text-xs opacity-70">
                Review and edit every word before approving transmission. Zero auto-sending.
              </p>
            </div>
            {auditInfo && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  auditInfo.warnings.length === 0
                    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{auditInfo.usedGemini ? 'Gemini Grounded' : 'Factual Draft Verified'}</span>
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">Subject Line *</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Application: Supply Chain Analyst — Candidate Name"
                className={`w-full px-3.5 py-2.5 rounded-xl border font-medium ${
                  isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Email Body *</label>
              <textarea
                rows={13}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Select an HR contact on the left and click 'Generate Personalized Email', or compose directly..."
                className={`w-full px-3.5 py-3 rounded-xl border leading-relaxed font-sans ${
                  isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Grounding Audit & Missing Info Notices */}
          {auditInfo && (auditInfo.groundedQualifications.length > 0 || auditInfo.missingDataNotices.length > 0 || auditInfo.warnings.length > 0) && (
            <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${isBlack ? 'bg-[#0C0E12] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              {auditInfo.groundedQualifications.length > 0 && (
                <div>
                  <span className="font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Facts Included:
                  </span>
                  <ul className="list-disc pl-5 mt-1 opacity-80 space-y-0.5">
                    {auditInfo.groundedQualifications.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {[...auditInfo.missingDataNotices, ...auditInfo.warnings].length > 0 && (
                <div className="text-amber-500">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Profile / Claim Notices:
                  </span>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    {[...auditInfo.missingDataNotices, ...auditInfo.warnings].map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {sendError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{sendError}</span>
            </div>
          )}

          {/* Explicit Approval Bar */}
          <div className={`p-4 rounded-xl border space-y-3 ${isBlack ? 'bg-[#171B22] border-[#C6A66A]/30' : 'bg-blue-50/70 border-blue-200'}`}>
            <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={explicitApproval}
                onChange={(e) => setExplicitApproval(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <strong>Explicit Sending Approval:</strong> I confirm that I have reviewed the recipient email, personalized message body, and attachment, and authorize sending from my connected mailbox.
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving || !selectedContactId || !subject.trim() || !bodyText.trim()}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer disabled:opacity-45 ${
                  isBlack
                    ? 'border-white/15 hover:bg-white/5 text-[#F2F0EA]'
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Draft'}</span>
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={
                  sending ||
                  !explicitApproval ||
                  !selectedContactId ||
                  !selectedAccountId ||
                  !subject.trim() ||
                  !bodyText.trim() ||
                  (Boolean(selectedResumeId) && !resumeConfirmed)
                }
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 ${
                  isBlack
                    ? 'bg-[#C6A66A] hover:bg-[#E2C58A] text-[#08090B]'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Submitting to Provider...' : 'Approve & Send Email'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Secure Authenticated Resume Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" onClick={() => setPreviewUrl(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl h-[85vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl ${
              isBlack ? 'bg-[#12151B] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-5 py-3 border-b border-current/10 flex items-center justify-between">
              <span className="text-sm font-bold">{previewTitle}</span>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-1.5 rounded-lg hover:bg-slate-500/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-900/10">
              <iframe title="Resume Attachment Preview" src={previewUrl} className="w-full h-full border-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
