import React, { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { JobVacancy } from '../types/index.ts';

interface JobSearchPageProps {
  vacancies: JobVacancy[];
  onSelectVacancy: (vacancy: JobVacancy) => void;
  onSearch: (query: string, country?: string, remoteOnly?: boolean) => Promise<void>;
  isSearching: boolean;
  onOpenOnboarding: () => void;
  hasProfile: boolean;
}

export const JobSearchPage: React.FC<JobSearchPageProps> = ({
  vacancies,
  onSelectVacancy,
  onSearch,
  isSearching,
  onOpenOnboarding,
  hasProfile,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All Countries');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Engineering', 'Product', 'Data & AI', 'Operations', 'Design', 'Marketing'];

  const countries = [
    'All Countries',
    'United States',
    'Canada',
    'United Kingdom',
    'Germany',
    'Remote Worldwide'
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, selectedCountry === 'All Countries' ? undefined : selectedCountry, remoteOnly);
  };

  const filteredVacancies = vacancies.filter(v => {
    if (selectedCountry !== 'All Countries' && !v.location.toLowerCase().includes(selectedCountry.toLowerCase()) && !v.country.toLowerCase().includes(selectedCountry.toLowerCase())) {
      return false;
    }
    if (remoteOnly && !v.remote) return false;
    if (selectedCategory !== 'All') {
      const matchCat = v.title.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        v.requirements.some(r => r.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        v.tags.some(t => t.toLowerCase().includes(selectedCategory.toLowerCase()));
      if (!matchCat) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="glass-card rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Real Job Discovery</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Searching live aggregations across Remotive, Arbeitnow, and Jobicy official career endpoints.
          </p>
        </div>

        {/* Search & Filters Form */}
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search job titles, skills, or employers (e.g. Frontend Engineer, Product Manager)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
              />
            </div>

            {/* Country Selector */}
            <div className="relative w-full md:w-52">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 appearance-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition cursor-pointer"
              >
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 disabled:opacity-50 transition flex items-center justify-center space-x-1.5 shrink-0"
            >
              {isSearching ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  <span>Search Vacancies</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Category & Remote Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-medium text-[11px] mr-1">Categories:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <label className="flex items-center space-x-2 text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={e => setRemoteOnly(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium">Remote Only</span>
            </label>
          </div>
        </form>
      </div>

      {/* Profile Onboarding Callout if profile not yet loaded */}
      {!hasProfile && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Upload your master resume for personalized matching</p>
              <p className="text-slate-600">ApplyWise AI calculates 0-100% honesty-audited match scores against your verified skills.</p>
            </div>
          </div>
          <button
            onClick={onOpenOnboarding}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shrink-0 transition"
          >
            Upload Resume
          </button>
        </div>
      )}

      {/* Results Count & Status */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Showing {filteredVacancies.length} verified listings</span>
        <button
          onClick={() => onSearch(query, selectedCountry === 'All Countries' ? undefined : selectedCountry, remoteOnly)}
          className="hover:text-slate-800 flex items-center space-x-1"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Vacancies Grid */}
      {filteredVacancies.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400 space-y-2">
          <Search className="h-8 w-8 mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No vacancies match your search criteria</p>
          <p className="text-xs text-slate-500">Try broadening your search keywords or switching country filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVacancies.map(v => {
            const match = v.matchEvaluation;
            return (
              <div
                key={v.id}
                onClick={() => onSelectVacancy(v)}
                className="glass-card glass-card-hover rounded-2xl p-5 cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                {/* Card Top: Source badge & match pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] uppercase">
                      {v.source}
                    </span>
                    {v.remote && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                        Remote
                      </span>
                    )}
                  </div>

                  {match && (
                    <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold font-mono">
                      <Sparkles className="h-3 w-3 text-blue-600" />
                      <span>{match.matchScore}%</span>
                    </div>
                  )}
                </div>

                {/* Title & Employer */}
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                    {v.title}
                  </h3>
                  <div className="flex items-center space-x-1.5 text-xs text-blue-600 font-semibold">
                    <Building className="h-3.5 w-3.5 shrink-0" />
                    <span>{v.company}</span>
                  </div>
                </div>

                {/* Requirements / Tags */}
                <div className="flex flex-wrap gap-1">
                  {v.requirements.slice(0, 3).map((r, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                      {r}
                    </span>
                  ))}
                  {v.requirements.length > 3 && (
                    <span className="px-1.5 py-0.5 text-slate-400 text-[10px]">
                      +{v.requirements.length - 3}
                    </span>
                  )}
                </div>

                {/* Card Bottom: Location, Salary, Details Link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1 truncate max-w-[160px]">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{v.location}</span>
                  </div>

                  <span className="text-blue-600 font-semibold flex items-center space-x-1 shrink-0">
                    <span>View Role</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
