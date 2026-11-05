// worker/jobImportEngine.ts
// Universal Job Import & URL-Based Opportunity Extraction Engine for Cloudflare Workers

import {
  ExtractedJobData,
  JobImportExtractionMethod,
  JobImportExtractionStatus,
} from '../src/types/index.ts';

const TRACKING_PARAM_REGEX = /^(utm_|ref|trk|fbclid|gclid|source|campaign|mc_eid|si|spm|originalSubdomain|trackingId|_hsenc|_hsmi|gh_src|gh_jid|lever-source|lever-origin)/i;

/**
 * 1. Normalize and canonicalize candidate-submitted job URL
 */
export function normalizeJobUrl(rawUrl: string): {
  valid: boolean;
  canonicalUrl: string;
  sourceDomain: string;
  protocol: string;
  hostname: string;
  error?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, canonicalUrl: '', sourceDomain: '', protocol: '', hostname: '', error: 'Job URL cannot be empty.' };
  }

  try {
    const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
    const fullUrlStr = hasProtocol ? trimmed : `https://${trimmed}`;
    const parsed = new URL(fullUrlStr);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, canonicalUrl: '', sourceDomain: '', protocol: parsed.protocol, hostname: '', error: 'Only HTTP and HTTPS URLs are supported.' };
    }

    const rawHostname = parsed.hostname.toLowerCase();
    if (!rawHostname || rawHostname.includes(' ')) {
      return { valid: false, canonicalUrl: '', sourceDomain: '', protocol: parsed.protocol, hostname: '', error: 'Invalid hostname in job URL.' };
    }

    const hostname = rawHostname.replace(/^www\./i, '');
    const sourceDomain = hostname;

    const searchParams = new URLSearchParams(parsed.search);
    const keysToDelete: string[] = [];
    searchParams.forEach((_, key) => {
      if (TRACKING_PARAM_REGEX.test(key)) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      searchParams.delete(key);
    }
    searchParams.sort();

    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    const queryStr = searchParams.toString();
    const canonicalUrl = `${parsed.protocol}//${hostname}${pathname}${queryStr ? '?' + queryStr : ''}`;

    return {
      valid: true,
      canonicalUrl,
      sourceDomain,
      protocol: parsed.protocol,
      hostname,
    };
  } catch {
    return { valid: false, canonicalUrl: '', sourceDomain: '', protocol: '', hostname: '', error: 'Malformed URL. Please check the pasted web link.' };
  }
}

/**
 * 2. SSRF Protection: Checks if IP or hostname is private, loopback, or metadata service
 */
export function isPrivateOrBlockedTarget(hostnameOrIp: string): boolean {
  if (!hostnameOrIp) return true;
  const target = hostnameOrIp.toLowerCase().trim();

  // Hostnames
  if (
    target === 'localhost' ||
    target.endsWith('.localhost') ||
    target.endsWith('.internal') ||
    target.endsWith('.local') ||
    target.endsWith('.test') ||
    target.endsWith('.example') ||
    target.endsWith('.home') ||
    target.endsWith('.corp')
  ) {
    return true;
  }

  // IPv4 Loopback & Special
  if (target === '127.0.0.1' || target === '0.0.0.0' || target.startsWith('127.')) return true;

  // Cloud metadata endpoint
  if (target === '169.254.169.254' || target.startsWith('169.254.')) return true;

  // Private RFC 1918 Class A: 10.0.0.0 - 10.255.255.255
  if (target.startsWith('10.')) return true;

  // Private RFC 1918 Class B: 172.16.0.0 - 172.31.255.255
  const bMatch = target.match(/^172\.(\d+)\./);
  if (bMatch) {
    const secondOctet = parseInt(bMatch[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  // Private RFC 1918 Class C: 192.168.0.0 - 192.168.255.255
  if (target.startsWith('192.168.')) return true;

  // IPv6 checks
  if (
    target === '::1' ||
    target === '::' ||
    target === '0:0:0:0:0:0:0:1' ||
    target === '0:0:0:0:0:0:0:0' ||
    /^0*(:0*)*:1$/.test(target) ||
    target.startsWith('fc') ||
    target.startsWith('fd') ||
    target.startsWith('fe80')
  ) {
    return true;
  }

  return false;
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function sanitizeHtmlToText(html: string): string {
  if (!html) return '';
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim()
  );
}

/**
 * 3. Safe Fetch Pipeline for Cloudflare Workers
 */
export async function safeFetchJobPage(initialUrl: string, maxRedirects = 3): Promise<{
  ok: boolean;
  html: string;
  statusCode: number;
  finalUrl: string;
  sourceDomain: string;
  blocked: boolean;
  error?: string;
  code?: string;
}> {
  let currentUrl = initialUrl;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    const norm = normalizeJobUrl(currentUrl);
    if (!norm.valid) {
      return { ok: false, html: '', statusCode: 400, finalUrl: currentUrl, sourceDomain: '', blocked: false, error: norm.error, code: 'INVALID_URL' };
    }

    if (isPrivateOrBlockedTarget(norm.hostname)) {
      return { ok: false, html: '', statusCode: 400, finalUrl: currentUrl, sourceDomain: norm.sourceDomain, blocked: false, error: 'Destination targets a private or restricted network address.', code: 'SECURITY_BLOCKED' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 ApplyVise/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'manual',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return { ok: false, html: '', statusCode: response.status, finalUrl: currentUrl, sourceDomain: norm.sourceDomain, blocked: false, error: 'Redirect header missing', code: 'INVALID_REDIRECT' };
        }
        currentUrl = new URL(location, currentUrl).href;
        redirectsRemaining--;
        continue;
      }

      if (response.status === 401 || response.status === 403 || response.status === 429) {
        return { ok: false, html: '', statusCode: response.status, finalUrl: currentUrl, sourceDomain: norm.sourceDomain, blocked: true, error: `Employer site returned HTTP ${response.status} (Access Protected). Please use manual entry.`, code: 'SOURCE_PROTECTION_BLOCKED' };
      }

      if (!response.ok) {
        return { ok: false, html: '', statusCode: response.status, finalUrl: currentUrl, sourceDomain: norm.sourceDomain, blocked: false, error: `Employer page returned HTTP ${response.status}`, code: 'HTTP_ERROR' };
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
        return { ok: false, html: '', statusCode: response.status, finalUrl: currentUrl, sourceDomain: norm.sourceDomain, blocked: false, error: `Unsupported content-type: ${contentType}`, code: 'UNSUPPORTED_CONTENT_TYPE' };
      }

      // Read text with length check (max 2MB)
      const rawText = await response.text();
      if (rawText.length > 2 * 1024 * 1024) {
        return { ok: false, html: '', statusCode: 413, finalUrl: currentUrl, sourceDomain: norm.sourceDomain, blocked: false, error: 'Page exceeds size limit of 2MB.', code: 'OVERSIZED_RESPONSE' };
      }

      const lowerHtml = rawText.toLowerCase();
      if (
        lowerHtml.includes('attention required! | cloudflare') ||
        lowerHtml.includes('challenge-running') ||
        lowerHtml.includes('cf-browser-verification') ||
        (lowerHtml.includes('just a moment...') && lowerHtml.includes('cloudflare'))
      ) {
        return { ok: false, html: '', statusCode: 403, finalUrl: currentUrl, sourceDomain: norm.sourceDomain, blocked: true, error: 'The destination website is protected by an automated bot challenge. You can still paste or enter details manually.', code: 'SOURCE_PROTECTION_BLOCKED' };
      }

      return {
        ok: true,
        html: rawText,
        statusCode: response.status,
        finalUrl: currentUrl,
        sourceDomain: norm.sourceDomain,
        blocked: false,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      return { ok: false, html: '', statusCode: isAbort ? 408 : 500, finalUrl: currentUrl, sourceDomain: norm.sourceDomain, blocked: false, error: isAbort ? 'Connection timed out after 8 seconds.' : String(err), code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR' };
    }
  }

  return { ok: false, html: '', statusCode: 310, finalUrl: currentUrl, sourceDomain: 'unknown', blocked: false, error: 'Too many redirects encountered.', code: 'TOO_MANY_REDIRECTS' };
}

/**
 * 4. JSON-LD Extraction
 */
export function extractFromJsonLd(html: string, originalUrl: string, sourceDomain?: string): Partial<ExtractedJobData> | null {
  const domain = sourceDomain || normalizeJobUrl(originalUrl).sourceDomain;
  const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    const rawContent = match[1].trim();
    if (!rawContent) continue;

    try {
      const parsed = JSON.parse(rawContent);
      const jobObject = findJobPostingObject(parsed);
      if (jobObject) {
        return mapJsonLdJobToData(jobObject, originalUrl, domain);
      }
    } catch {
      // Continue
    }
  }

  return null;
}

function findJobPostingObject(obj: any): any | null {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findJobPostingObject(item);
      if (found) return found;
    }
    return null;
  }
  const type = obj['@type'];
  if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) return obj;
  if (obj['@graph'] && Array.isArray(obj['@graph'])) return findJobPostingObject(obj['@graph']);
  return null;
}

function mapJsonLdJobToData(job: any, originalUrl: string, sourceDomain: string): Partial<ExtractedJobData> {
  const title = typeof job.title === 'string' ? decodeHtmlEntities(job.title).trim() : null;
  let company: string | null = null;
  let companyWebsite: string | null = null;
  let companyLogo: string | null = null;

  if (job.hiringOrganization) {
    if (typeof job.hiringOrganization === 'string') {
      company = decodeHtmlEntities(job.hiringOrganization).trim();
    } else if (typeof job.hiringOrganization === 'object') {
      company = typeof job.hiringOrganization.name === 'string' ? decodeHtmlEntities(job.hiringOrganization.name).trim() : null;
      companyWebsite = typeof job.hiringOrganization.sameAs === 'string' ? job.hiringOrganization.sameAs :
                       typeof job.hiringOrganization.url === 'string' ? job.hiringOrganization.url : null;
      if (typeof job.hiringOrganization.logo === 'string') {
        companyLogo = job.hiringOrganization.logo;
      }
    }
  }

  let location = 'Remote';
  let country = 'Global';
  let workplaceType: 'Remote' | 'Hybrid' | 'On-site' = 'On-site';

  if (job.jobLocationType === 'TELECOMMUTE' || job.applicantLocationRequirements) {
    workplaceType = 'Remote';
    location = 'Remote';
  }

  if (job.jobLocation) {
    const locObj = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
    const address = locObj?.address;
    if (address && typeof address === 'object') {
      const parts = [address.addressLocality, address.addressRegion].filter(Boolean);
      if (parts.length > 0) location = parts.join(', ');
      if (address.addressCountry) country = typeof address.addressCountry === 'string' ? address.addressCountry : address.addressCountry.name || country;
    } else if (typeof locObj?.name === 'string') {
      location = locObj.name;
    }
  }

  const rawDesc = typeof job.description === 'string' ? job.description : '';
  const description = sanitizeHtmlToText(rawDesc);

  return {
    title,
    company,
    companyWebsite,
    companyLogo,
    location,
    country,
    workplaceType,
    employmentType: 'Full-time',
    description: description || null,
    requiredSkills: extractSkillsFromText(description),
    preferredSkills: [],
    responsibilities: [],
    qualifications: [],
    educationRequirements: [],
    deadline: typeof job.validThrough === 'string' ? job.validThrough : null,
    sourcePublishedDate: typeof job.datePosted === 'string' ? job.datePosted : null,
    extractionMethod: 'json_ld',
    extractionConfidence: 0.95,
    extractionStatus: 'verified_source',
  };
}

/**
 * 5. Open Graph & Heuristics
 */
export function extractFromOpenGraph(html: string, originalUrl: string, sourceDomain: string): Partial<ExtractedJobData> {
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
  const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  const ogSiteMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);

  let rawTitle = ogTitleMatch ? ogTitleMatch[1] : titleTagMatch ? titleTagMatch[1] : '';
  rawTitle = decodeHtmlEntities(rawTitle).trim();

  let title: string | null = rawTitle;
  let company: string | null = ogSiteMatch ? decodeHtmlEntities(ogSiteMatch[1]).trim() : null;

  if (rawTitle.includes(' at ')) {
    const parts = rawTitle.split(' at ');
    title = parts[0].trim();
    if (!company) company = parts[1].split(/[-–|]/)[0].trim();
  } else if (rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    title = parts[0].trim();
    if (!company && parts.length > 1) company = parts[1].trim();
  }

  const description = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1]).trim() : sanitizeHtmlToText(html);
  const lowerDesc = description.toLowerCase();
  const workplaceType: 'Remote' | 'Hybrid' | 'On-site' =
    lowerDesc.includes('remote') ? 'Remote' : lowerDesc.includes('hybrid') ? 'Hybrid' : 'On-site';

  return {
    title: title || 'Imported Opportunity',
    company: company || sourceDomain.replace(/\.[a-z]+$/i, '').toUpperCase(),
    location: workplaceType === 'Remote' ? 'Remote' : 'Not Specified',
    country: 'Global',
    workplaceType,
    employmentType: 'Full-time',
    description: description || 'No detailed description available.',
    requiredSkills: extractSkillsFromText(description),
    preferredSkills: [],
    responsibilities: [],
    qualifications: [],
    educationRequirements: [],
    extractionMethod: 'open_graph',
    extractionConfidence: 0.7,
    extractionStatus: 'extracted_review_recommended',
  };
}

/**
 * 6. Master Layered Pipeline for Worker
 */
export async function executeUniversalJobExtraction(urlStr: string): Promise<{
  success: boolean;
  blocked?: boolean;
  error?: string;
  code?: string;
  extractedData?: ExtractedJobData;
}> {
  const norm = normalizeJobUrl(urlStr);
  if (!norm.valid) {
    return { success: false, error: norm.error, code: 'INVALID_URL' };
  }

  const fetchRes = await safeFetchJobPage(norm.canonicalUrl);
  if (!fetchRes.ok) {
    return { success: false, blocked: fetchRes.blocked, error: fetchRes.error, code: fetchRes.code };
  }

  const html = fetchRes.html;
  const originalUrl = fetchRes.finalUrl || norm.canonicalUrl;
  const sourceDomain = fetchRes.sourceDomain || norm.sourceDomain;
  const now = new Date().toISOString();

  let partialData = extractFromJsonLd(html, originalUrl, sourceDomain);
  if (!partialData || !partialData.title) {
    partialData = extractFromOpenGraph(html, originalUrl, sourceDomain);
  }

  const finalData: ExtractedJobData = {
    title: partialData.title || 'Imported Role',
    company: partialData.company || sourceDomain.toUpperCase(),
    companyWebsite: partialData.companyWebsite || `https://${sourceDomain}`,
    companyLogo: partialData.companyLogo || null,
    location: partialData.location || 'Remote',
    country: partialData.country || 'Global',
    workplaceType: partialData.workplaceType || 'Unspecified',
    employmentType: partialData.employmentType || 'Full-time',
    salaryRange: partialData.salaryRange || null,
    minExperienceYears: partialData.minExperienceYears || null,
    maxExperienceYears: partialData.maxExperienceYears || null,
    requiredSkills: partialData.requiredSkills || [],
    preferredSkills: partialData.preferredSkills || [],
    responsibilities: partialData.responsibilities || [],
    qualifications: partialData.qualifications || [],
    educationRequirements: partialData.educationRequirements || [],
    description: partialData.description || 'No job description could be retrieved.',
    deadline: partialData.deadline || null,
    originalUrl,
    sourceDomain,
    sourcePublishedDate: partialData.sourcePublishedDate || null,
    extractionTimestamp: now,
    extractionMethod: partialData.extractionMethod || 'open_graph',
    extractionConfidence: partialData.extractionConfidence || 0.75,
    extractionStatus: partialData.extractionStatus || 'extracted_review_recommended',
    notes: [],
    unavailableFields: ['salaryRange', 'deadline'],
    reviewRecommendedFields: ['workplaceType', 'requiredSkills'],
  };

  return { success: true, extractedData: finalData };
}

const COMMON_SKILLS = [
  'typescript', 'javascript', 'python', 'java', 'c++', 'c#', 'golang', 'rust',
  'react', 'next.js', 'vue', 'angular', 'node.js', 'express',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'ci/cd',
  'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite',
  'supply chain', 'sap', 'erp', 'project management', 'agile', 'scrum', 'sql', 'power bi'
];

const CANONICAL_SKILL_CASING: Record<string, string> = {
  'postgresql': 'PostgreSQL',
  'mysql': 'MySQL',
  'mongodb': 'MongoDB',
  'aws': 'AWS',
  'gcp': 'GCP',
  'ci/cd': 'CI/CD',
  'next.js': 'Next.js',
  'node.js': 'Node.js',
  'sql': 'SQL',
  'sap': 'SAP',
  'erp': 'ERP',
  'power bi': 'Power BI',
};

function extractSkillsFromText(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const skill of COMMON_SKILLS) {
    if (lower.includes(skill)) {
      const formatted = CANONICAL_SKILL_CASING[skill] || skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      matched.push(formatted);
    }
  }
  return matched.slice(0, 15);
}
