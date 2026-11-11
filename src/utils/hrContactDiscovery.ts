// src/utils/hrContactDiscovery.ts
// Legally Compliant Public HR Contact Discovery Parser, Classifier & Source Registry
// Strictly extracts ONLY explicitly published contacts with provenance — never guesses emails or bypasses access controls.

import {
  HrContactRoleCategory,
  HrDiscoverySourceMeta,
} from '../types/index.ts';
import {
  DISPOSABLE_EMAIL_DOMAINS,
  isRoleBasedEmailAddress,
  RESERVED_INVALID_TLDS,
  validateEmailSyntax,
} from './hrEmailVerification.ts';

/**
 * Transparent Source Registry for HR Contact Discovery
 * Documents capabilities, legal/technical boundaries, and restrictions across global platforms.
 */
export const HR_DISCOVERY_SOURCES: HrDiscoverySourceMeta[] = [
  {
    id: 'official_company_careers',
    name: 'Official Company Career & Recruitment Pages',
    category: 'official_careers',
    permissionMode: 'permitted_public',
    exposesPublicEmails: 'partial',
    notes: 'Extracts publicly listed recruitment contact emails (e.g. careers@, talent@, named TA emails) from public HTTPS career/contact pages.',
    rateLimitSeconds: 600,
  },
  {
    id: 'ats_greenhouse',
    name: 'Greenhouse Public Job Boards',
    category: 'ats_public_board',
    permissionMode: 'permitted_public',
    exposesPublicEmails: 'partial',
    notes: 'Public boards-api.greenhouse.io metadata; inspects posting descriptions when employers include explicit recruiter emails.',
    rateLimitSeconds: 300,
  },
  {
    id: 'ats_lever',
    name: 'Lever Public Postings API',
    category: 'ats_public_board',
    permissionMode: 'permitted_public',
    exposesPublicEmails: 'partial',
    notes: 'Public api.lever.co/v0/postings metadata; parses employer-provided contact emails in posting bodies.',
    rateLimitSeconds: 300,
  },
  {
    id: 'ats_ashby',
    name: 'Ashby Public Job Board API',
    category: 'ats_public_board',
    permissionMode: 'permitted_public',
    exposesPublicEmails: 'partial',
    notes: 'Public api.ashbyhq.com posting feed; uses form submission by default unless employer lists direct contact.',
    rateLimitSeconds: 300,
  },
  {
    id: 'ats_workable',
    name: 'Workable Public Widget API',
    category: 'ats_public_board',
    permissionMode: 'permitted_public',
    exposesPublicEmails: 'partial',
    notes: 'Inspects public Workable job descriptions for explicitly published recruitment contacts.',
    rateLimitSeconds: 600,
  },
  {
    id: 'ats_smartrecruiters',
    name: 'SmartRecruiters Public Postings API',
    category: 'ats_public_board',
    permissionMode: 'permitted_public',
    exposesPublicEmails: 'partial',
    notes: 'Inspects public posting metadata and employer contact blocks when exposed.',
    rateLimitSeconds: 600,
  },
  {
    id: 'ats_recruitee',
    name: 'Recruitee Public Offers API',
    category: 'ats_public_board',
    permissionMode: 'permitted_public',
    exposesPublicEmails: 'partial',
    notes: 'Inspects public Recruitee offer payloads and mailbox/contact fields when publicly listed.',
    rateLimitSeconds: 600,
  },
  {
    id: 'ats_workday',
    name: 'Workday Career Portals',
    category: 'ats_public_board',
    permissionMode: 'linking_only',
    exposesPublicEmails: false,
    notes: 'Workday tenant portals normally enforce web application forms and do not expose direct HR email addresses.',
    rateLimitSeconds: 900,
  },
  {
    id: 'public_job_feeds',
    name: 'Public Job Feeds (Remotive, Arbeitnow, Jobicy)',
    category: 'public_job_board',
    permissionMode: 'permitted_public',
    exposesPublicEmails: 'partial',
    notes: 'Inspects employer-published contact emails and mailto links inside GCDE cached job descriptions.',
    rateLimitSeconds: 600,
  },
  {
    id: 'licensed_contact_api',
    name: 'Licensed B2B / Recruitment Contact APIs',
    category: 'licensed_api',
    permissionMode: 'authorized_api',
    exposesPublicEmails: true,
    notes: 'Requires customer-supplied authorized API credentials (e.g., HUNTER_API_KEY). Disabled until configured.',
    rateLimitSeconds: 60,
  },
  {
    id: 'linkedin_portals',
    name: 'LinkedIn Company & Job Pages',
    category: 'restricted_portal',
    permissionMode: 'linking_only',
    exposesPublicEmails: false,
    notes: 'Access-controlled platform. Scraping behind login walls or anti-bot protections is strictly disabled; external linking only unless authorized API partnership exists.',
    rateLimitSeconds: 3600,
  },
  {
    id: 'indeed_glassdoor',
    name: 'Indeed & Glassdoor',
    category: 'restricted_portal',
    permissionMode: 'linking_only',
    exposesPublicEmails: false,
    notes: 'Does not expose direct HR email addresses publicly; anti-bot/login controls are never bypassed.',
    rateLimitSeconds: 3600,
  },
  {
    id: 'regional_job_portals',
    name: 'Regional Portals (Naukri, Foundit, Wellfound, Instahyre, JobStreet, SEEK, Reed, Bayt, GulfTalent)',
    category: 'restricted_portal',
    permissionMode: 'linking_only',
    exposesPublicEmails: 'partial',
    notes: 'Does not bypass login restrictions or paywalls. Contacts are extracted only when employers publish an email openly in an authorized GCDE posting or user-imported advertisement.',
    rateLimitSeconds: 3600,
  },
];

// Technical/tracking noise domains never treated as HR recruitment contacts
const IGNORED_TECHNICAL_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'domain.com',
  'company.com',
  'yourcompany.com',
  'email.com',
  'test.com',
  'sentry.io',
  'wixpress.com',
  'w3.org',
  'schema.org',
  'googleapis.com',
  'googleusercontent.com',
  'cloudflare.com',
  'github.com',
  'npmjs.org',
]);

const IGNORED_NOISE_LOCAL_PARTS = new Set([
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'mailer-daemon',
  'postmaster',
  'webmaster',
  'privacy',
  'legal',
  'dmca',
  'security',
  'abuse',
  'billing',
  'accounts',
  'press',
  'media',
  'sales',
  'marketing',
]);

export function classifyHrDesignation(contextSnippet: string, email: string): {
  designation: string;
  roleCategory: HrContactRoleCategory;
  department: string;
} {
  const localPart = email.split('@')[0]?.toLowerCase() || '';
  if (localPart === 'careers' || localPart === 'career' || localPart === 'jobs' || localPart === 'job') {
    return {
      designation: 'Careers Department',
      roleCategory: 'Careers Department',
      department: 'Careers & Recruitment',
    };
  }

  const combined = `${contextSnippet} ${email}`.toLowerCase();

  if (/head\s+of\s+talent|vp\s+(?:of\s+)?(?:talent|people|hr)|director\s+of\s+(?:talent|hr|recruiting)/i.test(combined)) {
    return {
      designation: 'Head of Talent Acquisition',
      roleCategory: 'Head of Talent Acquisition',
      department: 'Talent Acquisition',
    };
  }
  if (/senior\s+hr\s+manager|senior\s+human\s+resources|hr\s+director|people\s+partner/i.test(combined)) {
    return {
      designation: 'Senior HR Manager',
      roleCategory: 'Senior HR Manager',
      department: 'Human Resources',
    };
  }
  if (/recruitment\s+manager|talent\s+acquisition\s+manager|recruiting\s+manager/i.test(combined)) {
    return {
      designation: 'Recruitment Manager',
      roleCategory: 'Recruitment Manager',
      department: 'Talent Acquisition',
    };
  }
  if (/technical\s+recruiter|engineering\s+recruiter|tech\s+talent/i.test(combined)) {
    return {
      designation: 'Technical Recruiter',
      roleCategory: 'Technical Recruiter',
      department: 'Technical Recruiting',
    };
  }
  if (/talent\s+acquisition\s+specialist|talent\s+acquisition|talent\s+partner/i.test(combined)) {
    return {
      designation: 'Talent Acquisition Specialist',
      roleCategory: 'Talent Acquisition Specialist',
      department: 'Talent Acquisition',
    };
  }
  if (/recruitment\s+coordinator|hiring\s+coordinator|talent\s+coordinator/i.test(combined)) {
    return {
      designation: 'Recruitment Coordinator',
      roleCategory: 'Recruitment Coordinator',
      department: 'Talent Acquisition',
    };
  }
  if (/hiring\s+manager|engineering\s+manager|supply\s+chain\s+manager|operations\s+manager/i.test(combined)) {
    return {
      designation: 'Hiring Manager',
      roleCategory: 'Hiring Manager',
      department: 'Hiring Team',
    };
  }
  if (/hr\s+recruiter|human\s+resources|people\s+ops|people\s+team|recruiter/i.test(combined)) {
    return {
      designation: 'HR Recruiter',
      roleCategory: 'HR Recruiter',
      department: 'Human Resources',
    };
  }

  return {
    designation: 'General Recruitment Contact',
    roleCategory: 'General Recruitment Contact',
    department: 'Recruitment',
  };
}

function tryExtractContactName(snippet: string): string | undefined {
  // Look for patterns like "Contact: Jane Doe (jane@company.com)" or "Reach out to John Smith at john@..."
  const patterns = [
    /(?:contact|reach\s+out\s+to|send\s+(?:your\s+)?(?:resume|cv|application)\s+to|email|recruiter|hiring\s+manager)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*(?:\(|<|-|,)\s*[a-zA-Z0-9._%+-]+@/,
  ];
  for (const pat of patterns) {
    const match = snippet.match(pat);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const lower = candidate.toLowerCase();
      if (
        candidate.length >= 4 &&
        candidate.length <= 50 &&
        !lower.includes('human resources') &&
        !lower.includes('talent acquisition') &&
        !lower.includes('careers team') &&
        !lower.includes('apply now') &&
        !lower.includes('job description')
      ) {
        return candidate;
      }
    }
  }
  return undefined;
}

export interface ExtractedHrContactCandidate {
  email: string;
  contactName?: string;
  designation: string;
  roleCategory: HrContactRoleCategory;
  department: string;
  companyName: string;
  companyId?: string;
  companyWebsite?: string;
  country: string;
  city?: string;
  sourceType: string;
  sourceName: string;
  sourceUrl: string;
  associatedJobIds: string[];
  isRoleBased: boolean;
  confidence: number;
  evidence: string;
}

/**
 * Extracts ONLY explicitly present public recruitment/HR email addresses from a text or HTML string.
 * Rejects noise/system emails, disposable addresses, and unassociated third-party domains when domain is known.
 */
export function extractPublicHrContactsFromText(params: {
  text: string;
  companyName: string;
  companyId?: string;
  companyWebsite?: string;
  companyDomain?: string;
  country?: string;
  city?: string;
  sourceType: string;
  sourceName: string;
  sourceUrl: string;
  jobId?: string;
}): ExtractedHrContactCandidate[] {
  if (!params.text || typeof params.text !== 'string') return [];

  // Strip script/style blocks first so we don't accidentally extract JS/CSS asset strings
  const cleanText = params.text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/mailto:/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  const emailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24})\b/g;
  const seenEmails = new Set<string>();
  const results: ExtractedHrContactCandidate[] = [];

  let match: RegExpExecArray | null;
  while ((match = emailRegex.exec(cleanText)) !== null) {
    const rawEmail = match[1];
    const syntax = validateEmailSyntax(rawEmail);
    if (!syntax.valid) continue;

    const email = syntax.normalized;
    if (seenEmails.has(email)) continue;

    const [local, domain] = email.split('@');
    if (
      IGNORED_TECHNICAL_DOMAINS.has(domain) ||
      DISPOSABLE_EMAIL_DOMAINS.has(domain) ||
      RESERVED_INVALID_TLDS.some((tld) => domain.endsWith(tld)) ||
      IGNORED_NOISE_LOCAL_PARTS.has(local) ||
      /\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(domain)
    ) {
      continue;
    }

    seenEmails.add(email);

    // Grab surrounding context window (140 chars before & after) as provenance evidence
    const startIdx = Math.max(0, match.index - 140);
    const endIdx = Math.min(cleanText.length, match.index + rawEmail.length + 140);
    const snippet = cleanText.slice(startIdx, endIdx).trim();

    const isRoleBased = isRoleBasedEmailAddress(local);
    const classified = classifyHrDesignation(snippet, email);
    const contactName = !isRoleBased ? tryExtractContactName(snippet) : undefined;

    // Evaluate domain correlation when companyDomain is available
    const expectedDomain = params.companyDomain?.toLowerCase().replace(/^www\./, '');
    const domainMatchesCompany = expectedDomain
      ? domain === expectedDomain || domain.endsWith(`.${expectedDomain}`)
      : false;

    const hasRecruitmentKeywords = /(career|recruit|talent|hr|hiring|people|apply|resume|cv|application|job)/i.test(
      `${snippet} ${local}`
    );

    // Skip random non-recruitment emails (e.g. customer support) unless domain matches & has recruitment signal
    if (
      !hasRecruitmentKeywords &&
      !isRoleBased &&
      classified.roleCategory === 'General Recruitment Contact' &&
      !contactName
    ) {
      continue;
    }

    let confidence = 0.55;
    if (domainMatchesCompany) confidence += 0.25;
    if (hasRecruitmentKeywords) confidence += 0.1;
    if (contactName && !isRoleBased) confidence += 0.05;
    if (isRoleBased) confidence -= 0.05;
    confidence = Math.min(0.95, Math.max(0.35, Number(confidence.toFixed(2))));

    results.push({
      email,
      contactName,
      designation: classified.designation,
      roleCategory: classified.roleCategory,
      department: classified.department,
      companyName: params.companyName,
      companyId: params.companyId,
      companyWebsite: params.companyWebsite,
      country: params.country || 'Global',
      city: params.city,
      sourceType: params.sourceType,
      sourceName: params.sourceName,
      sourceUrl: params.sourceUrl,
      associatedJobIds: params.jobId ? [params.jobId] : [],
      isRoleBased,
      confidence,
      evidence: `Published on ${params.sourceName}: "...${snippet}..."`,
    });
  }

  return results;
}
