export type WorkArrangement = 'remote' | 'hybrid' | 'onsite';

export type EmploymentType = 'full-time' | 'contract' | 'part-time' | 'internship';

export type OperatingMode = 'MODE_A_RESEARCH' | 'MODE_B_PREPARE_APPROVE' | 'MODE_C_AUTONOMOUS';

export type ApplicationStatus =
  | 'DISCOVERED'
  | 'VALIDATED'
  | 'MATCHED'
  | 'RESUME_GENERATED'
  | 'APPLICATION_PREPARED'
  | 'AWAITING_APPROVAL'
  | 'AUTHORIZED_TO_SUBMIT'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'CONFIRMATION_VERIFIED'
  | 'TRACKED'
  | 'INTERVIEWING'
  | 'OFFER_RECEIVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'FAILED';

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
  workAuthorizationCountry: string;
  workAuthorizationStatus: string; // e.g. "US Citizen", "Permanent Resident / Green Card", "H-1B (Requires Transfer)", "EU Citizen", "Need Sponsorship"
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  totalExperienceYears: number;
  currentEmployer: string;
  currentTitle: string;
  noticePeriodDays: number;
  earliestJoinDate: string;
  professionalSummary: string;
  education: EducationItem[];
  certifications: CertificationItem[];
  skills: VerifiedSkill[];
  experiences: ExperienceItem[];
  masterResumeFileName?: string;
  masterResumeLastUpdated?: string;
}

export interface CareerPreferences {
  targetCountries: string[];
  targetCities: string[];
  preferredTitles: string[];
  preferredIndustries: string[];
  workArrangement: WorkArrangement[];
  minSalaryByCurrency: Record<string, number>; // e.g. { "USD": 140000, "EUR": 95000, "GBP": 90000 }
  preferredEmploymentType: EmploymentType[];
  willingnessToRelocate: 'yes' | 'no' | 'negotiable';
  visaSponsorshipRequired: boolean;
  preferredCompanies: string[];
  excludedCompanies: string[];
  excludedKeywords: string[];
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
  matchScore: number; // 0 - 100
  breakdown: {
    skills: number;
    experience: number;
    qualifications: number;
    seniority: number;
    location: number;
    salary: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  eligibilityIssues: string[];
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
  visaSponsorship?: 'supported' | 'not_supported' | 'unknown';
  retrievedAt: string;
  isActive: boolean;
  lastCheckedAt?: string;
  matchEvaluation?: JobMatchEvaluation;
}

export interface TailoredResumeContent {
  versionId: string;
  generatedAt: string;
  targetJobTitle: string;
  targetCompany: string;
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
  truthfulnessAuditPassed: boolean;
  truthfulnessScore: number; // 100 = 100% facts derived from master profile
  auditNotes: string[];
}

export interface ApplicationTimelineEvent {
  timestamp: string;
  stage: ApplicationStatus;
  note: string;
  actor: 'Agent autonomous' | 'User approved' | 'System scheduler' | 'User manual';
}

export interface SubmissionEvidence {
  confirmationNumber?: string;
  timestamp: string;
  channel: 'api' | 'assisted_browser' | 'direct_portal';
  receiptText: string;
  verified: boolean;
  httpStatus?: number;
}

export interface ApplicationRecord {
  id: string;
  duplicateKey: string; // company::title_or_url::userId
  vacancyId: string;
  company: string;
  role: string;
  country: string;
  location: string;
  jobUrl: string;
  salaryRange?: string;
  matchScore: number;
  status: ApplicationStatus;
  resumeVersionId: string;
  tailoredResume: TailoredResumeContent;
  coverLetter?: string;
  submissionEvidence?: SubmissionEvidence;
  requiresApprovalReason?: string;
  timeline: ApplicationTimelineEvent[];
  followUpDate?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationSettings {
  mode: OperatingMode;
  emergencyStop: boolean;
  autoApplyThreshold: number; // e.g. 80
  dailyApplicationLimit: number; // e.g. 10
  scheduledSearchEnabled: boolean;
  scheduledSearchIntervalMinutes: number; // e.g. 360 (6 hours)
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
  actor: 'Agent autonomous' | 'User approved' | 'System scheduler' | 'User manual' | 'Security guard';
  action: string;
  target: string;
  details: string;
  severity: 'info' | 'warning' | 'security' | 'critical';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'match' | 'approval_needed' | 'submission_success' | 'submission_failed' | 'reminder';
  read: boolean;
  timestamp: string;
  applicationId?: string;
  vacancyId?: string;
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
