import React, { useState, useEffect } from 'react';
import {
  Compass,
  TrendingUp,
  Map,
  BookOpen,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Target,
  ExternalLink,
  Plus,
  BookmarkCheck,
  Building,
  ShieldCheck
} from 'lucide-react';
import {
  UserProfile,
  CandidateFact,
  CareerTrajectory,
  CareerPreferences
} from '../types/index.ts';
import { api } from '../services/api.ts';

export interface CareerAtlasProps {
  profile: UserProfile | null;
  facts?: CandidateFact[];
  preferences?: CareerPreferences | null;
  onNavigateToJobs?: () => void;
  onAskCopilot?: (prompt: string) => void;
  plan?: 'free' | 'pro' | 'black';
  className?: string;
}

export const CareerAtlas: React.FC<CareerAtlasProps> = ({
  profile,
  facts,
  onNavigateToJobs,
  plan = 'free',
}) => {
  const isBlack = plan === 'black';

  const [trajectories, setTrajectories] = useState<CareerTrajectory[]>([]);
  const [selectedTrajectoryId, setSelectedTrajectoryId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'map' | 'roadmap' | 'trajectories'>('map');

  // Load Saved Trajectories
  useEffect(() => {
    const loadTrajectories = async () => {
      try {
        setIsLoading(true);
        const res = await api.getCareerTrajectories();
        if (res.success && res.trajectories && res.trajectories.length > 0) {
          setTrajectories(res.trajectories);
          setSelectedTrajectoryId(res.trajectories[0].id);
        }
      } catch (err) {
        console.error('Failed to load career trajectories:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTrajectories();
  }, []);

  const activeTrajectory = trajectories.find(t => t.id === selectedTrajectoryId) || trajectories[0] || {
    id: 'traj_default',
    userId: 'current',
    trajectoryTitle: 'Operations & Process Leadership',
    targetRole: 'Director of Enterprise Operations',
    currentAlignmentScore: 82,
    transferableSkills: ['Process Optimization', 'Enterprise Supply Chain', 'SLA Management', 'Cross-Functional Leadership'],
    missingSkills: ['Six Sigma Black Belt', 'Multi-Region Logistics', 'P&L Budget Oversight'],
    requiredExperienceYears: 8,
    recommendedCertifications: ['Lean Six Sigma Black Belt', 'APICS Certified Supply Chain Professional (CSCP)'],
    learningPath: [
      { step: 1, title: 'Complete Lean Six Sigma Black Belt practical project', estimatedHours: 40, rationale: 'Validates quantitative process excellence methodology', isCompleted: false },
      { step: 2, title: 'Lead multi-site process standardization initiative', estimatedHours: 60, rationale: 'Demonstrates distributed leadership capability', isCompleted: false },
      { step: 3, title: 'P&L Budget Oversight & Financial Modeling', estimatedHours: 35, rationale: 'Demonstrates direct accountability for operating margins', isCompleted: false },
    ],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const verifiedSkills = (profile?.skills || []).map(s => s.name);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Trajectory Selector */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all shadow-sm ${
        isBlack
          ? 'bg-[#090D14]/90 border-amber-500/30 text-slate-100'
          : 'bg-white/70 dark:bg-slate-900/70 border-white/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
                isBlack
                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40'
              }`}>
                CAREER PATHWAYS & DEVELOPMENT ATLAS
              </span>
              <span className="text-xs text-slate-400 font-mono">· Ground-Truth Skill Bridges</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Career Atlas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Explore multi-track career trajectories, evaluate transferable competencies, and prioritize skill milestones. Built from your verified employment history and certifications.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'map'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Interactive Map
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'roadmap'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Development Roadmap
            </button>
            <button
              onClick={() => setActiveTab('trajectories')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'trajectories'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Trajectories ({trajectories.length})
            </button>
          </div>
        </div>

        {/* Current Active Trajectory Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400 font-medium">Active Trajectory:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {activeTrajectory.trajectoryTitle}
            </span>
            <span className="text-xs text-slate-400">› Target: {activeTrajectory.targetRole}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 px-2 py-0.5 rounded-full">
              {activeTrajectory.currentAlignmentScore}% Alignment
            </span>
            <button
              onClick={onNavigateToJobs}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center space-x-1"
            >
              <span>Scan Radar for Target Roles</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. TAB: INTERACTIVE CAREER MAP (GRAPH VISUALIZATION) */}
      {activeTab === 'map' && (
        <div className={`p-6 sm:p-8 rounded-3xl border ${
          isBlack ? 'bg-[#090D14]/80 border-amber-500/20' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800'
        }`}>
          <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Career Transition & Skill Bridges
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualizing progression from current verified positioning to target executive role
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">SVG Coordinate Projection</span>
          </div>

          {/* SVG Map Canvas */}
          <div className="mt-6 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 overflow-x-auto">
            <svg viewBox="0 0 800 320" className="w-full min-w-[700px] h-auto">
              <defs>
                <linearGradient id="bridgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              {/* Connecting Lines */}
              <line x1="140" y1="160" x2="400" y2="80" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="140" y1="160" x2="400" y2="160" stroke="#6366f1" strokeWidth="2.5" />
              <line x1="140" y1="160" x2="400" y2="240" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />

              <line x1="400" y1="80" x2="660" y2="160" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="400" y1="160" x2="660" y2="160" stroke="#10b981" strokeWidth="2.5" />
              <line x1="400" y1="240" x2="660" y2="160" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />

              {/* Node 1: Current Professional Positioning */}
              <g transform="translate(140, 160)">
                <circle r="42" fill="#e0e7ff" stroke="#6366f1" strokeWidth="3" />
                <text textAnchor="middle" y="-6" fill="#1e1b4b" fontSize="11" fontWeight="bold">CURRENT</text>
                <text textAnchor="middle" y="10" fill="#4338ca" fontSize="9" fontWeight="medium">
                  {profile?.currentTitle?.slice(0, 15) || 'Senior Process'}
                </text>
              </g>

              {/* Central Bridges: Transferable & Missing Skills */}
              <g transform="translate(400, 80)">
                <rect x="-80" y="-22" width="160" height="44" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                <text textAnchor="middle" y="-4" fill="#334155" fontSize="10" fontWeight="bold">TRANSFERABLE</text>
                <text textAnchor="middle" y="10" fill="#64748b" fontSize="9">
                  {activeTrajectory.transferableSkills[0] || 'Process Optimization'}
                </text>
              </g>

              <g transform="translate(400, 160)">
                <rect x="-80" y="-22" width="160" height="44" rx="14" fill="#ffffff" stroke="#6366f1" strokeWidth="2" />
                <text textAnchor="middle" y="-4" fill="#4338ca" fontSize="10" fontWeight="bold">CORE COMPETENCY</text>
                <text textAnchor="middle" y="10" fill="#64748b" fontSize="9">
                  {activeTrajectory.transferableSkills[1] || 'Enterprise Systems'}
                </text>
              </g>

              <g transform="translate(400, 240)">
                <rect x="-80" y="-22" width="160" height="44" rx="14" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.5" />
                <text textAnchor="middle" y="-4" fill="#b45309" fontSize="10" fontWeight="bold">SKILL TO STRENGTHEN</text>
                <text textAnchor="middle" y="10" fill="#64748b" fontSize="9">
                  {activeTrajectory.missingSkills[0] || 'Budget Oversight'}
                </text>
              </g>

              {/* Node 3: Target Role Destination */}
              <g transform="translate(660, 160)">
                <circle r="46" fill="#d1fae5" stroke="#10b981" strokeWidth="3" />
                <text textAnchor="middle" y="-6" fill="#064e3b" fontSize="11" fontWeight="bold">TARGET</text>
                <text textAnchor="middle" y="10" fill="#047857" fontSize="9" fontWeight="medium">
                  {activeTrajectory.targetRole.slice(0, 18)}
                </text>
              </g>
            </svg>
          </div>
        </div>
      )}

      {/* 3. TAB: DEVELOPMENT ROADMAP (ESTIMATED EFFORT & MILESTONES) */}
      {activeTab === 'roadmap' && (
        <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
          isBlack ? 'bg-[#090D14]/80 border-amber-500/20' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Prioritized Skill Development Roadmap
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Actionable milestones to close verified competency gaps. Hours represent estimated effort.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {activeTrajectory.learningPath.length} Actionable Steps
            </span>
          </div>

          <div className="space-y-4">
            {activeTrajectory.learningPath.map(step => (
              <div
                key={step.step}
                className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                      {step.step}
                    </span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pl-8 leading-relaxed">
                    <strong>Rationale:</strong> {step.rationale}
                  </p>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-center pl-8 sm:pl-0">
                  <span className="text-xs font-mono text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{step.estimatedHours}h est.</span>
                  </span>

                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    {step.isCompleted ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. TAB: MULTIPLE CAREER TRAJECTORIES */}
      {activeTab === 'trajectories' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {trajectories.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTrajectoryId(t.id)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer space-y-4 ${
                  t.id === selectedTrajectoryId
                    ? 'border-indigo-600 shadow-sm'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
                } ${
                  isBlack ? 'bg-[#090D14]/80 text-slate-100' : 'bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
                  <h3 className="font-bold text-sm">{t.trajectoryTitle}</h3>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                    {t.currentAlignmentScore}% MATCH
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Target Role:</span>{' '}
                    <strong className="text-slate-900 dark:text-white">{t.targetRole}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Experience Baseline:</span>{' '}
                    <span>{t.requiredExperienceYears}+ years required</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Recommended Certifications:</span>
                  <div className="flex flex-wrap gap-1">
                    {t.recommendedCertifications.map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
