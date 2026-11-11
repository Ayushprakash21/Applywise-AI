// src/components/hr-outreach/HrOutreachModals.tsx
import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Mail,
  Building2,
  MapPin,
  Sparkles,
  FileText,
} from 'lucide-react';
import {
  HrContactWithRelevance,
  OutreachEvent,
  OutreachMessage,
} from '../../types/index.ts';

export function VerificationBadge({ status, isUserSubmitted }: { status: string; isUserSubmitted?: boolean }) {
  const styles: Record<string, string> = {
    'Mailbox Verified': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    Verified: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    'Source Confirmed': 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30',
    'MX Valid': 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    'Domain Valid': 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    'Role-Based': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    Discovered: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-400/30',
    Unverified: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-400/30',
    Stale: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    'Verification Failed': 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    Invalid: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
          styles[status] || styles.Discovered
        }`}
        title={
          status === 'Source Confirmed'
            ? 'Email confirmed in official public job posting or employer careers page + MX/domain checked.'
            : status === 'MX Valid' || status === 'Domain Valid'
            ? 'MX records confirmed domain accepts mail; individual mailbox is not probed via SMTP.'
            : status === 'Role-Based'
            ? 'Departmental recruitment inbox (e.g. careers@ or talent@).'
            : status === 'Mailbox Verified' || status === 'Verified'
            ? 'Deliverability or direct reply confirmed.'
            : undefined
        }
      >
        {status}
      </span>
      {isUserSubmitted && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          Candidate Submitted
        </span>
      )}
    </span>
  );
}

export const ContactDetailDrawer: React.FC<{
  contact: HrContactWithRelevance | null;
  isBlack: boolean;
  onClose: () => void;
  onVerify: (id: string) => Promise<void>;
  onGenerateEmail: (contact: HrContactWithRelevance) => void;
  onSuppress: (email: string) => Promise<void>;
}> = ({ contact, isBlack, onClose, onVerify, onGenerateEmail, onSuppress }) => {
  const [verifying, setVerifying] = useState(false);

  if (!contact) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg h-full overflow-y-auto p-6 shadow-2xl border-l flex flex-col justify-between ${
          isBlack
            ? 'bg-[#12151B] border-white/10 text-[#F2F0EA]'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-current/10 pb-4">
            <div>
              <h3 className="text-lg font-bold">{contact.contactName || contact.designation}</h3>
              <p className={`text-xs mt-0.5 ${isBlack ? 'text-[#92949A]' : 'text-slate-500'}`}>
                {contact.designation} · {contact.roleCategory}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close contact drawer"
              className="p-1.5 rounded-lg hover:bg-slate-500/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`p-4 rounded-xl border space-y-2.5 ${isBlack ? 'bg-[#171B22] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-mono font-semibold break-all">
                <Mail className="w-4 h-4 shrink-0 text-[#C6A66A]" />
                <span>{contact.email}</span>
              </div>
              <VerificationBadge status={contact.emailVerificationStatus} isUserSubmitted={contact.isUserSubmitted} />
            </div>
            {contact.verificationLevels && (
              <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                <span className={`px-1.5 py-0.5 rounded border ${contact.verificationLevels.level1SyntaxValid ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'}`}>
                  L1 Syntax: {contact.verificationLevels.level1SyntaxValid ? 'Valid' : 'Fail'}
                </span>
                <span className={`px-1.5 py-0.5 rounded border ${contact.verificationLevels.level2DomainExists ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'}`}>
                  L2 Domain: {contact.verificationLevels.level2DomainExists ? 'Valid' : 'Fail'}
                </span>
                <span className={`px-1.5 py-0.5 rounded border ${contact.verificationLevels.level3MxAvailable ? 'border-emerald-500/30 text-emerald-400' : 'border-white/15 opacity-70'}`}>
                  L3 MX: {contact.verificationLevels.level3MxAvailable ? 'Available' : 'Unchecked/None'}
                </span>
                <span className={`px-1.5 py-0.5 rounded border ${contact.verificationLevels.level4SourceEvidenceConfirmed ? 'border-emerald-500/30 text-emerald-400' : 'border-white/15 opacity-70'}`}>
                  L4 Public Source: {contact.verificationLevels.level4SourceEvidenceConfirmed ? 'Confirmed' : 'Unconfirmed'}
                </span>
                <span className={`px-1.5 py-0.5 rounded border ${contact.verificationLevels.level5MailboxVerified ? 'border-emerald-500/30 text-emerald-400' : 'border-white/15 opacity-70'}`}>
                  L5 Mailbox: {contact.verificationLevels.level5MailboxVerified ? 'Verified' : 'Not Probed'}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-3 text-xs opacity-80 pt-1">
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {contact.companyName}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {contact.city ? `${contact.city}, ` : ''}{contact.country}
              </span>
            </div>
            {contact.isDoNotContact && (
              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold pt-1">
                <Ban className="w-3.5 h-3.5" /> Listed on your Do-Not-Contact suppression list.
              </div>
            )}
          </div>

          {/* Transparent Relevance Breakdown */}
          {contact.relevance && (
            <div className={`p-4 rounded-xl border space-y-3 ${isBlack ? 'bg-[#171B22] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider opacity-75">Contact Relevance Score</span>
                <span className="text-sm font-bold text-[#C6A66A]">
                  {contact.relevance.overallScore}/100 ({contact.relevance.tier})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Company Match: <strong>{contact.relevance.breakdown.companyRelationship}/35</strong></div>
                <div>Role Alignment: <strong>{contact.relevance.breakdown.jobRelevance}/25</strong></div>
                <div>Department Fit: <strong>{contact.relevance.breakdown.departmentRelevance}/15</strong></div>
                <div>Geography: <strong>{contact.relevance.breakdown.geographicRelevance}/15</strong></div>
                <div>Verification: <strong>{contact.relevance.breakdown.sourceAndVerification}/10</strong></div>
              </div>
              <p className="text-xs opacity-80">{contact.relevance.explanation}</p>
              <p className="text-[11px] opacity-65 italic border-t border-current/10 pt-2">
                {contact.relevance.advisoryNote}
              </p>
            </div>
          )}

          {/* Evidence & Source Provenance */}
          <div className={`p-4 rounded-xl border space-y-3 ${isBlack ? 'bg-[#171B22] border-white/10' : 'bg-white border-slate-200'}`}>
            <span className="text-xs font-bold uppercase tracking-wider opacity-75 block">Public Provenance & Evidence</span>
            <p className="text-xs leading-relaxed opacity-85">
              {contact.evidence || 'No snippet archived.'}
            </p>
            <div className="space-y-1.5 pt-2 border-t border-current/10">
              {(contact.sources && contact.sources.length > 0 ? contact.sources : [{
                id: 'primary',
                sourceName: contact.sourceType,
                sourceUrl: contact.sourceUrl,
                discoveredAt: contact.discoveredAt,
              }]).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="truncate opacity-80">{s.sourceName}</span>
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#C6A66A] hover:underline shrink-0 ml-2"
                  >
                    <span>Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
            <div className="text-[11px] opacity-65 pt-1 flex justify-between">
              <span>Discovered: {new Date(contact.discoveredAt).toLocaleDateString()}</span>
              <span>
                Last Verified: {contact.lastVerifiedAt ? new Date(contact.lastVerifiedAt).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-5 mt-5 border-t border-current/10 flex flex-wrap gap-2">
          <button
            onClick={async () => {
              setVerifying(true);
              try {
                await onVerify(contact.id);
              } finally {
                setVerifying(false);
              }
            }}
            disabled={verifying}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isBlack
                ? 'border-white/15 hover:bg-white/5 text-[#F2F0EA]'
                : 'border-slate-300 hover:bg-slate-50 text-slate-700'
            }`}
          >
            {verifying ? 'Verifying MX...' : 'Re-Verify Email'}
          </button>

          <button
            onClick={() => onSuppress(contact.email)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
          >
            Do Not Contact
          </button>

          <button
            onClick={() => {
              onClose();
              onGenerateEmail(contact);
            }}
            disabled={contact.isDoNotContact || contact.emailVerificationStatus === 'Invalid'}
            className={`ml-auto px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 ${
              isBlack
                ? 'bg-[#C6A66A] hover:bg-[#E2C58A] text-[#08090B]'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Draft AI Email</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const MessageAuditModal: React.FC<{
  message: OutreachMessage | null;
  events: OutreachEvent[];
  isBlack: boolean;
  onClose: () => void;
}> = ({ message, events, isBlack, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl space-y-5 ${
          isBlack ? 'bg-[#12151B] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-start justify-between border-b border-current/10 pb-3">
          <div>
            <h3 className="text-base font-bold">{message.subject}</h3>
            <p className="text-xs opacity-70 mt-0.5">
              To: {message.recipientName ? `${message.recipientName} <${message.recipientEmail}>` : message.recipientEmail} · {message.companyName}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-500/10 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="opacity-60 block">Status</span>
            <span className="font-semibold uppercase">{message.status}</span>
          </div>
          <div>
            <span className="opacity-60 block">Provider</span>
            <span className="font-semibold uppercase">{message.provider || 'Not sent'}</span>
          </div>
          <div>
            <span className="opacity-60 block">Provider Msg ID</span>
            <span className="font-mono text-[11px] break-all">{message.providerMessageId || '—'}</span>
          </div>
          <div>
            <span className="opacity-60 block">Attachment</span>
            <span className="inline-flex items-center gap-1 truncate max-w-full">
              <FileText className="w-3 h-3 shrink-0" />
              {message.resumeFileName || 'None'}
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border text-xs whitespace-pre-wrap leading-relaxed ${isBlack ? 'bg-[#171B22] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
          {message.bodyText}
        </div>

        {message.errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{message.errorMessage}</span>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider opacity-75">Event Audit Trail</h4>
          {events.length === 0 ? (
            <p className="text-xs opacity-60">No recorded events yet.</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    isBlack ? 'bg-[#171B22] border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {ev.eventType === 'provider_accepted' || ev.eventType === 'reply_received' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : ev.eventType === 'failed' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-[#C6A66A]" />
                    )}
                    <span className="font-mono font-semibold">{ev.eventType}</span>
                  </div>
                  <span className="opacity-60 text-[11px]">{new Date(ev.occurredAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CreateCampaignModal: React.FC<{
  open: boolean;
  isBlack: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; targetCountry?: string; targetRoles: string[]; dailyLimit: number; notes?: string }) => Promise<void>;
}> = ({ open, isBlack, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [targetCountry, setTargetCountry] = useState('');
  const [targetRolesRaw, setTargetRolesRaw] = useState('');
  const [dailyLimit, setDailyLimit] = useState(10);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        targetCountry: targetCountry.trim() || undefined,
        targetRoles: targetRolesRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        dailyLimit,
        notes: notes.trim() || undefined,
      });
      setName('');
      setTargetCountry('');
      setTargetRolesRaw('');
      setNotes('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
          isBlack ? 'bg-[#12151B] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">New Outreach Campaign</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-500/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs opacity-75">
          Campaigns organize target HR contacts and roles. Every outbound email still requires your explicit approval.
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold block mb-1">Campaign Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Germany Supply Chain Applications"
              className={`w-full px-3 py-2 rounded-xl border ${
                isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Target Country</label>
              <input
                value={targetCountry}
                onChange={(e) => setTargetCountry(e.target.value)}
                placeholder="e.g. Germany"
                className={`w-full px-3 py-2 rounded-xl border ${
                  isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Daily Safety Cap</label>
              <input
                type="number"
                min={1}
                max={25}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value) || 10)}
                className={`w-full px-3 py-2 rounded-xl border ${
                  isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1">Target Roles (comma separated)</label>
            <input
              value={targetRolesRaw}
              onChange={(e) => setTargetRolesRaw(e.target.value)}
              placeholder="Supply Chain Analyst, Project Manager"
              className={`w-full px-3 py-2 rounded-xl border ${
                isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Strategy or visa relocation context..."
              className={`w-full px-3 py-2 rounded-xl border ${
                isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-current/15 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 ${
              isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
            }`}
          >
            {submitting ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const ManualContactModal: React.FC<{
  open: boolean;
  isBlack: boolean;
  initialCompany?: string;
  initialJobId?: string;
  onClose: () => void;
  onSubmit: (payload: {
    companyName: string;
    companyWebsite?: string;
    contactName?: string;
    designation?: string;
    email: string;
    country?: string;
    jobId?: string;
    sourceUrl?: string;
    evidence?: string;
  }) => Promise<void>;
}> = ({ open, isBlack, initialCompany = '', initialJobId = '', onClose, onSubmit }) => {
  const [companyName, setCompanyName] = useState(initialCompany);
  const [contactName, setContactName] = useState('');
  const [designation, setDesignation] = useState('Talent Acquisition');
  const [email, setEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setCompanyName(initialCompany);
      setErrMsg(null);
    }
  }, [open, initialCompany]);

  if (!open) return null;

  const inputCls = `w-full px-3 py-2 rounded-xl border text-xs ${
    isBlack ? 'bg-[#0C0E12] border-white/15 text-[#F2F0EA]' : 'bg-white border-slate-300 text-slate-900'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!companyName.trim() || !email.trim()) return;
          setSubmitting(true);
          setErrMsg(null);
          try {
            await onSubmit({
              companyName: companyName.trim(),
              companyWebsite: companyWebsite.trim() || undefined,
              contactName: contactName.trim() || undefined,
              designation: designation.trim() || undefined,
              email: email.trim(),
              jobId: initialJobId || undefined,
              sourceUrl: sourceUrl.trim() || undefined,
              evidence: evidence.trim() || undefined,
            });
            onClose();
          } catch (err: any) {
            setErrMsg(err?.message || 'Could not save manual contact.');
          } finally {
            setSubmitting(false);
          }
        }}
        className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${
          isBlack ? 'bg-[#12151B] border-white/10 text-[#F2F0EA]' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Add or Correct Personal HR Contact</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-500/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] opacity-75">
          Candidate-submitted contacts remain private to your account, run syntax &amp; MX checks, and are clearly marked as Candidate Submitted (never falsely labeled Mailbox Verified).
        </p>

        {errMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errMsg}
          </div>
        )}

        <div className="space-y-2.5 text-xs">
          <div>
            <label className="font-semibold block mb-1">Company Name *</label>
            <input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} placeholder="e.g. Stripe" />
          </div>
          <div>
            <label className="font-semibold block mb-1">HR / Recruiter Email *</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="e.g. talent@company.com" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-semibold block mb-1">Contact Name (optional)</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} placeholder="e.g. Priya Sharma" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Designation</label>
              <input value={designation} onChange={(e) => setDesignation(e.target.value)} className={inputCls} placeholder="Talent Acquisition" />
            </div>
          </div>
          <div>
            <label className="font-semibold block mb-1">Source URL / Notes (optional)</label>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={inputCls} placeholder="https://company.com/careers" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Reference Note (optional)</label>
            <input value={evidence} onChange={(e) => setEvidence(e.target.value)} className={inputCls} placeholder="Found on official engineering careers FAQ" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold border border-current/15 cursor-pointer">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !companyName.trim() || !email.trim()}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 ${
              isBlack ? 'bg-[#C6A66A] text-[#08090B]' : 'bg-blue-600 text-white'
            }`}
          >
            {submitting ? 'Validating MX...' : 'Save Contact'}
          </button>
        </div>
      </form>
    </div>
  );
};
