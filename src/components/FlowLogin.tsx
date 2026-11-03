import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import { AuthHeader } from './AuthHeader.tsx';
import { AuthVisualCanvas } from './AuthVisualCanvas.tsx';
import { AuthFeatureCards } from './AuthFeatureCards.tsx';
import { AuthBackground } from './auth/AuthBackground.tsx';
import { AuthGlassCard } from './auth/AuthGlassCard.tsx';
import { GoogleAuthButton } from './auth/GoogleAuthButton.tsx';
import {
  loadGoogleScript,
  initGoogleIdentity,
  renderGoogleButton,
  unregisterGoogleCallback,
} from '../services/googleAuth.ts';

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
  title = 'Welcome Back',
  subtitle = 'Sign in to access your applications, tailored resumes, and live opportunities.',
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
              width: 360,
            });
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
    setSocialLoading(true);
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed()) {
        if (googleBtnRef.current) {
          renderGoogleButton(googleBtnRef.current, { mode: 'signin', width: 360 });
          setGoogleButtonRendered(true);
        }
        setSocialLoading(false);
      } else if (notification.isDismissedMoment()) {
        setSocialLoading(false);
      }
    });
  };

  const handleAppleClick = () => {
    setError(null);
    if (!authConfig?.appleAuthEnabled) {
      setError('Apple Sign-In is currently unconfigured. Please sign in with your email and password.');
      return;
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#E9EEF6] font-sans flex flex-col overflow-x-hidden selection:bg-violet-200 selection:text-violet-900">
      {/* 1. SHARED GLOBAL NAVIGATION HEADER */}
      <AuthHeader
        activePage="login"
        onNavigateHome={onNavigateHome}
        onNavigateLogin={() => {}}
        onNavigateSignup={onNavigateToSignup}
      />

      {/* 2. DYNAMIC ANIMATED AMBIENT BACKGROUND WITH LIGHT ORBS */}
      <AuthBackground />

      {/* 3. MAIN AUTHENTICATION CONTAINER (Two-Column Desktop, Stacked Mobile) */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Frosted Glass Authentication Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-start">
            <AuthGlassCard className="max-w-[440px] p-6 sm:p-8">
              {isForgotMode ? (
                /* FORGOT PASSWORD RECOVERY PANEL */
                <div className="space-y-6">
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-700 border border-violet-300/30 mb-3">
                      Password Recovery
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Reset Password
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      Enter your verified email address to receive password recovery instructions.
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="recovery-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="recovery-email"
                          type="email"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl glass-auth-input text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={recoveryLoading}
                      className="btn-bouncy w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-[#8065F5] text-white font-medium text-sm shadow-md shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 active:shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer transition-all duration-200 select-none"
                    >
                      {recoveryLoading ? 'Sending Instructions...' : 'Send Recovery Link'}
                    </button>
                  </form>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(false);
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs font-semibold text-[#8065F5] hover:text-blue-700 transition cursor-pointer"
                    >
                      &larr; Return to sign in
                    </button>
                  </div>
                </div>
              ) : (
                /* STANDARD SIGN IN FORM */
                <div className="space-y-5">
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 border border-blue-300/30 mb-2.5">
                      Welcome Back
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                      Sign In to ApplyVise AI
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                      {subtitle}
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-xs text-red-700">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Input */}
                    <div>
                      <label htmlFor="login-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="login-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          autoComplete="email"
                          className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl glass-auth-input text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
                          required
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div>
                      <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="login-password"
                          type={passwordVisible ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className="w-full pl-10 pr-11 py-2.5 sm:py-3 rounded-xl glass-auth-input text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden transition"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setPasswordVisible(!passwordVisible)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                          aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                        >
                          {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me & Forgot Password Row */}
                    <div className="flex items-center justify-between pt-1">
                      {showRemember && (
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-[#8065F5]/30 cursor-pointer"
                          />
                          <span className="text-xs text-slate-600 font-medium">Remember me</span>
                        </label>
                      )}

                      {showForgot && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotMode(true);
                            setError(null);
                            setSuccessMsg(null);
                          }}
                          className="text-xs font-medium text-[#8065F5] hover:text-blue-700 transition cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>

                    {/* Submit Primary CTA */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-bouncy w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-[#8065F5] text-white font-medium text-sm shadow-md shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 active:shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer transition-all duration-200 select-none"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{primaryText}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Social Divider */}
                  {showSocial && (
                    <div className="pt-2">
                      <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-300/40" />
                        <span className="shrink-0 mx-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                          Or continue with
                        </span>
                        <div className="flex-grow border-t border-slate-300/40" />
                      </div>

                      {/* Google Auth Container */}
                      <div className="mt-3 relative">
                        {/* Mounted GSI Target */}
                        <div
                          ref={googleBtnRef}
                          className={`w-full flex justify-center min-h-[44px] ${googleButtonRendered ? 'block' : 'hidden'}`}
                        />

                        {/* Visual Glass Button (fallback/display before GSI mounts) */}
                        {!googleButtonRendered && (
                          <GoogleAuthButton
                            mode="signin"
                            onClick={handleGoogleClick}
                            disabled={socialLoading}
                            loading={socialLoading}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom Redirect Link */}
                  <div className="pt-4 text-center border-t border-slate-300/40">
                    <p className="text-xs text-slate-500">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={onNavigateToSignup}
                        className="font-semibold text-[#8065F5] hover:text-blue-700 transition cursor-pointer"
                      >
                        Sign Up
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </AuthGlassCard>
          </div>

          {/* RIGHT COLUMN: Cinematic 3D Career Discovery Sculpture & Feature Highlights */}
          <div className="lg:col-span-7 hidden lg:flex items-center justify-between gap-6 relative">
            {/* 3D Visual Area */}
            <div className="flex-1 min-h-[520px] xl:min-h-[600px] relative flex items-center justify-center">
              <AuthVisualCanvas mode="signin" />
            </div>

            {/* Floating Glass Feature Highlights */}
            <div className="hidden xl:flex shrink-0">
              <AuthFeatureCards mode="signin" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
