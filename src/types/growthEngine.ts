// src/types/growthEngine.ts
// TypeScript interfaces for ApplyVise Growth Engine — Autonomous AI Marketing Department

export type GrowthAutonomyMode = 'assisted' | 'supervised' | 'autonomous';
export type GrowthPublishingPermission = 'manual_approval' | 'auto_publish_approved_categories';

export type GrowthAgentType =
  | 'chief_growth'
  | 'seo_intelligence'
  | 'content_marketing'
  | 'social_media'
  | 'competitor_intelligence'
  | 'growth_strategy'
  | 'conversion_optimization'
  | 'reputation_brand';

export type GrowthTaskCategory =
  | 'seo_audit'
  | 'keyword_research'
  | 'content_draft'
  | 'social_post'
  | 'competitor_scan'
  | 'funnel_analysis'
  | 'growth_strategy'
  | 'reputation_scan';

export type GrowthTaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type GrowthTaskStatus = 'pending' | 'in_progress' | 'review_required' | 'approved' | 'rejected' | 'completed' | 'failed';

export interface GrowthAgentSettings {
  id: string;
  autonomyMode: GrowthAutonomyMode;
  isPaused: boolean;
  publishingPermission: GrowthPublishingPermission;
  contentFrequencyPerWeek: number;
  budgetCeilingMonthly: number;
  allowedDomains: string[];
  targetKeywords: string[];
  competitors: string[];
  connectedChannels: Record<string, boolean>;
  emergencyStopped: boolean;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthAgentRun {
  id: string;
  runType: 'scheduled' | 'manual_trigger' | 'event_driven';
  agentType: GrowthAgentType;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  metrics: Record<string, any>;
  summary?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface GrowthAgentTask {
  id: string;
  agentType: GrowthAgentType;
  title: string;
  category: GrowthTaskCategory;
  priority: GrowthTaskPriority;
  status: GrowthTaskStatus;
  payload: Record<string, any>;
  result: Record<string, any>;
  requiresApproval: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedByUserId?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeoProperty {
  id: string;
  url: string;
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  statusCode: number;
  indexable: boolean;
  sitemapPresent: boolean;
  robotsDirective: string;
  h1?: string;
  wordCount: number;
  structuredDataType?: string;
  internalInlinksCount: number;
  internalOutlinksCount: number;
  seoScore: number;
  issues: string[];
  lastCrawledAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeoKeywordGroup {
  id: string;
  clusterName: string;
  primaryIntent: 'informational' | 'navigational' | 'commercial' | 'transactional';
  primaryKeyword: string;
  keywords: string[];
  monthlySearchVolume: number;
  difficultyScore: number;
  currentVisibility: number;
  targetContentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeoAuditResult {
  id: string;
  auditType: string;
  healthScore: number;
  totalPagesCrawled: number;
  indexablePages: number;
  criticalIssuesCount: number;
  warningsCount: number;
  details: Record<string, any>;
  createdAt: string;
}

export type MarketingContentStatus =
  | 'IDEA'
  | 'RESEARCHING'
  | 'BRIEF_READY'
  | 'DRAFTING'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'UPDATE_RECOMMENDED'
  | 'ARCHIVED'
  | 'FAILED';

export type MarketingContentType =
  | 'career_guide'
  | 'resume_guide'
  | 'ats_optimization'
  | 'interview_prep'
  | 'interview_preparation'
  | 'job_search_strategy'
  | 'product_tutorial'
  | 'comparison_page'
  | 'faq'
  | 'newsletter'
  | 'social_post';

export interface MarketingContentItem {
  id: string;
  slug: string;
  title: string;
  contentType: MarketingContentType;
  targetAudience: string;
  searchIntent: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  status: MarketingContentStatus;
  outline: string[];
  bodyMarkdown: string;
  featuredImageUrl?: string;
  readTimeMinutes: number;
  internalLinkTargets: string[];
  callToAction: {
    text: string;
    url: string;
  };
  sources: string[];
  isPublished: boolean;
  publishedAt?: string;
  viewsCount: number;
  conversionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingCalendarItem {
  id: string;
  contentId: string;
  title: string;
  channel: 'blog' | 'linkedin' | 'meta' | 'x' | 'youtube' | 'newsletter';
  scheduledFor: string;
  status: 'scheduled' | 'published' | 'cancelled' | 'failed';
  createdAt: string;
}

export interface SocialAccount {
  id: string;
  platform: 'linkedin' | 'meta' | 'x' | 'youtube';
  accountName: string;
  connectionStatus: 'connected' | 'disconnected' | 'expired' | 'error';
  permissions: string[];
  lastSyncAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialPost {
  id: string;
  platform: 'linkedin' | 'meta' | 'x' | 'youtube';
  contentText?: string;
  postText: string;
  hashtags?: string[];
  mediaUrls: string[];
  status: 'draft' | 'review_required' | 'approved' | 'scheduled' | 'published' | 'failed';
  scheduledAt?: string;
  scheduledFor?: string | null;
  publishedAt?: string;
  externalPostId?: string | null;
  engagementMetrics?: Record<string, number>;
  engagementImpressions?: number;
  engagementClicks?: number;
  engagementLikes?: number;
  engagementShares?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  websiteUrl: string;
  positioningSummary: string;
  pricingTiers: Array<{ tierName: string; price: string; features: string[] }>;
  keyFeatures: string[];
  strengths: string[];
  weaknesses: string[];
  lastMonitoredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorObservation {
  id: string;
  competitorId: string;
  observationType: 'pricing_change' | 'feature_release' | 'messaging_shift' | 'content_strategy';
  title: string;
  sourceUrl: string;
  details: string;
  confidenceScore: number;
  strategicTakeaway: string;
  observedAt: string;
}

export interface MarketingCampaign {
  id: string;
  title: string;
  objective: 'brand_awareness' | 'candidate_acquisition' | 'pro_subscription_conversion' | 'seo_authority';
  channel: 'organic_seo' | 'content_marketing' | 'social_media' | 'referral' | 'partnership' | 'newsletter';
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  budgetAllocated: number;
  budgetSpent: number;
  targetAudience: string;
  trackingUtmCampaign: string;
  totalVisitors: number;
  signupsGenerated: number;
  subscribersGenerated: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingFunnelMetrics {
  id: string;
  periodDate?: string;
  dateBucket?: string;
  channel?: string;
  landingPageVisits?: number;
  visitorsCount: number;
  signupInitiations?: number;
  signupsCompleted?: number;
  signupsCount: number;
  profilesCompleted?: number;
  profileCompletedCount: number;
  resumesUploaded?: number;
  resumeTailoredCount: number;
  firstTailoringActions?: number;
  firstApplicationCount: number;
  checkoutInitiations?: number;
  checkoutStartedCount: number;
  paymentSuccesses?: number;
  paidSubscribersCount: number;
  conversionRateOverall: number;
  cancellations?: number;
  createdAt: string;
}

export interface MarketingIntegration {
  id: string;
  integrationKey: 'gsc' | 'ga4' | 'pagespeed' | 'linkedin' | 'meta' | 'x' | 'youtube' | 'email_resend';
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, any>;
  errorMessage?: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthAgentActivity {
  id: string;
  agentType: GrowthAgentType;
  actionType: string;
  summary: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface GrowthCommandCenterOverview {
  settings: GrowthAgentSettings;
  recentRuns: GrowthAgentRun[];
  pendingTasks: GrowthAgentTask[];
  kpis: {
    totalVisitors30d: number;
    signups30d: number;
    activeSubscribers: number;
    conversionRatePercent: number;
    averageSeoHealthScore: number;
    publishedArticlesCount: number;
    indexedPagesCount: number;
    competitorPriceAdvantageSummary: string;
  };
  workforceStatus: Array<{
    agentType: GrowthAgentType;
    name: string;
    description: string;
    status: 'idle' | 'active' | 'paused' | 'stopped' | 'failed';
    lastRunAt: string;
    pendingTasksCount: number;
    successRatePercent: number;
  }>;
  weeklyGrowthMemo?: {
    weekNumber: number;
    year: number;
    headline: string;
    executiveSummary: string;
    keyInitiativesCompleted: string[];
    bottlenecksIdentified: string[];
    recommendationsNextWeek: string[];
    generatedAt: string;
  };
}

export interface GrowthEngineOverviewSummary {
  settings: GrowthAgentSettings;
  activeAgentsCount: number;
  pendingApprovalsCount: number;
  seoHealthScore: number;
  publishedContentCount: number;
  totalOrganicVisitorsMonthly: number;
  conversionRatePercent: number;
  competitorsMonitoredCount: number;
  recentTasks: GrowthAgentTask[];
  recentActivities: GrowthAgentActivity[];
  weeklyGrowthStrategy: string;
}
