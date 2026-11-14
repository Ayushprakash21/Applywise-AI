// src/components/hero/OpportunityRadarCarousel.tsx
// Cinematic Horizontal Opportunity Radar Ticker for ApplyWise AI Homepage Hero

import React from 'react';
import { JobVacancy } from '../../types/index.ts';
import { CompanyLogo } from '../ui/CompanyLogo.tsx';

export interface OpportunityRadarCarouselProps {
  vacancies: JobVacancy[];
  onSelectVacancy?: (vacancy: JobVacancy) => void;
  className?: string;
}

export function formatPostingRecency(publishedAt?: string, postedDate?: string): string {
  const dateStr = publishedAt || postedDate;
  if (!dateStr) return 'Recently';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Recently';
  const diffMs = Math.abs(Date.now() - time);
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

export const OpportunityRadarCarousel: React.FC<OpportunityRadarCarouselProps> = ({
  vacancies = [],
  onSelectVacancy,
  className = '',
}) => {
  // Use real vacancies only
  const activeVacancies = vacancies.filter(v => v && v.title && v.company);

  if (activeVacancies.length === 0) {
    return null;
  }

  // To create a seamless infinite loop, duplicate items across the track
  const tickerItems = activeVacancies.length < 5
    ? [...activeVacancies, ...activeVacancies, ...activeVacancies, ...activeVacancies]
    : [...activeVacancies, ...activeVacancies];

  return (
    <div
      className={`w-full relative overflow-hidden pt-6 pb-2 select-none ${className}`}
      aria-label="Live Career Opportunities Ticker"
    >
      {/* Top Protocol-Inspired High-Yield Metric Header */}
      <div className="max-w-5xl mx-auto px-4 mb-4 text-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-200 tracking-wide">
          <span className="font-semibold text-slate-900 dark:text-white">1,00,000+ Professionals</span>
          <span className="text-orange-500/80 dark:text-orange-500/70">|</span>
          <span className="font-semibold text-slate-900 dark:text-white">1 In 5 get recruiter callback</span>
          <span className="text-orange-500/80 dark:text-orange-500/70">|</span>
          <span className="text-orange-600 dark:text-orange-300 font-semibold">Roles surfaced 24-72 hours before traditional job boards</span>
        </div>
      </div>

      {/* Subtle Orange Ambient Illumination Glow */}
      <div
        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-24 bg-gradient-to-t from-orange-500/15 via-amber-500/5 to-transparent blur-2xl rounded-full"
        aria-hidden="true"
      />

      {/* Edge-Faded Masking Container */}
      <div
        className="w-full overflow-hidden relative"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div className="opportunity-ticker-track flex items-center space-x-3.5 py-2">
          {tickerItems.map((vac, index) => {
            const recency = formatPostingRecency(vac.publishedAt, vac.postedDate);

            return (
              <div
                key={`${vac.id}_${index}`}
                onClick={() => onSelectVacancy && onSelectVacancy(vac)}
                className="group shrink-0 flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-[#0F131C]/90 hover:bg-[#151B27] border border-white/10 hover:border-orange-500/50 shadow-md hover:shadow-[0_0_20px_rgba(249,115,22,0.20)] transition-all duration-200 cursor-pointer backdrop-blur-md"
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && onSelectVacancy) {
                    e.preventDefault();
                    onSelectVacancy(vac);
                  }
                }}
              >
                {/* Company Logo on Left */}
                <CompanyLogo
                  companyName={vac.company}
                  logoUrl={vac.companyLogo || vac.companyLogoUrl}
                  domain={vac.companyDomain}
                  size="sm"
                  className="rounded-lg shadow-2xs group-hover:scale-105 transition-transform"
                />

                {/* Job Title & Company/Recency Subline */}
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="font-bold text-xs text-white group-hover:text-orange-300 transition-colors truncate max-w-[170px] sm:max-w-[220px]">
                    {vac.title}
                  </span>
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-300 truncate max-w-[100px]">
                      {vac.company}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {recency}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
