// worker/jobConnectors.ts
// Modular Source Connector Registry and Live Job Discovery Engine for ApplyWise AI

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
  expiresAt: string;
  isActive: boolean;
  lastCheckedAt: string;
}

export interface SourceHealth {
  sourceId: string;
  sourceName: string;
  connectorType: ConnectorType;
  endpoint: string;
  status: 'healthy' | 'degraded' | 'offline';
  totalJobs: number;
  latencyMs: number;
  lastRefreshedAt: string;
  lastError?: string;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  company: string;
  type: ConnectorType;
  endpoint: string;
  rateLimitSeconds: number;
  fetchFn: () => Promise<LiveJobItem[]>;
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

// Heuristic experience level detector
export function inferExperienceLevel(title: string, desc: string): ExperienceLevel {
  const t = (title + ' ' + desc.slice(0, 500)).toLowerCase();
  if (t.includes('intern') || t.includes('entry level') || t.includes('junior') || t.includes('associate')) {
    return 'entry';
  }
  if (t.includes('principal') || t.includes('director') || t.includes('vp') || t.includes('head of')) {
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
  if (combined.includes('remote') || combined.includes('anywhere') || combined.includes('work from home')) {
    return 'remote';
  }
  if (combined.includes('hybrid')) {
    return 'hybrid';
  }
  return 'onsite';
}

// Clean HTML tags safely
export function stripHtml(html: string): string {
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
    .replace(/\s+/g, ' ')
    .trim();
}

// Standard 60-minute TTL for temporary cache
function calculateTtlIso(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

// ============================================================================
// OFFICIAL CONNECTOR IMPLEMENTATIONS
// ============================================================================

// 1. Greenhouse ATS Connector
async function fetchGreenhouseBoard(boardToken: string, companyName: string): Promise<LiveJobItem[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
  if (!isSafePublicUrl(url)) throw new Error('Unsafe URL rejected');

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ApplyWiseAI-JobDiscovery/2.0' },
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) {
    throw new Error(`Greenhouse API responded with HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    jobs?: Array<{
      id: number;
      title: string;
      absolute_url: string;
      location?: { name: string };
      updated_at?: string;
      content?: string;
      departments?: Array<{ name: string }>;
    }>;
  };

  const results: LiveJobItem[] = [];
  const now = new Date().toISOString();
  const ttl = calculateTtlIso();

  for (const j of (data.jobs || []).slice(0, 40)) {
    const loc = j.location?.name || 'Remote / Unspecified';
    const cleanDesc = stripHtml(j.content || '').slice(0, 3500);
    const arrangement = inferWorkArrangement(loc, j.title, cleanDesc);
    const exp = inferExperienceLevel(j.title, cleanDesc);

    results.push({
      id: `gh_${boardToken}_${j.id}`,
      source: `greenhouse_${boardToken}`,
      sourceJobId: String(j.id),
      title: j.title.trim(),
      company: companyName,
      location: loc,
      country: loc.toLowerCase().includes('united states') || loc.toLowerCase().includes('usa') ? 'United States' : 'Global',
      workArrangement: arrangement,
      employmentType: 'full-time',
      experienceLevel: exp,
      url: j.absolute_url,
      description: cleanDesc,
      requirements: j.departments?.map(d => d.name) || [],
      tags: [boardToken, companyName, arrangement],
      publishedAt: j.updated_at || now,
      retrievedAt: now,
      expiresAt: ttl,
      isActive: true,
      lastCheckedAt: now,
    });
  }

  return results;
}

// 2. Lever ATS Connector
async function fetchLeverBoard(companyHandle: string, companyName: string): Promise<LiveJobItem[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(companyHandle)}?mode=json`;
  if (!isSafePublicUrl(url)) throw new Error('Unsafe URL rejected');

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ApplyWiseAI-JobDiscovery/2.0' },
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) {
    throw new Error(`Lever API responded with HTTP ${res.status}`);
  }

  const data = (await res.json()) as Array<{
    id: string;
    text: string;
    hostedUrl: string;
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

  const results: LiveJobItem[] = [];
  const now = new Date().toISOString();
  const ttl = calculateTtlIso();

  for (const j of (Array.isArray(data) ? data : []).slice(0, 40)) {
    const loc = j.categories?.location || 'Remote';
    const cleanDesc = (j.descriptionPlain || stripHtml(j.description || '')).slice(0, 3500);
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
      id: `lever_${companyHandle}_${j.id}`,
      source: `lever_${companyHandle}`,
      sourceJobId: j.id,
      title: j.text.trim(),
      company: companyName,
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
      description: cleanDesc,
      requirements: [j.categories?.department, j.categories?.team].filter(Boolean) as string[],
      tags: [companyHandle, companyName, arrangement],
      publishedAt: j.createdAt ? new Date(j.createdAt).toISOString() : now,
      retrievedAt: now,
      expiresAt: ttl,
      isActive: true,
      lastCheckedAt: now,
    });
  }

  return results;
}

// 3. Remotive Public Aggregator
async function fetchRemotive(): Promise<LiveJobItem[]> {
  const url = 'https://remotive.com/api/remote-jobs?limit=30';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ApplyWiseAI-JobDiscovery/2.0' },
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) throw new Error(`Remotive returned HTTP ${res.status}`);

  const data = (await res.json()) as {
    jobs?: Array<{
      id: number;
      title: string;
      company_name: string;
      company_logo?: string;
      candidate_required_location?: string;
      url: string;
      description: string;
      tags?: string[];
      category?: string;
      publication_date?: string;
      salary?: string;
    }>;
  };

  const results: LiveJobItem[] = [];
  const now = new Date().toISOString();
  const ttl = calculateTtlIso();

  for (const j of (data.jobs || []).slice(0, 30)) {
    const loc = j.candidate_required_location || 'Worldwide Remote';
    const cleanDesc = stripHtml(j.description || '').slice(0, 3500);

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
      expiresAt: ttl,
      isActive: true,
      lastCheckedAt: now,
    });
  }

  return results;
}

// 4. Arbeitnow Public Aggregator
async function fetchArbeitnow(): Promise<LiveJobItem[]> {
  const url = 'https://www.arbeitnow.com/api/job-board-api';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ApplyWiseAI-JobDiscovery/2.0' },
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) throw new Error(`Arbeitnow returned HTTP ${res.status}`);

  const data = (await res.json()) as {
    data?: Array<{
      slug: string;
      title: string;
      company_name: string;
      location: string;
      remote: boolean;
      url: string;
      description: string;
      tags: string[];
      created_at: number;
    }>;
  };

  const results: LiveJobItem[] = [];
  const now = new Date().toISOString();
  const ttl = calculateTtlIso();

  for (const j of (data.data || []).slice(0, 30)) {
    const cleanDesc = stripHtml(j.description || '').slice(0, 3500);
    const loc = j.location || 'Remote, Global';

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
      publishedAt: new Date(j.created_at * 1000).toISOString(),
      retrievedAt: now,
      expiresAt: ttl,
      isActive: true,
      lastCheckedAt: now,
    });
  }

  return results;
}

// 5. Jobicy Public Aggregator
async function fetchJobicy(): Promise<LiveJobItem[]> {
  const url = 'https://jobicy.com/api/v2/remote-jobs?count=30';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ApplyWiseAI-JobDiscovery/2.0' },
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) throw new Error(`Jobicy returned HTTP ${res.status}`);

  const data = (await res.json()) as {
    jobs?: Array<{
      id: number;
      url: string;
      jobTitle: string;
      companyName: string;
      companyLogo?: string;
      jobIndustry?: string[];
      jobType?: string[];
      jobGeo?: string;
      jobLevel?: string;
      jobDescription?: string;
      pubDate?: string;
      annualSalaryMin?: string;
      annualSalaryMax?: string;
      salaryCurrency?: string;
    }>;
  };

  const results: LiveJobItem[] = [];
  const now = new Date().toISOString();
  const ttl = calculateTtlIso();

  for (const j of (data.jobs || []).slice(0, 30)) {
    const cleanDesc = stripHtml(j.jobDescription || '').slice(0, 3500);
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
      expiresAt: ttl,
      isActive: true,
      lastCheckedAt: now,
    });
  }

  return results;
}

// ============================================================================
// CONNECTOR REGISTRY
// ============================================================================

export const SOURCE_REGISTRY: ConnectorDefinition[] = [
  // 1. Official Greenhouse ATS Connectors
  {
    id: 'gh_cloudflare',
    name: 'Cloudflare Careers',
    company: 'Cloudflare',
    type: 'ats_greenhouse',
    endpoint: 'https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs',
    rateLimitSeconds: 600,
    fetchFn: () => fetchGreenhouseBoard('cloudflare', 'Cloudflare'),
  },
  {
    id: 'gh_figma',
    name: 'Figma Careers',
    company: 'Figma',
    type: 'ats_greenhouse',
    endpoint: 'https://boards-api.greenhouse.io/v1/boards/figma/jobs',
    rateLimitSeconds: 600,
    fetchFn: () => fetchGreenhouseBoard('figma', 'Figma'),
  },
  {
    id: 'gh_gitlab',
    name: 'GitLab Careers',
    company: 'GitLab',
    type: 'ats_greenhouse',
    endpoint: 'https://boards-api.greenhouse.io/v1/boards/gitlab/jobs',
    rateLimitSeconds: 600,
    fetchFn: () => fetchGreenhouseBoard('gitlab', 'GitLab'),
  },
  {
    id: 'gh_databricks',
    name: 'Databricks Careers',
    company: 'Databricks',
    type: 'ats_greenhouse',
    endpoint: 'https://boards-api.greenhouse.io/v1/boards/databricks/jobs',
    rateLimitSeconds: 600,
    fetchFn: () => fetchGreenhouseBoard('databricks', 'Databricks'),
  },

  // 2. Official Lever ATS Connectors
  {
    id: 'lever_spotify',
    name: 'Spotify Careers',
    company: 'Spotify',
    type: 'ats_lever',
    endpoint: 'https://api.lever.co/v0/postings/spotify',
    rateLimitSeconds: 600,
    fetchFn: () => fetchLeverBoard('spotify', 'Spotify'),
  },
  {
    id: 'lever_palantir',
    name: 'Palantir Careers',
    company: 'Palantir Technologies',
    type: 'ats_lever',
    endpoint: 'https://api.lever.co/v0/postings/palantir',
    rateLimitSeconds: 600,
    fetchFn: () => fetchLeverBoard('palantir', 'Palantir Technologies'),
  },

  // 3. Official Aggregator Connectors
  {
    id: 'remotive',
    name: 'Remotive Global',
    company: 'Remotive',
    type: 'aggregator_api',
    endpoint: 'https://remotive.com/api/remote-jobs',
    rateLimitSeconds: 600,
    fetchFn: fetchRemotive,
  },
  {
    id: 'arbeitnow',
    name: 'Arbeitnow Jobs',
    company: 'Arbeitnow',
    type: 'aggregator_api',
    endpoint: 'https://www.arbeitnow.com/api/job-board-api',
    rateLimitSeconds: 600,
    fetchFn: fetchArbeitnow,
  },
  {
    id: 'jobicy',
    name: 'Jobicy Global Remote',
    company: 'Jobicy',
    type: 'aggregator_api',
    endpoint: 'https://jobicy.com/api/v2/remote-jobs',
    rateLimitSeconds: 600,
    fetchFn: fetchJobicy,
  },
];

// ============================================================================
// DEDUPLICATION & NORMALIZATION
// ============================================================================

export function deduplicateJobs(jobs: LiveJobItem[]): LiveJobItem[] {
  const seenKeys = new Set<string>();
  const deduplicated: LiveJobItem[] = [];

  for (const job of jobs) {
    // Normalization fingerprint: strip corporate suffixes (inc, llc, ltd, etc.)
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
    }
  }

  return deduplicated;
}
