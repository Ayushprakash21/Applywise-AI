import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AuthUser } from '../services/api.ts';
import { FlowLogin } from './FlowLogin.tsx';
import { FlowSignup } from './FlowSignup.tsx';

export interface AuthModalsProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup' | 'recovery';
  onClose: () => void;
  onSuccess: (user: AuthUser, token?: string, isNewRegistration?: boolean) => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button Floating on top right */}
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {mode === 'signup' ? (
          <FlowSignup
            initialExpanded={true}
            onSuccess={(user, token) => {
              onSuccess(user, token, true);
              onClose();
            }}
            onNavigateToLogin={() => setMode('login')}
            onOpenTerms={onOpenTerms}
            onOpenPrivacy={onOpenPrivacy}
          />
        ) : (
          <FlowLogin
            onSuccess={(user, token) => {
              onSuccess(user, token, false);
              onClose();
            }}
            onNavigateToSignup={() => setMode('signup')}
          />
        )}
      </div>
    </div>
  );
};

export default AuthModals;
