// worker/jobConnectors.ts
// Dedicated Provider Adapter Architecture & Live Job Ingestion Engine for ApplyVise AI

export type ConnectorType = 'ats_greenhouse' | 'ats_lever' | 'ats_ashby' | 'aggregator_api' | 'json_ld';
export type WorkArrangement = 'remote' | 'hybrid' | 'onsite';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

export interface LiveJobItem {
  id: string;
  source: string;
  sourceJobId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  country: string;
  workArrangement: WorkArrangement;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryRaw?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  url: string;
  description: string;
  requirements: string[];
  tags: string[];
  publishedAt: string;
  retrievedAt: string;
  firstSeenAt?: string;
  lastVerifiedAt?: string;
  expiresAt: string;
  isActive: boolean;
  lastCheckedAt: string;
}

export interface IngestionMetrics {
  totalFetched: number;
  totalAccepted: number;
  totalRejected: number;
  totalDuplicated: number;
}

export interface AdapterFetchResult {
  jobs: LiveJobItem[];
  metrics: IngestionMetrics;
  status: 'healthy' | 'empty' | 'degraded' | 'rate_limited' | 'offline';
  error?: string;
  statusCode?: number;
}

export interface SourceHealth {
  sourceId: string;
  sourceName: string;
  connectorType: ConnectorType;
  endpoint: string;
  status: 'healthy' | 'empty' | 'degraded' | 'rate_limited' | 'offline';
  totalJobs: number;
  latencyMs: number;
  lastRefreshedAt: string;
  lastError?: string;
}

export interface JobProviderAdapter {
  id: string;
  name: string;
  company: string;
  type: ConnectorType;
  endpoint: string;
  rateLimitSeconds: number;
  fetchJobs(): Promise<AdapterFetchResult>;
}

// SSRF Protection: Ensure external URLs strictly target public HTTPS endpoints
export function isSafePublicUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:') return false;

    const host = parsed.hostname.toLowerCase();
    // Block local, loopback, private ranges & cloud metadata services
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.16.') ||
      host.startsWith('172.17.') ||
      host.startsWith('172.18.') ||
      host.startsWith('172.19.') ||
      host.startsWith('172.2') ||
      host.startsWith('172.3') ||
      host.startsWith('169.254.') || // AWS/GCP/Azure link-local metadata
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely sanitizes incoming provider job descriptions while preserving
 * semantic HTML structure: headings, paragraphs, lists, bold, emphasis, links, and tables.
 * Blocks XSS, event handlers, styles, scripts, iframes, and dangerous attributes.
 */
export function sanitizeIngestedDescription(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let html = rawHtml.trim();

  // 1. Remove dangerous blocks and their contents completely
  html = html.replace(/<(?:script|style|iframe|object|embed|svg|math|applet|form|input|button|textarea|select|link|meta)\b[^>]*>[\s\S]*?<\/(?:script|style|iframe|object|embed|svg|math|applet|form|input|button|textarea|select|link|meta)>/gi, '');
  
  // 2. Remove remaining dangerous orphan opening or closing tags
  html = html.replace(/<\/?(?:script|iframe|style|object|embed|form|input|button|textarea|select|link|meta|applet|svg|math)[^>]*>/gi, '');

  // 3. Remove inline event handlers (onload, onerror, onclick, etc.)
  html = html.replace(/\s+on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // 4. Sanitize dangerous link protocols
  html = html.replace(/href\s*=\s*['"]\s*(?:javascript|data|vbscript):[^'"]*['"]/gi, 'href="#"');

  // 5. Enforce target="_blank" and rel="noopener noreferrer nofollow" on links
  html = html.replace(/<a\s+([^>]*?)>/gi, (_match, attrs) => {
    let cleanAttrs = attrs.replace(/\b(target|rel)\s*=\s*['"][^'"]*['"]/gi, '').trim();
    return `<a ${cleanAttrs} target="_blank" rel="noopener noreferrer nofollow">`;
  });

  return html.trim();
}

/**
 * Extracts clean plain text specifically for keyword scoring, title inference, and search indexing
 * without mutating or flattening the preserved structured HTML document.
 */
export function extractPlainTextForMatching(htmlOrText: string): string {
  if (!htmlOrText || typeof htmlOrText !== 'string') return '';
  return htmlOrText
    .replace(/<\/(?:p|h[1-6]|div|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, ' • ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

// Clean HTML tags safely (maintained for backwards compatibility)
export function stripHtml(html: string): string {
  return extractPlainTextForMatching(html);
}

// Heuristic experience level detector
export function inferExperienceLevel(title: string, desc: string): ExperienceLevel {
  const t = (title + ' ' + desc.slice(0, 500)).toLowerCase();
  if (t.includes('intern') || t.includes('entry level') || t.includes('junior') || t.includes('associate') || t.includes('graduate')) {
    return 'entry';
  }
  if (t.includes('principal') || t.includes('director') || t.includes('vp') || t.includes('head of') || t.includes('chief') || t.includes('executive')) {
    return 'executive';
  }
  if (t.includes('lead') || t.includes('staff') || t.includes('architect')) {
    return 'lead';
  }
  if (t.includes('senior') || t.includes('sr.') || t.includes('sr ')) {
    return 'senior';
  }
  return 'mid';
}

// Work arrangement detector
export function inferWorkArrangement(location: string, title: string, desc: string): WorkArrangement {
  const combined = (location + ' ' + title + ' ' + desc.slice(0, 500)).toLowerCase();
  if (combined.includes('remote') || combined.includes('anywhere') || combined.includes('work from home') || combined.includes('telecommute')) {
    return 'remote';
  }
  if (combined.includes('hybrid') || combined.includes('flexible')) {
    return 'hybrid';
  }
  return 'onsite';
}

// 14-day TTL default for active live job records
export function calculateDefaultTtlIso(): string {
  return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
}

// ============================================================================
// DEDICATED PROVIDER ADAPTER IMPLEMENTATIONS
// ============================================================================

export class GreenhouseAdapter implements JobProviderAdapter {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly company: string,
    public readonly boardToken: string,
    public readonly rateLimitSeconds: number = 600
  ) {}

  public readonly type: ConnectorType = 'ats_greenhouse';
  public get endpoint(): string {
    return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(this.boardToken)}/jobs`;
  }

  async fetchJobs(): Promise<AdapterFetchResult> {
    const metrics: IngestionMetrics = { totalFetched: 0, totalAccepted: 0, totalRejected: 0, totalDuplicated: 0 };
    // Fetch board listing without ?content=true to prevent 10MB memory-exhaustion payloads on Cloudflare Workers
    const url = this.endpoint;
    if (!isSafePublicUrl(url)) {
      return { jobs: [], metrics, status: 'offline', error: 'Unsafe URL rejected' };
    }

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ApplyViseAI-JobDiscovery/2.0' },
        signal: AbortSignal.timeout(9000),
      });

      if (res.status === 429) {
        return { jobs: [], metrics, status: 'rate_limited', statusCode: 429, error: 'Rate limit exceeded (HTTP 429)' };
      }
      if (res.status === 404) {
        return { jobs: [], metrics, status: 'offline', statusCode: 404, error: 'Job board not found (HTTP 404)' };
      }
      if (!res.ok) {
        return { jobs: [], metrics, status: 'degraded', statusCode: res.status, error: `Greenhouse returned HTTP ${res.status}` };
      }

      const data = (await res.json()) as {
        jobs?: Array<{
          id: number;
          title?: string;
          absolute_url?: string;
          location?: { name?: string };
          updated_at?: string;
          departments?: Array<{ name?: string }>;
        }>;
      };

      if (!data?.jobs || !Array.isArray(data.jobs)) {
        return { jobs: [], metrics, status: 'empty', error: 'Invalid response schema: missing jobs array' };
      }

      metrics.totalFetched = data.jobs.length;
      if (metrics.totalFetched === 0) {
        return { jobs: [], metrics, status: 'empty' };
      }

      const results: LiveJobItem[] = [];
      const now = new Date().toISOString();
      const ttl = calculateDefaultTtlIso();

      for (const j of data.jobs.slice(0, 50)) {
        if (!j.title || !j.absolute_url || !j.id) {
          metrics.totalRejected++;
          continue;
        }

        const loc = j.location?.name?.trim() || 'Remote / Unspecified';
        const depts = (j.departments || []).map(d => d.name?.trim()).filter(Boolean) as string[];
        const summaryDesc = `${j.title.trim()} at ${this.company}. Location: ${loc}. Departments: ${depts.join(', ') || 'General'}. Apply directly at ${j.absolute_url}`;
        const arrangement = inferWorkArrangement(loc, j.title, summaryDesc);
        const exp = inferExperienceLevel(j.title, summaryDesc);

        results.push({
          id: `gh_${this.boardToken}_${j.id}`,
          source: `greenhouse_${this.boardToken}`,
          sourceJobId: String(j.id),
          title: j.title.trim(),
          company: this.company,
          location: loc,
          country: loc.toLowerCase().includes('united states') || loc.toLowerCase().includes('usa') ? 'United States' : 'Global',
          workArrangement: arrangement,
          employmentType: 'full-time',
          experienceLevel: exp,
          url: j.absolute_url,
          description: summaryDesc,
          requirements: depts.length > 0 ? depts : ['General'],
          tags: [this.boardToken, this.company, arrangement],
          publishedAt: j.updated_at || now,
          retrievedAt: now,
          firstSeenAt: now,
          lastVerifiedAt: now,
          expiresAt: ttl,
          isActive: true,
          lastCheckedAt: now,
        });
        metrics.totalAccepted++;
      }

      return { jobs: results, metrics, status: 'healthy', statusCode: 200 };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { jobs: [], metrics, status: 'offline', error: msg };
    }
  }
}

export class LeverAdapter implements JobProviderAdapter {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly company: string,
    public readonly companyHandle: string,
    public readonly rateLimitSeconds: number = 600
  ) {}

  public readonly type: ConnectorType = 'ats_lever';
  public get endpoint(): string {
    return `https://api.lever.co/v0/postings/${encodeURIComponent(this.companyHandle)}?mode=json`;
  }

  async fetchJobs(): Promise<AdapterFetchResult> {
    const metrics: IngestionMetrics = { totalFetched: 0, totalAccepted: 0, totalRejected: 0, totalDuplicated: 0 };
    const url = this.endpoint;
    if (!isSafePublicUrl(url)) {
      return { jobs: [], metrics, status: 'offline', error: 'Unsafe URL rejected' };
    }

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ApplyViseAI-JobDiscovery/2.0' },
        signal: AbortSignal.timeout(9000),
      });

      if (res.status === 429) {
        return { jobs: [], metrics, status: 'rate_limited', statusCode: 429, error: 'Rate limit exceeded (HTTP 429)' };
      }
      if (res.status === 404) {
        return { jobs: [], metrics, status: 'offline', statusCode: 404, error: 'Lever board not found (HTTP 404)' };
      }
      if (!res.ok) {
        return { jobs: [], metrics, status: 'degraded', statusCode: res.status, error: `Lever returned HTTP ${res.status}` };
      }

      const data = (await res.json()) as Array<{
        id: string;
        text?: string;
        hostedUrl?: string;
        descriptionPlain?: string;
        description?: string;
        categories?: {
          location?: string;
          commitment?: string;
          department?: string;
          team?: string;
        };
        createdAt?: number;
        salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
      }>;

      if (!Array.isArray(data)) {
        return { jobs: [], metrics, status: 'empty', error: 'Invalid response schema: expected array' };
      }

      metrics.totalFetched = data.length;
      if (metrics.totalFetched === 0) {
        return { jobs: [], metrics, status: 'empty' };
      }

      const results: LiveJobItem[] = [];
      const now = new Date().toISOString();
      const ttl = calculateDefaultTtlIso();

      for (const j of data.slice(0, 50)) {
        if (!j.text || !j.hostedUrl || !j.id) {
          metrics.totalRejected++;
          continue;
        }

        const loc = j.categories?.location || 'Remote';
        const structuredDesc = sanitizeIngestedDescription(j.description || j.descriptionPlain || '');
        const cleanDesc = extractPlainTextForMatching(structuredDesc);
        const arrangement = inferWorkArrangement(loc, j.text, cleanDesc);
        const exp = inferExperienceLevel(j.text, cleanDesc);

        let empType: EmploymentType = 'full-time';
        const commit = (j.categories?.commitment || '').toLowerCase();
        if (commit.includes('part-time')) empType = 'part-time';
        else if (commit.includes('contract')) empType = 'contract';
        else if (commit.includes('intern')) empType = 'internship';

        let salaryRaw: string | undefined;
        let salaryMin: number | undefined;
        let salaryMax: number | undefined;
        if (j.salaryRange?.min && j.salaryRange?.max) {
          salaryMin = j.salaryRange.min;
          salaryMax = j.salaryRange.max;
          salaryRaw = `${j.salaryRange.currency || '$'}${salaryMin.toLocaleString()} - ${salaryMax.toLocaleString()}${j.salaryRange.interval ? ` / ${j.salaryRange.interval}` : ''}`;
        }

        results.push({
          id: `lever_${this.companyHandle}_${j.id}`,
          source: `lever_${this.companyHandle}`,
          sourceJobId: j.id,
          title: j.text.trim(),
          company: this.company,
          location: loc,
          country: loc.toLowerCase().includes('us') || loc.toLowerCase().includes('united states') ? 'United States' : 'Global',
          workArrangement: arrangement,
          employmentType: empType,
          experienceLevel: exp,
          salaryRaw,
          salaryMin,
          salaryMax,
          salaryCurrency: j.salaryRange?.currency || '$',
          url: j.hostedUrl,
          description: structuredDesc,
          requirements: [j.categories?.department, j.categories?.team].filter(Boolean) as string[],
          tags: [this.companyHandle, this.company, arrangement],
          publishedAt: j.createdAt ? new Date(j.createdAt).toISOString() : now,
          retrievedAt: now,
          firstSeenAt: now,
          lastVerifiedAt: now,
          expiresAt: ttl,
          isActive: true,
          lastCheckedAt: now,
        });
        metrics.totalAccepted++;
      }

      return { jobs: results, metrics, status: 'healthy', statusCode: 200 };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { jobs: [], metrics, status: 'offline', error: msg };
    }
  }
}

export class RemotiveAdapter implements JobProviderAdapter {
  public readonly id = 'remotive';
  public readonly name = 'Remotive Global';
  public readonly company = 'Remotive';
  public readonly type: ConnectorType = 'aggregator_api';
  public readonly endpoint = 'https://remotive.com/api/remote-jobs?limit=50';
  public readonly rateLimitSeconds = 300;

  async fetchJobs(): Promise<AdapterFetchResult> {
    const metrics: IngestionMetrics = { totalFetched: 0, totalAccepted: 0, totalRejected: 0, totalDuplicated: 0 };
    try {
      const res = await fetch(this.endpoint, {
        headers: { 'User-Agent': 'ApplyViseAI-JobDiscovery/2.0' },
        signal: AbortSignal.timeout(9000),
      });

      if (res.status === 429) {
        return { jobs: [], metrics, status: 'rate_limited', statusCode: 429, error: 'Remotive rate limit reached' };
      }
      if (!res.ok) {
        return { jobs: [], metrics, status: 'degraded', statusCode: res.status, error: `Remotive HTTP ${res.status}` };
      }

      const data = (await res.json()) as {
        jobs?: Array<{
          id: number;
          title?: string;
          company_name?: string;
          company_logo?: string;
          candidate_required_location?: string;
          url?: string;
          description?: string;
          tags?: string[];
          category?: string;
          publication_date?: string;
          salary?: string;
        }>;
      };

      if (!data?.jobs || !Array.isArray(data.jobs)) {
        return { jobs: [], metrics, status: 'empty', error: 'Remotive schema missing jobs array' };
      }

      metrics.totalFetched = data.jobs.length;
      if (metrics.totalFetched === 0) {
        return { jobs: [], metrics, status: 'empty' };
      }

      const results: LiveJobItem[] = [];
      const now = new Date().toISOString();
      const ttl = calculateDefaultTtlIso();

      for (const j of data.jobs.slice(0, 50)) {
        if (!j.title || !j.company_name || !j.url || !j.id) {
          metrics.totalRejected++;
          continue;
        }

        const loc = j.candidate_required_location?.trim() || 'Worldwide Remote';
        const cleanDesc = stripHtml(j.description || '').slice(0, 2500);

        results.push({
          id: `remotive_${j.id}`,
          source: 'remotive',
          sourceJobId: String(j.id),
          title: j.title.trim(),
          company: j.company_name.trim(),
          companyLogo: j.company_logo,
          location: loc,
          country: loc.includes('USA') ? 'United States' : (loc.includes('UK') ? 'United Kingdom' : 'Remote Worldwide'),
          workArrangement: 'remote',
          employmentType: 'full-time',
          experienceLevel: inferExperienceLevel(j.title, cleanDesc),
          salaryRaw: j.salary || undefined,
          url: j.url,
          description: cleanDesc,
          requirements: j.tags && j.tags.length > 0 ? j.tags : [j.category || 'General'],
          tags: j.tags || [],
          publishedAt: j.publication_date || now,
          retrievedAt: now,
          firstSeenAt: now,
          lastVerifiedAt: now,
          expiresAt: ttl,
          isActive: true,
          lastCheckedAt: now,
        });
        metrics.totalAccepted++;
      }

      return { jobs: results, metrics, status: 'healthy', statusCode: 200 };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { jobs: [], metrics, status: 'offline', error: msg };
    }
  }
}

export class ArbeitnowAdapter implements JobProviderAdapter {
  public readonly id = 'arbeitnow';
  public readonly name = 'Arbeitnow Jobs';
  public readonly company = 'Arbeitnow';
  public readonly type: ConnectorType = 'aggregator_api';
  public readonly endpoint = 'https://www.arbeitnow.com/api/job-board-api';
  public readonly rateLimitSeconds = 300;

  async fetchJobs(): Promise<AdapterFetchResult> {
    const metrics: IngestionMetrics = { totalFetched: 0, totalAccepted: 0, totalRejected: 0, totalDuplicated: 0 };
    try {
      const res = await fetch(this.endpoint, {
        headers: { 'User-Agent': 'ApplyViseAI-JobDiscovery/2.0' },
        signal: AbortSignal.timeout(9000),
      });

      if (res.status === 429) {
        return { jobs: [], metrics, status: 'rate_limited', statusCode: 429, error: 'Arbeitnow rate limit reached' };
      }
      if (!res.ok) {
        return { jobs: [], metrics, status: 'degraded', statusCode: res.status, error: `Arbeitnow HTTP ${res.status}` };
      }

      const data = (await res.json()) as {
        data?: Array<{
          slug?: string;
          title?: string;
          company_name?: string;
          location?: string;
          remote?: boolean;
          url?: string;
          description?: string;
          tags?: string[];
          created_at?: number;
        }>;
      };

      if (!data?.data || !Array.isArray(data.data)) {
        return { jobs: [], metrics, status: 'empty', error: 'Arbeitnow schema missing data array' };
      }

      metrics.totalFetched = data.data.length;
      if (metrics.totalFetched === 0) {
        return { jobs: [], metrics, status: 'empty' };
      }

      const results: LiveJobItem[] = [];
      const now = new Date().toISOString();
      const ttl = calculateDefaultTtlIso();

      for (const j of data.data.slice(0, 50)) {
        if (!j.title || !j.company_name || !j.url || !j.slug) {
          metrics.totalRejected++;
          continue;
        }

        const cleanDesc = stripHtml(j.description || '').slice(0, 2500);
        const loc = j.location?.trim() || 'Remote, Global';

        results.push({
          id: `arbeitnow_${j.slug}`,
          source: 'arbeitnow',
          sourceJobId: j.slug,
          title: j.title.trim(),
          company: j.company_name.trim(),
          location: loc,
          country: j.remote ? 'Remote' : (j.location || 'European Union'),
          workArrangement: j.remote ? 'remote' : 'hybrid',
          employmentType: 'full-time',
          experienceLevel: inferExperienceLevel(j.title, cleanDesc),
          url: j.url,
          description: cleanDesc,
          requirements: j.tags || [],
          tags: j.tags || [],
          publishedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : now,
          retrievedAt: now,
          firstSeenAt: now,
          lastVerifiedAt: now,
          expiresAt: ttl,
          isActive: true,
          lastCheckedAt: now,
        });
        metrics.totalAccepted++;
      }

      return { jobs: results, metrics, status: 'healthy', statusCode: 200 };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { jobs: [], metrics, status: 'offline', error: msg };
    }
  }
}

export class JobicyAdapter implements JobProviderAdapter {
  public readonly id = 'jobicy';
  public readonly name = 'Jobicy Global Remote';
  public readonly company = 'Jobicy';
  public readonly type: ConnectorType = 'aggregator_api';
  public readonly endpoint = 'https://jobicy.com/api/v2/remote-jobs?count=50';
  public readonly rateLimitSeconds = 300;

  async fetchJobs(): Promise<AdapterFetchResult> {
    const metrics: IngestionMetrics = { totalFetched: 0, totalAccepted: 0, totalRejected: 0, totalDuplicated: 0 };
    try {
      const res = await fetch(this.endpoint, {
        headers: { 'User-Agent': 'ApplyViseAI-JobDiscovery/2.0' },
        signal: AbortSignal.timeout(9000),
      });

      if (res.status === 429) {
        return { jobs: [], metrics, status: 'rate_limited', statusCode: 429, error: 'Jobicy rate limit reached' };
      }
      if (!res.ok) {
        return { jobs: [], metrics, status: 'degraded', statusCode: res.status, error: `Jobicy HTTP ${res.status}` };
      }

      const data = (await res.json()) as {
        jobs?: Array<{
          id?: number;
          url?: string;
          jobTitle?: string;
          companyName?: string;
          companyLogo?: string;
          jobIndustry?: string[];
          jobGeo?: string;
          jobDescription?: string;
          pubDate?: string;
          annualSalaryMin?: string;
          annualSalaryMax?: string;
          salaryCurrency?: string;
        }>;
      };

      if (!data?.jobs || !Array.isArray(data.jobs)) {
        return { jobs: [], metrics, status: 'empty', error: 'Jobicy schema missing jobs array' };
      }

      metrics.totalFetched = data.jobs.length;
      if (metrics.totalFetched === 0) {
        return { jobs: [], metrics, status: 'empty' };
      }

      const results: LiveJobItem[] = [];
      const now = new Date().toISOString();
      const ttl = calculateDefaultTtlIso();

      for (const j of data.jobs.slice(0, 50)) {
        if (!j.jobTitle || !j.companyName || !j.url || !j.id) {
          metrics.totalRejected++;
          continue;
        }

        const cleanDesc = stripHtml(j.jobDescription || '').slice(0, 2500);
        const salaryRaw = j.annualSalaryMin && j.annualSalaryMax
          ? `${j.salaryCurrency || '$'}${j.annualSalaryMin} - ${j.annualSalaryMax}`
          : undefined;

        results.push({
          id: `jobicy_${j.id}`,
          source: 'jobicy',
          sourceJobId: String(j.id),
          title: j.jobTitle.trim(),
          company: j.companyName.trim(),
          companyLogo: j.companyLogo,
          location: j.jobGeo || 'Anywhere (Remote)',
          country: j.jobGeo?.includes('USA') ? 'United States' : (j.jobGeo || 'Remote'),
          workArrangement: 'remote',
          employmentType: 'full-time',
          experienceLevel: inferExperienceLevel(j.jobTitle, cleanDesc),
          salaryRaw,
          salaryMin: j.annualSalaryMin ? parseFloat(j.annualSalaryMin) : undefined,
          salaryMax: j.annualSalaryMax ? parseFloat(j.annualSalaryMax) : undefined,
          salaryCurrency: j.salaryCurrency || '$',
          url: j.url,
          description: cleanDesc,
          requirements: j.jobIndustry || ['Remote'],
          tags: j.jobIndustry || [],
          publishedAt: j.pubDate || now,
          retrievedAt: now,
          firstSeenAt: now,
          lastVerifiedAt: now,
          expiresAt: ttl,
          isActive: true,
          lastCheckedAt: now,
        });
        metrics.totalAccepted++;
      }

      return { jobs: results, metrics, status: 'healthy', statusCode: 200 };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { jobs: [], metrics, status: 'offline', error: msg };
    }
  }
}

// ============================================================================
// CANONICAL SOURCE REGISTRY
// ============================================================================

export const SOURCE_ADAPTERS: JobProviderAdapter[] = [
  // 1. Authorized Aggregators (High Volume, Verified Openings)
  new RemotiveAdapter(),
  new ArbeitnowAdapter(),
  new JobicyAdapter(),

  // 2. Official Greenhouse ATS Connectors (Direct Company Boards)
  new GreenhouseAdapter('gh_cloudflare', 'Cloudflare Careers', 'Cloudflare', 'cloudflare', 600),
  new GreenhouseAdapter('gh_figma', 'Figma Careers', 'Figma', 'figma', 600),
  new GreenhouseAdapter('gh_gitlab', 'GitLab Careers', 'GitLab', 'gitlab', 600),
  new GreenhouseAdapter('gh_databricks', 'Databricks Careers', 'Databricks', 'databricks', 600),

  // 3. Official Lever ATS Connectors (Direct Company Boards)
  new LeverAdapter('lever_spotify', 'Spotify Careers', 'Spotify', 'spotify', 600),
  new LeverAdapter('lever_palantir', 'Palantir Careers', 'Palantir Technologies', 'palantir', 600),
];

// Backward-compatible registry format
export interface ConnectorDefinition {
  id: string;
  name: string;
  company: string;
  type: ConnectorType;
  endpoint: string;
  rateLimitSeconds: number;
  fetchFn: () => Promise<LiveJobItem[]>;
}

export const SOURCE_REGISTRY: ConnectorDefinition[] = SOURCE_ADAPTERS.map(adapter => ({
  id: adapter.id,
  name: adapter.name,
  company: adapter.company || adapter.name,
  type: adapter.type,
  endpoint: adapter.endpoint,
  rateLimitSeconds: adapter.rateLimitSeconds,
  fetchFn: async () => {
    const res = await adapter.fetchJobs();
    if (res.status === 'offline' && res.error) {
      throw new Error(res.error);
    }
    return res.jobs;
  },
}));

// ============================================================================
// DEDUPLICATION & NORMALIZATION
// ============================================================================

export function deduplicateJobs(jobs: LiveJobItem[]): { unique: LiveJobItem[]; duplicatedCount: number } {
  const seenKeys = new Set<string>();
  const deduplicated: LiveJobItem[] = [];
  let duplicatedCount = 0;

  for (const job of jobs) {
    const normCompany = job.company
      .toLowerCase()
      .replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|co)\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
    const normTitle = job.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
    const key = `${normCompany}::${normTitle}`;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicated.push(job);
    } else {
      duplicatedCount++;
    }
  }

  return { unique: deduplicated, duplicatedCount };
}
