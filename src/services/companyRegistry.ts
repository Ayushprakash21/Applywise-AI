// src/services/companyRegistry.ts
// Canonical Company Metadata Registry & Multi-Tier Logo Resolver for ApplyWise AI

export interface CompanyMetadata {
  canonicalName: string;
  domain: string;
  aliases: string[];
  verifiedLogoUrl?: string;
  brandColor?: string;
}

export interface LogoResolutionResult {
  url: string | null;
  source: 'source_api' | 'company_domain' | 'clearbit_logo' | 'google_favicon' | 'initials';
  domain: string | null;
  verifiedAt?: string;
  initials: string;
}

export const CANONICAL_COMPANY_REGISTRY: Record<string, CompanyMetadata> = {
  microsoft: {
    canonicalName: 'Microsoft',
    domain: 'microsoft.com',
    aliases: ['microsoft corp', 'microsoft corporation', 'msft'],
    verifiedLogoUrl: 'https://logo.clearbit.com/microsoft.com',
    brandColor: '#00A4EF',
  },
  meta: {
    canonicalName: 'Meta',
    domain: 'meta.com',
    aliases: ['facebook', 'meta platforms', 'facebook inc', 'meta platforms inc'],
    verifiedLogoUrl: 'https://logo.clearbit.com/meta.com',
    brandColor: '#0081FB',
  },
  swiggy: {
    canonicalName: 'Swiggy',
    domain: 'swiggy.com',
    aliases: ['bundl technologies', 'swiggy delivery', 'swiggy india'],
    verifiedLogoUrl: 'https://logo.clearbit.com/swiggy.com',
    brandColor: '#FC8019',
  },
  uber: {
    canonicalName: 'Uber',
    domain: 'uber.com',
    aliases: ['uber technologies', 'uber inc'],
    verifiedLogoUrl: 'https://logo.clearbit.com/uber.com',
    brandColor: '#000000',
  },
  apple: {
    canonicalName: 'Apple',
    domain: 'apple.com',
    aliases: ['apple inc', 'apple computer'],
    verifiedLogoUrl: 'https://logo.clearbit.com/apple.com',
    brandColor: '#555555',
  },
  google: {
    canonicalName: 'Google',
    domain: 'google.com',
    aliases: ['alphabet', 'google llc', 'google inc'],
    verifiedLogoUrl: 'https://logo.clearbit.com/google.com',
    brandColor: '#4285F4',
  },
  amazon: {
    canonicalName: 'Amazon',
    domain: 'amazon.com',
    aliases: ['amazon.com', 'aws', 'amazon web services'],
    verifiedLogoUrl: 'https://logo.clearbit.com/amazon.com',
    brandColor: '#FF9900',
  },
  stripe: {
    canonicalName: 'Stripe',
    domain: 'stripe.com',
    aliases: ['stripe inc', 'stripe payments'],
    verifiedLogoUrl: 'https://logo.clearbit.com/stripe.com',
    brandColor: '#635BFF',
  },
  linear: {
    canonicalName: 'Linear',
    domain: 'linear.app',
    aliases: ['linear app', 'linear orbit'],
    verifiedLogoUrl: 'https://logo.clearbit.com/linear.app',
    brandColor: '#5E6AD2',
  },
  vercel: {
    canonicalName: 'Vercel',
    domain: 'vercel.com',
    aliases: ['zeit', 'vercel inc'],
    verifiedLogoUrl: 'https://logo.clearbit.com/vercel.com',
    brandColor: '#000000',
  },
  cloudflare: {
    canonicalName: 'Cloudflare',
    domain: 'cloudflare.com',
    aliases: ['cloudflare inc'],
    verifiedLogoUrl: 'https://logo.clearbit.com/cloudflare.com',
    brandColor: '#F38020',
  },
  figma: {
    canonicalName: 'Figma',
    domain: 'figma.com',
    aliases: ['figma inc'],
    verifiedLogoUrl: 'https://logo.clearbit.com/figma.com',
    brandColor: '#F24E1E',
  },
  gitlab: {
    canonicalName: 'GitLab',
    domain: 'gitlab.com',
    aliases: ['gitlab inc'],
    verifiedLogoUrl: 'https://logo.clearbit.com/gitlab.com',
    brandColor: '#FC6D26',
  },
  databricks: {
    canonicalName: 'Databricks',
    domain: 'databricks.com',
    aliases: ['databricks inc'],
    verifiedLogoUrl: 'https://logo.clearbit.com/databricks.com',
    brandColor: '#FF3621',
  },
  spotify: {
    canonicalName: 'Spotify',
    domain: 'spotify.com',
    aliases: ['spotify ab', 'spotify usa'],
    verifiedLogoUrl: 'https://logo.clearbit.com/spotify.com',
    brandColor: '#1DB954',
  },
  palantir: {
    canonicalName: 'Palantir',
    domain: 'palantir.com',
    aliases: ['palantir technologies'],
    verifiedLogoUrl: 'https://logo.clearbit.com/palantir.com',
    brandColor: '#101113',
  },
  notion: {
    canonicalName: 'Notion',
    domain: 'notion.so',
    aliases: ['notion labs', 'notion app'],
    verifiedLogoUrl: 'https://logo.clearbit.com/notion.so',
    brandColor: '#000000',
  },
  invision: {
    canonicalName: 'InVision',
    domain: 'invisionapp.com',
    aliases: ['invisionapp'],
    verifiedLogoUrl: 'https://logo.clearbit.com/invisionapp.com',
    brandColor: '#FF3366',
  },
  visa: {
    canonicalName: 'Visa',
    domain: 'visa.com',
    aliases: ['visa inc', 'visa international'],
    verifiedLogoUrl: 'https://logo.clearbit.com/visa.com',
    brandColor: '#1A1F71',
  },
  bunq: {
    canonicalName: 'bunq',
    domain: 'bunq.com',
    aliases: ['bunq b.v.', 'bunq bank'],
    verifiedLogoUrl: 'https://logo.clearbit.com/bunq.com',
    brandColor: '#00C853',
  },
  razorpay: {
    canonicalName: 'Razorpay',
    domain: 'razorpay.com',
    aliases: ['razorpay software', 'razorpay payments'],
    verifiedLogoUrl: 'https://logo.clearbit.com/razorpay.com',
    brandColor: '#0C2340',
  },
  cred: {
    canonicalName: 'CRED',
    domain: 'cred.club',
    aliases: ['dreamplug technologies'],
    verifiedLogoUrl: 'https://logo.clearbit.com/cred.club',
    brandColor: '#000000',
  },
  meesho: {
    canonicalName: 'Meesho',
    domain: 'meesho.com',
    aliases: ['fashnear technologies', 'meesho india'],
    verifiedLogoUrl: 'https://logo.clearbit.com/meesho.com',
    brandColor: '#800080',
  },
  inmobi: {
    canonicalName: 'InMobi',
    domain: 'inmobi.com',
    aliases: ['inmobi technology'],
    verifiedLogoUrl: 'https://logo.clearbit.com/inmobi.com',
    brandColor: '#E2231A',
  },
  postman: {
    canonicalName: 'Postman',
    domain: 'postman.com',
    aliases: ['postdot technologies'],
    verifiedLogoUrl: 'https://logo.clearbit.com/postman.com',
    brandColor: '#FF6C37',
  },
  zomato: {
    canonicalName: 'Zomato',
    domain: 'zomato.com',
    aliases: ['zomato media'],
    verifiedLogoUrl: 'https://logo.clearbit.com/zomato.com',
    brandColor: '#E23744',
  },
  flipkart: {
    canonicalName: 'Flipkart',
    domain: 'flipkart.com',
    aliases: ['flipkart internet'],
    verifiedLogoUrl: 'https://logo.clearbit.com/flipkart.com',
    brandColor: '#2874F0',
  },
  netflix: {
    canonicalName: 'Netflix',
    domain: 'netflix.com',
    aliases: ['netflix inc'],
    verifiedLogoUrl: 'https://logo.clearbit.com/netflix.com',
    brandColor: '#E50914',
  },
  airbnb: {
    canonicalName: 'Airbnb',
    domain: 'airbnb.com',
    aliases: ['airbnb inc'],
    verifiedLogoUrl: 'https://logo.clearbit.com/airbnb.com',
    brandColor: '#FF5A5F',
  },
  supabase: {
    canonicalName: 'Supabase',
    domain: 'supabase.com',
    aliases: ['supabase inc'],
    verifiedLogoUrl: 'https://logo.clearbit.com/supabase.com',
    brandColor: '#3ECF8E',
  },
};

/**
 * Normalizes company name for deterministic lookup
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[,\.]/g, '')
    .replace(/\b(inc|corp|corporation|llc|ltd|limited|technologies|technology|b\.v\.|pvt|private|co)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract domain from website or URL string
 */
export function normalizeDomain(raw?: string): string | null {
  if (!raw || !raw.trim()) return null;
  let str = raw.trim().toLowerCase();
  try {
    if (str.startsWith('http://') || str.startsWith('https://')) {
      const u = new URL(str);
      str = u.hostname;
    } else {
      str = str.split('/')[0].split('?')[0];
    }
    return str.replace(/^www\./, '').trim() || null;
  } catch {
    return null;
  }
}

/**
 * Extract 1-2 letter initials from company name for clean typography fallback
 */
export function getCompanyInitials(name?: string): string {
  if (!name || !name.trim()) return 'CO';
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return name.trim().charAt(0).toUpperCase() || 'CO';
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/**
 * Resolve canonical company metadata
 */
export function lookupCompanyMetadata(companyName: string): CompanyMetadata | null {
  if (!companyName) return null;
  const normalized = normalizeCompanyName(companyName);
  
  // Exact key check
  if (CANONICAL_COMPANY_REGISTRY[normalized]) {
    return CANONICAL_COMPANY_REGISTRY[normalized];
  }

  // Alias lookup
  for (const meta of Object.values(CANONICAL_COMPANY_REGISTRY)) {
    if (normalizeCompanyName(meta.canonicalName) === normalized) {
      return meta;
    }
    for (const alias of meta.aliases) {
      if (normalizeCompanyName(alias) === normalized) {
        return meta;
      }
    }
  }

  return null;
}

// In-memory cache for resolved logo outcomes to prevent repeated network probes
const RESOLVED_LOGOS_CACHE = new Map<string, LogoResolutionResult>();

/**
 * Multi-Tier Logo Resolution Priority:
 * 1. Official logo URL returned by the source (Remotive, Jobicy, JSON-LD, etc.)
 * 2. Verified company domain and official clearbit/favicon image
 * 3. Google High-Res Favicon via verified domain
 * 4. Initials-based fallback
 */
export function resolveCompanyLogo(
  companyName: string,
  providedLogoUrl?: string | null,
  providedDomain?: string | null
): LogoResolutionResult {
  const cacheKey = `${companyName || ''}::${providedLogoUrl || ''}::${providedDomain || ''}`;
  if (RESOLVED_LOGOS_CACHE.has(cacheKey)) {
    return RESOLVED_LOGOS_CACHE.get(cacheKey)!;
  }

  const initials = getCompanyInitials(companyName);
  const meta = lookupCompanyMetadata(companyName);
  const domain = providedDomain || meta?.domain || null;

  // 1. If a valid, non-empty source API logo URL was provided
  if (providedLogoUrl && typeof providedLogoUrl === 'string' && providedLogoUrl.trim().startsWith('http')) {
    const result: LogoResolutionResult = {
      url: providedLogoUrl.trim(),
      source: 'source_api',
      domain,
      verifiedAt: new Date().toISOString(),
      initials,
    };
    RESOLVED_LOGOS_CACHE.set(cacheKey, result);
    return result;
  }

  // 2. If company has verified metadata in registry
  if (meta?.verifiedLogoUrl) {
    const result: LogoResolutionResult = {
      url: meta.verifiedLogoUrl,
      source: 'company_domain',
      domain: meta.domain,
      verifiedAt: new Date().toISOString(),
      initials,
    };
    RESOLVED_LOGOS_CACHE.set(cacheKey, result);
    return result;
  }

  // 3. If verified domain is known, construct high-res domain logo
  if (domain) {
    const result: LogoResolutionResult = {
      url: `https://logo.clearbit.com/${domain}`,
      source: 'clearbit_logo',
      domain,
      verifiedAt: new Date().toISOString(),
      initials,
    };
    RESOLVED_LOGOS_CACHE.set(cacheKey, result);
    return result;
  }

  // 4. Fallback to Initials
  const fallbackResult: LogoResolutionResult = {
    url: null,
    source: 'initials',
    domain: null,
    initials,
  };
  RESOLVED_LOGOS_CACHE.set(cacheKey, fallbackResult);
  return fallbackResult;
}
