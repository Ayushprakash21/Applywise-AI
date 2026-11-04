// src/utils/resumeReprocessing.ts
// Safe Resume Reprocessing & Provenance-Preserving Diff Utility

import { UserProfile, CandidateFact } from '../types/index.ts';

export interface ExtractionFieldDiff {
  fieldName: string;
  fieldLabel: string;
  previousValue: any;
  newValue: any;
  hasConflictWithVerifiedFact: boolean;
  conflictWarning?: string;
}

export interface ReprocessingDiffSummary {
  fieldsChangedCount: number;
  conflictsWithVerifiedFactsCount: number;
  addedSkills: string[];
  addedExperiences: Array<{ company: string; role: string }>;
  differences: ExtractionFieldDiff[];
}

/**
 * Calculates field-by-field differences between a newly reprocessed extraction
 * and the candidate's active profile, strictly guarding any USER_CONFIRMED or USER_CORRECTED facts.
 */
export function calculateExtractionDiff(
  newProfile: UserProfile,
  currentProfile: UserProfile | null,
  existingFacts: CandidateFact[] = []
): ReprocessingDiffSummary {
  const differences: ExtractionFieldDiff[] = [];
  const curr = currentProfile || ({} as Partial<UserProfile>);

  // Helper: check if a field has an existing confirmed fact
  const isFactConfirmed = (category: string, field?: string): boolean => {
    return existingFacts.some(
      f =>
        f.category === category &&
        (!field || f.field === field) &&
        (f.verificationStatus === 'USER_CONFIRMED' || f.verificationStatus === 'USER_CORRECTED')
    );
  };

  // 1. Full Name
  if (newProfile.fullName && newProfile.fullName !== curr.fullName) {
    const isConfirmed = isFactConfirmed('IDENTITY', 'fullName');
    differences.push({
      fieldName: 'fullName',
      fieldLabel: 'Full Name',
      previousValue: curr.fullName || '',
      newValue: newProfile.fullName,
      hasConflictWithVerifiedFact: isConfirmed,
      conflictWarning: isConfirmed ? 'Candidate confirmed their full name; live profile preserved.' : undefined,
    });
  }

  // 2. Current Title
  if (newProfile.currentTitle && newProfile.currentTitle !== curr.currentTitle) {
    const isConfirmed = isFactConfirmed('TITLE', 'currentTitle');
    differences.push({
      fieldName: 'currentTitle',
      fieldLabel: 'Current Title',
      previousValue: curr.currentTitle || '',
      newValue: newProfile.currentTitle,
      hasConflictWithVerifiedFact: isConfirmed,
      conflictWarning: isConfirmed ? 'Candidate confirmed their job title; live profile preserved.' : undefined,
    });
  }

  // 3. Current Employer
  if (newProfile.currentEmployer && newProfile.currentEmployer !== curr.currentEmployer) {
    const isConfirmed = isFactConfirmed('EMPLOYMENT', 'currentEmployer');
    differences.push({
      fieldName: 'currentEmployer',
      fieldLabel: 'Current Employer',
      previousValue: curr.currentEmployer || '',
      newValue: newProfile.currentEmployer,
      hasConflictWithVerifiedFact: isConfirmed,
      conflictWarning: isConfirmed ? 'Candidate confirmed their current employer; live profile preserved.' : undefined,
    });
  }

  // 4. Total Experience Years
  if (newProfile.totalExperienceYears !== curr.totalExperienceYears) {
    differences.push({
      fieldName: 'totalExperienceYears',
      fieldLabel: 'Total Experience Years',
      previousValue: curr.totalExperienceYears || 0,
      newValue: newProfile.totalExperienceYears || 0,
      hasConflictWithVerifiedFact: false,
    });
  }

  // 5. Skills Diff
  const currentSkillNames = new Set((curr.skills || []).map(s => s.name.toLowerCase()));
  const addedSkills: string[] = [];
  for (const s of newProfile.skills || []) {
    if (!currentSkillNames.has(s.name.toLowerCase())) {
      addedSkills.push(s.name);
    }
  }

  if (addedSkills.length > 0) {
    differences.push({
      fieldName: 'skills',
      fieldLabel: 'Identified Skills',
      previousValue: (curr.skills || []).map(s => s.name),
      newValue: (newProfile.skills || []).map(s => s.name),
      hasConflictWithVerifiedFact: false,
    });
  }

  // 6. Experience Diff
  const currentExpKeys = new Set(
    (curr.experiences || []).map(e => `${e.company.toLowerCase()}|${e.role.toLowerCase()}`)
  );
  const addedExperiences: Array<{ company: string; role: string }> = [];
  for (const exp of newProfile.experiences || []) {
    const key = `${exp.company.toLowerCase()}|${exp.role.toLowerCase()}`;
    if (!currentExpKeys.has(key)) {
      addedExperiences.push({ company: exp.company, role: exp.role });
    }
  }

  if (addedExperiences.length > 0) {
    differences.push({
      fieldName: 'experiences',
      fieldLabel: 'Employment History',
      previousValue: `${(curr.experiences || []).length} positions recorded`,
      newValue: `${(newProfile.experiences || []).length} positions extracted`,
      hasConflictWithVerifiedFact: false,
    });
  }

  const conflictsWithVerifiedFactsCount = differences.filter(d => d.hasConflictWithVerifiedFact).length;

  return {
    fieldsChangedCount: differences.length,
    conflictsWithVerifiedFactsCount,
    addedSkills,
    addedExperiences,
    differences,
  };
}

/**
 * Merges reprocessed fields into the candidate profile without ever overwriting
 * USER_CONFIRMED or USER_CORRECTED facts.
 */
export function mergeProfileSafely(
  reprocessed: UserProfile,
  current: UserProfile | null,
  facts: CandidateFact[] = []
): UserProfile {
  if (!current) return reprocessed;

  const isConfirmed = (category: string, field?: string): boolean => {
    return facts.some(
      f =>
        f.category === category &&
        (!field || f.field === field) &&
        (f.verificationStatus === 'USER_CONFIRMED' || f.verificationStatus === 'USER_CORRECTED')
    );
  };

  return {
    ...current,
    // Preserve confirmed identity and title
    fullName: isConfirmed('IDENTITY', 'fullName') ? current.fullName : (reprocessed.fullName || current.fullName),
    currentTitle: isConfirmed('TITLE', 'currentTitle') ? current.currentTitle : (reprocessed.currentTitle || current.currentTitle),
    currentEmployer: isConfirmed('EMPLOYMENT', 'currentEmployer') ? current.currentEmployer : (reprocessed.currentEmployer || current.currentEmployer),
    // Update non-conflicting metrics
    totalExperienceYears: reprocessed.totalExperienceYears > 0 ? reprocessed.totalExperienceYears : current.totalExperienceYears,
    professionalSummary: current.professionalSummary || reprocessed.professionalSummary,
    // Merge skills uniquely preserving verified ones
    skills: [
      ...(current.skills || []),
      ...(reprocessed.skills || []).filter(
        ns => !(current.skills || []).some(cs => cs.name.toLowerCase() === ns.name.toLowerCase())
      ),
    ],
    // Merge experiences
    experiences: [
      ...(current.experiences || []),
      ...(reprocessed.experiences || []).filter(
        ne => !(current.experiences || []).some(
          ce => ce.company.toLowerCase() === ne.company.toLowerCase() && ce.role.toLowerCase() === ne.role.toLowerCase()
        )
      ),
    ],
    // Preserve existing education or add new
    education: (current.education && current.education.length > 0) ? current.education : reprocessed.education,
    certifications: (current.certifications && current.certifications.length > 0) ? current.certifications : reprocessed.certifications,
    languages: (current.languages && current.languages.length > 0) ? current.languages : reprocessed.languages,
    masterResumeLastUpdated: new Date().toISOString(),
  };
}
