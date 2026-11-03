import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Check, Apple, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import { AuthHeader } from './AuthHeader.tsx';
import { AuthVisualCanvas } from './AuthVisualCanvas.tsx';
import { AuthFeatureCards } from './AuthFeatureCards.tsx';
import {
  loadGoogleScript,
  initGoogleIdentity,
  renderGoogleButton,
  unregisterGoogleCallback,
} from '../services/googleAuth.ts';

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
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
  title = 'Create Your Account',
  subtitle = 'Join ApplyVise AI for truthful job discovery and tailored applications.',
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
  const [googleInitError, setGoogleInitError] = useState<string | null>(null);

  // Check auth configuration and initialize Google Identity Services
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
        setSuccessMsg('Google registration verified! Redirecting to your dashboard...');
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
              mode: 'signup',
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

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-red-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: '', color: 'bg-slate-200' };
    }
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccessMsg(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both password entries.');
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
      });

      localStorage.setItem('applyvise_token', res.token);
      localStorage.setItem('applywise_token', res.token);
      localStorage.setItem('applyvise_user', JSON.stringify(res.user));
      localStorage.setItem('applywise_user', JSON.stringify(res.user));
      setSuccessMsg('Account created successfully! Loading your career dashboard...');

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(res.user, res.token);
        }
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'An error occurred during account creation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    setError(null);
    if (!authConfig?.googleAuthEnabled || !authConfig?.googleClientId) {
      setError('Google Sign-Up is not configured for this deployment. Please register using the form below.');
      return;
    }
    if (googleInitError) {
      setError(googleInitError);
      return;
    }
    const google = (window as any).google;
    if (!google?.accounts?.id) {
      setError('Google authentication script is still loading. If you are using an adblocker, please allow accounts.google.com, or sign up with email and password.');
      return;
    }
    if (googleBtnRef.current) {
      renderGoogleButton(googleBtnRef.current, { mode: 'signup', width: 320 });
      setGoogleButtonRendered(true);
    }
  };

  const handleAppleClick = () => {
    setError(null);
    if (!authConfig?.appleAuthEnabled) {
      setError('Apple Sign-Up is currently unconfigured. Please register with your email and password.');
      return;
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#E9EEF6] font-sans flex flex-col overflow-x-hidden selection:bg-violet-200 selection:text-violet-900">
      {/* 1. SHARED GLOBAL NAVIGATION HEADER */}
      <AuthHeader
        activePage="signup"
        onNavigateHome={onNavigateHome}
        onNavigateLogin={onNavigateToLogin}
        onNavigateSignup={() => {}}
      />

      {/* 2. FLOWING AMBIENT BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute -top-[15%] right-[10%] w-[680px] h-[680px] rounded-full bg-gradient-to-br from-indigo-300/20 via-purple-300/15 to-transparent blur-[140px]" />
        <div className="absolute bottom-[5%] left-[5%] w-[640px] h-[640px] rounded-full bg-gradient-to-tr from-blue-300/20 via-sky-200/25 to-transparent blur-[130px]" />
        <div className="absolute top-[35%] right-[25%] w-[480px] h-[480px] rounded-full bg-violet-200/20 blur-[110px]" />

        {/* Ambient Silk Ribbons SVG */}
        <svg
          className="absolute inset-0 w-full h-full opacity-65 mix-blend-multiply"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
        >
          <path
            d="M-80 500 C 320 280, 720 740, 1520 400 L 1520 950 L -80 950 Z"
            fill="url(#signupWaveGrad1)"
            opacity="0.5"
          />
          <path
            d="M-40 680 C 440 520, 880 840, 1500 580 L 1500 950 L -40 950 Z"
            fill="url(#signupWaveGrad2)"
            opacity="0.45"
          />
          <defs>
            <linearGradient id="signupWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C7D7F8" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#D8D2FA" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#E0E7FF" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="signupWaveGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#BACDF4" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#E2DBFD" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 3. MAIN AUTHENTICATION CONTAINER (Two-Column Desktop, Stacked Mobile) */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Frosted Glass Authentication Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-start">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
              className="w-full max-w-[440px] p-6 sm:p-8 rounded-3xl bg-white/65 backdrop-blur-2xl border border-white/85 shadow-[0_24px_50px_rgba(80,100,150,0.14),0_0_0_1px_rgba(255,255,255,0.4)_inset]"
            >
              <div className="space-y-5">
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-700 border border-violet-300/30 mb-2.5">
                    Get Started
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {title}
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

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="signup-name" className="block text-xs font-medium text-slate-700 mb-1">
                      Full name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="signup-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Rivera"
                        autoComplete="name"
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-white/70 border border-slate-200/70 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#8065F5]/30 focus:border-[#8065F5] transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="signup-email" className="block text-xs font-medium text-slate-700 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@domain.com"
                        autoComplete="email"
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-white/70 border border-slate-200/70 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#8065F5]/30 focus:border-[#8065F5] transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="signup-password" className="block text-xs font-medium text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="signup-password"
                        type={passwordVisible ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        className="w-full pl-10 pr-11 py-2.5 sm:py-3 rounded-xl bg-white/70 border border-slate-200/70 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#8065F5]/30 focus:border-[#8065F5] transition"
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

                    {/* Password Strength Meter */}
                    {password && (
                      <div className="mt-1.5 flex items-center space-x-2">
                        <div className="flex-1 grid grid-cols-4 gap-1 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full rounded-full transition-all ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full rounded-full transition-all ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full rounded-full transition-all ${strength.score >= 4 ? strength.color : 'bg-transparent'}`} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          {strength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="signup-confirm-password" className="block text-xs font-medium text-slate-700 mb-1">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="signup-confirm-password"
                        type={confirmVisible ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        className="w-full pl-10 pr-11 py-2.5 sm:py-3 rounded-xl bg-white/70 border border-slate-200/70 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#8065F5]/30 focus:border-[#8065F5] transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setConfirmVisible(!confirmVisible)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        aria-label={confirmVisible ? 'Hide password' : 'Show password'}
                      >
                        {confirmVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Terms & Privacy Agreement */}
                  {showTerms && (
                    <div className="pt-1">
                      <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={terms}
                          onChange={(e) => setTerms(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded-md border-slate-300 text-blue-600 focus:ring-[#8065F5]/30 shrink-0"
                        />
                        <span className="text-xs text-slate-600 leading-snug">
                          I agree to the{' '}
                          <button
                            type="button"
                            onClick={onOpenTerms}
                            className="font-medium text-[#8065F5] hover:underline cursor-pointer"
                          >
                            Terms of Service
                          </button>{' '}
                          and{' '}
                          <button
                            type="button"
                            onClick={onOpenPrivacy}
                            className="font-medium text-[#8065F5] hover:underline cursor-pointer"
                          >
                            Privacy Policy
                          </button>
                          .
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Submit CTA Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-[#8065F5] text-white font-medium text-sm shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/35 hover:-translate-y-0.5 active:translate-y-0 transition duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer mt-2"
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
                  <div className="pt-1">
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200/80" />
                      <span className="shrink-0 mx-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Or continue with
                      </span>
                      <div className="flex-grow border-t border-slate-200/80" />
                    </div>

                    {/* Google Auth Container */}
                    <div className="mt-2.5 relative">
                      {/* Hidden/Mounted GSI Target (Empty container for isolated DOM attachment) */}
                      <div
                        ref={googleBtnRef}
                        className={`w-full flex justify-center min-h-[44px] ${googleButtonRendered ? 'block' : 'hidden'}`}
                      />

                      {/* Visual Glass Button (fallback/display before GSI mounts) */}
                      {!googleButtonRendered && (
                        <button
                          type="button"
                          onClick={handleGoogleClick}
                          disabled={socialLoading}
                          className="w-full py-3 px-4 rounded-xl bg-white/80 hover:bg-white border border-slate-200/80 shadow-xs hover:shadow-sm text-slate-700 font-medium text-xs sm:text-sm flex items-center justify-center space-x-2.5 transition duration-200 cursor-pointer disabled:opacity-50"
                        >
                          <GoogleIcon size={18} />
                          <span>Sign up with Google</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Redirect Link */}
                <div className="pt-3 text-center border-t border-slate-200/60">
                  <p className="text-xs text-slate-500">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={onNavigateToLogin}
                      className="font-semibold text-[#8065F5] hover:text-blue-700 transition cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Cinematic 3D Verified Profile Sculpture & Feature Highlights */}
          <div className="lg:col-span-7 hidden lg:flex items-center justify-between gap-6 relative">
            {/* 3D Visual Area */}
            <div className="flex-1 min-h-[520px] xl:min-h-[600px] relative flex items-center justify-center">
              <AuthVisualCanvas mode="signup" />
            </div>

            {/* Floating Glass Feature Highlights */}
            <div className="hidden xl:flex shrink-0">
              <AuthFeatureCards mode="signup" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
