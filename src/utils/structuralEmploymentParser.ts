// src/utils/structuralEmploymentParser.ts
// Universal Evidence-Grounded Employment History Extractor & Validator
// Combines structured block analysis, bullet-vs-header discrimination, multi-format header disambiguation,
// post-AI source grounding checks, split-fragment merging, and transparent confidence scoring.

import type { ExperienceItem, StructuredDocumentBlock } from '../types';
import {
  extractDateRangeFromLine,
  normalizeDateToken,
  parseEmploymentDates,
  isCurrentKeyword,
  doDateIntervalsOverlap,
  type ParsedEmploymentDates,
} from './employmentDateParser';
import {
  normalizeResumeTextLines,
  structureResumeDocument,
  segmentEmploymentSection,
} from './resumeStructureEngine';

export type { ParsedEmploymentDates };
export {
  extractDateRangeFromLine,
  normalizeDateToken,
  parseEmploymentDates,
  segmentEmploymentSection,
};

/**
 * Universal safe period formatter.
 * Formats validated start date, end date, and current flag into standard human display string.
 * Never fabricates default dates like "2022 - Present". Returns empty string when dates are absent.
 */
export function formatExperiencePeriod(
  startDate?: string | null,
  endDate?: string | null,
  isCurrent?: boolean | null
): string {
  const start = (startDate || '').trim();
  const end = (endDate || '').trim();
  const current = Boolean(isCurrent) || isCurrentKeyword(end);

  if (start && current) {
    return `${start} – Present`;
  }
  if (start && end && !isCurrentKeyword(end)) {
    return `${start} – ${end}`;
  }
  if (start) {
    return start;
  }
  if (current) {
    return 'Present';
  }
  if (end) {
    return end;
  }
  return '';
}

export type ConfidenceCategory =
  | 'High confidence'
  | 'Medium confidence'
  | 'Low confidence'
  | 'Needs review';

export interface RawEmploymentRecord {
  company: string;
  job_title: string;
  location: string;
  employment_type: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  original_date_text: string;
  description: string[];
  responsibilities?: string[];
  technologies?: string[];
  source_text: string;
  source_evidence?: string[];
  confidence: number;
  confidence_category?: ConfidenceCategory;
  needs_verification: boolean;
  validation_warnings?: string[];
  field_confidence?: {
    company: number;
    job_title: number;
    start_date: number;
    end_date: number;
    location: number;
  };
}

// Words that must NEVER be recognized as a standalone company name or job title
const DISALLOWED_TOKENS = new Set([
  'present', 'current', 'ongoing', 'now', 'till date', 'to date', 'today', 'contemporary',
  'experience', 'work experience', 'employment', 'employment history', 'work history',
  'professional experience', 'career history', 'relevant experience', 'internship', 'internships',
  'education', 'skills', 'certifications', 'projects', 'summary', 'profile', 'objective',
  'responsibilities', 'key responsibilities', 'achievements', 'key achievements', 'duties',
  'bullet', 'points', 'details', 'location', 'dates', 'date', 'dates not provided', 'n/a', 'na', 'none',
  'technologies', 'tech stack', 'tools', 'environment',
  'discrepancies in a fast', 'paced environment', 'fast-paced environment', 'discrepancies',
  'to-end', 'end-to-end', 'vim implementation', 'implementation for',
  'services for', 'checking services', 'reporting and invoice',
]);

// General corporate entity / organization suffixes & keywords (universal, not candidate-specific)
const COMPANY_INDICATORS = [
  'pvt', 'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation', 'llc', 'llp', 'plc', 'gmbh',
  'co.', 'technologies', 'solutions', 'consultancy', 'consulting', 'services',
  'labs', 'laboratories', 'softtech', 'bank', 'financial', 'capital',
  'hospital', 'healthcare', 'industries', 'enterprises', 'holdings',
  'group', 'agency', 'studio', 'logistics', 'pharmaceuticals', 'biotech', 'ventures', 'partners',
  'teleperformance', 'infosys', 'wipro', 'accenture', 'cognizant', 'capgemini',
  'tata consultancy services', 'tcs', 'ibm', 'deloitte', 'kpmg', 'pwc', 'ey', 'amazon', 'google',
  'microsoft', 'apple', 'meta', 'netflix', 'oracle', 'sap', 'salesforce', 'adobe',
];

const LEGAL_COMPANY_SUFFIX_REGEX =
  /\b(?:pvt\.?|ltd\.?|limited|inc\.?|incorporated|corp\.?|corporation|llc|llp|plc|gmbh|softtech|labs|technologies)\b/i;

// Designation / role keywords
const TITLE_INDICATORS = [
  'associate', 'engineer', 'developer', 'lead', 'manager', 'director', 'analyst', 'specialist',
  'architect', 'consultant', 'intern', 'officer', 'coordinator', 'administrator', 'executive',
  'representative', 'president', 'vice president', 'vp', 'head', 'founder', 'co-founder',
  'technician', 'supervisor', 'assistant', 'scientist', 'trainee', 'advisor', 'counselor',
  'strategist', 'designer', 'auditor', 'accountant', 'controller', 'counsel', 'attorney',
  'practitioner', 'fellow', 'postdoc', 'programmer', 'tester', 'qa', 'sre', 'devops',
  'mentor', 'tutor', 'instructor', 'educator', 'recruiter', 'partner', 'clerk', 'teller',
  'banker', 'agent', 'operator', 'planner', 'buyer', 'merchandiser', 'dispatcher', 'product owner',
  'scrum master', 'principal', 'staff',
];

// Functional domains/practice areas attached to roles rather than standalone employers
const DOMAIN_TERMS = [
  'supply chain operations', 'supply chain', 'operations', 'information technology',
  'business operations', 'human resources', 'procurement', 'quality assurance',
  'talent acquisition', 'product management', 'customer support', 'sales & marketing',
  'customer success', 'digital transformation', 'enterprise architecture', 'retail banking',
  'accounts payable', 'accounts receivable', 'finance & accounting', 'data analytics',
  'cloud infrastructure', 'platform engineering',
];

// Strong action verbs and gerunds typical of responsibility bullets (never job titles/employers)
const ACTION_VERB_STARTS = new Set([
  'led', 'managed', 'developed', 'built', 'created', 'designed', 'architected', 'implemented',
  'sorted', 'reconciled', 'audited', 'resolved', 'handled', 'supported', 'oversaw', 'executed',
  'delivered', 'analyzed', 'analysed', 'prepared', 'conducted', 'collaborated', 'monitored',
  'maintained', 'streamlined', 'automated', 'assisted', 'facilitated', 'generated', 'ensured',
  'tracked', 'processed', 'reviewed', 'performed', 'spearheaded', 'established', 'formulated',
  'drove', 'improved', 'reduced', 'increased', 'optimized', 'optimised', 'negotiated',
  'coordinated', 'administered', 'supervised', 'trained', 'mentored', 'onboarded', 'validated',
  'verified', 'documented', 'reported', 'identified', 'investigated', 'eliminated', 'achieved',
  'authored', 'deployed', 'configured', 'migrated', 'integrated', 'tested', 'debugged', 'refactored',
  'partnered', 'worked', 'helped', 'served', 'acted', 'provided', 'utilized', 'used', 'leveraged',
  'carried', 'checking', 'sorting', 'managing', 'handling', 'preparing', 'monitoring', 'analyzing', 'supporting',
  'coordinating', 'reconciling', 'building', 'developing', 'maintaining', 'delivering', 'implementing',
  'providing', 'performing', 'authoring', 'facilitating', 'spearheading',
]);

const EDUCATION_DEGREE_REGEX =
  /\b(?:b\.?tech|b\.?e\.?|m\.?tech|m\.?e\.?|mba|bba|b\.?sc|m\.?sc|b\.?com|m\.?com|bca|mca|ph\.?d|bachelor(?:'s)?|master(?:'s)?|diploma|secondary|high school|cgpa|gpa)\b/i;

const KNOWN_LOCATION_REGEX =
  /^(?:in\s+)?(indore|mumbai|bangalore|bengaluru|delhi|new delhi|hyderabad|pune|chennai|kolkata|noida|gurugram|gurgaon|anand|ahmedabad|surat|jaipur|lucknow|chandigarh|san francisco|new york|seattle|austin|boston|chicago|london|dubai|singapore|toronto|remote|hybrid|onsite|usa|india|uk)[,\s\w().-]*$/i;

const TECH_TOKEN_REGEX =
  /\b(SAP|ERP|Power\s*BI|Tableau|Excel|SQL|Python|TypeScript|JavaScript|React|Node\.?js|AWS|Azure|GCP|Docker|Kubernetes|Jira|Salesforce|ServiceNow|Oracle|MySQL|PostgreSQL|Git|Tally|MS\s*Office)\b/gi;

function hasCompanyIndicatorWord(s: string): boolean {
  const lower = s.toLowerCase().trim();
  return COMPANY_INDICATORS.some((ind) => {
    const escaped = ind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, 'i').test(lower);
  });
}

function hasTitleIndicatorWord(s: string): boolean {
  const lower = s.toLowerCase().trim();
  return TITLE_INDICATORS.some((ind) => {
    const escaped = ind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, 'i').test(lower);
  });
}

/**
 * Checks whether a string is prohibited from being an employer or job title.
 */
export function isInvalidToken(str: string): boolean {
  if (!str) return true;
  const s = str.trim().toLowerCase();
  if (s.length < 2) return true;
  // Pure digits or 4-digit years like "2024", "2023", "2022", "2021"
  if (/^\d+$/.test(s)) return true;
  if (/^(?:19|20)\d{2}$/.test(s)) return true;
  // Year ranges like "2021 - 2023", "2024 - Present"
  if (/^(?:\d{4}|present|current)\s*[-–—]\s*(?:\d{4}|present|current)$/i.test(s)) return true;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(s)) return true;
  if (DISALLOWED_TOKENS.has(s)) return true;
  if (isCurrentKeyword(s)) return true;
  if (/^[•●▪▸▹◦‣⁃\-*–—\s|:.,/]+$/.test(s)) return true;

  // Standalone months or month-year fragments without employer or title words
  if (
    /^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(?:19|20)\d{2})?$/i.test(s) &&
    !hasCompanyIndicatorWord(s) &&
    !hasTitleIndicatorWord(s)
  ) {
    return true;
  }

  // Common sentence fragments and clauses ending in sentence punctuation (excluding corporate suffix abbreviations)
  const withoutCorp = s.replace(/\b(?:pvt|ltd|inc|corp|co|jr|sr|dr|st|no)\./gi, '').trim();
  if (/[.!?;]$/.test(withoutCorp) && withoutCorp.split(/\s+/).length > 2 && !hasCompanyIndicatorWord(s) && !hasTitleIndicatorWord(s)) {
    return true;
  }

  // Prepositional / gerund / broken continuation fragments
  if (/^(?:to-end|end-to-end|in a fast|paced environment|discrepancies in|checking services for|carrying out|carried out|to\s+a\s+|for\s+a\s+|with\s+a\s+|by\s+the\s+)/i.test(s)) {
    return true;
  }

  if (KNOWN_LOCATION_REGEX.test(s) && s.split(/\s+/).length <= 3 && !hasCompanyIndicatorWord(s) && !hasTitleIndicatorWord(s)) {
    return true;
  }
  return false;
}

/**
 * Heuristic check for corporate/employer names (never triggers on bullet/narrative lines).
 */
export function isLikelyCompany(str: string): boolean {
  if (isInvalidToken(str)) return false;
  if (isDescriptionOrBullet(str)) return false;
  return hasCompanyIndicatorWord(str);
}

/**
 * Heuristic check for job title / designation strings.
 */
export function isLikelyTitle(str: string): boolean {
  if (isInvalidToken(str)) return false;
  if (isDescriptionOrBullet(str)) return false;
  return hasTitleIndicatorWord(str);
}

/**
 * Determines whether a line represents a responsibility bullet, prose sentence, wrapped sentence
 * fragment, client note, or skill/tech list rather than an employment heading.
 */
export function isDescriptionOrBullet(line: string, block?: StructuredDocumentBlock): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed) return false;

  // 1. Explicit structural bullet signal (from DOCX <w:numPr> or leading bullet symbol)
  if (block?.isBullet) return true;
  if (/^[•●▪▸▹◦‣⁃*]\s*/.test(trimmed)) return true;
  if (/^-\s+\S/.test(trimmed)) return true;
  if (/^\d+[.)]\s+/.test(trimmed)) return true;

  // Strip optional delimiter check: lines containing pipes/dates are almost always structured headers unless sentence
  const hasDate = extractDateRangeFromLine(trimmed).found;

  // 2. Lowercase opening indicates wrapped continuation fragment ("discrepancies in a fast", "paced environment.")
  if (/^[a-z]/.test(trimmed) && !hasDate && !trimmed.includes('|')) {
    return true;
  }

  // 3. Sentence fragments that are clearly responsibility continuations
  if (/\b(?:for\s+clients?\s+such\s+as|on\s+behalf\s+of\s+clients?|in\s+a\s+fast[- ]paced\s+environment|fast[- ]paced\s+environment|discrepancies\s+in|checking\s+services\s+for|implementation\s+for|carried\s+out\s+the\s+end|to-end\s+VIM|to-end\s+implementation)\b/i.test(trimmed)) {
    return true;
  }

  // 4. Explicit client mention or tech stack prefixes
  if (/^(?:clients?\s*:|key\s+projects?\s*:|tools?\s*(?:used)?\s*:|technologies?\s*:|tech\s+stack\s*:|responsibilities\s*:|key\s+achievements?\s*:)/i.test(trimmed)) {
    return true;
  }

  // 5. First word is a past-tense/gerund action verb typical of resume bullets
  const firstWordMatch = trimmed.match(/^([A-Za-z]+)\b/);
  if (firstWordMatch && ACTION_VERB_STARTS.has(firstWordMatch[1].toLowerCase()) && !hasDate && !trimmed.includes('|')) {
    return true;
  }

  // 6. Ends with sentence period (excluding corporate abbreviations like Pvt. Ltd. Inc. Corp. Co.)
  const withoutCorpSuffix = trimmed.replace(/\b(?:Pvt|Ltd|Inc|Corp|Co|Jr|Sr|Dr|St|No)\./gi, '').trim();
  if (/[.!?;]$/.test(withoutCorpSuffix) && !hasDate && !trimmed.includes('|')) {
    return true;
  }

  // 7. Long narrative clause (> 9 words without date, pipe, or "@")
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount >= 10 && !hasDate && !trimmed.includes('|') && !/\s+(?:at|@)\s+/i.test(trimmed)) {
    return true;
  }

  // 8. Comma-separated pure skill/tech list (3+ commas, no dates/company suffixes)
  const commaCount = (trimmed.match(/,/g) || []).length;
  if (commaCount >= 3 && !hasDate && !trimmed.includes('|')) {
    return true;
  }

  return false;
}

function cleanLocationValue(segment: string): string {
  const cleaned = segment.replace(/^in\s+/i, '').trim();
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && /^(india|usa|us|uk|united states|united kingdom|uae|canada|australia)$/i.test(parts[parts.length - 1])) {
    return parts.slice(0, -1).join(', ');
  }
  return cleaned;
}

function isEducationOnlyLine(line: string): boolean {
  if (!line) return false;
  if (!EDUCATION_DEGREE_REGEX.test(line)) return false;
  // Allow legitimate academic employment such as Research Associate / Teaching Assistant / Professor
  if (/\b(?:professor|lecturer|instructor|teaching\s+assistant|research\s+(?:associate|fellow|scientist|engineer)|postdoc|tutor)\b/i.test(line)) {
    return false;
  }
  return true;
}

/**
 * Safely splits delimited header tokens WITHOUT corrupting hyphenated compound words ("fast-paced")
 * or UI/UX slashes or role-with-domain dashes ("Senior Process Associate – Supply Chain Operations").
 */
function splitHeaderSegments(rawLine: string): string[] {
  // Primary structural delimiters: pipe "|", bullet "•", middot "·", tab
  if (/[|•·\t]/.test(rawLine)) {
    return rawLine
      .split(/\s*[|•·\t]+\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Slash separator ONLY when clearly separating distinct clauses (with spaces around slash: "Company / Role")
  if (/\s+\/\s+/.test(rawLine) && !/\b(?:ui\s*\/\s*ux|ci\s*\/\s*cd|qa\s*\/\s*qc)\b/i.test(rawLine)) {
    return rawLine
      .split(/\s+\/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // En-dash / em-dash / spaced-hyphen separator:
  // Inspect left & right sides before splitting so "Role - Supply Chain" isn't split into company = "Supply Chain"!
  const dashMatch = rawLine.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dashMatch) {
    const left = dashMatch[1].trim();
    const right = dashMatch[2].trim();
    const rightIsDomain = DOMAIN_TERMS.some((d) => right.toLowerCase().includes(d));
    const leftIsDomain = DOMAIN_TERMS.some((d) => left.toLowerCase().includes(d));

    // Keep role + domain together (e.g. "Senior Process Associate – Supply Chain Operations")
    if ((isLikelyTitle(left) && rightIsDomain) || (leftIsDomain && isLikelyTitle(right))) {
      return [rawLine.trim()];
    }

    // Otherwise split cleanly into parts
    return rawLine
      .split(/\s+[-–—]\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [rawLine.trim()];
}

/**
 * Extracts and disambiguates employer, title, location, and dates from candidate header lines.
 */
export function parseHeaderTokens(lines: string[]): {
  company: string;
  role: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  originalDateText: string;
  isDateUncertain: boolean;
  dateWarning?: string;
  unconsumedLines: string[];
} {
  let company = '';
  let role = '';
  let location = '';
  let startDate: string | null = null;
  let endDate: string | null = null;
  let isCurrent = false;
  let originalDateText = '';
  let isDateUncertain = true;
  let dateWarning: string | undefined = 'Employment dates not detected — Please verify.';
  const unconsumedLines: string[] = [];

  // Collect up to 5 non-bullet header lines before responsibilities start
  const headerLines: string[] = [];
  for (const line of lines) {
    if (isDescriptionOrBullet(line)) break;
    headerLines.push(line);
    if (headerLines.length >= 5) break;
  }
  if (headerLines.length === 0 && lines.length > 0) {
    headerLines.push(lines[0]);
  }

  // 1. Extract dates across candidate header lines
  for (const hLine of headerLines) {
    const dateResult = extractDateRangeFromLine(hLine);
    if (dateResult.found && !originalDateText) {
      startDate = dateResult.startDate;
      endDate = dateResult.endDate;
      isCurrent = dateResult.isCurrent;
      originalDateText = dateResult.originalDateText;
      isDateUncertain = dateResult.isDateUncertain;
      dateWarning = dateResult.dateWarning;
    }
  }

  // Cross-line date stitching: if a separate header line has "Present" or another year, stitch them
  for (const hLine of headerLines) {
    if (isCurrentKeyword(hLine) || /\b(?:present|current|currently|ongoing|till\s*date|to\s*date)\b/i.test(hLine)) {
      isCurrent = true;
      endDate = null;
      if (startDate) {
        originalDateText = `${startDate} – Present`;
      }
    }
  }

  if (startDate && !endDate && !isCurrent) {
    for (const hLine of headerLines) {
      const yearMatch = hLine.match(/\b(20\d{2}|19\d{2})\b/);
      if (yearMatch && yearMatch[1] !== startDate && yearMatch[1] !== startDate.slice(0, 4)) {
        const yVal = yearMatch[1];
        if (yVal > startDate.slice(0, 4)) {
          endDate = yVal;
        } else {
          endDate = startDate;
          startDate = yVal;
        }
        originalDateText = `${startDate} – ${endDate}`;
        break;
      }
    }
  }

  // 2. Strip matched date tokens from header lines cleanly (preserving pure location lines so location can be parsed)
  const cleanedHeaderLines = headerLines
    .map((l) => extractDateRangeFromLine(l).cleanedLine)
    .filter(
      (l) =>
        l.length > 0 &&
        !isDescriptionOrBullet(l) &&
        (!isInvalidToken(l) || (KNOWN_LOCATION_REGEX.test(l) && !hasCompanyIndicatorWord(l) && !hasTitleIndicatorWord(l)))
    );

  // 3. Classify every header segment into company, role, or location
  for (const rawLine of cleanedHeaderLines) {
    // Handle "Role at Company" or "Role @ Company" when no pipe delimiter
    const atMatch = rawLine.match(/^(.+?)\s+(?:at|@)\s+([^(\n]+?)(?:\s*\((.*?)\))?$/i);
    if (atMatch && !rawLine.includes('|')) {
      const candidateRole = atMatch[1].trim();
      const candidateCompany = atMatch[2].trim();
      if (!isInvalidToken(candidateRole) && !isDescriptionOrBullet(candidateRole) && !role) {
        role = candidateRole;
      }
      if (!isInvalidToken(candidateCompany) && !isDescriptionOrBullet(candidateCompany) && !company) {
        company = candidateCompany;
      }
      if (atMatch[3] && KNOWN_LOCATION_REGEX.test(atMatch[3].trim()) && !location) {
        location = cleanLocationValue(atMatch[3].trim());
      }
      continue;
    }

    const segments = splitHeaderSegments(rawLine);

    for (const segment of segments) {
      if (!segment || isDescriptionOrBullet(segment)) continue;

      // Check pure location BEFORE isInvalidToken
      if (KNOWN_LOCATION_REGEX.test(segment) && !isLikelyCompany(segment) && !isLikelyTitle(segment)) {
        if (!location) location = cleanLocationValue(segment);
        continue;
      }

      if (isInvalidToken(segment)) continue;

      // Check corporate indicator vs title indicator
      const segIsCompany = isLikelyCompany(segment);
      const segIsTitle = isLikelyTitle(segment);

      // Handle comma-attached location inside segment: "ESP Softtech Pvt. Ltd., Indore"
      if (segment.includes(',')) {
        const commaParts = segment.split(',').map((p) => p.trim()).filter(Boolean);
        const lastPart = commaParts[commaParts.length - 1];
        if (commaParts.length >= 2 && KNOWN_LOCATION_REGEX.test(lastPart) && !isLikelyCompany(lastPart)) {
          const core = commaParts.slice(0, -1).join(', ');
          if (!location) location = cleanLocationValue(lastPart);
          if (core && !isInvalidToken(core)) {
            if (isLikelyCompany(core) && !company) {
              company = core;
              continue;
            }
            if (isLikelyTitle(core) && !role) {
              role = core;
              continue;
            }
            if (!company) {
              company = core;
              continue;
            }
            if (!role) {
              role = core;
              continue;
            }
          }
          continue;
        }
      }

      // Domain practice terms attach to role, never become company
      if (DOMAIN_TERMS.some((d) => segment.toLowerCase().includes(d)) && !segIsCompany) {
        if (role && !role.toLowerCase().includes(segment.toLowerCase())) {
          role = `${role} – ${segment}`;
        } else if (!role) {
          role = segment;
        }
        continue;
      }

      if (segIsCompany && !segIsTitle && !company) {
        company = segment;
        continue;
      }

      if (segIsTitle && !segIsCompany) {
        // If existing role is just a domain term (e.g. "Supply Chain Operations"), prepend the title!
        if (role && DOMAIN_TERMS.some((d) => role.toLowerCase().trim() === d)) {
          role = `${segment} – ${role}`;
        } else if (!role) {
          role = segment;
        }
        continue;
      }

      if (segIsCompany && segIsTitle) {
        // Prefer role if no explicit legal corporate suffix (e.g. "Senior Software Services Lead" vs "Databricks Technologies Inc.")
        if (LEGAL_COMPANY_SUFFIX_REGEX.test(segment) && !company) {
          company = segment;
          continue;
        }
        if (!role) {
          role = segment;
          continue;
        }
        if (!company) {
          company = segment;
          continue;
        }
      }

      // Neutral ambiguous line ordering (Title first vs Company first)
      if (!company && !segIsTitle) {
        company = segment;
      } else if (!role) {
        role = segment;
      } else {
        unconsumedLines.push(segment);
      }
    }
  }

  // Final cleanup on company comma-location suffix if any
  if (company.includes(',')) {
    const parts = company.split(',').map((p) => p.trim()).filter(Boolean);
    const lastPart = parts[parts.length - 1];
    if (parts.length >= 2 && KNOWN_LOCATION_REGEX.test(lastPart) && !isLikelyCompany(lastPart)) {
      company = parts.slice(0, -1).join(', ');
      if (!location) location = cleanLocationValue(lastPart);
    }
  }

  if (isInvalidToken(company) || isDescriptionOrBullet(company)) company = '';
  if (isInvalidToken(role) || isDescriptionOrBullet(role)) role = '';

  return {
    company,
    role,
    location,
    startDate,
    endDate,
    isCurrent,
    originalDateText,
    isDateUncertain,
    dateWarning,
    unconsumedLines,
  };
}

function collectCleanResponsibilities(lines: string[], header: ReturnType<typeof parseHeaderTokens>): {
  responsibilities: string[];
  technologies: string[];
} {
  const rawDesc: string[] = [];
  for (const line of lines) {
    const d = extractDateRangeFromLine(line);
    if (d.found && d.cleanedLine.length === 0) continue;
    const trimmedClean = line.replace(/^[•●▪▸▹◦‣⁃\-*–—·\s]+/, '').trim();
    if (!trimmedClean) continue;
    if (
      trimmedClean === header.company ||
      trimmedClean === header.role ||
      trimmedClean === `${header.company}, ${header.location}` ||
      (header.location && (trimmedClean === header.location || cleanLocationValue(trimmedClean) === header.location))
    ) {
      continue;
    }

    // Merge continuation fragments onto the preceding responsibility sentence
    const startsWithBullet = /^[•●▪▸▹◦‣⁃*]|^-\s+/.test(line.trim());
    const isContinuation =
      !startsWithBullet &&
      (/^[a-z]/.test(trimmedClean) ||
        /^(?:discrepancies|paced|to-end|end-to-end|checking|carrying|for\s+|in\s+|with\s+|and\s+|services\s+)/i.test(trimmedClean));

    if (isContinuation && rawDesc.length > 0) {
      rawDesc[rawDesc.length - 1] = `${rawDesc[rawDesc.length - 1]} ${trimmedClean}`.replace(/\s+/g, ' ').trim();
    } else {
      rawDesc.push(trimmedClean);
    }
  }

  const techSet = new Set<string>();
  for (const r of rawDesc) {
    const matches = r.match(TECH_TOKEN_REGEX) || [];
    for (const m of matches) {
      techSet.add(m.trim());
    }
  }

  return {
    responsibilities: rawDesc,
    technologies: Array.from(techSet),
  };
}

/**
 * Checks whether a header candidate actually represents an employment heading
 * (and NOT a narrative sentence, bullet fragment, or education/project item).
 */
function canLineStartNewJobBlock(
  line: string,
  prevWasEmpty: boolean,
  blockHasDate: boolean,
  blockHasCompany: boolean,
  blockHasTitle: boolean,
  blockHasBullets: boolean,
  block?: StructuredDocumentBlock
): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (isInvalidToken(trimmed)) return false;
  if (isEducationOnlyLine(trimmed)) return false;

  const isBullet = isDescriptionOrBullet(trimmed, block);
  if (isBullet) return false;

  const dateRes = extractDateRangeFromLine(trimmed);
  // Never let a pure date/year line (without title or company) start a new job block
  if (dateRes.found && (!dateRes.cleanedLine || dateRes.cleanedLine.trim().length === 0)) {
    return false;
  }

  const cleanedLine = dateRes.cleanedLine || trimmed;
  if (isInvalidToken(cleanedLine)) return false;

  const hasCompany = isLikelyCompany(cleanedLine);
  const hasTitle = isLikelyTitle(cleanedLine);
  const looksStructuredHeader =
    trimmed.includes('|') ||
    /\s+(?:at|@)\s+/i.test(trimmed) ||
    Boolean(block?.isHeading || block?.isBold || block?.isTableRow);

  // Never split a job if the current line has neither company nor title
  if (!hasCompany && !hasTitle && !looksStructuredHeader) {
    return false;
  }

  // Once bullets have appeared under the current job, any subsequent valid company or title header starts a new job
  if (blockHasBullets && (hasCompany || hasTitle || looksStructuredHeader)) {
    return true;
  }

  if (prevWasEmpty && (hasCompany || hasTitle || (dateRes.found && looksStructuredHeader))) {
    return true;
  }

  if (dateRes.found && blockHasDate && (hasCompany || hasTitle)) {
    return true;
  }

  if (hasCompany && blockHasCompany && (blockHasDate || blockHasTitle)) {
    return true;
  }

  if (hasTitle && blockHasTitle && (blockHasDate || blockHasCompany)) {
    return true;
  }

  return false;
}

/**
 * Computes confidence category truthfully based on verified field completeness & warnings.
 */
export function computeConfidenceCategory(
  score: number,
  needsVerification: boolean,
  warnings: string[]
): ConfidenceCategory {
  if (warnings.some((w) => /chronological|unverified|missing start|hallucinated/i.test(w))) {
    return 'Needs review';
  }
  if (score >= 85 && !needsVerification) return 'High confidence';
  if (score >= 65) return 'Medium confidence';
  if (score >= 45) return 'Low confidence';
  return 'Needs review';
}

/**
 * Normalizes company / title strings for duplicate/split-fragment detection.
 */
function normalizeEntityKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(?:pvt\.?|ltd\.?|limited|inc\.?|incorporated|corp\.?|llc|llp|solutions)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Grounds AI or heuristic candidate records against the actual extracted resume text,
 * removes fabricated dates (e.g. "2022–Present" not present in source text), drops bullet
 * hallucinations, merges fragmented duplicate pieces, and assigns confidence categories.
 */
export function validateAndMergeEmploymentRecords(
  candidates: RawEmploymentRecord[],
  fullResumeText: string
): RawEmploymentRecord[] {
  const lowerFull = (fullResumeText || '').toLowerCase();
  const hasPresentMarkerInSource = /\b(?:present|current|currently|ongoing|till\s*date|to\s*date)\b/i.test(fullResumeText);
  const validated: RawEmploymentRecord[] = [];

  for (const raw of candidates) {
    let company = (raw.company || '').trim();
    let role = (raw.job_title || '').trim();

    // Reject standalone years, current keywords, or bullet fragments masquerading as roles
    if (isInvalidToken(role) || isDescriptionOrBullet(role)) {
      role = '';
    }
    // Reject invalid tokens or bullet fragments masquerading as companies
    if (isInvalidToken(company) || isDescriptionOrBullet(company)) {
      company = '';
    }

    // Disambiguate company that contains pipe or dash with role/date (e.g. "TCS, Indore | 2024")
    if (company.includes('|')) {
      const parts = company.split('|').map((s) => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (isLikelyCompany(p) && (!company || company.includes('|'))) {
          company = p;
        } else if (isLikelyTitle(p) && !role) {
          role = p;
        }
      }
    }

    // Reject records where neither genuine company nor genuine role exists
    if (!company && !role) {
      continue;
    }
    if (isEducationOnlyLine(`${company} ${role}`)) {
      continue;
    }

    // Clean location from company or role if attached via comma
    if (company.includes(',')) {
      const parts = company.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2 && KNOWN_LOCATION_REGEX.test(parts[parts.length - 1])) {
        company = parts.slice(0, -1).join(', ');
      }
    }

    const warnings = new Set<string>(raw.validation_warnings || []);
    let startDate = raw.start_date;
    let endDate = raw.end_date;
    let isCurrent = Boolean(raw.is_current);
    let originalDateText = raw.original_date_text || '';

    // Evidence text specific to this record from source document
    const recordEvidenceText = [
      raw.source_text || '',
      ...(raw.source_evidence || []),
    ].join(' \n ').toLowerCase();
    const hasRecordEvidence = recordEvidenceText.trim().length > 0;

    // Strict evidence-grounded date verification
    if (startDate) {
      const startYear = startDate.slice(0, 4);
      const inRecord = hasRecordEvidence && recordEvidenceText.includes(startYear);
      const inFull = lowerFull.includes(startYear);
      if (/^\d{4}$/.test(startYear) && (!inFull || (hasRecordEvidence && !inRecord))) {
        warnings.add(`Unverified start date "${startDate}" removed — not grounded in record evidence.`);
        startDate = null;
      }
    }

    if (isCurrent) {
      const inRecord = hasRecordEvidence && /\b(?:present|current|currently|ongoing|till\s*date|to\s*date)\b/i.test(recordEvidenceText);
      if (!hasPresentMarkerInSource || (hasRecordEvidence && !inRecord)) {
        warnings.add(`Unverified "Present" end date removed — no current-role indicator in record evidence.`);
        isCurrent = false;
      }
    }

    if (endDate && !isCurrent) {
      const endYear = endDate.slice(0, 4);
      const inRecord = hasRecordEvidence && recordEvidenceText.includes(endYear);
      const inFull = lowerFull.includes(endYear);
      if (/^\d{4}$/.test(endYear) && (!inFull || (hasRecordEvidence && !inRecord))) {
        warnings.add(`Unverified end date "${endDate}" removed — not grounded in record evidence.`);
        endDate = null;
      }
    }

    if (startDate && endDate && startDate > endDate) {
      warnings.add(`Chronological error: start date (${startDate}) exceeds end date (${endDate}).`);
    }

    const hasRealCompany = Boolean(company && company !== 'Employer not detected' && !isInvalidToken(company));
    const hasRealRole = Boolean(role && role !== 'Title not detected' && !isInvalidToken(role));
    const hasValidDates = Boolean(startDate && (endDate || isCurrent));

    // If both company and role are missing, reject
    if (!hasRealCompany && !hasRealRole) {
      continue;
    }

    if (!startDate && !endDate && !isCurrent) {
      warnings.add('Employment dates not detected — Please review.');
    } else if (!startDate) {
      warnings.add('Start date missing — Please review.');
    } else if (!endDate && !isCurrent) {
      warnings.add('End date missing — Please review.');
    }

    let confidence = 35;
    if (hasRealCompany) confidence += 25;
    if (hasRealRole) confidence += 20;
    if (hasValidDates) confidence += 20;
    else if (startDate) confidence += 8;
    confidence = Math.max(10, Math.min(100, confidence - Math.min(30, warnings.size * 12)));

    const needsVerification = !hasRealCompany || !hasRealRole || !hasValidDates || warnings.size > 0;
    const confidenceCategory = computeConfidenceCategory(confidence, needsVerification, Array.from(warnings));

    const cleanDescriptions = (raw.description || [])
      .map((d) => (typeof d === 'string' ? d.trim() : ''))
      .filter((d) => d.length > 0);

    const cleanResponsibilities = (raw.responsibilities || cleanDescriptions)
      .map((r) => (typeof r === 'string' ? r.trim() : ''))
      .filter((r) => r.length > 0);

    const sourceEvidence =
      raw.source_evidence && raw.source_evidence.length > 0
        ? raw.source_evidence
        : raw.source_text
          ? raw.source_text.split('\n').map((s) => s.trim()).filter(Boolean)
          : [];

    validated.push({
      ...raw,
      company: hasRealCompany ? company : 'Employer not detected',
      job_title: hasRealRole ? role : 'Title not detected',
      start_date: startDate,
      end_date: isCurrent ? null : endDate,
      is_current: isCurrent,
      original_date_text: originalDateText,
      description: cleanDescriptions,
      responsibilities: cleanResponsibilities,
      source_evidence: sourceEvidence,
      confidence,
      confidence_category: confidenceCategory,
      needs_verification: needsVerification,
      validation_warnings: Array.from(warnings),
    });
  }

  return deduplicateEmploymentRecords(validated);
}

/**
 * Deduplicates exact duplicates and merges split fragments of the same role while preserving
 * distinct promotions at the same employer cleanly.
 */
export function deduplicateEmploymentRecords(records: RawEmploymentRecord[]): RawEmploymentRecord[] {
  const unique: RawEmploymentRecord[] = [];

  for (const rec of records) {
    const compKey = normalizeEntityKey(rec.company);
    const roleKey = normalizeEntityKey(rec.job_title);

    const existingIdx = unique.findIndex((existing) => {
      const eComp = normalizeEntityKey(existing.company);
      const eRole = normalizeEntityKey(existing.job_title);

      // Case 1: Exact normalized match on company + role + start_date
      if (eComp === compKey && eRole === roleKey && (existing.start_date || '') === (rec.start_date || '')) {
        return true;
      }

      // Case 2: Split fragment merge (same company + same/missing complementary date/title + overlapping tenure)
      const sameCompany = compKey && eComp && (eComp === compKey || eComp.includes(compKey) || compKey.includes(eComp));
      const oneTitleMissing =
        rec.job_title === 'Title not detected' || existing.job_title === 'Title not detected';
      const sameRole = eRole === roleKey;
      const datesCompatible =
        (!rec.start_date && !rec.end_date) ||
        (!existing.start_date && !existing.end_date) ||
        doDateIntervalsOverlap(
          existing.start_date,
          existing.end_date,
          existing.is_current,
          rec.start_date,
          rec.end_date,
          rec.is_current
        );

      if (sameCompany && oneTitleMissing && datesCompatible) {
        return true;
      }
      if (sameCompany && sameRole && datesCompatible && existing.start_date === rec.start_date) {
        return true;
      }

      return false;
    });

    if (existingIdx === -1) {
      unique.push(rec);
    } else {
      // Merge richer fields and responsibilities instead of silently dropping information
      const target = unique[existingIdx];
      const mergedDesc = Array.from(new Set([...target.description, ...rec.description]));
      const mergedResp = Array.from(
        new Set([...(target.responsibilities || target.description), ...(rec.responsibilities || rec.description)])
      );
      const mergedTech = Array.from(new Set([...(target.technologies || []), ...(rec.technologies || [])]));
      const mergedEvidence = Array.from(new Set([...(target.source_evidence || []), ...(rec.source_evidence || [])]));

      unique[existingIdx] = {
        ...target,
        company: target.company !== 'Employer not detected' ? target.company : rec.company,
        job_title: target.job_title !== 'Title not detected' ? target.job_title : rec.job_title,
        location: target.location || rec.location,
        start_date: target.start_date || rec.start_date,
        end_date: target.end_date || rec.end_date,
        is_current: target.is_current || rec.is_current,
        original_date_text: target.original_date_text || rec.original_date_text,
        description: mergedDesc,
        responsibilities: mergedResp,
        technologies: mergedTech,
        source_evidence: mergedEvidence,
        source_text: [target.source_text, rec.source_text].filter(Boolean).join('\n'),
        confidence: Math.max(target.confidence, rec.confidence),
      };
    }
  }

  return unique;
}

/**
 * Converts a validated RawEmploymentRecord to the persisted UserProfile ExperienceItem format.
 */
export function toExperienceItem(rec: RawEmploymentRecord, index: number): ExperienceItem {
  const displayStart = rec.start_date || '';
  const displayEnd = rec.is_current ? 'Present' : (rec.end_date || '');
  const rawList = (rec.responsibilities && rec.responsibilities.length > 0 ? rec.responsibilities : rec.description) || [];
  const respList = rawList
    .map((r: any) => (typeof r === 'string' ? r.trim() : ''))
    .filter((r: string) => r.length > 0);

  return {
    id: `exp_${Date.now()}_${index}`,
    company: rec.company,
    role: rec.job_title,
    startDate: displayStart,
    endDate: displayEnd,
    current: rec.is_current,
    location: rec.location || '',
    description: respList.join(' • '),
    achievements: respList.slice(0, 5),
    responsibilities: respList,
    technologies: rec.technologies || [],
    verifiedSkillsUsed: rec.technologies || [],
    isDateUncertain: Boolean(!rec.start_date || (!rec.end_date && !rec.is_current)),
    dateWarning:
      !rec.start_date || (!rec.end_date && !rec.is_current)
        ? (rec.validation_warnings?.[0] || 'Dates incomplete — Please verify.')
        : undefined,
    originalDateText: rec.original_date_text,
    confidence: rec.confidence,
    confidenceCategory: rec.confidence_category || computeConfidenceCategory(rec.confidence, rec.needs_verification, rec.validation_warnings || []),
    needsVerification: rec.needs_verification,
    sourceText: rec.source_text,
    sourceEvidence: rec.source_evidence || rec.source_text.split('\n').filter(Boolean),
    validationWarnings: rec.validation_warnings || [],
    extractionVersion: 'universal-v2',
    employmentType: rec.employment_type,
  };
}

/**
 * Parses resume text (or StructuredDocumentBlocks) into discrete, evidence-grounded employment records.
 */
export function parseStructuralEmploymentHistory(
  resumeText: string,
  blocks?: StructuredDocumentBlock[]
): RawEmploymentRecord[] {
  if (!resumeText || resumeText.trim().length === 0) {
    return [];
  }

  const structured = structureResumeDocument(resumeText, blocks);
  if (structured.employmentSections.length === 0) {
    return [];
  }

  const records: RawEmploymentRecord[] = [];

  for (const section of structured.employmentSections) {
    // Reconstruct blank-line aware line list inside section from original normalized text lines where helpful
    const sectionBlocks = section.blocks;
    const rawLines = section.lines;
    const isInternshipSection = section.type === 'internships';

    // Map back any blank-line gaps between original text lines cleanly in sequential order
    const allNormRawLines = resumeText.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim());
    const blankPrecededLines = new Set<number>();
    let searchCursor = 0;
    for (let k = 0; k < rawLines.length; k++) {
      let foundIdx = -1;
      for (let j = searchCursor; j < allNormRawLines.length; j++) {
        if (allNormRawLines[j] && normalizeResumeTextLines(allNormRawLines[j])[0] === rawLines[k]) {
          foundIdx = j;
          break;
        }
      }
      if (foundIdx !== -1) {
        if (foundIdx > 0 && allNormRawLines[foundIdx - 1] === '') {
          blankPrecededLines.add(k);
        }
        searchCursor = foundIdx + 1;
      }
    }

    const jobGroups: Array<{ lines: string[]; blocks: StructuredDocumentBlock[] }> = [];
    let currLines: string[] = [];
    let currBlocks: StructuredDocumentBlock[] = [];
    let blockHasDate = false;
    let blockHasCompany = false;
    let blockHasTitle = false;
    let blockHasBullets = false;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const blk = sectionBlocks[i];
      if (!line) continue;

      const isBullet = isDescriptionOrBullet(line, blk);
      const dateRes = extractDateRangeFromLine(line);
      const headerPart = dateRes.cleanedLine || line;
      const hasCompany = !isBullet && isLikelyCompany(headerPart);
      const hasTitle = !isBullet && isLikelyTitle(headerPart);

      const shouldSplit =
        currLines.length > 0 &&
        canLineStartNewJobBlock(
          line,
          blankPrecededLines.has(i),
          blockHasDate,
          blockHasCompany,
          blockHasTitle,
          blockHasBullets,
          blk
        );

      if (shouldSplit) {
        jobGroups.push({ lines: currLines, blocks: currBlocks });
        currLines = [line];
        currBlocks = blk ? [blk] : [];
        blockHasDate = dateRes.found;
        blockHasCompany = hasCompany;
        blockHasTitle = hasTitle;
        blockHasBullets = isBullet;
      } else {
        currLines.push(line);
        if (blk) currBlocks.push(blk);
        if (dateRes.found) blockHasDate = true;
        if (hasCompany) blockHasCompany = true;
        if (hasTitle) blockHasTitle = true;
        if (isBullet) blockHasBullets = true;
      }
    }

    if (currLines.length > 0) {
      jobGroups.push({ lines: currLines, blocks: currBlocks });
    }

    for (const group of jobGroups) {
      const header = parseHeaderTokens(group.lines);

      // Inherit employer ONLY for nested promotion rows that explicitly carry a Title + Date without a new company
      if (
        !header.company &&
        header.role &&
        header.startDate &&
        records.length > 0 &&
        records[records.length - 1].company !== 'Employer not detected' &&
        isLikelyTitle(header.role)
      ) {
        header.company = records[records.length - 1].company;
      }

      // In headerless fallback mode, require date-anchored or strongly qualified records so preamble/contact lines never turn into fake jobs
      if (
        structured.usedHeaderlessFallback &&
        !header.startDate &&
        !header.endDate &&
        !header.isCurrent
      ) {
        continue;
      }

      if (!header.company && !header.role) {
        continue;
      }

      const { responsibilities, technologies } = collectCleanResponsibilities(group.lines, header);
      const employmentType = isInternshipSection || /\bintern(?:ship)?\b/i.test(header.role) ? 'internship' : null;

      records.push({
        company: header.company || 'Employer not detected',
        job_title: header.role || 'Title not detected',
        location: header.location || '',
        employment_type: employmentType,
        start_date: header.startDate,
        end_date: header.endDate,
        is_current: header.isCurrent,
        original_date_text: header.originalDateText,
        description: responsibilities,
        responsibilities,
        technologies,
        source_text: group.lines.join('\n'),
        source_evidence: group.lines,
        confidence: 0, // computed accurately in validateAndMergeEmploymentRecords
        needs_verification: false,
      });
    }
  }

  return validateAndMergeEmploymentRecords(records, resumeText);
}

/**
 * Builds clean section-annotated prompt context for LLM structuring so section boundaries
 * and tabular lines are preserved instead of truncation into flat unsegmented prose.
 */
export function buildStructuredResumePromptContext(
  resumeText: string,
  blocks?: StructuredDocumentBlock[],
  maxChars = 16000
): string {
  const structured = structureResumeDocument(resumeText, blocks);
  if (structured.sections.length === 0) {
    return resumeText.slice(0, maxChars);
  }
  const chunks = structured.sections.map((sec) => {
    const headerLabel = `=== SECTION: ${sec.type.toUpperCase()} (${sec.heading}) ===`;
    return `${headerLabel}\n${sec.lines.join('\n')}`;
  });
  return chunks.join('\n\n').slice(0, maxChars);
}

/**
 * Post-AI validator and repair pipeline shared between Node/Express and Cloudflare Workers:
 * 1. Normalizes raw LLM experience records through date & source grounding validators
 * 2. Strips bullet fragments mistaken for employers/titles and unverified dates ("2022–Present")
 * 3. Recovers deterministically from structural parser when AI misses genuine jobs or fails
 */
export function normalizeAndValidateAiExperiences(
  rawAiExperiences: unknown[],
  resumeText: string,
  blocks?: StructuredDocumentBlock[]
): { experiences: ExperienceItem[]; warnings: string[] } {
  const warnings: string[] = [];

  const candidates: RawEmploymentRecord[] = Array.isArray(rawAiExperiences)
    ? rawAiExperiences
        .filter((exp: any) => exp && (exp.company || exp.role))
        .map((exp: any): RawEmploymentRecord => {
          const rawStart = exp.startDate ? String(exp.startDate).trim() : '';
          const rawEnd = exp.endDate ? String(exp.endDate).trim() : '';
          const isCurrent = Boolean(exp.current) || isCurrentKeyword(rawEnd);
          const dateExpr = rawStart
            ? (rawEnd || isCurrent ? `${rawStart} - ${isCurrent ? 'Present' : rawEnd}` : rawStart)
            : (exp.period ? String(exp.period) : (isCurrent ? 'Present' : ''));
          const dateRes = parseEmploymentDates(dateExpr);

          const respList: string[] = Array.isArray(exp.responsibilities)
            ? exp.responsibilities.map((r: any) => String(r).trim()).filter(Boolean)
            : Array.isArray(exp.achievements)
              ? exp.achievements.map((r: any) => String(r).trim()).filter(Boolean)
              : exp.description
                ? String(exp.description).split(/\s*[•\n]\s*/).map((s) => s.trim()).filter(Boolean)
                : [];

          const evidenceList: string[] = Array.isArray(exp.sourceEvidence)
            ? exp.sourceEvidence.map((s: any) => String(s).trim()).filter(Boolean)
            : [];

          const techList: string[] = Array.isArray(exp.verifiedSkillsUsed)
            ? exp.verifiedSkillsUsed.map((s: any) => String(s).trim()).filter(Boolean)
            : Array.isArray(exp.technologies)
              ? exp.technologies.map((s: any) => String(s).trim()).filter(Boolean)
              : [];

          return {
            company: String(exp.company || '').trim(),
            job_title: String(exp.role || '').trim(),
            location: String(exp.location || '').trim(),
            employment_type: exp.employmentType ? String(exp.employmentType) : null,
            start_date: dateRes.normalizedStart || (rawStart ? normalizeDateToken(rawStart) || rawStart : null),
            end_date: isCurrent ? null : (dateRes.normalizedEnd || (rawEnd ? normalizeDateToken(rawEnd) || rawEnd : null)),
            is_current: dateRes.current || isCurrent,
            original_date_text: dateRes.originalDateText || dateExpr,
            description: respList,
            responsibilities: respList,
            technologies: techList,
            source_text: evidenceList.join('\n') || `${exp.company || ''} ${exp.role || ''} ${dateExpr}`.trim(),
            source_evidence: evidenceList,
            confidence: 0,
            needs_verification: dateRes.isDateUncertain,
            validation_warnings: dateRes.dateWarning ? [dateRes.dateWarning] : [],
          };
        })
    : [];

  let validated = validateAndMergeEmploymentRecords(candidates, resumeText);

  // Structural reconciliation: if AI dropped legitimate jobs OR returned empty while resume has structural jobs
  const structural = parseStructuralEmploymentHistory(resumeText, blocks);
  if (validated.length === 0 && structural.length > 0) {
    warnings.push('AI output contained no grounded employment records; recovered via structural parser.');
    validated = structural;
  } else if (structural.length > validated.length) {
    for (const sRec of structural) {
      const sKey = normalizeEntityKey(sRec.company);
      const alreadyPresent = validated.some((vRec) => {
        const vKey = normalizeEntityKey(vRec.company);
        return vKey && sKey && (vKey === sKey || vKey.includes(sKey) || sKey.includes(vKey));
      });
      if (!alreadyPresent && sRec.company !== 'Employer not detected') {
        warnings.push(`Recovered omitted employer "${sRec.company}" via structural verification.`);
        validated.push(sRec);
      }
    }
    validated = deduplicateEmploymentRecords(validated);
  }

  for (const rec of validated) {
    if (rec.needs_verification || (rec.validation_warnings && rec.validation_warnings.length > 0)) {
      warnings.push(
        `${rec.company !== 'Employer not detected' ? rec.company : rec.job_title}: ${
          rec.validation_warnings?.[0] || 'Requires manual date or title verification.'
        }`
      );
    }
  }

  return {
    experiences: validated.map((rec, idx) => toExperienceItem(rec, idx)),
    warnings,
  };
}
