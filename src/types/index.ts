export type WorkArrangement = 'remote' | 'hybrid' | 'onsite';

export type EmploymentType = 'full-time' | 'contract' | 'part-time' | 'internship';

export type OperatingMode = 'MODE_A_RESEARCH' | 'MODE_B_PREPARE_APPROVE' | 'MODE_C_AUTONOMOUS';

export type ApplicationStatus =
  // 12 Canonical Career Experience Stages
  | 'OPPORTUNITY_SELECTED'
  | 'SUITABILITY_REVIEWED'
  | 'RESUME_PREPARED'
  | 'RECRUITER_REVIEW_COMPLETED'
  | 'APPLICATION_READY'
  | 'READY_TO_SUBMIT'
  | 'AWAITING_USER_APPROVAL'
  | 'AWAITING_USER_REVIEW'
  | 'SUBMISSION_IN_PROGRESS'
  | 'SUBMITTED_CONFIRMED'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN'
  // Legacy & Workflow Aliases for Backward Compatibility
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
  id?: string;
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  graduationYear: string;
  year?: string;
  gpa?: string;
}

export interface CertificationItem {
  id?: string;
  name: string;
  issuingOrg: string;
  issuer?: string;
  issueYear?: string;
  year?: string;
  credentialId?: string;
}

export interface VerifiedSkill {
  name: string;
  category?: 'frontend' | 'backend' | 'cloud' | 'ai' | 'database' | 'architecture' | 'leadership' | 'devops' | 'general' | (string & {});
  proficiency?: 'expert' | 'proficient' | 'familiar' | 'advanced' | 'intermediate' | (string & {});
  level?: string;
  yearsExperience?: number;
  verified?: boolean;
}

export interface ExperienceItem {
  id?: string;
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  location?: string;
  description?: string;
  achievements?: string[];
  verifiedSkillsUsed?: string[];
  isDateUncertain?: boolean;
  duration?: string;
  dateWarning?: string;
  originalDateText?: string;
  confidence?: number;
  needsVerification?: boolean;
  sourceText?: string;
  employmentType?: string | null;
}

export type EmploymentRecord = ExperienceItem;

export interface OpportunitySignal {
  id: string;
  company: string;
  signalType: 'expansion' | 'office_opening' | 'public_hiring' | 'industry_growth' | 'department_launch';
  headline: string;
  sourceName: string;
  sourceUrl: string;
  publishedDate: string;
  location: string;
  relevanceExplanation: string;
  hasVerifiedVacancy: boolean;
  linkedVacancyId?: string;
}

export interface InterviewMockSession {
  id: string;
  userId: string;
  jobId?: string;
  roleTitle: string;
  companyName: string;
  interviewType: 'behavioral' | 'technical' | 'situational' | 'leadership' | 'hr';
  questions: Array<{ id: string; question: string; category: string; expectedPoints?: string[] }>;
  answers: Array<{ questionId: string; answerText: string; timeSpentSeconds?: number; timestamp: string }>;
  feedback: {
    relevanceScore?: number;
    structureScore?: number;
    clarityScore?: number;
    specificityScore?: number;
    evidenceScore?: number;
    overallFeedback?: string;
    rubricNotes?: string[];
  };
  improvementAreas: string[];
  overallScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationDimension {
  score: number;
  maxScore: number;
  explanation: string;
}

export interface StructureDimension extends EvaluationDimension {
  maxScore: 25;
  missingStarElements: string[];
}

export interface EvidenceDimension extends EvaluationDimension {
  maxScore: 30;
  verifiedClaims: string[];
  unsupportedClaims: string[];
}

export interface InterviewEvaluationOutput {
  overallScore: number;
  relevance: EvaluationDimension & { maxScore: 25 };
  structure: StructureDimension;
  clarity: EvaluationDimension & { maxScore: 20 };
  evidence: EvidenceDimension;
  strengths: string[];
  improvementOpportunities: string[];
  evaluationConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evaluationStatus: 'COMPLETED' | 'UNAVAILABLE' | 'FAILED';
  timestamp: string;
  modelUsed: string;
  error?: string;
}

export interface RecruiterReviewAudit {
  id: string;
  userId: string;
  applicationId: string;
  roleAlignmentScore: number;
  reviewCategories: Record<string, { score: number; status: 'strong' | 'adequate' | 'gap'; notes: string }>;
  evidenceClassification: {
    verifiedEvidence: string[];
    indirectEvidence: string[];
    notEstablished: string[];
  };
  strongestPoints: string[];
  potentialConcerns: string[];
  missingMandatoryRequirements: string[];
  resumeImprovements: string[];
  clarificationQuestions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CareerTrajectory {
  id: string;
  userId: string;
  trajectoryTitle: string;
  targetRole: string;
  currentAlignmentScore: number;
  transferableSkills: string[];
  missingSkills: string[];
  requiredExperienceYears: number;
  recommendedCertifications: string[];
  learningPath: Array<{ step: number; title: string; estimatedHours: number; rationale: string; isCompleted: boolean }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FactCategory =
  | 'identity' | 'IDENTITY'
  | 'employment' | 'EMPLOYMENT'
  | 'skill' | 'SKILL'
  | 'achievement' | 'ACHIEVEMENT'
  | 'education' | 'EDUCATION'
  | 'certification' | 'CERTIFICATION'
  | 'location' | 'LOCATION'
  | 'contact' | 'CONTACT'
  | 'title' | 'TITLE'
  | 'email' | 'EMAIL';

export type FactVerificationStatus =
  | 'EXTRACTED'
  | 'NEEDS_VERIFICATION'
  | 'USER_CONFIRMED'
  | 'USER_CORRECTED';

export interface CandidateFact {
  id: string;
  userId: string;
  category: FactCategory;
  field: string;
  value: string;
  originalSource: 'resume_upload' | 'user_input' | 'job_application' | 'system_verification';
  sourceDocumentId?: string;
  evidenceText?: string;
  evidenceLocation?: string;
  verificationStatus: FactVerificationStatus;
  confidence: number;
  lastUpdated: string;
  metadata?: Record<string, unknown>;
}

export interface ProfileEvidenceItem {
  id: string;
  requirement: string;
  category: 'mandatory' | 'preferred';
  candidateEvidence: string;
  source: string;
  status: 'SUPPORTED' | 'TRANSFERABLE' | 'UNVERIFIED' | 'NOT_FOUND';
  assessment: string;
  confidence: number;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  photoUrl?: string | null;
  avatarUrl?: string | null;
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
  candidateFacts?: CandidateFact[];
  employmentHistory?: ExperienceItem[];
  summary?: string;
}

export interface CareerPreferences {
  targetRoles?: string[];
  targetLocations?: string[];
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
  educationWeight?: number;
  certificationsWeight?: number;
  industryWeight?: number;
  locationWorkAuthWeight?: number;
}

export type OpportunityAlignmentTier =
  | 'STRONG_ALIGNMENT'
  | 'GOOD_ALIGNMENT_WITH_GAPS'
  | 'STRETCH_OPPORTUNITY'
  | 'LOW_ALIGNMENT';

export interface HonestAssessment {
  alignmentTier: OpportunityAlignmentTier;
  summary: string;
  whatMakesYouRelevant: string[];
  whatMayReduceCompetitiveness: string[];
  whatYouShouldImprove: string[];
  questionsToClarifyBeforeApplying: string[];
  unverifiedInformation: string[];
  disclaimer: string;
}

export interface JobMatchEvaluation {
  matchScore: number;
  alignmentTier?: OpportunityAlignmentTier;
  honestAssessment?: HonestAssessment;
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
    industry?: number;
    certifications?: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  essentialRequirementsMatched?: string[];
  preferredRequirementsMatched?: string[];
  missingEssentialRequirements?: string[];
  missingPreferredRequirements?: string[];
  relevantExperienceYears?: number;
  requiredExperienceYears?: number;
  potentialConcerns?: string[];
  unverifiedInformation?: string[];
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
  insufficientData?: boolean;
  scoreMessage?: string;
  profileEvidence?: ProfileEvidenceItem[];
  transferableSkills?: string[];
  mandatoryRequirements?: string[];
  preferredRequirements?: string[];
  unverifiedQualifications?: string[];
  jobId?: string;
  skillScore?: number;
  titleScore?: number;
  locationScore?: number;
  salaryScore?: number;
  matchedCompetencies?: string[];
  missingMandatory?: string[];
  missingPreferred?: string[];
  fitVerdict?: 'strong' | 'moderate' | 'weak';
  recommendations?: string[];
}

// ============================================================================
// FIT EVIDENCE MAP (SIGNATURE FEATURE)
// ============================================================================

export type EvidenceConfidence =
  | 'VERIFIED_EVIDENCE'
  | 'INFERRED_RELEVANCE'
  | 'USER_CONFIRMED'
  | 'MISSING_EVIDENCE';

export interface FitEvidenceNode {
  id: string;
  requirement: string;
  category: 'essential_skill' | 'preferred_skill' | 'experience' | 'education' | 'certification' | 'responsibility' | 'domain';
  candidateEvidence?: string;
  sourceType: 'resume_parsed' | 'user_profile' | 'certification_record' | 'none';
  sourceReference?: string;
  skillGap?: string;
  confidence: EvidenceConfidence;
  assessmentNotes: string;
  isUserConfirmed?: boolean;
}

export interface FitEvidenceMap {
  jobId: string;
  userId: string;
  overallConfidence: 'high' | 'medium' | 'low';
  nodes: FitEvidenceNode[];
  totalRequirements: number;
  verifiedCount: number;
  inferredCount: number;
  userConfirmedCount: number;
  missingCount: number;
  evaluatedAt: string;
  modelVersion?: string;
}

// ============================================================================
// RESUME INTELLIGENCE & ATS BENCHMARKING
// ============================================================================

export interface ResumeIssue {
  type: 'missing_info' | 'inconsistent_dates' | 'duplicate_experience' | 'unsupported_claim' | 'formatting_issue';
  severity: 'critical' | 'warning' | 'suggestion';
  field?: string;
  description: string;
  recommendation: string;
  requiresUserConfirmation: boolean;
}

export interface ResumeToJobComparison {
  jobId: string;
  existingRelevantContent: string[];
  missingRelevantKeywords: string[];
  skillsRequiringClarification: string[];
  suggestionsToImproveRelevance: string[];
  atsReadability: {
    parserCompatibility: 'high' | 'moderate' | 'limited';
    structuralFeedback: string[];
    unsupportedFormatsDetected: string[];
    methodologyExplanation: string;
  };
}

export interface ResumeIntelligenceReport {
  extracted: {
    employmentHistory: any[];
    skills: string[];
    education: any[];
    certifications: string[];
    achievements: string[];
    toolsAndTechnologies: string[];
  };
  issues: ResumeIssue[];
  comparisonsByJobId?: Record<string, ResumeToJobComparison>;
  analyzedAt: string;
}

// ============================================================================
// APPLICATION READINESS STUDIO
// ============================================================================

export interface ReadinessChecklistItem {
  id: string;
  category: 'resume_relevance' | 'required_qualifications' | 'location_suitability' | 'salary_suitability' | 'work_authorization' | 'required_documents' | 'missing_information';
  label: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
  actionableStep?: string;
}

export interface ApplicationReadinessAssessment {
  jobId: string;
  status: 'READY_TO_APPLY' | 'REVIEW_FIRST';
  overallSummary: string;
  items: ReadinessChecklistItem[];
  questionsToAskEmployer: string[];
  evaluatedAt: string;
}

// ============================================================================
// APPLICATION COPILOT ARTIFACTS
// ============================================================================

export interface CopilotJobArtifacts {
  jobId: string;
  tailoredResumeVersion?: {
    headline: string;
    professionalSummary: string;
    highlightedExperiences: Array<{
      company: string;
      role: string;
      bulletPoints: string[];
    }>;
    verifiedSkillsOnly: string[];
  };
  coverLetter?: {
    salutation: string;
    opening: string;
    bodyParagraphs: string[];
    callToAction: string;
    closing: string;
  };
  recruiterMessage?: {
    platform: 'linkedin' | 'email';
    subject?: string;
    message: string;
  };
  applicationAnswers?: Array<{
    question: string;
    draftAnswer: string;
    basedOnEvidence: string[];
  }>;
  skillsGapImprovementPlan?: {
    targetSkills: string[];
    learningPath: Array<{
      skill: string;
      suggestedAction: string;
      estimatedHours: number;
      priority: 'high' | 'medium' | 'low';
    }>;
  };
  userReviewed: boolean;
  reviewedAt?: string;
}

// ============================================================================
// INTERVIEW INTELLIGENCE
// ============================================================================

export interface StarQuestion {
  question: string;
  category: 'competency' | 'role_specific' | 'technical_functional' | 'situational';
  starFramework: {
    situationGuidance: string;
    taskGuidance: string;
    actionGuidance: string;
    resultGuidance: string;
  };
  candidateRelevantExperienceRef?: string;
  skillGapsAddressed?: string[];
}

export interface InterviewIntelligenceReport {
  jobId: string;
  competencyAreas: string[];
  roleSpecificQuestions: StarQuestion[];
  technicalFunctionalQuestions: StarQuestion[];
  questionsToAskEmployer: string[];
  qualityRubricFeedback: {
    clarityAdvice: string;
    evidenceGroundingAdvice: string;
    humilityAndTransparencyAdvice: string;
  };
  disclaimer: string;
  generatedAt: string;
}

// ============================================================================
// CAREER IMPROVEMENT ROADMAP
// ============================================================================

export interface CareerRoadmapItem {
  id: string;
  skill: string;
  isEssential: boolean;
  learningEffort: 'low' | 'moderate' | 'high';
  relevanceScore: number;
  recommendedAction: string;
  realisticCoursesOrProjects: Array<{
    title: string;
    type: 'course' | 'hands_on_project' | 'open_source_contribution' | 'practice_task';
    description: string;
    estimatedTime: string;
  }>;
}

export interface CareerRoadmap {
  userId: string;
  targetRole: string;
  prioritizedGaps: CareerRoadmapItem[];
  updatedAt: string;
}

// ============================================================================
// JOB ALERTS & APPLICATION ACTIVITIES
// ============================================================================

export interface JobAlertRule {
  id: string;
  userId: string;
  title: string;
  criteria: {
    keywords?: string[];
    locations?: string[];
    remoteOnly?: boolean;
    minSalary?: number;
    experienceLevels?: string[];
  };
  frequency: 'instant' | 'daily' | 'weekly';
  isActive: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface ApplicationActivityEvent {
  id: string;
  applicationId: string;
  stage: ApplicationStatus;
  note: string;
  actor: 'user' | 'system' | 'recruiter';
  timestamp: string;
  followUpDate?: string;
  recruiterContact?: string;
  notes?: string;
}

export type JobImportExtractionMethod = 'json_ld' | 'open_graph' | 'adapter' | 'html_heuristic' | 'ai_assisted' | 'manual';
export type JobImportExtractionStatus = 'verified_source' | 'extracted_review_recommended' | 'partially_extracted' | 'manual_entry';

export interface ExtractedJobData {
  title: string | null;
  company: string | null;
  companyWebsite?: string | null;
  companyLogo?: string | null;
  location: string | null;
  country: string | null;
  employmentType?: string | null;
  workplaceType?: 'Remote' | 'Hybrid' | 'On-site' | 'Unspecified' | null;
  salaryRange?: {
    min?: number | null;
    max?: number | null;
    currency?: string | null;
    raw?: string | null;
  } | null;
  minExperienceYears?: number | null;
  maxExperienceYears?: number | null;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  qualifications: string[];
  educationRequirements: string[];
  description: string | null;
  deadline?: string | null;
  originalUrl: string;
  sourceDomain: string;
  sourcePublishedDate?: string | null;
  extractionTimestamp: string;
  extractionMethod: JobImportExtractionMethod;
  extractionConfidence: number;
  extractionStatus: JobImportExtractionStatus;
  notes?: string[];
  unavailableFields: string[];
  reviewRecommendedFields: string[];
}

export interface UserImportedJobRecord {
  id: string;
  userId: string;
  vacancyId: string;
  originalUrl: string;
  canonicalUrl: string;
  sourceDomain: string;
  extractionStatus: JobImportExtractionStatus;
  extractionMethod: JobImportExtractionMethod;
  extractionConfidence: number;
  extractedData: ExtractedJobData;
  candidateEdits?: Partial<ExtractedJobData>;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface JobImportExtractRequest {
  url: string;
}

export interface JobImportExtractResponse {
  success: boolean;
  blocked?: boolean;
  error?: string;
  code?: string;
  extractedData?: ExtractedJobData;
  isDuplicate?: boolean;
  existingVacancy?: JobVacancy;
  manualFallbackAvailable?: boolean;
}

export interface JobImportSaveRequest {
  extractedData: ExtractedJobData;
  candidateEdits?: Partial<ExtractedJobData>;
  applyDirectly?: boolean;
}

export interface JobImportSaveResponse {
  success: boolean;
  error?: string;
  vacancy?: JobVacancy;
  importedRecord?: UserImportedJobRecord;
  applicationId?: string;
}

export interface JobVacancy {
  id: string;
  source: 'remotive' | 'jobicy' | 'arbeitnow' | 'direct_feed' | 'manual' | 'imported';
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  country: string;
  remote: boolean;
  arrangement: WorkArrangement;
  employmentType?: string;
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
  mandatoryRequirements?: string[];
  preferredRequirements?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
  workArrangement?: WorkArrangement | string;
  sourceUrl?: string;
  postedDate?: string;
  importedByUserId?: string;
  importedProvenance?: {
    originalUrl: string;
    sourceDomain: string;
    extractionStatus: JobImportExtractionStatus;
    extractionMethod: JobImportExtractionMethod;
    extractionConfidence: number;
    importedAt: string;
  };
}

export interface TailoredResumeContent {
  versionId?: string;
  generatedAt?: string;
  targetJobTitle?: string;
  targetCompany?: string;
  headline?: string;
  professionalSummary?: string;
  targetedSkills?: string[];
  tailoredExperiences?: Array<{
    company: string;
    role: string;
    period: string;
    bulletPoints: string[];
  }>;
  education?: string[];
  certifications?: string[];
  truthfulnessAuditPassed?: boolean;
  truthfulnessScore?: number;
  auditNotes?: string[];
  summary?: string;
  tailoredBullets?: string[];
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
  startDate?: string;
  endDate?: string;
  current?: boolean;
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

export interface AccountUsageStats {
  planId: 'free' | 'pro' | 'black';
  isPermanentAccess: boolean;
  resumes: {
    active: number;
    max: number | null;
    canUploadNew: boolean;
    canReplace: boolean;
  };
  applications: {
    distinctCount: number;
    max: number | null;
    canCreateNew: boolean;
    remaining: number | null;
  };
  aiCopilot: {
    tier: 'standard' | 'unlimited' | 'elite';
    isUnlimited: boolean;
  };
}


export interface FounderProfile {
  id?: string;
  name: string;
  designation: string;
  subtitle: string;
  companyName: string;
  shortBio: string;
  bioParagraphs: string[];
  missionStatement: string;
  quote: string;
  quoteAuthor: string;
  expertiseTags: string[];
  linkedinUrl: string;
  storyUrl: string;
  photoUrl?: string | null;
  photoAssetId?: string | null;
  photoAspectRatio?: string;
  isPublished?: boolean;
  publishedAt?: string | null;
  updatedAt?: string;
}

// ============================================================================
// ADMIN RESUME MANAGEMENT & EXTRACTION TYPES
// ============================================================================

export type ResumeExtractionStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SCANNED' | 'PENDING';
export type ResumeExtractionMethod = 'GEMINI' | 'HEURISTIC' | 'OCR' | 'NONE';

export interface ResumeDocument {
  id: string;
  userId: string;
  userEmail?: string;
  userFullName?: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | string;
  fileSizeBytes: number;
  extractedText: string;
  isScanned: boolean;
  storageKey?: string | null;
  fileHash?: string | null;
  mimeType?: string;
  pageCount?: number;
  extractionStatus: ResumeExtractionStatus;
  extractionMethod: ResumeExtractionMethod;
  parserModel?: string;
  errorMessage?: string;
  warnings?: string[];
  processingDurationMs?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ResumeExtractionRun {
  id: string;
  resumeId: string;
  userId: string;
  runType: 'INITIAL_UPLOAD' | 'ADMIN_REPROCESS' | 'AUTOMATED_RETRY';
  status: ResumeExtractionStatus;
  extractionMethod: ResumeExtractionMethod;
  parserModel?: string;
  structuredOutput?: UserProfile | null;
  diagnostics?: Record<string, any>;
  errorMessage?: string;
  warnings?: string[];
  durationMs: number;
  createdAt: string;
}

export interface ResumeExtractionVersion {
  id: string;
  resumeId: string;
  userId: string;
  versionNumber: number;
  data: UserProfile;
  diffSummary?: Record<string, any>;
  createdBy: string;
  createdAt: string;
}

export interface ResumeExtractionEvent {
  id: string;
  resumeId: string;
  adminId: string;
  adminEmail: string;
  eventType:
    | 'VIEW_METADATA'
    | 'VIEW_TEXT'
    | 'VIEW_EXTRACTION'
    | 'REPROCESS_TRIGGERED'
    | 'REPROCESS_COMPLETED'
    | 'REPROCESS_FAILED';
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface AdminResumesSummary {
  total: number;
  successCount: number;
  partialCount: number;
  failedCount: number;
  scannedCount: number;
  pendingCount: number;
}

export interface AdminResumesResponse {
  success: boolean;
  resumes: ResumeDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: AdminResumesSummary;
}

export interface StructuredExtractionOutput {
  method: 'GEMINI' | 'HEURISTIC';
  parserModel: string;
  status: ResumeExtractionStatus;
  extractedFields: UserProfile;
  warnings: string[];
  validationErrors: string[];
  processingDurationMs: number;
  fallbackReason?: string;
  diagnostics: {
    pageCount?: number;
    textLength: number;
    skillsExtractedCount: number;
    experienceEntriesCount: number;
    educationEntriesCount: number;
    isDateUncertain: boolean;
  };
}

// ============================================================================
// ADMIN USER PROVISIONING & MEMBERSHIP MANAGEMENT
// ============================================================================

export type MembershipPlanId = 'free' | 'pro' | 'black';
export type MembershipValidityType = '6_months' | '12_months' | '24_months' | 'lifetime';
export type MembershipStatus =
  | 'active'
  | 'scheduled'
  | 'expiring_soon'
  | 'expired'
  | 'suspended'
  | 'revoked'
  | 'lifetime';
export type MembershipSource = 'ADMIN_GRANT' | 'PAYMENT' | 'PROMOTIONAL' | 'SYSTEM';

export interface MembershipGrant {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  plan: MembershipPlanId;
  validityType: MembershipValidityType;
  membershipSource: MembershipSource;
  startsAt: string;
  expiresAt: string | null;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
  derivedStatus: MembershipStatus;
  remainingDays: number | null;
  grantedBy: string;
  grantedByEmail?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipSummaryMetrics {
  totalRegisteredUsers: number;
  freeUsers: number;
  proMembers: number;
  blackEliteMembers: number;
  activeMemberships: number;
  lifetimeMembers: number;
  expiringWithin30Days: number;
  expiredMemberships: number;
}

export interface AdminProvisionUserRequest {
  fullName: string;
  email: string;
  plan: MembershipPlanId;
  validity: MembershipValidityType;
  accountStatus?: string;
  notes?: string;
}

export interface AdminProvisionUserResponse {
  success: boolean;
  isNewUser: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  grant: MembershipGrant;
  invitationStatus: string;
  invitationUrl?: string;
  message: string;
}

export interface AdminAssignMembershipRequest {
  plan: MembershipPlanId;
  validity: MembershipValidityType;
  notes?: string;
  confirmOverridePaid?: boolean;
}

export interface AdminExtendMembershipRequest {
  validity: MembershipValidityType;
  notes?: string;
}

export interface AdminUpdateMembershipStatusRequest {
  status: 'active' | 'suspended' | 'revoked';
  notes?: string;
}

export interface MembershipHistoryItem {
  id: string;
  userId: string;
  action: string;
  actor: string;
  details: Record<string, any>;
  timestamp: string;
}

// ============================================================================
// GLOBAL CAREER DISCOVERY ENGINE (GCDE) TYPES
// ============================================================================

export type AtsProviderType =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workable'
  | 'smartrecruiters'
  | 'recruitee'
  | 'remotive'
  | 'arbeitnow'
  | 'jobicy'
  | 'custom_web';

export type JobSourceCategory =
  | 'official_careers'
  | 'ats_boards'
  | 'general_portals'
  | 'regional_boards'
  | 'gov_portals'
  | 'public_feeds'
  | 'partner_apis'
  | 'user_imported';

export type JobSourcePermission = 'authorized' | 'public_feed' | 'linking_only' | 'partner_agreement';

export type JobSourceHealth = 'healthy' | 'empty' | 'degraded' | 'rate_limited' | 'offline';

export type JobLifecycleStatus =
  | 'DISCOVERED'
  | 'ACTIVE'
  | 'UPDATED'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'REMOVED'
  | 'SOURCE_UNAVAILABLE'
  | 'UNDER_REVIEW';

export interface CompanyDirectoryItem {
  id: string;
  name: string;
  domain: string;
  careersUrl: string;
  country: string;
  region: 'north_america' | 'europe' | 'asia_pacific' | 'middle_east' | 'africa' | 'global';
  industry: string;
  companySize?: string;
  detectedAts: AtsProviderType;
  publicBoardToken?: string;
  publicEndpoint?: string;
  discoverySource: 'admin_curated' | 'sitemap' | 'public_directory' | 'ats_registry' | 'candidate_import';
  verificationStatus: 'verified' | 'pending' | 'unsupported';
  lastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
  activeVacanciesCount?: number;
}

export interface GlobalJobSource {
  id: string;
  name: string;
  companyId?: string;
  companyName: string;
  domain: string;
  category: JobSourceCategory;
  atsProvider?: AtsProviderType;
  officialCareersUrl: string;
  publicEndpoint: string;
  adapterType: string;
  country: string;
  region: string;
  languages: string[];
  permissionStatus: JobSourcePermission;
  rateLimitSeconds: number;
  isEnabled: boolean;
  priority: number;
  lastSyncAt?: string;
  lastAttemptAt?: string;
  healthStatus: JobSourceHealth;
  totalDiscovered: number;
  totalActive: number;
  errorCount: number;
  nextSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalLiveJob {
  id: string;
  source: string;
  sourceJobId: string;
  companyId?: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  country: string;
  region: string;
  workArrangement: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  salaryRaw?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  url: string;
  canonicalUrl?: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  preferredSkills: string[];
  tags: string[];
  sourceType: 'official_employer' | 'authorized_aggregator' | 'candidate_imported';
  lifecycleStatus: JobLifecycleStatus;
  extractionMethod: string;
  extractionConfidence: number;
  publishedAt: string;
  firstSeenAt: string;
  retrievedAt: string;
  lastVerifiedAt: string;
  expiresAt: string;
  isActive: boolean;
  lastCheckedAt: string;
  rawPayload?: string;
  matchScore?: number;
  matchBreakdown?: ExplainableMatchBreakdown;
}

export interface ExplainableMatchBreakdown {
  overallScore: number;
  tier: 'Strong Fit' | 'Good Fit' | 'Moderate Fit' | 'Low Fit';
  algorithmVersion: string;
  dimensions: {
    coreSkills: {
      score: number; // 0 - 30
      maxScore: 30;
      weight: '30%';
      matchedSkills: string[];
      missingSkills: string[];
    };
    experience: {
      score: number; // 0 - 25
      maxScore: 25;
      weight: '25%';
      candidateYears: number;
      requiredLevel: string;
      assessment: string;
    };
    roleAlignment: {
      score: number; // 0 - 20
      maxScore: 20;
      weight: '20%';
      targetRoleMatch: boolean;
      titleSimilarity: number;
      assessment: string;
    };
    mandatoryQualifications: {
      score: number; // 0 - 10
      maxScore: 10;
      weight: '10%';
      hasMandatoryGaps: boolean;
      gaps: string[];
      assessment: string;
    };
    geoAndWorkMode: {
      score: number; // 0 - 10
      maxScore: 10;
      weight: '10%';
      candidateLocation: string;
      jobLocation: string;
      workArrangementMatch: boolean;
      assessment: string;
    };
    candidatePreferences: {
      score: number; // 0 - 5
      maxScore: 5;
      weight: '5%';
      salaryMatch: boolean;
      industryMatch: boolean;
      assessment: string;
    };
  };
  recommendationReason: string;
  confidence: number;
  evaluatedAt: string;
}

export interface CountryCoverageStat {
  country: string;
  region: string;
  code: string;
  activeJobsCount: number;
  verifiedCompaniesCount: number;
  sourcesCount: number;
  healthySourcesCount: number;
  coverageStatus: 'strong' | 'moderate' | 'limited' | 'gap';
}

export interface GeographicCoverageSummary {
  totalCountries: number;
  totalRegions: number;
  totalActiveJobs: number;
  totalVerifiedCompanies: number;
  countries: CountryCoverageStat[];
  regionDistribution: Record<string, number>;
}

export interface GlobalSourceIntelligenceSummary {
  totalSources: number;
  activeSources: number;
  healthySources: number;
  degradedSources: number;
  totalDiscoveredCompanies: number;
  verifiedCareerPages: number;
  totalActiveVacancies: number;
  expiredOrPruned: number;
  averageIngestionDurationMs: number;
  lastGlobalSyncAt?: string;
}


