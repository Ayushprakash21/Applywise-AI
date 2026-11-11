// src/utils/hrContactDiscovery.ts
// Legally Compliant Public HR Contact Discovery Parser, Classifier & Source Registry
// Strictly extracts ONLY explicitly published contacts with provenance — never guesses emails or bypasses access controls.

import {
  HrContactClassificationType,
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

// Placeholder / non-routable / script asset domains never treated as HR contacts
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
  'npmjs.org',
]);

// Third-party ATS & job board vendor domains (ignore unless target employer IS that platform)
const ATS_OR_BOARD_VENDOR_DOMAINS = new Set([
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'workable.com',
  'smartrecruiters.com',
  'recruitee.com',
  'jobicy.com',
  'arbeitnow.com',
  'remotive.com',
  'myworkdayjobs.com',
  'workday.com',
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
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
  'dpo',
  'legal',
  'dmca',
  'security',
  'abuse',
  'billing',
  'invoices',
  'accounts',
  'press',
  'media',
  'sales',
  'marketing',
  'support',
  'helpdesk',
]);

export function decodeHtmlEntitiesForExtraction(input: string): string {
  if (!input) return '';
  return input
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#64;|&commat;|&#x40;/gi, '@')
    .replace(/&#46;|&period;|&#x2e;/gi, '.')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function normalizeObfuscatedEmails(text: string): string {
  // Converts patterns like "talent [at] acme [dot] com" or "hr(at)acme(dot)de" cleanly to "talent@acme.com"
  return text.replace(
    /\b([a-zA-Z0-9._%+-]+)\s*(?:\[at\]|\(at\)|\{\s*at\s*\}|<at>|\s+at\s+)\s*([a-zA-Z0-9-]+(?:\s*(?:\[dot\]|\(dot\)|\{\s*dot\s*\}|\[\.\]|\.)\s*[a-zA-Z0-9-]+)+)/gi,
    (_full, local, domainPart) => {
      const normalizedDomain = String(domainPart)
        .replace(/\s*(?:\[dot\]|\(dot\)|\{\s*dot\s*\}|\[\.\]|\s+dot\s+)\s*/gi, '.')
        .replace(/\s+/g, '');
      return `${local.trim()}@${normalizedDomain}`;
    }
  );
}

export function classifyHrDesignation(contextSnippet: string, email: string, contactName?: string): {
  designation: string;
  roleCategory: HrContactRoleCategory;
  contactType: HrContactClassificationType;
  department: string;
} {
  const localPart = email.split('@')[0]?.toLowerCase() || '';
  const combined = `${contextSnippet} ${email}`.toLowerCase();

  if (
    localPart === 'careers' ||
    localPart === 'career' ||
    localPart === 'jobs' ||
    localPart === 'job' ||
    localPart === 'opportunities'
  ) {
    return {
      designation: 'Careers Department',
      roleCategory: 'Careers Department',
      contactType: 'Careers Contact',
      department: 'Careers & Recruitment',
    };
  }

  if (localPart === 'recruitment' || localPart === 'recruiting') {
    return {
      designation: 'Recruitment Coordinator',
      roleCategory: 'Recruitment Coordinator',
      contactType: 'Recruitment Department',
      department: 'Talent Acquisition',
    };
  }

  if (localPart === 'hr' || localPart === 'humanresources' || localPart === 'people' || localPart === 'peopleops') {
    return {
      designation: 'HR Department',
      roleCategory: 'HR Recruiter',
      contactType: 'HR Department',
      department: 'Human Resources',
    };
  }

  if (contactName && /(recruiter|talent|hr|hiring)/i.test(combined)) {
    const isTech = /technical\s+recruiter|engineering\s+recruiter/i.test(combined);
    const isTa = /talent\s+acquisition/i.test(combined);
    return {
      designation: isTech ? 'Technical Recruiter' : isTa ? 'Talent Acquisition Specialist' : 'HR Recruiter',
      roleCategory: isTech ? 'Technical Recruiter' : isTa ? 'Talent Acquisition Specialist' : 'HR Recruiter',
      contactType: 'Named Recruiter',
      department: isTech ? 'Technical Recruiting' : 'Talent Acquisition',
    };
  }

  if (/head\s+of\s+talent|vp\s+(?:of\s+)?(?:talent|people|hr)|director\s+of\s+(?:talent|hr|recruiting)/i.test(combined)) {
    return {
      designation: 'Head of Talent Acquisition',
      roleCategory: 'Head of Talent Acquisition',
      contactType: 'Talent Acquisition',
      department: 'Talent Acquisition',
    };
  }
  if (/senior\s+hr\s+manager|senior\s+human\s+resources|hr\s+director|people\s+partner/i.test(combined)) {
    return {
      designation: 'Senior HR Manager',
      roleCategory: 'Senior HR Manager',
      contactType: 'HR Department',
      department: 'Human Resources',
    };
  }
  if (/recruitment\s+manager|talent\s+acquisition\s+manager|recruiting\s+manager/i.test(combined)) {
    return {
      designation: 'Recruitment Manager',
      roleCategory: 'Recruitment Manager',
      contactType: 'Recruitment Department',
      department: 'Talent Acquisition',
    };
  }
  if (/technical\s+recruiter|engineering\s+recruiter|tech\s+talent/i.test(combined)) {
    return {
      designation: 'Technical Recruiter',
      roleCategory: 'Technical Recruiter',
      contactType: contactName ? 'Named Recruiter' : 'Talent Acquisition',
      department: 'Technical Recruiting',
    };
  }
  if (/talent\s+acquisition|talent\s+partner|talentrequests|talent@/i.test(combined)) {
    return {
      designation: 'Talent Acquisition Specialist',
      roleCategory: 'Talent Acquisition Specialist',
      contactType: 'Talent Acquisition',
      department: 'Talent Acquisition',
    };
  }
  if (/recruitment\s+coordinator|hiring\s+coordinator|talent\s+coordinator/i.test(combined)) {
    return {
      designation: 'Recruitment Coordinator',
      roleCategory: 'Recruitment Coordinator',
      contactType: 'Recruitment Department',
      department: 'Talent Acquisition',
    };
  }
  if (/hiring\s+manager|engineering\s+manager|supply\s+chain\s+manager|operations\s+manager/i.test(combined)) {
    return {
      designation: 'Hiring Manager',
      roleCategory: 'Hiring Manager',
      contactType: 'Hiring Manager',
      department: 'Hiring Team',
    };
  }
  if (/hr\s+recruiter|human\s+resources|people\s+ops|people\s+team|\bhr\b/i.test(combined) || localPart.startsWith('hr')) {
    return {
      designation: 'HR Recruiter',
      roleCategory: 'HR Recruiter',
      contactType: 'HR Department',
      department: 'Human Resources',
    };
  }
  if (/recruit|hiring|opportunities|application|resume|\bcv\b|vacancy|vacancies|accommodation/i.test(combined)) {
    return {
      designation: 'General Recruitment Contact',
      roleCategory: 'General Recruitment Contact',
      contactType: 'Recruitment Department',
      department: 'Recruitment',
    };
  }
  if (localPart === 'info' || localPart === 'contact' || localPart === 'hello' || localPart === 'office') {
    return {
      designation: 'General Recruitment Contact',
      roleCategory: 'General Recruitment Contact',
      contactType: 'General Company Contact',
      department: 'General Contact',
    };
  }

  return {
    designation: 'General Recruitment Contact',
    roleCategory: 'General Recruitment Contact',
    contactType: 'Unknown',
    department: 'Recruitment',
  };
}

function tryExtractContactName(snippet: string): string | undefined {
  // Strict: only extract explicit person name appearing beside recruitment context — NEVER infer from email prefix!
  const patterns = [
    /(?:contact|reach\s+out\s+to|send\s+(?:your\s+)?(?:resume|cv|application)\s+to|recruiter|hiring\s+manager)[:\s]+([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,2})/,
    /([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,2})\s*(?:\(|<|-|,|\sat\s)\s*[a-zA-Z0-9._%+-]+@/,
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
        !lower.includes('job description') &&
        !lower.includes('need help') &&
        !lower.includes('any questions')
      ) {
        return candidate;
      }
    }
  }
  return undefined;
}

export interface ExtractedHrContactCandidate {
  email: string;
  normalizedEmail: string;
  contactName?: string;
  designation: string;
  roleCategory: HrContactRoleCategory;
  contactType: HrContactClassificationType;
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
  linkType: 'direct_posting' | 'recruitment_page' | 'department_relationship' | 'company_only';
  isRoleBased: boolean;
  confidence: number;
  evidence: string;
  hadMailto?: boolean;
  wasObfuscated?: boolean;
}

export interface ExtractContactsDiagnosticsResult {
  candidates: ExtractedHrContactCandidate[];
  rawEmailMatches: number;
  rejectedCount: number;
  rejectionReasons: string[];
}

export function extractPublicHrContactsWithDiagnostics(params: {
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
  linkType?: ExtractedHrContactCandidate['linkType'];
}): ExtractContactsDiagnosticsResult {
  if (!params.text || typeof params.text !== 'string') {
    return { candidates: [], rawEmailMatches: 0, rejectedCount: 0, rejectionReasons: [] };
  }

  const normalizedCompany = (params.companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Decode HTML entities, preserve mailto: anchors cleanly, strip scripts/styles & tags
  const decoded = decodeHtmlEntitiesForExtraction(params.text)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<a\b[^>]*href\s*=\s*["']mailto:([^"'?]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, email, label) => {
      const cleanLabel = String(label || '').replace(/<[^>]+>/g, '').trim();
      return ` [mailto:${email.trim()}] ${cleanLabel} `;
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  // 2. Detect obfuscated emails cleanly while flagging whether normalization was needed
  const hadObfuscation = /(?:\[at\]|\(at\)|\{\s*at\s*\}|<at>|\s+at\s+)[a-zA-Z0-9.-]+(?:\[dot\]|\(dot\)|\[\.\]|\s+dot\s+)/i.test(decoded);
  const cleanText = hadObfuscation ? normalizeObfuscatedEmails(decoded) : decoded;

  const emailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24})\b/g;
  const seenEmails = new Set<string>();
  const results: ExtractedHrContactCandidate[] = [];
  const rejectionReasons: string[] = [];
  let rawEmailMatches = 0;
  let rejectedCount = 0;

  let match: RegExpExecArray | null;
  while ((match = emailRegex.exec(cleanText)) !== null) {
    rawEmailMatches++;
    const rawEmail = match[1];
    const syntax = validateEmailSyntax(rawEmail);
    if (!syntax.valid) {
      rejectedCount++;
      rejectionReasons.push(`Malformed address rejected: ${rawEmail}`);
      continue;
    }

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
      rejectedCount++;
      rejectionReasons.push(`Placeholder/noise address rejected: ${email}`);
      continue;
    }

    // Filter out third-party ATS / aggregator platform addresses unless company itself is that platform
    const domainRoot = domain.split('.')[0]?.toLowerCase() || '';
    if (
      ATS_OR_BOARD_VENDOR_DOMAINS.has(domain) &&
      (!normalizedCompany || (!normalizedCompany.includes(domainRoot) && !domainRoot.includes(normalizedCompany)))
    ) {
      rejectedCount++;
      rejectionReasons.push(`Unrelated platform/ATS address skipped: ${email}`);
      continue;
    }

    const startIdx = Math.max(0, match.index - 160);
    const endIdx = Math.min(cleanText.length, match.index + rawEmail.length + 160);
    const snippet = cleanText.slice(startIdx, endIdx).trim();

    const expectedDomain = params.companyDomain?.toLowerCase().replace(/^www\./, '');
    const domainMatchesCompany = expectedDomain
      ? domain === expectedDomain || domain.endsWith(`.${expectedDomain}`)
      : Boolean(normalizedCompany && normalizedCompany.length >= 3 && domain.replace(/[^a-z0-9]/g, '').includes(normalizedCompany));

    const hadMailto = decoded.includes(`[mailto:${rawEmail}]`) || decoded.toLowerCase().includes(`[mailto:${email}]`);
    const isRoleBased = isRoleBasedEmailAddress(local);
    const contactName = !isRoleBased ? tryExtractContactName(snippet) : undefined;
    const classified = classifyHrDesignation(snippet, email, contactName);

    // Extraction signal check: recruitment OR application OR question/enquiry OR mailto OR company-domain correlation
    const hasRecruitmentOrEnquirySignal = /(career|recruit|talent|hr|hiring|people|apply|resume|cv|application|job|opportunit|question|enquir|inquir|contact\s+us|reach\s+out|need\s+help|accommodation|process|interest|submit|send\s+(?:your|us|to))/i.test(
      `${snippet} ${local}`
    );

    // Reject unrelated third-party emails (e.g. a customer client testimonial email from another domain with no recruitment link)
    if (!hasRecruitmentOrEnquirySignal && !isRoleBased && !domainMatchesCompany && !hadMailto) {
      rejectedCount++;
      rejectionReasons.push(`Unrelated non-recruitment email ignored: ${email}`);
      continue;
    }

    seenEmails.add(email);

    let confidence = 0.55;
    if (domainMatchesCompany) confidence += 0.22;
    if (hasRecruitmentOrEnquirySignal) confidence += 0.1;
    if (hadMailto) confidence += 0.05;
    if (contactName && !isRoleBased) confidence += 0.05;
    if (isRoleBased) confidence -= 0.04;
    confidence = Math.min(0.95, Math.max(0.4, Number(confidence.toFixed(2))));

    const linkType: ExtractedHrContactCandidate['linkType'] =
      params.linkType ||
      (params.jobId ? 'direct_posting' : params.sourceType.includes('career') ? 'recruitment_page' : 'company_only');

    results.push({
      email,
      normalizedEmail: email,
      contactName,
      designation: classified.designation,
      roleCategory: classified.roleCategory,
      contactType: classified.contactType,
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
      linkType,
      isRoleBased,
      confidence,
      evidence: `Published on ${params.sourceName}: "...${snippet}..."`,
      hadMailto,
      wasObfuscated: hadObfuscation,
    });
  }

  return { candidates: results, rawEmailMatches, rejectedCount, rejectionReasons };
}

/**
 * Extracts ONLY explicitly present public recruitment/HR email addresses from a text or HTML string.
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
  return extractPublicHrContactsWithDiagnostics(params).candidates;
}
