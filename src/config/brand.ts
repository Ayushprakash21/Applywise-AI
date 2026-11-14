/**
 * APPLYVISE AI — Centralized Global Brand Configuration & Positioning
 * 
 * Official Brand Positioning:
 * - Headline: "India's First AI-Powered Job Discovery & Application Automation Platform."
 * - Tagline: "Find opportunities before the crowd. Let AI do the heavy lifting."
 * - Description: "ApplyVise combines global job discovery, intelligent job matching, AI resume engineering, recruiter intelligence and automated applications to transform how people find and apply for jobs."
 * 
 * NOTE ON SUBSTANTIATION (Section 5 Compliance):
 * "India's First" is a factual market-leadership claim preserved per official product specification.
 * It is flagged here for legal/commercial substantiation prior to public commercial advertising.
 */

export interface BrandConfig {
  name: string;
  shortName: string;
  legalName: string;
  headline: string;
  tagline: string;
  description: string;
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
  claims: {
    marketLeadershipClaim: string;
    substantiationRequired: boolean;
    substantiationNote: string;
  };
  social: {
    twitterHandle?: string;
    linkedInUrl?: string;
  };
}

export const BRAND_CONFIG: BrandConfig = {
  name: 'ApplyVise AI',
  shortName: 'ApplyVise',
  legalName: 'ApplyVise AI Technologies',
  // Official brand headline
  headline: "India's First AI-Powered Job Discovery & Application Automation Platform.",
  // Official supporting tagline
  tagline: 'Find opportunities before the crowd. Let AI do the heavy lifting.',
  // Official product description
  description:
    'ApplyVise combines global job discovery, intelligent job matching, AI resume engineering, recruiter intelligence and automated applications to transform how people find and apply for jobs.',
  shortDescription:
    'Find opportunities before the crowd. Let AI do the heavy lifting with automated discovery, matching, and applications.',
  seoTitle: "ApplyVise AI — India's First AI-Powered Job Discovery & Application Automation Platform",
  seoDescription:
    'ApplyVise combines global job discovery, intelligent job matching, AI resume engineering, recruiter intelligence and automated applications to transform how people find and apply for jobs.',
  claims: {
    marketLeadershipClaim: "India's First AI-Powered Job Discovery & Application Automation Platform",
    substantiationRequired: true,
    substantiationNote:
      "Factual market-leadership claim flagged for substantiation documentation prior to public commercial advertising.",
  },
  social: {
    twitterHandle: '@applyvise',
    linkedInUrl: 'https://linkedin.com/company/applyvise',
  },
};
