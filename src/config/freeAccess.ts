// src/config/freeAccess.ts
// Centralized Hardcoded Free-Access Allowlist & Entitlement Service for ApplyVise AI

import { PlanId } from './plans.ts';

/**
 * The permanent authorized email accounts granted unrestricted Pro entitlements.
 * Normalized to lowercase.
 */
export const PERMANENT_FREE_ACCESS_EMAILS: readonly string[] = Object.freeze([
  'aksharasahu45@gmail.com',
  'ayushprakash0021@gmail.com',
]);

export interface FreeAccessUserIdentity {
  id?: string;
  email?: string;
  fullName?: string;
  isVerified?: boolean;
  role?: string;
}

export interface EffectivePlanDetails {
  planId: PlanId;
  planName: string;
  badge: string;
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  billingInterval: 'permanent' | 'monthly' | 'annual';
  isPermanentFreeAccess: boolean;
  membershipSource?: 'ADMIN_GRANT' | 'PAYMENT' | 'PROMOTIONAL' | 'SYSTEM';
  validityType?: string;
  remainingDays?: number | null;
  aiQuotaMonthly: number;
  maxDailyApplications: number;
  description: string;
  canTailorResume: boolean;
  canDeepAnalyze: boolean;
  canInterviewPrep: boolean;
  canAutoApply: boolean;
  unlimitedAICopilot: boolean;
  isBlack?: boolean;
  canBlackCareerStrategy?: boolean;
  canBlackAppIntelligence?: boolean;
  canBlackInterviewSim?: boolean;
  canBlackResumeStudio?: boolean;
  priorityProcessing?: boolean;
}

/**
 * Normalizes an email address by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Checks if a given email is on the permanent free access allowlist.
 */
export function isPermanentFreeAccessEmail(email?: string | null): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return PERMANENT_FREE_ACCESS_EMAILS.includes(normalized);
}

/**
 * Authoritative check: Verifies if a user identity qualifies for permanent free access.
 * Requires a verified email when verification status is present.
 */
export function isPermanentFreeAccessAccount(user?: FreeAccessUserIdentity | null): boolean {
  if (!user || !user.email) return false;
  // If email verification is available and the account is unverified, reject
  if (user.isVerified === false) {
    return false;
  }
  return isPermanentFreeAccessEmail(user.email);
}

/**
 * Computes the effective plan for any user identity.
 * Allowlisted accounts are always granted Pro with Founder/Permanent Free Access branding,
 * without creating paid subscriptions or billing records.
 */
export function getEffectivePlan(
  user?: FreeAccessUserIdentity | null,
  currentSubscription?: {
    planId?: string;
    status?: string;
    billingInterval?: string;
    currentPeriodEnd?: string;
    membershipSource?: 'ADMIN_GRANT' | 'PAYMENT' | 'PROMOTIONAL' | 'SYSTEM';
    validityType?: string;
    remainingDays?: number | null;
  } | null
): EffectivePlanDetails {
  const isFreeAccess = isPermanentFreeAccessAccount(user);

  if (isFreeAccess) {
    return {
      planId: 'black',
      planName: 'BLACK by ApplyVise AI — Founder Elite Access',
      badge: 'BLACK ELITE',
      status: 'active',
      billingInterval: 'permanent',
      isPermanentFreeAccess: true,
      membershipSource: 'SYSTEM',
      validityType: 'lifetime',
      remainingDays: null,
      aiQuotaMonthly: 1200, // High operational runaway protection ceiling (2× Pro 600)
      maxDailyApplications: 100, // Unrestricted daily application ceiling (2× Pro 50)
      description: 'Permanent unrestricted access to BLACK by ApplyVise AI, exclusive career intelligence, AI Copilot, and priority capabilities.',
      canTailorResume: true,
      canDeepAnalyze: true,
      canInterviewPrep: true,
      canAutoApply: true,
      unlimitedAICopilot: true,
      isBlack: true,
      canBlackCareerStrategy: true,
      canBlackAppIntelligence: true,
      canBlackInterviewSim: true,
      canBlackResumeStudio: true,
      priorityProcessing: true,
    };
  }

  // Check if subscription is expired
  const isExpired =
    currentSubscription?.status === 'expired' ||
    (currentSubscription?.currentPeriodEnd &&
      new Date(currentSubscription.currentPeriodEnd).getTime() <= Date.now() &&
      currentSubscription.billingInterval !== 'permanent' &&
      currentSubscription.validityType !== 'lifetime');

  if (isExpired) {
    return {
      planId: 'free',
      planName: 'ApplyVise Free (Membership Expired)',
      badge: 'FREE',
      status: 'expired',
      billingInterval: 'monthly',
      isPermanentFreeAccess: false,
      membershipSource: currentSubscription?.membershipSource || 'SYSTEM',
      validityType: currentSubscription?.validityType,
      remainingDays: 0,
      aiQuotaMonthly: 10,
      maxDailyApplications: 5,
      description: 'Your previous membership has expired. Renew or upgrade to restore unrestricted access.',
      canTailorResume: false,
      canDeepAnalyze: false,
      canInterviewPrep: false,
      canAutoApply: false,
      unlimitedAICopilot: false,
      isBlack: false,
      canBlackCareerStrategy: false,
      canBlackAppIntelligence: false,
      canBlackInterviewSim: false,
      canBlackResumeStudio: false,
      priorityProcessing: false,
    };
  }

  // 1. BLACK ELITE Membership Check (Positioned Above Pro)
  const isBlackPaid =
    currentSubscription?.planId === 'black' &&
    currentSubscription?.status !== 'inactive' &&
    currentSubscription?.status !== 'canceled';
  if (isBlackPaid) {
    const isLifetime = currentSubscription?.billingInterval === 'permanent' || currentSubscription?.validityType === 'lifetime';
    return {
      planId: 'black',
      planName: isLifetime ? 'BLACK by ApplyVise AI — Lifetime Member' : 'BLACK by ApplyVise AI',
      badge: 'BLACK ELITE',
      status: 'active',
      billingInterval: (currentSubscription?.billingInterval as any) || 'monthly',
      isPermanentFreeAccess: false,
      membershipSource: currentSubscription?.membershipSource || 'PAYMENT',
      validityType: currentSubscription?.validityType,
      remainingDays: currentSubscription?.remainingDays,
      aiQuotaMonthly: 600, // Exactly 2 × Pro (300)
      maxDailyApplications: 50, // Exactly 2 × Pro (25)
      description: 'Your Career. Without Limits. Elite Career Intelligence with 2× Pro usage and exclusive capabilities.',
      canTailorResume: true,
      canDeepAnalyze: true,
      canInterviewPrep: true,
      canAutoApply: true,
      unlimitedAICopilot: false,
      isBlack: true,
      canBlackCareerStrategy: true,
      canBlackAppIntelligence: true,
      canBlackInterviewSim: true,
      canBlackResumeStudio: true,
      priorityProcessing: true,
    };
  }

  // 2. Pro Membership Check
  const isProPaid =
    currentSubscription?.planId === 'pro' &&
    currentSubscription?.status !== 'inactive' &&
    currentSubscription?.status !== 'canceled';
  if (isProPaid) {
    const isLifetime = currentSubscription?.billingInterval === 'permanent' || currentSubscription?.validityType === 'lifetime';
    return {
      planId: 'pro',
      planName: isLifetime ? 'ApplyVise Pro — Lifetime Member' : 'ApplyVise Pro',
      badge: 'PRO',
      status: 'active',
      billingInterval: (currentSubscription?.billingInterval as any) || 'monthly',
      isPermanentFreeAccess: false,
      membershipSource: currentSubscription?.membershipSource || 'PAYMENT',
      validityType: currentSubscription?.validityType,
      remainingDays: currentSubscription?.remainingDays,
      aiQuotaMonthly: 300,
      maxDailyApplications: 25,
      description: 'Advanced AI tailoring, in-depth job analysis, and interview preparation.',
      canTailorResume: true,
      canDeepAnalyze: true,
      canInterviewPrep: true,
      canAutoApply: true,
      unlimitedAICopilot: false,
      isBlack: false,
      canBlackCareerStrategy: false,
      canBlackAppIntelligence: false,
      canBlackInterviewSim: false,
      canBlackResumeStudio: false,
      priorityProcessing: false,
    };
  }

  // 3. Free Plan Default
  return {
    planId: 'free',
    planName: 'ApplyVise Free',
    badge: 'FREE',
    status: (currentSubscription?.status as any) || 'active',
    billingInterval: 'monthly',
    isPermanentFreeAccess: false,
    membershipSource: currentSubscription?.membershipSource || 'SYSTEM',
    validityType: currentSubscription?.validityType,
    remainingDays: currentSubscription?.remainingDays,
    aiQuotaMonthly: 10,
    maxDailyApplications: 5,
    description: 'Essential application tracking, factual resume extraction, and core discovery.',
    canTailorResume: false,
    canDeepAnalyze: false,
    canInterviewPrep: false,
    canAutoApply: false,
    unlimitedAICopilot: false,
    isBlack: false,
    canBlackCareerStrategy: false,
    canBlackAppIntelligence: false,
    canBlackInterviewSim: false,
    canBlackResumeStudio: false,
    priorityProcessing: false,
  };
}

/**
 * Checks whether a user is entitled to access a specific feature key.
 * Used across backend routes and UI gates.
 */
export function checkFeatureEntitlement(
  user: FreeAccessUserIdentity | null,
  featureKey: string,
  currentSubscription?: { planId?: string; status?: string } | null
): boolean {
  // Allowlisted accounts bypass all feature gates unconditionally
  if (isPermanentFreeAccessAccount(user)) {
    return true;
  }

  const effective = getEffectivePlan(user, currentSubscription);

  // BLACK tier has access to everything including BLACK-exclusive capabilities
  if (effective.planId === 'black') {
    return true;
  }

  // BLACK-exclusive gates require BLACK tier
  if (featureKey.startsWith('black_')) {
    return false;
  }

  // PRO tier access
  if (effective.planId === 'pro') {
    return true;
  }

  const freeAllowedFeatures = [
    'job_search',
    'application_tracking',
    'resume_extraction',
    'copilot_basic',
    'career_twin_view',
    'application_receipts',
  ];

  return freeAllowedFeatures.includes(featureKey);
}

/**
 * Evaluates AI usage allowance.
 * Allowlisted accounts bypass standard monthly subscription quotas,
 * bounded only by a high operational safeguard (1,000 queries) to prevent infinite loops.
 */
export function checkAIUsageAllowance(
  user: FreeAccessUserIdentity | null,
  currentUsage: number,
  currentSubscription?: { planId?: string; status?: string } | null
): {
  allowed: boolean;
  remaining: number;
  limit: number;
  isUnlimited: boolean;
  isPermanentFreeAccess: boolean;
} {
  if (isPermanentFreeAccessAccount(user)) {
    const operationalSafeguardLimit = 1000;
    return {
      allowed: currentUsage < operationalSafeguardLimit,
      remaining: Math.max(0, operationalSafeguardLimit - currentUsage),
      limit: operationalSafeguardLimit,
      isUnlimited: true,
      isPermanentFreeAccess: true,
    };
  }

  const effective = getEffectivePlan(user, currentSubscription);
  const limit = effective.aiQuotaMonthly;

  return {
    allowed: currentUsage < limit,
    remaining: Math.max(0, limit - currentUsage),
    limit,
    isUnlimited: false,
    isPermanentFreeAccess: false,
  };
}
