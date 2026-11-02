import React from 'react';

export interface BrandLogoProps {
  variant?: 'light' | 'dark' | 'auto';
  showWordmark?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  href?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'light',
  showWordmark = true,
  size = 'md',
  className = '',
  href,
  onClick,
}) => {
  const sizeMap = {
    xs: { icon: 24, text: 'text-xs', badge: 'text-[8px] px-1 py-0.2', gap: 'space-x-1.5' },
    sm: { icon: 32, text: 'text-sm', badge: 'text-[9px] px-1.5 py-0.2', gap: 'space-x-2' },
    md: { icon: 40, text: 'text-base', badge: 'text-[10px] px-2 py-0.5', gap: 'space-x-2.5' },
    lg: { icon: 56, text: 'text-xl', badge: 'text-xs px-2.5 py-0.5', gap: 'space-x-3' },
    xl: { icon: 76, text: 'text-2xl', badge: 'text-xs px-3 py-1', gap: 'space-x-3.5' },
  };

  const dim = sizeMap[size];
  const isDarkBg = variant === 'dark';

  const content = (
    <div className={`inline-flex items-center ${dim.gap} select-none ${className}`}>
      {/* Official AV Monogram Brand Mark */}
      <div
        className="relative flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-[1.03]"
        style={{ width: dim.icon, height: dim.icon }}
      >
        <img
          src="/branding/applywise-logo.png"
          alt="ApplyWise AI logo"
          width={dim.icon}
          height={dim.icon}
          className="w-full h-full object-contain filter drop-shadow-sm select-none"
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Brand Wordmark */}
      {showWordmark && (
        <div className="flex items-center space-x-1.5 tracking-tight">
          <span
            className={`font-bold ${dim.text} ${
              isDarkBg ? 'text-white' : 'text-slate-900'
            }`}
          >
            ApplyWise
          </span>
          <span className="font-semibold text-blue-600">AI</span>
          <span
            className={`font-mono uppercase font-semibold tracking-wider rounded-md ${dim.badge} ${
              isDarkBg
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                : 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
            }`}
          >
            PRO
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="inline-block cursor-pointer focus:outline-hidden" aria-label="ApplyWise AI Home">
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
        aria-label="ApplyWise AI Home"
      >
        {content}
      </button>
    );
  }

  return content;
};
