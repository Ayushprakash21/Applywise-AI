import React from 'react';

export const GoogleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`shrink-0 ${className}`}
  >
    <path
      fill="#4285F4"
      d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z"
    />
    <path
      fill="#34A853"
      d="M12 21.75c2.63 0 4.84-.87 6.46-2.36l-3.14-2.45c-.87.58-1.98.93-3.32.93-2.55 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.75Z"
    />
    <path
      fill="#FBBC05"
      d="M6.53 13.84A5.86 5.86 0 0 1 6.22 12c0-.64.11-1.26.31-1.84V7.63H3.28A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.03 4.37l3.25-2.53Z"
    />
    <path
      fill="#EA4335"
      d="M12 6.13c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.2 14.62 2.25 12 2.25a9.75 9.75 0 0 0-8.72 5.38l3.25 2.53C7.3 7.85 9.45 6.13 12 6.13Z"
    />
  </svg>
);

export interface GoogleAuthButtonProps {
  mode: 'signin' | 'signup';
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  mode,
  onClick,
  loading = false,
  disabled = false,
  className = '',
  children,
}) => {
  const label = mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google';

  return (
    <div
      data-testid="google-auth-button"
      className={`glass-google-btn group relative w-full h-[50px] min-h-[50px] px-2 rounded-[14px] 
        bg-white/35 hover:bg-white/55 active:bg-white/40
        backdrop-blur-xl -webkit-backdrop-blur-xl
        border border-white/65 hover:border-violet-300/80 active:border-white/70
        shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.85),0_2px_8px_rgba(15,23,42,0.04)]
        hover:shadow-[0_10px_25px_-4px_rgba(128,101,245,0.22),0_0_15px_rgba(128,101,245,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)]
        hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
        focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#8065F5]/60 focus-visible:ring-offset-2
        text-[#0F172A] font-semibold text-sm tracking-tight
        flex items-center justify-center
        transition-all duration-200 cubic-bezier(0.34, 1.56, 0.64, 1)
        overflow-hidden ${className}`}
    >
      {/* Specular glass reflection line at top */}
      <span
        className="pointer-events-none absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent"
        aria-hidden="true"
      />

      {loading ? (
        <div className="flex items-center space-x-2.5 text-[#0F172A]">
          <div className="w-4 h-4 border-2 border-[#8065F5]/30 border-t-[#8065F5] rounded-full animate-spin" />
          <span className="text-xs font-medium">Connecting to Google...</span>
        </div>
      ) : children ? (
        children
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || loading}
          aria-label={label}
          className="w-full h-full flex items-center justify-center space-x-3 cursor-pointer select-none"
        >
          <GoogleIcon size={20} className="transition-transform duration-200 group-hover:scale-105" />
          <span className="truncate">{label}</span>
        </button>
      )}
    </div>
  );
};
