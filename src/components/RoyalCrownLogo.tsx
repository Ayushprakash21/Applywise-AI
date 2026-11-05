import React from 'react';

export interface RoyalCrownLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}

export const RoyalCrownLogo: React.FC<RoyalCrownLogoProps> = ({
  size = 'md',
  showWordmark = false,
  animated = false,
  className = '',
  onClick,
}) => {
  const sizeMap = {
    xs: { icon: 14, text: 'text-[9px]', gap: 'gap-1' },
    sm: { icon: 18, text: 'text-[11px]', gap: 'gap-1.5' },
    md: { icon: 24, text: 'text-xs', gap: 'gap-2' },
    lg: { icon: 34, text: 'text-sm', gap: 'gap-2.5' },
    xl: { icon: 48, text: 'text-base', gap: 'gap-3' },
  };

  const { icon: pxSize, text: textSize, gap } = sizeMap[size] || sizeMap.md;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${gap} select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Luxury Executive Sovereign Emblem (Minimal Precision · Pure Champagne) */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: pxSize, height: pxSize }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-[#C6A66A]"
        >
          <defs>
            <linearGradient id="blackCrownGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2C58A" />
              <stop offset="100%" stopColor="#C6A66A" />
            </linearGradient>
            <linearGradient id="blackCrownViolet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B82E9" />
              <stop offset="100%" stopColor="#6C5CE7" />
            </linearGradient>
          </defs>
          {/* Subtle architectural faceted crest */}
          <path
            d="M3 18L5 8L9.5 13L12 6L14.5 13L19 8L21 18H3Z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M5 18H19"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <circle cx="12" cy="6" r="0.75" fill="currentColor" />
          <circle cx="5" cy="8" r="0.75" fill="currentColor" />
          <circle cx="21" cy="8" r="0.75" fill="currentColor" />
        </svg>
      </div>

      {/* Editorial Luxury Wordmark */}
      {showWordmark && (
        <div className="flex items-center gap-1.5 font-sans tracking-wider uppercase">
          <span className={`font-bold text-[#F0EEE9] ${textSize}`}>BLACK</span>
          <span className="text-[10px] tracking-widest text-[#C6A66A] font-mono font-medium">ELITE</span>
        </div>
      )}
    </div>
  );
};
