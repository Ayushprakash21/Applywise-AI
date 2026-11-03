import { JobVacancy } from '../src/types/index.ts';

export interface DiscoveryQuery {
  query?: string;
  category?: string;
  country?: string;
  remoteOnly?: boolean;
  limit?: number;
}

export const jobDiscovery = {
  /**
   * Search multiple public job aggregators and return normalized, deduplicated listings.
   */
  async searchJobs(params: DiscoveryQuery): Promise<{ vacancies: JobVacancy[]; errors: string[] }> {
    const vacancies: JobVacancy[] = [];
    const errors: string[] = [];
    const q = params.query?.trim() || '';
    const limitPerSource = Math.min(params.limit || 15, 25);

    // 1. Remotive API (Multi-category, remote)
    try {
      const searchParam = q ? `search=${encodeURIComponent(q)}&` : '';
      const url = `https://remotive.com/api/remote-jobs?${searchParam}limit=${limitPerSource}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'ApplyViseAI/2.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (resp.ok) {
        const data = (await resp.json()) as {
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

        if (data.jobs && Array.isArray(data.jobs)) {
          for (const item of data.jobs) {
            const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            const location = item.candidate_required_location || 'Worldwide Remote';
            vacancies.push({
              id: `remotive_${item.id}`,
              source: 'remotive',
              title: item.title,
              company: item.company_name,
              companyLogo: item.company_logo,
              location,
              country: location.includes('USA') ? 'United States' : (location.includes('UK') ? 'United Kingdom' : 'Remote Worldwide'),
              remote: true,
              arrangement: 'remote',
              url: item.url,
              description: cleanDesc.slice(0, 4000),
              requirements: item.tags && item.tags.length > 0 ? item.tags : [item.category || 'General'],
              tags: item.tags || [],
              publishedAt: item.publication_date || new Date().toISOString(),
              salaryRange: item.salary ? { raw: item.salary } : undefined,
              visaSponsorship: 'unknown',
              retrievedAt: new Date().toISOString(),
              isActive: true,
              lastCheckedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Remotive adapter: ${msg}`);
    }

    // 2. Arbeitnow API (Tech, Operations, Marketing, Global / EU)
    try {
      const resp = await fetch('https://www.arbeitnow.com/api/job-board-api', {
        headers: { 'User-Agent': 'ApplyViseAI/2.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (resp.ok) {
        const data = (await resp.json()) as {
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

        if (data.data && Array.isArray(data.data)) {
          for (const item of data.data.slice(0, limitPerSource)) {
            // Apply client query filter if query supplied
            if (q) {
              const lowerQ = q.toLowerCase();
              const matchTitle = item.title.toLowerCase().includes(lowerQ);
              const matchCompany = item.company_name.toLowerCase().includes(lowerQ);
              const matchTags = item.tags.some(t => t.toLowerCase().includes(lowerQ));
              if (!matchTitle && !matchCompany && !matchTags) continue;
            }

            const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            const loc = item.location || 'Remote';
            vacancies.push({
              id: `arbeitnow_${item.slug}`,
              source: 'arbeitnow',
              title: item.title,
              company: item.company_name,
              location: loc,
              country: loc.toLowerCase().includes('germany') ? 'Germany' : 'Europe/Global',
              remote: !!item.remote,
              arrangement: item.remote ? 'remote' : 'hybrid',
              url: item.url,
              description: cleanDesc.slice(0, 4000),
              requirements: item.tags || ['General'],
              tags: item.tags || [],
              publishedAt: new Date(item.created_at * 1000).toISOString(),
              visaSponsorship: cleanDesc.toLowerCase().includes('visa') ? 'supported' : 'unknown',
              retrievedAt: new Date().toISOString(),
              isActive: true,
              lastCheckedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Arbeitnow adapter: ${msg}`);
    }

    // 3. Jobicy Remote Jobs API
    try {
      const tagParam = q ? `&tag=${encodeURIComponent(q.toLowerCase())}` : '';
      const resp = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=${limitPerSource}${tagParam}`, {
        headers: { 'User-Agent': 'ApplyViseAI/2.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (resp.ok) {
        const data = (await resp.json()) as {
          jobs?: Array<{
            id: number;
            jobTitle: string;
            companyName: string;
            companyLogo?: string;
            jobGeo?: string;
            url: string;
            jobDescription: string;
            jobType?: string[];
            pubDate: string;
            annualSalaryMin?: string;
            annualSalaryMax?: string;
            salaryCurrency?: string;
          }>;
        };

        if (data.jobs && Array.isArray(data.jobs)) {
          for (const item of data.jobs) {
            const cleanDesc = (item.jobDescription || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            const salary = item.annualSalaryMin && item.annualSalaryMax
              ? {
                  min: parseInt(item.annualSalaryMin, 10),
                  max: parseInt(item.annualSalaryMax, 10),
                  currency: item.salaryCurrency || 'USD',
                  raw: `${item.salaryCurrency || '$'}${item.annualSalaryMin} - ${item.annualSalaryMax}`,
                }
              : undefined;

            vacancies.push({
              id: `jobicy_${item.id}`,
              source: 'jobicy',
              title: item.jobTitle,
              company: item.companyName,
              companyLogo: item.companyLogo,
              location: item.jobGeo || 'Remote Worldwide',
              country: item.jobGeo || 'Remote',
              remote: true,
              arrangement: 'remote',
              url: item.url,
              description: cleanDesc.slice(0, 4000),
              requirements: item.jobType || ['Full-Time'],
              tags: item.jobType || [],
              publishedAt: item.pubDate || new Date().toISOString(),
              salaryRange: salary,
              visaSponsorship: 'unknown',
              retrievedAt: new Date().toISOString(),
              isActive: true,
              lastCheckedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Jobicy adapter: ${msg}`);
    }

    // Deduplicate across sources by normalized title + company
    const deduplicated: JobVacancy[] = [];
    const seenKeys = new Set<string>();

    for (const v of vacancies) {
      const key = `${v.title.toLowerCase().replace(/[^a-z0-9]/g, '')}_${v.company.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        deduplicated.push(v);
      }
    }

    return { vacancies: deduplicated, errors };
  },

  /**
   * Recheck if an external vacancy is still reachable.
   */
  async recheckVacancy(vacancy: JobVacancy): Promise<{ isActive: boolean; lastCheckedAt: string }> {
    try {
      const resp = await fetch(vacancy.url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'ApplyViseAI/2.0' },
        signal: AbortSignal.timeout(5000),
      });
      const active = resp.status < 400;
      return { isActive: active, lastCheckedAt: new Date().toISOString() };
    } catch {
      return { isActive: true, lastCheckedAt: new Date().toISOString() };
    }
  },
};
