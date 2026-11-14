import React from 'react';
import { Sun, MoonStar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';

export interface GlobalThemeSwitchProps {
  className?: string;
  size?: 'sm' | 'md';
  id?: string;
}

/**
 * GlobalThemeSwitch
 * Platform-wide sliding Light/Dark Mode toggle inspired by the reference design.
 * Features a soft-inset track, circular sliding knob, responsive icons,
 * full keyboard accessibility, and immediate synchronization with the central ThemeContext.
 */
export const GlobalThemeSwitch: React.FC<GlobalThemeSwitchProps> = ({
  className = '',
  size = 'md',
  id = 'global-theme-switch',
}) => {
  const { isDark, setAppearance, toggleAppearance } = useTheme();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleAppearance();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isDark) setAppearance('dark');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (isDark) setAppearance('light');
    }
  };

  const isSmall = size === 'sm';
  const label = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      data-testid="global-theme-switch"
      onClick={toggleAppearance}
      onKeyDown={handleKeyDown}
      className={`group relative inline-flex items-center shrink-0 rounded-full transition-all duration-300 ease-in-out cursor-pointer select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--be-accent,#A78343)] ${
        isSmall ? 'w-14 h-7 p-0.5' : 'w-16 h-8.5 p-1'
      } ${
        isDark
          ? 'bg-[#202738] border border-[#313A52] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] hover:border-[#414D6D]'
          : 'bg-[#E2E6EC] border border-[#CBD2DC] shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] hover:border-[#B4BDCB]'
      } ${className}`}
    >
      {/* Background Icon Track (Stationary icons positioned at left and right) */}
      <div
        className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none"
        aria-hidden="true"
      >
        {/* Left track slot: Sun icon */}
        <span
          className={`flex items-center justify-center transition-opacity duration-200 ${
            isDark ? 'opacity-50 text-[#6B768E]' : 'opacity-0'
          }`}
        >
          <Sun className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </span>

        {/* Right track slot: MoonStar icon */}
        <span
          className={`flex items-center justify-center transition-opacity duration-200 ${
            isDark ? 'opacity-0' : 'opacity-50 text-[#8C95A5]'
          }`}
        >
          <MoonStar className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </span>
      </div>

      {/* Circular Sliding Knob with Active Foreground Icon */}
      <span
        aria-hidden="true"
        className={`relative flex items-center justify-center rounded-full bg-white transition-all duration-300 ease-in-out shadow-[0_2px_6px_rgba(0,0,0,0.22),0_1px_2px_rgba(0,0,0,0.12)] border border-black/5 group-hover:scale-[1.03] group-active:scale-[0.97] ${
          isSmall ? 'w-6 h-6' : 'w-6.5 h-6.5'
        } ${
          isDark
            ? isSmall
              ? 'translate-x-7'
              : 'translate-x-[30px]'
            : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <MoonStar className={`text-[#4F46E5] ${isSmall ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'}`} />
        ) : (
          <Sun className={`text-[#D97706] ${isSmall ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'}`} />
        )}
      </span>
    </button>
  );
};
