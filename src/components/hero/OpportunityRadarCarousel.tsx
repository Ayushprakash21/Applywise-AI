// src/components/hero/OpportunityRadarCarousel.tsx
// Cinematic Horizontal Opportunity Radar Ticker for ApplyWise AI Homepage Hero
// Redesigned to match Protocol Jobs reference: large cards (340x84px), slow continuous marquee (20-30 px/s)

import React, { useMemo } from 'react';
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
  const activeVacancies = useMemo(() => {
    return vacancies.filter(v => v && v.title && v.company);
  }, [vacancies]);

  // Construct base sequence and duplicate for seamless 2x infinite marquee loop
  const { tickerItems, durationSeconds } = useMemo(() => {
    if (activeVacancies.length === 0) {
      return { tickerItems: [], durationSeconds: 120 };
    }

    let base: JobVacancy[];
    if (activeVacancies.length < 6) {
      // Repeat small array to ensure adequate screen width coverage
      base = [];
      while (base.length < 8) {
        base.push(...activeVacancies);
      }
    } else {
      base = activeVacancies.slice(0, 16);
    }

    // Duplicate exactly once for seamless 0% to -50% CSS translate3d loop
    const items = [...base, ...base];

    // Compute duration to strictly maintain 20–30 px/second linear velocity
    // Card width: 340px, gap: 16px -> 356px per card slot
    const cardSlotWidth = 356;
    const baseSequenceWidth = base.length * cardSlotWidth;
    const TARGET_SPEED_PX_PER_SEC = 24; // 24 px/sec (calibrated within requested 20-30 px/s range)
    const duration = Math.max(35, Math.round(baseSequenceWidth / TARGET_SPEED_PX_PER_SEC));

    return { tickerItems: items, durationSeconds: duration };
  }, [activeVacancies]);

  if (activeVacancies.length === 0 || tickerItems.length === 0) {
    return null;
  }

  return (
    <div
      className={`w-full relative overflow-hidden pt-6 pb-4 select-none ${className}`}
      aria-label="Live Career Opportunities Ticker"
    >
      {/* Top Protocol-Inspired High-Yield Metric Header */}
      <div className="max-w-5xl mx-auto px-4 mb-4 text-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-[13px] font-medium text-slate-300 tracking-wide">
          <span className="font-semibold text-white">1,00,000+ Professionals</span>
          <span className="text-orange-500/80">|</span>
          <span className="font-semibold text-white">1 In 5 get recruiter callback</span>
          <span className="text-orange-500/80">|</span>
          <span className="text-orange-400 font-semibold">Roles surfaced 24-72 hours before traditional job boards</span>
        </div>
      </div>

      {/* Subtle Orange Ambient Illumination Glow */}
      <div
        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-4/5 max-w-5xl h-28 bg-gradient-to-t from-orange-500/15 via-amber-500/5 to-transparent blur-3xl rounded-full"
        aria-hidden="true"
      />

      {/* Edge-Faded Masking Container */}
      <div
        className="w-full overflow-hidden relative"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
        }}
      >
        <div
          className="opportunity-ticker-track flex items-center gap-4 py-3"
          style={{
            animationDuration: `${durationSeconds}s`,
          }}
        >
          {tickerItems.map((vac, index) => {
            const recency = formatPostingRecency(vac.publishedAt, vac.postedDate);
            const locationText = vac.location || (vac.remote ? 'Remote' : '');

            return (
              <div
                key={`${vac.id}_${index}`}
                onClick={() => onSelectVacancy && onSelectVacancy(vac)}
                className="group shrink-0 flex items-center gap-3.5 px-4.5 py-3.5 rounded-2xl bg-[#0F131C]/95 hover:bg-[#151B27] border border-white/10 hover:border-orange-500/50 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(249,115,22,0.22)] transition-all duration-200 cursor-pointer backdrop-blur-md w-[290px] sm:w-[330px] md:w-[350px] h-[80px] sm:h-[84px] md:h-[86px]"
                role="button"
                tabIndex={0}
                title={`${vac.title} at ${vac.company}${locationText ? ` (${locationText})` : ''}`}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ' ') && onSelectVacancy) {
                    e.preventDefault();
                    onSelectVacancy(vac);
                  }
                }}
              >
                {/* 1. Actual Company Logo (38-44px range: size="md" is 40px) */}
                <div className="shrink-0 flex items-center justify-center">
                  <CompanyLogo
                    companyName={vac.company}
                    logoUrl={vac.companyLogo || vac.companyLogoUrl}
                    domain={vac.companyDomain}
                    size="md"
                    className="rounded-xl shadow-sm border border-white/10 group-hover:scale-105 transition-transform"
                  />
                </div>

                {/* 2. Job Information Cluster (Job Title: 15-17px, Company: 13-14px, Recency: 11-12px) */}
                <div className="flex flex-col min-w-0 flex-1 justify-center">
                  {/* Job Title */}
                  <span className="font-bold text-[15px] sm:text-[16px] text-white group-hover:text-orange-300 transition-colors truncate tracking-tight leading-snug">
                    {vac.title}
                  </span>

                  {/* Company Name, Location & Recency */}
                  <div className="flex items-center gap-1.5 text-[12.5px] sm:text-[13px] text-slate-300 mt-0.5 truncate">
                    <span className="font-semibold text-slate-200 truncate max-w-[110px] sm:max-w-[130px]">
                      {vac.company}
                    </span>
                    {locationText && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-[11.5px] text-slate-400 truncate max-w-[80px] sm:max-w-[100px]">
                          {locationText}
                        </span>
                      </>
                    )}
                    <span className="text-slate-600">·</span>
                    <span className="font-mono text-[11px] text-orange-400/90 whitespace-nowrap shrink-0">
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
