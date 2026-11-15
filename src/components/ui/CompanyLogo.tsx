// src/components/ui/CompanyLogo.tsx
// Centralized, Resilient Company Logo Component for ApplyWise AI

import React, { useState, useEffect } from 'react';
import { resolveCompanyLogo, lookupCompanyMetadata } from '../../services/companyRegistry.ts';

export type CompanyLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface CompanyLogoProps {
  companyName: string;
  logoUrl?: string | null;
  domain?: string | null;
  size?: CompanyLogoSize;
  className?: string;
  alt?: string;
}

const SIZE_MAP: Record<CompanyLogoSize, { box: string; icon: string; text: string; radius: string }> = {
  xs: { box: 'w-6 h-6', icon: 'w-5 h-5', text: 'text-[9px]', radius: 'rounded-md' },
  sm: { box: 'w-8 h-8', icon: 'w-7 h-7 p-0.5', text: 'text-[11px]', radius: 'rounded-lg' },
  md: { box: 'w-10 h-10', icon: 'w-10 h-10 p-1', text: 'text-xs font-bold', radius: 'rounded-xl' },
  lg: { box: 'w-12 h-12', icon: 'w-12 h-12 p-1', text: 'text-sm font-bold', radius: 'rounded-xl' },
  xl: { box: 'w-16 h-16', icon: 'w-16 h-16 p-1.5', text: 'text-lg font-bold', radius: 'rounded-2xl' },
};

// Global set of known permanently failed URLs to prevent repeated broken requests
const FAILED_LOGO_URLS = new Set<string>();

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  companyName,
  logoUrl,
  domain,
  size = 'md',
  className = '',
  alt,
}) => {
  const dim = SIZE_MAP[size];
  const resolution = resolveCompanyLogo(companyName, logoUrl, domain);
  const meta = lookupCompanyMetadata(companyName);

  // Resolution tier: 1 = primary URL, 2 = Google Favicon via domain, 3 = Initials
  const [tier, setTier] = useState<number>(() => {
    if (!resolution.url || FAILED_LOGO_URLS.has(resolution.url)) {
      if (resolution.domain) return 2;
      return 3;
    }
    return 1;
  });

  const [isLoading, setIsLoading] = useState<boolean>(tier < 3);

  useEffect(() => {
    if (!resolution.url || FAILED_LOGO_URLS.has(resolution.url)) {
      if (resolution.domain) setTier(2);
      else setTier(3);
    } else {
      setTier(1);
    }
    setIsLoading(tier < 3);
  }, [companyName, logoUrl, domain]);

  const handleImageError = (failedUrl?: string) => {
    if (failedUrl) {
      FAILED_LOGO_URLS.add(failedUrl);
    }
    if (tier === 1 && resolution.domain) {
      // Step down to Google Favicon fallback
      setTier(2);
    } else {
      // Step down to Initials fallback
      setTier(3);
      setIsLoading(false);
    }
  };

  const currentImageUrl = tier === 1
    ? resolution.url
    : tier === 2 && resolution.domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(resolution.domain)}&sz=128`
    : null;

  // Tier 3: High-contrast Initials Fallback
  if (tier === 3 || !currentImageUrl) {
    return (
      <div
        className={`${dim.box} ${dim.radius} shrink-0 bg-slate-100 dark:bg-[#1A1F2B] border border-slate-200 dark:border-white/10 flex items-center justify-center font-mono ${dim.text} text-slate-700 dark:text-[#E2C58A] select-none shadow-2xs ${className}`}
        style={meta?.brandColor ? { borderLeftColor: meta.brandColor, borderLeftWidth: 2 } : undefined}
        title={companyName}
        aria-label={`${companyName} logo initials`}
      >
        {resolution.initials}
      </div>
    );
  }

  return (
    <div
      className={`relative ${dim.box} ${dim.radius} shrink-0 bg-white dark:bg-[#14171F] border border-slate-200/90 dark:border-white/10 flex items-center justify-center overflow-hidden p-1 shadow-2xs select-none transition-colors ${className}`}
      title={companyName}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-slate-200/60 dark:bg-white/5 animate-pulse" />
      )}
      <img
        src={currentImageUrl}
        alt={alt || `${companyName} logo`}
        className={`${dim.icon} object-contain transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoading(false)}
        onError={() => handleImageError(currentImageUrl)}
      />
    </div>
  );
};
