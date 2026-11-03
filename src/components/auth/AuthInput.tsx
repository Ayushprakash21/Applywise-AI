import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  isPassword?: boolean;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon, rightElement, isPassword = false, type = 'text', id, className = '', ...props }, ref) => {
    const [passwordVisible, setPasswordVisible] = useState(false);

    const computedType = isPassword ? (passwordVisible ? 'text' : 'password') : type;

    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type={computedType}
            className={`w-full ${icon ? 'pl-10' : 'pl-4'} ${isPassword || rightElement ? 'pr-11' : 'pr-4'} py-2.5 sm:py-3 rounded-xl glass-auth-input text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden transition duration-200 ${className}`}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setPasswordVisible(!passwordVisible)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            >
              {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : (
            rightElement && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {rightElement}
              </div>
            )
          )}
        </div>
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
