export interface CatalogOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  group?: string;
}

export const EMPLOYMENT_TYPE_OPTIONS: CatalogOption[] = [
  { value: 'all', label: 'All Types', description: 'Show all employment arrangements' },
  { value: 'full-time', label: 'Full-Time', description: 'Permanent full-time employment' },
  { value: 'part-time', label: 'Part-Time', description: 'Reduced-hours permanent role' },
  { value: 'contract', label: 'Contract', description: 'Fixed-term or consulting engagement' },
  { value: 'internship', label: 'Internship', description: 'Apprenticeship or university co-op' },
];

export const FORM_EMPLOYMENT_TYPE_OPTIONS: CatalogOption[] = EMPLOYMENT_TYPE_OPTIONS.filter(
  (o) => o.value !== 'all'
);

export const WORK_ARRANGEMENT_OPTIONS: CatalogOption[] = [
  { value: 'all', label: 'All Arrangements', description: 'Remote, hybrid, and on-site roles' },
  { value: 'remote', label: 'Remote', description: 'Distributed / work from anywhere' },
  { value: 'hybrid', label: 'Hybrid', description: 'Split between office and remote' },
  { value: 'onsite', label: 'On-Site', description: 'Full-time in-office attendance' },
];

export const FORM_WORK_ARRANGEMENT_OPTIONS: CatalogOption[] = WORK_ARRANGEMENT_OPTIONS.filter(
  (o) => o.value !== 'all'
);

export const EXPERIENCE_LEVEL_OPTIONS: CatalogOption[] = [
  { value: 'all', label: 'All Levels', description: 'All career seniority levels' },
  { value: 'entry', label: 'Entry / Junior', description: '0–2 years experience' },
  { value: 'mid', label: 'Mid-Level', description: '2–5 years experience' },
  { value: 'senior', label: 'Senior', description: '5–8 years experience' },
  { value: 'lead', label: 'Lead / Staff', description: '8+ years technical or domain lead' },
  { value: 'executive', label: 'Principal / Director / VP', description: 'Executive & architectural leadership' },
];

export const RELOCATION_OPTIONS: CatalogOption[] = [
  { value: 'yes', label: 'Yes — Open to relocation anywhere' },
  { value: 'negotiable', label: 'Negotiable (Depends on package & visa)' },
  { value: 'no', label: 'No — Prefer remote or current city only' },
];

export const CURRENCY_OPTIONS: CatalogOption[] = [
  { value: 'USD', label: 'USD ($) — US Dollar', badge: '$' },
  { value: 'INR', label: 'INR (₹) — Indian Rupee', badge: '₹' },
  { value: 'EUR', label: 'EUR (€) — Euro', badge: '€' },
  { value: 'GBP', label: 'GBP (£) — British Pound', badge: '£' },
  { value: 'CAD', label: 'CAD (C$) — Canadian Dollar', badge: 'C$' },
  { value: 'AUD', label: 'AUD (A$) — Australian Dollar', badge: 'A$' },
  { value: 'SGD', label: 'SGD (S$) — Singapore Dollar', badge: 'S$' },
  { value: 'AED', label: 'AED — UAE Dirham', badge: 'AED' },
  { value: 'CHF', label: 'CHF — Swiss Franc', badge: 'CHF' },
  { value: 'JPY', label: 'JPY (¥) — Japanese Yen', badge: '¥' },
];

export const INDUSTRY_OPTIONS: CatalogOption[] = [
  { value: 'Technology', label: 'Technology & SaaS' },
  { value: 'Supply Chain & Logistics', label: 'Supply Chain & Logistics' },
  { value: 'Finance & FinTech', label: 'Finance & FinTech' },
  { value: 'AI & Data Platforms', label: 'AI & Data Platforms' },
  { value: 'Enterprise Software & ERP', label: 'Enterprise Software & ERP' },
  { value: 'E-Commerce & Retail', label: 'E-Commerce & Retail' },
  { value: 'Healthcare & BioTech', label: 'Healthcare & BioTech' },
  { value: 'Consulting & Professional Services', label: 'Consulting & Professional Services' },
  { value: 'Manufacturing & Operations', label: 'Manufacturing & Operations' },
  { value: 'Telecommunications', label: 'Telecommunications' },
  { value: 'Energy & CleanTech', label: 'Energy & CleanTech' },
  { value: 'Media & EdTech', label: 'Media & EdTech' },
];

export const EDUCATION_LEVEL_OPTIONS: CatalogOption[] = [
  { value: 'High School / Diploma', label: 'High School / Diploma' },
  { value: 'Associate Degree', label: 'Associate Degree' },
  { value: 'Bachelor of Science (B.Sc / B.Tech / B.E.)', label: 'Bachelor of Science / Engineering (B.Tech / B.E. / B.Sc)' },
  { value: 'Bachelor of Arts / Commerce (B.A. / B.Com / BBA)', label: 'Bachelor of Arts / Business (B.A. / B.Com / BBA)' },
  { value: 'Master of Science / Engineering (M.Sc / M.Tech / M.S.)', label: 'Master of Science / Engineering (M.S. / M.Tech / M.Sc)' },
  { value: 'Master of Business Administration (MBA)', label: 'Master of Business Administration (MBA)' },
  { value: 'Master of Computer Applications (MCA)', label: 'Master of Computer Applications (MCA)' },
  { value: 'Doctorate (Ph.D.)', label: 'Doctorate (Ph.D.)' },
  { value: 'Postgraduate Diploma / Executive Program', label: 'Postgraduate Diploma / Executive Program' },
];

export const LANGUAGE_OPTIONS: CatalogOption[] = [
  { value: 'English', label: 'English' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'German', label: 'German' },
  { value: 'French', label: 'French' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Mandarin Chinese', label: 'Mandarin Chinese' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Marathi', label: 'Marathi' },
  { value: 'Tamil', label: 'Tamil' },
  { value: 'Telugu', label: 'Telugu' },
  { value: 'Gujarati', label: 'Gujarati' },
];

export const ROLE_TITLES_CATALOG: CatalogOption[] = [
  'Software Engineer',
  'Senior Software Engineer',
  'Full Stack Engineer',
  'Frontend Engineer',
  'Backend Engineer',
  'Platform Engineer',
  'DevOps Engineer',
  'Site Reliability Engineer (SRE)',
  'Cloud Architect',
  'AI / ML Engineer',
  'Data Engineer',
  'Data Analyst',
  'Business Intelligence Analyst',
  'Business Analyst',
  'Product Manager',
  'Technical Product Manager',
  'Program Manager',
  'Project Manager',
  'Operations Manager',
  'Supply Chain Analyst',
  'Supply Chain Operations Manager',
  'Logistics Operations Specialist',
  'Procurement & Sourcing Specialist',
  'SAP Functional Consultant',
  'ERP Implementation Specialist',
  'Solutions Architect',
  'Engineering Manager',
  'QA Automation Engineer',
  'Security Engineer',
  'UX / Product Designer',
].map((title) => ({ value: title, label: title }));

export const SKILLS_CATALOG: CatalogOption[] = [
  'TypeScript', 'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'Go', 'SQL',
  'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'Cloudflare Workers', 'GraphQL', 'REST APIs', 'CI/CD', 'Terraform', 'Git',
  'Supply Chain Management', 'Logistics Operations', 'SAP', 'SAP S/4HANA', 'ERP',
  'Oracle NetSuite', 'Excel', 'Advanced Excel', 'Power BI', 'Tableau',
  'Data Analysis', 'Data Modeling', 'ETL Pipelines', 'Forecasting & Planning',
  'Inventory Optimization', 'Vendor Management', 'Procurement', 'Six Sigma',
  'Lean Manufacturing', 'Project Management', 'Agile / Scrum', 'JIRA',
  'Stakeholder Management', 'Process Improvement', 'Reporting & Dashboards',
  'Machine Learning', 'Prompt Engineering', 'LLM Integration', 'HTML5', 'CSS3', 'Tailwind CSS',
].map((skill) => ({ value: skill, label: skill }));

export const ATS_PROVIDER_OPTIONS: CatalogOption[] = [
  { value: 'custom', label: 'Custom Careers Portal' },
  { value: 'greenhouse', label: 'Greenhouse' },
  { value: 'lever', label: 'Lever' },
  { value: 'ashby', label: 'Ashby' },
  { value: 'workday', label: 'Workday' },
  { value: 'smartrecruiters', label: 'SmartRecruiters' },
  { value: 'icims', label: 'iCIMS' },
  { value: 'workable', label: 'Workable' },
  { value: 'bamboohr', label: 'BambooHR' },
  { value: 'recruitee', label: 'Recruitee' },
  { value: 'teamtailor', label: 'Teamtailor' },
];

export const HR_VERIFICATION_FILTER_OPTIONS: CatalogOption[] = [
  { value: 'all', label: 'All Confidence Tiers' },
  { value: 'DIRECT_EXTRACTED', label: 'Direct Verified' },
  { value: 'PATTERN_INFERRED', label: 'Pattern Matched' },
  { value: 'DOMAIN_VALIDATED', label: 'Domain Validated' },
];

export const HR_CONTACT_TYPE_OPTIONS: CatalogOption[] = [
  { value: 'all', label: 'All Contact Types' },
  { value: 'PERSONAL_RECRUITER', label: 'Personal Recruiters' },
  { value: 'ROLE_INBOX', label: 'Careers / Recruiting Inbox' },
];

export const HR_DESIGNATION_FILTER_OPTIONS: CatalogOption[] = [
  { value: 'all', label: 'All Roles / Designations' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'talent acquisition', label: 'Talent Acquisition' },
  { value: 'people', label: 'People / HRBP' },
  { value: 'hiring manager', label: 'Hiring Manager' },
  { value: 'careers', label: 'Careers Inbox' },
];

export const HR_SORT_OPTIONS: CatalogOption[] = [
  { value: 'confidence', label: 'Sort: Highest Match' },
  { value: 'company', label: 'Sort: Company A–Z' },
  { value: 'country', label: 'Sort: Country A–Z' },
  { value: 'recent', label: 'Sort: Recently Found' },
];

export const MEMBERSHIP_PLAN_FILTER_OPTIONS: CatalogOption[] = [
  { value: 'all', label: 'All Plans' },
  { value: 'black', label: 'BLACK ELITE' },
  { value: 'pro', label: 'PRO' },
  { value: 'free', label: 'Free Tier' },
];

export const MEMBERSHIP_STATUS_FILTER_OPTIONS: CatalogOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expiring_soon', label: 'Expiring Soon (≤14d)' },
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'expired', label: 'Expired' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'revoked', label: 'Revoked' },
];

export const MEMBERSHIP_VALIDITY_FILTER_OPTIONS: CatalogOption[] = [
  { value: 'all', label: 'All Validities' },
  { value: '6_months', label: '6 Months' },
  { value: '12_months', label: '12 Months' },
  { value: '24_months', label: '24 Months' },
  { value: 'lifetime', label: 'Lifetime' },
];

export const NOTIFICATION_FREQUENCY_OPTIONS: CatalogOption[] = [
  { value: 'daily', label: 'Daily Digest' },
  { value: 'weekly', label: 'Weekly Summary' },
  { value: 'instant', label: 'Instant Alerts (Immediate)' },
];

export const AUDIT_SEVERITY_OPTIONS: CatalogOption[] = [
  { value: 'all', label: 'All Severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'security', label: 'Security' },
  { value: 'critical', label: 'Critical' },
];

export function getPlatformOptionsCatalog() {
  return {
    employmentTypes: EMPLOYMENT_TYPE_OPTIONS,
    workArrangements: WORK_ARRANGEMENT_OPTIONS,
    experienceLevels: EXPERIENCE_LEVEL_OPTIONS,
    relocationOptions: RELOCATION_OPTIONS,
    currencies: CURRENCY_OPTIONS,
    industries: INDUSTRY_OPTIONS,
    educationLevels: EDUCATION_LEVEL_OPTIONS,
    languages: LANGUAGE_OPTIONS,
    roles: ROLE_TITLES_CATALOG,
    skills: SKILLS_CATALOG,
    atsProviders: ATS_PROVIDER_OPTIONS,
    hrVerificationLevels: HR_VERIFICATION_FILTER_OPTIONS,
    hrContactTypes: HR_CONTACT_TYPE_OPTIONS,
    hrDesignations: HR_DESIGNATION_FILTER_OPTIONS,
    membershipPlans: MEMBERSHIP_PLAN_FILTER_OPTIONS,
    membershipStatuses: MEMBERSHIP_STATUS_FILTER_OPTIONS,
    membershipValidities: MEMBERSHIP_VALIDITY_FILTER_OPTIONS,
  };
}
