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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[540px] my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button Floating on top right */}
        <button
          onClick={onClose}
          type="button"
          className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 hover:text-slate-900 shadow-md border border-slate-200/80 transition hover:scale-105 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {mode === 'signup' ? (
          <FlowSignup
            initialExpanded={true}
            isModal={true}
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
            isModal={true}
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
