import React, { useState } from 'react';
import {
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  AlertCircle,
  Crown,
  ChevronRight,
  Shield
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { GlobalFooter } from './GlobalFooter.tsx';
import { RoyalCrownLogo } from './RoyalCrownLogo.tsx';
import { SUBSCRIPTION_PLANS, COMPARISON_FEATURES, PlanId } from '../config/plans.ts';
import { AuthUser, api, ApiError } from '../services/api.ts';
import { isPermanentFreeAccessAccount } from '../config/freeAccess.ts';

interface PricingPageProps {
  currentUser: AuthUser | null;
  currentPlanId?: PlanId;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onNavigateHome: () => void;
  onNavigateNotFound?: (planId: PlanId, destination: string) => void;
  onSubscriptionUpdated?: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  currentUser,
  currentPlanId = 'free',
  onOpenAuth,
  onNavigateHome,
  onNavigateNotFound,
  onSubscriptionUpdated,
}) => {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subDetails, setSubDetails] = useState<any | null>(null);

  React.useEffect(() => {
    if (currentUser) {
      api.getSubscription().then(res => {
        if (res.success && res.subscription) {
          setSubDetails(res.subscription);
        }
      }).catch(() => {});
    }
  }, [currentUser]);

  const isFreeAccess = isPermanentFreeAccessAccount(currentUser);

  // Unified theme awareness: respects plan, allowlist, and active DOM attribute
  const isBlack = currentPlanId === 'black' || isFreeAccess || (typeof document !== 'undefined' && (
    document.body.classList.contains('theme-black') ||
    document.documentElement.getAttribute('data-theme') === 'black'
  ));

  const handleSelectPlan = async (planId: PlanId) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser) {
      onOpenAuth(planId === 'free' ? 'signup' : 'login');
      return;
    }

    if (isFreeAccess) {
      setSuccessMessage('Your account is permanently authorized with full BLACK Elite access. No payment or billing is required.');
      return;
    }

    if (planId === currentPlanId) {
      setSuccessMessage(`You are already subscribed to the ${planId.toUpperCase()} tier.`);
      return;
    }

    if (planId === 'pro' || planId === 'black') {
      try {
        setLoadingPlan(planId);

        // Attempt Razorpay order creation if client-side checkout available
        try {
          const orderRes = await api.createRazorpayOrder(planId, billingInterval);
          if (orderRes.success && (window as any).Razorpay) {
            const options = {
              key: orderRes.keyId,
              amount: orderRes.amount,
              currency: orderRes.currency,
              name: 'ApplyVise AI',
              description: planId === 'black' ? 'BLACK ELITE Membership' : 'ApplyVise Pro',
              order_id: orderRes.orderId,
              handler: async (response: any) => {
                const verifyRes = await api.verifyRazorpayPayment({
                  razorpay_order_id: response.razorpay_order_id || orderRes.orderId,
                  razorpay_payment_id: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
                  razorpay_signature: response.razorpay_signature || 'mock_sig',
                  planId,
                  billingInterval,
                });
                setSuccessMessage(verifyRes.message);
                if (onSubscriptionUpdated) onSubscriptionUpdated();
              },
              prefill: {
                name: currentUser.fullName,
                email: currentUser.email,
              },
              theme: {
                color: planId === 'black' ? '#D6B46A' : '#2563EB',
              },
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
            return;
          }
        } catch (checkoutErr: unknown) {
          if (checkoutErr instanceof ApiError && checkoutErr.status === 404) {
            if (onNavigateNotFound) {
              onNavigateNotFound(planId, '/api/subscription/razorpay/create-order');
              return;
            }
          }
          const checkoutMsg = checkoutErr instanceof Error ? checkoutErr.message : String(checkoutErr);
          setErrorMessage(`Payment checkout error: ${checkoutMsg}. Please verify payment gateway configuration.`);
          return;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Subscription error: ${msg}`);
      } finally {
        setLoadingPlan(null);
      }
    } else if (planId === 'free' && (currentPlanId === 'pro' || currentPlanId === 'black')) {
      try {
        setLoadingPlan('free');
        const res = await api.cancelSubscription();
        setSuccessMessage(res.message);
        if (onSubscriptionUpdated) onSubscriptionUpdated();
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 404) {
          if (onNavigateNotFound) {
            onNavigateNotFound('free', '/api/subscription/cancel');
            return;
          }
        }
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Cancellation error: ${msg}`);
      } finally {
        setLoadingPlan(null);
      }
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isBlack ? 'bg-[#08090B] text-[#F0EEE9]' : 'bg-[#F8FAFC] text-slate-800'
    }`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
        isBlack ? 'bg-[#101216]/90 border-[rgba(255,255,255,0.09)] text-[#F0EEE9]' : 'bg-white/80 border-slate-200/70 text-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo size="md" variant={isBlack ? 'dark' : 'light'} onClick={onNavigateHome} />

          <div className="flex items-center space-x-3">
            <button
              onClick={onNavigateHome}
              className={`px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                isBlack ? 'text-[#B7B4AD] hover:text-[#F0EEE9]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Home
            </button>
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                {currentPlanId === 'black' || isFreeAccess ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-[#0B0D10] text-[#C6A66A] border border-[rgba(198,166,106,0.35)] shadow-xs">
                    <RoyalCrownLogo size="xs" />
                    <span>BLACK ELITE</span>
                  </span>
                ) : (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    isBlack
                      ? 'bg-[rgba(117,169,214,0.18)] text-[#75A9D6] border-[rgba(117,169,214,0.30)]'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    Plan: {currentPlanId.toUpperCase()}
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('signup')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition flex items-center space-x-1.5 cursor-pointer ${
                  isBlack
                    ? 'bg-[#C6A66A] hover:bg-[#E2C58A] text-[#08090B] font-bold'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                }`}
              >
                <span>Sign Up Free</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero & Controls */}
      <section className="pt-16 pb-12 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <div className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs ${
          isBlack
            ? 'bg-[rgba(198,166,106,0.12)] border border-[rgba(198,166,106,0.30)] text-[#C6A66A]'
            : 'bg-blue-50 border border-blue-200/80 text-blue-700'
        }`}>
          <Sparkles className={`h-3.5 w-3.5 ${isBlack ? 'text-[#C6A66A]' : 'text-blue-600'}`} />
          <span>Simple, Honest Career Plans</span>
        </div>

        <h1 className={`text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight ${
          isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'
        }`}>
          Invest in Your Career with <br />
          <span className={`text-transparent bg-clip-text ${
            isBlack
              ? 'bg-gradient-to-r from-[#E2C58A] via-[#C6A66A] to-[#E2C58A]'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700'
          }`}>
            Intelligent AI Capabilities
          </span>
        </h1>

        <p className={`max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed ${
          isBlack ? 'text-[#B7B4AD]' : 'text-slate-600'
        }`}>
          Transparent subscriptions designed to maximize your application results with zero-hallucination resume intelligence.
        </p>

        {/* User Membership & Entitlement Status Card */}
        {currentUser && (
          <div className={`max-w-2xl mx-auto p-5 rounded-2xl border shadow-sm text-left space-y-3 ${
            isBlack
              ? 'bg-[#13161B] border-[rgba(255,255,255,0.09)] text-[#F0EEE9]'
              : 'bg-white border border-slate-200/90 text-slate-800'
          }`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b ${
              isBlack ? 'border-[rgba(255,255,255,0.09)]' : 'border-slate-100'
            }`}>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isBlack ? 'text-[#858781]' : 'text-slate-400'
                }`}>
                  {subDetails?.membershipSource === 'ADMIN_GRANT'
                    ? 'Administratively Granted Membership'
                    : subDetails?.isPermanentFreeAccess || isFreeAccess
                    ? 'Permanent Founder Access'
                    : 'Current Membership Status'}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className={`text-base font-bold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'}`}>
                    {subDetails?.planName || (currentPlanId === 'black' || isFreeAccess ? 'BLACK by ApplyVise AI — Founder Elite Access' : currentPlanId === 'pro' ? 'ApplyVise Pro' : 'ApplyVise Free')}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    subDetails?.status === 'expired'
                      ? isBlack
                        ? 'bg-[rgba(214,111,112,0.18)] text-[#D66F70] border border-[rgba(214,111,112,0.30)]'
                        : 'bg-red-50 text-red-600 border border-red-200'
                      : subDetails?.planId === 'black' || currentPlanId === 'black' || isFreeAccess
                      ? 'bg-[#0B0D10] text-[#C6A66A] border border-[rgba(198,166,106,0.35)]'
                      : currentPlanId === 'pro'
                      ? isBlack
                        ? 'bg-[rgba(117,169,214,0.18)] text-[#75A9D6] border border-[rgba(117,169,214,0.30)]'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                      : isBlack
                      ? 'bg-[#191D23] text-[#B7B4AD] border border-[rgba(255,255,255,0.08)]'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {subDetails?.status === 'expired' ? 'Expired' : (subDetails?.status || 'Active')}
                  </span>
                </div>
              </div>

              {subDetails?.membershipSource === 'ADMIN_GRANT' && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-center border ${
                  isBlack
                    ? 'bg-[rgba(198,166,106,0.15)] border-[rgba(198,166,106,0.30)] text-[#C6A66A]'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <ShieldCheck className={`w-3.5 h-3.5 ${isBlack ? 'text-[#C6A66A]' : 'text-amber-600'}`} />
                  <span>Admin Granted</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className={`text-[11px] block ${isBlack ? 'text-[#858781]' : 'text-slate-400'}`}>Membership Source</span>
                <span className={`font-semibold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-800'}`}>
                  {subDetails?.membershipSource === 'ADMIN_GRANT'
                    ? 'Admin Provisioned'
                    : subDetails?.membershipSource === 'PAYMENT'
                    ? 'Payment Gateway'
                    : 'Standard / System'}
                </span>
              </div>
              <div>
                <span className={`text-[11px] block ${isBlack ? 'text-[#858781]' : 'text-slate-400'}`}>Activation Date</span>
                <span className={`font-semibold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-800'}`}>
                  {subDetails?.currentPeriodStart
                    ? new Date(subDetails.currentPeriodStart).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                    : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div>
                <span className={`text-[11px] block ${isBlack ? 'text-[#858781]' : 'text-slate-400'}`}>Expiry Date</span>
                <span className={`font-semibold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-800'}`}>
                  {subDetails?.billingInterval === 'permanent' || subDetails?.validityType === 'lifetime' || isFreeAccess || !subDetails?.currentPeriodEnd
                    ? 'Lifetime'
                    : new Date(subDetails.currentPeriodEnd).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div>
                <span className={`text-[11px] block ${isBlack ? 'text-[#858781]' : 'text-slate-400'}`}>Remaining Validity</span>
                <span className={`font-semibold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-800'}`}>
                  {subDetails?.billingInterval === 'permanent' || subDetails?.validityType === 'lifetime' || isFreeAccess
                    ? 'Lifetime'
                    : subDetails?.status === 'expired' || (subDetails?.remainingDays !== undefined && subDetails.remainingDays <= 0)
                    ? 'Expired'
                    : subDetails?.remainingDays !== undefined
                    ? `${subDetails.remainingDays} days`
                    : 'Active'}
                </span>
              </div>
            </div>

            {subDetails?.status === 'expired' && (
              <div className={`p-3 rounded-xl text-xs space-y-1 border ${
                isBlack
                  ? 'bg-[rgba(214,111,112,0.12)] border-[rgba(214,111,112,0.30)] text-[#F0EEE9]'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className={`font-bold flex items-center gap-1.5 ${isBlack ? 'text-[#D66F70]' : 'text-red-900'}`}>
                  <AlertCircle className="w-4 h-4 text-[#D66F70]" />
                  <span>Membership Expired</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isBlack ? 'text-[#B7B4AD]' : 'text-red-700'}`}>
                  Your administrative membership period has expired. Features like deep AI tailoring, advanced analysis, and unlimited copilot interactions are no longer active on the Free tier. Choose a plan below to restore access.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Currency & Billing Toggles */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Monthly / Annual Toggle */}
          <div className={`inline-flex p-1 rounded-2xl border ${
            isBlack
              ? 'bg-[#0B0D10] border-[rgba(255,255,255,0.09)]'
              : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                billingInterval === 'monthly'
                  ? isBlack
                    ? 'bg-[#191D23] text-[#F0EEE9] border border-[rgba(198,166,106,0.30)] shadow-xs'
                    : 'bg-white text-slate-900 shadow-xs'
                  : isBlack
                  ? 'text-[#B7B4AD] hover:text-[#F0EEE9]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
                billingInterval === 'annual'
                  ? isBlack
                    ? 'bg-[#191D23] text-[#F0EEE9] border border-[rgba(198,166,106,0.30)] shadow-xs'
                    : 'bg-white text-slate-900 shadow-xs'
                  : isBlack
                  ? 'text-[#B7B4AD] hover:text-[#F0EEE9]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Annual Billing</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold border ${
                isBlack
                  ? 'bg-[rgba(54,184,135,0.18)] text-[#36B887] border-[rgba(54,184,135,0.30)]'
                  : 'bg-emerald-100 text-emerald-800 border-transparent'
              }`}>
                Save 17%
              </span>
            </button>
          </div>

          {/* Currency Toggle */}
          <div className={`inline-flex p-1 rounded-2xl border text-xs font-semibold ${
            isBlack
              ? 'bg-[#0B0D10] border-[rgba(255,255,255,0.09)]'
              : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setCurrency('INR')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                currency === 'INR'
                  ? isBlack
                    ? 'bg-[#191D23] text-[#F0EEE9] border border-[rgba(198,166,106,0.30)] shadow-xs'
                    : 'bg-white text-slate-900 shadow-xs'
                  : isBlack
                  ? 'text-[#B7B4AD] hover:text-[#F0EEE9]'
                  : 'text-slate-500'
              }`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                currency === 'USD'
                  ? isBlack
                    ? 'bg-[#191D23] text-[#F0EEE9] border border-[rgba(198,166,106,0.30)] shadow-xs'
                    : 'bg-white text-slate-900 shadow-xs'
                  : isBlack
                  ? 'text-[#B7B4AD] hover:text-[#F0EEE9]'
                  : 'text-slate-500'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        {/* Permanent Free Access Active Banner */}
        {isFreeAccess && (
          <div className={`max-w-xl mx-auto p-4 rounded-2xl border text-xs font-medium flex items-center space-x-3 shadow-sm mb-6 text-left ${
            isBlack
              ? 'bg-[#13161B] border-[rgba(54,184,135,0.35)] text-[#F0EEE9]'
              : 'bg-emerald-50 border border-emerald-300 text-emerald-950'
          }`}>
            <Sparkles className={`h-6 w-6 shrink-0 ${isBlack ? 'text-[#36B887]' : 'text-emerald-600'}`} />
            <div>
              <p className={`font-extrabold text-sm ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'}`}>
                Permanent Free Access Active
              </p>
              <p className={`mt-0.5 leading-relaxed ${isBlack ? 'text-[#B7B4AD]' : 'text-slate-600'}`}>
                Your account (<span className={isBlack ? 'text-[#36B887] font-semibold' : 'text-emerald-700 font-semibold'}>{currentUser?.email}</span>) has lifetime unrestricted access to all ApplyVise Pro features, AI Copilot, and automation tools without subscription charges.
              </p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className={`max-w-md mx-auto p-3.5 rounded-2xl border text-xs font-medium ${
            isBlack
              ? 'bg-[rgba(54,184,135,0.15)] border-[rgba(54,184,135,0.35)] text-[#36B887]'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className={`max-w-md mx-auto p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-center space-x-2 ${
            isBlack
              ? 'bg-[rgba(214,111,112,0.15)] border-[rgba(214,111,112,0.35)] text-[#D66F70]'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0 text-[#D66F70]" />
            <span>{errorMessage}</span>
          </div>
        )}
      </section>

      {/* 3-Column Plan Cards: FREE | PRO | BLACK */}
      <section className="pb-20 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* 1. Free Plan Card */}
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-sm flex flex-col justify-between space-y-6 ${
            isBlack
              ? 'bg-[#13161B] border-[rgba(255,255,255,0.09)]'
              : `bg-white border ${currentPlanId === 'free' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/80'}`
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-bold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'}`}>
                    {SUBSCRIPTION_PLANS.free.name}
                  </h3>
                  <p className={`text-xs mt-0.5 ${isBlack ? 'text-[#858781]' : 'text-slate-500'}`}>
                    {SUBSCRIPTION_PLANS.free.tagline}
                  </p>
                </div>
                {currentPlanId === 'free' && currentUser && !isFreeAccess && (
                  <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isBlack
                      ? 'bg-[#191D23] text-[#B7B4AD] border-[rgba(255,255,255,0.09)]'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    Current Plan
                  </span>
                )}
              </div>

              <div className="pt-2">
                <span className={`text-4xl font-extrabold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'}`}>
                  {currency === 'INR' ? '₹0' : '$0'}
                </span>
                <span className={`text-xs ml-1.5 ${isBlack ? 'text-[#858781]' : 'text-slate-500'}`}>forever free</span>
              </div>

              <p className={`text-xs leading-relaxed pt-1 ${isBlack ? 'text-[#B7B4AD]' : 'text-slate-600'}`}>
                {SUBSCRIPTION_PLANS.free.description}
              </p>

              <div className={`border-t pt-4 space-y-2.5 ${isBlack ? 'border-[rgba(255,255,255,0.09)]' : 'border-slate-100'}`}>
                <span className={`text-xs font-bold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'}`}>Included in Free:</span>
                <ul className={`space-y-2 text-xs ${isBlack ? 'text-[#B7B4AD]' : 'text-slate-600'}`}>
                  {SUBSCRIPTION_PLANS.free.features.map(f => (
                    <li key={f} className="flex items-start space-x-2.5">
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 ${isBlack ? 'text-[#36B887]' : 'text-emerald-600'}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => handleSelectPlan('free')}
              disabled={currentPlanId === 'free' && !!currentUser}
              className={`w-full py-3 min-h-[44px] rounded-xl text-xs font-semibold transition touch-target cursor-pointer border ${
                currentPlanId === 'free' && currentUser
                  ? isBlack
                    ? 'bg-[#191D23] text-[#858781] border-[rgba(255,255,255,0.08)] cursor-default'
                    : 'bg-slate-100 text-slate-400 border-transparent cursor-default'
                  : isBlack
                  ? 'bg-[#191D23] hover:bg-[#20252D] text-[#F0EEE9] border-[rgba(255,255,255,0.12)] hover:border-[rgba(198,166,106,0.30)] shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs'
              }`}
            >
              {currentPlanId === 'free' && currentUser ? 'Active Free Tier' : 'Get Started Free'}
            </button>
          </div>

          {/* 2. Pro Plan Card */}
          <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col justify-between space-y-6 relative overflow-hidden ${
            isBlack
              ? 'bg-[#13161B] border-[rgba(117,169,214,0.35)] shadow-xl shadow-black/40'
              : `bg-gradient-to-b from-white to-blue-50/40 border-2 ${currentPlanId === 'pro' ? 'border-blue-600 ring-4 ring-blue-100' : 'border-blue-500 shadow-xl shadow-blue-500/10'}`
          }`}>
            {/* Badge */}
            <div className={`absolute top-0 right-0 text-[10px] font-mono uppercase font-bold px-4 py-1 rounded-bl-xl shadow-xs border-l border-b ${
              isBlack
                ? 'bg-[rgba(117,169,214,0.18)] text-[#75A9D6] border-[rgba(117,169,214,0.35)]'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent'
            }`}>
              {currentPlanId === 'pro' && !isFreeAccess ? 'YOUR ACTIVE PLAN' : 'POPULAR CHOICE'}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className={`text-xl font-bold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'}`}>
                  {SUBSCRIPTION_PLANS.pro.name}
                </h3>
                <p className={`text-xs font-semibold mt-0.5 ${isBlack ? 'text-[#75A9D6]' : 'text-blue-600'}`}>
                  {SUBSCRIPTION_PLANS.pro.tagline}
                </p>
              </div>

              <div className="pt-2">
                <span className={`text-4xl font-extrabold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'}`}>
                  {currency === 'INR'
                    ? (billingInterval === 'annual' ? '₹665' : '₹799')
                    : (billingInterval === 'annual' ? '$8.32' : '$9.99')}
                </span>
                <span className={`text-xs ml-1.5 ${isBlack ? 'text-[#858781]' : 'text-slate-500'}`}>/ month</span>
                {billingInterval === 'annual' && (
                  <p className={`text-[11px] font-semibold mt-0.5 ${isBlack ? 'text-[#36B887]' : 'text-emerald-600'}`}>
                    Billed annually ({currency === 'INR' ? '₹7,990/yr' : '$99.90/yr'})
                  </p>
                )}
              </div>

              <p className={`text-xs leading-relaxed pt-1 ${isBlack ? 'text-[#B7B4AD]' : 'text-slate-600'}`}>
                {SUBSCRIPTION_PLANS.pro.description}
              </p>

              <div className={`border-t pt-4 space-y-2.5 ${isBlack ? 'border-[rgba(255,255,255,0.09)]' : 'border-blue-100'}`}>
                <span className={`text-xs font-bold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'}`}>
                  Everything in Free, plus:
                </span>
                <ul className={`space-y-2 text-xs ${isBlack ? 'text-[#B7B4AD]' : 'text-slate-700'}`}>
                  {SUBSCRIPTION_PLANS.pro.features.slice(1).map(f => (
                    <li key={f} className="flex items-start space-x-2.5">
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 font-bold ${isBlack ? 'text-[#75A9D6]' : 'text-blue-600'}`} />
                      <span className="font-medium">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => handleSelectPlan('pro')}
              disabled={isFreeAccess || loadingPlan === 'pro' || (currentPlanId === 'pro' && !!currentUser)}
              className={`w-full py-3 min-h-[44px] rounded-xl text-xs font-semibold shadow-md transition flex items-center justify-center space-x-1.5 touch-target cursor-pointer border ${
                isFreeAccess
                  ? isBlack
                    ? 'bg-[rgba(54,184,135,0.18)] text-[#36B887] border-[rgba(54,184,135,0.35)] cursor-default'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-transparent cursor-default'
                  : currentPlanId === 'pro' && currentUser
                  ? isBlack
                    ? 'bg-[#191D23] text-[#75A9D6] border-[rgba(117,169,214,0.35)] cursor-default'
                    : 'bg-blue-600 text-white border-transparent cursor-default'
                  : isBlack
                  ? 'bg-[#C6A66A] hover:bg-[#E2C58A] text-[#08090B] font-bold border-[rgba(198,166,106,0.30)] shadow-xs'
                  : 'bg-blue-600 hover:bg-blue-700 text-white border-transparent shadow-blue-500/25'
              }`}
            >
              {loadingPlan === 'pro' ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isFreeAccess ? (
                <span>Founder Access (Included)</span>
              ) : currentPlanId === 'pro' && currentUser ? (
                <span>Active Pro Plan</span>
              ) : (
                <>
                  <span>Upgrade to Pro</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>

          {/* 3. BLACK BY APPLYVISE AI — ULTRA-PREMIUM CENTERPIECE */}
          <div className="relative rounded-3xl p-[2px] bg-gradient-to-b from-[#D6B46A] via-[#F3DEAC] to-[#8065F5] shadow-2xl shadow-[#D6B46A]/20 transition-transform duration-300 hover:scale-[1.01] flex flex-col justify-between">
            {/* Glowing Ambient Halo */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#D6B46A]/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-[#8065F5]/25 blur-3xl pointer-events-none" />

            {/* Inner Obsidian Black Card Body */}
            <div className="relative rounded-[22px] bg-[#090B12] text-[#F8F8FC] p-6 sm:p-8 flex flex-col justify-between h-full space-y-6">
              {/* Top Crown & Badges */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <RoyalCrownLogo size="lg" animated showWordmark />
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#D6B46A] via-[#F3DEAC] to-[#D6B46A] text-[#090B12] shadow-sm">
                    {isFreeAccess ? 'FOUNDER ACCESS — ACTIVE' : currentPlanId === 'black' ? 'YOUR ACTIVE TIER' : 'BLACK ELITE'}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    <span>{SUBSCRIPTION_PLANS.black.name}</span>
                  </h3>
                  <p className="text-xs font-semibold text-[#D6B46A] mt-1 tracking-wide">
                    {SUBSCRIPTION_PLANS.black.tagline}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {SUBSCRIPTION_PLANS.black.secondaryTagline}
                  </p>
                </div>

                {/* Price Display */}
                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FBF4D8] via-[#D6B46A] to-[#F3DEAC]">
                      {currency === 'INR'
                        ? (billingInterval === 'annual' ? '₹1,332' : '₹1,599')
                        : (billingInterval === 'annual' ? '$16.65' : '$19.99')}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  {billingInterval === 'annual' && (
                    <p className="text-[11px] text-[#D6B46A] font-semibold mt-0.5">
                      Billed annually ({currency === 'INR' ? '₹15,990/yr' : '$199.90/yr'})
                    </p>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  {SUBSCRIPTION_PLANS.black.description}
                </p>

                {/* Measurable Doubled Limits Box (Executive Guarantee) */}
                <div className="rounded-2xl bg-gradient-to-br from-[#12141D] to-[#1A1D2B] p-4 border border-[#D6B46A]/30 space-y-2.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#D6B46A] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#D6B46A]" />
                    <span>Exact 2× Pro Measurable Entitlements:</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                      <span className="block text-slate-400 text-[10px]">AI Copilot Volume</span>
                      <span className="font-bold text-white">600 req / month</span>
                      <span className="text-[9px] text-[#D6B46A] block">(2× Pro 300)</span>
                    </div>
                    <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                      <span className="block text-slate-400 text-[10px]">Daily Auto-Apply</span>
                      <span className="font-bold text-white">50 / day</span>
                      <span className="text-[9px] text-[#D6B46A] block">(2× Pro 25)</span>
                    </div>
                    <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                      <span className="block text-slate-400 text-[10px]">Resume Tailoring</span>
                      <span className="font-bold text-white">60 / month</span>
                      <span className="text-[9px] text-[#D6B46A] block">(2× Pro 30)</span>
                    </div>
                    <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                      <span className="block text-slate-400 text-[10px]">Interview Prep</span>
                      <span className="font-bold text-white">20 sessions</span>
                      <span className="text-[9px] text-[#D6B46A] block">(2× Pro 10)</span>
                    </div>
                  </div>
                </div>

                {/* Exclusive Capabilities List */}
                <div className="border-t border-white/10 pt-4 space-y-2.5">
                  <span className="text-xs font-bold text-[#F3DEAC] flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-[#D6B46A]" />
                    <span>Exclusive BLACK Capabilities:</span>
                  </span>
                  <ul className="space-y-2 text-xs text-slate-200">
                    {SUBSCRIPTION_PLANS.black.features.slice(5).map(f => (
                      <li key={f} className="flex items-start space-x-2.5">
                        <Check className="h-4 w-4 text-[#D6B46A] shrink-0 mt-0.5 font-bold" />
                        <span className="leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Subscribe to BLACK Button */}
              <button
                onClick={() => handleSelectPlan('black')}
                disabled={loadingPlan === 'black' || (currentPlanId === 'black' && !!currentUser)}
                className={`w-full py-3.5 min-h-[46px] rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-lg ${
                  currentPlanId === 'black' && currentUser
                    ? 'bg-[#151821] text-[#D6B46A] border border-[#D6B46A]/50 cursor-default'
                    : 'bg-gradient-to-r from-[#D6B46A] via-[#F3DEAC] to-[#D6B46A] text-[#090B12] hover:brightness-110 hover:shadow-[#D6B46A]/30 active:scale-[0.98]'
                }`}
              >
                {loadingPlan === 'black' ? (
                  <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : currentPlanId === 'black' && currentUser ? (
                  <div className="flex items-center gap-1.5">
                    <RoyalCrownLogo size="xs" />
                    <span>Active BLACK Elite Membership</span>
                  </div>
                ) : (
                  <>
                    <RoyalCrownLogo size="xs" />
                    <span>Subscribe to BLACK</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table (FREE | PRO | BLACK) */}
        <div className="mt-24 space-y-6">
          <div className="text-center space-y-1">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 border ${
              isBlack
                ? 'bg-[rgba(198,166,106,0.12)] border-[rgba(198,166,106,0.30)] text-[#C6A66A]'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <Shield className={`w-3.5 h-3.5 ${isBlack ? 'text-[#C6A66A]' : 'text-blue-600'}`} />
              <span>Full Tier Transparency</span>
            </div>
            <h2 className={`text-xl sm:text-3xl font-extrabold tracking-tight ${
              isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'
            }`}>
              Feature Entitlements Breakdown
            </h2>
            <p className={`text-xs sm:text-sm max-w-xl mx-auto ${
              isBlack ? 'text-[#858781]' : 'text-slate-500'
            }`}>
              Compare allowances across Free, ApplyVise Pro, and the ultra-premium BLACK Elite membership.
            </p>
          </div>

          <div className={`rounded-3xl border overflow-hidden shadow-xs ${
            isBlack
              ? 'bg-[#13161B] border-[rgba(255,255,255,0.09)]'
              : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto overflow-touch">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className={`border-b font-bold ${
                  isBlack
                    ? 'bg-[#0B0D10] border-[rgba(255,255,255,0.09)] text-[#F0EEE9]'
                    : 'bg-slate-50/80 border-slate-200 text-slate-600'
                }`}>
                  <tr>
                    <th className="py-4 px-6 text-sm">Entitlement / Capability</th>
                    <th className="py-4 px-4 text-center w-36">ApplyVise Free</th>
                    <th className={`py-4 px-4 text-center w-44 font-extrabold ${
                      isBlack
                        ? 'text-[#75A9D6] bg-[rgba(117,169,214,0.08)]'
                        : 'text-blue-600 bg-blue-50/30'
                    }`}>
                      ApplyVise Pro
                    </th>
                    <th className="py-4 px-4 text-center w-52 bg-[#090B12] text-[#D6B46A] font-black">
                      <div className="flex items-center justify-center gap-1.5">
                        <RoyalCrownLogo size="xs" />
                        <span>BLACK ELITE</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isBlack
                    ? 'divide-[rgba(255,255,255,0.06)] text-[#B7B4AD]'
                    : 'divide-slate-100 text-slate-700'
                }`}>
                  {COMPARISON_FEATURES.map(feat => (
                    <tr
                      key={feat.name}
                      className={`transition ${
                        isBlack
                          ? feat.isBlackExclusive ? 'bg-[rgba(198,166,106,0.05)] hover:bg-[#191D23]/60' : 'hover:bg-[#191D23]/50'
                          : feat.isBlackExclusive ? 'bg-amber-50/15 hover:bg-slate-50/60' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'}`}>{feat.name}</span>
                          {feat.isBlackExclusive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-[#090B12] text-[#D6B46A] border border-[#D6B46A]/40">
                              ELITE
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] mt-0.5 ${isBlack ? 'text-[#858781]' : 'text-slate-500'}`}>{feat.description}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {feat.freeLimit ? (
                          <span className={`font-medium ${isBlack ? 'text-[#B7B4AD]' : 'text-slate-600'}`}>{feat.freeLimit}</span>
                        ) : feat.includedInFree ? (
                          <Check className={`h-4 w-4 mx-auto ${isBlack ? 'text-[#36B887]' : 'text-emerald-600'}`} />
                        ) : (
                          <span className={isBlack ? 'text-[#737780]' : 'text-slate-300'}>—</span>
                        )}
                      </td>
                      <td className={`py-3.5 px-4 text-center ${
                        isBlack ? 'bg-[rgba(117,169,214,0.05)]' : 'bg-blue-50/20'
                      }`}>
                        {feat.proLimit ? (
                          <span className={`font-bold ${isBlack ? 'text-[#75A9D6]' : 'text-blue-700'}`}>{feat.proLimit}</span>
                        ) : feat.includedInPro ? (
                          <Check className={`h-4 w-4 font-bold mx-auto ${isBlack ? 'text-[#75A9D6]' : 'text-blue-600'}`} />
                        ) : (
                          <span className={isBlack ? 'text-[#737780]' : 'text-slate-300'}>—</span>
                        )}
                      </td>
                      <td className={`py-3.5 px-4 text-center font-bold ${
                        isBlack ? 'bg-[#090B12]/60' : 'bg-slate-950/5'
                      }`}>
                        {feat.blackLimit ? (
                          <span className={`font-extrabold flex items-center justify-center gap-1 ${
                            isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'
                          }`}>
                            {feat.isBlackExclusive && <RoyalCrownLogo size="xs" />}
                            <span>{feat.blackLimit}</span>
                          </span>
                        ) : feat.includedInBlack ? (
                          <Check className="h-4 w-4 text-[#C6A66A] font-black mx-auto" />
                        ) : (
                          <span className={isBlack ? 'text-[#737780]' : 'text-slate-300'}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto space-y-6">
          <h2 className={`text-xl sm:text-2xl font-bold text-center ${
            isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'
          }`}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 text-xs">
            <div className={`p-5 rounded-2xl border space-y-1.5 shadow-2xs ${
              isBlack
                ? 'bg-[#13161B] border-[rgba(255,255,255,0.09)]'
                : 'bg-white border-slate-200'
            }`}>
              <h4 className={`font-bold text-sm flex items-center gap-2 ${
                isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'
              }`}>
                <RoyalCrownLogo size="xs" />
                <span>What is BLACK by ApplyVise AI?</span>
              </h4>
              <p className={`leading-relaxed ${
                isBlack ? 'text-[#B7B4AD]' : 'text-slate-600'
              }`}>
                BLACK is ApplyVise AI&apos;s ultimate membership tier positioned above Pro. It delivers exactly 2× the measurable AI request volume (600 requests/mo), daily application throughput (50/day), resume tailorings (60/mo), and interview prep sessions (20/mo), along with exclusive multi-role strategy mapping and priority AI execution.
              </p>
            </div>
            <div className={`p-5 rounded-2xl border space-y-1.5 shadow-2xs ${
              isBlack
                ? 'bg-[#13161B] border-[rgba(255,255,255,0.09)]'
                : 'bg-white border-slate-200'
            }`}>
              <h4 className={`font-bold text-sm ${
                isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'
              }`}>
                Can I upgrade from Pro to BLACK?
              </h4>
              <p className={`leading-relaxed ${
                isBlack ? 'text-[#B7B4AD]' : 'text-slate-600'
              }`}>
                Yes. You can upgrade from Pro to BLACK at any time with a single click. Your new 2× limits and exclusive capabilities activate immediately.
              </p>
            </div>
            <div className={`p-5 rounded-2xl border space-y-1.5 shadow-2xs ${
              isBlack
                ? 'bg-[#13161B] border-[rgba(255,255,255,0.09)]'
                : 'bg-white border-slate-200'
            }`}>
              <h4 className={`font-bold text-sm ${
                isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'
              }`}>
                Can I cancel my subscription at any time?
              </h4>
              <p className={`leading-relaxed ${
                isBlack ? 'text-[#B7B4AD]' : 'text-slate-600'
              }`}>
                Yes. You can cancel with a single click. Your entitlements remain active until the end of your billing cycle, after which your account reverts to Free without deleting any saved applications or resumes.
              </p>
            </div>
            <div className={`p-5 rounded-2xl border space-y-1.5 shadow-2xs ${
              isBlack
                ? 'bg-[#13161B] border-[rgba(255,255,255,0.09)]'
                : 'bg-white border-slate-200'
            }`}>
              <h4 className={`font-bold text-sm ${
                isBlack ? 'text-[#F0EEE9]' : 'text-slate-900'
              }`}>
                Does ApplyVise AI invent fake experience on my resume?
              </h4>
              <p className={`leading-relaxed ${
                isBlack ? 'text-[#B7B4AD]' : 'text-slate-600'
              }`}>
                Never. ApplyVise AI enforces a strict zero-hallucination verification engine across Free, Pro, and BLACK tiers. Every bullet point and company on tailored documents must provably originate from your verified master profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <GlobalFooter
        variant="landing"
        plan={isBlack ? 'black' : 'free'}
        onNavigateHome={onNavigateHome}
      />
    </div>
  );
};
