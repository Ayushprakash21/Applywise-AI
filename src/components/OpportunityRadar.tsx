import React, { useState, useEffect } from 'react';
import {
  Radio,
  Clock,
  Building,
  MapPin,
  DollarSign,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Target,
  List,
  Orbit,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Scale,
  XCircle,
  Eye,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Globe
} from 'lucide-react';
import { JobVacancy, OpportunitySignal, UserProfile } from '../types/index.ts';
import { api } from '../services/api.ts';
import { JobComparisonDrawer } from './JobComparisonDrawer.tsx';

export interface OpportunityRadarProps {
  vacancies: JobVacancy[];
  profile?: UserProfile | null;
  onSelectVacancy: (vacancy: JobVacancy) => void;
  onRefreshLiveJobs?: () => Promise<void>;
  onPrepareApplication?: (vacancyId: string) => Promise<any> | void;
  plan?: 'free' | 'pro' | 'black';
  className?: string;
}

export const OpportunityRadar: React.FC<OpportunityRadarProps> = ({
  vacancies,
  profile,
  onSelectVacancy,
  onRefreshLiveJobs,
  plan = 'free',
  className = '',
}) => {
  const isBlack = plan === 'black';

  // View & Filter State
  const [viewMode, setViewMode] = useState<'dossier' | 'signals' | 'spatial'>('dossier');
  const [filterMode, setFilterMode] = useState<'all' | 'high_match' | 'remote' | 'salary' | 'visa'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hiring Signals State
  const [signals, setSignals] = useState<OpportunitySignal[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(false);

  // Saved / Monitored Vacancies State
  const [savedVacancyIds, setSavedVacancyIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('applyvise_saved_vacancies');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [dismissedVacancyIds, setDismissedVacancyIds] = useState<Set<string>>(new Set());

  // Comparison State
  const [compareList, setCompareList] = useState<JobVacancy[]>([]);
  const [showCompareDrawer, setShowCompareDrawer] = useState(false);

  // Load Verifiable Hiring Signals
  useEffect(() => {
    const loadSignals = async () => {
      try {
        setIsLoadingSignals(true);
        const res = await api.getOpportunitySignals();
        if (res.success && res.signals) {
          setSignals(res.signals);
        }
      } catch (err) {
        console.error('Failed to load hiring signals:', err);
      } finally {
        setIsLoadingSignals(false);
      }
    };
    loadSignals();
  }, []);

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedVacancyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('applyvise_saved_vacancies', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const dismissVacancy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedVacancyIds(prev => new Set(prev).add(id));
  };

  const toggleCompare = (v: JobVacancy, e: React.MouseEvent) => {
    e.stopPropagation();
    if (compareList.some(item => item.id === v.id)) {
      setCompareList(compareList.filter(item => item.id !== v.id));
    } else {
      if (compareList.length >= 2) {
        setCompareList([compareList[1], v]);
      } else {
        setCompareList([...compareList, v]);
      }
    }
  };

  const handleRefresh = async () => {
    if (!onRefreshLiveJobs || isRefreshing) return;
    try {
      setIsRefreshing(true);
      await onRefreshLiveJobs();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter Out Dismissed and Deduplicate
  const uniqueVacancies = vacancies.filter((v, idx, arr) => {
    if (dismissedVacancyIds.has(v.id)) return false;
    // Deduplicate by company + title
    return arr.findIndex(other =>
      other.company?.toLowerCase() === v.company?.toLowerCase() &&
      other.title?.toLowerCase() === v.title?.toLowerCase()
    ) === idx;
  });

  const filteredVacancies = uniqueVacancies.filter(v => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = v.title?.toLowerCase().includes(q);
      const matchComp = v.company?.toLowerCase().includes(q);
      const matchSkill = (v.requiredSkills || []).some(s => s.toLowerCase().includes(q));
      if (!matchTitle && !matchComp && !matchSkill) return false;
    }

    // Filter mode
    if (filterMode === 'high_match') {
      return (v.matchEvaluation?.matchScore || 0) >= 70;
    }
    if (filterMode === 'remote') {
      return v.remote || v.workArrangement === 'remote' || v.arrangement === 'remote';
    }
    if (filterMode === 'salary') {
      return Boolean(v.salaryRange?.min || v.salaryRange?.raw);
    }
    if (filterMode === 'visa') {
      return (v as any).visaSponsorshipRequired || v.matchEvaluation?.sponsorshipStatus === 'supported';
    }
    return true;
  });

  const formatFreshness = (iso?: string) => {
    if (!iso) return 'Verified recently';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `Active · Verified ${Math.max(1, diffHours)}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 7) return `Active · ${diffDays}d ago`;
    return 'Cached listing';
  };

  return (
    <div className={`space-y-8 animate-in fade-in duration-300 ${className}`}>
      {/* 1. Header & Radar Controls */}
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
                  : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-800/40'
              }`}>
                MARKET MONITORING & DISCOVERY
              </span>
              <span className="text-xs text-slate-400 font-mono">· {uniqueVacancies.length} Monitored Openings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Opportunity Radar
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Real-time vacancy discovery through verified employer endpoints and corporate expansion monitors. Algorithmic alignment grounded in candidate facts.
            </p>
          </div>

          {/* Action Tools: Refresh & View Toggle */}
          <div className="flex items-center space-x-3">
            {onRefreshLiveJobs && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing Feeds...' : 'Refresh Feeds'}</span>
              </button>
            )}

            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setViewMode('dossier')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === 'dossier'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Accessible List View</span>
              </button>
              <button
                onClick={() => setViewMode('spatial')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === 'spatial'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>3D Spatial Radar</span>
              </button>
              <button
                onClick={() => setViewMode('signals')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === 'signals'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Hiring Signals ({signals.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Operational Guarantee Bar & Provenance */}
        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Direct Feed</span>
            </span>
            <span>Synchronized every 10 min via automated Cloudflare Edge Cron</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-slate-600 dark:text-slate-400">Verified Match Evidence</span>
            <span>·</span>
            <span>Stale & expired postings automatically purged</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter by title, company, or verified competency..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Openings' },
              { id: 'high_match', label: 'High Match (70%+)' },
              { id: 'remote', label: 'Remote Only' },
              { id: 'salary', label: 'Salary Disclosed' },
              { id: 'visa', label: 'Visa Sponsorship' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  filterMode === f.id
                    ? isBlack ? 'bg-amber-400 text-black' : 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Hiring Signals View */}
      {viewMode === 'signals' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200/60 dark:border-cyan-800/40 text-xs text-cyan-900 dark:text-cyan-300 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 mt-0.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <p className="leading-relaxed">
              <strong>Verifiable Market Signals Policy:</strong> Signals represent corporate press releases, new office expansions, and public hiring initiatives. Inferred hiring signals are never labeled as confirmed job openings without a corresponding verified listing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {signals.map(sig => (
              <div
                key={sig.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                  isBlack ? 'bg-[#090D14]/80 border-amber-500/20' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center space-x-1.5">
                      <Building className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{sig.company}</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                      {sig.signalType.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {sig.headline}
                  </h3>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {sig.relevanceExplanation}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px] space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{sig.location}</span>
                    </span>
                    <span>{sig.publishedDate}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 font-mono text-[10px]">
                      Source: {sig.sourceName}
                    </span>
                    <a
                      href={sig.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-semibold inline-flex items-center space-x-1 hover:underline"
                    >
                      <span>Read Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Opportunity Dossier View */}
      {viewMode === 'dossier' && (
        <div className="space-y-4">
          {filteredVacancies.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400 space-y-3">
              <Radio className="w-8 h-8 mx-auto text-slate-400 animate-pulse" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No vacancies matching criteria</div>
              <p className="max-w-md mx-auto leading-relaxed">
                Try widening your search keywords, resetting filters, or clicking "Refresh Feeds" to query active employer endpoints.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredVacancies.map(vac => {
                const matchScore = vac.matchEvaluation?.matchScore || 70;
                const isSaved = savedVacancyIds.has(vac.id);
                const isCompared = compareList.some(c => c.id === vac.id);
                const missingSkills = vac.matchEvaluation?.missingSkills || [];

                return (
                  <div
                    key={vac.id}
                    onClick={() => onSelectVacancy(vac)}
                    className={`p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer hover:border-indigo-400/80 shadow-2xs ${
                      isBlack
                        ? 'bg-[#090D14]/80 border-amber-500/20 text-slate-100 hover:border-amber-400/50'
                        : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Role, Company, Location */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base sm:text-lg font-bold tracking-tight">
                            {vac.title}
                          </h2>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                            matchScore >= 80
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60'
                              : matchScore >= 60
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {matchScore}% ALIGNMENT
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {formatFreshness(vac.lastCheckedAt || vac.postedDate)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center space-x-1 font-semibold text-slate-700 dark:text-slate-300">
                            <Building className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{vac.company}</span>
                          </span>
                          <span>·</span>
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{vac.location || 'Remote'}</span>
                          </span>
                          {vac.salaryRange?.raw && (
                            <>
                              <span>·</span>
                              <span className="flex items-center space-x-1 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>{vac.salaryRange.raw}</span>
                              </span>
                            </>
                          )}
                          <span>·</span>
                          <span className="capitalize font-mono text-[11px]">{vac.workArrangement || 'Remote'}</span>
                        </div>

                        {/* Missing Skills / Skills to Strengthen (Constructive Tone) */}
                        {missingSkills.length > 0 && (
                          <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[11px] text-slate-400 font-medium">Skills to strengthen:</span>
                            {missingSkills.slice(0, 3).map((sk, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Quick Action Controls */}
                      <div className="flex items-center space-x-2 self-end lg:self-center">
                        <button
                          onClick={e => toggleCompare(vac, e)}
                          title="Compare opening"
                          className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                            isCompared
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <Scale className="w-4 h-4" />
                        </button>

                        <button
                          onClick={e => toggleSave(vac.id, e)}
                          title={isSaved ? 'Saved' : 'Save opportunity'}
                          className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                            isSaved
                              ? 'bg-amber-400 text-black'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>

                        <button
                          onClick={e => dismissVacancy(vac.id, e)}
                          title="Dismiss opening"
                          className="p-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-slate-200 transition cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onSelectVacancy(vac)}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition flex items-center space-x-1"
                        >
                          <span>Review Dossier</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Comparison Drawer */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom duration-200">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center space-x-4 text-xs">
            <span className="font-semibold text-slate-900 dark:text-white">
              {compareList.length} of 2 selected for comparison
            </span>
            <button
              onClick={() => setShowCompareDrawer(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition"
            >
              Compare Opportunities
            </button>
            <button
              onClick={() => setCompareList([])}
              className="text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {showCompareDrawer && (
        <JobComparisonDrawer
          jobA={compareList[0]}
          jobB={compareList[1]}
          profile={profile || null}
          onClose={() => setShowCompareDrawer(false)}
          onSelectJob={job => {
            setShowCompareDrawer(false);
            onSelectVacancy(job);
          }}
        />
      )}
    </div>
  );
};
