// worker/integrityEngine.ts
// Application Integrity Engine & Transferable Skill Intelligence for ApplyVise AI

import {
  CareerDigitalTwin,
  TailoredResumeContent,
  ApplicationIntegrityReport,
  TransferableSkillBridge,
  ApplicationRecord
} from '../src/types/index.ts';

/**
 * Strict Truthfulness Audit:
 * Compares tailored resume claims, metrics, employers, and skills against the candidate's Career Digital Twin.
 */
export function auditResumeAgainstTwin(
  tailored: TailoredResumeContent,
  twin: CareerDigitalTwin
): ApplicationIntegrityReport['resumeIntegrity'] {
  const unsupportedClaims: Array<{ claim: string; context: string; reason: string; severity: 'critical' | 'warning' }> = [];
  const metricsAudit: Array<{ metric: string; context: string; supportedInTwin: boolean }> = [];
  const inventedSkills: string[] = [];
  const inventedCompanies: string[] = [];

  // Ground truth extraction from Career Digital Twin
  const verifiedCompanies = new Set(
    twin.workExperiences
      .filter(e => e.provenance.confidence !== 'unverified')
      .map(e => e.company.toLowerCase().trim().replace(/[^a-z0-9]/g, ''))
  );

  const verifiedSkills = new Set(
    twin.skillsInventory
      .filter(s => s.provenance.confidence === 'confirmed')
      .map(s => s.name.toLowerCase().trim())
  );

  const allSupportedSkills = new Set(
    twin.skillsInventory.map(s => s.name.toLowerCase().trim())
  );

  const allTwinText = [
    twin.professionalSummary,
    ...twin.workExperiences.map(e => e.description + ' ' + e.achievements.join(' ')),
    ...twin.projects.map(p => p.description + ' ' + p.outcomes.join(' ')),
  ].join(' ').toLowerCase();

  // 1. Audit Employers
  for (const exp of tailored.tailoredExperiences || []) {
    const norm = exp.company.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    let found = false;
    for (const vc of verifiedCompanies) {
      if (norm.includes(vc) || vc.includes(norm)) {
        found = true;
        break;
      }
    }
    if (!found) {
      inventedCompanies.push(exp.company);
      unsupportedClaims.push({
        claim: `Employer: ${exp.company}`,
        context: exp.role,
        reason: 'Employer is not present in user-verified work experience.',
        severity: 'critical',
      });
    }
  }

  // 2. Audit Targeted Skills
  for (const sk of tailored.targetedSkills || []) {
    const sLower = sk.toLowerCase().trim();
    const isVerified = Array.from(verifiedSkills).some(vs => vs.includes(sLower) || sLower.includes(vs));
    const isSupported = Array.from(allSupportedSkills).some(as => as.includes(sLower) || sLower.includes(as));

    if (!isSupported) {
      inventedSkills.push(sk);
      unsupportedClaims.push({
        claim: `Skill: ${sk}`,
        context: 'Skills Section',
        reason: 'Skill was not found in candidate skills inventory or work history.',
        severity: 'warning',
      });
    } else if (!isVerified) {
      unsupportedClaims.push({
        claim: `Skill: ${sk}`,
        context: 'Skills Section',
        reason: 'Skill is an unconfirmed AI inference requiring candidate verification.',
        severity: 'warning',
      });
    }
  }

  // 3. Audit Numerical Metrics (e.g. "reduced costs by 35%", "$1.2M", "10x")
  const metricRegex = /(\b\d+%(?!\w)|\$\d+[\d,.]*(?:k|m|b)?\b|\b\d+x\b|\b\d+\+\s*(?:engineers|clients|users|projects)\b)/gi;

  for (const exp of tailored.tailoredExperiences || []) {
    for (const bullet of exp.bulletPoints || []) {
      const matches = bullet.match(metricRegex);
      if (matches) {
        for (const m of matches) {
          const supported = allTwinText.includes(m.toLowerCase());
          metricsAudit.push({
            metric: m,
            context: bullet,
            supportedInTwin: supported,
          });

          if (!supported) {
            unsupportedClaims.push({
              claim: `Metric: ${m}`,
              context: bullet,
              reason: `Numerical metric "${m}" was not found in verified master achievements.`,
              severity: 'warning',
            });
          }
        }
      }
    }
  }

  // Calculate Truthfulness Score
  let deductions = (inventedCompanies.length * 60) + (inventedSkills.length * 15);
  deductions += metricsAudit.filter(m => !m.supportedInTwin).length * 10;
  const truthfulnessScore = Math.max(0, 100 - deductions);

  const status = inventedCompanies.length > 0
    ? 'BLOCKED'
    : (unsupportedClaims.length > 0 ? 'NEEDS_REVIEW' : 'VERIFIED');

  return {
    status,
    unsupportedClaims,
    metricsAudit,
    inventedSkills,
    inventedCompanies,
    truthfulnessScore,
  };
}

/**
 * Cover Letter Integrity Audit
 */
export function auditCoverLetterAgainstTwin(
  coverLetter: string,
  twin: CareerDigitalTwin
): ApplicationIntegrityReport['coverLetterIntegrity'] {
  const unsupportedClaims: string[] = [];
  const textLower = coverLetter.toLowerCase();

  // Check if degrees mentioned are real
  const candidateDegrees = twin.education.map(e => e.degree.toLowerCase());
  if (textLower.includes('phd') && !candidateDegrees.some(d => d.includes('phd') || d.includes('doctorate'))) {
    unsupportedClaims.push('Cover letter mentions a Ph.D. which is not evidenced in candidate education.');
  }
  if (textLower.includes('master') && !candidateDegrees.some(d => d.includes('master') || d.includes('mba') || d.includes('ms'))) {
    unsupportedClaims.push('Cover letter mentions a Master degree which is not evidenced in candidate education.');
  }

  return {
    status: unsupportedClaims.length > 0 ? 'NEEDS_REVIEW' : 'VERIFIED',
    unsupportedClaims,
  };
}

/**
 * Duplicate Application Detection
 */
export function checkDuplicateApplication(
  vacancyId: string,
  company: string,
  role: string,
  existingApplications: ApplicationRecord[]
): ApplicationIntegrityReport['duplicateCheck'] {
  const normCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normRole = role.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const app of existingApplications) {
    if (app.vacancyId === vacancyId) {
      return {
        isDuplicate: true,
        duplicateApplicationId: app.id,
        reason: `Exact vacancy identifier "${vacancyId}" already exists in your applications tracker (Status: ${app.status}).`,
      };
    }

    const appCompany = app.company.toLowerCase().replace(/[^a-z0-9]/g, '');
    const appRole = app.role.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normCompany === appCompany && normRole === appRole) {
      return {
        isDuplicate: true,
        duplicateApplicationId: app.id,
        reason: `An application for "${app.role}" at "${app.company}" was already created on ${new Date(app.createdAt).toLocaleDateString()}.`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Central Verification Service
 */
export function runCentralIntegrityAudit(params: {
  job: any;
  tailoredResume?: TailoredResumeContent;
  coverLetter?: string;
  twin: CareerDigitalTwin;
  existingApplications: ApplicationRecord[];
  screeningAnswers?: Record<string, string>;
}): ApplicationIntegrityReport {
  const { job, tailoredResume, coverLetter, twin, existingApplications, screeningAnswers = {} } = params;
  const warnings: string[] = [];
  const requiredUserActions: string[] = [];

  // 1. Job Availability & Freshness Check
  const lastCheckedDate = job.lastCheckedAt ? new Date(job.lastCheckedAt) : new Date();
  const ageMinutes = (Date.now() - lastCheckedDate.getTime()) / (60 * 1000);
  let jobAvailabilityStatus: ApplicationIntegrityReport['jobAvailabilityStatus'] = 'VERIFIED_ACTIVE';

  if (!job.isActive) {
    jobAvailabilityStatus = 'CLOSED_OR_STALE';
    warnings.push('Job source indicates this listing is no longer accepting submissions.');
    requiredUserActions.push('Verify job posting status on official career site before proceeding.');
  } else if (ageMinutes > 1440) {
    jobAvailabilityStatus = 'UNKNOWN';
    warnings.push('Job verification status is older than 24 hours.');
  }

  // 2. Destination Trust Status
  let destinationTrustStatus: ApplicationIntegrityReport['destinationTrustStatus'] = 'UNVERIFIED_THIRD_PARTY';
  const destUrl = (job.url || '').toLowerCase();
  if (destUrl.includes('greenhouse.io') || destUrl.includes('lever.co') || destUrl.includes('ashbyhq.com') || destUrl.includes('workday.com')) {
    destinationTrustStatus = 'TRUSTED_OFFICIAL_ATS';
  } else if (destUrl.startsWith('https://')) {
    destinationTrustStatus = 'DIRECT_EMPLOYER_PORTAL';
  }

  // 3. Resume Integrity Audit
  let resumeIntegrity: ApplicationIntegrityReport['resumeIntegrity'] = {
    status: 'VERIFIED',
    unsupportedClaims: [],
    metricsAudit: [],
    inventedSkills: [],
    inventedCompanies: [],
    truthfulnessScore: 100,
  };

  if (tailoredResume) {
    resumeIntegrity = auditResumeAgainstTwin(tailoredResume, twin);
    if (resumeIntegrity.inventedCompanies.length > 0) {
      requiredUserActions.push(`Remove unevidenced employers: ${resumeIntegrity.inventedCompanies.join(', ')}`);
    }
    if (resumeIntegrity.metricsAudit.some(m => !m.supportedInTwin)) {
      warnings.push('Tailored resume contains achievement metrics not documented in candidate master profile.');
    }
  }

  // 4. Cover Letter Integrity Audit
  let coverLetterIntegrity: ApplicationIntegrityReport['coverLetterIntegrity'] = {
    status: 'VERIFIED',
    unsupportedClaims: [],
  };

  if (coverLetter) {
    coverLetterIntegrity = auditCoverLetterAgainstTwin(coverLetter, twin);
    if (coverLetterIntegrity.unsupportedClaims.length > 0) {
      warnings.push(...coverLetterIntegrity.unsupportedClaims);
    }
  }

  // 5. Screening Answers Audit
  const sensitiveQuestionsFlagged: string[] = [];
  const unansweredRequired: string[] = [];
  for (const [k, v] of Object.entries(screeningAnswers)) {
    const kLower = k.toLowerCase();
    if (kLower.includes('clearance') || kLower.includes('visa') || kLower.includes('salary expectation') || kLower.includes('legal declaration')) {
      if (!v || v.trim().length === 0) {
        sensitiveQuestionsFlagged.push(k);
        requiredUserActions.push(`Provide explicit candidate confirmation for: "${k}".`);
      }
    }
  }

  // 6. Duplicate Check
  const duplicateCheck = checkDuplicateApplication(job.id, job.company, job.title, existingApplications);
  if (duplicateCheck.isDuplicate) {
    warnings.push(`Duplicate warning: ${duplicateCheck.reason}`);
    requiredUserActions.push('Review existing application record before submitting again.');
  }

  // Determine Overall Status
  let overallStatus: ApplicationIntegrityReport['overallStatus'] = 'VERIFIED';
  if (jobAvailabilityStatus === 'CLOSED_OR_STALE' || resumeIntegrity.status === 'BLOCKED') {
    overallStatus = 'BLOCKED';
  } else if (resumeIntegrity.status === 'NEEDS_REVIEW' || duplicateCheck.isDuplicate || warnings.length > 0 || requiredUserActions.length > 0) {
    overallStatus = 'NEEDS_REVIEW';
  }

  return {
    overallStatus,
    jobAvailabilityStatus,
    jobSource: job.source || 'direct_feed',
    jobSourceVerifiedAt: job.lastCheckedAt || new Date().toISOString(),
    destination: job.url || '',
    destinationTrustStatus,
    resumeIntegrity,
    coverLetterIntegrity,
    screeningAnswersIntegrity: {
      status: sensitiveQuestionsFlagged.length > 0 ? 'NEEDS_REVIEW' : 'VERIFIED',
      sensitiveQuestionsFlagged,
      unansweredRequired,
    },
    duplicateCheck,
    warnings,
    requiredUserActions,
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Transferable Skill Intelligence Engine:
 * Analyzes candidate background (e.g. operations, logistics, customer service, project delivery)
 * and bridges transferable capabilities to target roles (e.g. Business Ops, Product Ops, Agile PM).
 */
export function evaluateTransferableSkills(
  twin: CareerDigitalTwin,
  jobTitle: string,
  jobDescription: string
): TransferableSkillBridge[] {
  const combinedTwin = [
    twin.professionalSummary,
    ...twin.skillsInventory.map(s => s.name),
    ...twin.workExperiences.map(e => e.description + ' ' + e.role + ' ' + e.achievements.join(' ')),
  ].join(' ').toLowerCase();

  const titleLower = jobTitle.toLowerCase();
  const descLower = jobDescription.toLowerCase();

  const directSkills: string[] = [];
  const transferableSkills: string[] = [];
  const missingSkills: string[] = [];

  // Check candidate skills
  for (const skill of twin.skillsInventory) {
    const sLower = skill.name.toLowerCase();
    if (
      descLower.includes(sLower) ||
      titleLower.includes(sLower) ||
      sLower.split(' ').some(w => w.length > 4 && (descLower.includes(w) || titleLower.includes(w)))
    ) {
      directSkills.push(skill.name);
    }
  }

  // Transferable Domain Bridge Logic
  // Pattern 1: Business Operations & Process Governance
  const hasOperationsBg = combinedTwin.includes('operation') || combinedTwin.includes('process') || combinedTwin.includes('logistics') || combinedTwin.includes('supply chain') || combinedTwin.includes('reporting');
  const targetNeedsOps = descLower.includes('operations') || descLower.includes('workflow') || descLower.includes('process improvement') || descLower.includes('stakeholder');

  if (hasOperationsBg && targetNeedsOps) {
    transferableSkills.push('Process Governance & Workflow Optimization');
    transferableSkills.push('Cross-Functional Stakeholder Management');
  }

  // Pattern 2: Project Delivery & Agile Execution
  const hasDeliveryBg = combinedTwin.includes('project') || combinedTwin.includes('delivery') || combinedTwin.includes('milestone') || combinedTwin.includes('schedule');
  const targetNeedsDelivery = descLower.includes('roadmap') || descLower.includes('agile') || descLower.includes('scrum') || descLower.includes('deadline');

  if (hasDeliveryBg && targetNeedsDelivery) {
    transferableSkills.push('Project Lifecycle Ownership & Milestone Delivery');
  }

  // Pattern 3: Quantitative Analysis & Systems Exposure
  const hasDataBg = combinedTwin.includes('excel') || combinedTwin.includes('sap') || combinedTwin.includes('erp') || combinedTwin.includes('sql') || combinedTwin.includes('metric');
  if (hasDataBg && (descLower.includes('kpi') || descLower.includes('analysis') || descLower.includes('metrics') || descLower.includes('reporting'))) {
    transferableSkills.push('KPI Tracking & Quantitative Decision Support');
  }

  // Calculate Heuristic Relevance Score
  const totalRelevant = directSkills.length * 15 + transferableSkills.length * 20;
  const relevanceScore = Math.min(95, Math.max(30, totalRelevant));

  const primaryBridge: TransferableSkillBridge = {
    targetRoleCategory: jobTitle,
    relevanceScore,
    directSkills: Array.from(new Set(directSkills)).slice(0, 5),
    transferableSkills: Array.from(new Set(transferableSkills)),
    missingSkills: Array.from(new Set(missingSkills)),
    rationale: `Candidate brings ${directSkills.length} directly evidenced skills and ${transferableSkills.length} high-leverage transferable capabilities from prior work history.`,
    recommendedAction: transferableSkills.length > 0
      ? 'Frame your resume summary around cross-functional process execution and quantifiable outcomes.'
      : 'Highlight direct technical competencies matching core requirements.',
  };

  return [primaryBridge];
}
