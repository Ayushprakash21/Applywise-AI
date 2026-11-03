// src/config/plans.ts
// Centralized Subscription Plans & Feature Entitlements Configuration

export type PlanId = 'free' | 'pro' | 'black';

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
  includedInBlack: boolean;
  freeLimit?: string;
  proLimit?: string;
  blackLimit?: string;
  isBlackExclusive?: boolean;
  isUpcoming?: boolean;
}

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  brand?: string;
  badge?: string;
  tagline: string;
  secondaryTagline?: string;
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
  aiQuotaMonthly: number; // Max requests per billing period (BLACK = 2 x PRO)
  maxDailyApplications?: number; // Max applications per day (BLACK = 2 x PRO)
  highlighted?: boolean;
  isBlackElite?: boolean;
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
    maxDailyApplications: 5,
    ctaText: 'Get Started Free',
    features: [
      'Basic account & persistent profile storage',
      'Job application tracking across all stages',
      'Factual PDF/DOCX resume text extraction',
      'Live job discovery (Remotive, Arbeitnow, Jobicy)',
      '10 AI Copilot requests / month',
      'Up to 5 job applications per day',
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
    maxDailyApplications: 25,
    highlighted: true,
    ctaText: 'Upgrade to Pro',
    features: [
      'Everything in Free tier, plus:',
      '300 AI Copilot requests / month with deep context',
      '25 daily applications capacity',
      'Advanced zero-hallucination ATS resume tailoring',
      'In-depth vacancy requirements & skill gap analysis',
      'Role-specific AI interview preparation & answer coaching',
      'Targeted recruiter messaging & cover letter drafting',
      'Priority job matching across global aggregators',
      'Pro candidate badge & premium dashboard experience',
    ],
  },
  black: {
    id: 'black',
    name: 'BLACK',
    brand: 'BLACK by ApplyVise AI',
    badge: 'BLACK ELITE',
    tagline: 'Your Career. Without Limits.',
    secondaryTagline: 'Elite Career Intelligence. Maximum Advantage.',
    description: 'The ultimate career intelligence membership. 2× Pro measurable usage limits, exclusive multi-role strategy, advanced interview simulations, and priority AI processing.',
    price: {
      monthly: { inr: 1599, usd: 19.99 },
      annual: { inr: 15990, usd: 199.90, savingsPercent: 17 },
    },
    aiQuotaMonthly: 600, // Exactly 2 × Pro (300)
    maxDailyApplications: 50, // Exactly 2 × Pro (25)
    highlighted: true,
    isBlackElite: true,
    ctaText: 'Subscribe to BLACK',
    features: [
      'Everything in Pro tier, plus:',
      '600 AI Copilot requests / month (2× Pro)',
      '50 daily applications capacity (2× Pro)',
      '60 ATS resume tailoring credits / month (2× Pro)',
      '20 role-specific interview simulation sessions / month (2× Pro)',
      'BLACK Career Intelligence: Multi-role career positioning & trajectory mapping',
      'BLACK Application Intelligence: Recruiter perspective audit & pre-flight verification',
      'BLACK Interview Intelligence: Custom behavioral & technical simulation engine',
      'BLACK Resume Studio: Multi-trajectory resume versioning & strict ATS audit',
      'Priority AI Processing Queue & early access to next-gen reasoning engines',
      'Exclusive Royal Crown BLACK ELITE membership badge across entire platform',
    ],
  },
};

export const COMPARISON_FEATURES: PlanFeature[] = [
  {
    name: 'Application Tracking',
    description: 'Organize and track vacancies through discovered, prepared, submitted, and interview stages',
    includedInFree: true,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: 'Up to 5 active',
    proLimit: 'Unlimited',
    blackLimit: 'Unlimited + Multi-Role',
  },
  {
    name: 'Resume Extraction',
    description: 'Extract factual career records from standard PDF and Word documents',
    includedInFree: true,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: '1 active document',
    proLimit: 'Unlimited active',
    blackLimit: 'Unlimited + Deep ATS Audit',
  },
  {
    name: 'Real Vacancy Feeds',
    description: 'Search cross-industry listings from authentic remote job sources',
    includedInFree: true,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: 'Standard Sync',
    proLimit: 'Priority Sync (10m)',
    blackLimit: 'Instant Priority Sync (5m)',
  },
  {
    name: 'AI Copilot Requests',
    description: 'Monthly query volume for the global career assistant',
    includedInFree: true,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: '10 requests / mo',
    proLimit: '300 requests / mo',
    blackLimit: '600 requests / mo (2× Pro)',
  },
  {
    name: 'Daily Application Capacity',
    description: 'Maximum tailored applications permitted per 24-hour cycle',
    includedInFree: true,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: '5 / day',
    proLimit: '25 / day',
    blackLimit: '50 / day (2× Pro)',
  },
  {
    name: 'ATS Document Tailoring',
    description: 'Tailor resume bullets and headlines to specific vacancy requirements',
    includedInFree: false,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: '—',
    proLimit: '30 tailorings / mo',
    blackLimit: '60 tailorings / mo (2× Pro)',
  },
  {
    name: 'Vacancy Gap Analysis',
    description: 'Deep evaluation of missing qualifications and competitive standing',
    includedInFree: false,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: '—',
    proLimit: 'Included',
    blackLimit: 'Included + Executive Deep-Dive',
  },
  {
    name: 'Interview Practice Studio',
    description: 'Generate realistic interview questions and get feedback on answers',
    includedInFree: false,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: '—',
    proLimit: '10 sessions / mo',
    blackLimit: '20 sessions / mo (2× Pro)',
  },
  {
    name: 'Recruiter Communications',
    description: 'Draft customized cover letters and follow-up emails',
    includedInFree: false,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: '—',
    proLimit: 'Included',
    blackLimit: 'Included + Multi-Tone Framing',
  },
  {
    name: 'Advanced Fit Evidence Map',
    description: 'Requirement-by-requirement audit connecting verified facts, inferred relevance, and missing gaps',
    includedInFree: false,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: '—',
    proLimit: 'Included',
    blackLimit: 'Included + Evidence Weighting',
  },
  {
    name: 'Side-by-Side Opportunity Comparison',
    description: 'Compare 2 vacancies simultaneously against your profile with suitability recommendations',
    includedInFree: false,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: '—',
    proLimit: 'Included',
    blackLimit: 'Included',
  },
  {
    name: 'Career Improvement Roadmap',
    description: 'Prioritized learning projects with estimated hours to bridge verified market gaps',
    includedInFree: false,
    includedInPro: true,
    includedInBlack: true,
    freeLimit: '—',
    proLimit: 'Included',
    blackLimit: 'Included + Multi-Role Paths',
  },
  // BLACK EXCLUSIVE CAPABILITIES
  {
    name: 'BLACK: Multi-Role Career Positioning',
    description: 'Simultaneously position verified experience for executive, leadership, and specialist career tracks',
    includedInFree: false,
    includedInPro: false,
    includedInBlack: true,
    isBlackExclusive: true,
    freeLimit: '—',
    proLimit: '—',
    blackLimit: 'ELITE Exclusive',
  },
  {
    name: 'BLACK: Recruiter Perspective Audit',
    description: 'Simulation of senior recruiter screening heuristics, keyword density checks, and disqualifier flags',
    includedInFree: false,
    includedInPro: false,
    includedInBlack: true,
    isBlackExclusive: true,
    freeLimit: '—',
    proLimit: '—',
    blackLimit: 'ELITE Exclusive',
  },
  {
    name: 'BLACK: Advanced Interview Simulations',
    description: 'High-stakes behavioral and technical interview simulation engine with structured STAR feedback',
    includedInFree: false,
    includedInPro: false,
    includedInBlack: true,
    isBlackExclusive: true,
    freeLimit: '—',
    proLimit: '—',
    blackLimit: 'ELITE Exclusive',
  },
  {
    name: 'BLACK: Multi-Version Resume Studio',
    description: 'Maintain and export distinct role-tailored master resume branches with strict ATS formatting audit',
    includedInFree: false,
    includedInPro: false,
    includedInBlack: true,
    isBlackExclusive: true,
    freeLimit: '—',
    proLimit: '—',
    blackLimit: 'ELITE Exclusive',
  },
  {
    name: 'BLACK: Priority AI Processing Queue',
    description: 'Priority background scheduling with zero queue delays and early access to next-generation models',
    includedInFree: false,
    includedInPro: false,
    includedInBlack: true,
    isBlackExclusive: true,
    freeLimit: '—',
    proLimit: '—',
    blackLimit: 'ELITE Priority',
  },
];
