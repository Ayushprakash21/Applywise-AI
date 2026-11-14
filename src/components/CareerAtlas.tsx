import React, { useState, useEffect, useMemo } from 'react';
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
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sliders,
  DollarSign,
  Briefcase,
  Search,
  Filter,
  Check,
  FileText,
  Upload,
  Calendar,
  Zap,
  BarChart3,
  Globe,
  Lock,
  ArrowUpRight,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  UserProfile,
  CandidateFact,
  CareerTrajectory,
  CareerPreferences,
  JobVacancy
} from '../types/index.ts';
import {
  CareerPathRecommendation,
  CareerPathCategory,
  CareerPathReadiness,
  CareerTransitionAssessment,
  CareerRoadmapPlan,
  CareerMilestone,
  CareerMarketSnapshot,
  CareerLearningResource,
  CareerScenarioConfig,
  CareerScenarioResult,
  OpportunityMappingItem,
  CareerGoal,
  CareerProgressEvent,
  CompetencyEvidence,
  SkillImportance,
  EvidenceLevel
} from '../types/careerAtlas.ts';
import {
  discoverCareerPaths,
  generateTransitionAssessment,
  generatePersonalizedRoadmap,
  getMarketAndSalarySnapshot,
  getLearningRecommendations,
  simulateCareerScenario,
  mapOpportunitiesToCareerPath,
  buildAtlasOverviewData,
  calculateTotalVerifiedExperience
} from '../services/careerAtlasEngine.ts';
import { api } from '../services/api.ts';

export interface CareerAtlasProps {
  profile: UserProfile | null;
  facts?: CandidateFact[];
  preferences?: CareerPreferences | null;
  vacancies?: JobVacancy[];
  onNavigateToJobs?: () => void;
  onNavigateToApplications?: () => void;
  onAskCopilot?: (prompt: string) => void;
  plan?: 'free' | 'pro' | 'black';
  className?: string;
}

type AtlasTab =
  | 'overview'
  | 'explorer'
  | 'transition'
  | 'skills'
  | 'roadmap'
  | 'market'
  | 'learning'
  | 'scenarios'
  | 'opportunities'
  | 'progress'
  | 'map';

export const CareerAtlas: React.FC<CareerAtlasProps> = ({
  profile,
  facts,
  preferences,
  vacancies = [],
  onNavigateToJobs,
  onNavigateToApplications,
  onAskCopilot,
  plan = 'free',
  className = '',
}) => {
  const isBlack = plan === 'black';

  // Navigation State
  const [activeTab, setActiveTab] = useState<AtlasTab>('overview');
  const [selectedTargetRole, setSelectedTargetRole] = useState<string>('');
  const [savedRoleIds, setSavedRoleIds] = useState<Set<string>>(new Set());

  // Category & Readiness Filters for Explorer
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedReadinessFilter, setSelectedReadinessFilter] = useState<string>('all');

  // Visualization View Mode
  const [mapViewMode, setMapViewMode] = useState<'graph' | 'table'>('graph');
  const [inspectedNode, setInspectedNode] = useState<any | null>(null);

  // Roadmap & Weekly Hours State
  const [weeklyHours, setWeeklyHours] = useState<number>(6);
  const [roadmapMilestones, setRoadmapMilestones] = useState<CareerMilestone[]>([]);
  const [selectedMilestoneForEdit, setSelectedMilestoneForEdit] = useState<CareerMilestone | null>(null);
  const [milestoneNoteInput, setMilestoneNoteInput] = useState<string>('');

  // Scenario Simulation State
  const [scenarioTargetRole, setScenarioTargetRole] = useState<string>('');
  const [scenarioCountry, setScenarioCountry] = useState<string>('United States');
  const [scenarioRemoteOnly, setScenarioRemoteOnly] = useState<boolean>(true);
  const [scenarioPriority, setScenarioPriority] = useState<'salary' | 'stability' | 'management' | 'specialization'>('management');
  const [scenarioHours, setScenarioHours] = useState<number>(8);
  const [scenarioCustomSkill, setScenarioCustomSkill] = useState<string>('');
  const [hypotheticalSkills, setHypotheticalSkills] = useState<string[]>(['Executive Stakeholder Alignment', 'Multi-Region Logistics']);
  const [scenarioResult, setScenarioResult] = useState<CareerScenarioResult | null>(null);

  // Goals & Progress
  const [goals, setGoals] = useState<CareerGoal[]>([]);
  const [progressEvents, setProgressEvents] = useState<CareerProgressEvent[]>([]);
  const [candidateConfirmations, setCandidateConfirmations] = useState<Record<string, boolean>>({});

  // Loading & Diagnostics
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Discover all paths from Engine
  const discoveredPaths = useMemo(() => {
    return discoverCareerPaths(profile, vacancies as any);
  }, [profile, vacancies]);

  // Set default target role on mount
  useEffect(() => {
    if (discoveredPaths.length > 0 && !selectedTargetRole) {
      const initial = discoveredPaths[0].targetRole;
      setSelectedTargetRole(initial);
      setScenarioTargetRole(initial);
      setSavedRoleIds(new Set([discoveredPaths[0].id]));
    }
  }, [discoveredPaths, selectedTargetRole]);

  // Load existing milestones and assessment
  const activeAssessment = useMemo(() => {
    if (!selectedTargetRole) return null;
    return generateTransitionAssessment(profile, selectedTargetRole);
  }, [profile, selectedTargetRole]);

  // Generate roadmap
  useEffect(() => {
    if (selectedTargetRole) {
      const plan = generatePersonalizedRoadmap(profile, selectedTargetRole, weeklyHours);
      setRoadmapMilestones(plan.milestones);
    }
  }, [profile, selectedTargetRole, weeklyHours]);

  // Market Snapshot
  const marketSnapshot = useMemo(() => {
    if (!selectedTargetRole) return null;
    return getMarketAndSalarySnapshot(selectedTargetRole, vacancies as any);
  }, [selectedTargetRole, vacancies]);

  // Learning Resources
  const learningResources = useMemo(() => {
    if (!selectedTargetRole) return [];
    return getLearningRecommendations(selectedTargetRole);
  }, [selectedTargetRole]);

  // Live Opportunities
  const opportunityItems = useMemo(() => {
    if (!selectedTargetRole) return [];
    return mapOpportunitiesToCareerPath(selectedTargetRole, vacancies as any);
  }, [selectedTargetRole, vacancies]);

  // Candidate Fact Check
  const verifiedSkillsCount = profile?.skills?.length || 0;
  const verifiedExpYears = profile?.totalExperienceYears ?? calculateTotalVerifiedExperience(profile?.employmentHistory || []);
  const hasInsufficientData = verifiedSkillsCount === 0 && (!profile?.employmentHistory || profile.employmentHistory.length === 0);

  // Handle Scenario Recalculation
  const runScenarioSimulation = () => {
    const config: CareerScenarioConfig = {
      id: `scen_${Date.now()}`,
      scenarioName: `${scenarioTargetRole} Simulation`,
      targetRole: scenarioTargetRole || selectedTargetRole,
      targetCountry: scenarioCountry,
      remoteOnly: scenarioRemoteOnly,
      careerPriority: scenarioPriority,
      weeklyLearningHours: scenarioHours,
      hypotheticalSkillsAdded: hypotheticalSkills,
      hypotheticalQualificationsAdded: ['PMP or Executive Certificate'],
    };
    const res = simulateCareerScenario(profile, config, vacancies as any);
    setScenarioResult(res);
  };

  useEffect(() => {
    if (activeTab === 'scenarios' && !scenarioResult && selectedTargetRole) {
      runScenarioSimulation();
    }
  }, [activeTab, selectedTargetRole]);

  // Milestone Actions
  const handleMilestoneProgress = (milestoneId: string, newStatus: 'not_started' | 'in_progress' | 'completed') => {
    setRoadmapMilestones(prev => prev.map(m => {
      if (m.id === milestoneId) {
        const isComp = newStatus === 'completed';
        return {
          ...m,
          status: newStatus,
          progressPercent: isComp ? 100 : newStatus === 'in_progress' ? 50 : 0,
          completedAt: isComp ? new Date().toISOString() : undefined,
        };
      }
      return m;
    }));

    if (newStatus === 'completed') {
      const milestone = roadmapMilestones.find(m => m.id === milestoneId);
      const newEvt: CareerProgressEvent = {
        id: `evt_${Date.now()}`,
        userId: 'current',
        type: 'milestone_completed',
        title: `Completed Milestone: ${milestone?.title || 'Competency Achieved'}`,
        description: `Verified completion of ${milestone?.competency || 'development action'} within the personalized roadmap.`,
        timestamp: new Date().toISOString(),
        impactScoreBonus: 3,
      };
      setProgressEvents(prev => [newEvt, ...prev]);
    }
  };

  const handleAddMilestoneNote = (milestoneId: string) => {
    if (!milestoneNoteInput.trim()) return;
    setRoadmapMilestones(prev => prev.map(m => {
      if (m.id === milestoneId) {
        return { ...m, candidateNotes: milestoneNoteInput.trim() };
      }
      return m;
    }));
    setMilestoneNoteInput('');
    setSelectedMilestoneForEdit(null);
  };

  const handleConfirmCandidateSkill = (id: string, skill: string) => {
    setCandidateConfirmations(prev => ({ ...prev, [id]: true }));
    const newEvt: CareerProgressEvent = {
      id: `evt_conf_${Date.now()}`,
      userId: 'current',
      type: 'skill_verified',
      title: `Candidate-Confirmed Competency: ${skill}`,
      description: `Confirmed historical experience in ${skill}. Pending verification review in Candidate Fact Registry.`,
      timestamp: new Date().toISOString(),
      impactScoreBonus: 2,
    };
    setProgressEvents(prev => [newEvt, ...prev]);
  };

  const toggleSavePath = (pathId: string) => {
    setSavedRoleIds(prev => {
      const next = new Set(prev);
      if (next.has(pathId)) next.delete(pathId);
      else next.add(pathId);
      return next;
    });
  };

  // Filtered explorer paths
  const filteredPaths = useMemo(() => {
    return discoveredPaths.filter(p => {
      if (selectedCategoryFilter !== 'all' && p.category !== selectedCategoryFilter) return false;
      if (selectedReadinessFilter !== 'all' && p.readinessStatus !== selectedReadinessFilter) return false;
      return true;
    });
  }, [discoveredPaths, selectedCategoryFilter, selectedReadinessFilter]);

  return (
    <div className={`space-y-8 animate-in fade-in duration-300 ${className}`}>
      {/* ====================================================================
          1. HEADER & GLOBAL CAREER ATLAS WORKSPACE
          ==================================================================== */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all shadow-sm ${
        isBlack
          ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] text-[#F2F0EA]'
          : 'bg-white/80 border-slate-200/90 text-slate-900 shadow-slate-900/5 backdrop-blur-xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
                isBlack
                  ? 'bg-[rgba(198,166,106,0.12)] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                CAREER ATLAS 2.0
              </span>
              <span className="text-xs text-slate-400 font-mono">
                · AI Career Intelligence, Transition & Development Platform
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Career Intelligence Workspace
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Understand your verified positioning, explore realistic career transitions, analyze competency gaps, execute personalized 30-to-365 day development roadmaps, and track market demand across live vacancies.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <div className={`px-3 py-2 rounded-2xl border text-xs flex items-center space-x-2 ${
              isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.08)]' : 'bg-slate-50 border-slate-200'
            }`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">VERIFIED TENURE</span>
                <strong className="font-semibold">{verifiedExpYears} Years</strong>
              </div>
            </div>

            <div className={`px-3 py-2 rounded-2xl border text-xs flex items-center space-x-2 ${
              isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.08)]' : 'bg-slate-50 border-slate-200'
            }`}>
              <Sparkles className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">INDEXED SKILLS</span>
                <strong className="font-semibold">{verifiedSkillsCount} Skills</strong>
              </div>
            </div>

            {onAskCopilot && (
              <button
                type="button"
                onClick={() => onAskCopilot(`Based on my verified profile as a ${profile?.currentTitle || 'candidate'}, what are my best 3 next career directions and what skills should I develop first?`)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center space-x-2 cursor-pointer transition ${
                  isBlack
                    ? 'bg-[#191D23] hover:bg-[#20252D] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Ask Career Copilot</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Sub-Navigation Across 10 Core Functional Sections */}
        <div className="mt-6 pt-5 border-t border-slate-200/70 overflow-x-auto scrollbar-none flex items-center gap-1.5 text-xs">
          {[
            { id: 'overview', label: 'Intelligence Overview', icon: LayoutDashboardIcon },
            { id: 'explorer', label: 'Career Path Explorer', icon: Compass },
            { id: 'transition', label: 'Transition Analysis', icon: TrendingUp },
            { id: 'skills', label: 'Skill Gap Intelligence', icon: Target },
            { id: 'roadmap', label: 'Development Roadmap', icon: Calendar },
            { id: 'market', label: 'Market & Salary', icon: DollarSign },
            { id: 'learning', label: 'Learning Planner', icon: BookOpen },
            { id: 'scenarios', label: 'Scenario Lab', icon: Sliders },
            { id: 'opportunities', label: 'Opportunity Mapping', icon: Briefcase },
            { id: 'progress', label: 'Progress Tracker', icon: Award },
            { id: 'map', label: 'Interactive Map', icon: Map },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AtlasTab)}
                className={`px-3 py-2 rounded-xl font-medium shrink-0 flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isActive
                    ? isBlack
                      ? 'bg-[var(--be-accent,#C6A66A)] text-[var(--be-accent-contrast,#17130C)] font-bold shadow-xs'
                      : 'bg-blue-600 text-white font-semibold shadow-xs'
                    : isBlack
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-[#191D23]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile Incomplete Warning Banner if fact registry is empty */}
      {hasInsufficientData && (
        <div className={`p-5 rounded-2xl border flex items-start space-x-3.5 ${
          isBlack ? 'bg-amber-950/20 border-amber-800/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-sm">Profile Data Incomplete — Profile-Completion Requirement</h4>
            <p className="leading-relaxed opacity-90">
              Career Atlas evaluates career paths strictly from verified employment records and factual skills. Please upload your resume or verify your employment history in Resume Studio to unlock 100% personalized transition metrics without simulated assumptions.
            </p>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB A: CAREER INTELLIGENCE OVERVIEW
          ==================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Row: Current Verified Profile + Recommended Next Move */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Current Verified Profile */}
            <div className={`p-6 rounded-3xl border space-y-4 lg:col-span-1 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  VERIFIED PROFILE BASELINE
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  GROUND TRUTH
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-slate-400">Current Role</span>
                <h3 className="text-lg font-bold truncate">
                  {profile?.currentTitle || 'Process Associate — Supply Chain Operations'}
                </h3>
                <p className="text-xs text-slate-500">
                  {profile?.employmentHistory?.[0]?.company || 'Tata Consultancy Services (TCS)'} · {verifiedExpYears} verified years
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-slate-400 block font-mono uppercase">Core Strengths</span>
                <div className="flex flex-wrap gap-1.5">
                  {(profile?.skills || []).slice(0, 6).map((s, idx) => (
                    <span key={idx} className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium ${
                      isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.08)] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      {s.name}
                    </span>
                  ))}
                  {verifiedSkillsCount === 0 && (
                    <span className="text-xs text-slate-400 italic">No verified skills indexed yet.</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Recommended Next Career Move */}
            <div className={`p-6 rounded-3xl border space-y-4 lg:col-span-2 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  RECOMMENDED NEXT CAREER MOVE
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  TOP ALIGNMENT
                </span>
              </div>

              {discoveredPaths[0] && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-indigo-500 font-semibold font-mono uppercase">
                        {discoveredPaths[0].categoryLabel}
                      </div>
                      <h3 className="text-xl font-bold">{discoveredPaths[0].targetRole}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold font-mono text-emerald-500">
                        {discoveredPaths[0].alignmentScore}%
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">ALIGNMENT SCORE</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {discoveredPaths[0].roleDescription}
                  </p>

                  <div className="p-3.5 rounded-2xl bg-slate-500/5 border border-slate-500/15 text-xs space-y-1.5">
                    <div className="font-semibold flex items-center space-x-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-500" />
                      <span>Why this is recommended now:</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed pl-5">
                      {discoveredPaths[0].whyRelevant}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                      <span>Difficulty: <strong className="text-slate-300">{discoveredPaths[0].transitionDifficulty}</strong></span>
                      <span>·</span>
                      <span>Target Prep: <strong className="text-slate-300">~{discoveredPaths[0].estimatedEffortMonths} Months</strong></span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTargetRole(discoveredPaths[0].targetRole);
                        setActiveTab('transition');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition ${
                        isBlack
                          ? 'bg-[#191D23] hover:bg-[#20252D] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      <span>Analyze Full Transition</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transparent Career-Readiness Assessment Card (Explainable, zero arbitrary percentages!) */}
          {activeAssessment && (
            <div className={`p-6 sm:p-7 rounded-3xl border space-y-5 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                    TRANSPARENT CAREER READINESS AUDIT
                  </span>
                  <h3 className="text-base font-bold">
                    Target Evaluation: {activeAssessment.targetRole}
                  </h3>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-xl font-bold font-mono text-emerald-500">
                      {activeAssessment.overallReadinessScore}/100
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">EVIDENCE-BACKED READINESS</span>
                  </div>
                </div>
              </div>

              {/* 4 Explanation Quadrants */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* 1. What is being measured */}
                <div className={`p-4 rounded-2xl border space-y-1.5 ${
                  isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">WHAT IS MEASURED</span>
                  <p className="leading-relaxed text-slate-500 dark:text-slate-400">
                    {activeAssessment.readinessExplanation.whatIsMeasured}
                  </p>
                </div>

                {/* 2. Data Used */}
                <div className={`p-4 rounded-2xl border space-y-1.5 ${
                  isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">DATA SOURCES USED</span>
                  <ul className="space-y-1 text-slate-500 dark:text-slate-400 list-disc pl-3">
                    {activeAssessment.readinessExplanation.dataUsed.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                {/* 3. Missing Evidence */}
                <div className={`p-4 rounded-2xl border space-y-1.5 ${
                  isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">MISSING EVIDENCE</span>
                  <ul className="space-y-1 text-slate-500 dark:text-slate-400 list-disc pl-3">
                    {activeAssessment.readinessExplanation.missingEvidence.slice(0, 3).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>

                {/* 4. How to Improve */}
                <div className={`p-4 rounded-2xl border space-y-1.5 ${
                  isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">HOW TO IMPROVE SCORE</span>
                  <p className="leading-relaxed text-slate-500 dark:text-slate-400">
                    {activeAssessment.readinessExplanation.howToImprove[0]}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Grid: Priority Skill Gaps + Next Development Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Skill Gaps */}
            <div className={`p-6 rounded-3xl border space-y-4 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  PRIORITY COMPETENCY BRIDGES
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('skills')}
                  className="text-xs text-indigo-500 hover:underline font-semibold"
                >
                  View All Gaps ›
                </button>
              </div>

              <div className="space-y-3">
                {activeAssessment?.missingCompetencies.slice(0, 3).map((gap, idx) => (
                  <div key={idx} className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                    isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200">{gap.skill}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          {gap.importance}
                        </span>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{gap.whyItMatters}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('roadmap')}
                      className={`text-[11px] px-2.5 py-1 rounded-lg shrink-0 font-semibold cursor-pointer ${
                        isBlack ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                      }`}
                    >
                      Plan
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Roadmap Milestones */}
            <div className={`p-6 rounded-3xl border space-y-4 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  ACTIVE ROADMAP MILESTONES (NEXT 30 DAYS)
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('roadmap')}
                  className="text-xs text-indigo-500 hover:underline font-semibold"
                >
                  Full Roadmap ›
                </button>
              </div>

              <div className="space-y-3">
                {roadmapMilestones.slice(0, 2).map((ms, idx) => (
                  <div key={idx} className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                    isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-bold">{ms.title}</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed pl-7">{ms.objective}</p>
                      <div className="pl-7 pt-1 flex items-center space-x-3 text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>~{ms.estimatedHours}h est.</span>
                        </span>
                        <span>·</span>
                        <span>Target: {ms.targetCompletionDate}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMilestoneProgress(ms.id, ms.status === 'completed' ? 'in_progress' : 'completed')}
                      className={`text-[10px] px-2 py-1 rounded-lg shrink-0 font-semibold cursor-pointer ${
                        ms.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      }`}
                    >
                      {ms.status === 'completed' ? 'Completed' : 'Mark Done'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB B: CAREER PATH EXPLORER
          ==================================================================== */}
      {activeTab === 'explorer' && (
        <div className="space-y-6">
          {/* Controls Bar: Category Filter, Readiness Filter */}
          <div className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-mono uppercase font-semibold">Track Category:</span>
              {[
                { id: 'all', label: 'All Tracks' },
                { id: 'vertical', label: 'Vertical' },
                { id: 'adjacent', label: 'Adjacent' },
                { id: 'cross_functional', label: 'Cross-Functional' },
                { id: 'management', label: 'Management' },
                { id: 'specialist', label: 'Specialist' },
                { id: 'executive', label: 'Executive' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`text-xs px-2.5 py-1 rounded-xl transition cursor-pointer font-medium ${
                    selectedCategoryFilter === cat.id
                      ? isBlack
                        ? 'bg-[var(--be-accent,#C6A66A)] text-[#17130C] font-bold'
                        : 'bg-blue-600 text-white font-semibold'
                      : isBlack
                      ? 'bg-[#191D23] text-slate-300 hover:bg-[#20252D]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-mono uppercase font-semibold">Readiness:</span>
              {[
                { id: 'all', label: 'All Tiers' },
                { id: 'ready_now', label: 'Ready Now (75%+)' },
                { id: 'achievable_prep', label: 'Prep (55-74%)' },
                { id: 'long_term', label: 'Long-Term (35-54%)' },
              ].map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReadinessFilter(r.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl transition cursor-pointer font-medium ${
                    selectedReadinessFilter === r.id
                      ? isBlack ? 'bg-indigo-600 text-white font-bold' : 'bg-blue-600 text-white'
                      : isBlack ? 'bg-[#191D23] text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPaths.map((path) => {
              const isSelected = selectedTargetRole === path.targetRole;
              const isSaved = savedRoleIds.has(path.id);

              return (
                <div
                  key={path.id}
                  className={`p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? isBlack
                        ? 'border-[var(--be-accent,#C6A66A)] bg-[#191D23] shadow-md'
                        : 'border-blue-600 bg-white shadow-md'
                      : isBlack
                      ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] hover:border-slate-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                        {path.categoryLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSavePath(path.id)}
                        title={isSaved ? 'Remove from saved paths' : 'Save path'}
                        className="text-slate-400 hover:text-amber-500 cursor-pointer p-1"
                      >
                        <BookmarkCheck className={`w-4 h-4 ${isSaved ? 'text-amber-500' : ''}`} />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-100">{path.targetRole}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {path.roleDescription}
                      </p>
                    </div>

                    {/* Readiness Pill & Alignment */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        path.readinessStatus === 'ready_now'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : path.readinessStatus === 'achievable_prep'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      }`}>
                        {path.readinessStatus === 'ready_now' ? 'READY NOW' : path.readinessStatus === 'achievable_prep' ? 'ACHIEVABLE W/ PREP' : 'LONGER-TERM'}
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {path.alignmentScore}%
                      </span>
                    </div>

                    {/* Skill Breakdown Summary */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/50 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Matching Skills:</span>
                        <strong className="text-emerald-400">{path.matchingSkills.length} Verified</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Skills to Bridge:</span>
                        <strong className="text-rose-400">{path.missingSkills.length} Missing</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Live GCDE Openings:</span>
                        <strong className="text-slate-200">{path.relevantLiveVacanciesCount} Vacancies</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/50 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTargetRole(path.targetRole);
                        setActiveTab('transition');
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-center cursor-pointer transition ${
                        isSelected
                          ? isBlack
                            ? 'bg-[var(--be-accent,#C6A66A)] text-[#17130C]'
                            : 'bg-blue-600 text-white'
                          : isBlack
                          ? 'bg-[#191D23] hover:bg-[#222731] text-slate-200 border border-[rgba(255,255,255,0.08)]'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      Select & Analyze
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTargetRole(path.targetRole);
                        setActiveTab('opportunities');
                      }}
                      title="View live matching vacancies"
                      className={`p-2 rounded-xl text-xs border cursor-pointer ${
                        isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.08)] text-slate-300' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <Briefcase className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB C: CAREER TRANSITION ANALYSIS
          ==================================================================== */}
      {activeTab === 'transition' && activeAssessment && (
        <div className="space-y-6">
          {/* Target Role Banner */}
          <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                CAREER TRANSITION DEEP DIVE
              </span>
              <h2 className="text-xl font-bold">
                {profile?.currentTitle || 'Current Position'} → {activeAssessment.targetRole}
              </h2>
              <p className="text-xs text-slate-500">
                Transparent side-by-side competency gap audit grounded in candidate verified facts.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setActiveTab('roadmap')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer ${
                  isBlack ? 'bg-[var(--be-accent,#C6A66A)] text-[#17130C]' : 'bg-blue-600 text-white'
                }`}
              >
                <span>Generate Roadmap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Side-by-side Competency Comparison Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Matching & Transferable Competencies */}
            <div className={`p-6 rounded-3xl border space-y-4 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified Matching & Transferable Competencies ({activeAssessment.matchingCompetencies.length})</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">STRONG EVIDENCE</span>
              </div>

              <div className="space-y-3">
                {activeAssessment.matchingCompetencies.map((comp, idx) => (
                  <div key={idx} className={`p-3.5 rounded-2xl border space-y-1.5 ${
                    isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{comp.skill}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {comp.evidenceLevel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {comp.candidateEvidence}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Competencies & Candidate Confirmation Required */}
            <div className={`p-6 rounded-3xl border space-y-4 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <span className="text-xs font-bold text-rose-400 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Missing Competencies & Confirmation Required ({activeAssessment.missingCompetencies.length})</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">REQUIRES BRIDGING</span>
              </div>

              <div className="space-y-3">
                {activeAssessment.missingCompetencies.map((comp, idx) => (
                  <div key={idx} className={`p-3.5 rounded-2xl border space-y-2 ${
                    isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200">{comp.skill}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          {comp.importance}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Gap: {comp.gapLevel}</span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      <strong>Why It Matters:</strong> {comp.whyItMatters}
                    </p>

                    <div className="text-[11px] text-indigo-400 flex items-center space-x-1">
                      <span>Action:</span>
                      <span className="text-slate-300">{comp.learningApproach}</span>
                    </div>
                  </div>
                ))}

                {/* Candidate Confirmation Card */}
                {activeAssessment.candidateConfirmationsRequired.map((conf) => (
                  <div key={conf.id} className={`p-4 rounded-2xl border space-y-2.5 ${
                    isBlack ? 'bg-indigo-950/20 border-indigo-800/40' : 'bg-indigo-50 border-indigo-200'
                  }`}>
                    <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400">
                      <HelpCircle className="w-4 h-4" />
                      <span>Candidate Confirmation Request: {conf.area}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{conf.prompt}</p>

                    <div className="flex items-center space-x-3 pt-1">
                      {candidateConfirmations[conf.id] ? (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1 font-mono">
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirmed in Fact Registry (Pending Audit)</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmCandidateSkill(conf.id, conf.area)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition shadow-xs"
                        >
                          I Have This Experience
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB D: SKILL GAP INTELLIGENCE
          ==================================================================== */}
      {activeTab === 'skills' && activeAssessment && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border space-y-2 ${
            isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              SKILL GAP INTELLIGENCE
            </span>
            <h2 className="text-xl font-bold">
              Classified Skill Requirements for {activeAssessment.targetRole}
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Every skill is mapped to concrete practical assignments, recommended projects, verified certification options, and required proof of proficiency.
            </p>
          </div>

          <div className="space-y-4">
            {[...activeAssessment.matchingCompetencies, ...activeAssessment.missingCompetencies].map((item, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-3xl border space-y-4 transition ${
                  isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-bold text-slate-100">{item.skill}</span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                      item.importance === 'essential'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : item.importance === 'important'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    }`}>
                      {item.importance}
                    </span>
                  </div>

                  <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                    item.gapLevel === 'None'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    Gap: {item.gapLevel}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase block font-semibold">WHY IT MATTERS</span>
                    <p className="text-slate-300 mt-1 leading-relaxed">{item.whyItMatters}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase block font-semibold">RECOMMENDED PROJECT</span>
                    <p className="text-slate-300 mt-1 leading-relaxed">{item.recommendedProject}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase block font-semibold">EVIDENCE NEEDED</span>
                    <p className="text-slate-300 mt-1 leading-relaxed">{item.evidenceNeeded}</p>
                  </div>
                </div>

                {item.certifications && item.certifications.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/50 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 text-[11px] font-mono">Verified Credential Options:</span>
                    {item.certifications.map((c, i) => (
                      <span key={i} className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono ${
                        isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.08)] text-slate-300' : 'bg-slate-100 border-slate-200'
                      }`}>
                        {c.name} ({c.provider})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB E: CAREER DEVELOPMENT ROADMAP
          ==================================================================== */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                ACTIONABLE DEVELOPMENT PLANNER
              </span>
              <h2 className="text-xl font-bold">Personalized Roadmap for {selectedTargetRole}</h2>
              <p className="text-xs text-slate-500">
                Prioritized milestones across 30-day, 90-day, 6-month, and 12-month development horizons.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-mono">Weekly Study Hours:</span>
              {[
                { hours: 4, label: '4h (Gradual)' },
                { hours: 6, label: '6h (Recommended)' },
                { hours: 10, label: '10h (Accelerated)' },
                { hours: 15, label: '15h (Intensive)' },
              ].map(opt => (
                <button
                  key={opt.hours}
                  type="button"
                  onClick={() => setWeeklyHours(opt.hours)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl font-medium cursor-pointer transition ${
                    weeklyHours === opt.hours
                      ? isBlack ? 'bg-[var(--be-accent,#C6A66A)] text-[#17130C] font-bold' : 'bg-blue-600 text-white'
                      : isBlack ? 'bg-[#191D23] text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Milestone Cards grouped by horizon */}
          {['30_day', '90_day', '6_month', '12_month'].map(horizonKey => {
            const label = horizonKey === '30_day' ? '30-Day Plan (Immediate & Foundational)'
              : horizonKey === '90_day' ? '90-Day Plan (Skill Development & Portfolio)'
              : horizonKey === '6_month' ? '6-Month Plan (Advanced Competencies & Projects)'
              : '12-Month Plan (Transition Prep & Opportunity Targeting)';

            const horizonMilestones = roadmapMilestones.filter(m => m.horizon === horizonKey);
            if (horizonMilestones.length === 0) return null;

            return (
              <div key={horizonKey} className="space-y-3">
                <div className="flex items-center space-x-2 pt-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                    {label}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">({horizonMilestones.length} Milestones)</span>
                </div>

                <div className="space-y-3">
                  {horizonMilestones.map(ms => {
                    const isDone = ms.status === 'completed';
                    return (
                      <div
                        key={ms.id}
                        className={`p-6 rounded-3xl border transition-all space-y-3.5 ${
                          isDone
                            ? isBlack ? 'bg-[#111317] border-emerald-900/40 opacity-90' : 'bg-emerald-50/40 border-emerald-200'
                            : isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center space-x-2.5">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                isDone ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
                              }`}>
                                {isDone ? <Check className="w-3.5 h-3.5" /> : ms.id.slice(-1)}
                              </span>
                              <h4 className="font-bold text-sm text-slate-100">{ms.title}</h4>
                            </div>

                            <p className="text-xs text-slate-400 pl-8 leading-relaxed">
                              <strong>Objective:</strong> {ms.objective}
                            </p>
                            <p className="text-xs text-slate-500 pl-8 leading-relaxed">
                              <strong>Rationale:</strong> {ms.reason}
                            </p>
                          </div>

                          <div className="flex items-center space-x-3 self-end sm:self-center pl-8 sm:pl-0">
                            <span className="text-xs font-mono text-slate-400 flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>~{ms.estimatedHours}h est.</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleMilestoneProgress(ms.id, isDone ? 'in_progress' : 'completed')}
                              className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition ${
                                isDone
                                  ? 'bg-emerald-500 text-white'
                                  : isBlack
                                  ? 'bg-[#191D23] hover:bg-[#222731] text-slate-200 border border-[rgba(255,255,255,0.12)]'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                            >
                              {isDone ? 'Completed' : 'Mark Completed'}
                            </button>
                          </div>
                        </div>

                        {/* Completion Criteria & Notes */}
                        <div className="pl-8 pt-2 border-t border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                          <div>
                            <span className="font-mono text-[10px] text-slate-500 uppercase">Completion Criteria:</span>{' '}
                            <span>{ms.completionCriteria}</span>
                          </div>

                          {ms.candidateNotes && (
                            <span className="text-[11px] text-amber-400 font-mono italic">
                              Note: {ms.candidateNotes}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====================================================================
          TAB F: MARKET AND SALARY INTELLIGENCE
          ==================================================================== */}
      {activeTab === 'market' && marketSnapshot && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border space-y-2 ${
            isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              MARKET DEMAND & SALARY INTELLIGENCE
            </span>
            <h2 className="text-xl font-bold">Labor Market Benchmarks: {marketSnapshot.targetRole}</h2>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Real-time vacancy volume, disclosed hiring ranges, remote availability, and geographic concentrations queried directly from the Global Career Discovery Engine.
            </p>
          </div>

          {/* 3 Metric Summary Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-3xl border space-y-2 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">ACTIVE LIVE VACANCIES</span>
              <div className="text-3xl font-bold font-mono text-emerald-400">
                {marketSnapshot.activeMatchingVacancies} Openings
              </div>
              <p className="text-xs text-slate-500">Greenhouse, Lever & verified aggregator feeds</p>
            </div>

            <div className={`p-6 rounded-3xl border space-y-2 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">DISCLOSED SALARY MEDIAN</span>
              <div className="text-3xl font-bold font-mono text-amber-400">
                ${(marketSnapshot.salaryIntelligence.median / 1000).toFixed(0)}k <span className="text-sm font-sans text-slate-400">/ Year</span>
              </div>
              <p className="text-xs text-slate-500">
                Range: ${(marketSnapshot.salaryIntelligence.min / 1000).toFixed(0)}k – ${(marketSnapshot.salaryIntelligence.max / 1000).toFixed(0)}k {marketSnapshot.salaryIntelligence.currency}
              </p>
            </div>

            <div className={`p-6 rounded-3xl border space-y-2 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">REMOTE CONCENTRATION</span>
              <div className="text-3xl font-bold font-mono text-indigo-400">
                {marketSnapshot.remotePercentage}%
              </div>
              <p className="text-xs text-slate-500">Global remote or hybrid flexibility</p>
            </div>
          </div>

          {/* Hiring Companies & Geographic Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`p-6 rounded-3xl border space-y-4 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-300">
                Top Hiring Companies
              </h3>
              <div className="flex flex-wrap gap-2">
                {marketSnapshot.topHiringCompanies.map((comp, idx) => (
                  <span key={idx} className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 ${
                    isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.08)] text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{comp}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className={`p-6 rounded-3xl border space-y-4 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-300">
                Data Sourcing & Freshness Transparency
              </h3>
              <div className="space-y-2 text-xs text-slate-400">
                <div>Source: <strong className="text-slate-200">{marketSnapshot.salaryIntelligence.source}</strong></div>
                <div>Freshness: <strong className="text-slate-200">{marketSnapshot.salaryIntelligence.dataFreshness}</strong></div>
                <div>Sample Size: <strong className="text-slate-200">{marketSnapshot.salaryIntelligence.sampleSize} Verified Records</strong></div>
                <div>Status Note: <strong className="text-slate-300">{marketSnapshot.salaryIntelligence.statusNote}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB G: QUALIFICATION & LEARNING PLANNER
          ==================================================================== */}
      {activeTab === 'learning' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border space-y-2 ${
            isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              QUALIFICATION & LEARNING RECOMMENDATION ENGINE
            </span>
            <h2 className="text-xl font-bold">Recommended Learning Resources for {selectedTargetRole}</h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Prioritized by Tier 1 (Free) to Tier 3 (Accredited Professional Certifications). No fabricated course titles or fake accreditation claims.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {learningResources.map((res) => (
              <div
                key={res.id}
                className={`p-6 rounded-3xl border space-y-4 flex flex-col justify-between ${
                  isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                      {res.type.toUpperCase()}
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {res.isFree ? '100% Free' : res.costEstimate || 'Low Cost'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-100">{res.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>Provider:</strong> {res.provider}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <strong>Skill Addressed:</strong> {res.skillAddressed}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>Expected Outcome:</strong> {res.expectedLearningOutcome}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/50 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">{res.durationEstimate}</span>
                  {res.officialUrl && (
                    <a
                      href={res.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                    >
                      <span>Official Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB H: CAREER SCENARIO LAB (WHAT-IF SIMULATION)
          ==================================================================== */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border space-y-2 ${
            isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              INTERACTIVE SCENARIO SIMULATION LAB
            </span>
            <h2 className="text-xl font-bold">Simulate Career Hypotheses Side-by-Side</h2>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Test what happens when you adjust target countries, remote preferences, weekly study hours, or acquire specific certifications. Changing assumptions here does not mutate your official Candidate Fact Registry.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulation Controls Form */}
            <div className={`p-6 rounded-3xl border space-y-4 lg:col-span-1 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-300">
                Simulation Parameters
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Target Direction:</label>
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {discoveredPaths.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setScenarioTargetRole(p.targetRole)}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          scenarioTargetRole === p.targetRole
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                            : isBlack
                              ? 'bg-[#191D23] border-[rgba(255,255,255,0.08)] text-slate-300 hover:border-[rgba(255,255,255,0.18)]'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {p.targetRole}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Target Country:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['United States', 'United Kingdom', 'Germany / EU', 'Canada', 'Global Remote'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setScenarioCountry(c)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          scenarioCountry === c
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                            : isBlack
                              ? 'bg-[#191D23] border-[rgba(255,255,255,0.08)] text-slate-300 hover:border-[rgba(255,255,255,0.18)]'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-semibold">Remote-Only Roles:</span>
                  <input
                    type="checkbox"
                    checked={scenarioRemoteOnly}
                    onChange={e => setScenarioRemoteOnly(e.target.checked)}
                    className="cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Career Priority:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: 'salary', label: 'Max Salary' },
                      { key: 'management', label: 'Management' },
                      { key: 'specialization', label: 'Specialist' },
                      { key: 'stability', label: 'Work-Life' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setScenarioPriority(opt.key as any)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-center transition-colors ${
                          scenarioPriority === opt.key
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                            : isBlack
                              ? 'bg-[#191D23] border-[rgba(255,255,255,0.08)] text-slate-300 hover:border-[rgba(255,255,255,0.18)]'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">
                    Weekly Study Hours: {scenarioHours}h/week
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={scenarioHours}
                    onChange={e => setScenarioHours(parseInt(e.target.value, 10))}
                    className="w-full cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Hypothetical Skills Added:</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {hypotheticalSkills.map((sk, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                        +{sk}
                      </span>
                    ))}
                  </div>
                  <div className="flex space-x-1">
                    <input
                      type="text"
                      placeholder="Add simulated skill..."
                      value={scenarioCustomSkill}
                      onChange={e => setScenarioCustomSkill(e.target.value)}
                      className={`flex-1 p-1.5 rounded-lg border text-xs ${
                        isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.12)] text-[#F2F0EA]' : 'bg-white border-slate-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (scenarioCustomSkill.trim()) {
                          setHypotheticalSkills(prev => [...prev, scenarioCustomSkill.trim()]);
                          setScenarioCustomSkill('');
                        }
                      }}
                      className="px-2 py-1 bg-slate-700 text-white rounded-lg text-xs cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={runScenarioSimulation}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer transition ${
                    isBlack ? 'bg-[var(--be-accent,#C6A66A)] text-[#17130C]' : 'bg-blue-600 text-white'
                  }`}
                >
                  Recalculate Scenario
                </button>
              </div>
            </div>

            {/* Simulation Results Output */}
            <div className={`p-6 rounded-3xl border space-y-4 lg:col-span-2 ${
              isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-300">
                Projected Transition Feasibility
              </h3>

              {scenarioResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className={`p-3.5 rounded-2xl border ${isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] font-mono text-slate-400 block font-bold">PROJECTED ALIGNMENT</span>
                      <strong className="text-xl font-mono text-emerald-400">{scenarioResult.projectedSkillAlignment}%</strong>
                    </div>
                    <div className={`p-3.5 rounded-2xl border ${isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] font-mono text-slate-400 block font-bold">ESTIMATED PREP</span>
                      <strong className="text-xl font-mono text-amber-400">{scenarioResult.projectedTransitionMonths} Mo.</strong>
                    </div>
                    <div className={`p-3.5 rounded-2xl border ${isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] font-mono text-slate-400 block font-bold">MARKET VACANCIES</span>
                      <strong className="text-xl font-mono text-indigo-400">{scenarioResult.marketOpportunityCount}</strong>
                    </div>
                    <div className={`p-3.5 rounded-2xl border ${isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] font-mono text-slate-400 block font-bold">OVERALL SCORE</span>
                      <strong className="text-xl font-mono text-emerald-400">{scenarioResult.overallScenarioFeasibilityScore}/100</strong>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                    isBlack ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">AI SIMULATION BRIEF</span>
                    <p className="text-slate-300 leading-relaxed">{scenarioResult.explanation}</p>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">Run simulation to view projected results.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB I: OPPORTUNITY MAPPING
          ==================================================================== */}
      {activeTab === 'opportunities' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border space-y-2 ${
            isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              LIVE OPPORTUNITY MAPPING (GCDE INTEGRATION)
            </span>
            <h2 className="text-xl font-bold">Open Vacancies Aligned with {selectedTargetRole}</h2>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Distinguishing roles you can target right now vs roles requiring additional milestones. Direct employer application URLs provided.
            </p>
          </div>

          <div className="space-y-4">
            {opportunityItems.map((opp) => (
              <div
                key={opp.id}
                className={`p-6 rounded-3xl border transition-all space-y-3.5 ${
                  isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        opp.opportunityTier === 'target_now'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : opp.opportunityTier === 'requires_prep'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                      }`}>
                        {opp.opportunityTier === 'target_now' ? 'TARGET NOW' : opp.opportunityTier === 'requires_prep' ? 'REQUIRES PREP' : 'ASPIRATIONAL'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">· {opp.company}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100 mt-1">{opp.title}</h3>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-base font-bold font-mono text-emerald-400">{opp.matchScore}% Match</span>
                    <a
                      href={opp.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition ${
                        isBlack ? 'bg-[var(--be-accent,#C6A66A)] text-[#17130C]' : 'bg-blue-600 text-white'
                      }`}
                    >
                      <span>Apply on Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">Location / Compensation:</span>
                    <span>{opp.location} {opp.isRemote ? '(Remote)' : ''} {opp.salaryFormatted ? `· ${opp.salaryFormatted}` : ''}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">Match Reasons:</span>
                    <span>{opp.matchReasons.join(' · ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB J: CAREER PROGRESS TRACKER
          ==================================================================== */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border space-y-2 ${
            isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              PERSISTED CAREER PROGRESS TRACKER
            </span>
            <h2 className="text-xl font-bold">Logged Career Milestones & Evidence Feed</h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Real-time audit log of completed roadmap steps, verified skills, and career achievements.
            </p>
          </div>

          <div className="space-y-3">
            {progressEvents.map((evt) => (
              <div
                key={evt.id}
                className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
                  isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200'
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-slate-200">{evt.title}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(evt.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">{evt.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB K: INTERACTIVE CAREER VISUALIZATION & MAP
          ==================================================================== */}
      {activeTab === 'map' && (
        <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
          isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)]' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                INTERACTIVE CAREER TRANSITION MAP
              </span>
              <h2 className="text-lg font-bold">Multi-Track Skill Bridges & Transition Nodes</h2>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setMapViewMode('graph')}
                className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
                  mapViewMode === 'graph' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Graph Projection
              </button>
              <button
                type="button"
                onClick={() => setMapViewMode('table')}
                className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
                  mapViewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Accessible List View
              </button>
            </div>
          </div>

          {mapViewMode === 'graph' ? (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 overflow-x-auto">
              <svg viewBox="0 0 880 340" className="w-full min-w-[750px] h-auto">
                <defs>
                  <linearGradient id="bridgeGradientAtlas" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>

                {/* Connecting Lines */}
                <line x1="160" y1="170" x2="440" y2="90" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="160" y1="170" x2="440" y2="170" stroke="#6366f1" strokeWidth="2.5" />
                <line x1="160" y1="170" x2="440" y2="250" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />

                <line x1="440" y1="90" x2="720" y2="170" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="440" y1="170" x2="720" y2="170" stroke="#10b981" strokeWidth="2.5" />
                <line x1="440" y1="250" x2="720" y2="170" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />

                {/* Current Node */}
                <g transform="translate(160, 170)" className="cursor-pointer" onClick={() => setInspectedNode({ type: 'current', title: profile?.currentTitle || 'Current Position' })}>
                  <circle r="46" fill="#1e1b4b" stroke="#6366f1" strokeWidth="3" />
                  <text textAnchor="middle" y="-6" fill="#e0e7ff" fontSize="11" fontWeight="bold">CURRENT</text>
                  <text textAnchor="middle" y="10" fill="#a5b4fc" fontSize="9" fontWeight="medium">
                    {profile?.currentTitle?.slice(0, 14) || 'Senior Process'}
                  </text>
                </g>

                {/* Bridge 1: Transferable */}
                <g transform="translate(440, 90)" className="cursor-pointer" onClick={() => setInspectedNode({ type: 'bridge', title: 'Transferable Competencies' })}>
                  <rect x="-90" y="-24" width="180" height="48" rx="14" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                  <text textAnchor="middle" y="-4" fill="#cbd5e1" fontSize="10" fontWeight="bold">TRANSFERABLE</text>
                  <text textAnchor="middle" y="10" fill="#94a3b8" fontSize="9">
                    Supply Chain & Operations
                  </text>
                </g>

                {/* Bridge 2: Core Competency */}
                <g transform="translate(440, 170)" className="cursor-pointer" onClick={() => setInspectedNode({ type: 'bridge', title: 'Core Enterprise Competency' })}>
                  <rect x="-90" y="-24" width="180" height="48" rx="14" fill="#0f172a" stroke="#6366f1" strokeWidth="2" />
                  <text textAnchor="middle" y="-4" fill="#a5b4fc" fontSize="10" fontWeight="bold">CORE COMPETENCY</text>
                  <text textAnchor="middle" y="10" fill="#94a3b8" fontSize="9">
                    ERP Systems & Process
                  </text>
                </g>

                {/* Bridge 3: Skill To Strengthen */}
                <g transform="translate(440, 250)" className="cursor-pointer" onClick={() => setInspectedNode({ type: 'bridge', title: 'Skills to Strengthen' })}>
                  <rect x="-90" y="-24" width="180" height="48" rx="14" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
                  <text textAnchor="middle" y="-4" fill="#fcd34d" fontSize="10" fontWeight="bold">TO STRENGTHEN</text>
                  <text textAnchor="middle" y="10" fill="#94a3b8" fontSize="9">
                    Executive Stakeholders
                  </text>
                </g>

                {/* Target Node */}
                <g transform="translate(720, 170)" className="cursor-pointer" onClick={() => setInspectedNode({ type: 'target', title: selectedTargetRole })}>
                  <circle r="48" fill="#064e3b" stroke="#10b981" strokeWidth="3" />
                  <text textAnchor="middle" y="-6" fill="#d1fae5" fontSize="11" fontWeight="bold">TARGET</text>
                  <text textAnchor="middle" y="10" fill="#6ee7b7" fontSize="9" fontWeight="medium">
                    {selectedTargetRole.slice(0, 16)}
                  </text>
                </g>
              </svg>
            </div>
          ) : (
            /* Accessible List View */
            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-1">
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">Starting Node</span>
                <h4 className="font-bold text-slate-100">{profile?.currentTitle || 'Current Position'}</h4>
                <p className="text-xs text-slate-400">{verifiedExpYears} Verified Years · {verifiedSkillsCount} Skills</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-1">
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Transferable & Bridging Skills</span>
                <h4 className="font-bold text-slate-100">Supply Chain Operations, ERP Systems, Process Optimization</h4>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-1">
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Destination Target Role</span>
                <h4 className="font-bold text-slate-100">{selectedTargetRole}</h4>
                <p className="text-xs text-slate-400">{activeAssessment?.overallReadinessScore}% Evidence-Backed Alignment</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper for icon
const LayoutDashboardIcon = (props: { className?: string }) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="3" y="3" width="7" height="9" rx="1" strokeWidth="2" />
    <rect x="14" y="3" width="7" height="5" rx="1" strokeWidth="2" />
    <rect x="14" y="12" width="7" height="9" rx="1" strokeWidth="2" />
    <rect x="3" y="16" width="7" height="5" rx="1" strokeWidth="2" />
  </svg>
);
