import React from 'react';
import { useTheme } from '../context/ThemeContext.tsx';

export interface BrandLogoProps {
  variant?: 'light' | 'dark' | 'auto';
  showWordmark?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  badge?: string;
  brandName?: string;
  className?: string;
  href?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'auto',
  showWordmark = true,
  size = 'md',
  badge,
  brandName = 'ApplyWise',
  className = '',
  href,
  onClick,
}) => {
  const { isDark } = useTheme();

  const sizeMap = {
    xs: { icon: 24, text: 'text-xs', badge: 'text-[8px] px-1 py-0.2', gap: 'space-x-1.5', container: 'p-0.5 rounded-lg' },
    sm: { icon: 32, text: 'text-sm', badge: 'text-[9px] px-1.5 py-0.2', gap: 'space-x-2', container: 'p-1 rounded-xl' },
    md: { icon: 40, text: 'text-base', badge: 'text-[10px] px-2 py-0.5', gap: 'space-x-2.5', container: 'p-1 rounded-xl' },
    lg: { icon: 56, text: 'text-xl', badge: 'text-xs px-2.5 py-0.5', gap: 'space-x-3', container: 'p-1.5 rounded-2xl' },
    xl: { icon: 76, text: 'text-2xl', badge: 'text-xs px-3 py-1', gap: 'space-x-3.5', container: 'p-2 rounded-2xl' },
  };

  const dim = sizeMap[size] || sizeMap.md;

  // Determine effective theme mode (light vs dark)
  const isDarkEffective = variant === 'dark' ? true : variant === 'light' ? false : isDark;

  const containerThemeClass = isDarkEffective
    ? 'bg-[#131B2A]/90 border border-white/10 shadow-none'
    : 'bg-white/95 border border-slate-200/90 shadow-2xs';

  const textClass = isDarkEffective
    ? 'text-white'
    : 'text-[#17243A]';

  const textColor = isDarkEffective ? '#FFFFFF' : '#17243A';

  const badgeClass = isDarkEffective
    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
    : 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs';

  const content = (
    <div className={`inline-flex items-center ${dim.gap} select-none ${className}`}>
      {/* Official AV Monogram Brand Mark in Clean Elevated Subtle Container */}
      <div
        className={`relative flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-[1.03] ${dim.container} ${containerThemeClass}`}
        style={{ width: dim.icon, height: dim.icon }}
      >
        <img
          src="/branding/applywise-logo.png"
          alt={`${brandName} AI logo`}
          width={dim.icon}
          height={dim.icon}
          className="w-full h-full object-contain select-none"
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Brand Wordmark */}
      {showWordmark && (
        <div className="flex items-center space-x-1.5 tracking-tight">
          <span
            className={`font-bold brand-wordmark ${dim.text} ${textClass}`}
            style={{ color: textColor }}
          >
            {brandName}
          </span>
          <span
            className="font-semibold brand-ai-accent text-[#168BDB]"
            style={{ color: '#168BDB' }}
          >
            AI
          </span>
          {badge && (
            <span
              className={`font-mono uppercase font-semibold tracking-wider rounded-md ${dim.badge} ${badgeClass}`}
            >
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="inline-block cursor-pointer focus:outline-hidden" aria-label={`${brandName} AI Home`}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-block cursor-pointer bg-transparent border-none p-0 focus:outline-hidden text-left"
        aria-label={`${brandName} AI Home`}
      >
        {content}
      </button>
    );
  }

  return content;
};
