import { sanitizeIngestedDescription } from './jobConnectors.ts';
// worker/jobDiscovery.ts
// Direct Employer Career Portal Discovery Engine & Fallback Ingestion for Cloudflare Workers

import { JobVacancy } from '../src/types/index.ts';
import { SEED_DIRECT_EMPLOYERS, fetchDirectEmployerJobs, EmployerRecord } from './employerRegistry.ts';

export interface DiscoveryQuery {
  query?: string;
  category?: string;
  country?: string;
  remoteOnly?: boolean;
  limit?: number;
}

export const workerJobDiscovery = {
  /**
   * Search direct company career portals first, prioritizing official ATS public feeds,
   * with secondary supplemental backfill from aggregators.
   */
  async searchJobs(params: DiscoveryQuery): Promise<{ vacancies: JobVacancy[]; errors: string[] }> {
    const directVacancies: JobVacancy[] = [];
    const aggregatorVacancies: JobVacancy[] = [];
    const errors: string[] = [];
    const q = params.query?.trim().toLowerCase() || '';
    const targetCountry = params.country?.trim().toLowerCase() || '';
    const limitTotal = params.limit || 30;

    // =========================================================================
    // 1. DIRECT EMPLOYER CAREER PORTALS (PRIMARY JOB SUPPLY)
    // =========================================================================
    try {
      // Filter candidates from seed employers
      let candidates = SEED_DIRECT_EMPLOYERS.filter(e => e.isEnabled && e.jobFeedEndpoint);

      if (targetCountry) {
        const countryMatches = candidates.filter(e => e.country.toLowerCase().includes(targetCountry));
        if (countryMatches.length > 0) candidates = countryMatches;
      }

      // If query matches company name or industry, prioritize those employers
      if (q) {
        const matched = candidates.filter(e =>
          e.name.toLowerCase().includes(q) ||
          e.industry.toLowerCase().includes(q) ||
          e.domain.toLowerCase().includes(q)
        );
        if (matched.length > 0) {
          candidates = [...matched, ...candidates.filter(c => !matched.includes(c))];
        }
      }

      // Pick top 8-12 employers for live concurrent direct fetch
      const selectedEmployers = candidates.slice(0, 10);
      const directPromises = selectedEmployers.map(async (emp) => {
        try {
          const fullRecord: EmployerRecord = {
            id: emp.id || `emp_${emp.domain.replace(/\./g, '_')}`,
            name: emp.name,
            domain: emp.domain,
            careersUrl: emp.careersUrl,
            country: emp.country,
            industry: emp.industry,
            companySize: emp.companySize,
            detectedAts: emp.detectedAts,
            atsBoardId: emp.atsBoardId,
            jobFeedEndpoint: emp.jobFeedEndpoint,
            logoUrl: emp.logoUrl,
            logoStatus: emp.logoStatus,
            lastDiscoveryTime: new Date().toISOString(),
            fetchStatus: 'idle',
            isEnabled: true,
            totalJobsActive: 0,
          };

          const timeoutController = new AbortController();
          const timer = setTimeout(() => timeoutController.abort(), 6000);
          const result = await fetchDirectEmployerJobs(fullRecord, timeoutController.signal);
          clearTimeout(timer);

          return result.jobs;
        } catch (err: unknown) {
          errors.push(`Direct portal fetch (${emp.name}): ${err instanceof Error ? err.message : String(err)}`);
          return [];
        }
      });

      const directResults = await Promise.allSettled(directPromises);
      for (const res of directResults) {
        if (res.status === 'fulfilled' && res.value.length > 0) {
          for (const item of res.value) {
            // Apply text query filter if specified
            if (q) {
              const textContent = `${item.title} ${item.description} ${(item.tags || []).join(' ')} ${item.location}`.toLowerCase();
              if (!textContent.includes(q)) continue;
            }

            if (params.remoteOnly && item.workArrangement !== 'remote') {
              continue;
            }

            directVacancies.push({
              id: item.id,
              source: `direct_${item.atsProvider}`,
              title: item.title,
              company: item.employerName,
              companyLogo: item.companyLogo,
              location: item.location,
              country: item.country || 'Global',
              remote: item.workArrangement === 'remote',
              arrangement: item.workArrangement,
              url: item.originalApplicationUrl || item.originalJobUrl,
              description: sanitizeIngestedDescription(item.description || ''),
              requirements: item.requirements || [],
              tags: item.tags || [item.atsProvider],
              publishedAt: item.publishedAt || new Date().toISOString(),
              salaryRange: item.salaryRaw ? { raw: item.salaryRaw } : undefined,
              visaSponsorship: 'unknown',
              retrievedAt: new Date().toISOString(),
              isActive: true,
              lastCheckedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err: unknown) {
      errors.push(`Direct employer discovery coordinator: ${err instanceof Error ? err.message : String(err)}`);
    }

    // =========================================================================
    // 2. SECONDARY SUPPLEMENTAL AGGREGATORS (Backfill only if needed)
    // =========================================================================
    if (directVacancies.length < limitTotal) {
      const neededCount = limitTotal - directVacancies.length;
      const limitPerSource = Math.min(Math.ceil(neededCount / 3), 10);

      // Remotive API
      try {
        const searchParam = q ? `search=${encodeURIComponent(q)}&` : '';
        const url = `https://remotive.com/api/remote-jobs?${searchParam}limit=${limitPerSource}`;
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'ApplyWiseAI/2.0' },
          signal: AbortSignal.timeout(6000),
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
              const cleanDesc = sanitizeIngestedDescription(item.description || '');
              const location = item.candidate_required_location || 'Worldwide Remote';
              aggregatorVacancies.push({
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
                description: cleanDesc,
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
        errors.push(`Remotive adapter: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Arbeitnow API
      try {
        const resp = await fetch('https://www.arbeitnow.com/api/job-board-api', {
          headers: { 'User-Agent': 'ApplyWiseAI/2.0' },
          signal: AbortSignal.timeout(6000),
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
                const matchesQ = item.title.toLowerCase().includes(q) ||
                                 item.description.toLowerCase().includes(q) ||
                                 item.tags.some(t => t.toLowerCase().includes(q));
                if (!matchesQ) continue;
              }

              const cleanDesc = sanitizeIngestedDescription(item.description || '');
              aggregatorVacancies.push({
                id: `arbeitnow_${item.slug}`,
                source: 'arbeitnow',
                title: item.title,
                company: item.company_name,
                location: item.location || 'Remote, Global',
                country: item.remote ? 'Remote' : (item.location || 'European Union'),
                remote: !!item.remote,
                arrangement: item.remote ? 'remote' : 'hybrid',
                url: item.url,
                description: cleanDesc,
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
        errors.push(`Arbeitnow adapter: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Combine prioritizing direct employer vacancies
    const combined = [...directVacancies, ...aggregatorVacancies];

    // Deduplicate vacancies by normalized company + title
    const seen = new Set<string>();
    const deduplicated: JobVacancy[] = [];
    for (const v of combined) {
      const key = `${v.company.toLowerCase().trim()}::${v.title.toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(v);
      }
    }

    return { vacancies: deduplicated.slice(0, limitTotal), errors };
  },

  async recheckVacancy(vacancy: JobVacancy): Promise<{ isActive: boolean; lastCheckedAt: string }> {
    try {
      const resp = await fetch(vacancy.url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'ApplyWiseAI/2.0' },
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
