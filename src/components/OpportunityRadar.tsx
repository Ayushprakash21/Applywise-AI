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
  Globe,
  Plus,
  X,
  Award,
  Info
} from 'lucide-react';
import { JobVacancy, OpportunitySignal, UserProfile } from '../types/index.ts';
import { api } from '../services/api.ts';
import { JobComparisonDrawer } from './JobComparisonDrawer.tsx';
import { CountrySelect } from './ui/SelectSystem.tsx';
import { locationMatchesFilter } from '../data/globalLocations.ts';
import { evaluateCandidateJobMatch } from '../utils/explainableMatcher.ts';

export interface OpportunityRadarProps {
  vacancies: JobVacancy[];
  profile?: UserProfile | null;
  onSelectVacancy: (vacancy: JobVacancy) => void;
  onRefreshLiveJobs?: () => Promise<void>;
  onPrepareApplication?: (vacancyId: string) => Promise<any> | void;
  onOpenImportModal?: () => void;
  plan?: 'free' | 'pro' | 'black';
  className?: string;
}

export const OpportunityRadar: React.FC<OpportunityRadarProps> = ({
  vacancies,
  profile,
  onSelectVacancy,
  onRefreshLiveJobs,
  onPrepareApplication,
  onOpenImportModal,
  plan = 'free',
  className = '',
}) => {
  const isBlack = plan === 'black';

  // View & Filter State
  const [viewMode, setViewMode] = useState<'dossier' | 'signals' | 'spatial'>('dossier');
  const [filterMode, setFilterMode] = useState<'all' | 'high_match' | 'imported' | 'direct' | 'remote' | 'salary' | 'visa'>('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'all' | 'official_ats' | 'authorized_feed' | 'imported'>('all');
  const [countryFilter, setCountryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBreakdownVacancy, setSelectedBreakdownVacancy] = useState<JobVacancy | null>(null);

  const getProvenanceBadge = (source: string, provenance?: any) => {
    if (source.startsWith('gh_') || source.includes('greenhouse')) {
      return { label: 'Official Greenhouse ATS', accent: 'text-[#35B887] border-[rgba(53,184,135,0.30)] bg-[rgba(53,184,135,0.10)]' };
    }
    if (source.startsWith('lever_') || source.includes('lever')) {
      return { label: 'Official Lever ATS', accent: 'text-[#35B887] border-[rgba(53,184,135,0.30)] bg-[rgba(53,184,135,0.10)]' };
    }
    if (source.startsWith('ashby_') || source.includes('ashby')) {
      return { label: 'Official Ashby ATS', accent: 'text-[#35B887] border-[rgba(53,184,135,0.30)] bg-[rgba(53,184,135,0.10)]' };
    }
    if (source.startsWith('workable_') || source.includes('workable')) {
      return { label: 'Official Workable ATS', accent: 'text-[#35B887] border-[rgba(53,184,135,0.30)] bg-[rgba(53,184,135,0.10)]' };
    }
    if (source.startsWith('smartrec_')) {
      return { label: 'Official SmartRecruiters ATS', accent: 'text-[#35B887] border-[rgba(53,184,135,0.30)] bg-[rgba(53,184,135,0.10)]' };
    }
    if (source.startsWith('recruitee_')) {
      return { label: 'Official Recruitee ATS', accent: 'text-[#35B887] border-[rgba(53,184,135,0.30)] bg-[rgba(53,184,135,0.10)]' };
    }
    if (source === 'imported') {
      return { label: `Imported (${provenance?.extractionMethod || 'user'})`, accent: 'text-[#C6A66A] border-[rgba(198,166,106,0.30)] bg-[rgba(198,166,106,0.10)]' };
    }
    return { label: 'Authorized Board Feed', accent: 'text-[#76A9D8] border-[rgba(118,169,216,0.30)] bg-[rgba(118,169,216,0.10)]' };
  };

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

  const availableCountries = Array.from(
    new Set(uniqueVacancies.map(v => v.country).filter(Boolean))
  ).sort();

  const filteredVacancies = uniqueVacancies.filter(v => {
    // Country filter
    if (countryFilter && countryFilter !== 'All' && countryFilter !== 'all') {
      if (!locationMatchesFilter(v.location, v.country, countryFilter)) return false;
    }

    // Source type filter
    if (sourceTypeFilter === 'official_ats') {
      const isAts = v.source.startsWith('gh_') || v.source.includes('greenhouse') ||
                    v.source.startsWith('lever_') || v.source.includes('lever') ||
                    v.source.startsWith('ashby_') || v.source.includes('ashby') ||
                    v.source.startsWith('workable_') || v.source.includes('workable') ||
                    v.source.startsWith('smartrec_') || v.source.startsWith('recruitee_');
      if (!isAts) return false;
    } else if (sourceTypeFilter === 'authorized_feed') {
      const isAts = v.source.startsWith('gh_') || v.source.includes('greenhouse') ||
                    v.source.startsWith('lever_') || v.source.includes('lever') ||
                    v.source.startsWith('ashby_') || v.source.includes('ashby') ||
                    v.source.startsWith('workable_') || v.source.includes('workable') ||
                    v.source.startsWith('smartrec_') || v.source.startsWith('recruitee_');
      if (isAts || v.source === 'imported') return false;
    } else if (sourceTypeFilter === 'imported') {
      if (v.source !== 'imported') return false;
    }

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
    if (filterMode === 'imported') {
      return v.source === 'imported';
    }
    if (filterMode === 'direct') {
      return v.source !== 'imported';
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
          ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] text-[#F2F0EA]'
          : 'bg-white/70 dark:bg-slate-900/70 border-white/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
                isBlack
                  ? 'bg-[rgba(198,166,106,0.08)] text-[#C6A66A] border border-[rgba(198,166,106,0.22)]'
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

          {/* Action Tools: Import, Refresh & View Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenImportModal && (
              <button
                onClick={onOpenImportModal}
                className={`be-btn-primary flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                  isBlack
                    ? 'bg-[#C6A66A] hover:bg-[#D9BB80] text-[#17130C] border border-[rgba(198,166,106,0.30)]'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Plus className={`w-3.5 h-3.5 ${isBlack ? 'text-[#17130C]' : 'text-white'}`} />
                <span className={isBlack ? 'text-[#17130C] font-bold' : 'text-white'}>+ Import Job</span>
              </button>
            )}

            {onRefreshLiveJobs && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`be-btn-secondary flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                  isBlack
                    ? 'bg-[#191D23] border border-[rgba(255,255,255,0.12)] text-[#F2F0EA] hover:border-[rgba(198,166,106,0.30)] hover:bg-[#20252D]'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''} ${isBlack ? 'text-[#C6A66A]' : ''}`} />
                <span className={isBlack ? 'text-[#F2F0EA]' : ''}>{isRefreshing ? 'Refreshing Feeds...' : 'Refresh Feeds'}</span>
              </button>
            )}

            <div className={`flex items-center p-1 rounded-xl text-xs ${
              isBlack
                ? 'bg-[#0D1014] border border-[rgba(255,255,255,0.09)]'
                : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}>
              <button
                onClick={() => setViewMode('dossier')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  viewMode === 'dossier'
                    ? isBlack ? 'bg-[#191D23] text-[#F2F0EA] border border-[rgba(198,166,106,0.30)] shadow-xs' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : isBlack ? 'text-[#C0BDB5] hover:text-[#F2F0EA]' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Accessible List View</span>
              </button>
              <button
                onClick={() => setViewMode('spatial')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === 'spatial'
                    ? isBlack ? 'bg-[#191D23] text-[#F2F0EA] border border-[rgba(198,166,106,0.30)] shadow-xs' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : isBlack ? 'text-[#C0BDB5] hover:text-[#F2F0EA]' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>3D Spatial Radar</span>
              </button>
              <button
                onClick={() => setViewMode('signals')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === 'signals'
                    ? isBlack ? 'bg-[#191D23] text-[#F2F0EA] border border-[rgba(198,166,106,0.30)] shadow-xs' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : isBlack ? 'text-[#C0BDB5] hover:text-[#F2F0EA]' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
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
        <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/80 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter by title, company, or verified competency..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#0D1014] border border-slate-200/80 dark:border-[rgba(255,255,255,0.10)] text-xs text-slate-900 dark:text-[#F2F0EA] focus:outline-none focus:border-indigo-500 dark:focus:border-[#C6A66A] transition"
              />
            </div>

            <div className="w-full sm:w-52 shrink-0">
              <CountrySelect
                value={countryFilter === 'All' ? 'all' : countryFilter}
                onChange={(val) => setCountryFilter(!val || val === 'all' ? 'All' : val)}
                includeAllOption={true}
                allLabel={`All Countries (${availableCountries.length})`}
                includeRemote={true}
                extraCountries={availableCountries}
                theme={isBlack ? 'black-elite' : 'light'}
                size="sm"
                ariaLabel="Filter opportunities by country"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Source Type Filter */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-mono text-slate-400 dark:text-[#92949A] mr-1 uppercase">Provenance:</span>
              {[
                { id: 'all', label: 'All Sources' },
                { id: 'official_ats', label: 'Official ATS Boards' },
                { id: 'authorized_feed', label: 'Authorized Feeds' },
                { id: 'imported', label: 'Candidate Imported' },
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setSourceTypeFilter(st.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    sourceTypeFilter === st.id
                      ? isBlack ? 'bg-[rgba(198,166,106,0.20)] text-[#C6A66A] border border-[rgba(198,166,106,0.40)] font-bold' : 'bg-indigo-100 text-indigo-700'
                      : isBlack ? 'bg-[#0D1014] text-[#92949A] border border-[rgba(255,255,255,0.06)] hover:text-[#F2F0EA]' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Criteria Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'high_match', label: 'High Match (70%+)' },
                { id: 'remote', label: 'Remote Only' },
                { id: 'salary', label: 'Salary Disclosed' },
                { id: 'visa', label: 'Visa Sponsorship' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterMode(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    filterMode === f.id
                      ? isBlack ? 'bg-[#C6A66A] text-[#17130C] shadow-xs font-bold' : 'bg-indigo-600 text-white'
                      : isBlack ? 'bg-[#191D23] border border-[rgba(255,255,255,0.09)] text-[#C0BDB5] hover:text-[#F2F0EA]' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
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
                  isBlack ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] hover:border-[rgba(198,166,106,0.25)]' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800'
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
                    className={`p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer shadow-2xs ${
                      isBlack
                        ? 'bg-[#14171C] border-[rgba(255,255,255,0.09)] text-[#F2F0EA] hover:border-[rgba(198,166,106,0.30)]'
                        : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl hover:border-indigo-400/80'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Role, Company, Location */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-[#F2F0EA]">
                            {vac.title}
                          </h2>
                          {(() => {
                            const prov = getProvenanceBadge(vac.source, vac.importedProvenance);
                            return (
                              <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${prov.accent}`}>
                                <ShieldCheck className="w-2.5 h-2.5" />
                                <span>{prov.label}</span>
                              </span>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedBreakdownVacancy(vac);
                            }}
                            title="View explainable 6-dimension match score breakdown"
                            className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center space-x-1 transition cursor-pointer hover:opacity-80 ${
                              isBlack
                                ? 'bg-[rgba(198,166,106,0.12)] text-[#C6A66A] border border-[rgba(198,166,106,0.25)]'
                                : matchScore >= 80
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60'
                                : matchScore >= 60
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span>{matchScore}% ALIGNMENT</span>
                            <Info className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-[#92949A]">
                            {formatFreshness(vac.lastCheckedAt || vac.postedDate)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-[#C0BDB5]">
                          <span className="flex items-center space-x-1 font-semibold text-slate-700 dark:text-[#F2F0EA]">
                            <Building className="w-3.5 h-3.5 text-indigo-500 dark:text-[#C6A66A]" />
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
                              <span className="flex items-center space-x-1 font-mono font-semibold text-emerald-600 dark:text-[#35B887]">
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
                            <span className="text-[11px] text-slate-400 dark:text-[#92949A] font-medium">Skills to strengthen:</span>
                            {missingSkills.slice(0, 3).map((sk, idx) => (
                              <span
                                key={idx}
                                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                  isBlack
                                    ? 'bg-[#191D23] border border-[rgba(255,255,255,0.09)] text-[#C0BDB5]'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
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
                          aria-label="Compare opening"
                          className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                            isBlack
                              ? isCompared
                                ? 'bg-[#C6A66A] text-[#17130C]'
                                : 'bg-[#191D23] border border-[rgba(255,255,255,0.10)] text-[#C0BDB5] hover:border-[rgba(198,166,106,0.30)] hover:text-[#F2F0EA]'
                              : isCompared
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <Scale className="w-4 h-4" />
                        </button>

                        <button
                          onClick={e => toggleSave(vac.id, e)}
                          title={isSaved ? 'Saved' : 'Save opportunity'}
                          aria-label={isSaved ? 'Saved' : 'Save opportunity'}
                          className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                            isBlack
                              ? isSaved
                                ? 'bg-[#D9AA61] text-[#17130C]'
                                : 'bg-[#191D23] border border-[rgba(255,255,255,0.10)] text-[#C0BDB5] hover:border-[rgba(198,166,106,0.30)] hover:text-[#F2F0EA]'
                              : isSaved
                              ? 'bg-amber-400 text-black'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>

                        <button
                          onClick={e => dismissVacancy(vac.id, e)}
                          title="Dismiss opening"
                          aria-label="Dismiss opening"
                          className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                            isBlack
                              ? 'bg-[#191D23] border border-[rgba(255,255,255,0.10)] text-[#92949A] hover:text-[#D67575] hover:border-[rgba(214,117,117,0.30)]'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-slate-200'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>

                        {onPrepareApplication && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onPrepareApplication(vac.id);
                            }}
                            title="Move to Application Control"
                            aria-label="Move to Application Control"
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1 cursor-pointer ${
                              isBlack
                                ? 'bg-[rgba(198,166,106,0.12)] hover:bg-[rgba(198,166,106,0.22)] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]'
                                : 'bg-[rgba(198,166,106,0.12)] hover:bg-[rgba(198,166,106,0.22)] text-[#E8D49E] border border-[rgba(198,166,106,0.25)]'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5 text-[#C6A66A]" />
                            <span className="hidden sm:inline">Track</span>
                          </button>
                        )}

                        {vac.url && (
                          <a
                            href={vac.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1 cursor-pointer ${
                              isBlack
                                ? 'bg-[#191D23] hover:bg-[#C6A66A] text-[#C6A66A] hover:text-[#17130C] border border-[rgba(198,166,106,0.25)]'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="Apply directly on employer site"
                          >
                            <span>Apply on Site</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        )}

                        <button
                          onClick={() => onSelectVacancy(vac)}
                          aria-label={`Review Dossier for ${vac.title}`}
                          className={`be-btn-primary px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition flex items-center space-x-1 cursor-pointer ${
                            isBlack
                              ? 'bg-[#C6A66A] hover:bg-[#D9BB80] text-[#17130C] border border-[rgba(198,166,106,0.30)]'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          <span className={isBlack ? 'text-[#17130C] font-bold' : 'text-white'}>Review Dossier</span>
                          <ChevronRight className={`w-3.5 h-3.5 ${isBlack ? 'text-[#17130C]' : 'text-white'}`} />
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

      {/* Explainable Match Breakdown Modal */}
      {selectedBreakdownVacancy && (() => {
        const breakdown = evaluateCandidateJobMatch(selectedBreakdownVacancy, {
          profile: profile || {},
          targetRole: profile?.currentTitle,
          totalExperienceYears: profile?.totalExperienceYears,
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#15181E] border border-[rgba(198,166,106,0.30)] p-6 space-y-5 shadow-2xl text-[#F2F0EA]">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.09)] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[rgba(198,166,106,0.15)] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]">
                      ALGORITHM 2.0 (EXPLAINABLE)
                    </span>
                    <span className="text-xs font-mono text-[#92949A]">{breakdown.tier}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#F2F0EA]">
                    {selectedBreakdownVacancy.title}
                  </h3>
                  <p className="text-xs text-[#92949A]">
                    at <strong className="text-[#F2F0EA]">{selectedBreakdownVacancy.company}</strong> · {selectedBreakdownVacancy.location || 'Global'}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedBreakdownVacancy(null)}
                  className="p-1.5 rounded-xl bg-[#0D1014] text-[#92949A] hover:text-[#F2F0EA] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Overall Score Highlight */}
              <div className="p-4 rounded-2xl bg-[#0D1014] border border-[rgba(255,255,255,0.09)] flex items-center justify-between">
                <div className="space-y-0.5 max-w-md">
                  <div className="text-[10px] font-mono font-bold text-[#92949A] uppercase">Overall Match Alignment</div>
                  <div className="text-xs text-[#C0BDB5] leading-relaxed">{breakdown.recommendationReason}</div>
                </div>
                <div className="text-3xl font-bold font-mono text-[#C6A66A]">
                  {breakdown.overallScore}<span className="text-sm text-[#92949A]">/100</span>
                </div>
              </div>

              {/* 6-Dimension Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#C6A66A]">
                  Explainable 6-Dimension Weighting Breakdown
                </h4>

                {/* Dim 1: Core Skills */}
                <div className="p-3.5 rounded-xl bg-[#14171C] border border-[rgba(255,255,255,0.06)] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F2F0EA]">1. Core Skills Match ({breakdown.dimensions.coreSkills.weight})</span>
                    <span className="font-mono font-bold text-[#C6A66A]">{breakdown.dimensions.coreSkills.score} / {breakdown.dimensions.coreSkills.maxScore}</span>
                  </div>
                  {breakdown.dimensions.coreSkills.matchedSkills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-[#92949A]">Matched:</span>
                      {breakdown.dimensions.coreSkills.matchedSkills.map((sk, idx) => (
                        <span key={idx} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[rgba(53,184,135,0.12)] text-[#35B887] border border-[rgba(53,184,135,0.25)]">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>{sk}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {breakdown.dimensions.coreSkills.missingSkills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-[#92949A]">Missing:</span>
                      {breakdown.dimensions.coreSkills.missingSkills.slice(0, 4).map((sk, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#191D23] text-[#D9AA61] border border-[rgba(217,170,97,0.25)]">
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dim 2: Experience */}
                <div className="p-3.5 rounded-xl bg-[#14171C] border border-[rgba(255,255,255,0.06)] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F2F0EA]">2. Experience Level & Seniority ({breakdown.dimensions.experience.weight})</span>
                    <span className="font-mono font-bold text-[#C6A66A]">{breakdown.dimensions.experience.score} / {breakdown.dimensions.experience.maxScore}</span>
                  </div>
                  <p className="text-xs text-[#C0BDB5]">{breakdown.dimensions.experience.assessment}</p>
                </div>

                {/* Dim 3: Role Alignment */}
                <div className="p-3.5 rounded-xl bg-[#14171C] border border-[rgba(255,255,255,0.06)] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F2F0EA]">3. Role & Title Alignment ({breakdown.dimensions.roleAlignment.weight})</span>
                    <span className="font-mono font-bold text-[#C6A66A]">{breakdown.dimensions.roleAlignment.score} / {breakdown.dimensions.roleAlignment.maxScore}</span>
                  </div>
                  <p className="text-xs text-[#C0BDB5]">{breakdown.dimensions.roleAlignment.assessment}</p>
                </div>

                {/* Dim 4: Mandatory Qualifications */}
                <div className="p-3.5 rounded-xl bg-[#14171C] border border-[rgba(255,255,255,0.06)] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F2F0EA]">4. Mandatory Qualifications Gate ({breakdown.dimensions.mandatoryQualifications.weight})</span>
                    <span className={`font-mono font-bold ${breakdown.dimensions.mandatoryQualifications.hasMandatoryGaps ? 'text-[#D67575]' : 'text-[#35B887]'}`}>
                      {breakdown.dimensions.mandatoryQualifications.score} / {breakdown.dimensions.mandatoryQualifications.maxScore}
                    </span>
                  </div>
                  <p className="text-xs text-[#C0BDB5]">{breakdown.dimensions.mandatoryQualifications.assessment}</p>
                </div>

                {/* Dim 5: Geo & Work Mode */}
                <div className="p-3.5 rounded-xl bg-[#14171C] border border-[rgba(255,255,255,0.06)] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F2F0EA]">5. Geographic & Work Mode Compatibility ({breakdown.dimensions.geoAndWorkMode.weight})</span>
                    <span className="font-mono font-bold text-[#C6A66A]">{breakdown.dimensions.geoAndWorkMode.score} / {breakdown.dimensions.geoAndWorkMode.maxScore}</span>
                  </div>
                  <p className="text-xs text-[#C0BDB5]">{breakdown.dimensions.geoAndWorkMode.assessment}</p>
                </div>

                {/* Dim 6: Candidate Preferences */}
                <div className="p-3.5 rounded-xl bg-[#14171C] border border-[rgba(255,255,255,0.06)] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F2F0EA]">6. Candidate Preferences Alignment ({breakdown.dimensions.candidatePreferences.weight})</span>
                    <span className="font-mono font-bold text-[#C6A66A]">{breakdown.dimensions.candidatePreferences.score} / {breakdown.dimensions.candidatePreferences.maxScore}</span>
                  </div>
                  <p className="text-xs text-[#C0BDB5]">{breakdown.dimensions.candidatePreferences.assessment}</p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-[rgba(255,255,255,0.09)]">
                <span className="text-[10px] font-mono text-[#92949A]">
                  Zero Score Fabrication · Evaluated {new Date(breakdown.evaluatedAt).toLocaleDateString()}
                </span>

                <div className="flex items-center space-x-2">
                  {selectedBreakdownVacancy.url && (
                    <a
                      href={selectedBreakdownVacancy.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-[#191D23] border border-[rgba(198,166,106,0.30)] text-xs font-semibold text-[#C6A66A] hover:bg-[#C6A66A] hover:text-[#17130C] transition flex items-center space-x-1.5"
                    >
                      <span>Apply on Site</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedBreakdownVacancy(null)}
                    className="px-4 py-2 rounded-xl bg-[#C6A66A] text-[#17130C] text-xs font-bold hover:bg-[#D9BB80] transition shadow-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
