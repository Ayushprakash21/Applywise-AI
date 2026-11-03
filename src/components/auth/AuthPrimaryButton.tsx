import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface AuthPrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const AuthPrimaryButton: React.FC<AuthPrimaryButtonProps> = ({
  loading = false,
  icon = <ArrowRight className="w-4 h-4" />,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={`btn-bouncy w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-[#8065F5] text-white font-medium text-sm shadow-md shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 active:shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer transition-all duration-200 select-none ${className}`}
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
