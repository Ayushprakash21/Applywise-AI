import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Check, Apple, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import { BrandLogo } from './BrandLogo.tsx';

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z" />
    <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.46-2.36l-3.14-2.45c-.87.58-1.98.93-3.32.93-2.55 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.75Z" />
    <path fill="#FBBC05" d="M6.53 13.84A5.86 5.86 0 0 1 6.22 12c0-.64.11-1.26.31-1.84V7.63H3.28A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.03 4.37l3.25-2.53Z" />
    <path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.2 14.62 2.25 12 2.25a9.75 9.75 0 0 0-8.72 5.38l3.25 2.53C7.3 7.85 9.45 6.13 12 6.13Z" />
  </svg>
);

export interface FlowSignupProps {
  title?: string;
  subtitle?: string;
  initialExpanded?: boolean;
  showSocial?: boolean;
  showTerms?: boolean;
  compactText?: string;
  primaryText?: string;
  onSuccess?: (user: AuthUser, token: string) => void;
  onNavigateToLogin?: () => void;
  onNavigateHome?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

export const FlowSignup: React.FC<FlowSignupProps> = ({
  title = 'Create your account',
  subtitle = 'Join ApplyWise AI for truthful job discovery and tailored applications.',
  initialExpanded = true,
  showSocial = true,
  showTerms = true,
  compactText = 'Sign up',
  primaryText = 'Create Account',
  onSuccess,
  onNavigateToLogin,
  onNavigateHome,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Social Auth Config state
  const [authConfig, setAuthConfig] = useState<{
    googleClientId: string | null;
    googleAuthEnabled: boolean;
    appleClientId?: string | null;
    appleAuthEnabled?: boolean;
  } | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);

  // Check auth configuration on mount
  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const cfg = await api.getAuthConfig();
        if (!isMounted) return;
        setAuthConfig(cfg);

        if (cfg.googleClientId && cfg.googleAuthEnabled) {
          const attachGsi = () => {
            if (!isMounted) return;
            const google = (window as any).google;
            if (google?.accounts?.id && googleBtnRef.current) {
              google.accounts.id.initialize({
                client_id: cfg.googleClientId,
                callback: async (response: any) => {
                  if (!response?.credential) return;
                  setSocialLoading(true);
                  setError(null);
                  try {
                    const res = await api.loginWithGoogle(response.credential);
                    localStorage.setItem('applywise_token', res.token);
                    localStorage.setItem('applywise_user', JSON.stringify(res.user));
                    setSuccessMsg('Google registration verified! Redirecting...');
                    setTimeout(() => {
                      if (onSuccess) onSuccess(res.user, res.token);
                    }, 500);
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    setError(`Google Sign-In failed: ${msg}`);
                  } finally {
                    setSocialLoading(false);
                  }
                },
                auto_select: false,
                cancel_on_tap_outside: true,
              });

              googleBtnRef.current.innerHTML = '';
              google.accounts.id.renderButton(googleBtnRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'signup_with',
                shape: 'rectangular',
                width: 280,
              });
              setGoogleButtonRendered(true);
            }
          };

          if ((window as any).google?.accounts?.id) {
            attachGsi();
          } else {
            let count = 0;
            const timer = setInterval(() => {
              count++;
              if ((window as any).google?.accounts?.id) {
                clearInterval(timer);
                attachGsi();
              } else if (count >= 20) {
                clearInterval(timer);
              }
            }, 150);
          }
        }
      } catch (err) {
        console.warn('Failed to load auth config:', err);
      }
    };
    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, [onSuccess]);

  // Dynamic Password Strength Meter
  const calculateStrength = (pwd: string) => {
    if (!pwd) return { level: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;

    if (score === 1 || pwd.length < 8) return { level: 1, label: 'Weak (8+ characters needed)', color: 'bg-amber-400' };
    if (score === 2) return { level: 2, label: 'Moderate', color: 'bg-blue-500' };
    return { level: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = calculateStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccessMsg(null);

    // Validation
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }
    if (showTerms && !terms) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.signup({
        fullName: cleanName,
        email: cleanEmail,
        password,
        confirmPassword,
      });

      localStorage.setItem('applywise_token', res.token);
      localStorage.setItem('applywise_user', JSON.stringify(res.user));
      setSuccessMsg('Account created successfully! Preparing your workspace...');

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(res.user, res.token);
        }
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Registration failed. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    setError(null);
    if (!authConfig?.googleAuthEnabled || !authConfig?.googleClientId) {
      setError('Google Sign-Up is not configured for this deployment. Please register using your email and password below.');
      return;
    }
    const google = (window as any).google;
    if (google?.accounts?.id) {
      google.accounts.id.prompt();
    } else {
      setError('Google Sign-In is still initializing. Please wait a moment or sign up with email.');
    }
  };

  const handleAppleClick = () => {
    setError(null);
    if (!authConfig?.appleAuthEnabled) {
      setError('Apple Sign-Up is currently unconfigured. Please create your account with your email and password.');
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

        {/* Signup Card */}
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
              {title}
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto">
              {subtitle}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Full name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  disabled={loading}
                  required
                  className="h-11 w-full rounded-xl neu-input pl-10 pr-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Email Address */}
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
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Password
                </label>
                {password.length > 0 && (
                  <span className="text-[11px] font-medium text-slate-500">
                    {strength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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

              {/* Password Strength Indicator */}
              <div className="mt-2 flex gap-1.5" aria-hidden="true">
                {[1, 2, 3].map(lvl => (
                  <div
                    key={lvl}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      strength.level >= lvl ? strength.color : 'bg-slate-300/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Confirm password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={confirmVisible ? 'text' : 'password'}
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  disabled={loading}
                  required
                  className="h-11 w-full rounded-xl neu-input pl-10 pr-10 text-xs font-medium text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setConfirmVisible(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  aria-label={confirmVisible ? 'Hide password' : 'Show password'}
                >
                  {confirmVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                  Passwords do not match.
                </p>
              )}
            </div>

            {/* Terms of Service Checkbox */}
            {showTerms && (
              <div className="pt-1">
                <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={e => setTerms(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600 leading-snug">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (onOpenTerms) onOpenTerms();
                      }}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (onOpenPrivacy) onOpenPrivacy();
                      }}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (showTerms && !terms) || (confirmPassword.length > 0 && password !== confirmPassword)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl neu-button-primary text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>Creating your account...</span>
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

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Google Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleGoogleClick}
                      disabled={loading || socialLoading}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl neu-button text-xs font-medium text-slate-700 disabled:opacity-50"
                    >
                      <GoogleIcon size={16} />
                      <span>Google</span>
                    </button>
                    <div ref={googleBtnRef} className="hidden" />
                  </div>

                  {/* Apple Button */}
                  <button
                    type="button"
                    onClick={handleAppleClick}
                    disabled={loading || socialLoading}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl neu-button text-xs font-medium text-slate-700 disabled:opacity-50"
                  >
                    <Apple size={16} />
                    <span>Apple</span>
                  </button>
                </div>
              </>
            )}

            {/* Footer Navigation */}
            <div className="pt-4 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
              >
                Sign in
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default FlowSignup;
