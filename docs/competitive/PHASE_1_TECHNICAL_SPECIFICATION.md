# APPLYVISE AI — PHASE 1 TECHNICAL SPECIFICATION
## Opportunity Intelligence Engine (Unified Discovery, Sourcing & Verification)

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Execution Target:** Backend (Node + Cloudflare Workers D1) & Frontend GCDE  
**Reference Design:** `avoid-ai-design 0.4.0`  
**Security Standard:** Zero-SSRF, Zero-Scraping of Gated Intranets, Zero Hallucinated Metadata

---

## 1. Engine Objective & Scope

The **Opportunity Intelligence Engine** elevates ApplyVise AI from an on-demand job aggregator into a **continuous, self-healing opportunity indexing engine**. It indexes authentic, live job openings directly from:
1. Verified company career endpoints.
2. Supported ATS public job boards (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee).
3. Permitted public remote aggregators (Remotive, Arbeitnow, Jobicy).
4. Direct candidate-imported job postings via Schema.org JSON-LD extraction.

---

## 2. Canonical Opportunity Data Model

Every discovered opportunity adheres to the following strict TypeScript schema (`CanonicalOpportunity`):

```typescript
export type OpportunityWorkArrangement = 'remote' | 'hybrid' | 'onsite';
export type OpportunityStatus = 'active' | 'expired' | 'closed' | 'unverified';
export type OpportunitySourceType =
  | 'ats_greenhouse'
  | 'ats_lever'
  | 'ats_ashby'
  | 'ats_workable'
  | 'ats_smartrecruiters'
  | 'ats_recruitee'
  | 'aggregator_remotive'
  | 'aggregator_arbeitnow'
  | 'aggregator_jobicy'
  | 'career_page_direct'
  | 'user_import';

export interface CanonicalOpportunity {
  // Identity & Deduplication
  id: string;                         // e.g. "opp_gh_airbnb_4928172"
  dedupKey: string;                   // Normalized composite key: normalized_company::normalized_title::location_scope
  
  // Core Posting Details
  title: string;                      // Clean normalized job title (e.g. "Senior Distributed Systems Engineer")
  company: string;                    // Clean company name (e.g. "Stripe")
  companyDomain?: string;             // Root corporate domain (e.g. "stripe.com")
  companyLogo?: string;               // Verified CDN logo URL (never spoofed)
  description: string;                // Sanitized HTML description (XSS-safe, preserving headings/lists)
  plainTextDescription: string;       // Extracted plain text for indexing & NLP matching
  
  // Categorization & Work Mode
  location: string;                   // Structured location string (e.g. "San Francisco, CA" or "Remote, US")
  country: string;                    // Primary country ISO / standard name
  workArrangement: OpportunityWorkArrangement;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  
  // Requirements & Compensation
  requirements: string[];             // Extracted mandatory & preferred skill requirements
  tags: string[];                     // Technology tags & domain classifications
  salaryRange?: {
    min?: number;
    max?: number;
    currency: string;
    raw: string;
  };
  visaSponsorship: 'supported' | 'not_supported' | 'unknown';
  
  // Provenance & Direct Application URLs
  source: OpportunitySourceType;
  sourceJobId?: string;               // Original ID from provider (e.g. "4928172")
  sourceUrl: string;                  // Webpage where listing was discovered
  applicationUrl: string;             // Direct URL to the application form
  sourceConfidence: number;           // 0.0 - 1.0 based on provider verification level
  
  // Freshness & Lifecycle Telemetry
  status: OpportunityStatus;
  firstDiscoveredAt: string;          // ISO 8601 timestamp
  lastVerifiedAt: string;             // ISO 8601 timestamp of last successful HEAD / ping
  publishedAt: string;                // Date job was officially posted by employer
  recheckCount: number;               // Number of background freshness rechecks performed
}
```

---

## 3. Deduplication Architecture

To prevent duplicate job inflation across aggregators and direct boards, ApplyVise uses a deterministic **3-Factor Normalization Algorithm**:

```
dedupKey = hash(
  normalizeCompany(company) + "::" + 
  normalizeTitle(title) + "::" + 
  normalizeLocationScope(location, workArrangement)
)
```

1. **Company Normalization:** Strips legal entity suffixes (`Inc.`, `LLC`, `Ltd`, `GmbH`, `Corp`, `Co.`), whitespace, and non-alphanumeric characters.
2. **Title Normalization:** Lowers case, maps common seniority abbreviations (`Sr.` $\to$ `senior`, `VP` $\to$ `vice president`, `SE` $\to$ `software engineer`), and strips posting fluff (e.g. `$100k bonus!`, `URGENT HIRE`).
3. **Location Scope:** Differentiates identical roles posted across multiple geographical regions (e.g. `remote_global` vs `new_york_onsite`).

If a newly fetched job shares an existing `dedupKey`:
- ApplyVise updates `lastVerifiedAt`.
- It prioritizes the **direct employer application URL** over secondary aggregator links.
- It increments the source confidence score without creating duplicate records.

---

## 4. Freshness & Closure Detection Engine

Job listings close rapidly without prior announcement. The Opportunity Intelligence Engine operates a **Background Verification Queue**:

1. **Active Recheck Thresholds:**
   - Listings $< 48\text{ hours}$ old: Rechecked every 24 hours.
   - Listings $2\text{ to }7\text{ days}$ old: Rechecked every 12 hours.
   - Listings $> 14\text{ days}$ old: Rechecked every 6 hours.
2. **Recheck Mechanics:**
   - Performs a lightweight HTTP `HEAD` request with a 5-second timeout and randomized User-Agent.
   - Status code evaluations:
     - `200 OK` $\to$ Marked `active`, `lastVerifiedAt` updated.
     - `404 Not Found` or `410 Gone` $\to$ Marked `closed`.
     - `301/302 Redirect` $\to$ Followed up to 2 hops; if redirected to homepage or generic search, marked `expired`.
     - `429 Too Many Requests` $\to$ Preserved in backoff queue with exponential retry delay.
3. **Candidate Protection:**
   - Any job marked `closed` or `expired` is immediately deprioritized from Candidate Opportunity Radar and clearly flagged if the candidate has an in-progress application draft.

---

## 5. Security & Isolation Contracts

1. **SSRF Guard:** All connector URLs pass through `isSafePublicUrl(url)`. Loops, private IPs (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`), loopbacks (`127.0.0.1`), and AWS metadata endpoints (`169.254.169.254`) are blocked before socket initialization.
2. **Zero Automated CAPTCHA Solving:** If a destination career portal presents an anti-bot challenge (e.g. Cloudflare Turnstile, reCAPTCHA), the engine stops, tags the listing for manual candidate review, and logs the provider status as `restricted`.
3. **HTML Sanitization:** Raw job descriptions from ATS boards are parsed through `sanitizeIngestedDescription()` to strip inline event handlers, embedded scripts, trackers, and malicious stylesheets while preserving clean typographical headings, paragraphs, and list elements.
