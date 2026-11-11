// src/utils/employmentDateParser.ts
// Universal Employment Date Intelligence & Chronological Validator
// Supports ISO YYYY-MM, Month YYYY, MM/YYYY, MM-YYYY, YYYY-YYYY, same-year month ranges,
// cross-line date stitching, single-month contracts, ongoing current markers, and chronological sanity.

export interface ParsedEmploymentDates {
  startDate: string;          // Preserved human display start date or ''
  endDate: string;            // Preserved human display end date or 'Present' or ''
  current: boolean;
  isDateUncertain: boolean;
  dateWarning?: string;
  durationMonths: number;
  originalDateText: string;
  normalizedStart: string | null; // ISO YYYY-MM or YYYY
  normalizedEnd: string | null;   // ISO YYYY-MM or YYYY (null when current or missing)
}

export interface DateRangeExtractionResult {
  found: boolean;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  originalDateText: string;
  isDateUncertain: boolean;
  dateWarning?: string;
  cleanedLine: string;
  rawStart?: string;
  rawEnd?: string;
  isSingleDate?: boolean;
}

export const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02', febr: '02',
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

const MONTH_PATTERN =
  '(?:jan(?:uary)?|feb(?:r(?:uary)?)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const CURRENT_PATTERN =
  '(?:present|current|currently|ongoing|now|till\\s*date|to\\s*date|present\\s*date)';
const RANGE_SEP_PATTERN = '(?:\\s*[-–—~]\\s*|\\s+(?:to|until|through|thru)\\s+)';

export function isCurrentKeyword(raw: string): boolean {
  return new RegExp(`^${CURRENT_PATTERN}$`, 'i').test(raw.trim());
}

/**
 * Normalizes diverse date strings ("September 2024", "Sept. 2023", "04/2021", "04-2021",
 * "2023-09", "2024") into ISO YYYY-MM or YYYY, or returns null if unparseable / current.
 */
export function normalizeDateToken(token: string): string | null {
  if (!token) return null;
  const cleaned = token
    .trim()
    .replace(/\.+/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!cleaned) return null;
  if (isCurrentKeyword(cleaned)) return null;

  // ISO YYYY-MM or YYYY/MM (e.g. "2023-09", "2023/09")
  const isoMatch = cleaned.match(/^((?:19|20)\d{2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const yearNum = parseInt(isoMatch[1], 10);
    const monthNum = parseInt(isoMatch[2], 10);
    if (monthNum >= 1 && monthNum <= 12 && yearNum >= 1950 && yearNum <= 2100) {
      return `${yearNum}-${String(monthNum).padStart(2, '0')}`;
    }
  }

  // Standalone YYYY
  const yearOnly = cleaned.match(/^((?:19|20)\d{2})$/);
  if (yearOnly) return yearOnly[1];

  // MM/YYYY or MM-YYYY
  const numericMonthYear = cleaned.match(/^(\d{1,2})[-/]((?:19|20)\d{2})$/);
  if (numericMonthYear) {
    const m = parseInt(numericMonthYear[1], 10);
    const y = parseInt(numericMonthYear[2], 10);
    if (m >= 1 && m <= 12 && y >= 1950 && y <= 2100) {
      return `${y}-${String(m).padStart(2, '0')}`;
    }
  }

  // Month YYYY or Month 'YY (e.g. "September 2024", "Sept 2023", "Jan '21")
  const namedMonthYear = cleaned.match(/^([a-z]+)\s+['’]?((?:19|20)?\d{2})$/);
  if (namedMonthYear) {
    const m = MONTH_MAP[namedMonthYear[1]];
    if (m) {
      const rawYear = namedMonthYear[2];
      const fullYear = rawYear.length === 2
        ? (parseInt(rawYear, 10) >= 70 ? `19${rawYear}` : `20${rawYear}`)
        : rawYear;
      return `${fullYear}-${m}`;
    }
  }

  // YYYY Month (occasionally appears in East Asian / tabular formats)
  const yearMonthNamed = cleaned.match(/^((?:19|20)\d{2})\s+([a-z]+)$/);
  if (yearMonthNamed) {
    const m = MONTH_MAP[yearMonthNamed[2]];
    if (m) return `${yearMonthNamed[1]}-${m}`;
  }

  return null;
}

function cleanLineAfterDateRemoval(line: string, matchText: string): string {
  return line
    .replace(matchText, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/\[\s*\]/g, ' ')
    .replace(/\s*[|•·]\s*[|•·]+/g, ' | ')
    .replace(/,\s*\|/g, ' |')
    .replace(/\|\s*,/g, '| ')
    .replace(/^[\s|•·/–—\-:,]+/, '')
    .replace(/[\s|•·/–—\-:,]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a string begins with a recognizable date or current marker token.
 */
export function startsWithDateOrCurrentToken(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  const startDateHead = new RegExp(
    `^(?:${MONTH_PATTERN}\\.?\\s*,?\\s*(?:19|20)\\d{2}|(?:19|20)\\d{2}[-/]\\d{1,2}|\\d{1,2}[-/](?:19|20)\\d{2}|(?:19|20)\\d{2}|${CURRENT_PATTERN})(?:\\s|$|[),\\]|])`,
    'i'
  );
  return startDateHead.test(t);
}

/**
 * Joins wrapped date lines such as:
 *   "ESP Softtech Pvt. Ltd., Indore | Sept 2023 –"
 *   "Aug 2024"
 * into one clean line so wrapped ranges are never split across two records.
 */
export function joinSplitDateLines(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const curr = lines[i];
    const next = i + 1 < lines.length ? lines[i + 1].trim() : '';

    // Case 1: Current line ends with date start + hyphen/to/until AND next line starts with date/Present
    const endsWithOpenDateRange = new RegExp(
      `(?:${MONTH_PATTERN}\\.?\\s*,?\\s*(?:19|20)\\d{2}|(?:19|20)\\d{2}[-/]\\d{1,2}|\\d{1,2}[-/](?:19|20)\\d{2}|(?:19|20)\\d{2})\\s*(?:[-–—~]|to|until|through|thru)$`,
      'i'
    ).test(curr.trim());

    if (endsWithOpenDateRange && next && startsWithDateOrCurrentToken(next)) {
      out.push(`${curr.trim()} ${next}`);
      i += 1;
      continue;
    }

    // Case 2: Current line ends with "| 2023" or "(2023" AND next line is purely "- 2024" or "2024" (wrapped column)
    const endsWithSingleYearPipe = /(?:[|(\s])(?:19|20)\d{2}$/.test(curr.trim());
    const nextIsBareContinuationYear = /^(?:[-–—~]\s*)?(?:(?:19|20)\d{2}|present|current|ongoing)$/i.test(next);
    if (endsWithSingleYearPipe && next && nextIsBareContinuationYear) {
      out.push(`${curr.trim()} - ${next.replace(/^[-–—~]\s*/, '')}`);
      i += 1;
      continue;
    }

    out.push(curr);
  }
  return out;
}

/**
 * Splits a date range match string ONLY on range separators, never breaking ISO "2023-09".
 */
function splitRangeEndpoints(rangeText: string): { rawStart: string; rawEnd: string } | null {
  const text = rangeText.trim();

  // Prefer explicit word separators or en/em dashes or spaces around hyphen
  const spacedOrDashRegex = new RegExp(
    `^(.+?)(?:\\s*([–—~]|to|until|through|thru)\\s*|\\s+-\\s+)(.+)$`,
    'i'
  );
  const m1 = text.match(spacedOrDashRegex);
  if (m1) {
    return { rawStart: m1[1].trim(), rawEnd: m1[3].trim() };
  }

  // Fallback for tight ASCII hyphen ranges:
  // "2020-2023", "2022-Present", "2023-09-2024-08", "04/2019-11/2022", "Jan 2021-Dec 2023"
  const tightPatterns = [
    new RegExp(`^(${MONTH_PATTERN}\\.?\\s*,?\\s*(?:19|20)\\d{2})-(.+)$`, 'i'),
    /^((?:19|20)\d{2}[-/]\d{1,2})-(.+)$/i,
    /^(\d{1,2}[-/](?:19|20)\d{2})-(.+)$/i,
    /^((?:19|20)\d{2})-((?:19|20)\d{2}|present|current|ongoing|now|till\s*date|to\s*date)$/i,
  ];
  for (const tp of tightPatterns) {
    const m = text.match(tp);
    if (m) {
      return { rawStart: m[1].trim(), rawEnd: m[2].trim() };
    }
  }

  return null;
}

/**
 * Extracts a structured date range from a single resume line and cleans delimiters around it.
 */
export function extractDateRangeFromLine(line: string): DateRangeExtractionResult {
  if (!line || !line.trim()) {
    return {
      found: false,
      startDate: null,
      endDate: null,
      isCurrent: false,
      originalDateText: '',
      isDateUncertain: true,
      dateWarning: 'Employment dates not detected — Please verify.',
      cleanedLine: line || '',
    };
  }

  const mPat = `${MONTH_PATTERN}\\.?\\s*,?\\s*(?:19|20)\\d{2}`;
  const isoPat = `(?:19|20)\\d{2}[-/]\\d{1,2}`;
  const numPat = `\\d{1,2}[-/](?:19|20)\\d{2}`;
  const yPat = `(?:19|20)\\d{2}`;

  // Ordered strictly most-specific to least-specific so ISO YYYY-MM matches before YYYY
  const datePatterns: Array<{ regex: RegExp; kind: 'range' | 'same_year_months' | 'present_present' | 'open_range' | 'single_date' }> = [
    // 1. Named Month YYYY range
    {
      kind: 'range',
      regex: new RegExp(`\\b(${mPat})${RANGE_SEP_PATTERN}(${mPat}|${isoPat}|${numPat}|${yPat}|${CURRENT_PATTERN})\\b`, 'i'),
    },
    // 2. ISO YYYY-MM range
    {
      kind: 'range',
      regex: new RegExp(`\\b(${isoPat})${RANGE_SEP_PATTERN}(${isoPat}|${mPat}|${numPat}|${yPat}|${CURRENT_PATTERN})\\b`, 'i'),
    },
    // 3. MM/YYYY or MM-YYYY range
    {
      kind: 'range',
      regex: new RegExp(`\\b(${numPat})${RANGE_SEP_PATTERN}(${numPat}|${mPat}|${isoPat}|${yPat}|${CURRENT_PATTERN})\\b`, 'i'),
    },
    // 4. Same-year abbreviated month range: "Feb - Apr 2021", "Sept – Nov 2021"
    {
      kind: 'same_year_months',
      regex: new RegExp(`\\b(${MONTH_PATTERN})\\.?\\s*[-–—~to]+\\s*(${MONTH_PATTERN})\\.?\\s*,?\\s*(${yPat})\\b`, 'i'),
    },
    // 5. Year - Year / Present range (explicit guard against trailing -MM in ISO)
    {
      kind: 'range',
      regex: new RegExp(`\\b(${yPat})(?!-\\d{2})${RANGE_SEP_PATTERN}(${yPat}(?!-\\d{2})|${mPat}|${CURRENT_PATTERN})\\b`, 'i'),
    },
    // 6. Invalid "Present - Present"
    {
      kind: 'present_present',
      regex: new RegExp(`\\b(${CURRENT_PATTERN})\\s*[-–—~]\\s*(${CURRENT_PATTERN})\\b`, 'i'),
    },
    // 7. Open range: "2019 -" or "Jan 2020 -" or "2023-09 -"
    {
      kind: 'open_range',
      regex: new RegExp(`\\b(${mPat}|${isoPat}|${numPat}|${yPat})\\s*[-–—]\\s*(?=[,\\s\\)\\]|]|$)`, 'i'),
    },
    // 8. Standalone single ISO YYYY-MM / MM/YYYY / Month YYYY
    {
      kind: 'single_date',
      regex: new RegExp(`\\b(${isoPat}|${numPat}|${mPat})\\b`, 'i'),
    },
    // 9. Standalone single YYYY
    {
      kind: 'single_date',
      regex: /(?:^|[\(\|\s,])((?:19|20)\d{2})(?=[,\)\|\s]|$)/i,
    },
  ];

  for (const entry of datePatterns) {
    const match = line.match(entry.regex);
    if (!match) continue;

    const fullMatch = match[0].replace(/^[\(\|\s,]+/, '').trim();
    const cleanedLine = cleanLineAfterDateRemoval(line, match[0]);

    if (entry.kind === 'present_present') {
      return {
        found: true,
        startDate: null,
        endDate: null,
        isCurrent: false,
        originalDateText: fullMatch,
        isDateUncertain: true,
        dateWarning: 'Invalid date range: Present – Present',
        cleanedLine,
      };
    }

    if (entry.kind === 'same_year_months') {
      const m1 = match[1].trim();
      const m2 = match[2].trim();
      const yr = match[3].trim();
      const normalizedStart = normalizeDateToken(`${m1} ${yr}`);
      const normalizedEnd = normalizeDateToken(`${m2} ${yr}`);
      const chronError = Boolean(normalizedStart && normalizedEnd && normalizedStart > normalizedEnd);

      return {
        found: true,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        isCurrent: false,
        originalDateText: fullMatch,
        isDateUncertain: chronError,
        dateWarning: chronError
          ? `Chronological error: Start date (${m1} ${yr}) is after end date (${m2} ${yr}).`
          : undefined,
        cleanedLine,
        rawStart: `${m1} ${yr}`,
        rawEnd: `${m2} ${yr}`,
      };
    }

    if (entry.kind === 'open_range') {
      const rawStart = match[1].trim();
      const normalizedStart = normalizeDateToken(rawStart);
      return {
        found: true,
        startDate: normalizedStart,
        endDate: null,
        isCurrent: false,
        originalDateText: fullMatch,
        isDateUncertain: true,
        dateWarning: 'End date is missing and not assumed to be Present.',
        cleanedLine,
        rawStart,
        rawEnd: '',
      };
    }

    if (entry.kind === 'single_date') {
      const rawStart = match[1].trim();
      const normalizedStart = normalizeDateToken(rawStart);
      return {
        found: true,
        startDate: normalizedStart,
        endDate: null,
        isCurrent: false,
        originalDateText: fullMatch,
        isDateUncertain: true,
        dateWarning: 'Single date detected — please confirm end date.',
        cleanedLine,
        rawStart,
        rawEnd: '',
        isSingleDate: true,
      };
    }

    // Standard range
    const rawStart = match[1].trim();
    const rawEnd = match[2].trim();
    const isCurrent = isCurrentKeyword(rawEnd);
    const normalizedStart = normalizeDateToken(rawStart);
    const normalizedEnd = isCurrent ? null : normalizeDateToken(rawEnd);

    let isDateUncertain = false;
    let dateWarning: string | undefined;

    if (!normalizedStart) {
      isDateUncertain = true;
      dateWarning = 'Start date not detected.';
    } else if (!isCurrent && !normalizedEnd) {
      isDateUncertain = true;
      dateWarning = 'End date is missing and not assumed to be Present.';
    } else if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
      isDateUncertain = true;
      dateWarning = `Chronological error: Start date (${rawStart}) is after end date (${rawEnd}).`;
    }

    return {
      found: true,
      startDate: normalizedStart,
      endDate: normalizedEnd,
      isCurrent,
      originalDateText: fullMatch,
      isDateUncertain,
      dateWarning,
      cleanedLine,
      rawStart,
      rawEnd: isCurrent ? 'Present' : rawEnd,
    };
  }

  return {
    found: false,
    startDate: null,
    endDate: null,
    isCurrent: false,
    originalDateText: '',
    isDateUncertain: true,
    dateWarning: 'Employment dates not detected — Please verify.',
    cleanedLine: line,
  };
}

/**
 * Full backward-compatible date parser returning ParsedEmploymentDates with
 * human display tokens preserved, ISO normalized fields, durationMonths, and
 * uncertainty warnings. Never fabricates 2022 or Present.
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
      normalizedEnd: null,
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
      normalizedEnd: null,
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
      normalizedEnd: null,
    };
  }

  // Check Present alone
  if (isCurrentKeyword(cleaned)) {
    return {
      startDate: '',
      endDate: 'Present',
      current: true,
      isDateUncertain: true,
      dateWarning: 'Role start date is missing and requires manual confirmation.',
      durationMonths: 12,
      originalDateText: cleaned,
      normalizedStart: null,
      normalizedEnd: null,
    };
  }

  // Check trailing hyphen without end date (e.g. "2019 -" or "2023-09 -")
  const openRangeMatch = cleaned.match(/^((?:19|20)\d{2}(?:-\d{1,2})?)\s*[-–—]\s*$/);
  if (openRangeMatch) {
    return {
      startDate: openRangeMatch[1],
      endDate: '',
      current: false,
      isDateUncertain: true,
      dateWarning: 'End date is missing and not assumed to be Present.',
      durationMonths: 12,
      originalDateText: cleaned,
      normalizedStart: normalizeDateToken(openRangeMatch[1]),
      normalizedEnd: null,
    };
  }

  // Check standalone year (e.g. "2020")
  const singleYearMatch = cleaned.match(/^((?:19|20)\d{2})$/);
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
      normalizedEnd: null,
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
      normalizedEnd: null,
    };
  }

  // Determine rawStart and rawEnd safely (without breaking ISO YYYY-MM)
  let rawStart = result.rawStart || result.startDate || '';
  let rawEnd = result.isCurrent ? 'Present' : (result.rawEnd || result.endDate || '');

  if (!result.rawStart) {
    const split = splitRangeEndpoints(result.originalDateText);
    if (split) {
      rawStart = split.rawStart;
      rawEnd = isCurrentKeyword(split.rawEnd) ? 'Present' : split.rawEnd;
    }
  }

  // Calculate duration months
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;

  const startNorm = result.startDate;
  const endNorm = result.endDate;

  let durationMonths = 0;
  if (startNorm) {
    const startYear = parseInt(startNorm.slice(0, 4), 10);
    const startMonth = startNorm.length === 7 ? parseInt(startNorm.slice(5, 7), 10) : 1;

    if (endNorm) {
      const endYear = parseInt(endNorm.slice(0, 4), 10);
      const endMonth = endNorm.length === 7 ? parseInt(endNorm.slice(5, 7), 10) : 1;

      if (startNorm > endNorm) {
        return {
          startDate: rawStart,
          endDate: rawEnd,
          current: false,
          isDateUncertain: true,
          dateWarning: `Chronological error: Start date (${rawStart}) is after end date (${rawEnd}).`,
          durationMonths: 0,
          originalDateText: result.originalDateText,
          normalizedStart: startNorm,
          normalizedEnd: endNorm,
        };
      }

      if (endYear === startYear) {
        durationMonths = Math.max(1, endMonth - startMonth + 1);
      } else {
        durationMonths = Math.max(1, (endYear - startYear) * 12);
      }
    } else if (result.isCurrent) {
      durationMonths = Math.max(1, (nowYear - startYear) * 12 + nowMonth - startMonth + 1);
    } else if (result.isSingleDate) {
      durationMonths = startNorm.length === 7 ? 1 : 12;
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
    normalizedEnd: result.endDate,
  };
}

/**
 * Checks whether two normalized employment intervals (YYYY or YYYY-MM) overlap cleanly.
 */
export function doDateIntervalsOverlap(
  aStart: string | null,
  aEnd: string | null,
  aCurrent: boolean,
  bStart: string | null,
  bEnd: string | null,
  bCurrent: boolean
): boolean {
  if (!aStart || !bStart) return false;
  const toNum = (s: string | null, current: boolean, fallbackStart: string | null): number => {
    if (current) return 999999;
    const effective = s || fallbackStart;
    if (!effective) return 0;
    const norm = normalizeDateToken(effective) || effective;
    const yr = parseInt(norm.slice(0, 4), 10) || 0;
    const mo = norm.length >= 7 ? (parseInt(norm.slice(5, 7), 10) || 1) : (s ? 12 : 1);
    return yr * 100 + mo;
  };
  const a1 = toNum(aStart, false, null);
  const a2 = toNum(aEnd, aCurrent, aStart);
  const b1 = toNum(bStart, false, null);
  const b2 = toNum(bEnd, bCurrent, bStart);
  return Math.max(a1, b1) <= Math.min(a2, b2);
}
