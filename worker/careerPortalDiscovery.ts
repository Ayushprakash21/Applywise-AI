// worker/careerPortalDiscovery.ts
// Career Portal Discovery Engine for ApplyWise AI
// Investigates employer websites, identifies external & embedded ATS portals,
// resolves official board identifiers, tests feeds, and resolves company branding.

import {
  DirectAtsType,
  DIRECT_ATS_ADAPTERS,
  resolveEmployerLogo,
  getDirectAtsAdapter,
  AtsFetchResponse,
} from './directAtsAdapters.ts';
import { isSafePublicUrl } from './jobConnectors.ts';

export interface DiscoveryResult {
  success: boolean;
  domain: string;
  careersUrl: string;
  companyName?: string;
  detectedAts: DirectAtsType;
  atsBoardId?: string;
  jobFeedEndpoint?: string;
  logoUrl?: string;
  logoStatus: 'verified' | 'domain_favicon' | 'portal_api' | 'initials';
  isDirectFeedAvailable: boolean;
  testedStatusCode?: number;
  testJobCount?: number;
  detectionMethod: 'url_pattern' | 'embedded_widget' | 'script_tag' | 'json_ld' | 'link_out' | 'custom_portal';
  notes?: string;
  error?: string;
}

// Extract clean base domain from host
export function normalizeDomain(rawDomainOrUrl: string): string {
  try {
    let clean = rawDomainOrUrl.trim().toLowerCase();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    const u = new URL(clean);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return rawDomainOrUrl.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

/**
 * Inspects raw HTML & URL with all known ATS adapters to extract detected ATS, board ID, and endpoint
 */
export function detectAtsFromHtml(
  html: string,
  pageUrl: string
): { detectedAts: DirectAtsType; atsBoardId?: string; jobFeedEndpoint?: string } {
  for (const adapter of DIRECT_ATS_ADAPTERS) {
    const res = adapter.detect(html, pageUrl);
    if (res.detected && res.boardId) {
      return {
        detectedAts: adapter.name,
        atsBoardId: res.boardId,
        jobFeedEndpoint: res.endpoint,
      };
    }
  }

  // Schema.org check
  const jsonLdAdapter = getDirectAtsAdapter('json_ld');
  if (jsonLdAdapter) {
    const res = jsonLdAdapter.detect(html, pageUrl);
    if (res.detected) {
      return {
        detectedAts: 'json_ld',
        atsBoardId: 'schema_jobposting',
        jobFeedEndpoint: pageUrl,
      };
    }
  }

  return { detectedAts: 'custom_portal' };
}

/**
 * Investigates an employer's official domain or careers URL to detect its ATS and verify direct feeds
 */
export async function discoverEmployerCareerPortal(params: {
  domainOrUrl: string;
  preferredName?: string;
  testLiveFeed?: boolean;
}): Promise<DiscoveryResult> {
  const input = params.domainOrUrl.trim();
  const domain = normalizeDomain(input);
  const preferredName = params.preferredName;
  const testLiveFeed = params.testLiveFeed !== false;

  let targetUrl = input.startsWith('http://') || input.startsWith('https://')
    ? input
    : `https://${domain}`;

  // If user passed a bare domain, check if it already is an ATS domain or if we should check /careers
  let isKnownAtsHost = false;
  for (const adapter of DIRECT_ATS_ADAPTERS) {
    const check = adapter.detect('', targetUrl);
    if (check.detected) {
      isKnownAtsHost = true;
      let testJobCount = 0;
      let testedStatus = 200;

      if (testLiveFeed && check.boardId) {
        try {
          const fetchRes = await adapter.fetchJobs({
            id: `temp_${domain}`,
            name: preferredName || domain,
            domain,
            careersUrl: targetUrl,
            country: 'Global',
            industry: 'Technology',
            detectedAts: adapter.name,
            atsBoardId: check.boardId,
            jobFeedEndpoint: check.endpoint,
          });
          testedStatus = fetchRes.httpStatus;
          testJobCount = fetchRes.totalReturned;
        } catch {}
      }

      const { logoUrl, logoStatus } = resolveEmployerLogo(domain);

      return {
        success: true,
        domain,
        careersUrl: targetUrl,
        companyName: preferredName,
        detectedAts: adapter.name,
        atsBoardId: check.boardId,
        jobFeedEndpoint: check.endpoint,
        logoUrl,
        logoStatus,
        isDirectFeedAvailable: Boolean(check.endpoint),
        testedStatusCode: testedStatus,
        testJobCount,
        detectionMethod: 'url_pattern',
        notes: `Direct ATS host recognized for ${adapter.displayName} with board ID: ${check.boardId}`,
      };
    }
  }

  // Not directly an ATS host: fetch and inspect HTML of careers page
  let pageHtml = '';
  let finalCareersUrl = targetUrl;
  let fetchStatus = 0;

  // Potential career paths if bare domain was provided
  const candidateUrls: string[] = [];
  if (!targetUrl.includes('/careers') && !targetUrl.includes('/jobs')) {
    candidateUrls.push(
      `https://${domain}/careers`,
      `https://${domain}/jobs`,
      `https://careers.${domain}`,
      `https://jobs.${domain}`,
      targetUrl
    );
  } else {
    candidateUrls.push(targetUrl);
  }

  for (const urlToTry of candidateUrls) {
    if (!isSafePublicUrl(urlToTry)) continue;
    try {
      const resp = await fetch(urlToTry, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ApplyWiseAI-CareerDiscovery/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (resp.ok) {
        fetchStatus = resp.status;
        finalCareersUrl = resp.url || urlToTry;
        pageHtml = await resp.text();
        break;
      }
    } catch {}
  }

  if (!pageHtml) {
    // If external fetch failed, fallback to domain logo resolution and record as custom
    const { logoUrl, logoStatus } = resolveEmployerLogo(domain);
    return {
      success: true,
      domain,
      careersUrl: targetUrl,
      companyName: preferredName,
      detectedAts: 'custom_portal',
      logoUrl,
      logoStatus,
      isDirectFeedAvailable: false,
      testedStatusCode: fetchStatus,
      testJobCount: 0,
      detectionMethod: 'link_out',
      notes: 'No automated ATS widget detected. Preserved as direct employer career portal link-out.',
    };
  }

  // Inspect page HTML with all ATS adapters
  for (const adapter of DIRECT_ATS_ADAPTERS) {
    const res = adapter.detect(pageHtml, finalCareersUrl);
    if (res.detected && res.boardId) {
      let testJobCount = 0;
      let testedStatus = 200;

      if (testLiveFeed && res.endpoint) {
        try {
          const fetchRes = await adapter.fetchJobs({
            id: `temp_${domain}`,
            name: preferredName || domain,
            domain,
            careersUrl: finalCareersUrl,
            country: 'Global',
            industry: 'Technology',
            detectedAts: adapter.name,
            atsBoardId: res.boardId,
            jobFeedEndpoint: res.endpoint,
          });
          testedStatus = fetchRes.httpStatus;
          testJobCount = fetchRes.totalReturned;
        } catch {}
      }

      // Extract official page logo if present in meta tags
      const metaLogoMatch = pageHtml.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
        pageHtml.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
      const pageLogoUrl = metaLogoMatch ? metaLogoMatch[1] : undefined;
      const { logoUrl, logoStatus } = resolveEmployerLogo(domain, undefined, pageLogoUrl);

      return {
        success: true,
        domain,
        careersUrl: finalCareersUrl,
        companyName: preferredName,
        detectedAts: adapter.name,
        atsBoardId: res.boardId,
        jobFeedEndpoint: res.endpoint,
        logoUrl,
        logoStatus,
        isDirectFeedAvailable: Boolean(res.endpoint),
        testedStatusCode: testedStatus,
        testJobCount,
        detectionMethod: 'embedded_widget',
        notes: `Discovered embedded ${adapter.displayName} with board ID: ${res.boardId}`,
      };
    }
  }

  // Check Schema.org JobPosting JSON-LD
  const jsonLdAdapter = getDirectAtsAdapter('json_ld');
  if (jsonLdAdapter) {
    const jsonLdCheck = jsonLdAdapter.detect(pageHtml, finalCareersUrl);
    if (jsonLdCheck.detected) {
      const { logoUrl, logoStatus } = resolveEmployerLogo(domain);
      return {
        success: true,
        domain,
        careersUrl: finalCareersUrl,
        companyName: preferredName,
        detectedAts: 'json_ld',
        atsBoardId: 'schema_jobposting',
        jobFeedEndpoint: finalCareersUrl,
        logoUrl,
        logoStatus,
        isDirectFeedAvailable: true,
        testedStatusCode: 200,
        testJobCount: 0,
        detectionMethod: 'json_ld',
        notes: 'Discovered direct Schema.org JobPosting structured data on employer careers page',
      };
    }
  }

  // Default: Custom direct portal link-out
  const { logoUrl, logoStatus } = resolveEmployerLogo(domain);
  return {
    success: true,
    domain,
    careersUrl: finalCareersUrl,
    companyName: preferredName,
    detectedAts: 'custom_portal',
    logoUrl,
    logoStatus,
    isDirectFeedAvailable: false,
    testedStatusCode: fetchStatus || 200,
    testJobCount: 0,
    detectionMethod: 'custom_portal',
    notes: 'Preserved as official employer career portal with direct candidate application link.',
  };
}
