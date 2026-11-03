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
      {/* Royal Crown SVG with metallic champagne gold gradients */}
      <div
        className={`relative flex items-center justify-center ${
          animated ? 'animate-[bounce_4s_ease-in-out_infinite]' : ''
        }`}
        style={{ width: pxSize, height: pxSize }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_2px_8px_rgba(214,180,106,0.35)]"
        >
          <defs>
            {/* Metallic Gold Gradient */}
            <linearGradient id="blackCrownGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBF4D8" />
              <stop offset="25%" stopColor="#E5C77D" />
              <stop offset="50%" stopColor="#D6B46A" />
              <stop offset="75%" stopColor="#B89445" />
              <stop offset="100%" stopColor="#F3DEAC" />
            </linearGradient>

            {/* Radiant Violet Jewel Gradient */}
            <linearGradient id="blackCrownViolet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A794FF" />
              <stop offset="100%" stopColor="#8065F5" />
            </linearGradient>

            {/* Inner Dark Rim Accent */}
            <linearGradient id="blackCrownBase" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#151821" />
              <stop offset="50%" stopColor="#2D281E" />
              <stop offset="100%" stopColor="#151821" />
            </linearGradient>
          </defs>

          {/* Royal Crown Arch Base */}
          <path
            d="M6 38C6 36.8954 6.89543 36 8 36H40C41.1046 36 42 36.8954 42 38V41C42 42.1046 41.1046 43 40 43H8C6.89543 43 6 42.1046 6 41V38Z"
            fill="url(#blackCrownBase)"
            stroke="url(#blackCrownGold)"
            strokeWidth="1.5"
          />

          {/* Crown Base Band Filigree Dots */}
          <circle cx="12" cy="39.5" r="1.5" fill="url(#blackCrownGold)" />
          <circle cx="18" cy="39.5" r="1.5" fill="url(#blackCrownViolet)" />
          <circle cx="24" cy="39.5" r="2" fill="url(#blackCrownGold)" />
          <circle cx="30" cy="39.5" r="1.5" fill="url(#blackCrownViolet)" />
          <circle cx="36" cy="39.5" r="1.5" fill="url(#blackCrownGold)" />

          {/* Five Royal Crown Peaks */}
          <path
            d="M6 35L10 17L19 28L24 10L29 28L38 17L42 35H6Z"
            fill="url(#blackCrownGold)"
            stroke="#FBF4D8"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />

          {/* Crown Inner Facet Shading */}
          <path
            d="M19 28L24 10L29 28L24 35L19 28Z"
            fill="url(#blackCrownBase)"
            opacity="0.45"
          />
          <path
            d="M10 17L19 28L14 35L10 17Z"
            fill="url(#blackCrownBase)"
            opacity="0.25"
          />
          <path
            d="M38 17L29 28L34 35L38 17Z"
            fill="url(#blackCrownBase)"
            opacity="0.25"
          />

          {/* Jewel Orbs on Crown Finials */}
          <circle cx="10" cy="16" r="2.5" fill="#FBF4D8" />
          <circle cx="10" cy="16" r="1.5" fill="url(#blackCrownGold)" />

          <circle cx="24" cy="9" r="3.2" fill="#FBF4D8" />
          <circle cx="24" cy="9" r="2" fill="url(#blackCrownViolet)" />

          <circle cx="38" cy="16" r="2.5" fill="#FBF4D8" />
          <circle cx="38" cy="16" r="1.5" fill="url(#blackCrownGold)" />

          {/* Secondary Peaks Finials */}
          <circle cx="19" cy="27" r="1.5" fill="#F3DEAC" />
          <circle cx="29" cy="27" r="1.5" fill="#F3DEAC" />

          {/* Central Heart Jewel */}
          <path
            d="M24 23L27 27.5L24 32L21 27.5L24 23Z"
            fill="url(#blackCrownViolet)"
            stroke="url(#blackCrownGold)"
            strokeWidth="0.8"
          />
        </svg>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex items-center gap-1.5 font-bold tracking-widest uppercase">
          <span className={`font-black text-[#F8F8FC] ${textSize}`}>BLACK</span>
          <span className="text-[10px] tracking-wider text-[#D6B46A] font-semibold">ELITE</span>
        </div>
      )}
    </div>
  );
};
