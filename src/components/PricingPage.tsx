import React, { useState } from 'react';
import {
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
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
      setSuccessMessage('Your account is permanently authorized with full Pro access. No payment or billing is required.');
      return;
    }

    if (planId === currentPlanId) {
      setSuccessMessage('You are already subscribed to this tier.');
      return;
    }

    if (planId === 'pro') {
      try {
        setLoadingPlan('pro');
        const res = await api.upgradeSubscription('pro', billingInterval);
        setSuccessMessage(res.message);
        if (onSubscriptionUpdated) onSubscriptionUpdated();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Upgrade error: ${msg}`);
      } finally {
        setLoadingPlan(null);
      }
    } else if (planId === 'free' && currentPlanId === 'pro') {
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
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Home
            </button>
            {currentUser ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Plan: {currentPlanId.toUpperCase()}
              </span>
            ) : (
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition flex items-center space-x-1.5"
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
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
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
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                billingInterval === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
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
              className={`px-3 py-1.5 rounded-xl transition ${currency === 'INR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-xl transition ${currency === 'USD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              USD ($)
            </button>
          </div>
        </div>

        {isFreeAccess && (
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 text-emerald-950 text-xs font-medium flex items-center space-x-3 shadow-sm mb-6">
            <Sparkles className="h-6 w-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-extrabold text-sm text-slate-900">Permanent Free Access Active</p>
              <p className="text-slate-600 mt-0.5">
                Your account ({currentUser?.email}) has lifetime unrestricted access to all ApplyWise Pro features, AI Copilot, and automation tools without subscription charges.
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

      {/* Plan Cards */}
      <section className="pb-20 max-w-5xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Free Plan Card */}
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
              className={`w-full py-3 min-h-[44px] rounded-xl text-xs font-semibold transition touch-target ${
                currentPlanId === 'free' && currentUser
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs'
              }`}
            >
              {currentPlanId === 'free' && currentUser ? 'Active Free Tier' : 'Get Started Free'}
            </button>
          </div>

          {/* Pro Plan Card */}
          <div className={`p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white to-blue-50/40 border-2 ${currentPlanId === 'pro' ? 'border-blue-600 ring-4 ring-blue-100' : 'border-blue-500 shadow-xl shadow-blue-500/10'} flex flex-col justify-between space-y-6 relative overflow-hidden`}>
            {/* Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-600 to-blue-600 text-white text-[10px] font-mono uppercase font-bold px-4 py-1 rounded-bl-xl shadow-xs">
              {isFreeAccess ? 'FOUNDER ACCESS — ACTIVE' : currentPlanId === 'pro' ? 'YOUR ACTIVE PLAN' : 'RECOMMENDED'}
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
              className={`w-full py-3 min-h-[44px] rounded-xl text-xs font-semibold shadow-md transition flex items-center justify-center space-x-1.5 touch-target ${
                isFreeAccess
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white cursor-default'
                  : currentPlanId === 'pro' && currentUser
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
              }`}
            >
              {loadingPlan === 'pro' ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isFreeAccess ? (
                <span>Founder Access (No Payment Required)</span>
              ) : currentPlanId === 'pro' && currentUser ? (
                <span>Active Pro Subscription</span>
              ) : (
                <>
                  <span>Upgrade to ApplyWise Pro</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-20 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Feature Entitlements Breakdown</h2>
            <p className="text-xs text-slate-500">Compare what is included in Free versus ApplyWise Pro.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto overflow-touch">
              <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-6">Feature</th>
                  <th className="py-3.5 px-6 text-center w-36">ApplyWise Free</th>
                  <th className="py-3.5 px-6 text-center w-36 text-blue-600 font-bold">ApplyWise Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {COMPARISON_FEATURES.map(feat => (
                  <tr key={feat.name} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900">{feat.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{feat.description}</div>
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      {feat.includedInFree ? (
                        <Check className="h-4 w-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-center bg-blue-50/20">
                      {feat.includedInPro ? (
                        <Check className="h-4 w-4 text-blue-600 font-bold mx-auto" />
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
          <h2 className="text-xl font-bold text-slate-900 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4 text-xs">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <h4 className="font-bold text-slate-900">Can I cancel my Pro subscription at any time?</h4>
              <p className="text-slate-600 leading-relaxed">
                Yes. You can cancel with a single click. Your Pro capabilities will remain active until the end of your current billing period, after which your account automatically reverts to Free without deleting any saved applications.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <h4 className="font-bold text-slate-900">What happens when I reach my monthly AI quota?</h4>
              <p className="text-slate-600 leading-relaxed">
                Free accounts receive 10 AI queries per month. Pro accounts receive 300 AI queries per month. Quotas reset automatically at the beginning of each billing cycle.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <h4 className="font-bold text-slate-900">Does ApplyWise AI invent fake experience on my resume?</h4>
              <p className="text-slate-600 leading-relaxed">
                Never. ApplyWise AI enforces a strict zero-hallucination verification engine. Every bullet point and company on tailored documents must provably originate from your verified master profile.
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
            <button onClick={onNavigateHome} className="hover:text-white transition">Home</button>
            <span>Free Public Service</span>
            <span>Zero Hallucination Guarantee</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} ApplyWise AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
