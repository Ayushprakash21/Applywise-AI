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
import { RoyalCrownLogo } from './RoyalCrownLogo.tsx';
import { SUBSCRIPTION_PLANS, COMPARISON_FEATURES, PlanId } from '../config/plans.ts';
import { AuthUser, api } from '../services/api.ts';
import { isPermanentFreeAccessAccount } from '../config/freeAccess.ts';

interface PricingPageProps {
  currentUser: AuthUser | null;
  currentPlanId?: PlanId;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onNavigateHome: () => void;
  onSubscriptionUpdated?: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  currentUser,
  currentPlanId = 'free',
  onOpenAuth,
  onNavigateHome,
  onSubscriptionUpdated,
}) => {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFreeAccess = isPermanentFreeAccessAccount(currentUser);

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
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Cancellation error: ${msg}`);
      } finally {
        setLoadingPlan(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo size="md" onClick={onNavigateHome} />

          <div className="flex items-center space-x-3">
            <button
              onClick={onNavigateHome}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              Home
            </button>
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                {currentPlanId === 'black' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-[#090B12] text-[#D6B46A] border border-[#D6B46A]/50 shadow-xs">
                    <RoyalCrownLogo size="xs" />
                    <span>BLACK ELITE</span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Plan: {currentPlanId.toUpperCase()}
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition flex items-center space-x-1.5 cursor-pointer"
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
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span>Simple, Honest Career Plans</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Invest in Your Career with <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700">
            Intelligent AI Capabilities
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-600 leading-relaxed">
          Transparent subscriptions designed to maximize your application results with zero-hallucination resume intelligence.
        </p>

        {/* Currency & Billing Toggles */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Monthly / Annual Toggle */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                billingInterval === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
                billingInterval === 'annual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">Save 17%</span>
            </button>
          </div>

          {/* Currency Toggle */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setCurrency('INR')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${currency === 'INR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${currency === 'USD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              USD ($)
            </button>
          </div>
        </div>

        {isFreeAccess && (
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 text-emerald-950 text-xs font-medium flex items-center space-x-3 shadow-sm mb-6 text-left">
            <Sparkles className="h-6 w-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-extrabold text-sm text-slate-900">Permanent Free Access Active</p>
              <p className="text-slate-600 mt-0.5">
                Your account ({currentUser?.email}) has lifetime unrestricted access to all ApplyVise Pro features, AI Copilot, and automation tools without subscription charges.
              </p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center justify-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}
      </section>

      {/* 3-Column Plan Cards: FREE | PRO | BLACK */}
      <section className="pb-20 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* 1. Free Plan Card */}
          <div className={`p-6 sm:p-8 rounded-3xl bg-white border ${currentPlanId === 'free' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/80'} shadow-sm flex flex-col justify-between space-y-6`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{SUBSCRIPTION_PLANS.free.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{SUBSCRIPTION_PLANS.free.tagline}</p>
                </div>
                {currentPlanId === 'free' && currentUser && (
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Current Plan
                  </span>
                )}
              </div>

              <div className="pt-2">
                <span className="text-4xl font-extrabold text-slate-900">
                  {currency === 'INR' ? '₹0' : '$0'}
                </span>
                <span className="text-xs text-slate-500 ml-1.5">forever free</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {SUBSCRIPTION_PLANS.free.description}
              </p>

              <div className="border-t border-slate-100 pt-4 space-y-2.5">
                <span className="text-xs font-bold text-slate-900">Included in Free:</span>
                <ul className="space-y-2 text-xs text-slate-600">
                  {SUBSCRIPTION_PLANS.free.features.map(f => (
                    <li key={f} className="flex items-start space-x-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => handleSelectPlan('free')}
              disabled={currentPlanId === 'free' && !!currentUser}
              className={`w-full py-3 min-h-[44px] rounded-xl text-xs font-semibold transition touch-target cursor-pointer ${
                currentPlanId === 'free' && currentUser
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs'
              }`}
            >
              {currentPlanId === 'free' && currentUser ? 'Active Free Tier' : 'Get Started Free'}
            </button>
          </div>

          {/* 2. Pro Plan Card */}
          <div className={`p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white to-blue-50/40 border-2 ${currentPlanId === 'pro' ? 'border-blue-600 ring-4 ring-blue-100' : 'border-blue-500 shadow-xl shadow-blue-500/10'} flex flex-col justify-between space-y-6 relative overflow-hidden`}>
            {/* Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-mono uppercase font-bold px-4 py-1 rounded-bl-xl shadow-xs">
              {currentPlanId === 'pro' && !isFreeAccess ? 'YOUR ACTIVE PLAN' : 'POPULAR CHOICE'}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{SUBSCRIPTION_PLANS.pro.name}</h3>
                <p className="text-xs text-blue-600 font-semibold mt-0.5">{SUBSCRIPTION_PLANS.pro.tagline}</p>
              </div>

              <div className="pt-2">
                <span className="text-4xl font-extrabold text-slate-900">
                  {currency === 'INR'
                    ? (billingInterval === 'annual' ? '₹665' : '₹799')
                    : (billingInterval === 'annual' ? '$8.32' : '$9.99')}
                </span>
                <span className="text-xs text-slate-500 ml-1.5">/ month</span>
                {billingInterval === 'annual' && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                    Billed annually ({currency === 'INR' ? '₹7,990/yr' : '$99.90/yr'})
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {SUBSCRIPTION_PLANS.pro.description}
              </p>

              <div className="border-t border-blue-100 pt-4 space-y-2.5">
                <span className="text-xs font-bold text-slate-900">Everything in Free, plus:</span>
                <ul className="space-y-2 text-xs text-slate-700">
                  {SUBSCRIPTION_PLANS.pro.features.slice(1).map(f => (
                    <li key={f} className="flex items-start space-x-2.5">
                      <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5 font-bold" />
                      <span className="font-medium">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => handleSelectPlan('pro')}
              disabled={isFreeAccess || loadingPlan === 'pro' || (currentPlanId === 'pro' && !!currentUser)}
              className={`w-full py-3 min-h-[44px] rounded-xl text-xs font-semibold shadow-md transition flex items-center justify-center space-x-1.5 touch-target cursor-pointer ${
                isFreeAccess
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white cursor-default'
                  : currentPlanId === 'pro' && currentUser
                  ? 'bg-blue-600 text-white cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
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
                    <p className="text-[11px] text-[#D6B46A] font-semibold mt-1">
                      Billed annually ({currency === 'INR' ? '₹15,990/yr' : '$199.90/yr'}) · Save 17%
                    </p>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  {SUBSCRIPTION_PLANS.black.description}
                </p>

                {/* Doubled PRO Limits Highlight Box */}
                <div className="p-3.5 rounded-2xl bg-[#151821] border border-[#D6B46A]/30 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#D6B46A] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#D6B46A]" />
                    <span>Exact 2× Pro Measurable Entitlements:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                      <span className="block text-slate-400 text-[10px]">AI Requests</span>
                      <span className="font-bold text-white">600 / month</span>
                      <span className="text-[9px] text-[#D6B46A] block">(2× Pro 300)</span>
                    </div>
                    <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                      <span className="block text-slate-400 text-[10px]">Daily Apps</span>
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Full Tier Transparency</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Feature Entitlements Breakdown
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              Compare allowances across Free, ApplyVise Pro, and the ultra-premium BLACK Elite membership.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto overflow-touch">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-4 px-6 text-sm">Entitlement / Capability</th>
                    <th className="py-4 px-4 text-center w-36">ApplyVise Free</th>
                    <th className="py-4 px-4 text-center w-44 text-blue-600 font-extrabold bg-blue-50/30">
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
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {COMPARISON_FEATURES.map(feat => (
                    <tr
                      key={feat.name}
                      className={`hover:bg-slate-50/60 transition ${
                        feat.isBlackExclusive ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{feat.name}</span>
                          {feat.isBlackExclusive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-[#090B12] text-[#D6B46A] border border-[#D6B46A]/40">
                              ELITE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{feat.description}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {feat.freeLimit ? (
                          <span className="font-medium text-slate-600">{feat.freeLimit}</span>
                        ) : feat.includedInFree ? (
                          <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center bg-blue-50/20">
                        {feat.proLimit ? (
                          <span className="font-bold text-blue-700">{feat.proLimit}</span>
                        ) : feat.includedInPro ? (
                          <Check className="h-4 w-4 text-blue-600 font-bold mx-auto" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center bg-slate-950/5 font-bold">
                        {feat.blackLimit ? (
                          <span className="text-slate-900 font-extrabold flex items-center justify-center gap-1">
                            {feat.isBlackExclusive && <RoyalCrownLogo size="xs" />}
                            <span>{feat.blackLimit}</span>
                          </span>
                        ) : feat.includedInBlack ? (
                          <Check className="h-4 w-4 text-amber-600 font-black mx-auto" />
                        ) : (
                          <span className="text-slate-300">—</span>
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4 text-xs">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <RoyalCrownLogo size="xs" />
                <span>What is BLACK by ApplyVise AI?</span>
              </h4>
              <p className="text-slate-600 leading-relaxed">
                BLACK is ApplyVise AI&apos;s ultimate membership tier positioned above Pro. It delivers exactly 2× the measurable AI request volume (600 requests/mo), daily application throughput (50/day), resume tailorings (60/mo), and interview prep sessions (20/mo), along with exclusive multi-role strategy mapping and priority AI execution.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
              <h4 className="font-bold text-slate-900 text-sm">Can I upgrade from Pro to BLACK?</h4>
              <p className="text-slate-600 leading-relaxed">
                Yes. You can upgrade from Pro to BLACK at any time with a single click. Your new 2× limits and exclusive capabilities activate immediately.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
              <h4 className="font-bold text-slate-900 text-sm">Can I cancel my subscription at any time?</h4>
              <p className="text-slate-600 leading-relaxed">
                Yes. You can cancel with a single click. Your entitlements remain active until the end of your billing cycle, after which your account reverts to Free without deleting any saved applications or resumes.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
              <h4 className="font-bold text-slate-900 text-sm">Does ApplyVise AI invent fake experience on my resume?</h4>
              <p className="text-slate-600 leading-relaxed">
                Never. ApplyVise AI enforces a strict zero-hallucination verification engine across Free, Pro, and BLACK tiers. Every bullet point and company on tailored documents must provably originate from your verified master profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-10 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandLogo variant="dark" size="sm" onClick={onNavigateHome} />
          <div className="flex items-center space-x-6">
            <button onClick={onNavigateHome} className="hover:text-white transition cursor-pointer">Home</button>
            <span>Free Public Service</span>
            <span>Zero Hallucination Guarantee</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} ApplyVise AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
