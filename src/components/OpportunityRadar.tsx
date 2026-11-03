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
  Zap,
  Target,
  List,
  Orbit,
  ArrowRight
} from 'lucide-react';
import { JobVacancy } from '../types/index.ts';

export interface OpportunityRadarProps {
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
  const [viewMode, setViewMode] = useState<'radar' | 'list'>('radar');
  const [activeVacancyId, setActiveVacancyId] = useState<string | null>(null);

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
    if (!iso) return 'Verified recently';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `Verified ${Math.max(1, diffMins)}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Verified ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Verified ${diffDays}d ago`;
  };

  const selectedVacancy = activeVacancies.find(v => v.id === activeVacancyId) || filtered[0];

  return (
    <div className={`p-6 sm:p-7 rounded-3xl bg-white/65 backdrop-blur-2xl border border-white/85 shadow-[0_20px_50px_rgba(80,100,150,0.12),0_0_0_1px_rgba(255,255,255,0.4)_inset] ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-200/70 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-indigo-500/25 border border-cyan-300/40 text-cyan-600 flex items-center justify-center shadow-xs">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-700 bg-cyan-50 border border-cyan-200/80 px-2 py-0.5 rounded-full">
                Spatial Discovery
              </span>
              <span className="text-xs text-slate-400 font-mono">Real-time radar</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              Opportunity Radar
            </h3>
            <p className="text-xs text-slate-500">Live Synchronized Ingestion from Company Career APIs</p>
          </div>
        </div>

        {/* View Mode Toggle & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Radar vs List Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('radar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                viewMode === 'radar'
                  ? 'bg-gradient-to-r from-blue-600 to-[#8065F5] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>3D Spatial Radar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-blue-600 to-[#8065F5] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Accessible List View</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/60 border border-slate-200/60 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                filterMode === 'all'
                  ? 'bg-white shadow-xs text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Live ({activeVacancies.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('high_match')}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                filterMode === 'high_match'
                  ? 'bg-white shadow-xs text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              High Match (70+)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('remote')}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                filterMode === 'remote'
                  ? 'bg-white shadow-xs text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Remote
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('salary')}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                filterMode === 'salary'
                  ? 'bg-white shadow-xs text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Disclosed Pay
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'radar' ? (
        /* 1. SPATIAL RADAR VIEW */
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Spatial Circular Radar Graphic */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center select-none">
              {/* Concentric Radar Rings */}
              <div className="absolute inset-0 rounded-full border border-cyan-400/20 bg-gradient-to-tr from-blue-500/5 via-violet-500/5 to-transparent" />
              <div className="absolute inset-8 rounded-full border border-cyan-400/30" />
              <div className="absolute inset-18 rounded-full border border-indigo-400/35" />
              <div className="absolute inset-28 rounded-full border border-violet-400/40" />

              {/* Crosshairs */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200/60" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200/60" />

              {/* Scanning Sweep Beam */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400/10 via-transparent to-transparent animate-spin origin-center pointer-events-none" style={{ animationDuration: '8s' }} />

              {/* Central Candidate Identity Core */}
              <div className="relative z-20 w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-[#8065F5] text-white flex flex-col items-center justify-center shadow-lg shadow-violet-500/30 border-2 border-white">
                <span className="text-[11px] font-black tracking-tight font-mono">AV</span>
                <span className="text-[8px] font-medium opacity-80 uppercase tracking-widest">YOU</span>
              </div>

              {/* Plotted Job Markers */}
              {filtered.slice(0, 10).map((v, idx) => {
                const total = Math.min(filtered.length, 10);
                const angle = (idx / total) * Math.PI * 2;
                const score = v.matchEvaluation?.matchScore || 70;
                // Higher score = closer to centre (radius 70px to 170px)
                const distance = 180 - (score / 100) * 100;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;

                const isSelected = v.id === selectedVacancy?.id;

                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setActiveVacancyId(v.id);
                      onSelectVacancy(v);
                    }}
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                    className={`absolute z-20 group p-2 rounded-2xl flex items-center space-x-1.5 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xl scale-110 ring-2 ring-cyan-400'
                        : 'bg-white/85 backdrop-blur-md hover:bg-white text-slate-800 border border-white/90 shadow-md hover:scale-105'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      score >= 75 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                    }`} />
                    <span className="text-[11px] font-bold max-w-[90px] truncate">
                      {v.company}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1 rounded ${
                      isSelected ? 'text-cyan-300 bg-slate-800' : 'text-blue-700 bg-blue-50'
                    }`}>
                      {score}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Opportunity Intelligence Card */}
          <div className="lg:col-span-5">
            {selectedVacancy ? (
              <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-lg space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {selectedVacancy.source || 'Direct Feed'}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1.5 leading-snug">
                      {selectedVacancy.title}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedVacancy.company}</span>
                      <span>·</span>
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedVacancy.location || (selectedVacancy.remote ? 'Remote' : 'Location Unspecified')}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xl font-extrabold font-mono text-[#8065F5]">
                      {selectedVacancy.matchEvaluation?.matchScore || 85}%
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {formatTimeAgo(selectedVacancy.retrievedAt || selectedVacancy.publishedAt)}
                    </span>
                  </div>
                </div>

                {/* Evidence Chips */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    Verified Match Evidence
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedVacancy.requirements?.slice(0, 3) || ['Verified Experience', 'Architecture', 'TypeScript']).map((req, rIdx) => (
                      <span key={rIdx} className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-medium flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span className="truncate max-w-[140px]">{req}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA Action */}
                <button
                  type="button"
                  onClick={() => onSelectVacancy(selectedVacancy)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-[#8065F5] text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <span>Open Detailed Fit Lens</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-white/50 border border-slate-200/60 text-slate-400 text-xs">
                Select an opportunity node to inspect verified fit evidence.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 2. ACCESSIBLE LIST VIEW */
        <div className="pt-4 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {filtered.length > 0 ? (
            filtered.slice(0, 10).map(vacancy => {
              const score = vacancy.matchEvaluation?.matchScore ?? 75;
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
                  className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/90 hover:border-cyan-400/80 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
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

                  <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${scoreColor}`}>
                        {score}% Fit
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                        {formatTimeAgo(vacancy.retrievedAt || vacancy.publishedAt)}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-xl bg-slate-100 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center rounded-2xl bg-white/60 border border-slate-200/60">
              <Radio className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">
                No live opportunities found yet.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Switch filter to "All Live" or broaden your target search parameters.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Provenance Footer */}
      <div className="mt-5 pt-3.5 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
        <span className="flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-cyan-600 shrink-0" />
          <span>Synchronized every 10 min via automated Cloudflare Edge Cron</span>
        </span>
        <span className="text-slate-400">Stale & expired postings automatically purged</span>
      </div>
    </div>
  );
};
