// worker/usageEnforcement.ts
// Authoritative Quota and Access Limits Enforcement for ApplyWise AI

import { D1Store } from './d1Store.ts';
import { isPermanentFreeAccessEmail } from '../src/config/freeAccess.ts';

export const FREE_TIER_LIMITS = {
  MAX_ACTIVE_RESUMES: 1,
  MAX_APPLICATIONS: 5,
};

export interface AccountUsageStats {
  planId: 'free' | 'pro';
  isPermanentAccess: boolean;
  resumes: {
    active: number;
    max: number | null; // null for unlimited
    canUploadNew: boolean;
    canReplace: boolean;
  };
  applications: {
    distinctCount: number;
    max: number | null; // null for unlimited
    canCreateNew: boolean;
    remaining: number | null;
  };
  aiCopilot: {
    tier: 'standard' | 'unlimited';
    isUnlimited: boolean;
  };
}

export class UsageLimitError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 403) {
    super(message);
    this.name = 'UsageLimitError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Returns complete, authoritative usage metrics for the given user account.
 */
export async function getAccountUsageStats(
  userId: string,
  store: D1Store,
  userEmail?: string
): Promise<AccountUsageStats> {
  const isPerm = userEmail ? isPermanentFreeAccessEmail(userEmail) : false;
  const sub = await store.getUserSubscription(userId);
  const isPro = isPerm || (sub && sub.planId === 'pro' && sub.status === 'active');
  const planId: 'free' | 'pro' = isPro ? 'pro' : 'free';

  const [activeResumes, applicationCount] = await Promise.all([
    store.countResumeDocuments(userId),
    store.countApplications(userId),
  ]);

  if (isPro) {
    return {
      planId: 'pro',
      isPermanentAccess: isPerm,
      resumes: {
        active: activeResumes,
        max: null,
        canUploadNew: true,
        canReplace: true,
      },
      applications: {
        distinctCount: applicationCount,
        max: null,
        canCreateNew: true,
        remaining: null,
      },
      aiCopilot: {
        tier: 'unlimited',
        isUnlimited: true,
      },
    };
  }

  // Free Tier
  const canUploadNewResume = activeResumes < FREE_TIER_LIMITS.MAX_ACTIVE_RESUMES;
  const remainingApps = Math.max(0, FREE_TIER_LIMITS.MAX_APPLICATIONS - applicationCount);
  const canCreateNewApp = applicationCount < FREE_TIER_LIMITS.MAX_APPLICATIONS;

  return {
    planId: 'free',
    isPermanentAccess: false,
    resumes: {
      active: activeResumes,
      max: FREE_TIER_LIMITS.MAX_ACTIVE_RESUMES,
      canUploadNew: canUploadNewResume,
      canReplace: true, // Free tier can always replace an existing resume
    },
    applications: {
      distinctCount: applicationCount,
      max: FREE_TIER_LIMITS.MAX_APPLICATIONS,
      canCreateNew: canCreateNewApp,
      remaining: remainingApps,
    },
    aiCopilot: {
      tier: 'standard',
      isUnlimited: false,
    },
  };
}

/**
 * Enforces resume upload limits before writing to D1.
 * Throws UsageLimitError (HTTP 403) if limit is exceeded.
 */
export async function assertCanUploadResume(
  userId: string,
  store: D1Store,
  userEmail: string,
  replaceExisting: boolean
): Promise<void> {
  const isPerm = isPermanentFreeAccessEmail(userEmail);
  if (isPerm) return;

  const sub = await store.getUserSubscription(userId);
  if (sub && sub.planId === 'pro' && sub.status === 'active') return;

  // Free Tier checks
  if (replaceExisting) {
    // Replacement is explicitly allowed
    return;
  }

  const activeResumes = await store.countResumeDocuments(userId);
  if (activeResumes >= FREE_TIER_LIMITS.MAX_ACTIVE_RESUMES) {
    throw new UsageLimitError(
      'Free plan limit reached: You can only store 1 active resume. Please upgrade to Pro for unlimited resumes, or replace your existing resume.',
      'RESUME_LIMIT_REACHED',
      403
    );
  }
}

/**
 * Enforces application creation limits before writing to D1.
 * Throws UsageLimitError (HTTP 403) if a 6th application is attempted on Free tier.
 */
export async function assertCanCreateApplication(
  userId: string,
  store: D1Store,
  userEmail: string,
  vacancyId: string
): Promise<void> {
  const isPerm = isPermanentFreeAccessEmail(userEmail);
  if (isPerm) return;

  const sub = await store.getUserSubscription(userId);
  if (sub && sub.planId === 'pro' && sub.status === 'active') return;

  // Check if an application for this vacancy already exists for this user (updates are always permitted)
  const existing = await store.getApplicationByVacancy(userId, vacancyId);
  if (existing) {
    return;
  }

  // Count distinct applications
  const appCount = await store.countApplications(userId);
  if (appCount >= FREE_TIER_LIMITS.MAX_APPLICATIONS) {
    throw new UsageLimitError(
      'Free plan limit reached: You can create up to 5 applications on the Free tier. Upgrade to Pro for unlimited job applications.',
      'APPLICATION_LIMIT_REACHED',
      403
    );
  }
}

/**
 * Checks extracted resume text for emails differing from the authenticated user's email.
 */
export function inspectResumeIdentity(
  extractedText: string,
  userEmail: string
): { isMismatch: boolean; detectedEmails: string[]; warning?: string } {
  if (!extractedText || !userEmail) {
    return { isMismatch: false, detectedEmails: [] };
  }

  const matches = extractedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const detectedEmails = Array.from(new Set(matches.map(m => m.toLowerCase().trim())));
  const normalizedUserEmail = userEmail.toLowerCase().trim();

  if (detectedEmails.length === 0) {
    return { isMismatch: false, detectedEmails: [] };
  }

  const matchesAccount = detectedEmails.some(e => e === normalizedUserEmail);
  if (!matchesAccount) {
    return {
      isMismatch: true,
      detectedEmails,
      warning: `Resume contains contact email (${detectedEmails.join(', ')}) that does not match your registered account email (${normalizedUserEmail}).`,
    };
  }

  return { isMismatch: false, detectedEmails };
}
