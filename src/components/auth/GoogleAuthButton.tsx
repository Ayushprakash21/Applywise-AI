import React from 'react';

export const GoogleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z" />
    <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.46-2.36l-3.14-2.45c-.87.58-1.98.93-3.32.93-2.55 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.75Z" />
    <path fill="#FBBC05" d="M6.53 13.84A5.86 5.86 0 0 1 6.22 12c0-.64.11-1.26.31-1.84V7.63H3.28A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.03 4.37l3.25-2.53Z" />
    <path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.2 14.62 2.25 12 2.25a9.75 9.75 0 0 0-8.72 5.38l3.25 2.53C7.3 7.85 9.45 6.13 12 6.13Z" />
  </svg>
);

export interface GoogleAuthButtonProps {
  mode: 'signin' | 'signup';
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  mode,
  onClick,
  loading = false,
  disabled = false,
  className = '',
}) => {
  const label = mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn-bouncy w-full py-3 px-4 rounded-xl bg-white/45 hover:bg-white/70 backdrop-blur-md border border-white/75 shadow-xs hover:shadow-md text-slate-800 font-medium text-xs sm:text-sm flex items-center justify-center space-x-2.5 transition-all duration-200 cursor-pointer disabled:opacity-50 select-none ${className}`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
      ) : (
        <>
          <GoogleIcon size={18} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
