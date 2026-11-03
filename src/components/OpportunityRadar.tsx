import React, { useState } from 'react';
import {
  Radar,
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
  Zap
} from 'lucide-react';
import { JobVacancy, OpportunityAlignmentTier } from '../types/index.ts';

interface OpportunityRadarProps {
  vacancies: JobVacancy[];
  onSelectVacancy: (vacancy: JobVacancy) => void;
  className?: string;
}

export const OpportunityRadar: React.FC<OpportunityRadarProps> = ({
  vacancies,
  onSelectVacancy,
  className = '',
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'high_match' | 'remote' | 'salary'>('all');

  // Filter out any stale or inactive vacancies
  const activeVacancies = vacancies.filter(v => v.isActive !== false);

  const filtered = activeVacancies.filter(v => {
    if (filterMode === 'high_match') {
      return (v.matchEvaluation?.matchScore || 0) >= 70;
    }
    if (filterMode === 'remote') {
      return v.remote || v.arrangement === 'remote';
    }
    if (filterMode === 'salary') {
      return Boolean(v.salaryRange?.min || v.salaryRange?.raw);
    }
    return true;
  });

  const formatTimeAgo = (iso?: string) => {
    if (!iso) return 'Recently verified';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `Verified ${Math.max(1, diffMins)}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Verified ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Verified ${diffDays}d ago`;
  };

  return (
    <div className={`p-5 rounded-2xl neu-surface border border-white/80 shadow-md ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700/60 gap-3">
        <div className="flex items-center space-x-2">
          <div className="relative p-2 rounded-xl bg-cyan-500/10 text-cyan-600">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Opportunity Radar
            </h3>
            <p className="text-xs text-slate-500">Live Synchronized Ingestion from Company Career APIs</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl neu-inset text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterMode === 'all'
                ? 'bg-white shadow-xs text-cyan-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Live ({activeVacancies.length})
          </button>
          <button
            onClick={() => setFilterMode('high_match')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterMode === 'high_match'
                ? 'bg-white shadow-xs text-cyan-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            High Match (70+)
          </button>
          <button
            onClick={() => setFilterMode('remote')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterMode === 'remote'
                ? 'bg-white shadow-xs text-cyan-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Remote
          </button>
          <button
            onClick={() => setFilterMode('salary')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterMode === 'salary'
                ? 'bg-white shadow-xs text-cyan-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Disclosed Pay
          </button>
        </div>
      </div>

      {/* Opportunity List */}
      <div className="pt-4 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
        {filtered.length > 0 ? (
          filtered.slice(0, 8).map(vacancy => {
            const score = vacancy.matchEvaluation?.matchScore ?? 0;
            const scoreColor =
              score >= 75
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : score >= 60
                ? 'text-blue-700 bg-blue-50 border-blue-200'
                : 'text-slate-700 bg-slate-50 border-slate-200';

            return (
              <div
                key={vacancy.id}
                onClick={() => onSelectVacancy(vacancy)}
                className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 hover:border-cyan-400 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Main Info */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-cyan-600 transition-colors">
                      {vacancy.title}
                    </h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                      {vacancy.source || 'Direct Feed'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Building className="h-3 w-3" />
                      <span>{vacancy.company}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>{vacancy.location || (vacancy.remote ? 'Remote' : 'Location Unspecified')}</span>
                    </span>
                    {vacancy.salaryRange?.raw && (
                      <span className="flex items-center space-x-1 text-emerald-600 font-medium">
                        <DollarSign className="h-3 w-3" />
                        <span>{vacancy.salaryRange.raw}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Score & Verification Time */}
                <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold border ${scoreColor}`}>
                      {score}% Fit
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                      {formatTimeAgo(vacancy.retrievedAt || vacancy.publishedAt)}
                    </span>
                  </div>

                  <div className="p-1.5 rounded-lg neu-inset text-slate-400 group-hover:text-cyan-600 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center neu-inset rounded-xl">
            <Radio className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              No live opportunities match the active radar filter.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Switch filter to "All Live" or broaden your target search parameters.
            </p>
          </div>
        )}
      </div>

      {/* Provenance Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="flex items-center space-x-1">
          <ShieldCheck className="h-3 w-3 text-cyan-500" />
          <span>Synchronized every 10 min via automated Cloudflare Edge Cron</span>
        </span>
        <span>Stale & expired postings automatically purged</span>
      </div>
    </div>
  );
};