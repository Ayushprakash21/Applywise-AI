// src/utils/structuralEmploymentParser.ts
// Production-grade Structural Resume Employment History & Date Extraction Engine

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
  source_text: string;
  confidence: number;
  needs_verification: boolean;
  field_confidence?: {
    company: number;
    job_title: number;
    start_date: number;
    end_date: number;
    location: number;
  };
}

export interface ParsedEmploymentDates {
  startDate: string;
  endDate: string;
  current: boolean;
  isDateUncertain: boolean;
  dateWarning?: string;
  durationMonths: number;
  originalDateText?: string;
  normalizedStart?: string | null;
  normalizedEnd?: string | null;
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

// Words that must NEVER be recognized as a company name or job title
const DISALLOWED_TOKENS = new Set([
  'present', 'current', 'ongoing', 'now', 'till date', 'to date', 'today', 'contemporary',
  'experience', 'work experience', 'employment', 'employment history', 'work history',
  'professional experience', 'career history', 'relevant experience',
  'education', 'skills', 'certifications', 'projects', 'summary', 'profile',
  'responsibilities', 'achievements', 'key achievements', 'duties',
  'bullet', 'points', 'details', 'location', 'dates', 'date'
]);

// Common corporate indicators
const COMPANY_INDICATORS = [
  'tcs', 'tata consultancy services', 'infosys', 'wipro', 'accenture', 'cognizant', 'capgemini',
  'ibm', 'deloitte', 'kpmg', 'pwc', 'ey', 'amazon', 'google', 'microsoft', 'apple', 'meta', 'netflix',
  'services', 'technologies', 'tech', 'solutions', 'consultancy', 'consulting', 'pvt', 'ltd', 'limited',
  'inc', 'incorporated', 'corp', 'corporation', 'llc', 'systems', 'labs', 'laboratories', 'bank',
  'financial', 'hospital', 'health', 'healthcare', 'university', 'college', 'institute', 'school',
  'industries', 'enterprises', 'associates', 'holdings', 'group', 'agency', 'studio', 'logistics',
  'pharmaceuticals', 'biotech', 'ventures', 'partners'
];

// Common designation/title indicators
const TITLE_INDICATORS = [
  'associate', 'engineer', 'developer', 'lead', 'manager', 'director', 'analyst', 'specialist',
  'architect', 'consultant', 'intern', 'officer', 'coordinator', 'administrator', 'executive',
  'representative', 'president', 'vice president', 'vp', 'head', 'founder', 'co-founder',
  'specialist', 'technician', 'supervisor', 'assistant', 'scientist', 'trainee', 'advisor',
  'strategist', 'designer', 'auditor', 'accountant', 'controller', 'counsel', 'attorney',
  'practitioner', 'fellow', 'postdoc', 'programmer', 'tester', 'qa', 'sre', 'devops'
];

// Business domain / function terms (which are NOT company names)
const DOMAIN_TERMS = [
  'supply chain operations', 'supply chain', 'operations', 'information technology',
  'business operations', 'human resources', 'procurement', 'quality assurance',
  'talent acquisition', 'product management', 'customer support', 'sales & marketing',
  'customer success', 'digital transformation', 'enterprise architecture'
];

/**
 * Normalizes a month/year or year token into YYYY-MM or YYYY format.
 */
export function normalizeDateToken(token: string): string | null {
  if (!token) return null;
  const t = token.trim().toLowerCase();

  // Explicit current tokens
  if (/^(present|current|ongoing|now|till\s*date|to\s*date)$/i.test(t)) {
    return null;
  }

  // MM/YYYY or M/YYYY
  const slashMatch = t.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const year = slashMatch[2];
    if (parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
      return `${year}-${month}`;
    }
  }

  // Month YYYY (e.g. September 2024 or Sep 2024)
  const monthYearMatch = t.match(/^([a-zA-Z]+)[\s,]+(\d{4})$/);
  if (monthYearMatch) {
    const mStr = monthYearMatch[1].toLowerCase();
    const year = monthYearMatch[2];
    if (MONTH_MAP[mStr]) {
      return `${year}-${MONTH_MAP[mStr]}`;
    }
  }

  // YYYY alone
  const yearMatch = t.match(/^(\d{4})$/);
  if (yearMatch) {
    return yearMatch[1];
  }

  // Check if year is contained within string (e.g. "2024.")
  const innerYear = t.match(/\b(19\d\d|20\d\d)\b/);
  if (innerYear) {
    // Check if month preceded it
    const innerMonthMatch = t.match(new RegExp(`\\b(${Object.keys(MONTH_MAP).join('|')})\\b`, 'i'));
    if (innerMonthMatch) {
      const mStr = innerMonthMatch[1].toLowerCase();
      return `${innerYear[1]}-${MONTH_MAP[mStr]}`;
    }
    return innerYear[1];
  }

  return null;
}

/**
 * Checks if a line is a description bullet point or action item.
 */
export function isDescriptionOrBullet(line: string): boolean {
  if (!line) return false;
  const s = line.trim();
  if (/^[•\-*–—·\d+\.]\s+/.test(s)) return true;
  if (/^(developed|engineered|designed|led|built|managed|architected|implemented|created|spearheaded|achieved|coordinated|conducted|facilitated|analyzed|optimized|handled|supported|streamlined|automated|collaborated|executed|resolved|provided|participated|oversaw|delivered|maintained|improved|monitored|trained|mentored|regularly|consistently|successfully)\b/i.test(s)) return true;
  if (s.endsWith('.') && s.split(/\s+/).length > 4) return true;
  return false;
}

/**
 * Extracts date range expression from text if present.
 * Delimiters such as |, •, and / outside the date match are preserved.
 */
export function extractDateRangeFromLine(line: string): {
  found: boolean;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  originalDateText: string;
  isDateUncertain: boolean;
  dateWarning?: string;
  cleanedLine: string;
} {
  const datePatterns = [
    // Month YYYY - Month YYYY / Present (e.g. "September 2024 – Present", "Jan 2022 - Dec 2023")
    /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4})\s*(?:[-–—]|to|until|through)\s*((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}|present|current|ongoing|now|till\s*date|to\s*date)\b/i,

    // MM/YYYY - MM/YYYY / Present
    /\b(\d{1,2}\/\d{4})\s*(?:[-–—]|to|until|through)\s*(\d{1,2}\/\d{4}|present|current|ongoing|now)\b/i,

    // YYYY - YYYY / Present (e.g. "2022 – 2024", "2022 - Present")
    /\b((?:19\d\d|20\d\d))\s*(?:[-–—]|to|until|through)\s*((?:19\d\d|20\d\d)|present|current|ongoing|now|till\s*date|to\s*date)\b/i,

    // Invalid range "Present – Present"
    /\b(present|current)\s*[-–—]\s*(present|current)\b/i,

    // Standalone "YYYY - " (missing end date)
    /\b((?:19\d\d|20\d\d))\s*[-–—]\s*(?=[,\s\)]|$)/i,

    // Single Month YYYY (e.g. "September 2024")
    /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4})\b/i,

    // Single YYYY standalone (e.g. "| 2024" or "(2024)")
    /(?:^|[\(\|\s])((?:19\d\d|20\d\d))(?=[,\)\|\s]|$)/i,
  ];

  for (const pattern of datePatterns) {
    const match = line.match(pattern);
    if (match) {
      const fullMatch = match[0].trim();

      // Check if it's the invalid Present - Present pattern
      if (/^(present|current)\s*[-–—]\s*(present|current)$/i.test(fullMatch)) {
        const cleaned = line.replace(pattern, '')
          .replace(/\(\s*\)/g, ' ')
          .replace(/\[\s*\]/g, ' ')
          .replace(/\s*[|•·/]\s*[|•·/]+/g, ' | ')
          .replace(/^[\s|•·/–—\-]+/, '')
          .replace(/[\s|•·/–—\-]+$/, '')
          .replace(/\s+/g, ' ')
          .trim();

        return {
          found: true,
          startDate: null,
          endDate: null,
          isCurrent: false,
          originalDateText: fullMatch,
          isDateUncertain: true,
          dateWarning: 'Invalid date range: Present – Present',
          cleanedLine: cleaned
        };
      }

      // Check standard range
      const rawStart = match[1] ? match[1].trim() : '';
      const rawEnd = match[2] ? match[2].trim() : '';

      const isCurrent = /^(present|current|ongoing|now|till\s*date|to\s*date)$/i.test(rawEnd);
      const normalizedStart = normalizeDateToken(rawStart);
      const normalizedEnd = isCurrent ? null : normalizeDateToken(rawEnd);

      let isDateUncertain = false;
      let dateWarning: string | undefined;

      if (!normalizedStart) {
        isDateUncertain = true;
        dateWarning = 'Start date not detected.';
      } else if (!isCurrent && !normalizedEnd && !rawEnd) {
        isDateUncertain = true;
        dateWarning = 'End date not detected and not assumed to be Present.';
      }

      // Preserve delimiters in the line outside of the matched date
      const cleanedLine = line.replace(match[0], '')
        .replace(/\(\s*\)/g, ' ')
        .replace(/\[\s*\]/g, ' ')
        .replace(/\s*[|•·/]\s*[|•·/]+/g, ' | ')
        .replace(/^[\s|•·/–—\-]+/, '')
        .replace(/[\s|•·/–—\-]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        found: true,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        isCurrent,
        originalDateText: fullMatch,
        isDateUncertain,
        dateWarning,
        cleanedLine
      };
    }
  }

  return {
    found: false,
    startDate: null,
    endDate: null,
    isCurrent: false,
    originalDateText: '',
    isDateUncertain: true,
    dateWarning: 'Employment dates not detected — Please verify.',
    cleanedLine: line
  };
}

/**
 * Checks if a string is prohibited from being a job title or company name.
 */
export function isInvalidToken(str: string): boolean {
  if (!str) return true;
  const s = str.trim().toLowerCase();
  if (s.length < 2) return true;

  // Pure digits or year
  if (/^\d+$/.test(s)) return true;

  // Exact disallowed tokens
  if (DISALLOWED_TOKENS.has(s)) return true;

  // Date ranges like "2022 - present", "2022-2024"
  if (/^(?:\d{4}|present)\s*[-–—]\s*(?:\d{4}|present)$/i.test(s)) return true;

  // Starts or ends with disallowed keywords alone
  if (/^(present|current|ongoing)$/i.test(s)) return true;

  // Bullet marks alone
  if (/^[•\-*–—\s]+$/.test(s)) return true;

  // Pure locations alone
  if (/^(indore|mumbai|bangalore|delhi|pune|hyderabad|new york|san francisco|london|remote|hybrid|india|usa)$/i.test(s)) {
    return true;
  }

  return false;
}

/**
 * Heuristic test to determine if a string looks like a company name.
 */
export function isLikelyCompany(str: string): boolean {
  if (isInvalidToken(str)) return false;
  const s = str.toLowerCase();
  return COMPANY_INDICATORS.some(ind => s.includes(ind));
}

/**
 * Heuristic test to determine if a string looks like a job title.
 */
export function isLikelyTitle(str: string): boolean {
  if (isInvalidToken(str)) return false;
  const s = str.toLowerCase();
  return TITLE_INDICATORS.some(ind => s.includes(ind));
}

/**
 * Robust date parser maintaining backward compatibility with legacy ParsedEmploymentDates signature.
 */
export function parseEmploymentDates(rawDateStr?: string | null): ParsedEmploymentDates {
  if (!rawDateStr || typeof rawDateStr !== 'string') {
    return {
      startDate: '',
      endDate: '',
      current: false,
      isDateUncertain: true,
      dateWarning: 'Employment dates not detected — Please verify.',
      durationMonths: 0,
      originalDateText: '',
      normalizedStart: null,
      normalizedEnd: null
    };
  }

  const cleaned = rawDateStr.replace(/[\r\n\t]+/g, ' ').trim();
  if (!cleaned) {
    return {
      startDate: '',
      endDate: '',
      current: false,
      isDateUncertain: true,
      dateWarning: 'Empty date string.',
      durationMonths: 0,
      originalDateText: '',
      normalizedStart: null,
      normalizedEnd: null
    };
  }

  // Check invalid Present – Present
  if (/^(present|current)\s*[-–—]\s*(present|current)$/i.test(cleaned)) {
    return {
      startDate: '',
      endDate: '',
      current: false,
      isDateUncertain: true,
      dateWarning: 'Invalid date range: Present – Present',
      durationMonths: 0,
      originalDateText: cleaned,
      normalizedStart: null,
      normalizedEnd: null
    };
  }

  // Check Present alone
  if (/^(present|current|ongoing|now|till\s*date|to\s*date)$/i.test(cleaned)) {
    return {
      startDate: '',
      endDate: 'Present',
      current: true,
      isDateUncertain: true,
      dateWarning: 'Role start date is missing and requires manual confirmation.',
      durationMonths: 12,
      originalDateText: cleaned,
      normalizedStart: null,
      normalizedEnd: null
    };
  }

  // Check trailing hyphen without end date (e.g. "2019 -")
  const openRangeMatch = cleaned.match(/^(\d{4})\s*[-–—]\s*$/);
  if (openRangeMatch) {
    return {
      startDate: openRangeMatch[1],
      endDate: '',
      current: false,
      isDateUncertain: true,
      dateWarning: 'End date is missing and not assumed to be Present.',
      durationMonths: 12,
      originalDateText: cleaned,
      normalizedStart: openRangeMatch[1],
      normalizedEnd: null
    };
  }

  // Check standalone year (e.g. "2020")
  const singleYearMatch = cleaned.match(/^(\d{4})$/);
  if (singleYearMatch) {
    return {
      startDate: singleYearMatch[1],
      endDate: '',
      current: false,
      isDateUncertain: true,
      dateWarning: 'Single date detected — please confirm end date.',
      durationMonths: 12,
      originalDateText: cleaned,
      normalizedStart: singleYearMatch[1],
      normalizedEnd: null
    };
  }

  const result = extractDateRangeFromLine(cleaned);
  if (!result.found) {
    return {
      startDate: '',
      endDate: '',
      current: false,
      isDateUncertain: true,
      dateWarning: 'Employment dates not detected — Please verify.',
      durationMonths: 0,
      originalDateText: cleaned,
      normalizedStart: null,
      normalizedEnd: null
    };
  }

  // Format raw start / end preserving original formatting if present
  let rawStart = result.startDate || '';
  let rawEnd = result.isCurrent ? 'Present' : (result.endDate || '');

  const parts = result.originalDateText.split(/\s*[-–—]\s*|\s+(?:to|until|through)\s+/i);
  if (parts.length >= 2) {
    rawStart = parts[0].trim();
    const secondPart = parts[1].trim();
    if (/^(present|current|ongoing|now|till\s*date|to\s*date)$/i.test(secondPart)) {
      rawEnd = 'Present';
    } else {
      rawEnd = secondPart;
    }
  }

  // Calculate duration months exactly matching platform formula
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;

  const startYearMatch = rawStart.match(/\b(19\d\d|20\d\d)\b/);
  const endYearMatch = !result.isCurrent ? rawEnd.match(/\b(19\d\d|20\d\d)\b/) : null;

  let durationMonths = 0;

  if (startYearMatch) {
    const startYear = parseInt(startYearMatch[1], 10);
    if (endYearMatch) {
      const endYear = parseInt(endYearMatch[1], 10);
      if (startYear > endYear) {
        return {
          startDate: rawStart,
          endDate: rawEnd,
          current: false,
          isDateUncertain: true,
          dateWarning: `Chronological error: Start date (${rawStart}) is after end date (${rawEnd}).`,
          durationMonths: 0,
          originalDateText: result.originalDateText,
          normalizedStart: result.startDate,
          normalizedEnd: result.endDate
        };
      } else {
        durationMonths = Math.max(1, (endYear - startYear) * 12);
      }
    } else if (result.isCurrent) {
      durationMonths = Math.max(1, (nowYear - startYear) * 12 + nowMonth);
    }
  }

  return {
    startDate: rawStart,
    endDate: rawEnd,
    current: result.isCurrent,
    isDateUncertain: result.isDateUncertain,
    dateWarning: result.dateWarning,
    durationMonths,
    originalDateText: result.originalDateText,
    normalizedStart: result.startDate,
    normalizedEnd: result.endDate
  };
}

/**
 * Segments the employment history section out of full resume text.
 */
export function segmentEmploymentSection(fullResumeText: string): { employmentText: string; sectionFound: boolean } {
  if (!fullResumeText) return { employmentText: '', sectionFound: false };

  // Match standard Employment / Experience section header
  const sectionHeaderRegex = /(?:^|\n)\s*(?:(?:professional|work|career|employment|relevant)\s+)?(?:experience|employment\s+history|work\s+history)\b/i;
  const match = fullResumeText.match(sectionHeaderRegex);

  if (!match || match.index === undefined) {
    return { employmentText: '', sectionFound: false };
  }

  const startIdx = match.index + match[0].length;
  const remaining = fullResumeText.slice(startIdx);

  // Find next section boundary
  const nextSectionRegex = /(?:^|\n)\s*(?:education|academic\s+background|projects|key\s+projects|technical\s+skills|skills\s+(&|and)\s+competencies|skills|certifications|licenses|honors|awards|publications|languages|references|declarations?)\b/i;
  const nextMatch = remaining.match(nextSectionRegex);

  const employmentText = nextMatch && nextMatch.index !== undefined
    ? remaining.slice(0, nextMatch.index)
    : remaining;

  return { employmentText: employmentText.trim(), sectionFound: true };
}

/**
 * Extracts and disambiguates employer, title, location, and dates from raw header line(s).
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

  // Inspect lines before the first bullet point for job header metadata (up to 5 lines)
  const headerLines: string[] = [];
  for (const line of lines) {
    if (isDescriptionOrBullet(line)) {
      break;
    }
    headerLines.push(line);
    if (headerLines.length >= 5) break;
  }
  if (headerLines.length === 0 && lines.length > 0) {
    headerLines.push(lines[0]);
  }

  // Look for dates across the candidate header lines
  for (const hLine of headerLines) {
    const dateResult = extractDateRangeFromLine(hLine);
    if (dateResult.found && !startDate && !originalDateText) {
      startDate = dateResult.startDate;
      endDate = dateResult.endDate;
      isCurrent = dateResult.isCurrent;
      originalDateText = dateResult.originalDateText;
      isDateUncertain = dateResult.isDateUncertain;
      dateWarning = dateResult.dateWarning;
    }
  }

  // Process text without date string to extract company, role, location
  const combinedHeaders = headerLines.map(l => {
    const d = extractDateRangeFromLine(l);
    return d.cleanedLine;
  }).filter(l => l.length > 0 && !isInvalidToken(l) && !isDescriptionOrBullet(l));

  // Multi-column or delimited header line (e.g. "TCS | Senior Process Associate | Indore" or "Staff Engineer at TechCorp")
  for (const rawLine of combinedHeaders) {
    // Check if line matches "Role at Company" pattern
    const atMatch = rawLine.match(/^(.+?)\s+(?:at|@)\s+([^(\n]+?)(?:\s*\((.*?)\))?$/i);
    if (atMatch && !rawLine.includes('|')) {
      const candidateRole = atMatch[1].trim();
      const candidateCompany = atMatch[2].trim();
      if (!isInvalidToken(candidateRole) && !isDescriptionOrBullet(candidateRole)) {
        if (!role) role = candidateRole;
      }
      if (!isInvalidToken(candidateCompany) && !isDescriptionOrBullet(candidateCompany)) {
        if (!company) company = candidateCompany;
      }
      continue;
    }

    const segments = rawLine.split(/\s*[\/|•·]\s*|\s+[-–—]\s+/).map(s => s.trim()).filter(Boolean);

    for (const segment of segments) {
      if (isInvalidToken(segment) || isDescriptionOrBullet(segment)) continue;

      // Check if location (e.g. Indore, San Francisco, Remote)
      if (/^(?:in\s+)?(indore|mumbai|bangalore|bengaluru|delhi|hyderabad|pune|chennai|kolkata|noida|gurugram|san francisco|new york|remote|hybrid|usa|india)[,\s\w]*$/i.test(segment)) {
        if (!location) {
          const locParts = segment.split(',').map(p => p.trim());
          if (locParts.length > 1 && /^(india|usa|us|uk|united states|united kingdom)$/i.test(locParts[locParts.length - 1])) {
            location = locParts[0];
          } else {
            location = segment;
          }
        }
        continue;
      }

      // Check if company
      if (isLikelyCompany(segment) && !company) {
        company = segment;
        continue;
      }

      // Check if title
      if (isLikelyTitle(segment) && !role) {
        role = segment;
        continue;
      }

      // If domain term (e.g. "Supply Chain Operations"), append to role rather than company
      if (DOMAIN_TERMS.some(d => segment.toLowerCase().includes(d))) {
        if (role && !role.toLowerCase().includes(segment.toLowerCase())) {
          role = `${role} - ${segment}`;
        } else if (!role) {
          role = segment;
        }
        continue;
      }

      // Assign by default if empty
      if (!company && !isLikelyTitle(segment)) {
        company = segment;
      } else if (!role) {
        role = segment;
      }
    }
  }

  // Clean company of trailing location or department if attached (e.g. "Tata Consultancy Services (TCS), Indore" -> company: "Tata Consultancy Services (TCS)", location: "Indore")
  if (company.includes(',')) {
    const parts = company.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      if (/^(indore|mumbai|bangalore|bengaluru|delhi|hyderabad|pune|chennai|noida|gurugram|san francisco|new york|remote|hybrid|india|usa)$/i.test(lastPart)) {
        company = parts.slice(0, parts.length - 1).join(', ');
        if (!location) location = lastPart;
      }
    }
  }

  // Final sanity checks on company and role
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
    unconsumedLines
  };
}

/**
 * Parses raw text into discrete, structured employment history records.
 */
export function parseStructuralEmploymentHistory(resumeText: string): RawEmploymentRecord[] {
  if (!resumeText || resumeText.trim().length === 0) {
    return [];
  }

  const { employmentText } = segmentEmploymentSection(resumeText);
  if (!employmentText) return [];

  const rawLines = employmentText.split('\n').map(l => l.trim());

  // Group lines into job blocks
  // A new job block starts when we detect:
  // 1. A blank line before a candidate header line
  // 2. A date range on a line when the current block already contains a date range
  // 3. A company name when the current block already contains a company and (date or title)
  // 4. A job title when the current block already contains a title and (date or company)
  const rawBlocks: string[][] = [];
  let currentBlock: string[] = [];
  let currentBlockHasDate = false;
  let currentBlockHasCompany = false;
  let currentBlockHasTitle = false;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) {
      continue;
    }

    const dateResult = extractDateRangeFromLine(line);
    const hasCompany = isLikelyCompany(line);
    const hasTitle = isLikelyTitle(line);
    const isBullet = isDescriptionOrBullet(line);

    let isNewJobHeader = false;

    if (!isBullet && currentBlock.length > 0) {
      const hadBlankLine = i > 0 && rawLines[i - 1] === '';

      if (hadBlankLine && (hasCompany || hasTitle || dateResult.found)) {
        isNewJobHeader = true;
      } else if (dateResult.found && currentBlockHasDate) {
        isNewJobHeader = true;
      } else if (hasCompany && currentBlockHasCompany && (currentBlockHasDate || currentBlockHasTitle)) {
        isNewJobHeader = true;
      } else if (hasTitle && currentBlockHasTitle && (currentBlockHasDate || currentBlockHasCompany)) {
        isNewJobHeader = true;
      }
    }

    if (isNewJobHeader && currentBlock.length > 0) {
      rawBlocks.push(currentBlock);
      currentBlock = [line];
      currentBlockHasDate = dateResult.found;
      currentBlockHasCompany = hasCompany;
      currentBlockHasTitle = hasTitle;
    } else {
      currentBlock.push(line);
      if (dateResult.found) currentBlockHasDate = true;
      if (hasCompany) currentBlockHasCompany = true;
      if (hasTitle) currentBlockHasTitle = true;
    }
  }

  if (currentBlock.length > 0) {
    rawBlocks.push(currentBlock);
  }

  // Process each block into a verified RawEmploymentRecord
  const records: RawEmploymentRecord[] = [];

  for (const block of rawBlocks) {
    if (block.length === 0) continue;

    const header = parseHeaderTokens(block);
    if (!header.company && !header.role) {
      // Discard stray narrative blocks without recognizable employer or role
      continue;
    }

    // Collect descriptions from subsequent lines
    const descriptions: string[] = [];
    for (let i = 1; i < block.length; i++) {
      const line = block[i];
      const d = extractDateRangeFromLine(line);
      if (d.found && d.cleanedLine.length === 0) continue;
      if (line === header.company || line === header.role) continue;
      if (!isInvalidToken(line)) {
        descriptions.push(line.replace(/^[•\-*–—·\s]+/, '').trim());
      }
    }

    // Calculate confidence
    let confidence = 50;
    const fieldConfidence = {
      company: header.company ? 90 : 0,
      job_title: header.role ? 90 : 0,
      start_date: header.startDate ? 95 : 0,
      end_date: (header.endDate || header.isCurrent) ? 95 : 0,
      location: header.location ? 85 : 0
    };

    if (header.company && header.role) confidence += 30;
    if (header.startDate && (header.endDate || header.isCurrent)) confidence += 20;

    const needsVerification = !header.company || !header.role || !header.startDate || (!header.endDate && !header.isCurrent);

    records.push({
      company: header.company || 'Employer not detected',
      job_title: header.role || 'Title not detected',
      location: header.location || '',
      employment_type: null,
      start_date: header.startDate,
      end_date: header.endDate,
      is_current: header.isCurrent,
      original_date_text: header.originalDateText,
      description: descriptions,
      source_text: block.join('\n'),
      confidence,
      needs_verification: needsVerification,
      field_confidence: fieldConfidence
    });
  }

  return deduplicateEmploymentRecords(records);
}

/**
 * Deduplicates employment records while preserving promotions at the same company.
 */
export function deduplicateEmploymentRecords(records: RawEmploymentRecord[]): RawEmploymentRecord[] {
  const seen = new Set<string>();
  const unique: RawEmploymentRecord[] = [];

  for (const rec of records) {
    // A unique record is identified by normalized company, normalized role, and normalized start date
    const key = `${rec.company.toLowerCase().trim()}|${rec.job_title.toLowerCase().trim()}|${rec.start_date || ''}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(rec);
    }
  }

  return unique;
}
