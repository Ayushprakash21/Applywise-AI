// src/config/plans.ts
// Centralized Subscription Plans & Feature Entitlements Configuration

export type PlanId = 'free' | 'pro';

export interface UserSubscription {
  userId?: string;
  planId?: PlanId;
  plan?: PlanId;
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  billingInterval?: 'monthly' | 'annual' | 'permanent';
  currency?: string;
  amount?: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  periodStart?: string;
  periodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  planName?: string;
  badge?: string;
  isPermanentFreeAccess?: boolean;
  description?: string;
}

export interface PlanFeature {
  name: string;
  description: string;
  includedInFree: boolean;
  includedInPro: boolean;
  isUpcoming?: boolean;
}

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  badge?: string;
  tagline: string;
  description: string;
  price: {
    monthly: {
      inr: number;
      usd: number;
    };
    annual: {
      inr: number;
      usd: number;
      savingsPercent: number;
    };
  };
  aiQuotaMonthly: number; // Max requests per billing period
  highlighted?: boolean;
  ctaText: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'ApplyVise Free',
    tagline: 'For individuals getting started',
    description: 'Essential job tracking, factual resume extraction, and core career discovery tools.',
    price: {
      monthly: { inr: 0, usd: 0 },
      annual: { inr: 0, usd: 0, savingsPercent: 0 },
    },
    aiQuotaMonthly: 10,
    ctaText: 'Get Started Free',
    features: [
      'Basic account & persistent profile storage',
      'Job application tracking across all stages',
      'Factual PDF/DOCX resume text extraction',
      'Live job discovery (Remotive, Arbeitnow, Jobicy)',
      '10 AI Copilot queries & career guidance / month',
      'Standard ATS resume DOCX export',
      'Truthful guided application workflows',
    ],
  },
  pro: {
    id: 'pro',
    name: 'ApplyVise Pro',
    badge: 'MOST POPULAR',
    tagline: 'For job seekers who want a more powerful career toolkit',
    description: 'Advanced AI tailoring, in-depth job analysis, interview preparation, and high-volume intelligence.',
    price: {
      monthly: { inr: 799, usd: 9.99 },
      annual: { inr: 7990, usd: 99.90, savingsPercent: 17 },
    },
    aiQuotaMonthly: 300,
    highlighted: true,
    ctaText: 'Upgrade to Pro',
    features: [
      'Everything in Free tier, plus:',
      '300 AI Copilot requests / month with deep context',
      'Advanced zero-hallucination ATS resume tailoring',
      'In-depth vacancy requirements & skill gap analysis',
      'Role-specific AI interview preparation & answer coaching',
      'Targeted recruiter messaging & cover letter drafting',
      'Priority job matching across global aggregators',
      'Pro candidate badge & premium dashboard experience',
    ],
  },
};

export const COMPARISON_FEATURES: PlanFeature[] = [
  {
    name: 'Application Tracking',
    description: 'Organize and track vacancies through discovered, prepared, submitted, and interview stages',
    includedInFree: true,
    includedInPro: true,
  },
  {
    name: 'Resume Extraction',
    description: 'Extract factual career records from standard PDF and Word documents',
    includedInFree: true,
    includedInPro: true,
  },
  {
    name: 'Real Vacancy Feeds',
    description: 'Search cross-industry listings from authentic remote job sources',
    includedInFree: true,
    includedInPro: true,
  },
  {
    name: 'AI Copilot Requests',
    description: 'Monthly query volume for the global career assistant',
    includedInFree: true,
    includedInPro: true,
  },
  {
    name: 'ATS Document Tailoring',
    description: 'Tailor resume bullets and headlines to specific vacancy requirements',
    includedInFree: false,
    includedInPro: true,
  },
  {
    name: 'Vacancy Gap Analysis',
    description: 'Deep evaluation of missing qualifications and competitive standing',
    includedInFree: false,
    includedInPro: true,
  },
  {
    name: 'Interview Practice Studio',
    description: 'Generate realistic interview questions and get feedback on answers',
    includedInFree: false,
    includedInPro: true,
  },
  {
    name: 'Recruiter Communications',
    description: 'Draft customized cover letters and follow-up emails',
    includedInFree: false,
    includedInPro: true,
  },
];
