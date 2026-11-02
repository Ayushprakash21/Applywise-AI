import React from 'react';

interface BrandLogoProps {
  variant?: 'light' | 'dark' | 'auto';
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'light',
  showWordmark = true,
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 26, text: 'text-sm', badge: 'text-[9px] px-1 py-0.2' },
    md: { icon: 34, text: 'text-base', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { icon: 44, text: 'text-xl', badge: 'text-xs px-2 py-0.5' },
    xl: { icon: 56, text: 'text-2xl', badge: 'text-xs px-2.5 py-1' },
  };

  const dim = sizeMap[size];
  const isDarkBg = variant === 'dark';

  return (
    <div className={`inline-flex items-center space-x-2.5 select-none ${className}`}>
      {/* Original Vector Symbol: Document + Career Trajectory + Checkmark */}
      <div
        className="relative flex items-center justify-center rounded-xl shadow-sm transition-transform hover:scale-105"
        style={{ width: dim.icon, height: dim.icon }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Subtle gradient defs */}
          <defs>
            <linearGradient id="awDocGrad" x1="6" y1="4" x2="38" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="0.6" stopColor="#2563EB" />
              <stop offset="1" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="awTrajectoryGrad" x1="12" y1="36" x2="42" y2="10" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10B981" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="awFoldGrad" x1="30" y1="4" x2="40" y2="14" gradientUnits="userSpaceOnUse">
              <stop stopColor="#93C5FD" />
              <stop offset="1" stopColor="#60A5FA" />
            </linearGradient>
          </defs>

          {/* Document Sheet Base with gentle rounded corners */}
          <path
            d="M10 6C10 4.89543 10.8954 4 12 4H30L40 14V42C40 43.1046 39.1046 44 38 44H12C10.8954 44 10 43.1046 10 42V6Z"
            fill="url(#awDocGrad)"
            rx="4"
          />

          {/* Document Folded Corner */}
          <path
            d="M30 4L40 14H32C30.8954 14 30 13.1046 30 12V4Z"
            fill="url(#awFoldGrad)"
          />

          {/* Document Subtle Content Lines */}
          <line x1="16" y1="16" x2="26" y2="16" stroke="white" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="16" y1="22" x2="22" y2="22" stroke="white" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" />

          {/* Upward Career Trajectory Arrow Vector */}
          <path
            d="M14 34L26 22L32 28L42 16"
            stroke="url(#awTrajectoryGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M34 16H42V24"
            stroke="url(#awTrajectoryGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Integrated Verified Checkmark */}
          <circle cx="21" cy="30" r="6.5" fill="#10B981" />
          <path
            d="M18 30L20 32L24.5 27.5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Wordmark */}
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
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            PRO
          </span>
        </div>
      )}
    </div>
  );
};
