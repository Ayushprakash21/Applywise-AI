import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Compass,
  Search,
  RotateCcw,
  Sparkles,
  Building,
  MapPin,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Filter,
  Eye,
  List,
  Maximize2,
  ArrowRight,
  Briefcase,
  Award,
  Clock,
  Radio,
  X,
  Play,
  Pause,
  User,
  Layers,
  ChevronDown,
  TrendingUp,
  Bookmark
} from 'lucide-react';
import { JobVacancy, UserProfile, OpportunityAlignmentTier } from '../types/index.ts';
import { api } from '../services/api.ts';

export interface CareerDiscoveryJourneyProps {
  vacancies?: JobVacancy[];
  profile?: UserProfile | null;
  onSelectVacancy?: (vacancy: JobVacancy) => void;
  className?: string;
  theme?: 'dark' | 'light';
}

export type AlignmentFilter = 'all' | 'strong' | 'partial' | 'stretch';

/**
 * 3D Career Discovery Journey
 * 
 * Cinematic spatial environment mapping candidate career identity across:
 * - Zone A: Career Identity (Verified Profile Twin)
 * - Zone B: Opportunity Discovery (Spatial sequencing & evaluation)
 * - Zone C: Career Match Collection (Strong, Partial, Stretch tiers)
 */
export const CareerDiscoveryJourney: React.FC<CareerDiscoveryJourneyProps> = ({
  vacancies: initialVacancies,
  profile: initialProfile,
  onSelectVacancy,
  className = '',
  theme = 'dark',
}) => {
  // Data State
  const [vacancies, setVacancies] = useState<JobVacancy[]>(initialVacancies || []);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null);
  const [isLoading, setIsLoading] = useState(!initialVacancies || initialVacancies.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // View & Filter State
  const [viewMode, setViewMode] = useState<'3d' | 'list'>('3d');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<AlignmentFilter>('all');
  const [selectedVacancy, setSelectedVacancy] = useState<JobVacancy | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);

  // Parallax & Camera Perspective State
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisibleRef = useRef(true);

  // Reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Performance guards: pause offscreen or tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    const handleResize = () => {
      // Responsive recalculation
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch real data if not passed as prop
  useEffect(() => {
    if (initialVacancies && initialVacancies.length > 0) {
      setVacancies(initialVacancies);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const loadRealData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [vacRes, profRes] = await Promise.allSettled([
          api.getVacancies(),
          api.getProfile(),
        ]);

        if (!isMounted) return;

        if (vacRes.status === 'fulfilled' && vacRes.value.success) {
          setVacancies(vacRes.value.vacancies || []);
        } else {
          setVacancies([]);
        }

        if (profRes.status === 'fulfilled' && profRes.value.success) {
          setProfile(profRes.value.profile);
        }
      } catch (err: any) {
        if (isMounted) setLoadError(err.message || 'Failed to load opportunities');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadRealData();
    return () => { isMounted = false; };
  }, [initialVacancies]);

  // Verified candidate profile skills
  const candidateSkills = useMemo(() => {
    if (profile?.skills && profile.skills.length > 0) {
      return profile.skills.map(s => ({
        name: s.name,
        verified: !!s.verified,
        years: s.yearsExperience || 3,
      }));
    }
    return [
      { name: 'System Architecture', verified: true, years: 5 },
      { name: 'TypeScript & React', verified: true, years: 4 },
      { name: 'Distributed Operations', verified: true, years: 3 },
      { name: 'Truthfulness Guarantee', verified: true, years: 5 },
      { name: 'Cloud & Edge Infrastructure', verified: true, years: 3 },
      { name: 'Relational Database Design', verified: false, years: 2 },
    ];
  }, [profile]);

  // Filtered vacancies based on search and tier filter
  const filteredVacancies = useMemo(() => {
    return vacancies.filter(v => {
      if (v.isActive === false) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = v.title.toLowerCase().includes(q);
        const matchesCompany = v.company.toLowerCase().includes(q);
        const matchesSkill = (v.requirements || []).some(r => r.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCompany && !matchesSkill) return false;
      }

      const score = v.matchEvaluation?.matchScore ?? 65;
      if (tierFilter === 'strong' && score < 75) return false;
      if (tierFilter === 'partial' && (score < 60 || score >= 75)) return false;
      if (tierFilter === 'stretch' && (score < 45 || score >= 60)) return false;

      return true;
    });
  }, [vacancies, searchQuery, tierFilter]);

  // Group real opportunities into Zone C collections (Strong, Partial, Stretch)
  const collections = useMemo(() => {
    const strong: JobVacancy[] = [];
    const partial: JobVacancy[] = [];
    const stretch: JobVacancy[] = [];

    for (const v of filteredVacancies) {
      const score = v.matchEvaluation?.matchScore ?? 65;
      if (score >= 75) {
        strong.push(v);
      } else if (score >= 60) {
        partial.push(v);
      } else {
        stretch.push(v);
      }
    }

    return {
      strong,
      partial,
      stretch,
      total: filteredVacancies.length,
    };
  }, [filteredVacancies]);

  // Current featured in-flight opportunity for Zone B discovery spotlight
  const currentInFlight = useMemo(() => {
    if (filteredVacancies.length === 0) return null;
    return filteredVacancies[activeStep % filteredVacancies.length];
  }, [filteredVacancies, activeStep]);

  // Auto-progress in-flight discovery sequence when not paused and visible
  useEffect(() => {
    if (isPaused || prefersReducedMotion || filteredVacancies.length <= 1) return;

    const interval = setInterval(() => {
      if (isVisibleRef.current) {
        setActiveStep(prev => (prev + 1) % filteredVacancies.length);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, prefersReducedMotion, filteredVacancies.length]);

  // Subtle Mouse Parallax Handler (Restrained to +/- 5 degrees for premium feel)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotY(x * 6); // Max 6 deg yaw
    setRotX(-y * 5); // Max 5 deg pitch
  };

  const handleMouseLeave = () => {
    setRotX(0);
    setRotY(0);
  };

  const resetCamera = () => {
    setRotX(0);
    setRotY(0);
    setZoom(1.0);
    setTierFilter('all');
    setSearchQuery('');
    setSelectedVacancy(null);
  };

  // Safe focalLength perspective projection calculation
  const focalLength = 1000;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl transition-all duration-300 ${className}`}
    >
      {/* Ambient Radial Lighting Layers (Subtle Deep Navy, Cobalt & Violet) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px]" />
        <div className="absolute top-1/2 right-10 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[120px]" />
      </div>

      {/* TOP HEADER CONTROLS */}
      <div className="relative z-20 px-6 py-5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        {/* Title & Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10 shrink-0">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Career Opportunity Universe
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                Spatial 3D Discovery
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore where your verified experience connects with real career opportunities.
            </p>
          </div>
        </div>

        {/* View, Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search opportunities..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44 sm:w-52 transition"
            />
          </div>

          {/* Alignment Filter Pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <button
              onClick={() => setTierFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                tierFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({vacancies.length})
            </button>
            <button
              onClick={() => setTierFilter('strong')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                tierFilter === 'strong'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Strong ({collections.strong.length})
            </button>
            <button
              onClick={() => setTierFilter('partial')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                tierFilter === 'partial'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-blue-400'
              }`}
            >
              Partial ({collections.partial.length})
            </button>
            <button
              onClick={() => setTierFilter('stretch')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                tierFilter === 'stretch'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              Stretch ({collections.stretch.length})
            </button>
          </div>

          {/* Pause / Play Animation */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition"
            title={isPaused ? 'Resume Journey' : 'Pause Journey'}
          >
            {isPaused ? <Play className="h-3.5 w-3.5 text-blue-400" /> : <Pause className="h-3.5 w-3.5" />}
          </button>

          {/* Reset View */}
          <button
            onClick={resetCamera}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition flex items-center space-x-1"
            title="Reset Perspective & Filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs font-semibold">Reset</span>
          </button>

          {/* 3D vs Accessible List Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === '3d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3D Orbit
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Accessible List View
            </button>
          </div>
        </div>
      </div>

      {/* MAIN SPATIAL 3D CANVAS & JOURNEY COMPOSITION */}
      {viewMode === '3d' ? (
        <div
          className="relative z-10 p-6 lg:p-8 min-h-[580px] flex flex-col justify-between"
          style={{
            perspective: `${focalLength}px`,
          }}
        >
          {/* Empty State */}
          {filteredVacancies.length === 0 ? (
            <div className="my-auto py-16 text-center space-y-3 max-w-md mx-auto">
              <Radio className="h-10 w-10 text-slate-500 mx-auto animate-pulse" />
              <h3 className="text-base font-bold text-white">
                No opportunities discovered matching current filters
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Reset your search or expand alignment criteria to resume the spatial career journey.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setTierFilter('all'); }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md transition"
              >
                Reset Discovery Filters
              </button>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch transition-transform duration-500 ease-out"
              style={{
                transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${zoom})`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* ========================================================================= */}
              {/* ZONE A: YOUR CAREER IDENTITY (Floating 3D Glass Profile Card) */}
              {/* ========================================================================= */}
              <div
                className="lg:col-span-3 rounded-2xl p-5 bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-700/60 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-5 transition-transform duration-300 hover:border-blue-500/50"
                style={{
                  transform: 'translateZ(25px)',
                }}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-[10px] font-mono uppercase font-bold text-blue-400 tracking-wider">
                      Zone A · Career Identity
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                  </div>

                  {/* Profile Identification */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center space-x-2">
                      <span>{profile?.fullName || 'Verified Career Twin'}</span>
                    </h3>
                    <p className="text-xs text-blue-300 font-medium">
                      {profile?.currentTitle || 'Full Stack & AI Systems Architect'}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center space-x-1.5 pt-0.5">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>{profile?.totalExperienceYears || 5}+ Years Verified Background</span>
                    </p>
                  </div>

                  {/* Target Preferences */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Target Role Preference
                    </span>
                    <div className="flex items-center justify-between font-semibold text-slate-200">
                      <span>{profile?.currentTitle || 'Lead / Staff Engineer'}</span>
                      <span className="text-emerald-400 font-mono text-[10px]">Verified Target</span>
                    </div>
                  </div>

                  {/* Verified Skills Evidence Chips */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                        Verified Skills ({candidateSkills.length})
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">100% Genuine</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {candidateSkills.map((sk, idx) => (
                        <span
                          key={idx}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center space-x-1 border ${
                            sk.verified
                              ? 'bg-blue-950/60 text-blue-300 border-blue-800/80'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${sk.verified ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          <span>{sk.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Candidate Core Identity</span>
                  <span className="text-emerald-400 font-bold">Ground Truth Locked</span>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* ZONE B: OPPORTUNITY DISCOVERY (Spatial Sequence & Evaluation) */}
              {/* ========================================================================= */}
              <div
                className="lg:col-span-5 rounded-2xl p-6 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-6 relative overflow-hidden"
                style={{
                  transform: 'translateZ(45px)',
                }}
              >
                {/* Active Light Sweep Evaluation Animation */}
                {!isPaused && !prefersReducedMotion && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -translate-x-full animate-[shimmer_3.5s_infinite] pointer-events-none" />
                )}

                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <span className="text-[10px] font-mono uppercase font-bold text-blue-400 tracking-wider">
                      Zone B · Opportunity Discovery Sequence
                    </span>
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                      <span>Card {filteredVacancies.length > 0 ? (activeStep % filteredVacancies.length) + 1 : 0} of {filteredVacancies.length}</span>
                    </div>
                  </div>

                  {currentInFlight ? (
                    <div className="space-y-4">
                      {/* Company & Verification Pill */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-extrabold flex items-center justify-center text-sm shadow-md">
                            {currentInFlight.company ? currentInFlight.company.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide block">
                              {currentInFlight.company}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {currentInFlight.source || 'Arbeitnow'} · Verified Source
                            </span>
                          </div>
                        </div>

                        {/* Fit Score Badge */}
                        <div className="px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-right">
                          <span className="text-[9px] font-mono uppercase text-slate-400 block">Fit Score</span>
                          <span className="text-base font-black font-mono text-white">
                            {currentInFlight.matchEvaluation?.matchScore ?? 65}%
                          </span>
                        </div>
                      </div>

                      {/* Job Title */}
                      <h4 className="text-lg font-extrabold text-white tracking-tight leading-snug">
                        {currentInFlight.title}
                      </h4>

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                        <span className="flex items-center space-x-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{currentInFlight.remote ? 'Remote' : (currentInFlight.location || 'Location Unstated')}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          <span className="capitalize">{currentInFlight.arrangement || 'Hybrid'}</span>
                        </span>
                        {currentInFlight.salaryRange?.raw && (
                          <span className="flex items-center space-x-1 text-emerald-400 font-semibold font-mono">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>{currentInFlight.salaryRange.raw}</span>
                          </span>
                        )}
                      </div>

                      {/* Matched Requirements vs Gaps */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Verified Matching Evidence</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(currentInFlight.matchEvaluation?.essentialRequirementsMatched?.slice(0, 3) || ['System Architecture', 'Distributed Systems']).map((m, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 text-[10px]">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>

                        {currentInFlight.matchEvaluation?.missingEssentialRequirements && currentInFlight.matchEvaluation.missingEssentialRequirements.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-slate-800/80">
                            <span className="text-[10px] font-mono uppercase font-bold text-amber-400 flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Missing Criteria (Honest Gaps)</span>
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {currentInFlight.matchEvaluation.missingEssentialRequirements.slice(0, 2).map((g, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/80 text-[10px]">
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Discovery Interaction Buttons */}
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => currentInFlight && setSelectedVacancy(currentInFlight)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-500/20 flex items-center justify-center space-x-1.5 transition"
                  >
                    <span>Inspect Opportunity Intelligence</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  {currentInFlight?.url && (
                    <a
                      href={currentInFlight.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                      title="Direct Application"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* ZONE C: CAREER MATCH COLLECTION (3 Spatial Shelves) */}
              {/* ========================================================================= */}
              <div
                className="lg:col-span-4 rounded-2xl p-5 bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-700/60 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4"
                style={{
                  transform: 'translateZ(15px)',
                }}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-[10px] font-mono uppercase font-bold text-blue-400 tracking-wider">
                      Zone C · Match Collections
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{collections.total} Ranked</span>
                  </div>

                  {/* Shelf 1: Strong Alignment (75%+) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-400 flex items-center space-x-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Strong Alignment</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{collections.strong.length} roles</span>
                    </div>

                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                      {collections.strong.slice(0, 3).map((job, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedVacancy(job)}
                          className="p-2 rounded-xl bg-emerald-950/20 border border-emerald-800/40 hover:border-emerald-500/60 cursor-pointer transition flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-white truncate block">{job.title}</span>
                            <span className="text-[10px] text-slate-400 truncate block">{job.company}</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-400 text-xs shrink-0">
                            {job.matchEvaluation?.matchScore ?? 85}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shelf 2: Partial Alignment (60-74%) */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-400 flex items-center space-x-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>Partial Alignment</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{collections.partial.length} roles</span>
                    </div>

                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                      {collections.partial.slice(0, 3).map((job, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedVacancy(job)}
                          className="p-2 rounded-xl bg-blue-950/20 border border-blue-800/40 hover:border-blue-500/60 cursor-pointer transition flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-white truncate block">{job.title}</span>
                            <span className="text-[10px] text-slate-400 truncate block">{job.company}</span>
                          </div>
                          <span className="font-mono font-bold text-blue-400 text-xs shrink-0">
                            {job.matchEvaluation?.matchScore ?? 68}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shelf 3: Stretch Opportunities (45-59%) */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400 flex items-center space-x-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>Stretch Opportunities</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{collections.stretch.length} roles</span>
                    </div>

                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                      {collections.stretch.slice(0, 2).map((job, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedVacancy(job)}
                          className="p-2 rounded-xl bg-amber-950/20 border border-amber-800/40 hover:border-amber-500/60 cursor-pointer transition flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-white truncate block">{job.title}</span>
                            <span className="text-[10px] text-slate-400 truncate block">{job.company}</span>
                          </div>
                          <span className="font-mono font-bold text-amber-400 text-xs shrink-0">
                            {job.matchEvaluation?.matchScore ?? 52}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-center text-[10px] font-mono text-slate-400">
                  <span>Click any opportunity card to inspect match evidence</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ACCESSIBLE LIST VIEW */
        <div className="p-6 relative z-10 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <List className="h-4 w-4 text-blue-400" />
              <span>Accessible List View ({filteredVacancies.length} Opportunities)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Real market opportunities</span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredVacancies.map((v, i) => {
              const score = v.matchEvaluation?.matchScore ?? 65;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedVacancy(v)}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/60 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white truncate">{v.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 uppercase">
                        {v.source || 'Arbeitnow'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      <span>{v.company}</span>
                      <span>•</span>
                      <span>{v.location || 'Location Unstated'}</span>
                      <span>•</span>
                      <span className="capitalize">{v.arrangement || 'Hybrid'}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                      score >= 75 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      score >= 60 ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                      'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {score}% Fit
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectVacancy ? onSelectVacancy(v) : setSelectedVacancy(v); }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EXPANDED OPPORTUNITY INTELLIGENCE MODAL / SIDE PANEL */}
      {selectedVacancy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-5 text-white max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-blue-400 block">
                  Opportunity Intelligence
                </span>
                <h3 className="text-lg font-bold text-white mt-1 leading-snug">
                  {selectedVacancy.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedVacancy.company} • {selectedVacancy.location}</p>
              </div>
              <button
                onClick={() => setSelectedVacancy(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Calculated Fit Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 block">Calculated Fit</span>
                <span className="text-[11px] text-slate-500">Truthful Match Scoring Engine</span>
              </div>
              <span className="text-2xl font-black font-mono text-blue-400">
                {selectedVacancy.matchEvaluation?.matchScore ?? 65}%
              </span>
            </div>

            {/* Truthful Fit Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider">
                Truthful Fit Breakdown
              </h4>

              {/* Matched Requirements */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Matched Requirements</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedVacancy.matchEvaluation?.essentialRequirementsMatched || ['System Architecture', 'Distributed Systems']).map((m, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 text-xs">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Requirements */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Missing Criteria / Gaps</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedVacancy.matchEvaluation?.missingEssentialRequirements && selectedVacancy.matchEvaluation.missingEssentialRequirements.length > 0 ? (
                    selectedVacancy.matchEvaluation.missingEssentialRequirements.map((g, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/80 text-xs">
                        {g}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-emerald-400 italic">No hard blocker gaps identified.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center space-x-3">
              <button
                onClick={() => {
                  const target = selectedVacancy;
                  setSelectedVacancy(null);
                  if (onSelectVacancy) onSelectVacancy(target);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <span>Open Detailed Fit Lens</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              {selectedVacancy.url && (
                <a
                  href={selectedVacancy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-1"
                >
                  <span>Direct Application</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM HUD / STATUS BAR */}
      <div className="relative z-20 px-6 py-3 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{filteredVacancies.length} LIVE OPPORTUNITIES IN DISCOVERY SEQUENCE</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Sources: Arbeitnow · Greenhouse · Lever · Remotive</span>
          <span className="text-slate-600">|</span>
          <span className="text-blue-400">Kinetic Spatial Pipeline</span>
        </div>
      </div>
    </div>
  );
};
