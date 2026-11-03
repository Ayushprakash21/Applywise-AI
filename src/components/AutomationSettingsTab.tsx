import React, { useState } from 'react';
import {
  Sliders,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Save,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { AutomationSettings, OperatingMode, ScoringWeights } from '../types/index.ts';
import { DEFAULT_SCORING_WEIGHTS } from '../utils/rules.ts';

interface AutomationSettingsTabProps {
  settings: AutomationSettings | null;
  onUpdateSettings: (updated: Partial<AutomationSettings>) => Promise<void>;
  onToggleEmergencyStop: () => void;
  onTriggerScheduler: () => void;
}

export const AutomationSettingsTab: React.FC<AutomationSettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onToggleEmergencyStop,
  onTriggerScheduler,
}) => {
  const [formData, setFormData] = useState<AutomationSettings | null>(settings);
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  if (!formData || !settings) {
    return <div className="p-8 text-center text-slate-400">Loading settings...</div>;
  }

  const handleSave = async () => {
    await onUpdateSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleWeightChange = (key: keyof ScoringWeights, val: number) => {
    setFormData({
      ...formData,
      scoringWeights: {
        ...formData.scoringWeights,
        [key]: val,
      },
    });
  };

  const resetWeights = () => {
    setFormData({
      ...formData,
      scoringWeights: DEFAULT_SCORING_WEIGHTS,
    });
  };

  const weightsSum =
    formData.scoringWeights.skillsWeight +
    formData.scoringWeights.experienceWeight +
    formData.scoringWeights.qualificationsWeight +
    formData.scoringWeights.seniorityWeight +
    formData.scoringWeights.locationWeight +
    formData.scoringWeights.salaryWeight;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Automation Controls & Guardrails</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure agent operating mode, autonomous submission thresholds, and scoring model weights.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition"
        >
          <Save className="h-4 w-4" />
          <span>{isSaved ? 'Settings Saved' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Emergency Stop Card */}
      <div
        className={`rounded-2xl border p-5 transition ${
          formData.emergencyStop
            ? 'border-red-600 bg-red-950/40 text-red-100 shadow-xl shadow-red-950/50'
            : 'border-slate-800 bg-slate-900/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <ShieldAlert className={`h-5 w-5 ${formData.emergencyStop ? 'text-red-400' : 'text-slate-400'}`} />
              <h3 className="text-base font-bold text-white">Emergency Stop Master Kill-Switch</h3>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Instantly terminates all background job submissions and freezes all agent interactions. Overrides all modes.
            </p>
          </div>

          <button
            onClick={onToggleEmergencyStop}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition shadow-lg ${
              formData.emergencyStop
                ? 'bg-red-600 text-white hover:bg-red-500 animate-pulse'
                : 'bg-red-950/60 text-red-300 border border-red-800/80 hover:bg-red-900'
            }`}
          >
            {formData.emergencyStop ? 'Disengage Emergency Stop' : 'Engage Emergency Stop'}
          </button>
        </div>
      </div>

      {/* Operating Modes Selection */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white">Operating Mode Selection</h3>
          <p className="text-xs text-slate-500">Choose the level of assistance granted to ApplyVise AI</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mode A */}
          <div
            onClick={() => setFormData({ ...formData, mode: 'MODE_A_RESEARCH' })}
            className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
              formData.mode === 'MODE_A_RESEARCH'
                ? 'border-amber-500 bg-amber-950/30 text-white shadow-md'
                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-amber-400">Mode A</span>
              {formData.mode === 'MODE_A_RESEARCH' && <CheckCircle2 className="h-4 w-4 text-amber-400" />}
            </div>
            <h4 className="font-semibold text-sm text-white">Research Only</h4>
            <p className="text-xs leading-relaxed text-slate-300">
              Discovers vacancies and calculates match scores. Generates zero application submissions and drafts no documents.
            </p>
          </div>

          {/* Mode B */}
          <div
            onClick={() => setFormData({ ...formData, mode: 'MODE_B_PREPARE_APPROVE' })}
            className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
              formData.mode === 'MODE_B_PREPARE_APPROVE'
                ? 'border-cyan-500 bg-cyan-950/30 text-white shadow-md'
                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-cyan-400">Mode B</span>
              {formData.mode === 'MODE_B_PREPARE_APPROVE' && <CheckCircle2 className="h-4 w-4 text-cyan-400" />}
            </div>
            <h4 className="font-semibold text-sm text-white">Prepare & Approve (Recommended)</h4>
            <p className="text-xs leading-relaxed text-slate-300">
              Tailors truthful resumes, maps form fields, and queues packages for 1-click human verification before submission.
            </p>
          </div>

          {/* Mode C */}
          <div
            onClick={() => setFormData({ ...formData, mode: 'MODE_C_AUTONOMOUS' })}
            className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
              formData.mode === 'MODE_C_AUTONOMOUS'
                ? 'border-emerald-500 bg-emerald-950/30 text-white shadow-md'
                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">Mode C</span>
              {formData.mode === 'MODE_C_AUTONOMOUS' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            </div>
            <h4 className="font-semibold text-sm text-white">Preauthorized Autonomous</h4>
            <p className="text-xs leading-relaxed text-slate-300">
              Automatically submits applications meeting saved match thresholds (&ge;{formData.autoApplyThreshold}%). Subject to strict safety approval triggers.
            </p>
          </div>
        </div>
      </div>

      {/* Mode C Safety Authorizations & Mandatory Approval Triggers */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Human Approval Triggers (Safety Guardrails)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Even in Guided Mode, ApplyVise AI pauses and mandates human approval if any of these conditions are met:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
          <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/40 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireApprovalForLegalDeclarations}
              onChange={e =>
                setFormData({ ...formData, requireApprovalForLegalDeclarations: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
            />
            <div>
              <div className="font-semibold text-white">Legal & Compliance Declarations</div>
              <div className="text-[11px] text-slate-400">Never sign legal statements without review</div>
            </div>
          </label>

          <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/40 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireApprovalForVisaQuestions}
              onChange={e =>
                setFormData({ ...formData, requireApprovalForVisaQuestions: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
            />
            <div>
              <div className="font-semibold text-white">Visa & Personal Declarations</div>
              <div className="text-[11px] text-slate-400">Requires review if employer requests personal status affirmation</div>
            </div>
          </label>

          <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/40 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireApprovalForRelocation}
              onChange={e =>
                setFormData({ ...formData, requireApprovalForRelocation: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
            />
            <div>
              <div className="font-semibold text-white">Relocation Commitments</div>
              <div className="text-[11px] text-slate-400">Mandate review if employer requires physical relocation</div>
            </div>
          </label>

          <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/40 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireApprovalForSalaryCommitments}
              onChange={e =>
                setFormData({ ...formData, requireApprovalForSalaryCommitments: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
            />
            <div>
              <div className="font-semibold text-white">Salary Commitments Below Floor</div>
              <div className="text-[11px] text-slate-400">Require approval if posted band is under minimum threshold</div>
            </div>
          </label>
        </div>
      </div>

      {/* Thresholds & Scheduler Persistence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Thresholds & Rate Limits</h3>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Autonomous Match Threshold:</span>
              <span className="font-mono font-bold text-emerald-400">{formData.autoApplyThreshold}%</span>
            </div>
            <input
              type="range"
              min={60}
              max={95}
              step={1}
              value={formData.autoApplyThreshold}
              onChange={e => setFormData({ ...formData, autoApplyThreshold: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[11px] text-slate-500">Only vacancies with score &ge; {formData.autoApplyThreshold}% will auto-submit.</div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Daily Application Limit:</span>
              <span className="font-mono font-bold text-indigo-400">{formData.dailyApplicationLimit} apps/day</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              step={1}
              value={formData.dailyApplicationLimit}
              onChange={e => setFormData({ ...formData, dailyApplicationLimit: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="text-[11px] text-slate-500">Prevents rate limit fatigue and protects candidate reputation.</div>
          </div>
        </div>

        {/* Persistent Scheduler Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span>Persistent Background Scheduler</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Continuous job discovery without keeping browser open</p>
            </div>
            <input
              type="checkbox"
              checked={formData.scheduledSearchEnabled}
              onChange={e => setFormData({ ...formData, scheduledSearchEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
            />
          </div>

          <div className="text-xs space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span>Execution Frequency:</span>
              <span className="font-semibold text-white">Every 6 Hours (Twice daily)</span>
            </div>
            <div className="flex justify-between">
              <span>Last Search Cycle:</span>
              <span className="font-mono text-slate-400">{formData.lastScheduledRun || 'Never'}</span>
            </div>
          </div>

          <button
            onClick={onTriggerScheduler}
            className="w-full rounded-xl border border-indigo-700/80 bg-indigo-950/40 py-2.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/50 transition flex items-center justify-center space-x-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Trigger Scheduler Cycle Now</span>
          </button>
        </div>
      </div>

      {/* Configurable Scoring Weights */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">Configurable Relevance Scoring Weights</h3>
            <p className="text-xs text-slate-400">
              Customize how match scores (0-100) are computed across evaluation vectors.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-xs font-mono font-bold ${weightsSum === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Total Weight: {weightsSum}%
            </span>
            <button
              onClick={resetWeights}
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-white">Skills & Responsibilities</span>
              <span className="font-mono text-indigo-400">{formData.scoringWeights.skillsWeight}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              value={formData.scoringWeights.skillsWeight}
              onChange={e => handleWeightChange('skillsWeight', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-white">Relevant Experience</span>
              <span className="font-mono text-indigo-400">{formData.scoringWeights.experienceWeight}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              value={formData.scoringWeights.experienceWeight}
              onChange={e => handleWeightChange('experienceWeight', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-white">Required Qualifications</span>
              <span className="font-mono text-indigo-400">{formData.scoringWeights.qualificationsWeight}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              value={formData.scoringWeights.qualificationsWeight}
              onChange={e => handleWeightChange('qualificationsWeight', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-white">Seniority & Alignment</span>
              <span className="font-mono text-indigo-400">{formData.scoringWeights.seniorityWeight}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              value={formData.scoringWeights.seniorityWeight}
              onChange={e => handleWeightChange('seniorityWeight', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-white">Location & Arrangement</span>
              <span className="font-mono text-indigo-400">{formData.scoringWeights.locationWeight}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              value={formData.scoringWeights.locationWeight}
              onChange={e => handleWeightChange('locationWeight', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold text-white">Salary & Preferences</span>
              <span className="font-mono text-indigo-400">{formData.scoringWeights.salaryWeight}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              value={formData.scoringWeights.salaryWeight}
              onChange={e => handleWeightChange('salaryWeight', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
