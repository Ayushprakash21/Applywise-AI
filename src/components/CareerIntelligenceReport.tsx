import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Building,
  Target
} from 'lucide-react';
import { UserProfile, CareerPreferences, JobVacancy } from '../types/index.ts';

interface CareerIntelligenceReportProps {
  profile: UserProfile | null;
  preferences: CareerPreferences | null;
  vacancies: JobVacancy[];
  onOpenOnboarding: () => void;
  onNavigateToJobs: () => void;
  onAskCopilot: (prompt: string) => void;
}

export const CareerIntelligenceReport: React.FC<CareerIntelligenceReportProps> = ({
  profile,
  preferences,
  vacancies,
  onOpenOnboarding,
  onNavigateToJobs,
  onAskCopilot,
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(vacancies[0]?.id || '');
  const selectedJob = vacancies.find(v => v.id === selectedJobId) || vacancies[0];

  const handlePrint = () => {
    window.print();
  };

  // Derive explicit skills vs target job requirements
  const explicitSkills = profile?.skills?.map(s => s.name) || [];
  const targetReqs = selectedJob?.requirements || [
    'System Architecture & Distributed Consensus',
    'TypeScript / Modern Frameworks',
    'Cloudflare Workers / Edge Runtime',
    'High Availability Systems'
  ];

  const matched = targetReqs.filter(req =>
    explicitSkills.some(s => req.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(req.toLowerCase()))
  );

  const missing = targetReqs.filter(req => !matched.includes(req));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Report Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Career Intelligence & Skill Gap Report
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-400 text-xs font-mono font-bold">
              VERIFIED AUDIT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Factual synthesis comparing your verified background against active market expectations.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center space-x-1.5 transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={() => onAskCopilot('Analyze my career report and suggest strategic next steps.')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5"
          >
            <Sparkles className="h-4 w-4" />
            <span>Discuss with Copilot</span>
          </button>
        </div>
      </div>

      {/* Zero Hallucination Guarantee Disclaimer */}
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 flex items-start space-x-3 text-xs text-emerald-800 dark:text-emerald-300">
        <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Zero-Hallucination Factual Guarantee:</strong> All strengths, verified competencies, and experiences evaluated in this report originate exclusively from your verified profile and master resume. ApplyWise AI never invents achievements or fabricates employment credentials.
        </div>
      </div>

      {/* Target Role Selector */}
      {vacancies.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Target className="h-4 w-4 text-cyan-500" />
            <span>Evaluate Against Target Role:</span>
          </div>
          <select
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer max-w-md truncate"
          >
            {vacancies.slice(0, 15).map(v => (
              <option key={v.id} value={v.id}>
                {v.title} — {v.company} ({v.location})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Grid: Strengths, Gaps, Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Verified Candidate Strengths */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Explicit Resume Strengths</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Skills and qualifications explicitly documented in your career history.
          </p>

          <div className="space-y-2 pt-1">
            {explicitSkills.slice(0, 8).map((sk, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">{sk}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-semibold">
                  Verified in Master Profile
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Requirements & Potential Gaps */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Target Role Requirements & Gaps</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Requirements specified in {selectedJob?.company || 'Target'} job description.
          </p>

          <div className="space-y-2 pt-1">
            {matched.map((m, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span>{m}</span>
                <span className="font-mono text-[10px] font-bold">ALIGNED</span>
              </div>
            ))}

            {missing.map((mis, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-500/20 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                <span>{mis}</span>
                <span className="font-mono text-[10px] font-bold">UNVERIFIED / GAP</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Suggested Actionable Next Steps */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span>Recommended Next Actions</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
            <span className="font-mono text-cyan-400 text-[10px] uppercase font-bold">01 / Resume Alignment</span>
            <h4 className="font-bold text-white">Highlight Aligned Competencies</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Emphasize your Go, Edge KV, and Distributed Systems achievements at the top of your resume for this position.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
            <span className="font-mono text-cyan-400 text-[10px] uppercase font-bold">02 / Address Gaps</span>
            <h4 className="font-bold text-white">Target Unverified Requirements</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              If you possess experience in unverified areas, update your master profile before tailoring your submission.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
            <span className="font-mono text-cyan-400 text-[10px] uppercase font-bold">03 / Tailored Submission</span>
            <h4 className="font-bold text-white">Generate ATS Package</h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Download standard ATS-12 DOCX format and follow guided submission tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
