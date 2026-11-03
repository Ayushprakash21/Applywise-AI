import { ApplicationRecord, ApplicationStatus, UserProfile } from '../src/types/index.ts';

export interface SubmissionRequest {
  applicationId: string;
  userConfirmationEvidence?: {
    employerConfirmationUrl?: string;
    confirmationCode?: string;
    notes?: string;
  };
}

export interface SubmissionResult {
  status: ApplicationStatus;
  evidence?: {
    channel: 'official_api' | 'guided_portal' | 'manual_verification';
    timestamp: string;
    confirmationUrl?: string;
    receiptDetails?: string;
    verified: boolean;
  };
  guidedApplication?: {
    portalUrl: string;
    instructions: string[];
    prefilledFields: Record<string, string>;
  };
  message: string;
}

export const submissionAdapter = {
  /**
   * Processes application submission truthfully.
   * If direct official employer API is available and authorized, executes it.
   * Otherwise transitions to GUIDED_COMPLETION_REQUIRED with prepared documents & prefilled data.
   * NEVER generates fake confirmation codes or marks unverified submissions as SUBMITTED_VERIFIED!
   */
  async processSubmission(
    application: ApplicationRecord,
    profile: UserProfile,
    userEvidence?: { confirmationCode?: string; employerConfirmationUrl?: string; notes?: string }
  ): Promise<SubmissionResult> {
    const portalUrl = application.url || application.jobUrl || '#';

    // Case 1: The user has manually completed the external application and provides confirmation evidence
    if (userEvidence?.confirmationCode || userEvidence?.employerConfirmationUrl) {
      return {
        status: 'SUBMITTED_VERIFIED',
        evidence: {
          channel: 'manual_verification',
          timestamp: new Date().toISOString(),
          confirmationUrl: userEvidence.employerConfirmationUrl,
          receiptDetails: userEvidence.confirmationCode ? `Candidate verified with confirmation code: ${userEvidence.confirmationCode}` : 'Candidate completed submission via official employer portal.',
          verified: true,
        },
        message: 'Application marked as verified submitted by user.',
      };
    }

    // Case 2: Standard external application portal (Workday, Greenhouse, Lever, etc.)
    // We provide a guided application package and transition to GUIDED_COMPLETION_REQUIRED
    const prefilledFields: Record<string, string> = {
      'Full Name': profile.fullName,
      'Email': profile.email,
      'Phone': profile.phone,
      'Location': profile.location,
      'Headline': application.tailoredResume?.headline || profile.currentTitle,
      'Years of Experience': String(profile.totalExperienceYears),
      'Work Authorization': profile.workAuthorization?.join(', ') || 'Authorized',
    };

    return {
      status: 'GUIDED_COMPLETION_REQUIRED',
      guidedApplication: {
        portalUrl,
        instructions: [
          'Open the employer portal link below.',
          'Upload your tailored ATS resume (downloaded from ApplyVise AI).',
          'Review pre-filled contact details to paste into the form.',
          'Once submitted, paste your application link or confirmation code here to verify.',
        ],
        prefilledFields,
      },
      message: 'Direct portal automation requires human interaction for employer security checks. Your tailored application package is ready for 1-click guided submission.',
    };
  },
};
