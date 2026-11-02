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
  ChevronRight
} from 'lucide-react';
import { JobVacancy } from '../types/index.ts';
import { api } from '../services/api.ts';

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
      <div className="glass-card rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-blue-700 text-xs font-semibold mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Job Discovery Engine</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Live Jobs</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
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
              <p className="text-[10px] text-slate-400">
                Last checked: {new Date(lastRefreshedAt).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Sources'}</span>
            </button>
          </div>
        </div>

        {/* Live Sources Bar */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-600 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Active Connectors:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {['Greenhouse ATS', 'Lever ATS', 'Remotive', 'Arbeitnow', 'Jobicy'].map((src, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 text-[11px] font-medium flex items-center space-x-1 shadow-2xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{src}</span>
              </span>
            ))}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {vacancies.length} vacancies verified in temporary cache
          </span>
        </div>

        {/* Search & Filter Controls Form */}
        <form onSubmit={handleSearchSubmit} className="space-y-3 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            {/* Search Query Input */}
            <div className="relative md:col-span-5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Job title, keyword, or skills (e.g. Project Manager, Frontend, Python)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
              />
            </div>

            {/* Company Filter Input */}
            <div className="relative md:col-span-3">
              <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
                placeholder="Company (e.g. Cloudflare, Spotify)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
              />
            </div>

            {/* Location Selector */}
            <div className="relative md:col-span-2">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none appearance-none transition bg-white cursor-pointer"
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
              className="md:col-span-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
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

          {/* Secondary Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            {/* Work Arrangement Pills */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-500 font-medium mr-1 text-[11px]">Arrangement:</span>
              {(['all', 'remote', 'hybrid', 'onsite'] as const).map(arr => (
                <button
                  key={arr}
                  type="button"
                  onClick={() => setWorkArrangement(arr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                    workArrangement === arr
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
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
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white font-medium"
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
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white font-medium"
              >
                <option value="all">All Experience Levels</option>
                <option value="entry">Entry-Level</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Staff</option>
                <option value="executive">Executive</option>
              </select>

              {/* Published Salary Toggle */}
              <label className="inline-flex items-center space-x-1.5 cursor-pointer px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700">
                <input
                  type="checkbox"
                  checked={salaryOnly}
                  onChange={e => setSalaryOnly(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 h-3.5 w-3.5"
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
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none cursor-pointer"
            >
              <option value="recent">Most Recent</option>
              <option value="match">Highest Match</option>
              <option value="salary">Highest Salary</option>
              <option value="title">Job Title</option>
            </select>
          </div>

          {/* List / Cards View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('cards')}
              title="Card Grid View"
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Dense List View"
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Onboarding Callout if missing */}
      {!hasProfile && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Unlock Automatic Resume Matching & ATS Tailoring</p>
              <p className="text-[11px] text-slate-600">Upload your authentic resume to see live match assessments and prepare tailored packages with 1-click.</p>
            </div>
          </div>
          <button
            onClick={onOpenOnboarding}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 transition"
          >
            Upload Resume
          </button>
        </div>
      )}

      {/* Empty State */}
      {paginatedJobs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 space-y-3">
          <Building className="h-8 w-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No matching vacancies found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query, location, or work arrangement filters, or click Sync Sources to refresh live feeds.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setCompanyFilter('');
              setLocationFilter('All Locations');
              setWorkArrangement('all');
              setEmploymentType('all');
              setExperienceLevel('all');
              setSalaryOnly(false);
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Results View: CARDS VIEW */}
      {viewMode === 'cards' && paginatedJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedJobs.map(job => (
            <div
              key={job.id}
              onClick={() => onSelectVacancy(job)}
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Header: Source, Arrangement, Match Score */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono uppercase">
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
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {/* Requirements / Tags Chips */}
                {job.requirements && job.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.requirements.slice(0, 3).map((r, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-medium truncate max-w-[120px]">
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
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-1 truncate max-w-[160px]">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{job.location}</span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
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
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
          {paginatedJobs.map(job => (
            <div
              key={job.id}
              onClick={() => onSelectVacancy(job)}
              className="p-4 hover:bg-slate-50/70 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition truncate">
                    {job.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                    job.arrangement === 'remote' || job.remote
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {job.arrangement ? job.arrangement.toUpperCase() : (job.remote ? 'REMOTE' : 'HYBRID')}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono uppercase shrink-0">
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

              <div className="flex items-center space-x-3 shrink-0">
                {job.matchEvaluation && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1">
                    <Sparkles className="h-3 w-3" />
                    <span>{job.matchEvaluation.matchScore}% Match</span>
                  </span>
                )}
                <button className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-blue-400 text-slate-700 text-xs font-semibold group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition flex items-center space-x-1">
                  <span>View</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200/80 pt-4 px-2 text-xs text-slate-600">
          <p>
            Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, sortedJobs.length)}</span> of{' '}
            <span className="font-semibold">{sortedJobs.length}</span> vacancies
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-bold text-slate-900 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
