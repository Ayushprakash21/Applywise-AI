import React from 'react';
import { Crown, Check, Zap, ArrowRight } from 'lucide-react';
import { RoyalCrownLogo } from '../RoyalCrownLogo.tsx';
import { SUBSCRIPTION_PLANS, PlanId } from '../../config/plans.ts';
import { AuthUser } from '../../services/api.ts';

export interface BlackElitePricingCardProps {
  billingInterval: 'monthly' | 'annual';
  currency: 'INR' | 'USD';
  currentUser: AuthUser | null;
  currentPlanId?: PlanId;
  isFreeAccess?: boolean;
  loadingPlan: string | null;
  onSelectPlan: (planId: PlanId) => void;
  className?: string;
}

/**
 * BlackElitePricingCard
 *
 * Dedicated ultra-premium pricing card for BLACK ELITE membership.
 * Brand Requirement: BLACK Elite ALWAYS uses an exclusive permanent BLACK + GOLD visual identity.
 * It must NEVER become beige, white or ivory in either light or dark mode.
 *
 * Visual Specifications:
 * - Card background: Deep premium black (#090909)
 * - Inner surfaces: Charcoal (#191713)
 * - Border: Metallic gold (#C9A45B), 1.5px thickness
 * - Heading: Warm white (#FAF8F5)
 * - Price: Premium metallic gold (#C9A45B)
 * - BLACK ELITE badge: Gold outline with gold text
 * - Icons: Gold (#C9A45B) or warm white (#FAF8F5)
 * - Supporting text: Soft ivory (#D8D3C8)
 * - CTA: Gold gradient background with black text (#090909)
 * - Shadows: Subtle dark shadow with restrained gold illumination
 */
export const BlackElitePricingCard: React.FC<BlackElitePricingCardProps> = ({
  billingInterval,
  currency,
  currentUser,
  currentPlanId = 'free',
  isFreeAccess = false,
  loadingPlan,
  onSelectPlan,
  className = '',
}) => {
  const plan = SUBSCRIPTION_PLANS.black;
  const isCurrentActive = currentPlanId === 'black' && !!currentUser;
  const isLoading = loadingPlan === 'black';

  return (
    <div
      data-testid="pricing-card-black"
      data-theme-surface="dark"
      data-theme-variant="black-elite"
      className={`black-elite-theme-card relative rounded-3xl transition-transform duration-300 hover:scale-[1.01] flex flex-col justify-between overflow-hidden ${className}`}
      style={{
        backgroundColor: '#090909',
        border: '1.5px solid #C9A45B',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.75), 0 0 24px rgba(201, 164, 91, 0.14)',
        color: '#D8D3C8',
      }}
    >
      {/* Subtle Restrained Ambient Gold Illumination */}
      <div
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-25"
        style={{ background: 'radial-gradient(circle, rgba(201, 164, 91, 0.35) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(201, 164, 91, 0.25) 0%, transparent 70%)' }}
      />

      {/* Main Card Body */}
      <div className="relative p-6 sm:p-8 flex flex-col justify-between h-full space-y-6">
        <div className="space-y-4">
          {/* Top Wordmark & BLACK ELITE Badge */}
          <div className="flex items-center justify-between">
            <RoyalCrownLogo size="lg" animated showWordmark variant="black-elite" />
            <span
              className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs"
              style={{
                backgroundColor: '#090909',
                border: '1px solid #C9A45B',
                color: '#C9A45B',
              }}
            >
              {isFreeAccess
                ? 'FOUNDER ACCESS — ACTIVE'
                : isCurrentActive
                ? 'YOUR ACTIVE TIER'
                : 'BLACK ELITE'}
            </span>
          </div>

          {/* Heading & Taglines */}
          <div>
            <h3
              className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2"
              style={{ color: '#FAF8F5' }}
            >
              <span>{plan.name}</span>
            </h3>
            <p
              className="text-xs font-bold mt-1 tracking-wide"
              style={{ color: '#C9A45B' }}
            >
              {plan.tagline}
            </p>
            {plan.secondaryTagline && (
              <p
                className="text-[11px] mt-0.5"
                style={{ color: '#D8D3C8' }}
              >
                {plan.secondaryTagline}
              </p>
            )}
          </div>

          {/* Price Display */}
          <div className="pt-2">
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-4xl sm:text-5xl font-black tracking-tight"
                style={{ color: '#C9A45B' }}
              >
                {currency === 'INR'
                  ? (billingInterval === 'annual' ? '₹1,332' : '₹1,599')
                  : (billingInterval === 'annual' ? '$16.65' : '$19.99')}
              </span>
              <span className="text-xs font-medium" style={{ color: '#D8D3C8' }}>
                / month
              </span>
            </div>
            {billingInterval === 'annual' && (
              <p className="text-[11px] font-bold mt-0.5" style={{ color: '#C9A45B' }}>
                Billed annually ({currency === 'INR' ? '₹15,990/yr' : '$199.90/yr'})
              </p>
            )}
          </div>

          {/* Description */}
          <p className="text-xs leading-relaxed pt-1" style={{ color: '#D8D3C8' }}>
            {plan.description}
          </p>

          {/* Inner Surface: Charcoal (#191713) Measurable Doubled Limits Box */}
          <div
            data-be-surface="inner"
            className="rounded-2xl p-4 space-y-2.5"
            style={{
              backgroundColor: '#191713',
              border: '1px solid rgba(201, 164, 91, 0.35)',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
            }}
          >
            <span
              className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: '#C9A45B' }}
            >
              <Zap className="w-3.5 h-3.5" style={{ color: '#C9A45B' }} />
              <span>EXACT 2× PRO MEASURABLE ENTITLEMENTS:</span>
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Tile 1: AI Copilot Volume */}
              <div
                className="p-2.5 rounded-xl"
                style={{
                  backgroundColor: '#12110E',
                  border: '1px solid rgba(201, 164, 91, 0.20)',
                }}
              >
                <span className="block text-[10px] font-medium" style={{ color: '#D8D3C8' }}>
                  AI Copilot Volume
                </span>
                <span className="font-bold text-sm block" style={{ color: '#FAF8F5' }}>
                  600 req / month
                </span>
                <span className="text-[9px] font-bold block" style={{ color: '#C9A45B' }}>
                  (2× Pro 300)
                </span>
              </div>

              {/* Tile 2: Daily Auto-Apply */}
              <div
                className="p-2.5 rounded-xl"
                style={{
                  backgroundColor: '#12110E',
                  border: '1px solid rgba(201, 164, 91, 0.20)',
                }}
              >
                <span className="block text-[10px] font-medium" style={{ color: '#D8D3C8' }}>
                  Daily Auto-Apply
                </span>
                <span className="font-bold text-sm block" style={{ color: '#FAF8F5' }}>
                  50 / day
                </span>
                <span className="text-[9px] font-bold block" style={{ color: '#C9A45B' }}>
                  (2× Pro 25)
                </span>
              </div>

              {/* Tile 3: Resume Tailoring */}
              <div
                className="p-2.5 rounded-xl"
                style={{
                  backgroundColor: '#12110E',
                  border: '1px solid rgba(201, 164, 91, 0.20)',
                }}
              >
                <span className="block text-[10px] font-medium" style={{ color: '#D8D3C8' }}>
                  Resume Tailoring
                </span>
                <span className="font-bold text-sm block" style={{ color: '#FAF8F5' }}>
                  60 / month
                </span>
                <span className="text-[9px] font-bold block" style={{ color: '#C9A45B' }}>
                  (2× Pro 30)
                </span>
              </div>

              {/* Tile 4: Interview Prep */}
              <div
                className="p-2.5 rounded-xl"
                style={{
                  backgroundColor: '#12110E',
                  border: '1px solid rgba(201, 164, 91, 0.20)',
                }}
              >
                <span className="block text-[10px] font-medium" style={{ color: '#D8D3C8' }}>
                  Interview Prep
                </span>
                <span className="font-bold text-sm block" style={{ color: '#FAF8F5' }}>
                  20 sessions
                </span>
                <span className="text-[9px] font-bold block" style={{ color: '#C9A45B' }}>
                  (2× Pro 10)
                </span>
              </div>
            </div>
          </div>

          {/* Exclusive Capabilities List */}
          <div
            className="border-t pt-4 space-y-2.5"
            style={{ borderColor: 'rgba(201, 164, 91, 0.25)' }}
          >
            <span
              className="text-xs font-bold flex items-center gap-1.5"
              style={{ color: '#FAF8F5' }}
            >
              <Crown className="w-3.5 h-3.5" style={{ color: '#C9A45B' }} />
              <span style={{ color: '#C9A45B' }}>Exclusive BLACK Capabilities:</span>
            </span>

            <ul className="space-y-2 text-xs" style={{ color: '#D8D3C8' }}>
              {plan.features.slice(5).map(f => (
                <li key={f} className="flex items-start space-x-2.5">
                  <Check
                    className="h-4 w-4 shrink-0 mt-0.5 font-bold"
                    style={{ color: '#C9A45B' }}
                  />
                  <span className="leading-snug">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA Button: Gold Gradient with Deep Black Text (#090909) */}
        <button
          onClick={() => onSelectPlan('black')}
          disabled={isLoading || isCurrentActive}
          className={`w-full py-3.5 min-h-[46px] rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-lg active:scale-[0.98] ${
            isCurrentActive ? 'cursor-default' : 'hover:brightness-110'
          }`}
          style={{
            background: isCurrentActive
              ? '#191713'
              : 'linear-gradient(135deg, #C9A45B 0%, #E2C58A 50%, #C9A45B 100%)',
            color: isCurrentActive ? '#C9A45B' : '#090909',
            border: '1px solid #C9A45B',
            boxShadow: isCurrentActive
              ? 'none'
              : '0 4px 16px rgba(201, 164, 91, 0.35)',
          }}
        >
          {isLoading ? (
            <div
              className="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#090909', borderTopColor: 'transparent' }}
            />
          ) : isCurrentActive ? (
            <div className="flex items-center gap-1.5">
              <RoyalCrownLogo size="xs" variant="black-elite" />
              <span>Active BLACK Elite Membership</span>
            </div>
          ) : (
            <>
              <RoyalCrownLogo size="xs" variant="black-elite" />
              <span>Subscribe to BLACK</span>
              <ArrowRight className="h-3.5 w-3.5" style={{ color: '#090909' }} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
