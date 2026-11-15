// worker/directAtsAdapters.ts
// Independent ATS Adapters for Direct Company Career Portals
// Priority Integrations: Greenhouse, Lever, Ashby, Workday, SmartRecruiters,
// Workable, BambooHR, Recruitee, Personio, Breezy, Teamtailor, JSON-LD

import { isSafePublicUrl } from './jobConnectors.ts';

export type DirectAtsType =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workday'
  | 'smartrecruiters'
  | 'workable'
  | 'bamboohr'
  | 'recruitee'
  | 'personio'
  | 'breezy'
  | 'teamtailor'
  | 'successfactors'
  | 'oracle_recruiting'
  | 'icims'
  | 'taleo'
  | 'eightfold'
  | 'json_ld'
  | 'custom_portal';

export interface EmployerContext {
  id: string;
  name: string;
  domain: string;
  careersUrl: string;
  country: string;
  industry: string;
  detectedAts: DirectAtsType;
  atsBoardId?: string;
  jobFeedEndpoint?: string;
  logoUrl?: string;
}

export interface NormalizedEmployerJob {
  id: string;
  employerId: string;
  employerName: string;
  employerDomain: string;
  sourcePortal: string;
  atsProvider: DirectAtsType;
  sourceJobId: string;
  title: string;
  location: string;
  country: string;
  workArrangement: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  salaryRaw?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  originalJobUrl: string;
  originalApplicationUrl: string;
  description: string;
  requirements: string[];
  tags: string[];
  companyLogo?: string;
  logoStatus: 'verified' | 'domain_favicon' | 'portal_api' | 'initials';
  publishedAt: string;
  lastVerifiedAt: string;
  isActive: boolean;
}

export interface AtsFetchResponse {
  success: boolean;
  httpStatus: number;
  latencyMs: number;
  jobs: NormalizedEmployerJob[];
  totalReturned: number;
  resolvedLogoUrl?: string;
  error?: string;
}

export interface DirectAtsAdapter {
  name: DirectAtsType;
  displayName: string;
  detect(html: string, url: string): { detected: boolean; boardId?: string; endpoint?: string };
  fetchJobs(employer: EmployerContext, signal?: AbortSignal): Promise<AtsFetchResponse>;
}

// Helper: infer experience level
function inferExperience(title: string, text: string = ''): 'entry' | 'mid' | 'senior' | 'lead' | 'executive' {
  const combined = `${title} ${text.slice(0, 300)}`.toLowerCase();
  if (/\b(vp|vice president|c-level|chief|director|head of)\b/.test(combined)) return 'executive';
  if (/\b(principal|staff|lead|architect|manager)\b/.test(combined)) return 'lead';
  if (/\b(senior|sr\.|sr|lead engineer|iii|iv)\b/.test(combined)) return 'senior';
  if (/\b(junior|jr\.|jr|intern|internship|graduate|associate|entry)\b/.test(combined)) return 'entry';
  return 'mid';
}

// Helper: infer work arrangement
function inferArrangement(location: string, title: string = '', text: string = ''): 'remote' | 'hybrid' | 'onsite' {
  const combined = `${location} ${title} ${text.slice(0, 300)}`.toLowerCase();
  if (combined.includes('remote') || combined.includes('anywhere') || combined.includes('telecommute')) return 'remote';
  if (combined.includes('hybrid') || combined.includes('flexible')) return 'hybrid';
  return 'onsite';
}

// Helper: sanitize HTML
function cleanHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: detect if an image URL is an ATS vendor logo rather than an employer logo
export function isVendorLogo(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('greenhouse-logo') ||
    lower.includes('greenhouse-') ||
    lower.includes('lever-logo') ||
    lower.includes('workday-logo') ||
    lower.includes('ashby_logo') ||
    lower.includes('ashby-logo') ||
    lower.includes('smartrecruiters-logo') ||
    lower.includes('bamboohr-logo') ||
    lower.includes('recruitee-logo') ||
    lower.includes('breezy-logo') ||
    lower.includes('ats-vendor')
  );
}

// Helper: resolve employer logo with clear priority
export function resolveEmployerLogo(
  domain: string,
  apiLogoUrl?: string,
  pageLogoUrl?: string
): { logoUrl: string; logoStatus: 'verified' | 'portal_api' | 'domain_favicon' | 'initials' } {
  // Priority 1: Official logo from portal API (never use greenhouse/lever generic branding)
  if (apiLogoUrl && !isVendorLogo(apiLogoUrl)) {
    return { logoUrl: apiLogoUrl, logoStatus: 'portal_api' };
  }
  // Priority 2: Page extracted logo
  if (pageLogoUrl && !isVendorLogo(pageLogoUrl)) {
    return { logoUrl: pageLogoUrl, logoStatus: 'verified' };
  }
  // Priority 3: Verified company domain favicon via Google Favicon CDN
  if (domain && domain.includes('.')) {
    return {
      logoUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
      logoStatus: 'domain_favicon',
    };
  }
  return { logoUrl: '', logoStatus: 'initials' };
}

// ============================================================================
// 1. GREENHOUSE JOB BOARD API ADAPTER
// ============================================================================
export class DirectGreenhouseAdapter implements DirectAtsAdapter {
  name: DirectAtsType = 'greenhouse';
  displayName = 'Greenhouse Job Board API';

  detect(html: string, url: string): { detected: boolean; boardId?: string; endpoint?: string } {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      // Match direct boards.greenhouse.io/{board}
      if (host.includes('greenhouse.io')) {
        const token = parsed.pathname.split('/')[1] || parsed.searchParams.get('for') || '';
        if (token && token !== 'embed') {
          return {
            detected: true,
            boardId: token,
            endpoint: `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
          };
        }
      }
    } catch {}

    // Inspect HTML for embedded greenhouse markers
    const ghEmbedFor = html.match(/greenhouse\.io\/embed\/job_board\?for=([^"&'/]+)/i);
    if (ghEmbedFor && ghEmbedFor[1]) {
      const token = ghEmbedFor[1].trim();
      return {
        detected: true,
        boardId: token,
        endpoint: `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
      };
    }

    const ghIframe = html.match(/boards\.greenhouse\.io\/([^"'/]+)/i) ||
      html.match(/data-board=["']([^"']+)["']/i);
    if (ghIframe && ghIframe[1] && ghIframe[1] !== 'embed') {
      const token = ghIframe[1].trim();
      return {
        detected: true,
        boardId: token,
        endpoint: `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
      };
    }
    return { detected: false };
  }

  async fetchJobs(employer: EmployerContext, signal?: AbortSignal): Promise<AtsFetchResponse> {
    const boardId = employer.atsBoardId;
    if (!boardId) {
      return { success: false, httpStatus: 400, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Missing Greenhouse board identifier' };
    }

    const endpoint = employer.jobFeedEndpoint || `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardId)}/jobs?content=true`;
    if (!isSafePublicUrl(endpoint)) {
      return { success: false, httpStatus: 403, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Unsafe endpoint rejected' };
    }

    const start = Date.now();
    try {
      const resp = await fetch(endpoint, {
        headers: { 'User-Agent': 'ApplyWiseAI-DirectDiscovery/2.0' },
        signal: signal || AbortSignal.timeout(9000),
      });
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        return { success: false, httpStatus: resp.status, latencyMs, jobs: [], totalReturned: 0, error: `Greenhouse API returned HTTP ${resp.status}` };
      }

      const data = (await resp.json()) as { jobs?: any[] };
      if (!data || !Array.isArray(data.jobs)) {
        return { success: false, httpStatus: 200, latencyMs, jobs: [], totalReturned: 0, error: 'Malformed Greenhouse payload: missing jobs array' };
      }

      const { logoUrl, logoStatus } = resolveEmployerLogo(employer.domain);
      const now = new Date().toISOString();

      const jobs: NormalizedEmployerJob[] = data.jobs.map((j: any) => {
        const title = (j.title || '').trim();
        const rawContent = j.content || '';
        const desc = cleanHtml(rawContent) || title;
        const loc = j.location?.name || 'Remote';
        const jobUrl = j.absolute_url || `https://boards.greenhouse.io/${boardId}/jobs/${j.id}`;

        const reqs: string[] = [];
        if (j.departments && Array.isArray(j.departments)) {
          j.departments.forEach((d: any) => d.name && reqs.push(d.name));
        }

        return {
          id: `gh_${boardId}_${j.id}`,
          employerId: employer.id,
          employerName: employer.name,
          employerDomain: employer.domain,
          sourcePortal: `https://boards.greenhouse.io/${boardId}`,
          atsProvider: 'greenhouse',
          sourceJobId: String(j.id),
          title,
          location: loc,
          country: employer.country || 'Global',
          workArrangement: inferArrangement(loc, title, desc),
          employmentType: 'full-time',
          experienceLevel: inferExperience(title, desc),
          originalJobUrl: jobUrl,
          originalApplicationUrl: `${jobUrl}#app`,
          description: desc,
          requirements: reqs.length > 0 ? reqs : [employer.industry || 'Technology'],
          tags: reqs,
          companyLogo: logoUrl,
          logoStatus,
          publishedAt: j.updated_at || now,
          lastVerifiedAt: now,
          isActive: true,
        };
      });

      return { success: true, httpStatus: 200, latencyMs, jobs, totalReturned: jobs.length, resolvedLogoUrl: logoUrl };
    } catch (err: unknown) {
      return {
        success: false,
        httpStatus: 0,
        latencyMs: Date.now() - start,
        jobs: [],
        totalReturned: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ============================================================================
// 2. LEVER POSTINGS API ADAPTER (US & EU ENDPOINTS)
// ============================================================================
export class DirectLeverAdapter implements DirectAtsAdapter {
  name: DirectAtsType = 'lever';
  displayName = 'Lever Postings API';

  detect(html: string, url: string): { detected: boolean; boardId?: string; endpoint?: string } {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host.includes('lever.co')) {
        const isEu = host.includes('eu.lever.co');
        const token = parsed.pathname.split('/')[1] || '';
        if (token) {
          const base = isEu ? 'https://api.eu.lever.co/v0/postings' : 'https://api.lever.co/v0/postings';
          return {
            detected: true,
            boardId: token,
            endpoint: `${base}/${token}?mode=json`,
          };
        }
      }
    } catch {}

    const leverMatch = html.match(/jobs\.(eu\.)?lever\.co\/([^"'/]+)/i) ||
      html.match(/api\.(eu\.)?lever\.co\/v0\/postings\/([^"'/]+)/i);
    if (leverMatch) {
      const isEu = Boolean(leverMatch[1]);
      const token = (leverMatch[2] || leverMatch[1]).trim();
      const base = isEu ? 'https://api.eu.lever.co/v0/postings' : 'https://api.lever.co/v0/postings';
      return {
        detected: true,
        boardId: token,
        endpoint: `${base}/${token}?mode=json`,
      };
    }
    return { detected: false };
  }

  async fetchJobs(employer: EmployerContext, signal?: AbortSignal): Promise<AtsFetchResponse> {
    const boardId = employer.atsBoardId;
    if (!boardId) {
      return { success: false, httpStatus: 400, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Missing Lever board identifier' };
    }

    const endpoint = employer.jobFeedEndpoint || `https://api.lever.co/v0/postings/${encodeURIComponent(boardId)}?mode=json`;
    if (!isSafePublicUrl(endpoint)) {
      return { success: false, httpStatus: 403, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Unsafe endpoint rejected' };
    }

    const start = Date.now();
    try {
      const resp = await fetch(endpoint, {
        headers: { 'User-Agent': 'ApplyWiseAI-DirectDiscovery/2.0' },
        signal: signal || AbortSignal.timeout(9000),
      });
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        return { success: false, httpStatus: resp.status, latencyMs, jobs: [], totalReturned: 0, error: `Lever API returned HTTP ${resp.status}` };
      }

      const data = await resp.json();
      if (!Array.isArray(data)) {
        return { success: false, httpStatus: 200, latencyMs, jobs: [], totalReturned: 0, error: 'Malformed Lever payload: expected array of postings' };
      }

      const { logoUrl, logoStatus } = resolveEmployerLogo(employer.domain);
      const now = new Date().toISOString();

      const jobs: NormalizedEmployerJob[] = data.map((j: any) => {
        const title = (j.text || '').trim();
        const desc = j.descriptionPlain || cleanHtml(j.description) || title;
        const loc = j.categories?.location || 'Remote';
        const jobUrl = j.hostedUrl || `https://jobs.lever.co/${boardId}/${j.id}`;
        const applyUrl = j.applyUrl || `${jobUrl}/apply`;

        const reqs: string[] = [];
        if (j.categories?.team) reqs.push(j.categories.team);
        if (j.categories?.department) reqs.push(j.categories.department);
        if (j.categories?.commitment) reqs.push(j.categories.commitment);

        return {
          id: `lever_${boardId}_${j.id}`,
          employerId: employer.id,
          employerName: employer.name,
          employerDomain: employer.domain,
          sourcePortal: `https://jobs.lever.co/${boardId}`,
          atsProvider: 'lever',
          sourceJobId: String(j.id),
          title,
          location: loc,
          country: employer.country || 'Global',
          workArrangement: inferArrangement(loc, title, desc),
          employmentType: (j.categories?.commitment || 'full-time').toLowerCase().includes('part') ? 'part-time' : 'full-time',
          experienceLevel: inferExperience(title, desc),
          originalJobUrl: jobUrl,
          originalApplicationUrl: applyUrl,
          description: desc,
          requirements: reqs.length > 0 ? reqs : [employer.industry || 'Technology'],
          tags: reqs,
          companyLogo: logoUrl,
          logoStatus,
          publishedAt: j.createdAt ? new Date(j.createdAt).toISOString() : now,
          lastVerifiedAt: now,
          isActive: true,
        };
      });

      return { success: true, httpStatus: 200, latencyMs, jobs, totalReturned: jobs.length, resolvedLogoUrl: logoUrl };
    } catch (err: unknown) {
      return {
        success: false,
        httpStatus: 0,
        latencyMs: Date.now() - start,
        jobs: [],
        totalReturned: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ============================================================================
// 3. ASHBY PUBLIC JOB POSTING API ADAPTER
// ============================================================================
export class DirectAshbyAdapter implements DirectAtsAdapter {
  name: DirectAtsType = 'ashby';
  displayName = 'Ashby Job Board API';

  detect(html: string, url: string): { detected: boolean; boardId?: string; endpoint?: string } {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host.includes('ashbyhq.com')) {
        const token = parsed.pathname.split('/')[1] || '';
        if (token) {
          return {
            detected: true,
            boardId: token,
            endpoint: `https://api.ashbyhq.com/posting-api/job-board/${token}`,
          };
        }
      }
    } catch {}

    const ashbyMatch = html.match(/jobs\.ashbyhq\.com\/([^"'/]+)/i) ||
      html.match(/api\.ashbyhq\.com\/posting-api\/job-board\/([^"'/]+)/i) ||
      html.match(/(?:organizationName|ashbyOrg)\s*:\s*['"]([^'"]+)['"]/i) ||
      html.match(/data-ashby-(?:org|board)=['"]([^'"]+)['"]/i);
    if (ashbyMatch && ashbyMatch[1]) {
      const token = ashbyMatch[1].trim();
      return {
        detected: true,
        boardId: token,
        endpoint: `https://api.ashbyhq.com/posting-api/job-board/${token}`,
      };
    }
    return { detected: false };
  }

  async fetchJobs(employer: EmployerContext, signal?: AbortSignal): Promise<AtsFetchResponse> {
    const boardId = employer.atsBoardId;
    if (!boardId) {
      return { success: false, httpStatus: 400, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Missing Ashby board identifier' };
    }

    const endpoint = employer.jobFeedEndpoint || `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardId)}`;
    if (!isSafePublicUrl(endpoint)) {
      return { success: false, httpStatus: 403, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Unsafe endpoint rejected' };
    }

    const start = Date.now();
    try {
      const resp = await fetch(endpoint, {
        headers: { 'User-Agent': 'ApplyWiseAI-DirectDiscovery/2.0' },
        signal: signal || AbortSignal.timeout(9000),
      });
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        return { success: false, httpStatus: resp.status, latencyMs, jobs: [], totalReturned: 0, error: `Ashby API returned HTTP ${resp.status}` };
      }

      const data = (await resp.json()) as { jobBoard?: { name?: string; logoUrl?: string }; jobs?: any[] };
      if (!data || !Array.isArray(data.jobs)) {
        return { success: false, httpStatus: 200, latencyMs, jobs: [], totalReturned: 0, error: 'Malformed Ashby payload: missing jobs array' };
      }

      // Ashby provides official employer logo directly in jobBoard.logoUrl!
      const ashbyLogo = data.jobBoard?.logoUrl;
      const { logoUrl, logoStatus } = resolveEmployerLogo(employer.domain, ashbyLogo);
      const now = new Date().toISOString();

      const jobs: NormalizedEmployerJob[] = data.jobs.map((j: any) => {
        const title = (j.title || '').trim();
        const loc = j.locationName || j.location || (j.isRemote ? 'Remote' : 'Onsite');
        const jobUrl = j.jobUrl || `https://jobs.ashbyhq.com/${boardId}/${j.id}`;
        const applyUrl = j.applyUrl || `${jobUrl}/application`;
        const desc = j.descriptionPlain || cleanHtml(j.descriptionHtml) || title;

        const reqs: string[] = [];
        if (j.departmentName) reqs.push(j.departmentName);
        if (j.teamName) reqs.push(j.teamName);
        if (j.employmentType) reqs.push(j.employmentType);

        return {
          id: `ashby_${boardId}_${j.id}`,
          employerId: employer.id,
          employerName: employer.name,
          employerDomain: employer.domain,
          sourcePortal: `https://jobs.ashbyhq.com/${boardId}`,
          atsProvider: 'ashby',
          sourceJobId: String(j.id),
          title,
          location: loc,
          country: employer.country || 'Global',
          workArrangement: j.isRemote ? 'remote' : inferArrangement(loc, title, desc),
          employmentType: 'full-time',
          experienceLevel: inferExperience(title, desc),
          originalJobUrl: jobUrl,
          originalApplicationUrl: applyUrl,
          description: desc,
          requirements: reqs.length > 0 ? reqs : [employer.industry || 'Technology'],
          tags: reqs,
          companyLogo: logoUrl,
          logoStatus,
          publishedAt: j.publishedAt || now,
          lastVerifiedAt: now,
          isActive: true,
        };
      });

      return { success: true, httpStatus: 200, latencyMs, jobs, totalReturned: jobs.length, resolvedLogoUrl: logoUrl };
    } catch (err: unknown) {
      return {
        success: false,
        httpStatus: 0,
        latencyMs: Date.now() - start,
        jobs: [],
        totalReturned: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ============================================================================
// 4. WORKDAY CAREER-SITE CXS SEARCH ADAPTER
// ============================================================================
export class DirectWorkdayAdapter implements DirectAtsAdapter {
  name: DirectAtsType = 'workday';
  displayName = 'Workday Career Site CXS API';

  detect(html: string, url: string): { detected: boolean; boardId?: string; endpoint?: string } {
    // E.g. https://target.wd5.myworkdayjobs.com/targetcareers
    const workdayMatch = url.match(/https?:\/\/([^.]+)\.wd(\d+)\.myworkdayjobs\.com\/([^/?#]+)/i) ||
      html.match(/https?:\/\/([^.]+)\.wd(\d+)\.myworkdayjobs\.com\/([^/?#]+)/i);

    if (workdayMatch) {
      const tenant = workdayMatch[1];
      const wdNum = workdayMatch[2];
      const site = workdayMatch[3];
      const boardId = `${tenant}__wd${wdNum}__${site}`;
      const endpoint = `https://${tenant}.wd${wdNum}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
      return { detected: true, boardId, endpoint };
    }
    return { detected: false };
  }

  async fetchJobs(employer: EmployerContext, signal?: AbortSignal): Promise<AtsFetchResponse> {
    const boardId = employer.atsBoardId;
    if (!boardId) {
      return { success: false, httpStatus: 400, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Missing Workday board identifier' };
    }

    let endpoint = employer.jobFeedEndpoint;
    if (!endpoint) {
      const parts = boardId.split('__');
      if (parts.length === 3) {
        endpoint = `https://${parts[0]}.${parts[1]}.myworkdayjobs.com/wday/cxs/${parts[0]}/${parts[2]}/jobs`;
      }
    }

    if (!endpoint || !isSafePublicUrl(endpoint)) {
      return { success: false, httpStatus: 403, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Invalid or unsafe Workday endpoint' };
    }

    const start = Date.now();
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ApplyWiseAI-DirectDiscovery/2.0',
        },
        body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: '' }),
        signal: signal || AbortSignal.timeout(9000),
      });
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        return { success: false, httpStatus: resp.status, latencyMs, jobs: [], totalReturned: 0, error: `Workday CXS returned HTTP ${resp.status}` };
      }

      const data = (await resp.json()) as { jobPostings?: any[]; total?: number };
      if (!data || !Array.isArray(data.jobPostings)) {
        return { success: false, httpStatus: 200, latencyMs, jobs: [], totalReturned: 0, error: 'Malformed Workday CXS response' };
      }

      const { logoUrl, logoStatus } = resolveEmployerLogo(employer.domain);
      const now = new Date().toISOString();
      const origin = new URL(endpoint).origin;

      const jobs: NormalizedEmployerJob[] = data.jobPostings.map((j: any) => {
        const title = (j.title || '').trim();
        const extPath = j.externalPath || '';
        const jobUrl = `${origin}${extPath}`;
        const loc = (j.locationsText || employer.country || 'Onsite').trim();

        return {
          id: `wd_${employer.id}_${j.bulletFields?.[0] || extPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
          employerId: employer.id,
          employerName: employer.name,
          employerDomain: employer.domain,
          sourcePortal: origin,
          atsProvider: 'workday',
          sourceJobId: j.bulletFields?.[0] || extPath,
          title,
          location: loc,
          country: employer.country || 'Global',
          workArrangement: inferArrangement(loc, title),
          employmentType: (j.timeType || 'full-time').toLowerCase().includes('part') ? 'part-time' : 'full-time',
          experienceLevel: inferExperience(title),
          originalJobUrl: jobUrl,
          originalApplicationUrl: `${jobUrl}/apply`,
          description: `Direct career opportunity at ${employer.name}. Reference: ${j.bulletFields?.join(', ') || title}. Visit official career portal for full description and requirements.`,
          requirements: j.bulletFields || [employer.industry || 'Enterprise'],
          tags: j.bulletFields || [],
          companyLogo: logoUrl,
          logoStatus,
          publishedAt: j.postedOn || now,
          lastVerifiedAt: now,
          isActive: true,
        };
      });

      return { success: true, httpStatus: 200, latencyMs, jobs, totalReturned: jobs.length, resolvedLogoUrl: logoUrl };
    } catch (err: unknown) {
      return {
        success: false,
        httpStatus: 0,
        latencyMs: Date.now() - start,
        jobs: [],
        totalReturned: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ============================================================================
// 5. SMARTRRECRUITERS POSTING API ADAPTER
// ============================================================================
export class DirectSmartRecruitersAdapter implements DirectAtsAdapter {
  name: DirectAtsType = 'smartrecruiters';
  displayName = 'SmartRecruiters Public Posting API';

  detect(html: string, url: string): { detected: boolean; boardId?: string; endpoint?: string } {
    const match = url.match(/(careers|jobs)\.smartrecruiters\.com\/([^/?#]+)/i) ||
      html.match(/(careers|jobs)\.smartrecruiters\.com\/([^/?#]+)/i);

    if (match && match[2]) {
      const comp = match[2].trim();
      return {
        detected: true,
        boardId: comp,
        endpoint: `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(comp)}/postings`,
      };
    }
    return { detected: false };
  }

  async fetchJobs(employer: EmployerContext, signal?: AbortSignal): Promise<AtsFetchResponse> {
    const boardId = employer.atsBoardId;
    if (!boardId) {
      return { success: false, httpStatus: 400, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Missing SmartRecruiters board identifier' };
    }

    const endpoint = employer.jobFeedEndpoint || `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(boardId)}/postings`;
    if (!isSafePublicUrl(endpoint)) {
      return { success: false, httpStatus: 403, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Unsafe endpoint rejected' };
    }

    const start = Date.now();
    try {
      const resp = await fetch(endpoint, {
        headers: { 'User-Agent': 'ApplyWiseAI-DirectDiscovery/2.0' },
        signal: signal || AbortSignal.timeout(9000),
      });
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        return { success: false, httpStatus: resp.status, latencyMs, jobs: [], totalReturned: 0, error: `SmartRecruiters API returned HTTP ${resp.status}` };
      }

      const data = (await resp.json()) as { content?: any[] };
      if (!data || !Array.isArray(data.content)) {
        return { success: false, httpStatus: 200, latencyMs, jobs: [], totalReturned: 0, error: 'Malformed SmartRecruiters payload: missing content array' };
      }

      const { logoUrl, logoStatus } = resolveEmployerLogo(employer.domain);
      const now = new Date().toISOString();

      const jobs: NormalizedEmployerJob[] = data.content.map((j: any) => {
        const title = (j.name || '').trim();
        const city = j.location?.city || '';
        const region = j.location?.region || '';
        const country = j.location?.country || employer.country || 'Global';
        const loc = [city, region, country].filter(Boolean).join(', ') || 'Remote';
        const jobUrl = `https://jobs.smartrecruiters.com/${boardId}/${j.id}`;

        const reqs: string[] = [];
        if (j.department?.label) reqs.push(j.department.label);
        if (j.typeOfEmployment?.label) reqs.push(j.typeOfEmployment.label);

        return {
          id: `smartrec_${boardId}_${j.id}`,
          employerId: employer.id,
          employerName: employer.name,
          employerDomain: employer.domain,
          sourcePortal: `https://jobs.smartrecruiters.com/${boardId}`,
          atsProvider: 'smartrecruiters',
          sourceJobId: String(j.id),
          title,
          location: loc,
          country,
          workArrangement: inferArrangement(loc, title),
          employmentType: (j.typeOfEmployment?.label || 'Full-time').toLowerCase().includes('part') ? 'part-time' : 'full-time',
          experienceLevel: inferExperience(title),
          originalJobUrl: jobUrl,
          originalApplicationUrl: `${jobUrl}?apply=true`,
          description: `Direct job posting for ${title} at ${employer.name}. Location: ${loc}. Visit official SmartRecruiters employer portal to view full requirements and apply.`,
          requirements: reqs.length > 0 ? reqs : [employer.industry || 'Technology'],
          tags: reqs,
          companyLogo: logoUrl,
          logoStatus,
          publishedAt: j.releasedDate || now,
          lastVerifiedAt: now,
          isActive: true,
        };
      });

      return { success: true, httpStatus: 200, latencyMs, jobs, totalReturned: jobs.length, resolvedLogoUrl: logoUrl };
    } catch (err: unknown) {
      return {
        success: false,
        httpStatus: 0,
        latencyMs: Date.now() - start,
        jobs: [],
        totalReturned: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ============================================================================
// 6. WORKABLE WIDGET API ADAPTER
// ============================================================================
export class DirectWorkableAdapter implements DirectAtsAdapter {
  name: DirectAtsType = 'workable';
  displayName = 'Workable Public Jobs API';

  detect(html: string, url: string): { detected: boolean; boardId?: string; endpoint?: string } {
    const match = url.match(/apply\.workable\.com\/([^/?#]+)/i) ||
      html.match(/apply\.workable\.com\/([^/?#]+)/i);

    if (match && match[1]) {
      const acc = match[1].trim();
      return {
        detected: true,
        boardId: acc,
        endpoint: `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(acc)}`,
      };
    }
    return { detected: false };
  }

  async fetchJobs(employer: EmployerContext, signal?: AbortSignal): Promise<AtsFetchResponse> {
    const boardId = employer.atsBoardId;
    if (!boardId) {
      return { success: false, httpStatus: 400, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Missing Workable account identifier' };
    }

    const endpoint = employer.jobFeedEndpoint || `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(boardId)}`;
    if (!isSafePublicUrl(endpoint)) {
      return { success: false, httpStatus: 403, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Unsafe endpoint rejected' };
    }

    const start = Date.now();
    try {
      const resp = await fetch(endpoint, {
        headers: { 'User-Agent': 'ApplyWiseAI-DirectDiscovery/2.0' },
        signal: signal || AbortSignal.timeout(9000),
      });
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        return { success: false, httpStatus: resp.status, latencyMs, jobs: [], totalReturned: 0, error: `Workable API returned HTTP ${resp.status}` };
      }

      const data = (await resp.json()) as { jobs?: any[] };
      if (!data || !Array.isArray(data.jobs)) {
        return { success: false, httpStatus: 200, latencyMs, jobs: [], totalReturned: 0, error: 'Malformed Workable payload: missing jobs array' };
      }

      const { logoUrl, logoStatus } = resolveEmployerLogo(employer.domain);
      const now = new Date().toISOString();

      const jobs: NormalizedEmployerJob[] = data.jobs.map((j: any) => {
        const title = (j.title || '').trim();
        const loc = [j.city, j.country].filter(Boolean).join(', ') || (j.telecommuting ? 'Remote' : 'Onsite');
        const jobUrl = j.url || `https://apply.workable.com/${boardId}/j/${j.shortcode}/`;

        return {
          id: `workable_${boardId}_${j.shortcode || j.id}`,
          employerId: employer.id,
          employerName: employer.name,
          employerDomain: employer.domain,
          sourcePortal: `https://apply.workable.com/${boardId}`,
          atsProvider: 'workable',
          sourceJobId: String(j.shortcode || j.id),
          title,
          location: loc,
          country: j.country || employer.country || 'Global',
          workArrangement: j.telecommuting ? 'remote' : inferArrangement(loc, title),
          employmentType: 'full-time',
          experienceLevel: inferExperience(title),
          originalJobUrl: jobUrl,
          originalApplicationUrl: `${jobUrl}apply/`,
          description: `Direct job opening for ${title} at ${employer.name}. Department: ${j.department || 'General'}. Apply directly on Workable career portal.`,
          requirements: j.department ? [j.department] : [employer.industry || 'Technology'],
          tags: j.department ? [j.department] : [],
          companyLogo: logoUrl,
          logoStatus,
          publishedAt: j.published_on || now,
          lastVerifiedAt: now,
          isActive: true,
        };
      });

      return { success: true, httpStatus: 200, latencyMs, jobs, totalReturned: jobs.length, resolvedLogoUrl: logoUrl };
    } catch (err: unknown) {
      return {
        success: false,
        httpStatus: 0,
        latencyMs: Date.now() - start,
        jobs: [],
        totalReturned: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ============================================================================
// 7. BAMBOOHR CAREERS ADAPTER
// ============================================================================
export class DirectBambooHrAdapter implements DirectAtsAdapter {
  name: DirectAtsType = 'bamboohr';
  displayName = 'BambooHR Public Careers API';

  detect(html: string, url: string): { detected: boolean; boardId?: string; endpoint?: string } {
    const match = url.match(/https?:\/\/([^.]+)\.bamboohr\.com\/(careers|jobs)/i) ||
      html.match(/https?:\/\/([^.]+)\.bamboohr\.com\/(careers|jobs)/i);

    if (match && match[1]) {
      const subdomain = match[1].trim();
      return {
        detected: true,
        boardId: subdomain,
        endpoint: `https://${subdomain}.bamboohr.com/careers/list`,
      };
    }
    return { detected: false };
  }

  async fetchJobs(employer: EmployerContext, signal?: AbortSignal): Promise<AtsFetchResponse> {
    const boardId = employer.atsBoardId;
    if (!boardId) {
      return { success: false, httpStatus: 400, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Missing BambooHR subdomain' };
    }

    const endpoint = employer.jobFeedEndpoint || `https://${encodeURIComponent(boardId)}.bamboohr.com/careers/list`;
    if (!isSafePublicUrl(endpoint)) {
      return { success: false, httpStatus: 403, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Unsafe endpoint rejected' };
    }

    const start = Date.now();
    try {
      const resp = await fetch(endpoint, {
        headers: { 'User-Agent': 'ApplyWiseAI-DirectDiscovery/2.0' },
        signal: signal || AbortSignal.timeout(9000),
      });
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        return { success: false, httpStatus: resp.status, latencyMs, jobs: [], totalReturned: 0, error: `BambooHR returned HTTP ${resp.status}` };
      }

      const data = (await resp.json()) as { result?: any[] };
      const list = Array.isArray(data) ? data : (Array.isArray(data.result) ? data.result : []);

      const { logoUrl, logoStatus } = resolveEmployerLogo(employer.domain);
      const now = new Date().toISOString();

      const jobs: NormalizedEmployerJob[] = list.map((j: any) => {
        const title = (j.jobTitle || j.title || '').trim();
        const loc = (j.location?.city ? `${j.location.city}, ${j.location.state || j.location.country}` : j.location) || 'Onsite';
        const jobUrl = `https://${boardId}.bamboohr.com/careers/${j.id}`;

        return {
          id: `bamboo_${boardId}_${j.id}`,
          employerId: employer.id,
          employerName: employer.name,
          employerDomain: employer.domain,
          sourcePortal: `https://${boardId}.bamboohr.com/careers`,
          atsProvider: 'bamboohr',
          sourceJobId: String(j.id),
          title,
          location: loc,
          country: employer.country || 'Global',
          workArrangement: inferArrangement(loc, title),
          employmentType: 'full-time',
          experienceLevel: inferExperience(title),
          originalJobUrl: jobUrl,
          originalApplicationUrl: `${jobUrl}?apply=true`,
          description: `Direct career opportunity at ${employer.name}: ${title}. Department: ${j.department || 'General'}. Apply on BambooHR portal.`,
          requirements: j.department ? [j.department] : [employer.industry || 'Business'],
          tags: j.department ? [j.department] : [],
          companyLogo: logoUrl,
          logoStatus,
          publishedAt: now,
          lastVerifiedAt: now,
          isActive: true,
        };
      });

      return { success: true, httpStatus: 200, latencyMs, jobs, totalReturned: jobs.length, resolvedLogoUrl: logoUrl };
    } catch (err: unknown) {
      return {
        success: false,
        httpStatus: 0,
        latencyMs: Date.now() - start,
        jobs: [],
        totalReturned: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ============================================================================
// 8. RECRUITEE CAREERS API ADAPTER
// ============================================================================
export class DirectRecruiteeAdapter implements DirectAtsAdapter {
  name: DirectAtsType = 'recruitee';
  displayName = 'Recruitee Careers API';

  detect(html: string, url: string): { detected: boolean; boardId?: string; endpoint?: string } {
    const match = url.match(/https?:\/\/([^.]+)\.recruitee\.com/i) ||
      html.match(/https?:\/\/([^.]+)\.recruitee\.com/i);

    if (match && match[1]) {
      const comp = match[1].trim();
      return {
        detected: true,
        boardId: comp,
        endpoint: `https://${comp}.recruitee.com/api/offers/`,
      };
    }
    return { detected: false };
  }

  async fetchJobs(employer: EmployerContext, signal?: AbortSignal): Promise<AtsFetchResponse> {
    const boardId = employer.atsBoardId;
    if (!boardId) {
      return { success: false, httpStatus: 400, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Missing Recruitee company identifier' };
    }

    const endpoint = employer.jobFeedEndpoint || `https://${encodeURIComponent(boardId)}.recruitee.com/api/offers/`;
    if (!isSafePublicUrl(endpoint)) {
      return { success: false, httpStatus: 403, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Unsafe endpoint rejected' };
    }

    const start = Date.now();
    try {
      const resp = await fetch(endpoint, {
        headers: { 'User-Agent': 'ApplyWiseAI-DirectDiscovery/2.0' },
        signal: signal || AbortSignal.timeout(9000),
      });
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        return { success: false, httpStatus: resp.status, latencyMs, jobs: [], totalReturned: 0, error: `Recruitee returned HTTP ${resp.status}` };
      }

      const data = (await resp.json()) as { offers?: any[] };
      if (!data || !Array.isArray(data.offers)) {
        return { success: false, httpStatus: 200, latencyMs, jobs: [], totalReturned: 0, error: 'Malformed Recruitee payload: missing offers' };
      }

      const { logoUrl, logoStatus } = resolveEmployerLogo(employer.domain);
      const now = new Date().toISOString();

      const jobs: NormalizedEmployerJob[] = data.offers.map((j: any) => {
        const title = (j.title || '').trim();
        const loc = [j.city, j.country].filter(Boolean).join(', ') || (j.remote ? 'Remote' : 'Onsite');
        const jobUrl = j.careers_url || `https://${boardId}.recruitee.com/o/${j.slug || j.id}`;

        return {
          id: `recruitee_${boardId}_${j.id}`,
          employerId: employer.id,
          employerName: employer.name,
          employerDomain: employer.domain,
          sourcePortal: `https://${boardId}.recruitee.com`,
          atsProvider: 'recruitee',
          sourceJobId: String(j.id),
          title,
          location: loc,
          country: j.country || employer.country || 'Global',
          workArrangement: j.remote ? 'remote' : inferArrangement(loc, title),
          employmentType: 'full-time',
          experienceLevel: inferExperience(title),
          originalJobUrl: jobUrl,
          originalApplicationUrl: `${jobUrl}/apply`,
          description: cleanHtml(j.description) || title,
          requirements: j.department ? [j.department] : [employer.industry || 'Technology'],
          tags: j.department ? [j.department] : [],
          companyLogo: logoUrl,
          logoStatus,
          publishedAt: j.created_at || now,
          lastVerifiedAt: now,
          isActive: true,
        };
      });

      return { success: true, httpStatus: 200, latencyMs, jobs, totalReturned: jobs.length, resolvedLogoUrl: logoUrl };
    } catch (err: unknown) {
      return {
        success: false,
        httpStatus: 0,
        latencyMs: Date.now() - start,
        jobs: [],
        totalReturned: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ============================================================================
// 9. BREEZY HR ADAPTER
// ============================================================================
export class DirectBreezyAdapter implements DirectAtsAdapter {
  name: DirectAtsType = 'breezy';
  displayName = 'Breezy HR Public Job Feed';

  detect(html: string, url: string): { detected: boolean; boardId?: string; endpoint?: string } {
    const match = url.match(/https?:\/\/([^.]+)\.breezy\.hr/i) ||
      html.match(/https?:\/\/([^.]+)\.breezy\.hr/i);

    if (match && match[1]) {
      const comp = match[1].trim();
      return {
        detected: true,
        boardId: comp,
        endpoint: `https://${comp}.breezy.hr/json`,
      };
    }
    return { detected: false };
  }

  async fetchJobs(employer: EmployerContext, signal?: AbortSignal): Promise<AtsFetchResponse> {
    const boardId = employer.atsBoardId;
    if (!boardId) {
      return { success: false, httpStatus: 400, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Missing Breezy company identifier' };
    }

    const endpoint = employer.jobFeedEndpoint || `https://${encodeURIComponent(boardId)}.breezy.hr/json`;
    if (!isSafePublicUrl(endpoint)) {
      return { success: false, httpStatus: 403, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Unsafe endpoint rejected' };
    }

    const start = Date.now();
    try {
      const resp = await fetch(endpoint, {
        headers: { 'User-Agent': 'ApplyWiseAI-DirectDiscovery/2.0' },
        signal: signal || AbortSignal.timeout(9000),
      });
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        return { success: false, httpStatus: resp.status, latencyMs, jobs: [], totalReturned: 0, error: `Breezy HR returned HTTP ${resp.status}` };
      }

      const list = await resp.json();
      if (!Array.isArray(list)) {
        return { success: false, httpStatus: 200, latencyMs, jobs: [], totalReturned: 0, error: 'Malformed Breezy HR payload: expected array' };
      }

      const { logoUrl, logoStatus } = resolveEmployerLogo(employer.domain);
      const now = new Date().toISOString();

      const jobs: NormalizedEmployerJob[] = list.map((j: any) => {
        const title = (j.name || j.title || '').trim();
        const loc = j.location?.name || (j.location?.is_remote ? 'Remote' : 'Onsite');
        const jobUrl = j.url || `https://${boardId}.breezy.hr/p/${j.id}`;

        return {
          id: `breezy_${boardId}_${j.id}`,
          employerId: employer.id,
          employerName: employer.name,
          employerDomain: employer.domain,
          sourcePortal: `https://${boardId}.breezy.hr`,
          atsProvider: 'breezy',
          sourceJobId: String(j.id),
          title,
          location: loc,
          country: employer.country || 'Global',
          workArrangement: j.location?.is_remote ? 'remote' : inferArrangement(loc, title),
          employmentType: 'full-time',
          experienceLevel: inferExperience(title),
          originalJobUrl: jobUrl,
          originalApplicationUrl: `${jobUrl}/apply`,
          description: cleanHtml(j.description) || title,
          requirements: j.department ? [j.department] : [employer.industry || 'Technology'],
          tags: j.department ? [j.department] : [],
          companyLogo: logoUrl,
          logoStatus,
          publishedAt: j.published_date || now,
          lastVerifiedAt: now,
          isActive: true,
        };
      });

      return { success: true, httpStatus: 200, latencyMs, jobs, totalReturned: jobs.length, resolvedLogoUrl: logoUrl };
    } catch (err: unknown) {
      return {
        success: false,
        httpStatus: 0,
        latencyMs: Date.now() - start,
        jobs: [],
        totalReturned: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// ============================================================================
// 10. SCHEMA.ORG JSON-LD JOBPOSTING ADAPTER (Direct Custom Career Portals)
// ============================================================================
export class DirectJsonLdAdapter implements DirectAtsAdapter {
  name: DirectAtsType = 'json_ld';
  displayName = 'Schema.org JobPosting JSON-LD Direct Adapter';

  detect(html: string, url: string): { detected: boolean; boardId?: string; endpoint?: string } {
    if (html.includes('"@type"') && (html.includes('"JobPosting"') || html.includes('JobPosting'))) {
      return { detected: true, boardId: 'json_ld_detected', endpoint: url };
    }
    return { detected: false };
  }

  async fetchJobs(employer: EmployerContext, signal?: AbortSignal): Promise<AtsFetchResponse> {
    const endpoint = employer.jobFeedEndpoint || employer.careersUrl;
    if (!isSafePublicUrl(endpoint)) {
      return { success: false, httpStatus: 403, latencyMs: 0, jobs: [], totalReturned: 0, error: 'Unsafe endpoint rejected' };
    }

    const start = Date.now();
    try {
      const resp = await fetch(endpoint, {
        headers: { 'User-Agent': 'ApplyWiseAI-DirectDiscovery/2.0' },
        signal: signal || AbortSignal.timeout(9000),
      });
      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        return { success: false, httpStatus: resp.status, latencyMs, jobs: [], totalReturned: 0, error: `Careers page returned HTTP ${resp.status}` };
      }

      const html = await resp.text();
      const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let match;
      const jsonPostings: any[] = [];

      while ((match = scriptRegex.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed)) {
            parsed.forEach(p => {
              if (p['@type'] === 'JobPosting') jsonPostings.push(p);
            });
          } else if (parsed['@type'] === 'JobPosting') {
            jsonPostings.push(parsed);
          } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
            parsed['@graph'].forEach((p: any) => {
              if (p['@type'] === 'JobPosting') jsonPostings.push(p);
            });
          }
        } catch {}
      }

      const { logoUrl, logoStatus } = resolveEmployerLogo(employer.domain);
      const now = new Date().toISOString();

      const jobs: NormalizedEmployerJob[] = jsonPostings.map((jp: any, idx: number) => {
        const title = (jp.title || '').trim();
        const desc = cleanHtml(jp.description || '') || title;
        const loc = jp.jobLocation?.address?.addressLocality || jp.jobLocation?.address?.addressRegion || 'Onsite';
        const jobUrl = jp.url || endpoint;

        return {
          id: `jsonld_${employer.id}_${jp.identifier?.value || idx}`,
          employerId: employer.id,
          employerName: employer.name,
          employerDomain: employer.domain,
          sourcePortal: endpoint,
          atsProvider: 'json_ld',
          sourceJobId: String(jp.identifier?.value || idx),
          title,
          location: loc,
          country: jp.jobLocation?.address?.addressCountry || employer.country || 'Global',
          workArrangement: inferArrangement(loc, title, desc),
          employmentType: (jp.employmentType || 'FULL_TIME').toLowerCase().includes('part') ? 'part-time' : 'full-time',
          experienceLevel: inferExperience(title, desc),
          originalJobUrl: jobUrl,
          originalApplicationUrl: jobUrl,
          description: desc,
          requirements: [employer.industry || 'General'],
          tags: [],
          companyLogo: logoUrl,
          logoStatus,
          publishedAt: jp.datePosted || now,
          lastVerifiedAt: now,
          isActive: true,
        };
      });

      return { success: true, httpStatus: 200, latencyMs, jobs, totalReturned: jobs.length, resolvedLogoUrl: logoUrl };
    } catch (err: unknown) {
      return {
        success: false,
        httpStatus: 0,
        latencyMs: Date.now() - start,
        jobs: [],
        totalReturned: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

// Master list of direct ATS adapters
export const DIRECT_ATS_ADAPTERS: DirectAtsAdapter[] = [
  new DirectGreenhouseAdapter(),
  new DirectLeverAdapter(),
  new DirectAshbyAdapter(),
  new DirectWorkdayAdapter(),
  new DirectSmartRecruitersAdapter(),
  new DirectWorkableAdapter(),
  new DirectBambooHrAdapter(),
  new DirectRecruiteeAdapter(),
  new DirectBreezyAdapter(),
  new DirectJsonLdAdapter(),
];

export function getDirectAtsAdapter(atsType: DirectAtsType): DirectAtsAdapter | undefined {
  return DIRECT_ATS_ADAPTERS.find(a => a.name === atsType);
}
