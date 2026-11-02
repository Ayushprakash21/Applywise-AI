export type WorkArrangement = 'remote' | 'hybrid' | 'onsite';

export type EmploymentType = 'full-time' | 'contract' | 'part-time' | 'internship';

export type OperatingMode = 'MODE_A_RESEARCH' | 'MODE_B_PREPARE_APPROVE' | 'MODE_C_AUTONOMOUS';

export type ApplicationStatus =
  | 'DISCOVERED'
  | 'VALIDATED'
  | 'MATCHED'
  | 'PREPARING'
  | 'NEEDS_REVIEW'
  | 'READY_TO_APPLY'
  | 'PREPARED'
  | 'RESUME_GENERATED'
  | 'APPLICATION_PREPARED'
  | 'AWAITING_APPROVAL'
  | 'AWAITING_USER_REVIEW'
  | 'REDIRECTED_TO_EMPLOYER'
  | 'AUTHORIZED_TO_SUBMIT'
  | 'SUBMISSION_IN_PROGRESS'
  | 'SUBMITTING'
  | 'SUBMISSION_ATTEMPTED'
  | 'SUBMISSION_CONFIRMED'
  | 'SUBMITTED'
  | 'SUBMITTED_CONFIRMED'
  | 'SUBMITTED_VERIFIED'
  | 'GUIDED_COMPLETION_REQUIRED'
  | 'CONFIRMATION_VERIFIED'
  | 'STATUS_UNKNOWN'
  | 'TRACKED'
  | 'INTERVIEW'
  | 'INTERVIEWING'
  | 'OFFER'
  | 'OFFER_RECEIVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'FAILED'
  | 'SUBMISSION_FAILED';

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  fieldOfStudy: string;
  graduationYear: string;
  gpa?: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuingOrg: string;
  issueYear: string;
  credentialId?: string;
}

export interface VerifiedSkill {
  name: string;
  category: 'frontend' | 'backend' | 'cloud' | 'ai' | 'database' | 'architecture' | 'leadership' | 'devops' | 'general';
  proficiency: 'expert' | 'proficient' | 'familiar';
  yearsExperience: number;
  verified: boolean;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  location: string;
  description: string;
  achievements: string[];
  verifiedSkillsUsed: string[];
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  workAuthorizationCountry?: string;
  workAuthorizationStatus?: string;
  workAuthorization?: string[];
  requiresVisaSponsorship?: boolean;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  totalExperienceYears: number;
  currentEmployer: string;
  currentTitle: string;
  noticePeriodDays?: number;
  earliestJoinDate?: string;
  professionalSummary: string;
  education: EducationItem[];
  certifications: CertificationItem[];
  skills: VerifiedSkill[];
  experiences: ExperienceItem[];
  languages?: string[];
  masterResumeFileName?: string;
  masterResumeLastUpdated?: string;
}

export interface CareerPreferences {
  targetRoles?: string[];
  targetCountries: string[];
  targetCities: string[];
  preferredTitles: string[];
  preferredIndustries: string[];
  workArrangement: WorkArrangement[];
  workArrangements?: WorkArrangement[];
  minSalaryUSD?: number;
  minSalaryByCurrency: Record<string, number>;
  preferredEmploymentType: EmploymentType[];
  willingnessToRelocate: 'yes' | 'no' | 'negotiable';
  visaSponsorshipRequired: boolean;
  requiresVisaSponsorship?: boolean;
  preferredCompanies: string[];
  excludedCompanies: string[];
  excludedKeywords: string[];
  minMatchThreshold?: number;
  maxDailyApplications?: number;
}

export interface ScoringWeights {
  skillsWeight: number; // default 30%
  experienceWeight: number; // default 25%
  qualificationsWeight: number; // default 15%
  seniorityWeight: number; // default 10%
  locationWeight: number; // default 10%
  salaryWeight: number; // default 10%
}

export interface JobMatchEvaluation {
  matchScore: number;
  breakdown: {
    skills: number;
    experience: number;
    qualifications: number;
    seniority?: number;
    location?: number;
    salary?: number;
    titleAlignment?: number;
    locationWorkAuth?: number;
    salaryPreferences?: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  eligibilityIssues: string[];
  missingRequirements?: string[];
  eligibilityConcerns?: string[];
  reasonsToConsider?: string[];
  dataQuality?: 'high' | 'moderate' | 'limited';
  dataQualityNotes?: string[];
  salaryCompatibility: 'compatible' | 'below_threshold' | 'unspecified' | 'negotiable';
  sponsorshipStatus: 'supported' | 'unsupported' | 'unspecified';
  recommendation: 'STRONG_APPLY' | 'CONSIDER' | 'MARGINAL' | 'DO_NOT_APPLY';
  evaluatedAt: string;
}

export interface JobVacancy {
  id: string;
  source: 'remotive' | 'jobicy' | 'arbeitnow' | 'direct_feed' | 'manual';
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  country: string;
  remote: boolean;
  arrangement: WorkArrangement;
  url: string;
  description: string;
  requirements: string[];
  tags: string[];
  publishedAt: string;
  deadline?: string;
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    raw?: string;
  };
  visaSponsorship?: 'supported' | 'not_supported' | 'unsupported' | 'unknown';
  retrievedAt: string;
  isActive: boolean;
  lastCheckedAt?: string;
  matchEvaluation?: JobMatchEvaluation;
}

export interface TailoredResumeContent {
  versionId?: string;
  generatedAt?: string;
  targetJobTitle?: string;
  targetCompany?: string;
  headline: string;
  professionalSummary: string;
  targetedSkills: string[];
  tailoredExperiences: Array<{
    company: string;
    role: string;
    period: string;
    bulletPoints: string[];
  }>;
  education: string[];
  certifications: string[];
  truthfulnessAuditPassed?: boolean;
  truthfulnessScore: number;
  auditNotes?: string[];
}

export interface ApplicationTimelineEvent {
  timestamp: string;
  stage: ApplicationStatus;
  note: string;
  actor: 'Agent autonomous' | 'User approved' | 'System scheduler' | 'User manual' | 'Security guard' | (string & {});
}

export interface SubmissionEvidence {
  confirmationNumber?: string;
  timestamp: string;
  channel: 'api' | 'assisted_browser' | 'direct_portal' | 'official_api' | 'guided_portal' | 'manual_verification';
  receiptText?: string;
  receiptDetails?: string;
  confirmationUrl?: string;
  verified: boolean;
  httpStatus?: number;
}

export interface ApplicationRecord {
  id: string;
  duplicateKey: string;
  vacancyId: string;
  company: string;
  role: string;
  country: string;
  location: string;
  jobUrl: string;
  url?: string;
  salaryRange?: string;
  matchScore: number;
  status: ApplicationStatus;
  resumeVersionId?: string;
  tailoredResume: TailoredResumeContent;
  coverLetter?: string;
  submissionEvidence?: SubmissionEvidence;
  guidedApplication?: {
    portalUrl: string;
    instructions: string[];
    prefilledFields: Record<string, string>;
  };
  requiresApprovalReason?: string;
  timeline: ApplicationTimelineEvent[];
  followUpDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationSettings {
  mode: OperatingMode;
  emergencyStop: boolean;
  autoApplyThreshold: number;
  dailyApplicationLimit: number;
  weeklyApplicationLimit?: number;
  autoApplyConsentConfirmed?: boolean;
  autoApplyConsentDate?: string;
  excludedCompanies?: string[];
  minMatchScoreThreshold?: number;
  assistedApplyOnly?: boolean;
  autoTailor?: boolean;
  autoApplyPreapproved?: boolean;
  applicationsSubmittedToday?: number;
  retryFailedSubmissions?: boolean;
  maxRetries?: number;
  scheduledSearchEnabled: boolean;
  scheduledSearchIntervalMinutes: number;
  scoringWeights: ScoringWeights;
  requireApprovalForLegalDeclarations: boolean;
  requireApprovalForRelocation: boolean;
  requireApprovalForVisaQuestions: boolean;
  requireApprovalForSalaryCommitments: boolean;
  lastScheduledRun?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: 'Agent autonomous' | 'User approved' | 'System scheduler' | 'User manual' | 'Security guard' | (string & {});
  action: string;
  target: string;
  details: string;
  severity: 'info' | 'warning' | 'security' | 'critical';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'match' | 'approval_needed' | 'submission_success' | 'submission_failed' | 'reminder' | 'system';
  read: boolean;
  timestamp: string;
  applicationId?: string;
  vacancyId?: string;
  meta?: Record<string, unknown>;
}

export interface SourceIntegrationStatus {
  id: string;
  name: string;
  description: string;
  type: 'public_api' | 'career_feed' | 'manual_ingest';
  status: 'active' | 'degraded' | 'offline';
  lastSyncAt: string;
  totalJobsFetched: number;
  rateLimitLimit: string;
}

// ============================================================================
// CAREER DIGITAL TWIN & APPLICATION INTEGRITY ENGINE
// ============================================================================

export type ProvenanceSource = 'user_confirmed' | 'resume_extracted' | 'ai_inferred' | 'external_verified';
export type VerificationConfidence = 'confirmed' | 'inferred' | 'unverified';

export interface ProvenanceMetadata {
  source: ProvenanceSource;
  confidence: VerificationConfidence;
  documentId?: string;
  extractedSection?: string;
  confirmedAt?: string;
  notes?: string;
}

export interface DigitalTwinSkill {
  id?: string;
  name: string;
  category: 'frontend' | 'backend' | 'cloud' | 'ai' | 'database' | 'architecture' | 'leadership' | 'devops' | 'business_ops' | 'supply_chain' | 'project_management' | 'general';
  proficiency: 'expert' | 'proficient' | 'familiar';
  yearsExperience: number;
  provenance: ProvenanceMetadata;
  transferableCategories?: string[];
}

export interface DigitalTwinExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  location: string;
  description: string;
  achievements: string[];
  skillsUsed: string[];
  provenance: ProvenanceMetadata;
}

export interface DigitalTwinProject {
  id: string;
  name: string;
  role: string;
  description: string;
  outcomes: string[];
  technologies: string[];
  url?: string;
  provenance: ProvenanceMetadata;
}

export interface TransferableSkillBridge {
  targetRoleCategory: string;
  relevanceScore: number;
  directSkills: string[];
  transferableSkills: string[];
  missingSkills: string[];
  rationale: string;
  recommendedAction: string;
}

export interface CareerDigitalTwin {
  userId: string;
  professionalSummary: string;
  summaryProvenance: ProvenanceMetadata;
  workExperiences: DigitalTwinExperience[];
  skillsInventory: DigitalTwinSkill[];
  education: Array<EducationItem & { provenance: ProvenanceMetadata }>;
  certifications: Array<CertificationItem & { provenance: ProvenanceMetadata }>;
  projects: DigitalTwinProject[];
  careerGoals: string[];
  learningObjectives: string[];
  transferableBridges: TransferableSkillBridge[];
  completenessScore: number;
  inferredPendingCount: number;
  unverifiedCount: number;
  updatedAt: string;
}

export interface ApplicationIntegrityReport {
  overallStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'BLOCKED' | 'UNKNOWN' | 'STALE';
  jobAvailabilityStatus: 'VERIFIED_ACTIVE' | 'CLOSED_OR_STALE' | 'UNKNOWN';
  jobSource: string;
  jobSourceVerifiedAt: string;
  destination: string;
  destinationTrustStatus: 'TRUSTED_OFFICIAL_ATS' | 'DIRECT_EMPLOYER_PORTAL' | 'UNVERIFIED_THIRD_PARTY';
  resumeIntegrity: {
    status: 'VERIFIED' | 'NEEDS_REVIEW' | 'BLOCKED';
    unsupportedClaims: Array<{ claim: string; context: string; reason: string; severity: 'critical' | 'warning' }>;
    metricsAudit: Array<{ metric: string; context: string; supportedInTwin: boolean }>;
    inventedSkills: string[];
    inventedCompanies: string[];
    truthfulnessScore: number;
  };
  coverLetterIntegrity: {
    status: 'VERIFIED' | 'NEEDS_REVIEW' | 'BLOCKED';
    unsupportedClaims: string[];
  };
  screeningAnswersIntegrity: {
    status: 'VERIFIED' | 'NEEDS_REVIEW' | 'BLOCKED';
    sensitiveQuestionsFlagged: string[];
    unansweredRequired: string[];
  };
  duplicateCheck: {
    isDuplicate: boolean;
    duplicateApplicationId?: string;
    reason?: string;
  };
  warnings: string[];
  requiredUserActions: string[];
  verifiedAt: string;
}

export interface ApplicationReceipt {
  id: string;
  userId: string;
  applicationId: string;
  vacancyId: string;
  company: string;
  role: string;
  jobSource: string;
  destinationUrl: string;
  submissionStatus: ApplicationStatus;
  confirmationReference?: string;
  resumeVersionId?: string;
  coverLetterVersionId?: string;
  tailoredResumeSnapshot?: TailoredResumeContent;
  coverLetterSnapshot?: string;
  userConfirmedAnswers?: Record<string, string>;
  integrityReport: ApplicationIntegrityReport;
  timeline: ApplicationTimelineEvent[];
  createdAt: string;
}

export interface CareerOutcomeItem {
  id: string;
  userId: string;
  applicationId?: string;
  company: string;
  role: string;
  outcomeType: 'APPLICATION_SUBMITTED' | 'RECRUITER_CONTACTED' | 'INTERVIEW_INVITATION' | 'INTERVIEW_COMPLETED' | 'REJECTION_RECEIVED' | 'OFFER_RECEIVED' | 'WITHDRAWN';
  outcomeSource: 'user_reported' | 'system_verified';
  notes?: string;
  recordedAt: string;
}
