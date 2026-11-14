import React from 'react';

export interface EliteCrownBadgeProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

export const EliteCrownBadge: React.FC<EliteCrownBadgeProps> = ({
  className = '',
  size = 'sm',
}) => {
  const sizeMap = {
    xs: { px: 14, wrap: 'p-1', crown: 'h-3 w-3' },
    sm: { px: 18, wrap: 'p-1.5', crown: 'h-4 w-4' },
    md: { px: 22, wrap: 'p-2', crown: 'h-5 w-5' },
  };

  const current = sizeMap[size] || sizeMap.sm;

  return (
    <div
      title="BLACK ELITE"
      aria-label="BLACK ELITE"
      className={`group relative inline-flex items-center justify-center rounded-lg border transition-all duration-200 cursor-default select-none ${current.wrap} ${className}`}
      style={{
        backgroundColor: 'var(--be-bg-elevated, #14171C)',
        borderColor: 'var(--be-border-subtle, rgba(198, 166, 106, 0.25))',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${current.crown} transition-transform duration-200 group-hover:scale-110`}
        style={{ color: 'var(--be-accent, #C6A66A)' }}
      >
        <path
          d="M3 18L5 8L9.5 13L12 6L14.5 13L19 8L21 18H3Z"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M5 18H19"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <circle cx="12" cy="6" r="0.75" fill="currentColor" />
        <circle cx="5" cy="8" r="0.75" fill="currentColor" />
        <circle cx="21" cy="8" r="0.75" fill="currentColor" />
      </svg>

      {/* Floating Tooltip Indicator */}
      <span className="pointer-events-none absolute left-1/2 -bottom-8 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase bg-[#111318] text-[#C6A66A] border border-[rgba(198,166,106,0.30)] shadow-lg shadow-black/60">
        BLACK ELITE
      </span>
    </div>
  );
};
