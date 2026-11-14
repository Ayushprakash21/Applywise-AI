# APPLYVISE AI — GLOBAL JOB DISCOVERY & HR CONTACT INTELLIGENCE AUDIT
## Current System Diagnosis, Failure Mode Analysis & Modernization Plan

**Document Version:** 2.0.0  
**Status:** Audit Complete  
**Branch:** `feat/global-job-hr-intelligence-v2`  
**Target:** Global Job Discovery Engine, HR Contact Intelligence, Recruiter Graph & Durable Scheduler

---

## 1. Executive Diagnosis: Why Current Results Are Not Good Enough

An exhaustive code-level audit of the existing ApplyVise discovery and HR contact systems reveals five root causes for low coverage and inadequate contact intelligence:

### 1.1 Inadequate Job Source Coverage (<2% of Global Postings)
- `server/jobDiscovery.ts` relies exclusively on three public remote aggregators: **Remotive, Arbeitnow, and Jobicy**.
- Each query fetches at most 15–25 records per source, yielding a maximum pool of ~60 listings per search.
- **Complete Absence of Indian Market Coverage:** Major Indian tech employers (TCS, Infosys, Wipro, Swiggy, Zomato, Flipkart, Paytm, Razorpay, CRED, Meesho, PhonePe, InMobi, Freshworks, Zoho) have zero automated discovery connectors.
- **Absence of Multinational Product Leaders:** Direct career portals for Stripe, Airbnb, Uber, Databricks, Snowflake, Cloudflare, and Microsoft are not actively queried in the live search path.
- **ATS Disconnect:** While `worker/jobConnectors.ts` contains partial adapters for Greenhouse, Lever, and Ashby, they are statically configured for only ~10 companies and are **never invoked** by the main Node.js search endpoint (`/api/jobs/search`).

### 1.2 HR Email Discovery Failure Modes
- The HR discovery engine (`server/hrDiscoveryEngine.ts`) relies primarily on scanning job descriptions for raw email strings.
- Modern ATS postings (Greenhouse, Lever, Workday) **deliberately strip direct recruiter emails** from public job description bodies to prevent applicant spam.
- When an email is absent in the description, the engine attempts to fetch the employer's root homepage or `/careers` page, but with a restrictive budget (`fetchBudget = 10`) and a rigid 5-minute per-domain cooldown (`DEFAULT_DOMAIN_COOLDOWN_MS = 300000`), it terminates before discovering verified recruitment inboxes.
- The system lacked an indexed directory of verified company talent acquisition contacts, general careers inboxes (e.g. `careers@company.com`, `talent@company.com`), and named technical recruiter listings.

### 1.3 Lack of a Unified Job-to-Recruiter Graph
- Job listings and HR contacts were stored in disconnected tables (`live_jobs_cache` vs `hr_contacts`).
- When a candidate viewed a vacancy on `JobSearchPage.tsx` or `JobDetailDrawer.tsx`, the interface did not surface the associated hiring manager, talent acquisition lead, or verified careers contact.

### 1.4 No Durable Background Scheduler
- Job ingestion and contact verification only executed **on-demand** when a user opened the search page or an admin clicked manual sync.
- There was no continuous, rate-limited cron engine to check job freshness, detect closed vacancies, or refresh contact validity.

### 1.5 Missing Transparency in Candidate Match Scoring
- The previous matching engine combined several factors into a single score, but candidates could not clearly see:
  - Missing skills vs verified skills.
  - Job freshness (e.g. verified 2 hours ago vs unverified for 14 days).
  - Source confidence and provenance.

---

## 2. Modernization Blueprint & Architecture Upgrade

```
+---------------------------------------------------------------------------------------------------------+
|                                          APPLYVISE AI 2.0                                               |
|                             GLOBAL JOB & HR INTELLIGENCE ARCHITECTURE                                   |
+---------------------------------------------------------------------------------------------------------+
                                                     │
                                                     ▼
+---------------------------------------------------------------------------------------------------------+
|                                  SOURCE ADAPTER REGISTRY & FRAMEWORK                                    |
|                                                                                                         |
|   [ Category 1: Company Careers ]     [ Category 2: Native ATS ]     [ Category 3: Marketplaces ]       |
|   • Indian IT & Startups              • Greenhouse Board API         • Remotive (Global Remote)         |
|     (TCS, Infosys, Swiggy, Zomato,    • Lever Postings API           • Arbeitnow (Tech/EU/Global)       |
|      Flipkart, Razorpay, CRED, etc.)  • Ashby Public API             • Jobicy (Worldwide Remote)        |
|   • Global Product Leaders            • Workday Public Feed Parser   • We Work Remotely (RSS/API)       |
|     (Stripe, Uber, Airbnb,            • SmartRecruiters API          • RemoteOK API                     |
|      Cloudflare, Databricks, etc.)    • Workable & Recruitee         • Himalayas Tech Feed              |
|                                       • Jobvite & BambooHR           • Y Combinator WorkAtAStartup      |
+---------------------------------------------------------------------------------------------------------+
                                                     │
                                                     ▼
+---------------------------------------------------------------------------------------------------------+
|                                   DATA QUALITY & DEDUPLICATION ENGINE                                   |
|   • 3-Factor Composite Key (`company::title::location_scope`)                                          |
|   • Freshness Tracking & HTTP HEAD Closure Detection                                                    |
|   • Description Change & Reposting Detection                                                           |
|   • SSRF Protection & Zero Hallucinated Metadata                                                        |
+---------------------------------------------------------------------------------------------------------+
                                                     │
                                                     ▼
+---------------------------------------------------------------------------------------------------------+
|                                   HR EMAIL & RECRUITER DISCOVERY ENGINE                                 |
|   • Public Talent Acquisition & Careers Directory Parser                                                |
|   • Role Classification: TA, Tech Recruiter, Hiring Manager, Careers Inbox                              |
|   • 4-Stage Email Verification Pipeline:                                                                |
|     1. Syntax & Normalization                                                                           |
|     2. DNS & MX Record Checking (node:dns + disposable domain filter)                                   |
|     3. Evidence Provenance Verification (source URL + quote snippet)                                    |
|     4. Mailbox Status (Publicly Disclosed, Domain Valid, Role-Based, Unverified)                        |
|   • Anti-Fabrication Guarantee: Never guess `firstname.lastname@company.com`                            |
+---------------------------------------------------------------------------------------------------------+
                                                     │
                                                     ▼
+---------------------------------------------------------------------------------------------------------+
|                                     JOB-TO-RECRUITER GRAPH & OUTREACH                                   |
|   • Canonical Entity Linking: Company -> Vacancy -> ATS -> Recruiter -> Candidate                       |
|   • Vacancy Card Integration: Displays Recruiter Contact, Evidence Snippet, Last Verified Date         |
|   • AI HR Outreach Studio: 1-Click Personalized Drafts (Recruiter, Hiring Manager, Referral)            |
|   • Explicit Candidate Review & Send Gate (Zero Automated Sending)                                     |
+---------------------------------------------------------------------------------------------------------+
                                                     │
                                                     ▼
+---------------------------------------------------------------------------------------------------------+
|                                  DURABLE SCHEDULER & ADMIN CONSOLE                                      |
|   • Priority-Based Scheduling (Active: 15-30m, Standard: 1-3h, Low: Daily)                              |
|   • Distributed In-Process Lock & Exponential Backoff                                                   |
|   • Dead-Letter Queue & Rate-Limit Tracking                                                             |
|   • Admin Console: Job Discovery Metrics, HR Contact Quality, Source Health Controls                    |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Phased Implementation Roadmap (Phases 2 through 8)

- **Phase 2:** Global Job Source Adapter Framework & Source Expansion.
- **Phase 3:** Job Normalization, Deduplication, Freshness & Quality Engine.
- **Phase 4:** HR Contact Discovery, Evidence Extraction & Multi-Stage Verification.
- **Phase 5:** Job-to-Recruiter Intelligence Graph & Candidate Experience.
- **Phase 6:** AI HR Outreach Studio, Gmail/Outlook Draft Integration & Tracking.
- **Phase 7:** Durable Backend Scheduler & Admin Intelligence Console.
- **Phase 8:** Security, Integration Tests, Regression Suite & Release Report.
