# APPLYVISE AI — PRODUCT ROADMAP & ENGINEERING EXECUTION SPECIFICATION
## The Career Operating System Superiority Program

**Document Version:** 1.0.0  
**Status:** Approved Architectural Roadmap  
**Target Architecture:** Multi-Tenant Node + Cloudflare Workers D1 + Manifest V3 Browser Copilot  
**Execution Horizon:** Phases 0 through 6

---

## 1. Architectural Blueprint & Target System Topology

```
+-------------------------------------------------------------------------------------------------------+
|                                          APPLYVISE CLIENT LAYER                                       |
|                                                                                                       |
|   [ Web Application (React 19) ]                     [ Browser Copilot Extension (MV3) ]               |
|   • Career Command Center                            • Supported ATS Form Detection (GH, Lever, etc.) |
|   • Opportunity Radar & Universe                     • Sandboxed Field Autofill                       |
|   • Candidate Fact Registry                          • Fact Verification Mapping                      |
|   • Resume & Cover Letter Studio                     • Candidate-Controlled Confirmation               |
|   • Recruiter Outreach Studio                        • Zero CAPTCHA / Anti-Bot Bypass                 |
|   • Career Outcome Analytics                         • Local Encrypted Storage & Token Auth           |
+-------------------------------------------------------------------------------------------------------+
                                                   │
                                      HTTPS REST / WebCrypto HMAC
                                                   │
                                                   ▼
+-------------------------------------------------------------------------------------------------------+
|                                   UNIFIED BACKEND & EDGE LAYER                                        |
|                                                                                                       |
|   [ Opportunity Intelligence ]     [ Matching Engine (COME) ]     [ Resume Intelligence ]             |
|   • Aggregator Connectors          • 6-Dimension Transparent      • Candidate Fact Registry           |
|   • Direct Career Page Scraper       Scoring                      • Zero-Hallucination Tailoring      |
|   • ATS Webhooks / Polling         • Evidence Gap Generator       • DOCX Native Binary Export         |
|   • Freshness & Dead-Link Audit    • Hard Gatekeeper Disqualifier • Visual Diff Validator             |
|                                                                                                       |
|   [ Recruiter Graph ]              [ Outcome Analytics Engine ]   [ Extension Gateway API ]           |
|   • Permitted Public Contacts      • Funnel Conversion Analysis   • Token Auth & Rate Limiting        |
|   • MX & Syntax Verification       • Source Response Rates        • Secure Form Schema Mapping        |
|   • Vacancy Relationship Mapping   • Fit vs Outcome Correlation   • Application Sync Endpoint         |
+-------------------------------------------------------------------------------------------------------+
                                                   │
                                                   ▼
+-------------------------------------------------------------------------------------------------------+
|                                       DATA PERSISTENCE LAYER                                          |
|                                                                                                       |
|   • SQLite (Node / Express Local & Test Parity)                                                       |
|   • Cloudflare D1 (Serverless Edge Production Parity)                                                 |
|   • Cloudflare R2 / Local Assets (Encrypted Resumes & Evidence Attachments)                           |
+-------------------------------------------------------------------------------------------------------+
```

---

## 2. Phased Implementation Roadmap

---

### Phase 0: Architecture & Competitive Gap Audit (Complete)
- **Scope:** Competitive analysis of Protocol Jobs, functional capability audit of ApplyVise codebase, classification of all modules, and creation of canonical documentation.
- **Deliverables:**
  - `docs/competitive/PROTOCOL_COMPETITIVE_ANALYSIS.md`
  - `docs/competitive/APPLYVISE_CAPABILITY_GAP_ANALYSIS.md`
  - `docs/competitive/APPLYVISE_PRODUCT_ROADMAP.md`
- **Acceptance Criteria:** Every capability classified truthfully; zero ungrounded claims of feature completeness.

---

### Phase 1: Opportunity Intelligence Engine
- **Scope:** Evolve GCDE into an automated, multi-source ingestion engine with scheduled freshness checks, source provenance, and direct career page discovery.
- **Key Capabilities:**
  1. Direct career page discovery for verified companies.
  2. Native ATS ingestion (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee).
  3. Continuous freshness tracking with automated HEAD request closure checks.
  4. Normalized composite deduplication identity.
  5. SSRF and link sanitization guarantees.
- **Database Schema Updates:**
  ```sql
  CREATE TABLE IF NOT EXISTS vacancies (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_job_id TEXT,
    company TEXT NOT NULL,
    company_domain TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    country TEXT,
    work_arrangement TEXT CHECK(work_arrangement IN ('remote', 'hybrid', 'onsite')),
    employment_type TEXT,
    experience_level TEXT,
    salary_raw TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency TEXT,
    url TEXT NOT NULL,
    original_application_url TEXT,
    source_confidence REAL DEFAULT 1.0,
    status TEXT CHECK(status IN ('active', 'expired', 'closed', 'unverified')) DEFAULT 'active',
    first_discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    dedup_key TEXT UNIQUE NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_vacancies_company ON vacancies(company);
  CREATE INDEX IF NOT EXISTS idx_vacancies_dedup ON vacancies(dedup_key);
  CREATE INDEX IF NOT EXISTS idx_vacancies_status ON vacancies(status);
  ```
- **API Contracts:**
  - `GET /api/opportunities/search?q={query}&country={country}&remote={bool}&limit={limit}`
  - `POST /api/opportunities/verify-url` payload: `{ url: string }` $\to$ `{ active: boolean, statusCode: number, lastVerifiedAt: string }`
  - `GET /api/admin/gcde/health` $\to$ Returns per-connector status, latency, error count, and queue size.
- **Security Review:** Strict URL validation (`isSafePublicUrl`), SSRF blocking for private subnets and cloud metadata (169.254.169.254), sanitization of HTML descriptions.
- **Testing Plan:** Verify duplicate key normalization, aggregator parsing, schema validation, and dead-link detection.

---

### Phase 2: Transparent Career Opportunity Score (COME 2.0)
- **Scope:** Upgrade the 6-dimension Candidate Opportunity Matching Engine (COME) with transparent scoring, mathematical fit explanations, and explicit evidence citations.
- **Key Dimensions:**
  1. Core Skills Match ($30\%$)
  2. Experience Years & Level ($25\%$)
  3. Role & Title Alignment ($20\%$)
  4. Mandatory Qualifications ($10\%$) — Hard gatekeeper: caps score at $\le 45\%$ on failure.
  5. Geographic & Work-Mode ($10\%$)
  6. Candidate Preferences & Compensation ($5\%$)
- **Guarantees:**
  - Separate match score from applicant volume / competition estimates.
  - Never fabricate fake "interview chances" or "acceptance probabilities".
  - Provide explicit `missingRequirements` and `evidenceSupport` arrays.
- **API Contract:**
  - `POST /api/matching/evaluate` payload: `{ vacancyId: string, profileId?: string }` $\to$ `ExplainableMatchBreakdown`
- **Testing Plan:** Verify scoring bounds $[0, 100]$, gatekeeper penalty enforcement, and missing skill generation.

---

### Phase 3: Evidence-Backed Resume Intelligence & Tailoring
- **Scope:** Unify the Candidate Fact Registry with Resume Studio to generate verifiable tailored resumes with visual side-by-side diffing and DOCX export.
- **Capabilities:**
  1. Job description requirement extraction.
  2. Requirement-to-Fact mapping.
  3. Evidence gap detection (e.g. candidate has no proven cloud experience).
  4. Truthful bullet point refinement (rephrasing verified facts to emphasize relevant keywords).
  5. Side-by-side visual diff component in UI.
  6. Strict prohibition of invented titles, employers, degrees, or achievements.
  7. Mandatory candidate confirmation gate before application submission.
- **Database Schema Updates:**
  ```sql
  CREATE TABLE IF NOT EXISTS tailored_resumes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    vacancy_id TEXT NOT NULL,
    version_number INTEGER DEFAULT 1,
    headline TEXT,
    summary TEXT,
    skills_json TEXT NOT NULL,
    experience_json TEXT NOT NULL,
    education_json TEXT,
    certifications_json TEXT,
    evidence_citations_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Testing Plan:** Automated prompt injection tests, ungrounded claim rejection tests, binary DOCX export validity.

---

### Phase 4: ApplyVise Browser Copilot (Chrome Extension Package)
- **Scope:** Architect and package a dedicated Manifest V3 Chrome Extension (`packages/browser-copilot`) that interfaces securely with the ApplyVise Candidate Fact Registry.
- **Key Capabilities:**
  1. Automatic recognition of supported ATS application pages (Greenhouse, Lever, Ashby, Workable).
  2. Field detection: First Name, Last Name, Email, Phone, LinkedIn, GitHub, Portfolio, Location.
  3. Autofill verified profile data with candidate visual confirmation.
  4. Suggest tailored responses for standard screening questions from verified profile facts.
  5. Attach ATS-compliant tailored DOCX/PDF resume directly into file inputs.
  6. One-click synchronization of application record back to ApplyVise Application Tracker.
- **Security & Privacy Boundaries:**
  - **Zero CAPTCHA / Anti-Bot Bypass:** Explicitly prohibited from attempting to bypass Cloudflare Turnstile, reCAPTCHA, or bot protection gates.
  - **No Automatic Submissions:** The extension *pre-fills* the form; the human candidate *must review and click submit*.
  - **Minimum Permissions:** Scoped strictly to active tab (`activeTab`, `storage`, `declarativeContent`). No broad `<all_urls>` permission creep.
  - **Isolated Storage:** Auth tokens stored in `chrome.storage.local` with short TTLs and TLS HTTPS transport.

---

### Phase 5: Recruiter Intelligence Graph
- **Scope:** Connect opportunities directly to verified corporate recruiters, talent acquisition leads, and hiring managers with strict provenance.
- **Key Capabilities:**
  1. Link company vacancies to discovered recruitment contacts (`vacancy_id -> hr_contact_id`).
  2. Multi-tier contact verification: Syntax, MX DNS check, Disposable domain block, Role-based classification.
  3. Transparent provenance: Record the exact public HTTPS page where contact was listed.
  4. Candidate outreach tracking: Sent status, Follow-up reminder, Response recorded.
  5. Strict compliance: Zero scraping of gated private networks, zero contact guessing.
- **API Contract:**
  - `GET /api/recruiter-graph/contacts?vacancyId={id}` $\to$ Returns verified public contacts associated with employer.
  - `POST /api/recruiter-graph/outreach` $\to$ Records outreach timestamp, subject, and follow-up status.

---

### Phase 6: Career Outcome Intelligence & Analytics
- **Scope:** Build an analytical intelligence layer measuring real-world application performance, conversion funnels, and predictive accuracy.
- **Metrics Computed:**
  1. Application Funnel: Discovered $\to$ Qualified $\to$ Prepared $\to$ Submitted $\to$ Recruiter Response $\to$ Interview $\to$ Offer.
  2. Sourcing Channel Performance: Response rate by ATS feed (e.g. Greenhouse direct vs Arbeitnow).
  3. Resume Version Performance: Conversion rate across tailored versions.
  4. Fit Score Correlation: Pearson correlation between initial COME score and interview invitations.
  5. Statistical Integrity: Explicit small-sample notices for cohorts $< 10$ applications to prevent false causality.
- **UI Component:** `CareerOutcomeIntelligenceView.tsx` integrated into Career Atlas / Analytics.

---

## 3. Engineering Complexity & Dependency Matrix

| Phase | Core Dependencies | Backend Complexity | Frontend Complexity | Test Effort | Target Sprint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | Documentation & Design Tokens | Low | Low | Low | Sprint 1 (Done) |
| **Phase 1** | Node Fetch / Cloudflare Workers D1 | Medium | Medium | Medium | Sprint 1–2 |
| **Phase 2** | `explainableMatcher.ts` / D1 Store | Low | Medium | High | Sprint 2 |
| **Phase 3** | Candidate Fact Registry / DOCX Builder | Medium | High | High | Sprint 3 |
| **Phase 4** | Chrome Extensions MV3 API / WebCrypto | High | High (Extension UI) | High | Sprint 4–5 |
| **Phase 5** | DNS MX Resolvers / Public Contact Parser | Medium | Medium | Medium | Sprint 5 |
| **Phase 6** | SQLite / D1 Window Functions & Aggregations | Medium | High | Medium | Sprint 6 |
