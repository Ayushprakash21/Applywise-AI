// worker/jobDiscovery.ts
// Real Multi-Aggregator Job Discovery for Cloudflare Workers

import { JobVacancy } from '../src/types/index.ts';

export interface DiscoveryQuery {
  query?: string;
  category?: string;
  country?: string;
  remoteOnly?: boolean;
  limit?: number;
}

export const workerJobDiscovery = {
  /**
   * Search multiple public job aggregators and return normalized, deduplicated listings.
   */
  async searchJobs(params: DiscoveryQuery): Promise<{ vacancies: JobVacancy[]; errors: string[] }> {
    const vacancies: JobVacancy[] = [];
    const errors: string[] = [];
    const q = params.query?.trim() || '';
    const limitPerSource = Math.min(params.limit || 15, 25);

    // 1. Remotive API
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

    // 2. Arbeitnow API
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
            if (q) {
              const matchesQ = item.title.toLowerCase().includes(q.toLowerCase()) ||
                               item.description.toLowerCase().includes(q.toLowerCase()) ||
                               item.tags.some(t => t.toLowerCase().includes(q.toLowerCase()));
              if (!matchesQ) continue;
            }

            const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            vacancies.push({
              id: `arbeitnow_${item.slug}`,
              source: 'arbeitnow',
              title: item.title,
              company: item.company_name,
              location: item.location || 'Remote, Global',
              country: item.remote ? 'Remote' : (item.location || 'European Union'),
              remote: !!item.remote,
              arrangement: item.remote ? 'remote' : 'hybrid',
              url: item.url,
              description: cleanDesc.slice(0, 4000),
              requirements: item.tags || [],
              tags: item.tags || [],
              publishedAt: new Date(item.created_at * 1000).toISOString(),
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
      errors.push(`Arbeitnow adapter: ${msg}`);
    }

    // 3. Jobicy API
    try {
      const count = Math.min(limitPerSource, 20);
      const resp = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=${count}${q ? `&tag=${encodeURIComponent(q)}` : ''}`, {
        headers: { 'User-Agent': 'ApplyViseAI/2.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (resp.ok) {
        const data = (await resp.json()) as {
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
            jobExcerpt?: string;
            jobDescription?: string;
            pubDate?: string;
            annualSalaryMin?: string;
            annualSalaryMax?: string;
            salaryCurrency?: string;
          }>;
        };

        if (data.jobs && Array.isArray(data.jobs)) {
          for (const item of data.jobs) {
            const cleanDesc = (item.jobDescription || item.jobExcerpt || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            const salaryRaw = item.annualSalaryMin && item.annualSalaryMax
              ? `${item.salaryCurrency || '$'}${item.annualSalaryMin} - ${item.annualSalaryMax}`
              : undefined;

            vacancies.push({
              id: `jobicy_${item.id}`,
              source: 'jobicy',
              title: item.jobTitle,
              company: item.companyName,
              companyLogo: item.companyLogo,
              location: item.jobGeo || 'Anywhere (Remote)',
              country: item.jobGeo?.includes('USA') ? 'United States' : (item.jobGeo || 'Remote'),
              remote: true,
              arrangement: 'remote',
              url: item.url,
              description: cleanDesc.slice(0, 4000),
              requirements: item.jobIndustry || ['Remote'],
              tags: item.jobIndustry || [],
              publishedAt: item.pubDate || new Date().toISOString(),
              salaryRange: salaryRaw ? { raw: salaryRaw } : undefined,
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

    // Deduplicate vacancies by normalized company + title
    const seen = new Set<string>();
    const deduplicated: JobVacancy[] = [];
    for (const v of vacancies) {
      const key = `${v.company.toLowerCase().trim()}::${v.title.toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(v);
      }
    }

    return { vacancies: deduplicated, errors };
  },

  async recheckVacancy(vacancy: JobVacancy): Promise<{ isActive: boolean; lastCheckedAt: string }> {
    try {
      const resp = await fetch(vacancy.url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'ApplyViseAI/2.0' },
        signal: AbortSignal.timeout(5000),
      });
      return {
        isActive: resp.status < 400,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch {
      return {
        isActive: true,
        lastCheckedAt: new Date().toISOString(),
      };
    }
  },
};
