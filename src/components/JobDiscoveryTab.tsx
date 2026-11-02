import React, { useState } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { JobVacancy, CareerPreferences } from '../types/index.ts';

interface JobDiscoveryTabProps {
  vacancies: JobVacancy[];
  preferences: CareerPreferences | null;
  onSearchSources: (query?: string, source?: string) => Promise<void>;
  onPrepareApplication: (vacancyId: string) => Promise<void>;
  onRecheckVacancy: (id: string) => Promise<void>;
  onOpenManualModal: () => void;
  onSelectVacancy: (vac: JobVacancy) => void;
  isSearching: boolean;
}

export const JobDiscoveryTab: React.FC<JobDiscoveryTabProps> = ({
  vacancies,
  preferences,
  onSearchSources,
  onPrepareApplication,
  onRecheckVacancy,
  onOpenManualModal,
  onSelectVacancy,
  isSearching,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [arrangementFilter, setArrangementFilter] = useState('all');
  const [minMatchFilter, setMinMatchFilter] = useState<number>(0);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);
  const [preparingId, setPreparingId] = useState<string | null>(null);

  const handleRecheck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecheckingId(id);
    try {
      await onRecheckVacancy(id);
    } finally {
      setRecheckingId(null);
    }
  };

  const handlePrepare = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreparingId(id);
    try {
      await onPrepareApplication(id);
    } finally {
      setPreparingId(null);
    }
  };

  const filteredVacancies = vacancies.filter(vac => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      vac.title.toLowerCase().includes(term) ||
      vac.company.toLowerCase().includes(term) ||
      vac.location.toLowerCase().includes(term) ||
      vac.requirements.some(r => r.toLowerCase().includes(term));

    const matchesSource = selectedSource === 'all' || vac.source === selectedSource;
    const matchesArrangement = arrangementFilter === 'all' || vac.arrangement === arrangementFilter;
    const matchesScore = (vac.matchEvaluation?.matchScore || 0) >= minMatchFilter;

    return matchesSearch && matchesSource && matchesArrangement && matchesScore;
  });

  return (
    <div className="space-y-6">
      {/* Search & Control Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Real-Time Job Discovery</h1>
            <p className="text-xs text-slate-400">
              Aggregated from live official career endpoints, Remotive API, Jobicy feed, and Arbeitnow tech database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSearchSources(searchTerm, selectedSource)}
              disabled={isSearching}
              className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isSearching ? 'animate-spin' : ''}`} />
              <span>{isSearching ? 'Querying APIs...' : 'Search Live Sources'}</span>
            </button>
            <button
              onClick={onOpenManualModal}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <PlusCircle className="h-4 w-4 text-emerald-400" />
              <span>Add Custom Job URL</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, company, tech..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-700/80 bg-slate-950/70 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="w-full rounded-lg border border-slate-700/80 bg-slate-950/70 py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Sources (Remotive, Jobicy, Arbeitnow, Direct)</option>
              <option value="remotive">Remotive API</option>
              <option value="jobicy">Jobicy Feed</option>
              <option value="arbeitnow">Arbeitnow EU/Global</option>
              <option value="direct_feed">Direct Career Pages</option>
              <option value="manual">Manual Imports</option>
            </select>
          </div>

          <div>
            <select
              value={arrangementFilter}
              onChange={e => setArrangementFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-700/80 bg-slate-950/70 py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Any Work Arrangement</option>
              <option value="remote">Remote Only</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>

          <div>
            <select
              value={minMatchFilter}
              onChange={e => setMinMatchFilter(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700/80 bg-slate-950/70 py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="0">All Match Scores (0%+)</option>
              <option value="70">Moderate & High (&ge; 70%)</option>
              <option value="80">High Match (&ge; 80%)</option>
              <option value="90">Top Match (&ge; 90%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Discovered Listings Count */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Showing <strong>{filteredVacancies.length}</strong> verified vacancies</span>
        <span>Anti-duplication active · Real employment sources only</span>
      </div>

      {/* Vacancy Cards Stream */}
      <div className="space-y-3.5">
        {filteredVacancies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No vacancies match the current filters</h3>
            <p className="mt-1 text-xs text-slate-500">
              Try adjusting your search query, or click "Search Live Sources" to fetch fresh vacancies from Remotive, Jobicy, and Arbeitnow.
            </p>
            <button
              onClick={() => onSearchSources()}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              Fetch Live Jobs
            </button>
          </div>
        ) : (
          filteredVacancies.map(vac => {
            const match = vac.matchEvaluation;
            const score = match?.matchScore || 0;
            const isEligible = !match?.eligibilityIssues || match.eligibilityIssues.length === 0;

            const scoreBadgeColor =
              score >= 85
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : score >= 70
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

            return (
              <div
                key={vac.id}
                onClick={() => onSelectVacancy(vac)}
                className="group relative rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 hover:bg-slate-900/90 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Job Meta */}
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                        {vac.source}
                      </span>
                      {vac.remote && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                          Remote
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-medium">{vac.company}</span>
                      <span className="text-slate-600">·</span>
                      <span className="flex items-center text-xs text-slate-400">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-slate-500" />
                        {vac.location}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition">
                      {vac.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {vac.description}
                    </p>

                    {/* Requirements Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {vac.requirements.slice(0, 5).map((req, i) => {
                        const isMatched = match?.matchedSkills.some(ms => ms.toLowerCase() === req.toLowerCase());
                        return (
                          <span
                            key={i}
                            className={`text-[10px] px-2 py-0.5 rounded border ${
                              isMatched
                                ? 'bg-indigo-950/40 text-indigo-300 border-indigo-700/50 font-medium'
                                : 'bg-slate-950/50 text-slate-400 border-slate-800'
                            }`}
                          >
                            {isMatched ? '✓ ' : ''}{req}
                          </span>
                        );
                      })}
                      {vac.salaryRange?.raw && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/40 flex items-center">
                          <DollarSign className="h-3 w-3 mr-0.5" />
                          {vac.salaryRange.raw}
                        </span>
                      )}
                    </div>

                    {/* Match Reason Callout */}
                    {match?.reasons && match.reasons.length > 0 && (
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 pt-1">
                        <Info className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{match.reasons[0]}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Score Ring & Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/60">
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className={`text-base font-bold px-2.5 py-1 rounded-lg border font-mono ${scoreBadgeColor}`}>
                          {score}% MATCH
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {match?.recommendation?.replace(/_/g, ' ') || 'EVALUATED'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={e => handleRecheck(vac.id, e)}
                        disabled={recheckingId === vac.id}
                        title="Recheck active status on portal"
                        className="p-2 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${recheckingId === vac.id ? 'animate-spin' : ''}`} />
                      </button>

                      <a
                        href={vac.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="Open external job listing"
                        className="p-2 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>

                      <button
                        onClick={e => handlePrepare(vac.id, e)}
                        disabled={preparingId === vac.id}
                        className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition disabled:opacity-50"
                      >
                        <span>{preparingId === vac.id ? 'Tailoring...' : 'Prepare Application'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
