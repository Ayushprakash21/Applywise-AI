/**
 * APPLYVISE CAREER ATLAS 2.0 — DOMAIN TYPES & DATA SCHEMAS
 * Complete AI-Powered Career Intelligence, Transition & Development Platform
 */

export type CareerPathCategory =
  | 'vertical'
  | 'adjacent'
  | 'cross_functional'
  | 'management'
  | 'specialist'
  | 'industry'
  | 'executive';

export type CareerPathReadiness =
  | 'ready_now'
  | 'achievable_prep'
  | 'long_term'
  | 'not_recommended';

export type EvidenceLevel =
  | 'strong'
  | 'partial'
  | 'missing'
  | 'candidate_confirmation_required';

export type SkillImportance =
  | 'essential'
  | 'important'
  | 'supporting'
  | 'preferred'
  | 'optional_differentiator';

export type MilestoneHorizon =
  | '30_day'
  | '90_day'
  | '6_month'
  | '12_month';

export type MilestoneStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'blocked';

export interface CareerPathRecommendation {
  id: string;
  targetRole: string;
  category: CareerPathCategory;
  categoryLabel: string;
  roleDescription: string;
  whyRelevant: string;
  readinessStatus: CareerPathReadiness;
  alignmentScore: number;
  transitionDifficulty: 'Low' | 'Moderate' | 'High';
  estimatedEffortMonths: number;
  requiredExperienceYears: number;
  transferableSkills: string[];
  matchingSkills: string[];
  missingSkills: string[];
  requiredQualifications: string[];
  experienceRequirements: string[];
  marketDemandEvidence: string;
  relevantLiveVacanciesCount: number;
  salaryBenchmark?: {
    min: number;
    max: number;
    median: number;
    currency: string;
    isDisclosed: boolean;
    sampleSize: number;
    source: string;
  };
  recommendedNextSteps: string[];
  isSaved?: boolean;
}

export interface CompetencyEvidence {
  skill: string;
  importance: SkillImportance;
  candidateEvidence: string;
  targetRequirement: string;
  evidenceLevel: EvidenceLevel;
  gapLevel: 'None' | 'Minor' | 'Moderate' | 'Significant';
  whyItMatters: string;
  learningApproach: string;
  practicalAssignment: string;
  recommendedProject: string;
  certifications: Array<{
    name: string;
    provider: string;
    url?: string;
    isFree: boolean;
    duration?: string;
  }>;
  evidenceNeeded: string;
  isConfirmedByCandidate?: boolean;
}

export interface CareerTransitionAssessment {
  id: string;
  targetRole: string;
  roleCategory: CareerPathCategory;
  overallReadinessScore: number;
  readinessExplanation: {
    whatIsMeasured: string;
    dataUsed: string[];
    supportingEvidence: string[];
    missingEvidence: string[];
    howToImprove: string[];
  };
  matchingCompetencies: CompetencyEvidence[];
  transferableCompetencies: Array<{
    skill: string;
    sourceContext: string;
    applicationInTarget: string;
  }>;
  missingCompetencies: CompetencyEvidence[];
  missingQualifications: Array<{
    qualification: string;
    isMandatory: boolean;
    rationale: string;
  }>;
  missingExperienceAreas: Array<{
    area: string;
    yearsRequired: number;
    candidateYears: number;
    gapDescription: string;
  }>;
  candidateConfirmationsRequired: Array<{
    id: string;
    area: string;
    prompt: string;
    isConfirmed: boolean;
  }>;
}

export interface CareerMilestone {
  id: string;
  roadmapId: string;
  horizon: MilestoneHorizon;
  title: string;
  objective: string;
  reason: string;
  competency: string;
  requiredActivity: string;
  learningResources: Array<{
    title: string;
    provider: string;
    url?: string;
    isFree: boolean;
    type: 'course' | 'certification' | 'project' | 'documentation';
  }>;
  estimatedHours: number;
  priority: 'high' | 'medium' | 'low';
  targetCompletionDate: string;
  dependencies: string[];
  completionCriteria: string;
  status: MilestoneStatus;
  progressPercent: number;
  candidateNotes?: string;
  evidenceAttachment?: {
    fileName: string;
    attachedAt: string;
    credentialUrl?: string;
  };
  completedAt?: string;
}

export interface CareerRoadmapPlan {
  id: string;
  targetRole: string;
  generatedAt: string;
  weeklyHoursCommitted: number;
  milestones: CareerMilestone[];
  progressSummary: {
    totalMilestones: number;
    completedMilestones: number;
    inProgressMilestones: number;
    hoursLogged: number;
    totalEstimatedHours: number;
  };
}

export interface CareerMarketSnapshot {
  targetRole: string;
  activeMatchingVacancies: number;
  topHiringCompanies: string[];
  geographicDistribution: Array<{
    location: string;
    count: number;
    isRemote: boolean;
  }>;
  remotePercentage: number;
  commonExperienceYears: number;
  salaryIntelligence: {
    currency: string;
    country: string;
    location: string;
    sampleSize: number;
    source: string;
    dataFreshness: string;
    min: number;
    median: number;
    max: number;
    isDisclosed: boolean;
    statusNote: string;
  };
  requiredSkillFrequencies: Array<{
    skill: string;
    percentage: number;
  }>;
  qualificationPatterns: string[];
  hiringTrends: string;
}

export interface CareerLearningResource {
  id: string;
  title: string;
  provider: string;
  type: 'certification' | 'course' | 'degree' | 'training' | 'project' | 'documentation';
  skillAddressed: string;
  whyRelevant: string;
  officialUrl?: string;
  isFree: boolean;
  costEstimate?: string;
  durationEstimate?: string;
  prerequisites: string[];
  expectedLearningOutcome: string;
  isRecognizedIndustryCredential: boolean;
  tierPriority: 1 | 2 | 3 | 4; // 1: Free, 2: Low-cost, 3: Professional Cert, 4: Advanced
  saved: boolean;
  status: 'saved' | 'enrolled' | 'completed';
}

export interface CareerScenarioConfig {
  id: string;
  scenarioName: string;
  targetRole: string;
  targetCountry: string;
  remoteOnly: boolean;
  careerPriority: 'salary' | 'stability' | 'management' | 'specialization';
  weeklyLearningHours: number;
  hypotheticalSkillsAdded: string[];
  hypotheticalQualificationsAdded: string[];
}

export interface CareerScenarioResult {
  config: CareerScenarioConfig;
  projectedSkillAlignment: number;
  projectedExperienceAlignment: number;
  qualificationGapCount: number;
  projectedTransitionMonths: number;
  marketOpportunityCount: number;
  geographicCompatibilityScore: number;
  workArrangementCompatibilityScore: number;
  overallScenarioFeasibilityScore: number;
  explanation: string;
}

export interface OpportunityMappingItem {
  id: string;
  jobId: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  salaryFormatted?: string;
  applicationUrl: string;
  opportunityTier: 'target_now' | 'requires_prep' | 'aspirational';
  matchScore: number;
  matchReasons: string[];
  missingRequirements: string[];
  transferableExperienceEvidence: string[];
  isSaved: boolean;
  isInApplicationControl: boolean;
}

export interface CareerProgressEvent {
  id: string;
  userId: string;
  type:
    | 'milestone_completed'
    | 'skill_verified'
    | 'certification_earned'
    | 'project_finished'
    | 'resume_improved'
    | 'application_submitted'
    | 'readiness_improved';
  title: string;
  description: string;
  timestamp: string;
  evidenceUrl?: string;
  impactScoreBonus?: number;
}

export interface CareerGoal {
  id: string;
  userId: string;
  targetRole: string;
  targetDate: string;
  status: 'active' | 'paused' | 'achieved' | 'archived';
  initialReadinessScore: number;
  currentReadinessScore: number;
  milestonesCompleted: number;
  totalMilestones: number;
  createdAt: string;
  updatedAt: string;
}

export interface CareerAtlasOverviewData {
  currentProfile: {
    fullName: string;
    verifiedCurrentTitle: string;
    employmentHistorySummary: Array<{
      title: string;
      company: string;
      period: string;
      durationYears: number;
    }>;
    totalVerifiedExperienceYears: number;
    verifiedSkillsCount: number;
    verifiedSkillNames: string[];
    coreStrengths: string[];
    transferableCompetencies: string[];
  };
  recommendedNextMove: {
    targetRole: string;
    categoryLabel: string;
    alignmentScore: number;
    readinessStatus: CareerPathReadiness;
    rationale: string;
  } | null;
  activeGoals: CareerGoal[];
  topCareerPaths: CareerPathRecommendation[];
  readinessAssessment: {
    targetRole: string;
    score: number;
    whatIsMeasured: string;
    dataUsed: string[];
    evidenceSummary: string[];
    missingSummary: string[];
    nextAction: string;
  };
  prioritySkillGaps: Array<{
    skill: string;
    importance: SkillImportance;
    gapDescription: string;
  }>;
  nextRoadmapMilestones: CareerMilestone[];
  relevantLiveOpportunities: OpportunityMappingItem[];
  recentProgressEvents: CareerProgressEvent[];
}

export interface CareerAtlasAdminDiagnostics {
  serviceStatus: 'operational' | 'degraded' | 'maintenance';
  marketDataFreshness: string;
  activeCareerGoalsCount: number;
  totalRoadmapsGenerated: number;
  totalMilestonesCompleted: number;
  averageRecommendationLatencyMs: number;
  aiProviderHealth: 'connected' | 'fallback_deterministic';
  learningResourceSourcesHealthy: boolean;
}
