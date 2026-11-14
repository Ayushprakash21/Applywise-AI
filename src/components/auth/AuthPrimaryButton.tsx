import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface AuthPrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const AuthPrimaryButton: React.FC<AuthPrimaryButtonProps> = ({
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={`w-full py-3 px-6 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer transition-colors duration-150 select-none ${className}`}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <span>{children}</span>
          {icon}
        </>
      )}
    </button>
  );
};
