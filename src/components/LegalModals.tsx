import React from 'react';
import { Shield, FileText, Sliders, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { AutomationSettings } from '../types/index.ts';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Privacy Policy</h2>
          </div>
          <button onClick={onClose} className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg">✕</button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed flex-1">
          <p className="font-semibold text-slate-800 text-sm">
            ApplyWise AI Privacy & Data Protection Commitment
          </p>

          <p>
            At ApplyWise AI, we believe your professional history, resume, and job applications are strictly your private property.
          </p>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">1. No Selling of Personal Information</h3>
            <p>
              We never sell, rent, or monetize your resume text, email address, application history, or demographic data to third-party recruiters, advertisers, or data brokers.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">2. Processing of Uploaded Documents</h3>
            <p>
              Uploaded resumes (PDF and DOCX) are inspected strictly in memory to extract your verified career profile and compute job matching scores. Extracted records are stored with explicit per-user ownership and isolated from all other registered users.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">3. Authentication & Security</h3>
            <p>
              Passwords are salted and cryptographically hashed using bcrypt. Authentication sessions use secure tokens with configurable expiration. All server-side requests enforce strict multi-user access controls.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">4. User-Controlled Deletion</h3>
            <p>
              You maintain total control over your profile and applications. You may update or delete your profile information at any time.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold touch-target">
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};

interface TermsOfUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfUseModal: React.FC<TermsOfUseModalProps> = ({ isOpen, onClose }) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Terms of Use</h2>
          </div>
          <button onClick={onClose} className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg">✕</button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed flex-1">
          <p className="font-semibold text-slate-800 text-sm">
            ApplyWise AI Terms of Service
          </p>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">1. Truthful Candidate Representation</h3>
            <p>
              ApplyWise AI enforces zero-hallucination document optimization. By using this service, you certify that all master profile details provided represent your truthful employment and educational history.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">2. Free Public Platform</h3>
            <p>
              ApplyWise AI provides core job search, match calculation, and resume optimization free of charge. We do not enforce payment gates or hidden subscription fees for standard application preparation.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">3. Application Submissions & Verification</h3>
            <p>
              ApplyWise AI does not fabricate confirmation codes or misrepresent employer submission status. Automated portal interaction is subject to employer terms of service and access controls. You are responsible for reviewing and verifying all final submissions.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">4. Acceptable Use</h3>
            <p>
              Users agree not to bypass rate limits, probe unauthenticated endpoints, or transmit malicious code through uploaded files or job descriptions.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold touch-target">
            Accept & Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AutomationSettings | null;
  onSaveSettings: (settings: Partial<AutomationSettings>) => Promise<void>;
  onToggleEmergencyStop: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onToggleEmergencyStop,
}) => {
  const [localSettings, setLocalSettings] = React.useState<AutomationSettings | null>(settings);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  if (!isOpen || !localSettings) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSaveSettings(localSettings);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center space-x-2">
            <Sliders className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Automation & Account Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg">✕</button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
          {/* Operating Mode */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block">Operating Mode</label>
            <div className="space-y-2">
              {[
                { id: 'MODE_A_RESEARCH', title: 'Mode A: Research & Discovery Only', desc: 'Discovers and ranks relevant vacancies without preparing applications.' },
                { id: 'MODE_B_PREPARE_APPROVE', title: 'Mode B: Prepare & Approve (Recommended)', desc: 'Generates tailored ATS resumes and packages, requiring 1-click human verification before submission.' },
                { id: 'MODE_C_AUTONOMOUS', title: 'Mode C: Pre-Authorized Auto-Apply', desc: 'Prepares and submits eligible applications within explicitly approved rules and thresholds.' },
              ].map(m => (
                <label
                  key={m.id}
                  className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${
                    localSettings.mode === m.id
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="operatingMode"
                    value={m.id}
                    checked={localSettings.mode === m.id}
                    onChange={() => setLocalSettings({ ...localSettings, mode: m.id as any })}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">{m.title}</span>
                    <span className="text-slate-500 text-[11px] leading-relaxed block mt-0.5">{m.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Daily & Weekly Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Daily Limit (Max 25)</label>
              <input
                type="number"
                min={1}
                max={25}
                value={localSettings.dailyApplicationLimit || 5}
                onChange={e => setLocalSettings({ ...localSettings, dailyApplicationLimit: parseInt(e.target.value, 10) || 5 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-blue-500 min-h-[40px]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Weekly Limit (Max 100)</label>
              <input
                type="number"
                min={5}
                max={100}
                value={localSettings.weeklyApplicationLimit || 25}
                onChange={e => setLocalSettings({ ...localSettings, weeklyApplicationLimit: parseInt(e.target.value, 10) || 25 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-blue-500 min-h-[40px]"
              />
            </div>
          </div>

          {/* Excluded Companies */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-800 block">Excluded Companies</label>
            <input
              type="text"
              placeholder="e.g. Current Employer, Competitor Inc (comma separated)"
              value={(localSettings.excludedCompanies || []).join(', ')}
              onChange={e => {
                const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                setLocalSettings({ ...localSettings, excludedCompanies: arr });
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-blue-500 min-h-[40px]"
            />
            <p className="text-[10px] text-slate-400">ApplyWise AI will never prepare or submit applications to these employers.</p>
          </div>

          {/* Auto-Apply Explicit Consent Gate */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!localSettings.autoApplyConsentConfirmed}
                onChange={e => setLocalSettings({
                  ...localSettings,
                  autoApplyConsentConfirmed: e.target.checked,
                  autoApplyConsentDate: e.target.checked ? new Date().toISOString() : undefined,
                })}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-900">
                Acknowledge Auto-Apply Consent & Data Usage
              </span>
            </label>
            <p className="text-[11px] text-slate-600 leading-relaxed pl-6">
              I authorize ApplyWise AI to generate ATS-tailored materials strictly from my verified profile and submit applications to employers matching my criteria. Legal declarations, salary commitments, and sensitive disclosures will always pause for manual review.
            </p>
          </div>

          {/* Emergency Safety Halt */}
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-red-800 font-bold">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>Emergency Safety Stop</span>
              </div>
              <button
                type="button"
                onClick={onToggleEmergencyStop}
                className={`px-3 py-2 rounded-lg text-xs font-semibold shadow-xs transition min-h-[38px] ${
                  localSettings.emergencyStop
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {localSettings.emergencyStop ? 'Clear Emergency Stop' : 'Engage Emergency Stop'}
              </button>
            </div>
            <p className="text-[11px] text-red-700">
              Immediately freezes all scheduled jobs, automated inquiries, and submission queues across your account.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 min-h-[40px] text-slate-600 hover:bg-slate-100 rounded-xl">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs touch-target"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
