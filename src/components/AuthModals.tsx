import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface AuthModalsProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup' | 'recovery';
  onClose: () => void;
  onSuccess: (user: AuthUser, token?: string, isNewRegistration?: boolean) => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAuthConfig, setGoogleAuthConfig] = useState<{ googleClientId: string | null; googleAuthEnabled: boolean } | null>(null);
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!isOpen || mode === 'recovery') return;
    let isMounted = true;

    const setupGoogle = async () => {
      try {
        const cfg = await api.getAuthConfig();
        if (!isMounted) return;
        setGoogleAuthConfig(cfg);

        if (!cfg.googleClientId || !cfg.googleAuthEnabled) {
          setGoogleButtonRendered(false);
          return;
        }

        const attachGsi = () => {
          if (!isMounted) return;
          const google = (window as any).google;
          if (google?.accounts?.id) {
            google.accounts.id.initialize({
              client_id: cfg.googleClientId,
              callback: async (response: any) => {
                if (!response?.credential) return;
                setGoogleLoading(true);
                setError(null);
                try {
                  const res = await api.loginWithGoogle(response.credential);
                  localStorage.setItem('applywise_token', res.token);
                  localStorage.setItem('applywise_user', JSON.stringify(res.user));
                  onSuccess(res.user, res.token, (res as any).isNewUser || false);
                  onClose();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err);
                  setError(`Google Sign-In failed: ${msg}`);
                } finally {
                  setGoogleLoading(false);
                }
              },
              auto_select: false,
              cancel_on_tap_outside: true,
            });

            if (googleBtnRef.current) {
              googleBtnRef.current.innerHTML = '';
              const btnWidth = Math.min(320, Math.max(220, window.innerWidth - 64));
              google.accounts.id.renderButton(googleBtnRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: mode === 'signup' ? 'signup_with' : 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: btnWidth,
              });
              setGoogleButtonRendered(true);
            }
          }
        };

        if ((window as any).google?.accounts?.id) {
          attachGsi();
        } else {
          // If script is loading, poll for up to 3 seconds
          let attempts = 0;
          const timer = setInterval(() => {
            attempts++;
            if ((window as any).google?.accounts?.id) {
              clearInterval(timer);
              attachGsi();
            } else if (attempts >= 20) {
              clearInterval(timer);
            }
          }, 150);
        }
      } catch (err) {
        console.warn('Google auth configuration lookup error:', err);
      }
    };

    setupGoogle();

    return () => {
      isMounted = false;
    };
  }, [isOpen, mode, onSuccess, onClose]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccessMsg(null);
    setGoogleLoading(true);

    try {
      const cfg = googleAuthConfig || await api.getAuthConfig();
      if (!cfg.googleClientId || !cfg.googleAuthEnabled) {
        setError('Google Sign-In is not enabled on this deployment. Please sign in or register with email and password.');
        setGoogleLoading(false);
        return;
      }

      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setError('Google sign-in prompt was closed or suppressed by the browser. Please use the rendered Google button above.');
            setGoogleLoading(false);
          }
        });
      } else {
        setError('Google authentication script is still loading. If you are using an adblocker, please allow accounts.google.com, or sign in with email and password.');
        setGoogleLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Google Sign-In: ${msg}`);
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Full name is required.');
        if (!email.trim() || !email.includes('@')) throw new Error('Valid email is required.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        const res = await api.signup({
          fullName,
          email,
          password,
          confirmPassword,
        });

        localStorage.setItem('applywise_token', res.token);
        localStorage.setItem('applywise_user', JSON.stringify(res.user));
        onSuccess(res.user, res.token, true);
        onClose();
      } else if (mode === 'login') {
        if (!email.trim() || !password) throw new Error('Email and password are required.');

        const res = await api.login({ email, password });
        localStorage.setItem('applywise_token', res.token);
        localStorage.setItem('applywise_user', JSON.stringify(res.user));
        onSuccess(res.user, res.token, false);
        onClose();
      } else if (mode === 'recovery') {
        if (!email.trim() || !email.includes('@')) throw new Error('Please enter a valid email address.');
        const res = await api.recoverPassword(email);
        setSuccessMsg(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xl my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header with Close Button */}
        <div className="pt-5 px-5 pb-2 flex items-center justify-between">
          <div className="flex-1 flex justify-center pl-6">
            <BrandLogo size="lg" />
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 pt-2 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {mode === 'signup' && 'Create your free account'}
              {mode === 'login' && 'Welcome back'}
              {mode === 'recovery' && 'Reset your password'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {mode === 'signup' && 'Join ApplyWise AI for truthful job discovery and precision resume tailoring.'}
              {mode === 'login' && 'Sign in to access your tailored resumes and application progress.'}
              {mode === 'recovery' && 'Enter your account email to receive secure password reset instructions.'}
            </p>
          </div>

          {error && (
            <div className="flex items-start space-x-2.5 p-3 rounded-2xl bg-red-50/80 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start space-x-2.5 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-700 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google Sign-in / Sign-up Button */}
          {mode !== 'recovery' && (
            <div className="space-y-4">
              {/* Official Google Identity Services Rendered Button */}
              <div
                ref={googleBtnRef}
                id="google-signin-btn-container"
                className={`w-full flex justify-center min-h-[44px] ${googleButtonRendered ? 'block' : 'hidden'}`}
              />

              {/* Fallback button when official button is still rendering or when GIS is unavailable */}
              {!googleButtonRendered && (
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading || (googleAuthConfig !== null && !googleAuthConfig.googleAuthEnabled)}
                  className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs hover:shadow-sm transition disabled:opacity-50"
                >
                  {googleLoading ? (
                    <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>
                        {googleAuthConfig && !googleAuthConfig.googleAuthEnabled
                          ? 'Continue with Google (Disabled)'
                          : 'Continue with Google'}
                      </span>
                    </>
                  )}
                </button>
              )}

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium">or with email</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>
            </div>

            {mode !== 'recovery' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('recovery'); setError(null); }}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 transition flex items-center justify-center space-x-1.5 touch-target"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'login' && 'Sign In'}
                    {mode === 'recovery' && 'Send Recovery Email'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            {mode === 'login' && (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Sign up free
                </button>
              </p>
            )}

            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}

            {mode === 'recovery' && (
              <p>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Back to login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
