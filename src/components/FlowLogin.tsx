import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Check, Apple, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import { BrandLogo } from './BrandLogo.tsx';
import {
  loadGoogleScript,
  initGoogleIdentity,
  renderGoogleButton,
  unregisterGoogleCallback,
} from '../services/googleAuth.ts';

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z" />
    <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.46-2.36l-3.14-2.45c-.87.58-1.98.93-3.32.93-2.55 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.75Z" />
    <path fill="#FBBC05" d="M6.53 13.84A5.86 5.86 0 0 1 6.22 12c0-.64.11-1.26.31-1.84V7.63H3.28A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.03 4.37l3.25-2.53Z" />
    <path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.2 14.62 2.25 12 2.25a9.75 9.75 0 0 0-8.72 5.38l3.25 2.53C7.3 7.85 9.45 6.13 12 6.13Z" />
  </svg>
);

export interface FlowLoginProps {
  title?: string;
  subtitle?: string;
  showSocial?: boolean;
  showRemember?: boolean;
  showForgot?: boolean;
  compactText?: string;
  primaryText?: string;
  onSuccess?: (user: AuthUser, token: string) => void;
  onNavigateToSignup?: () => void;
  onNavigateHome?: () => void;
}

export const FlowLogin: React.FC<FlowLoginProps> = ({
  title = 'Welcome back',
  subtitle = 'Sign in to access your applications, tailored resumes, and live vacancies.',
  showSocial = true,
  showRemember = true,
  showForgot = true,
  primaryText = 'Sign In',
  onSuccess,
  onNavigateToSignup,
  onNavigateHome,
}) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [remember, setRemember] = useState(() => localStorage.getItem('applyvise_remember') === 'true' || localStorage.getItem('applywise_remember') === 'true');
  const [email, setEmail] = useState(() => localStorage.getItem('applyvise_saved_email') || localStorage.getItem('applywise_saved_email') || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  // Forgot password mode
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Social Auth Config & Google Lifecycle State
  const [authConfig, setAuthConfig] = useState<{
    googleClientId: string | null;
    googleAuthEnabled: boolean;
    appleClientId?: string | null;
    appleAuthEnabled?: boolean;
  } | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);
  const [googleInitError, setGoogleInitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const isSubmittingRef = { current: false };

    const handleCredentialResponse = async (response: any) => {
      if (!response?.credential) return;
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setSocialLoading(true);
      setError(null);

      try {
        const res = await api.loginWithGoogle(response.credential);
        localStorage.setItem('applyvise_token', res.token);
        localStorage.setItem('applywise_token', res.token);
        localStorage.setItem('applyvise_user', JSON.stringify(res.user));
        localStorage.setItem('applywise_user', JSON.stringify(res.user));
        setSuccessMsg('Authenticated via Google! Loading your dashboard...');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.user, res.token);
        }, 500);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Google Sign-In failed: ${msg}`);
        isSubmittingRef.current = false;
      } finally {
        if (isMounted) setSocialLoading(false);
      }
    };

    const setupGoogle = async () => {
      try {
        const cfg = await api.getAuthConfig();
        if (!isMounted) return;
        setAuthConfig(cfg);

        if (cfg.googleClientId && cfg.googleAuthEnabled) {
          await loadGoogleScript();
          if (!isMounted) return;

          initGoogleIdentity(cfg.googleClientId, handleCredentialResponse);

          if (googleBtnRef.current && isMounted) {
            renderGoogleButton(googleBtnRef.current, {
              mode: 'signin',
              theme: 'outline',
              size: 'large',
              width: 320,
            });
            setGoogleButtonRendered(true);
            setGoogleInitError(null);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Google authentication unavailable';
        setGoogleInitError(msg);
      }
    };

    setupGoogle();

    return () => {
      isMounted = false;
      unregisterGoogleCallback(handleCredentialResponse);
    };
  }, [onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.login({ email: cleanEmail, password });

      // Handle Remember Me
      if (remember) {
        localStorage.setItem('applyvise_remember', 'true');
        localStorage.setItem('applywise_remember', 'true');
        localStorage.setItem('applyvise_saved_email', cleanEmail);
        localStorage.setItem('applywise_saved_email', cleanEmail);
      } else {
        localStorage.removeItem('applyvise_remember');
        localStorage.removeItem('applywise_remember');
        localStorage.removeItem('applyvise_saved_email');
        localStorage.removeItem('applywise_saved_email');
      }

      localStorage.setItem('applyvise_token', res.token);
      localStorage.setItem('applywise_token', res.token);
      localStorage.setItem('applyvise_user', JSON.stringify(res.user));
      localStorage.setItem('applywise_user', JSON.stringify(res.user));
      setSuccessMsg('Welcome back! Loading your dashboard...');

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(res.user, res.token);
        }
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryLoading) return;
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = recoveryEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address to receive recovery instructions.');
      return;
    }

    setRecoveryLoading(true);

    try {
      const res = await api.recoverPassword(cleanEmail);
      setSuccessMsg(res.message || 'If an account exists with this email, password reset instructions have been sent.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Password recovery request failed. Please try again.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleGoogleClick = () => {
    setError(null);
    if (!authConfig?.googleAuthEnabled || !authConfig?.googleClientId) {
      setError('Google Sign-In is not configured for this deployment. Please sign in using your email and password below.');
      return;
    }
    if (googleInitError) {
      setError(googleInitError);
      return;
    }
    const google = (window as any).google;
    if (!google?.accounts?.id) {
      setError('Google authentication script is still loading. If you are using an adblocker, please allow accounts.google.com, or sign in with email and password.');
      return;
    }
    if (googleBtnRef.current) {
      renderGoogleButton(googleBtnRef.current, { mode: 'signin', width: 320 });
      setGoogleButtonRendered(true);
    }
  };

  const handleAppleClick = () => {
    setError(null);
    if (!authConfig?.appleAuthEnabled) {
      setError('Apple Sign-In is currently unconfigured. Please sign in with your email and password.');
      return;
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-140px)] w-full items-center justify-center px-4 py-8 font-sans">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/40 blur-[120px]" />

      <div className="relative flex w-full max-w-[440px] flex-col items-center">
        {/* Navigation Home Link */}
        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            type="button"
            className="mb-4 inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </button>
        )}

        {/* Floating Brand Monogram */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease }}
          className="relative mb-3 flex items-center justify-center"
        >
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl neu-panel p-2">
            <BrandLogo size="sm" showWordmark={false} />
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={false}
          animate={{
            borderRadius: 24,
          }}
          transition={{ duration: 0.5, ease }}
          className="relative w-full overflow-hidden rounded-3xl neu-panel p-6 sm:p-8"
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isForgotMode ? 'Reset your password' : title}
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto">
              {isForgotMode
                ? 'Enter your account email to receive secure recovery instructions.'
                : subtitle}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mt-4 flex items-start space-x-2.5 rounded-xl bg-red-50 border border-red-200/80 p-3 text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="mt-4 flex items-start space-x-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 p-3 text-xs text-emerald-700 animate-in fade-in duration-150">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <div className="flex-1">{successMsg}</div>
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {isForgotMode ? (
            <form onSubmit={handleForgotPasswordSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Account email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="recoveryEmail"
                    autoComplete="email"
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={recoveryLoading}
                    required
                    className="h-11 w-full rounded-xl neu-input pl-10 pr-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={recoveryLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl neu-button-primary text-xs font-semibold disabled:opacity-50"
              >
                {recoveryLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    <span>Sending instructions...</span>
                  </>
                ) : (
                  'Send Reset Instructions'
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(false);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
                >
                  Return to sign in
                </button>
              </div>
            </form>
          ) : (
            /* STANDARD LOGIN FORM */
            <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
              {/* Email */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                    required
                    className="h-11 w-full rounded-xl neu-input pl-10 pr-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your password"
                    disabled={loading}
                    required
                    className="h-11 w-full rounded-xl neu-input pl-10 pr-10 text-xs font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setPasswordVisible(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  >
                    {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me / Forgot Password Controls */}
              <div className="flex items-center justify-between pt-1">
                {showRemember ? (
                  <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                      disabled={loading}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Remember me</span>
                  </label>
                ) : (
                  <span />
                )}

                {showForgot && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true);
                      setRecoveryEmail(email);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl neu-button-primary text-xs font-semibold disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  primaryText
                )}
              </button>

              {/* Social Divider */}
              {showSocial && (
                <>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="h-px flex-1 bg-slate-300/60" />
                    <span className="text-[11px] font-medium text-slate-400">
                      or continue with
                    </span>
                    <span className="h-px flex-1 bg-slate-300/60" />
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {/* Google Official Button Container - Real, Clickable, No Hidden Duplicate */}
                    <div className="w-full flex flex-col items-center justify-center min-h-[44px]">
                      <div
                        ref={googleBtnRef}
                        className="w-full flex justify-center items-center min-h-[44px]"
                      >
                        {!googleButtonRendered && (
                          <div className="w-full max-w-[320px]">
                            {!authConfig?.googleAuthEnabled ? (
                              <button
                                type="button"
                                onClick={handleGoogleClick}
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl neu-button text-xs font-medium text-slate-700 opacity-60"
                              >
                                <GoogleIcon size={16} />
                                <span>Google Sign-In (Unconfigured)</span>
                              </button>
                            ) : googleInitError ? (
                              <button
                                type="button"
                                onClick={handleGoogleClick}
                                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl neu-button text-xs font-medium text-slate-700 hover:text-blue-600"
                              >
                                <GoogleIcon size={16} />
                                <span>Retry Loading Google Sign-In</span>
                              </button>
                            ) : (
                              <div className="flex h-11 w-full items-center justify-center gap-2 rounded-xl neu-inset text-xs font-medium text-slate-500">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                <span>Initializing Google Sign-In...</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Apple Button (shown only when configured) */}
                    {authConfig?.appleAuthEnabled && (
                      <button
                        type="button"
                        onClick={handleAppleClick}
                        disabled={loading || socialLoading}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl neu-button text-xs font-medium text-slate-700 disabled:opacity-50"
                      >
                        <Apple size={16} />
                        <span>Sign in with Apple</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Footer Navigation */}
              <div className="pt-4 text-center text-xs text-slate-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={onNavigateToSignup}
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
                >
                  Create account
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default FlowLogin;
