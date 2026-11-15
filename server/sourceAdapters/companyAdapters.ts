// server/sourceAdapters/companyAdapters.ts
// Curated Company Career Adapters for Indian Tech, Global Product Leaders & Remote Startups

import { JobSourceAdapter, AdapterFetchResult, SourceHealth, QueryOptions, DiscoveredJob } from './types.ts';
import {
  GreenhouseSourceAdapter,
  LeverSourceAdapter,
  AshbySourceAdapter,
  SmartRecruitersSourceAdapter,
  CustomCareersSourceAdapter,
} from './atsAdapters.ts';
import { WorkdaySourceAdapter } from './workdayAdapter.ts';
import { BambooHRSourceAdapter } from './bamboohrAdapter.ts';
import { SchemaOrgJobAdapter } from './schemaOrgAdapter.ts';

export interface CompanyRegistryEntry {
  companyName: string;
  category: 'indian_tech' | 'global_product' | 'remote_startup' | 'enterprise_consulting';
  country: string;
  website: string;
  careersUrl: string;
  atsPlatform: 'greenhouse' | 'lever' | 'ashby' | 'smartrecruiters' | 'workday' | 'bamboohr' | 'schema_org' | 'custom';
  tokenOrSlug: string;
  recruitmentInboxes?: string[];
}

export const CURATED_COMPANY_REGISTRY: CompanyRegistryEntry[] = [
  // --- INDIAN TECH LEADERS & HIGH-GROWTH STARTUPS ---
  {
    companyName: 'Razorpay',
    category: 'indian_tech',
    country: 'India',
    website: 'https://razorpay.com',
    careersUrl: 'https://razorpay.com/jobs',
    atsPlatform: 'greenhouse',
    tokenOrSlug: 'razorpaysoftware',
    recruitmentInboxes: ['careers@razorpay.com', 'talent@razorpay.com'],
  },
  {
    companyName: 'CRED',
    category: 'indian_tech',
    country: 'India',
    website: 'https://cred.club',
    careersUrl: 'https://cred.club/careers',
    atsPlatform: 'lever',
    tokenOrSlug: 'cred',
    recruitmentInboxes: ['careers@cred.club', 'talent@cred.club'],
  },
  {
    companyName: 'Meesho',
    category: 'indian_tech',
    country: 'India',
    website: 'https://meesho.com',
    careersUrl: 'https://meesho.io/jobs',
    atsPlatform: 'greenhouse',
    tokenOrSlug: 'meesho',
    recruitmentInboxes: ['careers@meesho.com', 'hiring@meesho.com'],
  },
  {
    companyName: 'InMobi',
    category: 'indian_tech',
    country: 'India',
    website: 'https://inmobi.com',
    careersUrl: 'https://inmobi.com/company/careers',
    atsPlatform: 'greenhouse',
    tokenOrSlug: 'inmobi',
    recruitmentInboxes: ['talent.acquisition@inmobi.com', 'careers@inmobi.com'],
  },
  {
    companyName: 'Postman',
    category: 'indian_tech',
    country: 'India / Global',
    website: 'https://postman.com',
    careersUrl: 'https://postman.com/careers',
    atsPlatform: 'greenhouse',
    tokenOrSlug: 'postman',
    recruitmentInboxes: ['careers@postman.com'],
  },
  {
    companyName: 'Swiggy',
    category: 'indian_tech',
    country: 'India',
    website: 'https://swiggy.com',
    careersUrl: 'https://careers.swiggy.com',
    atsPlatform: 'lever',
    tokenOrSlug: 'swiggy',
    recruitmentInboxes: ['careers@swiggy.in', 'talent@swiggy.in'],
  },
  {
    companyName: 'Zomato',
    category: 'indian_tech',
    country: 'India',
    website: 'https://zomato.com',
    careersUrl: 'https://zomato.com/careers',
    atsPlatform: 'custom',
    tokenOrSlug: 'zomato',
    recruitmentInboxes: ['careers@zomato.com'],
  },
  {
    companyName: 'Flipkart',
    category: 'indian_tech',
    country: 'India',
    website: 'https://flipkart.com',
    careersUrl: 'https://flipkartcareers.com',
    atsPlatform: 'custom',
    tokenOrSlug: 'flipkart',
    recruitmentInboxes: ['careers@flipkart.com'],
  },
  {
    companyName: 'Tata Consultancy Services',
    category: 'enterprise_consulting',
    country: 'India / Global',
    website: 'https://tcs.com',
    careersUrl: 'https://tcs.com/careers',
    atsPlatform: 'custom',
    tokenOrSlug: 'tcs',
    recruitmentInboxes: ['careers@tcs.com', 'global.recruitment@tcs.com'],
  },
  {
    companyName: 'Infosys',
    category: 'enterprise_consulting',
    country: 'India / Global',
    website: 'https://infosys.com',
    careersUrl: 'https://infosys.com/careers',
    atsPlatform: 'custom',
    tokenOrSlug: 'infosys',
    recruitmentInboxes: ['careers@infosys.com'],
  },

  // --- GLOBAL PRODUCT LEADERS & MULTINATIONALS ---
  {
    companyName: 'Cloudflare',
    category: 'global_product',
    country: 'Global / United States',
    website: 'https://cloudflare.com',
    careersUrl: 'https://cloudflare.com/careers/jobs',
    atsPlatform: 'greenhouse',
    tokenOrSlug: 'cloudflare',
    recruitmentInboxes: ['careers@cloudflare.com'],
  },
  {
    companyName: 'Airbnb',
    category: 'global_product',
    country: 'Global / United States',
    website: 'https://airbnb.com',
    careersUrl: 'https://careers.airbnb.com',
    atsPlatform: 'greenhouse',
    tokenOrSlug: 'airbnb',
    recruitmentInboxes: ['talent@airbnb.com'],
  },
  {
    companyName: 'Netflix',
    category: 'global_product',
    country: 'Global / United States',
    website: 'https://netflix.com',
    careersUrl: 'https://jobs.netflix.com',
    atsPlatform: 'lever',
    tokenOrSlug: 'netflix',
    recruitmentInboxes: ['jobs@netflix.com'],
  },
  {
    companyName: 'Linear',
    category: 'remote_startup',
    country: 'Remote Worldwide',
    website: 'https://linear.app',
    careersUrl: 'https://linear.app/careers',
    atsPlatform: 'ashby',
    tokenOrSlug: 'linear',
    recruitmentInboxes: ['jobs@linear.app'],
  },
  {
    companyName: 'Supabase',
    category: 'remote_startup',
    country: 'Remote Worldwide',
    website: 'https://supabase.com',
    careersUrl: 'https://supabase.com/careers',
    atsPlatform: 'ashby',
    tokenOrSlug: 'supabase',
    recruitmentInboxes: ['careers@supabase.com'],
  },
  {
    companyName: 'Walmart Global Tech',
    category: 'global_product',
    country: 'India / US',
    website: 'https://walmart.com',
    careersUrl: 'https://walmart.wd5.myworkdayjobs.com/WalmartExternal',
    atsPlatform: 'workday',
    tokenOrSlug: 'walmart',
    recruitmentInboxes: ['globaltalent@walmart.com'],
  },
  {
    companyName: 'Target India',
    category: 'global_product',
    country: 'India / US',
    website: 'https://target.com',
    careersUrl: 'https://target.wd5.myworkdayjobs.com/targetcareers',
    atsPlatform: 'workday',
    tokenOrSlug: 'target',
    recruitmentInboxes: ['careers.india@target.com'],
  },
  {
    companyName: 'Bosch Global Tech',
    category: 'global_product',
    country: 'Germany / India',
    website: 'https://bosch.com',
    careersUrl: 'https://careers.smartrecruiters.com/BoschGroup',
    atsPlatform: 'smartrecruiters',
    tokenOrSlug: 'BoschGroup',
    recruitmentInboxes: ['careers@bosch.com'],
  },
  {
    companyName: 'GitLab',
    category: 'remote_startup',
    country: 'Remote Worldwide',
    website: 'https://gitlab.com',
    careersUrl: 'https://about.gitlab.com/jobs/all-jobs',
    atsPlatform: 'greenhouse',
    tokenOrSlug: 'gitlab',
    recruitmentInboxes: ['talent-acquisition@gitlab.com'],
  },
];

/**
 * Creates live runnable adapter instances for registered companies
 */
export function buildCompanyAdapters(): JobSourceAdapter[] {
  const adapters: JobSourceAdapter[] = [];

  for (const comp of CURATED_COMPANY_REGISTRY) {
    if (comp.atsPlatform === 'greenhouse') {
      adapters.push(new GreenhouseSourceAdapter(comp.companyName, comp.tokenOrSlug));
    } else if (comp.atsPlatform === 'lever') {
      adapters.push(new LeverSourceAdapter(comp.companyName, comp.tokenOrSlug));
    } else if (comp.atsPlatform === 'ashby') {
      adapters.push(new AshbySourceAdapter(comp.companyName, comp.tokenOrSlug));
    } else if (comp.atsPlatform === 'smartrecruiters') {
      adapters.push(new SmartRecruitersSourceAdapter(comp.companyName, comp.tokenOrSlug));
    } else if (comp.atsPlatform === 'workday') {
      adapters.push(new WorkdaySourceAdapter(comp.companyName, comp.tokenOrSlug));
    } else if (comp.atsPlatform === 'bamboohr') {
      adapters.push(new BambooHRSourceAdapter(comp.companyName, comp.tokenOrSlug));
    } else if (comp.atsPlatform === 'schema_org') {
      adapters.push(new SchemaOrgJobAdapter(comp.companyName, comp.careersUrl));
    } else {
      adapters.push(new CustomCareersSourceAdapter(comp.companyName, comp.careersUrl));
    }
  }

  return adapters;
}
