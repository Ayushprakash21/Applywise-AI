import React from 'react';
import { Shield, FileText, Sliders, AlertTriangle, X, CheckCircle2, Upload, Trash2, Camera, User } from 'lucide-react';
import { AuthUser } from '../services/api.ts';
import { getUserInitials } from './ProfileIdentityComponent.tsx';
import { ProfilePhotoCropModal } from './ProfilePhotoCropModal.tsx';
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
            ApplyVise AI Privacy & Data Protection Commitment
          </p>

          <p>
            At ApplyVise AI, we believe your professional history, resume, and job applications are strictly your private property.
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
            ApplyVise AI Terms of Service
          </p>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">1. Truthful Candidate Representation</h3>
            <p>
              ApplyVise AI enforces zero-hallucination document optimization. By using this service, you certify that all master profile details provided represent your truthful employment and educational history.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">2. Free Public Platform</h3>
            <p>
              ApplyVise AI provides core job search, match calculation, and resume optimization free of charge. We do not enforce payment gates or hidden subscription fees for standard application preparation.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">3. Application Submissions & Verification</h3>
            <p>
              ApplyVise AI does not fabricate confirmation codes or misrepresent employer submission status. Automated portal interaction is subject to employer terms of service and access controls. You are responsible for reviewing and verifying all final submissions.
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
  user?: AuthUser | null;
  onUpdateUserPhoto?: (photoUrl: string | null) => Promise<void> | void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onToggleEmergencyStop,
  user,
  onUpdateUserPhoto,
}) => {
  const [localSettings, setLocalSettings] = React.useState<AutomationSettings | null>(settings);
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [currentPhoto, setCurrentPhoto] = React.useState<string | null>(() => {
    if (user?.photoUrl) return user.photoUrl;
    if (typeof localStorage !== 'undefined' && user?.id) {
      return localStorage.getItem(`applyvise_user_photo_${user.id}`);
    }
    return null;
  });

  React.useEffect(() => {
    if (user?.photoUrl) {
      setCurrentPhoto(user.photoUrl);
    } else if (typeof localStorage !== 'undefined' && user?.id) {
      const stored = localStorage.getItem(`applyvise_user_photo_${user.id}`);
      setCurrentPhoto(stored);
    }
  }, [user?.photoUrl, user?.id]);

  const [selectedFileForCrop, setSelectedFileForCrop] = React.useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = React.useState<boolean>(false);

  const initials = getUserInitials(user?.fullName, user?.email);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setSelectedFileForCrop(file);
    setCropModalOpen(true);
  };

  const handleSaveCropped = async (croppedDataUrl: string) => {
    setCurrentPhoto(croppedDataUrl);
    if (user?.id && typeof localStorage !== 'undefined') {
      localStorage.setItem(`applyvise_user_photo_${user.id}`, croppedDataUrl);
    }
    if (onUpdateUserPhoto) {
      await onUpdateUserPhoto(croppedDataUrl);
    }
    setCropModalOpen(false);
    setSelectedFileForCrop(null);
  };

  const handleRemovePhoto = () => {
    setCurrentPhoto(null);
    if (user?.id && typeof localStorage !== 'undefined') {
      localStorage.removeItem(`applyvise_user_photo_${user.id}`);
    }
    if (onUpdateUserPhoto) {
      onUpdateUserPhoto(null);
    }
  };

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
          {/* Profile Photograph & Avatar Management */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#14171C] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-[#F2F0EA] block text-xs">
                Account Identity & Photograph
              </span>
              <span className="text-[10px] text-slate-500 dark:text-[#92949A]">
                {currentPhoto ? 'Custom Photograph Active' : 'Monogram Initials Active'}
              </span>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-full border border-slate-200 dark:border-[rgba(198,166,106,0.35)] bg-slate-100 dark:bg-[#111318] flex items-center justify-center font-bold text-sm text-slate-700 dark:text-[#C6A66A] overflow-hidden shrink-0 shadow-xs">
                {currentPhoto ? (
                  <img src={currentPhoto} alt="Profile" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="tracking-tight select-none">{initials}</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white dark:bg-[#C6A66A] dark:hover:bg-[#D9BB80] dark:text-[#17130C] transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{currentPhoto ? 'Change Photo' : 'Upload Photo'}</span>
                </button>

                {currentPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#92949A] leading-relaxed">
              Upload a personal photo for your executive account identity. If no photo is uploaded, your initials monogram ({initials}) is displayed.
            </p>
          </div>
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
            <p className="text-[10px] text-slate-400">ApplyVise AI will never prepare or submit applications to these employers.</p>
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
              I authorize ApplyVise AI to generate ATS-tailored materials strictly from my verified profile and submit applications to employers matching my criteria. Legal declarations, salary commitments, and sensitive disclosures will always pause for manual review.
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
      <ProfilePhotoCropModal
        isOpen={cropModalOpen}
        imageFile={selectedFileForCrop}
        onClose={() => {
          setCropModalOpen(false);
          setSelectedFileForCrop(null);
        }}
        onSaveCroppedImage={handleSaveCropped}
      />
    </div>
  );
};
