import dns from 'node:dns';
import { GoogleGenAI } from '@google/genai';
import {
  ExtractedJobData,
  JobImportExtractionMethod,
  JobImportExtractionStatus,
  WorkArrangement
} from '../src/types/index.ts';

// Common tracking & telemetry parameters to strip during URL canonicalization
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
    // Check if protocol is specified
    const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
    const fullUrlStr = hasProtocol ? trimmed : `https://${trimmed}`;
    const parsed = new URL(fullUrlStr);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, canonicalUrl: '', sourceDomain: '', protocol: parsed.protocol, hostname: '', error: 'Only HTTP and HTTPS URLs are supported.' };
    }

    const rawHostname = parsed.hostname.toLowerCase();
    if (!rawHostname || rawHostname.includes(' ') || !rawHostname.includes('.')) {
      return { valid: false, canonicalUrl: trimmed, sourceDomain: 'unknown', protocol: parsed.protocol, hostname: '', error: 'Invalid hostname in job URL.' };
    }

    const hostname = rawHostname.replace(/^www\./i, '');
    const sourceDomain = hostname;

    // Strip tracking parameters
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

    // Sort remaining params deterministically
    searchParams.sort();

    // Remove trailing slash from pathname unless it's just root '/'
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
    return { valid: false, canonicalUrl: trimmed, sourceDomain: 'unknown', protocol: '', hostname: '', error: 'Malformed URL. Please check the pasted web link.' };
  }
}

/**
 * 2. SSRF Protection: Checks if IP is private, link-local, loopback, or metadata service
 */
export function isPrivateOrBlockedIp(ip: string): boolean {
  if (!ip) return true;

  // IPv4 Loopback & Special
  if (ip === '127.0.0.1' || ip === '0.0.0.0' || ip.startsWith('127.')) return true;

  // Cloud metadata endpoint (AWS, GCP, Azure, DigitalOcean, OpenStack)
  if (ip === '169.254.169.254' || ip.startsWith('169.254.')) return true;

  // Private RFC 1918 Class A: 10.0.0.0 - 10.255.255.255
  if (ip.startsWith('10.')) return true;

  // Private RFC 1918 Class B: 172.16.0.0 - 172.31.255.255
  const bMatch = ip.match(/^172\.(\d+)\./);
  if (bMatch) {
    const secondOctet = parseInt(bMatch[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  // Private RFC 1918 Class C: 192.168.0.0 - 192.168.255.255
  if (ip.startsWith('192.168.')) return true;

  // Carrier-grade NAT: 100.64.0.0/10
  const cgnatMatch = ip.match(/^100\.(\d+)\./);
  if (cgnatMatch) {
    const secondOctet = parseInt(cgnatMatch[1], 10);
    if (secondOctet >= 64 && secondOctet <= 127) return true;
  }

  // IPv6 checks
  const lowerIp = ip.toLowerCase().trim();
  if (
    lowerIp === '::1' ||
    lowerIp === '::' ||
    lowerIp === '0:0:0:0:0:0:0:1' ||
    lowerIp === '0:0:0:0:0:0:0:0' ||
    /^0*(:0*)*:1$/.test(lowerIp) ||
    lowerIp.startsWith('fc') || // ULA fc00::/7
    lowerIp.startsWith('fd') ||
    lowerIp.startsWith('fe80') || // Link-local
    lowerIp.startsWith('::ffff:127.') || // IPv4-mapped IPv6
    lowerIp.startsWith('::ffff:10.') ||
    lowerIp.startsWith('::ffff:192.168.') ||
    lowerIp.startsWith('::ffff:169.254.')
  ) {
    return true;
  }

  return false;
}

/**
 * 3. Validate safety of URL including hostname & resolved DNS IP (preventing DNS rebinding)
 */
export async function validateSafePublicUrl(urlStr: string): Promise<{
  safe: boolean;
  canonicalUrl: string;
  sourceDomain: string;
  error?: string;
}> {
  const norm = normalizeJobUrl(urlStr);
  if (!norm.valid) {
    return { safe: false, canonicalUrl: '', sourceDomain: '', error: norm.error };
  }

  const hostname = norm.hostname;

  // Block forbidden hostnames & internal TLDs
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.test') ||
    hostname.endsWith('.example') ||
    hostname.endsWith('.invalid') ||
    hostname.endsWith('.home') ||
    hostname.endsWith('.corp')
  ) {
    return { safe: false, canonicalUrl: norm.canonicalUrl, sourceDomain: norm.sourceDomain, error: 'Access to local or internal network hostnames is blocked for security.' };
  }

  // Check if hostname is directly an IP literal
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) {
    if (isPrivateOrBlockedIp(hostname)) {
      return { safe: false, canonicalUrl: norm.canonicalUrl, sourceDomain: norm.sourceDomain, error: 'Access to private or local IP addresses is blocked for security.' };
    }
  }

  // Safe DNS Lookup to prevent DNS rebinding attacks to internal infrastructure
  try {
    const lookup = await dns.promises.lookup(hostname, { all: true });
    for (const entry of lookup) {
      if (isPrivateOrBlockedIp(entry.address)) {
        return { safe: false, canonicalUrl: norm.canonicalUrl, sourceDomain: norm.sourceDomain, error: `Hostname resolves to restricted address (${entry.address}). Request blocked.` };
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { safe: false, canonicalUrl: norm.canonicalUrl, sourceDomain: norm.sourceDomain, error: `Could not resolve domain ${hostname}: ${msg}` };
  }

  return { safe: true, canonicalUrl: norm.canonicalUrl, sourceDomain: norm.sourceDomain };
}

/**
 * Clean and decode HTML text helper
 */
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
 * 4. Safe Fetch Pipeline: 8s Timeout, 2MB Max Stream Size, Manual Safe Redirect Tracking
 */
export interface FetchJobPageResult {
  ok: boolean;
  html: string;
  statusCode: number;
  finalUrl: string;
  sourceDomain: string;
  blocked: boolean;
  error?: string;
  code?: string;
}

export async function safeFetchJobPage(initialUrl: string, maxRedirects = 3): Promise<FetchJobPageResult> {
  let currentUrl = initialUrl;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    const safety = await validateSafePublicUrl(currentUrl);
    if (!safety.safe) {
      return {
        ok: false,
        html: '',
        statusCode: 400,
        finalUrl: currentUrl,
        sourceDomain: safety.sourceDomain || 'unknown',
        blocked: false,
        error: safety.error || 'Destination URL failed security validation.',
        code: 'SECURITY_BLOCKED',
      };
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
          'Cache-Control': 'no-cache',
        },
        redirect: 'manual', // Check each redirect destination manually for SSRF
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle Redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return {
            ok: false,
            html: '',
            statusCode: response.status,
            finalUrl: currentUrl,
            sourceDomain: safety.sourceDomain,
            blocked: false,
            error: 'Server responded with a redirect but no Location header was provided.',
            code: 'INVALID_REDIRECT',
          };
        }

        const nextUrl = new URL(location, currentUrl).href;
        currentUrl = nextUrl;
        redirectsRemaining--;
        continue;
      }

      // Check anti-bot / security challenges
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        return {
          ok: false,
          html: '',
          statusCode: response.status,
          finalUrl: currentUrl,
          sourceDomain: safety.sourceDomain,
          blocked: true,
          error: `The employer website returned HTTP ${response.status} (Access Protected). Please use manual job entry.`,
          code: 'SOURCE_PROTECTION_BLOCKED',
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          html: '',
          statusCode: response.status,
          finalUrl: currentUrl,
          sourceDomain: safety.sourceDomain,
          blocked: false,
          error: `Employer page returned HTTP ${response.status} ${response.statusText}`,
          code: 'HTTP_ERROR',
        };
      }

      // Validate content type
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (
        !contentType.includes('text/html') &&
        !contentType.includes('application/xhtml+xml') &&
        !contentType.includes('text/plain')
      ) {
        return {
          ok: false,
          html: '',
          statusCode: response.status,
          finalUrl: currentUrl,
          sourceDomain: safety.sourceDomain,
          blocked: false,
          error: `Unsupported content-type: ${contentType}. Only web pages can be extracted.`,
          code: 'UNSUPPORTED_CONTENT_TYPE',
        };
      }

      // Read response stream with 2MB maximum limit
      const MAX_BYTES = 2 * 1024 * 1024; // 2MB
      let totalBytes = 0;
      const chunks: Uint8Array[] = [];

      if (!response.body) {
        return {
          ok: false,
          html: '',
          statusCode: response.status,
          finalUrl: currentUrl,
          sourceDomain: safety.sourceDomain,
          blocked: false,
          error: 'Empty response received from employer page.',
          code: 'EMPTY_RESPONSE',
        };
      }

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > MAX_BYTES) {
            reader.cancel();
            return {
              ok: false,
              html: '',
              statusCode: 413,
              finalUrl: currentUrl,
              sourceDomain: safety.sourceDomain,
              blocked: false,
              error: 'Job page exceeds the 2MB size limit.',
              code: 'OVERSIZED_RESPONSE',
            };
          }
          chunks.push(value);
        }
      }

      // Concatenate and decode UTF-8 string
      const fullBuffer = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
      }
      const htmlText = new TextDecoder('utf-8', { fatal: false }).decode(fullBuffer);

      // Detect Cloudflare / Bot Wall markers in page HTML
      const lowerHtml = htmlText.toLowerCase();
      if (
        lowerHtml.includes('attention required! | cloudflare') ||
        lowerHtml.includes('challenge-running') ||
        lowerHtml.includes('cf-browser-verification') ||
        lowerHtml.includes('just a moment...') && lowerHtml.includes('cloudflare') ||
        lowerHtml.includes('robot check') && lowerHtml.includes('captcha')
      ) {
        return {
          ok: false,
          html: '',
          statusCode: 403,
          finalUrl: currentUrl,
          sourceDomain: safety.sourceDomain,
          blocked: true,
          error: 'The destination website is protected by an automated bot challenge. You can still paste or enter details manually.',
          code: 'SOURCE_PROTECTION_BLOCKED',
        };
      }

      return {
        ok: true,
        html: htmlText,
        statusCode: response.status,
        finalUrl: currentUrl,
        sourceDomain: safety.sourceDomain,
        blocked: false,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      return {
        ok: false,
        html: '',
        statusCode: isAbort ? 408 : 500,
        finalUrl: currentUrl,
        sourceDomain: safety.sourceDomain,
        blocked: false,
        error: isAbort ? 'Connection timed out after 8 seconds.' : `Network error: ${err instanceof Error ? err.message : String(err)}`,
        code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
      };
    }
  }

  return {
    ok: false,
    html: '',
    statusCode: 310,
    finalUrl: currentUrl,
    sourceDomain: 'unknown',
    blocked: false,
    error: 'Too many redirects encountered (exceeded 3 redirects).',
    code: 'TOO_MANY_REDIRECTS',
  };
}

/**
 * 5. Extraction Strategy Priority 1: Schema.org JobPosting JSON-LD
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
      // Ignore JSON parse error and try next script tag
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
  if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
    return obj;
  }

  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    return findJobPostingObject(obj['@graph']);
  }

  return null;
}

function mapJsonLdJobToData(job: any, originalUrl: string, sourceDomain: string): Partial<ExtractedJobData> {
  const title = typeof job.title === 'string' ? decodeHtmlEntities(job.title).trim() : null;
  
  // Organization
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
      } else if (job.hiringOrganization.logo && typeof job.hiringOrganization.logo.url === 'string') {
        companyLogo = job.hiringOrganization.logo.url;
      }
    }
  }

  // Location & Country
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

  // Employment Type
  let employmentType = 'Full-time';
  if (job.employmentType) {
    const rawType = String(Array.isArray(job.employmentType) ? job.employmentType[0] : job.employmentType).toUpperCase();
    if (rawType.includes('PART_TIME') || rawType.includes('PART-TIME')) employmentType = 'Part-time';
    else if (rawType.includes('CONTRACT') || rawType.includes('TEMPORARY')) employmentType = 'Contract';
    else if (rawType.includes('INTERN')) employmentType = 'Internship';
    else employmentType = 'Full-time';
  }

  // Salary
  let salaryRange: ExtractedJobData['salaryRange'] = null;
  const baseSalary = job.baseSalary || job.estimatedSalary;
  if (baseSalary && typeof baseSalary === 'object') {
    const val = baseSalary.value;
    const currency = baseSalary.currency || val?.currency || 'USD';
    let min: number | undefined;
    let max: number | undefined;

    if (typeof val === 'number') {
      min = val;
      max = val;
    } else if (typeof val === 'object' && val !== null) {
      if (typeof val.minValue === 'number') min = val.minValue;
      if (typeof val.maxValue === 'number') max = val.maxValue;
      if (typeof val.value === 'number') {
        min = min ?? val.value;
        max = max ?? val.value;
      }
    }

    if (min !== undefined || max !== undefined) {
      salaryRange = {
        min: min ?? null,
        max: max ?? null,
        currency,
        raw: min && max ? `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}` : min ? `${currency} ${min.toLocaleString()}` : null,
      };
    }
  }

  // Description
  const rawDesc = typeof job.description === 'string' ? job.description : '';
  const description = sanitizeHtmlToText(rawDesc);

  // Extract skills from text
  const requiredSkills = extractSkillsFromText(description);

  return {
    title,
    company,
    companyWebsite,
    companyLogo,
    location,
    country,
    workplaceType,
    employmentType,
    salaryRange,
    description: description || null,
    requiredSkills,
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
 * 6. Extraction Strategy Priority 2: Source-Specific Adapters
 */
export function extractFromSupportedAdapters(html: string, originalUrl: string, sourceDomain?: string): Partial<ExtractedJobData> | null {
  const domain = sourceDomain || normalizeJobUrl(originalUrl).sourceDomain;
  const lowerDomain = (domain || '').toLowerCase();

  // Greenhouse Adapter (boards.greenhouse.io / job-boards.greenhouse.io)
  if (lowerDomain.includes('greenhouse.io')) {
    const titleMatch = html.match(/<h1[^>]*class=["'][^"']*app-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                       html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const companyMatch = html.match(/<span[^>]*class=["'][^"']*company-name[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
                         html.match(/<title>([^<]+?)\s*-\s*Job\s*Board<\/title>/i) ||
                         html.match(/at\s+([A-Za-z0-9\s.,-]+)\s*<\/title>/i);
    const locationMatch = html.match(/<div[^>]*class=["'][^"']*location[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const contentMatch = html.match(/<div[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>\s*<div id=["']app["']/i) ||
                         html.match(/<div[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/i);

    if (titleMatch) {
      const title = decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim());
      const rawComp = companyMatch ? decodeHtmlEntities(companyMatch[1].replace(/<[^>]+>/g, '').trim()) : null;
      const company = rawComp ? rawComp.replace(/^at\s+/i, '').trim() : null;
      const location = locationMatch ? decodeHtmlEntities(locationMatch[1].replace(/<[^>]+>/g, '').trim()) : 'Remote';
      const description = contentMatch ? sanitizeHtmlToText(contentMatch[1]) : sanitizeHtmlToText(html);

      return {
        title,
        company,
        location,
        country: 'Global',
        workplaceType: location.toLowerCase().includes('remote') ? 'Remote' : 'On-site',
        employmentType: 'Full-time',
        description,
        requiredSkills: extractSkillsFromText(description),
        preferredSkills: [],
        responsibilities: [],
        qualifications: [],
        educationRequirements: [],
        extractionMethod: 'adapter',
        extractionConfidence: 0.9,
        extractionStatus: 'verified_source',
      };
    }
  }

  // Lever Adapter (jobs.lever.co)
  if (lowerDomain.includes('lever.co')) {
    const titleMatch = html.match(/<div[^>]*class=["'][^"']*posting-headline[^"']*["'][^>]*>\s*<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const locationMatch = html.match(/<span[^>]*class=["'][^"']*location[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const workplaceMatch = html.match(/<span[^>]*class=["'][^"']*workplaceTypes[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const companyMatch = html.match(/<title>([^-<]+?)\s*-\s*[^<]+<\/title>/i);

    if (titleMatch) {
      const title = decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim());
      const company = companyMatch ? decodeHtmlEntities(companyMatch[1].trim()) : null;
      const location = locationMatch ? decodeHtmlEntities(locationMatch[1].replace(/<[^>]+>/g, '').trim()) : 'Remote';
      const wp = workplaceMatch ? workplaceMatch[1].toLowerCase() : '';
      const workplaceType: 'Remote' | 'Hybrid' | 'On-site' = wp.includes('remote') ? 'Remote' : wp.includes('hybrid') ? 'Hybrid' : 'On-site';
      const description = sanitizeHtmlToText(html);

      return {
        title,
        company,
        location,
        country: 'Global',
        workplaceType,
        employmentType: 'Full-time',
        description,
        requiredSkills: extractSkillsFromText(description),
        preferredSkills: [],
        responsibilities: [],
        qualifications: [],
        educationRequirements: [],
        extractionMethod: 'adapter',
        extractionConfidence: 0.9,
        extractionStatus: 'verified_source',
      };
    }
  }

  return null;
}

/**
 * 7. Extraction Strategy Priority 3: Open Graph & HTML Heuristics
 */
export function extractFromOpenGraphAndHeuristics(html: string, originalUrl: string, sourceDomain: string): Partial<ExtractedJobData> {
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
  const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);

  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

  const ogSiteMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);

  let rawTitle = ogTitleMatch ? ogTitleMatch[1] : titleTagMatch ? titleTagMatch[1] : '';
  rawTitle = decodeHtmlEntities(rawTitle).trim();

  // Try to parse "Job Title at Company" or "Job Title - Company"
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
  } else if (rawTitle.includes(' | ')) {
    const parts = rawTitle.split(' | ');
    title = parts[0].trim();
    if (!company && parts.length > 1) company = parts[1].trim();
  }

  const description = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1]).trim() : sanitizeHtmlToText(html);
  const lowerDesc = description.toLowerCase();

  const workplaceType: 'Remote' | 'Hybrid' | 'On-site' =
    lowerDesc.includes('remote') || (title || '').toLowerCase().includes('remote') ? 'Remote' :
    lowerDesc.includes('hybrid') ? 'Hybrid' : 'On-site';

  const requiredSkills = extractSkillsFromText(description);

  return {
    title: title || 'Imported Opportunity',
    company: company || sourceDomain.replace(/\.[a-z]+$/i, '').toUpperCase(),
    location: workplaceType === 'Remote' ? 'Remote' : 'Not Specified',
    country: 'Global',
    workplaceType,
    employmentType: lowerDesc.includes('contract') ? 'Contract' : lowerDesc.includes('part-time') ? 'Part-time' : 'Full-time',
    description: description || 'No detailed description available from source page.',
    requiredSkills,
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
 * 8. Extraction Strategy Priority 4: AI-Assisted Structured Extraction (from retrieved content only)
 */
export async function extractWithGeminiAi(
  retrievedText: string,
  originalUrl: string,
  sourceDomain: string
): Promise<Partial<ExtractedJobData> | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Truncate to safe token limit (around 12,000 characters)
    const truncatedText = retrievedText.slice(0, 12000);

    const prompt = `You are a high-precision job posting data extractor. Extract structured job details from the following web page content.
Ground truth rule: Only extract facts explicitly stated. Never invent salary, experience, or qualifications. If absent, use null or empty array.

Page Source Domain: ${sourceDomain}
Page URL: ${originalUrl}

Content:
${truncatedText}

Respond ONLY with a valid JSON object matching this schema:
{
  "title": string | null,
  "company": string | null,
  "location": string | null,
  "country": string | null,
  "workplaceType": "Remote" | "Hybrid" | "On-site" | "Unspecified",
  "employmentType": "Full-time" | "Part-time" | "Contract" | "Internship" | null,
  "salaryRange": { "min": number | null, "max": number | null, "currency": string | null, "raw": string | null } | null,
  "minExperienceYears": number | null,
  "maxExperienceYears": number | null,
  "requiredSkills": string[],
  "preferredSkills": string[],
  "responsibilities": string[],
  "qualifications": string[],
  "educationRequirements": string[],
  "description": string | null,
  "deadline": string | null
}`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const rawJson = res.text?.trim();
    if (!rawJson) return null;

    const parsed = JSON.parse(rawJson);
    return {
      title: parsed.title || null,
      company: parsed.company || null,
      location: parsed.location || 'Remote',
      country: parsed.country || 'Global',
      workplaceType: parsed.workplaceType || 'Unspecified',
      employmentType: parsed.employmentType || 'Full-time',
      salaryRange: parsed.salaryRange || null,
      minExperienceYears: parsed.minExperienceYears || null,
      maxExperienceYears: parsed.maxExperienceYears || null,
      requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
      preferredSkills: Array.isArray(parsed.preferredSkills) ? parsed.preferredSkills : [],
      responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
      qualifications: Array.isArray(parsed.qualifications) ? parsed.qualifications : [],
      educationRequirements: Array.isArray(parsed.educationRequirements) ? parsed.educationRequirements : [],
      description: parsed.description || null,
      deadline: parsed.deadline || null,
      extractionMethod: 'ai_assisted',
      extractionConfidence: 0.85,
      extractionStatus: 'extracted_review_recommended',
    };
  } catch (e) {
    console.warn('[UniversalJobImport] AI extraction fallback failed gracefully:', e);
    return null;
  }
}

/**
 * 9. Parse Manually Pasted Job Description
 */
export async function extractFromRawPastedText(
  rawText: string,
  titleHint?: string,
  companyHint?: string,
  urlHint?: string
): Promise<ExtractedJobData> {
  const cleanText = sanitizeHtmlToText(rawText);
  const now = new Date().toISOString();
  const sourceDomain = urlHint ? normalizeJobUrl(urlHint).sourceDomain : 'manual';

  // First check if Gemini AI can parse cleanly
  let aiResult: Partial<ExtractedJobData> | null = null;
  if (cleanText.length > 50) {
    aiResult = await extractWithGeminiAi(cleanText, urlHint || 'manual', sourceDomain);
  }

  const title = titleHint || aiResult?.title || cleanText.split('\n')[0].slice(0, 80).trim() || 'Untitled Opportunity';
  const company = companyHint || aiResult?.company || 'Company';
  const skills = aiResult?.requiredSkills?.length ? aiResult.requiredSkills : extractSkillsFromText(cleanText);

  let workplaceType: 'Remote' | 'Hybrid' | 'On-site' | 'Unspecified' = aiResult?.workplaceType || 'Unspecified';
  if (workplaceType === 'Unspecified') {
    const lowerText = cleanText.toLowerCase();
    if (lowerText.includes('hybrid')) workplaceType = 'Hybrid';
    else if (lowerText.includes('remote') || lowerText.includes('telecommute')) workplaceType = 'Remote';
    else if (lowerText.includes('on-site') || lowerText.includes('onsite') || lowerText.includes('in-office')) workplaceType = 'On-site';
  }

  return {
    title,
    company,
    companyWebsite: null,
    companyLogo: null,
    location: aiResult?.location || 'Not Specified',
    country: aiResult?.country || 'Global',
    workplaceType,
    employmentType: aiResult?.employmentType || 'Full-time',
    salaryRange: aiResult?.salaryRange || null,
    minExperienceYears: aiResult?.minExperienceYears || null,
    maxExperienceYears: aiResult?.maxExperienceYears || null,
    requiredSkills: skills,
    preferredSkills: aiResult?.preferredSkills || [],
    responsibilities: aiResult?.responsibilities || [],
    qualifications: aiResult?.qualifications || [],
    educationRequirements: aiResult?.educationRequirements || [],
    description: cleanText,
    deadline: aiResult?.deadline || null,
    originalUrl: urlHint || '',
    sourceDomain,
    sourcePublishedDate: null,
    extractionTimestamp: now,
    extractionMethod: 'manual',
    extractionConfidence: 1.0,
    extractionStatus: 'manual_entry',
    notes: ['Manually entered or pasted by candidate.'],
    unavailableFields: [],
    reviewRecommendedFields: ['salaryRange', 'deadline'],
  };
}

/**
 * 10. Master Layered Pipeline: Executes 1 -> 2 -> 3 -> 4
 */
export async function executeUniversalJobExtraction(urlStr: string): Promise<{
  success: boolean;
  blocked?: boolean;
  error?: string;
  code?: string;
  extractedData?: ExtractedJobData;
}> {
  // 1. Validate URL & SSRF
  const norm = normalizeJobUrl(urlStr);
  if (!norm.valid) {
    return { success: false, error: norm.error, code: 'INVALID_URL' };
  }

  // 2. Fetch page securely
  const fetchRes = await safeFetchJobPage(norm.canonicalUrl);
  if (!fetchRes.ok) {
    return {
      success: false,
      blocked: fetchRes.blocked,
      error: fetchRes.error,
      code: fetchRes.code,
    };
  }

  const html = fetchRes.html;
  const originalUrl = fetchRes.finalUrl || norm.canonicalUrl;
  const sourceDomain = fetchRes.sourceDomain || norm.sourceDomain;
  const now = new Date().toISOString();

  // 3. Layer 1: Schema.org JobPosting JSON-LD
  let partialData: Partial<ExtractedJobData> | null = extractFromJsonLd(html, originalUrl, sourceDomain);

  // 4. Layer 2: Dedicated Supported Adapters
  if (!partialData || !partialData.title || !partialData.company) {
    const adapterData = extractFromSupportedAdapters(html, originalUrl, sourceDomain);
    if (adapterData && adapterData.title) {
      partialData = { ...partialData, ...adapterData };
    }
  }

  // 5. Layer 3: AI-Assisted Extraction from retrieved page body if critical fields missing
  if ((!partialData || !partialData.title || !partialData.company || !partialData.description) && html.length > 200) {
    const bodyText = sanitizeHtmlToText(html);
    const aiData = await extractWithGeminiAi(bodyText, originalUrl, sourceDomain);
    if (aiData && aiData.title) {
      partialData = { ...partialData, ...aiData };
    }
  }

  // 6. Layer 4: Open Graph & HTML Heuristics Fallback
  if (!partialData || !partialData.title) {
    const ogData = extractFromOpenGraphAndHeuristics(html, originalUrl, sourceDomain);
    partialData = { ...partialData, ...ogData };
  }

  // Assemble and normalize final ExtractedJobData
  const unavailableFields: string[] = [];
  const reviewRecommendedFields: string[] = [];

  if (!partialData.salaryRange) unavailableFields.push('salaryRange');
  if (!partialData.deadline) unavailableFields.push('deadline');
  if (partialData.minExperienceYears === undefined || partialData.minExperienceYears === null) unavailableFields.push('minExperienceYears');

  if (partialData.extractionMethod === 'open_graph' || partialData.extractionMethod === 'html_heuristic') {
    reviewRecommendedFields.push('company', 'location', 'workplaceType', 'requiredSkills');
  } else if (partialData.extractionMethod === 'ai_assisted') {
    reviewRecommendedFields.push('workplaceType', 'requiredSkills');
  }

  let extractionStatus: JobImportExtractionStatus = partialData.extractionStatus || 'extracted_review_recommended';
  if (!partialData.title || !partialData.company || !partialData.description) {
    extractionStatus = 'partially_extracted';
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
    extractionStatus,
    notes: [],
    unavailableFields,
    reviewRecommendedFields,
  };

  return {
    success: true,
    extractedData: finalData,
  };
}

/**
 * Standard skills taxonomy dictionary for heuristic skill recognition
 */
const COMMON_SKILLS = [
  'typescript', 'javascript', 'python', 'java', 'c++', 'c#', 'golang', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'react', 'next.js', 'vue', 'angular', 'node.js', 'express', 'nestjs', 'fastapi', 'django', 'spring boot',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'github actions', 'linux',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite', 'dynamodb',
  'graphql', 'rest api', 'microservices', 'distributed systems', 'system design',
  'supply chain', 'sap', 'erp', 'project management', 'agile', 'scrum', 'sql', 'power bi', 'tableau',
  'data analysis', 'excel', 'process improvement', 'lean', 'six sigma', 'product management'
];

const CANONICAL_SKILL_CASING: Record<string, string> = {
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'mysql': 'MySQL',
  'mongodb': 'MongoDB',
  'graphql': 'GraphQL',
  'aws': 'AWS',
  'gcp': 'GCP',
  'ci/cd': 'CI/CD',
  'rest api': 'REST API',
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
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(lower)) {
      const formatted = CANONICAL_SKILL_CASING[skill] || skill
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      matched.push(formatted);
    }
  }

  return matched.slice(0, 15);
}
