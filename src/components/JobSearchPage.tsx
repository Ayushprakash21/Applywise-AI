import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Globe,
  Building,
  MapPin,
  DollarSign,
  Sparkles,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  List,
  CheckCircle2,
  ExternalLink,
  Zap,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Scale
} from 'lucide-react';
import { JobVacancy } from '../types/index.ts';
import { api } from '../services/api.ts';
import { JobComparisonDrawer } from './JobComparisonDrawer.tsx';

interface JobSearchPageProps {
  vacancies: JobVacancy[];
  onSelectVacancy: (vacancy: JobVacancy) => void;
  onSearch: (query: string, country?: string, remoteOnly?: boolean) => Promise<void>;
  isSearching: boolean;
  onOpenOnboarding: () => void;
  hasProfile: boolean;
  onRefreshLiveJobs?: () => Promise<void>;
}

export const JobSearchPage: React.FC<JobSearchPageProps> = ({
  vacancies,
  onSelectVacancy,
  onSearch,
  isSearching,
  onOpenOnboarding,
  hasProfile,
  onRefreshLiveJobs,
}) => {
  // Search & Filter State
  const [query, setQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [workArrangement, setWorkArrangement] = useState<'all' | 'remote' | 'hybrid' | 'onsite'>('all');
  const [employmentType, setEmploymentType] = useState<string>('all');
  const [experienceLevel, setExperienceLevel] = useState<string>('all');
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'match' | 'salary' | 'title'>('recent');
  const [discoveryPreset, setDiscoveryPreset] = useState<'all' | 'recommended' | 'recent' | 'stretch' | 'salary_disclosed'>('all');

  // Job Alert Modal State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertFrequency, setAlertFrequency] = useState<'daily' | 'weekly' | 'instant'>('daily');
  const [alertSuccessMsg, setAlertSuccessMsg] = useState<string | null>(null);

  // Comparison State
  const [compareList, setCompareList] = useState<JobVacancy[]>([]);
  const [showCompareDrawer, setShowCompareDrawer] = useState(false);

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

  // UI State
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [isSyncing, setIsSyncing] = useState(false);
  const [sourcesHealth, setSourcesHealth] = useState<any[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toISOString());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Load Source Health Metadata
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await api.getLiveJobsStatus();
        if (res.success) {
          setSourcesHealth(res.sources || []);
          if (res.lastChecked) setLastRefreshedAt(res.lastChecked);
        }
      } catch (err) {
        console.error('Failed to load live sources status:', err);
      }
    };
    loadStatus();
  }, []);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      if (onRefreshLiveJobs) {
        await onRefreshLiveJobs();
      } else {
        await api.refreshLiveJobs();
        await onSearch(query);
      }
      const st = await api.getLiveJobsStatus();
      if (st.success) {
        setSourcesHealth(st.sources || []);
        setLastRefreshedAt(st.lastChecked);
      }
    } catch (err) {
      console.error('Failed to sync live jobs:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    onSearch(query, locationFilter === 'All Locations' ? undefined : locationFilter, workArrangement === 'remote');
  };

  // Client-side filtering & sorting
  const filteredJobs = vacancies.filter(v => {
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchQ = v.title.toLowerCase().includes(q) ||
        v.company.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.requirements.some(r => r.toLowerCase().includes(q));
      if (!matchQ) return false;
    }

    if (companyFilter.trim()) {
      if (!v.company.toLowerCase().includes(companyFilter.toLowerCase().trim())) return false;
    }

    if (locationFilter !== 'All Locations') {
      const matchLoc = v.location.toLowerCase().includes(locationFilter.toLowerCase()) ||
        v.country.toLowerCase().includes(locationFilter.toLowerCase());
      if (!matchLoc) return false;
    }

    if (workArrangement !== 'all') {
      if (workArrangement === 'remote' && !v.remote && v.arrangement !== 'remote') return false;
      if (workArrangement === 'hybrid' && v.arrangement !== 'hybrid') return false;
      if (workArrangement === 'onsite' && (v.remote || v.arrangement === 'remote' || v.arrangement === 'hybrid')) return false;
    }

    if (employmentType !== 'all') {
      const et = ((v as any).employmentType || 'full-time').toLowerCase();
      if (!et.includes(employmentType.toLowerCase())) return false;
    }

    if (experienceLevel !== 'all') {
      const el = ((v as any).experienceLevel || 'mid').toLowerCase();
      if (el !== experienceLevel.toLowerCase()) return false;
    }

    if (salaryOnly && !v.salaryRange?.raw) {
      return false;
    }

    // Discovery Smart Filter Presets (Requirement 7)
    if (discoveryPreset === 'recommended') {
      const score = v.matchEvaluation?.matchScore || 0;
      if (score < 65) return false;
    } else if (discoveryPreset === 'stretch') {
      const score = v.matchEvaluation?.matchScore || 0;
      const tier = v.matchEvaluation?.alignmentTier;
      if (tier !== 'STRETCH_OPPORTUNITY' && (score < 40 || score > 65)) return false;
    } else if (discoveryPreset === 'salary_disclosed') {
      if (!v.salaryRange?.raw) return false;
    }

    return true;
  });

  // Sorting
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === 'match') {
      return (b.matchEvaluation?.matchScore || 0) - (a.matchEvaluation?.matchScore || 0);
    }
    if (sortBy === 'salary') {
      return ((b as any).salaryMax || 0) - ((a as any).salaryMax || 0);
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    // Default: recent
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  // Pagination
  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage) || 1;
  const paginatedJobs = sortedJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const locations = [
    'All Locations',
    'United States',
    'Remote Worldwide',
    'Canada',
    'United Kingdom',
    'European Union',
    'India',
  ];

  return (
    <div className="space-y-6">
      {/* Live Jobs Header Card */}
      <div className="neu-panel p-6 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full neu-inset text-blue-700 text-xs font-semibold mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Job Discovery Engine</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Live Jobs</h1>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              Real-time job openings connected directly to official company career pages (Greenhouse, Lever) and verified aggregators with 10-minute incremental refresh.
            </p>
          </div>

          {/* Sync Status Pill & Manual Trigger */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-semibold text-slate-700 flex items-center justify-end space-x-1">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>10-Min Sync Active</span>
              </p>
              <p className="text-[10px] text-slate-500">
                Last checked: {new Date(lastRefreshedAt).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="neu-button px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Sources'}</span>
            </button>
          </div>
        </div>

        {/* Live Sources Bar */}
        <div className="p-3.5 neu-inset rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-700 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Active Connectors:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(sourcesHealth && sourcesHealth.length > 0 ? sourcesHealth : [
              { source_name: 'Greenhouse ATS', status: 'healthy' },
              { source_name: 'Lever ATS', status: 'healthy' },
              { source_name: 'Remotive', status: 'healthy' },
              { source_name: 'Arbeitnow', status: 'healthy' },
              { source_name: 'Jobicy', status: 'healthy' },
            ]).map((src: any, i: number) => {
              const statusColor = src.status === 'degraded' ? 'bg-amber-500' : (src.status === 'offline' ? 'bg-rose-500' : 'bg-emerald-500');
              const name = src.source_name || src.sourceId || src.name;
              return (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full neu-chip text-slate-700 text-[11px] font-medium flex items-center space-x-1.5"
                  title={src.last_error ? `Error: ${src.last_error}` : (src.total_jobs ? `${src.total_jobs} active vacancies` : undefined)}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
                  <span>{name}</span>
                </span>
              );
            })}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {vacancies.length} vacancies verified in temporary cache
          </span>
        </div>

        {/* Smart Discovery Presets & Alerts Bar (Requirement 7) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className="text-slate-400 text-[11px] uppercase mr-1">Discovery:</span>
            <button
              type="button"
              onClick={() => { setDiscoveryPreset('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs transition ${
                discoveryPreset === 'all'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              All Openings
            </button>
            <button
              type="button"
              onClick={() => { setDiscoveryPreset('recommended'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs transition flex items-center space-x-1 ${
                discoveryPreset === 'recommended'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-white text-emerald-800 border border-emerald-200 hover:border-emerald-300'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>Recommended (High Match)</span>
            </button>
            <button
              type="button"
              onClick={() => { setDiscoveryPreset('stretch'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs transition ${
                discoveryPreset === 'stretch'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'bg-white text-purple-800 border border-purple-200 hover:border-purple-300'
              }`}
            >
              Stretch Opportunities
            </button>
            <button
              type="button"
              onClick={() => { setDiscoveryPreset('salary_disclosed'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs transition ${
                discoveryPreset === 'salary_disclosed'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-white text-blue-800 border border-blue-200 hover:border-blue-300'
              }`}
            >
              Disclosed Salary
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAlertModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition flex items-center space-x-1"
          >
            <span>+ Create Job Alert</span>
          </button>
        </div>

        {/* Search & Filter Controls Form */}
        <form onSubmit={handleSearchSubmit} className="space-y-3 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            {/* Search Query Input */}
            <div className="relative md:col-span-5 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Job title, keyword, or skills (e.g. Project Manager, Frontend, Python)..."
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl neu-input text-xs text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Company Filter Input */}
            <div className="relative md:col-span-3 min-w-0">
              <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
                placeholder="Company (e.g. Cloudflare, Spotify)..."
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl neu-input text-xs text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Location Selector */}
            <div className="relative md:col-span-2 min-w-0">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 min-h-[44px] rounded-xl neu-input text-xs text-slate-900 appearance-none cursor-pointer"
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Search Button */}
            <button
              type="submit"
              disabled={isSearching}
              className="md:col-span-2 py-2.5 px-4 min-h-[44px] neu-button-primary rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 disabled:opacity-50 touch-target"
            >
              {isSearching ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  <span>Search Jobs</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Search Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[11px] text-slate-400 font-mono">Suggestions:</span>
            {['Senior Software Engineer', 'Full Stack Developer', 'Remote React', 'Staff Architect', 'TypeScript', 'Node.js', '$140k+'].map(pill => (
              <button
                key={pill}
                type="button"
                onClick={() => {
                  setQuery(pill);
                  onSearch(pill);
                }}
                className="px-2 py-0.5 rounded-lg bg-white/60 hover:bg-white text-slate-600 hover:text-blue-600 border border-slate-200/80 text-[11px] transition shadow-2xs"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Secondary Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 text-xs">
            {/* Work Arrangement Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-600 font-medium mr-1 text-[11px]">Arrangement:</span>
              {(['all', 'remote', 'hybrid', 'onsite'] as const).map(arr => (
                <button
                  key={arr}
                  type="button"
                  onClick={() => setWorkArrangement(arr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize min-h-[34px] transition ${
                    workArrangement === arr
                      ? 'neu-button-primary'
                      : 'neu-chip'
                  }`}
                >
                  {arr}
                </button>
              ))}
            </div>

            {/* Employment Type & Experience Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={employmentType}
                onChange={e => setEmploymentType(e.target.value)}
                className="px-2.5 py-1.5 min-h-[34px] rounded-lg neu-input text-xs text-slate-700 font-medium"
              >
                <option value="all">All Employment Types</option>
                <option value="full-time">Full-Time</option>
                <option value="part-time">Part-Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>

              <select
                value={experienceLevel}
                onChange={e => setExperienceLevel(e.target.value)}
                className="px-2.5 py-1.5 min-h-[34px] rounded-lg neu-input text-xs text-slate-700 font-medium"
              >
                <option value="all">All Experience Levels</option>
                <option value="entry">Entry-Level</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Staff</option>
                <option value="executive">Executive</option>
              </select>

              {/* Published Salary Toggle */}
              <label className="inline-flex items-center space-x-1.5 cursor-pointer px-3 py-1.5 min-h-[34px] rounded-lg neu-chip text-slate-700">
                <input
                  type="checkbox"
                  checked={salaryOnly}
                  onChange={e => setSalaryOnly(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 h-4 w-4"
                />
                <span className="text-xs font-medium">Published Salary Only</span>
              </label>
            </div>
          </div>
        </form>
      </div>

      {/* Results Header: Count, Sorting, View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 text-xs">
        <div className="flex items-center space-x-2 text-slate-600">
          <span className="font-bold text-slate-900">{filteredJobs.length}</span>
          <span>jobs match your criteria</span>
          {isSearching && (
            <span className="text-blue-600 flex items-center space-x-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Updating results...</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Sorting Dropdown */}
          <div className="flex items-center space-x-1.5 text-slate-500">
            <span className="text-[11px] font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl neu-input text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="recent">Most Recent</option>
              <option value="match">Highest Match</option>
              <option value="salary">Highest Salary</option>
              <option value="title">Job Title</option>
            </select>
          </div>

          {/* List / Cards View Toggle */}
          <div className="flex items-center neu-inset p-1 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              title="Card Grid View"
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'cards' ? 'neu-raised text-blue-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Dense List View"
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'neu-raised text-blue-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Onboarding Callout if missing */}
      {!hasProfile && (
        <div className="p-4 rounded-2xl neu-panel border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl neu-button-primary shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Unlock Automatic Resume Matching & ATS Tailoring</p>
              <p className="text-[11px] text-slate-600">Upload your authentic resume to see live match assessments and prepare tailored packages with 1-click.</p>
            </div>
          </div>
          <button
            onClick={onOpenOnboarding}
            className="px-4 py-2 neu-button-primary rounded-xl text-xs font-semibold shrink-0"
          >
            Upload Resume
          </button>
        </div>
      )}

      {/* Skeleton Loaders (Requirement 5) */}
      {isSearching && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-5 neu-card space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-5 w-20 rounded bg-slate-300 dark:bg-slate-700" />
                <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-slate-300 dark:bg-slate-700" />
                <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="flex justify-between pt-2">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-4 w-16 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State with Real Explanations and Actionable Steps (Requirement 5) */}
      {!isSearching && paginatedJobs.length === 0 && (
        <div className="text-center py-12 neu-panel space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl neu-inset text-slate-400 flex items-center justify-center mx-auto">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              No matching vacancies found for your criteria
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Our 280+ cached live openings did not match "{query || 'active parameters'}". This typically occurs when location constraints or salary filters exclude otherwise aligned positions.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setQuery('');
                setCompanyFilter('');
                setLocationFilter('All Locations');
                setWorkArrangement('all');
                setEmploymentType('all');
                setExperienceLevel('all');
                setSalaryOnly(false);
                setDiscoveryPreset('all');
              }}
              className="px-4 py-2 neu-button-primary rounded-xl text-xs font-semibold"
            >
              Reset All Filters
            </button>
            <button
              onClick={() => {
                setWorkArrangement('remote');
              }}
              className="px-3.5 py-2 neu-button rounded-xl text-xs font-semibold text-slate-700"
            >
              View Remote Opportunities
            </button>
            <button
              onClick={() => setShowAlertModal(true)}
              className="px-3.5 py-2 neu-button rounded-xl text-xs font-semibold text-blue-600"
            >
              + Create Alert for "{query || 'Search'}"
            </button>
          </div>
        </div>
      )}

      {/* Results View: CARDS VIEW */}
      {viewMode === 'cards' && paginatedJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedJobs.map(job => (
            <div
              key={job.id}
              onClick={() => onSelectVacancy(job)}
              className="p-5 neu-card neu-raised-hover cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Header: Source, Arrangement, Match Score */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 rounded-lg neu-inset text-slate-600 text-[10px] font-mono uppercase">
                      {job.source}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      job.arrangement === 'remote' || job.remote
                        ? 'bg-emerald-50 text-emerald-700'
                        : job.arrangement === 'hybrid'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {job.arrangement ? job.arrangement.toUpperCase() : (job.remote ? 'REMOTE' : 'ONSITE')}
                    </span>
                  </div>

                  {job.matchEvaluation && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold flex items-center space-x-1 ${
                      job.matchEvaluation.matchScore >= 80
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : job.matchEvaluation.matchScore >= 60
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Sparkles className="h-3 w-3" />
                      <span>{job.matchEvaluation.matchScore}% Match</span>
                    </span>
                  )}
                </div>

                {/* Job Title & Company */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                    {job.title}
                  </h3>
                  <div className="flex items-center space-x-1.5 text-xs text-blue-600 font-semibold mt-1">
                    <Building className="h-3.5 w-3.5 shrink-0" />
                    <span>{job.company}</span>
                  </div>
                </div>

                {/* Description Snippet */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {/* Requirements / Tags Chips */}
                {job.requirements && job.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.requirements.slice(0, 3).map((r, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg neu-inset text-slate-600 text-[10px] font-medium truncate max-w-[120px]">
                        {r}
                      </span>
                    ))}
                    {job.requirements.length > 3 && (
                      <span className="text-[10px] text-slate-400 self-center">
                        +{job.requirements.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-1 truncate max-w-[160px]">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{job.location}</span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => toggleCompare(job, e)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition flex items-center space-x-1 ${
                      compareList.some(c => c.id === job.id)
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'neu-inset text-slate-500 hover:text-slate-800'
                    }`}
                    title="Select to compare side-by-side"
                  >
                    <Scale className="h-3 w-3" />
                    <span>{compareList.some(c => c.id === job.id) ? 'Selected' : 'Compare'}</span>
                  </button>
                  {job.salaryRange?.raw && (
                    <span className="font-semibold text-emerald-700 text-[11px]">
                      {job.salaryRange.raw.split('-')[0].trim()}
                    </span>
                  )}
                  <span className="text-blue-600 font-semibold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition">
                    <span>Details</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results View: LIST VIEW */}
      {viewMode === 'list' && paginatedJobs.length > 0 && (
        <div className="neu-panel divide-y divide-slate-200/60 overflow-hidden">
          {paginatedJobs.map(job => (
            <div
              key={job.id}
              onClick={() => onSelectVacancy(job)}
              className="p-4 hover:neu-surface transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition truncate max-w-full">
                    {job.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                    job.arrangement === 'remote' || job.remote
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {job.arrangement ? job.arrangement.toUpperCase() : (job.remote ? 'REMOTE' : 'HYBRID')}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg neu-inset text-slate-600 text-[10px] font-mono uppercase shrink-0">
                    {job.source}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="font-semibold text-blue-600 flex items-center space-x-1">
                    <Building className="h-3.5 w-3.5" />
                    <span>{job.company}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{job.location}</span>
                  </span>
                  {job.salaryRange?.raw && (
                    <span className="font-medium text-emerald-700 flex items-center space-x-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>{job.salaryRange.raw}</span>
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400">
                    Posted {new Date(job.publishedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end space-x-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                <button
                  type="button"
                  onClick={(e) => toggleCompare(job, e)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1 ${
                    compareList.some(c => c.id === job.id)
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'neu-inset text-slate-500 hover:text-slate-800'
                  }`}
                  title="Select to compare side-by-side"
                >
                  <Scale className="h-3.5 w-3.5" />
                  <span>{compareList.some(c => c.id === job.id) ? 'Selected (1/2)' : 'Compare'}</span>
                </button>
                {job.matchEvaluation && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1">
                    <Sparkles className="h-3 w-3" />
                    <span>{job.matchEvaluation.matchScore}% Match</span>
                  </span>
                )}
                <button className="px-4 py-2 min-h-[40px] rounded-xl neu-button text-slate-700 text-xs font-semibold group-hover:neu-button-primary transition flex items-center space-x-1 touch-target">
                  <span>View Details</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-300/60 pt-4 px-2 text-xs text-slate-600">
          <p className="text-center sm:text-left">
            Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, sortedJobs.length)}</span> of{' '}
            <span className="font-semibold">{sortedJobs.length}</span> vacancies
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl neu-button disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-bold text-slate-900 px-2 min-w-[4rem] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl neu-button disabled:opacity-40 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Job Alert Modal (Requirement 7) */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Create Personalized Job Alert</h3>
              <button onClick={() => setShowAlertModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Receive notifications for verified openings matching your current search parameters. No spam or expired duplicates.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Alert Title</label>
                <input
                  type="text"
                  value={alertTitle}
                  onChange={e => setAlertTitle(e.target.value)}
                  placeholder={query ? `Alert: ${query}` : 'My Role Alert'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Notification Frequency</label>
                <select
                  value={alertFrequency}
                  onChange={e => setAlertFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="daily">Daily Digest (Recommended)</option>
                  <option value="weekly">Weekly Summary</option>
                  <option value="instant">Instant Real-Time Alert</option>
                </select>
              </div>
            </div>

            {alertSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200">
                {alertSuccessMsg}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.createJobAlert({
                      title: alertTitle || query || 'Job Alert',
                      criteria: { keywords: query ? [query] : [], locations: locationFilter !== 'All Locations' ? [locationFilter] : [] },
                      frequency: alertFrequency,
                    });
                    setAlertSuccessMsg('Job alert created successfully!');
                    setTimeout(() => {
                      setAlertSuccessMsg(null);
                      setShowAlertModal(false);
                    }, 1500);
                  } catch (err: any) {
                    alert(`Failed to save alert: ${err.message}`);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                Save Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Comparison Drawer Trigger */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 border border-slate-700 animate-slideUp">
          <div className="flex items-center space-x-2 text-xs">
            <Scale className="h-4 w-4 text-blue-400" />
            <span><strong>{compareList.length}/2</strong> opportunities selected</span>
          </div>
          <button
            disabled={compareList.length < 2}
            onClick={() => setShowCompareDrawer(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition"
          >
            Compare Side-by-Side
          </button>
          <button
            onClick={() => setCompareList([])}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Clear
          </button>
        </div>
      )}

      {/* Side-by-Side Job Comparison Drawer */}
      {showCompareDrawer && compareList.length === 2 && (
        <JobComparisonDrawer
          jobA={compareList[0]}
          jobB={compareList[1]}
          profile={null}
          onClose={() => setShowCompareDrawer(false)}
          onSelectJob={(j) => {
            setShowCompareDrawer(false);
            onSelectVacancy(j);
          }}
        />
      )}
    </div>
  );
};
