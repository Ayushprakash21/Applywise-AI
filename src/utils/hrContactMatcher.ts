// src/utils/hrContactMatcher.ts
// Transparent HR Contact Relevance & Matching Engine
// Evaluates contact-to-job & contact-to-candidate alignment independently of candidate-job match scores.

import {
  CareerPreferences,
  ContactRelevanceScore,
  HrContact,
  JobVacancy,
  UserProfile,
} from '../types/index.ts';

function normalizeStr(s?: string | null): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function evaluateContactRelevance(params: {
  contact: HrContact;
  job?: JobVacancy | null;
  profile?: UserProfile | null;
  preferences?: CareerPreferences | null;
}): ContactRelevanceScore {
  const { contact, job, profile, preferences } = params;

  const contactCompany = normalizeStr(contact.companyName);
  const jobCompany = normalizeStr(job?.company);
  const contactCountry = normalizeStr(contact.country);
  const contactCity = normalizeStr(contact.city);
  const jobCountry = normalizeStr(job?.country);
  const jobLocation = normalizeStr(job?.location);

  // 1. Company Relationship (0 - 35)
  let companyRelationship = 0;
  if (job) {
    if (contact.companyId && job.id && contactCompany && jobCompany && contactCompany === jobCompany) {
      companyRelationship = 35;
    } else if (contactCompany && jobCompany && (contactCompany.includes(jobCompany) || jobCompany.includes(contactCompany))) {
      companyRelationship = 28;
    } else if (contact.companyWebsite && job.url) {
      try {
        const cHost = new URL(contact.companyWebsite).hostname.replace(/^www\./, '');
        const jHost = new URL(job.url).hostname.replace(/^www\./, '');
        if (cHost && jHost && cHost === jHost) {
          companyRelationship = 32;
        }
      } catch {
        // ignore URL parse error
      }
    }
  } else {
    // Without a specific target job, score company identity completeness
    companyRelationship = contactCompany ? 20 : 5;
  }

  // 2. Job & Role Relevance (0 - 25)
  let jobRelevance = 0;
  if (job && contact.associatedJobIds?.includes(job.id)) {
    jobRelevance = 25;
  } else {
    const roleText = normalizeStr(
      `${job?.title || ''} ${profile?.currentTitle || ''} ${(preferences?.targetRoles || []).join(' ')}`
    );
    const contactContext = normalizeStr(`${contact.designation} ${contact.department || ''} ${contact.evidence}`);

    if (roleText) {
      const isTech = /(engineer|developer|software|data|cloud|devops|ai|ml|architect)/i.test(roleText);
      const isSupplyOrOps = /(supply chain|logistics|procurement|operations|project manager|program manager|scrum)/i.test(roleText);
      const isBusiness = /(finance|marketing|sales|product|analyst|hr|consult)/i.test(roleText);

      if (isTech && /technical|engineering|tech|it recruiter/i.test(contactContext)) {
        jobRelevance = 20;
      } else if (isSupplyOrOps && /supply|operations|logistics|program|project|talent/i.test(contactContext)) {
        jobRelevance = 20;
      } else if (isBusiness && /business|corporate|talent acquisition|recruiter/i.test(contactContext)) {
        jobRelevance = 18;
      } else if (/talent|recruit|hr|hiring/i.test(contactContext)) {
        jobRelevance = 12;
      }
    } else if (/talent|recruit|hr/i.test(contactContext)) {
      jobRelevance = 10;
    }
  }

  // 3. Department & Seniority Relevance (0 - 15)
  let departmentRelevance = 6;
  const cat = contact.roleCategory;
  if (cat === 'Talent Acquisition Specialist' || cat === 'Technical Recruiter' || cat === 'HR Recruiter') {
    departmentRelevance = 15;
  } else if (cat === 'Recruitment Manager' || cat === 'Hiring Manager' || cat === 'Head of Talent Acquisition') {
    departmentRelevance = 14;
  } else if (cat === 'Senior HR Manager' || cat === 'Recruitment Coordinator') {
    departmentRelevance = 12;
  } else if (cat === 'Careers Department') {
    departmentRelevance = 8;
  }

  // 4. Geographic Relevance (0 - 15)
  let geographicRelevance = 0;
  const targetCountries = (preferences?.targetCountries || []).map(normalizeStr);
  const candidateCountry = normalizeStr(profile?.location);

  if (job) {
    if (contactCountry && jobCountry && (contactCountry === jobCountry || jobLocation.includes(contactCountry))) {
      geographicRelevance = 15;
    } else if (contactCity && jobLocation.includes(contactCity)) {
      geographicRelevance = 15;
    } else if (contactCountry === 'global' || jobCountry === 'remote') {
      geographicRelevance = 10;
    }
  } else {
    if (contactCountry && targetCountries.some((tc) => tc && (tc === contactCountry || contactCountry.includes(tc)))) {
      geographicRelevance = 15;
    } else if (contactCountry && candidateCountry && candidateCountry.includes(contactCountry)) {
      geographicRelevance = 12;
    } else if (contactCountry === 'global') {
      geographicRelevance = 8;
    }
  }

  // 5. Source Reliability & Email Verification Status (0 - 10)
  let sourceAndVerification = 2;
  if (contact.emailVerificationStatus === 'Mailbox Verified' || contact.emailVerificationStatus === 'Verified') {
    sourceAndVerification = 10;
  } else if (contact.emailVerificationStatus === 'Source Confirmed') {
    sourceAndVerification = contact.isRoleBased ? 8 : 9;
  } else if (contact.emailVerificationStatus === 'MX Valid' || contact.emailVerificationStatus === 'Domain Valid') {
    sourceAndVerification = 7;
  } else if (contact.emailVerificationStatus === 'Role-Based') {
    sourceAndVerification = 6;
  } else if (contact.emailVerificationStatus === 'Discovered' || contact.emailVerificationStatus === 'Unverified') {
    sourceAndVerification = 4;
  } else if (contact.emailVerificationStatus === 'Stale') {
    sourceAndVerification = 3;
  } else if (contact.emailVerificationStatus === 'Invalid' || contact.emailVerificationStatus === 'Verification Failed') {
    sourceAndVerification = 0;
  }

  const overallScore = Math.max(
    0,
    Math.min(100, companyRelationship + jobRelevance + departmentRelevance + geographicRelevance + sourceAndVerification)
  );

  const tier: ContactRelevanceScore['tier'] =
    overallScore >= 70 ? 'High Relevance' : overallScore >= 45 ? 'Moderate Relevance' : 'General Contact';

  const parts: string[] = [];
  if (companyRelationship >= 28) parts.push('matched target employer');
  if (jobRelevance >= 18) parts.push('strong role/function alignment');
  if (geographicRelevance >= 12) parts.push('regional/location match');
  if (contact.emailVerificationStatus === 'Verified' || contact.emailVerificationStatus === 'Domain Valid') {
    parts.push(`${contact.emailVerificationStatus.toLowerCase()} email`);
  }

  return {
    overallScore,
    tier,
    breakdown: {
      companyRelationship,
      jobRelevance,
      departmentRelevance,
      geographicRelevance,
      sourceAndVerification,
    },
    explanation:
      parts.length > 0
        ? `Prioritized via ${parts.join(', ')}.`
        : 'Associated through general recruitment directory context.',
    advisoryNote:
      'Relevance estimates contact-to-role alignment from public evidence and does not guarantee direct hiring decision authority.',
  };
}
