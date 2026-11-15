import React from 'react';
import { LeoCharacter, LeoState } from './LeoCharacter.tsx';

export interface LeoAvatarProps {
  state?: LeoState;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  interactive?: boolean;
  showStatusIndicator?: boolean;
  status?: 'online' | 'thinking' | 'offline';
  onClick?: () => void;
}

export const LeoAvatar: React.FC<LeoAvatarProps> = ({
  state = 'idle',
  size = 'md',
  className = '',
  interactive = true,
  showStatusIndicator = false,
  status = 'online',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 ${
        onClick ? 'cursor-pointer hover:scale-[1.03] transition-transform duration-200' : ''
      } ${className}`}
    >
      {/* Ambient soft glow ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/15 via-amber-400/10 to-sky-400/15 blur-xs pointer-events-none" />

      {/* Animated Character */}
      <LeoCharacter
        state={state}
        size={size}
        interactive={interactive}
        showPaw={true}
        showTail={true}
        showCollar={true}
      />

      {/* Availability Status Badge */}
      {showStatusIndicator && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
          {status === 'thinking' ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border-2 border-slate-900" />
            </>
          ) : (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900" />
            </>
          )}
        </span>
      )}
    </div>
  );
};
