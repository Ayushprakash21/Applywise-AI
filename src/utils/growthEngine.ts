// src/utils/growthEngine.ts
// Core business logic, rule engines, and agent intelligence for ApplyVise Growth Engine

import {
  GrowthAgentSettings,
  GrowthAgentTask,
  GrowthAgentRun,
  GrowthAgentType,
  SeoProperty,
  SeoKeywordGroup,
  SeoAuditResult,
  MarketingContentItem,
  CompetitorProfile,
  CompetitorObservation,
  MarketingCampaign,
  MarketingFunnelMetrics,
  SocialAccount,
  SocialPost,
  MarketingIntegration,
  GrowthAgentActivity
} from '../types/growthEngine.ts';

/** Default initial growth settings */
export function getDefaultGrowthSettings(): GrowthAgentSettings {
  return {
    id: 'growth_settings_default',
    autonomyMode: 'supervised',
    isPaused: false,
    publishingPermission: 'manual_approval',
    contentFrequencyPerWeek: 3,
    budgetCeilingMonthly: 0.0,
    allowedDomains: ['applyvise-ai.ayushprakash0021.workers.dev', 'applyvise.com'],
    targetKeywords: [
      'ATS resume builder',
      'AI job application agent',
      'zero hallucination resume',
      'automated job applications',
      'free ATS resume score'
    ],
    competitors: ['Simplify', 'Teal', 'Huntr', 'Jobscan'],
    connectedChannels: {
      linkedin: false,
      meta: false,
      x: false,
      youtube: false,
      gsc: false,
      ga4: false,
    },
    emergencyStopped: false,
    lastRunAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Seed core verified competitor benchmarks */
export function getInitialCompetitorProfiles(): CompetitorProfile[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'comp_simplify',
      name: 'Simplify',
      websiteUrl: 'https://simplify.jobs',
      positioningSummary: 'Browser extension focused on autofilling job applications across Workday, Greenhouse, and Lever.',
      pricingTiers: [
        { tierName: 'Free', price: '$0', features: ['Job Autofill', 'Application Tracking'] },
        { tierName: 'Simplify+', price: '$9.99/mo', features: ['AI Resume Tailoring', 'Priority Match'] }
      ],
      keyFeatures: ['Browser Extension Autofill', 'Curated Tech Internships', 'Application Tracker'],
      strengths: ['High adoption among early-career software engineering candidates', 'Fast form filling'],
      weaknesses: ['Susceptible to ATS anti-bot captcha challenges', 'Limited deep resume fact verification'],
      lastMonitoredAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'comp_teal',
      name: 'Teal',
      websiteUrl: 'https://tealhq.com',
      positioningSummary: 'Career growth platform offering resume builder, job tracker, and LinkedIn profile review.',
      pricingTiers: [
        { tierName: 'Free', price: '$0', features: ['Basic Resume Builder', 'Job Tracker'] },
        { tierName: 'Teal+', price: '$29/mo', features: ['Unlimited AI Keywords', 'Work Tracker', 'Analysis'] }
      ],
      keyFeatures: ['Resume Builder', 'Job Tracker', 'Keyword Matcher'],
      strengths: ['Strong clean dashboard UI', 'Robust organic content and LinkedIn branding'],
      weaknesses: ['Higher monthly subscription cost', 'No autonomous application submission capabilities'],
      lastMonitoredAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'comp_jobscan',
      name: 'Jobscan',
      websiteUrl: 'https://jobscan.co',
      positioningSummary: 'Legacy ATS resume checker comparing candidate resumes against job descriptions for keyword density.',
      pricingTiers: [
        { tierName: 'Free', price: '$0', features: ['5 Scans/month', 'Basic Match Rate'] },
        { tierName: 'Premium', price: '$49.95/mo', features: ['Unlimited Scans', 'Cover Letter Optimization'] }
      ],
      keyFeatures: ['ATS Resume Scanner', 'LinkedIn Optimization', 'Cover Letter Generator'],
      strengths: ['Pioneer in ATS keyword scanning brand search volume'],
      weaknesses: ['Older keyword-density algorithms', 'Frequent false-positive keyword warnings', 'High price point'],
      lastMonitoredAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'comp_huntr',
      name: 'Huntr',
      websiteUrl: 'https://huntr.co',
      positioningSummary: 'Kanban board application tracker with resume builder and browser clipper.',
      pricingTiers: [
        { tierName: 'Free', price: '$0', features: ['Kanban Board (limited cards)'] },
        { tierName: 'Pro', price: '$40/mo', features: ['Unlimited Boards', 'AI Resume Tailoring'] }
      ],
      keyFeatures: ['Kanban Application Pipeline', 'Chrome Clipper', 'Resume Tailor'],
      strengths: ['Clean Kanban board interface for application stage management'],
      weaknesses: ['Minimal live job discovery infrastructure', 'Manual application workflow required'],
      lastMonitoredAt: now,
      createdAt: now,
      updatedAt: now,
    }
  ];
}

/** Seed core SEO Keyword Clusters */
export function getInitialSeoKeywordClusters(): SeoKeywordGroup[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'cluster_ats_resume',
      clusterName: 'ATS Resume Optimization',
      primaryIntent: 'commercial',
      primaryKeyword: 'ATS resume builder',
      keywords: [
        'best ATS resume builder free',
        'how to beat applicant tracking systems',
        'ATS formatted resume template',
        'ATS friendly resume word docx',
        'ATS resume checker online'
      ],
      monthlySearchVolume: 49500,
      difficultyScore: 42,
      currentVisibility: 18.4,
      targetContentUrl: '/resources/ats-resume-optimization-guide',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cluster_ai_job_apps',
      clusterName: 'AI Job Application Automation',
      primaryIntent: 'commercial',
      primaryKeyword: 'AI job application agent',
      keywords: [
        'autonomous job apply agent',
        'AI that applies to jobs for you',
        'auto apply jobs verified',
        'supervised job application agent',
        'AI copilot job search'
      ],
      monthlySearchVolume: 33100,
      difficultyScore: 38,
      currentVisibility: 24.2,
      targetContentUrl: '/resources/autonomous-job-applications-guide',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cluster_interview_prep',
      clusterName: 'STAR Interview Intelligence',
      primaryIntent: 'informational',
      primaryKeyword: 'STAR interview framework AI',
      keywords: [
        'STAR method behavioral interview examples',
        'AI interview answer evaluator',
        'mock interview practice free',
        '100 point interview scoring rubric'
      ],
      monthlySearchVolume: 27800,
      difficultyScore: 35,
      currentVisibility: 12.0,
      targetContentUrl: '/resources/star-method-interview-preparation',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cluster_career_strategy',
      clusterName: 'Career Intelligence & Salary Gaps',
      primaryIntent: 'informational',
      primaryKeyword: 'career skill gap analysis',
      keywords: [
        'how to identify skill gaps for promotion',
        'transferable skills between tech and operations',
        'career roadmap generator AI'
      ],
      monthlySearchVolume: 18200,
      difficultyScore: 29,
      currentVisibility: 8.5,
      targetContentUrl: '/resources/career-skill-gap-analysis-guide',
      createdAt: now,
      updatedAt: now,
    }
  ];
}

/** Seed High-Quality Editorial Articles */
export function getInitialMarketingContent(): MarketingContentItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'content_ats_guide',
      slug: 'ats-resume-optimization-guide',
      title: 'The Truth About Applicant Tracking Systems: How to Build an ATS-Proof Resume in 2026',
      contentType: 'ats_optimization',
      targetAudience: 'Active Job Seekers and Mid-Career Professionals',
      searchIntent: 'commercial',
      primaryKeyword: 'ATS resume builder',
      secondaryKeywords: ['applicant tracking systems', 'ATS formatting', 'resume parsing'],
      seoTitle: 'How to Build an ATS-Proof Resume (2026 Comprehensive Guide) | ApplyVise AI',
      metaDescription: 'Discover how modern Applicant Tracking Systems parse resumes, why keyword stuffing fails, and how to format a clean, verified DOCX resume that passes ATS filters.',
      canonicalUrl: 'https://applyvise-ai.ayushprakash0021.workers.dev/resources/ats-resume-optimization-guide',
      status: 'PUBLISHED',
      outline: [
        'What modern ATS parsers (Greenhouse, Lever, Workday) actually look for',
        'The myth of white-text keyword stuffing and why it triggers immediate disqualification',
        'Standard heading hierarchy: Role, Company, Standard Dates, and Grounded Bullets',
        'Why DOCX OpenXML out-performs multi-column PDFs in parsing reliability',
        'The ApplyVise Zero-Hallucination Standard for career history integrity'
      ],
      bodyMarkdown: `## 1. What Modern ATS Parsers Actually Look For

Most job seekers believe Applicant Tracking Systems (ATS) are mysterious black boxes that discard 90% of resumes without reading them. In reality, modern ATS platforms such as Greenhouse, Lever, and Workday function as structured relational parsers.

When you submit a resume, the parser decomposes your text into discrete entities:
- **Contact Details**: Name, email, phone number, and location.
- **Employment Records**: Company name, job title, start date, and end date.
- **Skills and Competencies**: Hard technical skills, domain tools, and methodologies.
- **Education**: Degree, institution, and graduation year.

### Why Multi-Column Layouts Fail
Tables, sidebars, floating text boxes, and complex graphical icons frequently scramble the parser's reading order. If a parser encounters text wrapped across two columns without explicit hierarchy, job descriptions from Company A can bleed into Company B, generating corrupt employment periods like \`2022 – Present\` on historical roles.

---

## 2. The Dangerous Myth of "Keyword Stuffing"

Early ATS hacks recommended pasting job description keywords in tiny white font at the bottom of a resume. Modern enterprise ATS parsers parse the document into raw text, stripping styling and color. 

When recruiters view parsed profiles, keyword stuffing appears as a wall of repetitive terms with zero context, resulting in immediate manual rejection.

### The Grounded Alternative: Transferable Skill Evidence
Instead of keyword stuffing, modern hiring algorithms prioritize **contextual competency evidence**:
1. State the skill in action within your authentic bullet points.
2. Link the tool to a concrete deliverable (e.g., *"Reconciled ERP inventory variances across multi-site supply chains"* rather than simply listing *"ERP"*).
3. Ensure every claimed technology is grounded in real past responsibilities.

---

## 3. Formatting Rules for 100% Parsing Accuracy

1. **Use Single-Column Linear Hierarchy**: Keep section titles standard (\`Professional Experience\`, \`Core Competencies\`, \`Education\`).
2. **Explicit ISO or Standard Dates**: Always format dates consistently (e.g. \`Sep 2023 – Aug 2024\` or \`2023 – 2024\`). Never leave dangling hyphens.
3. **Prefer Clean DOCX or Standard Text-Layer PDF**: Native OpenXML Word documents (\`.docx\`) provide the highest first-pass extraction reliability across all commercial parsers.

---

## 4. How ApplyVise AI Enforces Zero-Hallucination Tailoring

At ApplyVise AI, our **Candidate Fact Registry** binds every tailored bullet point strictly to your verified past employment history. When tailoring a resume for a specific vacancy, the AI is structurally prohibited from altering your employer names, inventing dates, or fabricating metrics you never achieved.

You receive an ATS-optimized, truthful application document designed to win interviews with full integrity.`,
      featuredImageUrl: '/assets/ats_guide_hero.png',
      readTimeMinutes: 6,
      internalLinkTargets: ['/pricing', '/signup'],
      callToAction: {
        text: 'Build Your Verified ATS Resume Free',
        url: '/signup'
      },
      sources: ['National Association of Colleges and Employers (NACE)', 'SHRM ATS Benchmarks'],
      isPublished: true,
      publishedAt: now,
      viewsCount: 1420,
      conversionsCount: 88,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'content_job_applications_guide',
      slug: 'autonomous-job-applications-guide',
      title: 'Supervised Autopilot: Why Quality and Verification Beat Mass-Application Bots',
      contentType: 'job_search_strategy',
      targetAudience: 'Job Seekers evaluating automation tools',
      searchIntent: 'informational',
      primaryKeyword: 'AI job application agent',
      secondaryKeywords: ['auto apply jobs', 'job search automation', 'supervised autopilot'],
      seoTitle: 'Supervised Autopilot: The Smart Way to Automate Job Applications | ApplyVise AI',
      metaDescription: 'Learn why unmonitored mass-application bots trigger employer blacklists, and how ApplyVise Supervised Autopilot ensures high match quality and candidate consent.',
      canonicalUrl: 'https://applyvise-ai.ayushprakash0021.workers.dev/resources/autonomous-job-applications-guide',
      status: 'PUBLISHED',
      outline: [
        'The rise of brute-force application bots and why employers are filtering them out',
        'How Applicant Tracking Systems detect automated form submissions',
        'The Supervised Autopilot model: 1-Click candidate verification with daily rate caps',
        'Explainable 6-dimension opportunity matching before any application is prepared'
      ],
      bodyMarkdown: `## 1. The Breakdown of Mass-Application Bots

In recent years, brute-force automation tools have promised to submit hundreds of job applications overnight. The unintended consequence has been disastrous for job seekers:
- Corporate recruiters now receive thousands of non-qualifying, generic submissions per opening.
- Employers have deployed aggressive rate-limiting, CAPTCHA gating, and spam filters.
- Candidates who submit indiscriminately find their emails flagged or blacklisted across major talent portals.

---

## 2. Why "Supervised Autopilot" Wins Interviews

Autonomous job search does not mean blind mass-submission. The winning formula is **high-precision alignment**:
1. **Explainable Matching (COME)**: The candidate background must honestly match the employer's mandatory requirements (location, skills, seniority, and work authorization).
2. **Deterministic Tailoring**: Every resume must emphasize relevant transferable competencies without hallucinating false credentials.
3. **Explicit Consent & Daily Caps**: Capping submissions at a calibrated daily limit (such as 3 high-quality applications per calendar day) preserves candidate reputation and complies with employer portal guidelines.

ApplyVise AI Supervised Autopilot gives you the time-saving power of automation while maintaining candidate control and 100% truthful submissions.`,
      featuredImageUrl: '/assets/autopilot_guide_hero.png',
      readTimeMinutes: 5,
      internalLinkTargets: ['/pricing', '/signup'],
      callToAction: {
        text: 'Activate Supervised Autopilot',
        url: '/signup'
      },
      sources: ['Harvard Business Review: Finding the Right Job Fit in the Age of AI'],
      isPublished: true,
      publishedAt: now,
      viewsCount: 980,
      conversionsCount: 62,
      createdAt: now,
      updatedAt: now,
    }
  ];
}

/** Seed Connected Integrations Registry */
export function getInitialMarketingIntegrations(): MarketingIntegration[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'int_gsc',
      integrationKey: 'gsc',
      name: 'Google Search Console API',
      status: 'disconnected',
      config: { siteUrl: 'https://applyvise-ai.ayushprakash0021.workers.dev' },
      errorMessage: 'Service Account credentials required for real-time query harvesting.',
      lastCheckedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'int_ga4',
      integrationKey: 'ga4',
      name: 'Google Analytics 4 (Measurement Protocol)',
      status: 'disconnected',
      config: { propertyId: 'G-APPLYVISE' },
      errorMessage: 'GA4 API Secret required for server-side attribution event recording.',
      lastCheckedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'int_pagespeed',
      integrationKey: 'pagespeed',
      name: 'Google PageSpeed Insights API',
      status: 'connected',
      config: { strategy: 'mobile', targetUrl: 'https://applyvise-ai.ayushprakash0021.workers.dev' },
      lastCheckedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'int_linkedin',
      integrationKey: 'linkedin',
      name: 'LinkedIn Community Management & Publishing API',
      status: 'disconnected',
      config: { organizationUrn: 'urn:li:organization:applyvise' },
      errorMessage: 'OAuth 2.0 Client credentials and w_member_social scope required.',
      lastCheckedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'int_x',
      integrationKey: 'x',
      name: 'X (Twitter) API v2 Publishing',
      status: 'disconnected',
      config: { handle: '@ApplyViseAI' },
      errorMessage: 'X Developer App Bearer Token required.',
      lastCheckedAt: now,
      createdAt: now,
      updatedAt: now,
    }
  ];
}
