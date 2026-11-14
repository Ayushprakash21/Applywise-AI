// src/types/autopilot.ts
// Domain Types for ApplyVise Autopilot — Autonomous AI Job Application Agent

export type AutopilotOperatingMode =
  | 'MODE_A_ASSISTED'
  | 'MODE_B_SUPERVISED'
  | 'MODE_C_AUTONOMOUS';

export type AutopilotEligibilityStatus =
  | 'STRONG_MATCH'
  | 'GOOD_MATCH'
  | 'POTENTIAL_MATCH'
  | 'MISSING_INFO'
  | 'NOT_ELIGIBLE';

export type AutopilotJobStatus =
  | 'QUEUED'
  | 'PREPARING'
  | 'READY_FOR_REVIEW'
  | 'RESERVED'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'FAILED'
  | 'NEEDS_ATTENTION'
  | 'SKIPPED';

export type AutopilotSubmissionMethod =
  | 'OFFICIAL_ATS_ADAPTER'
  | 'DIRECT_API'
  | 'GUIDED_PORTAL';

export interface AutopilotEntitlement {
  userId: string;
  planId: string;
  monthlyLimit: number;
  unlimited: boolean;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  usageCount: number;
  reservedCount: number;
  remainingCount: number;
  entitlementSource: string;
  updatedAt: string;
}

export interface AutopilotAgentSettings {
  userId: string;
  operatingMode: AutopilotOperatingMode;
  automationActive: boolean;
  consentGiven: boolean;
  consentTimestamp: string | null;
  dailyLimit: number;
  minMatchScore: number;
  targetJobTitles: string[];
  targetLocations: string[];
  targetIndustries: string[];
  excludedEmployers: string[];
  preferredWorkArrangement: 'all' | 'remote' | 'hybrid' | 'onsite';
  minSalary: number;
  autoSubmitEligible: boolean;
  pauseOnScreening: boolean;
  defaultResumeId?: string | null;
}

export interface AutopilotJobItem {
  id: string;
  userId: string;
  vacancyId: string;
  jobTitle: string;
  company: string;
  location: string;
  country?: string;
  url: string;
  matchScore: number;
  eligibilityStatus: AutopilotEligibilityStatus;
  matchExplanation?: string;
  missingQualifications: string[];
  tailoredResumeId?: string;
  status: AutopilotJobStatus;
  submissionMethod: AutopilotSubmissionMethod;
  failureReason?: string;
  attentionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutopilotActivityLog {
  id: string;
  userId: string;
  agentName: string;
  action: string;
  relatedJobTitle?: string;
  relatedCompany?: string;
  result: 'SUCCESS' | 'INFO' | 'WARNING' | 'FAILED';
  durationMs: number;
  details?: string;
  timestamp: string;
}

export interface AutopilotDashboardSummary {
  entitlement: AutopilotEntitlement;
  settings: AutopilotAgentSettings;
  stats: {
    monthlyLimit: number;
    usedThisMonth: number;
    remainingQuota: number;
    inProgress: number;
    jobsDiscovered: number;
    eligibleJobs: number;
    jobsRejected: number;
    awaitingApproval: number;
    needsAttention: number;
    submittedCount: number;
    failedCount: number;
    successRate: number;
  };
  recentActivity: AutopilotActivityLog[];
}
