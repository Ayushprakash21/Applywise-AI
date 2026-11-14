# APPLYVISE AI — CAPABILITY GAP ANALYSIS
## Rigorous Codebase Audit & Functional Connectivity Assessment

**Document Version:** 1.0.0  
**Status:** Canonical Audit  
**Audit Scope:** Full Application Stack (`src/`, `server/`, `worker/`, `tests/`)  
**Standard:** Truthful Classification — Existence of UI or Mock Data Does Not Constitute Implementation

---

## 1. Feature Classification Standard

Every capability is classified into one of six mutually exclusive states:
1. **Already implemented and verified:** Fully functional across frontend, API routes, database/storage, and backed by automated tests.
2. **Partially implemented:** Functional in some areas (e.g. backend works or partial API exists) but incomplete in UI or end-to-end flow.
3. **Present in UI but not functionally connected:** Visual controls exist on screen, but trigger mock state, local dummy data, or empty callbacks without persistence.
4. **Missing:** No functional code or UI exists yet.
5. **Requires external provider:** Cannot be achieved purely with local compute; depends on third-party APIs or infrastructure (e.g. Workday OAuth, corporate SSO, email delivery).
6. **Requires architectural redesign:** Current implementation pattern cannot scale, violates security/privacy boundaries, or contradicts core design principles.

---

## 2. Comprehensive Capability Audit Table

### A. Opportunity Discovery & Ingestion Engine (GCDE)
| Capability | Classification | Current Codebase State | Exact Files & Evidence | Required Remediation / Action |
| :--- | :--- | :--- | :--- | :--- |
| **Aggregator API Feeds (Remotive, Arbeitnow, Jobicy)** | **Already implemented and verified** | Live HTTP adapters with 8s timeouts, rate limits, and fallback normalization. | `server/jobDiscovery.ts`, `worker/jobConnectors.ts`, `tests/job_discovery.test.ts`. | Keep actively monitored; add circuit-breaker metrics in Admin Console. |
| **Greenhouse & Lever ATS Ingestion** | **Already implemented and verified** | Structured parsers handle Greenhouse board APIs and Lever posting JSON. | `worker/jobConnectors.ts`, `server/jobImportEngine.ts`, `tests/job_import.test.ts`. | Add company-specific subdomain discovery queue in GCDE. |
| **Ashby, Workable, SmartRecruiters** | **Already implemented and verified** | Canonical adapters extract roles, descriptions, locations, and compensation. | `worker/jobConnectors.ts:fetchJobs()`. | Expand seeded verified companies registry. |
| **Workday Integration** | **Requires architectural redesign** | Workday does not provide open public REST APIs without enterprise customer tenant credentials. Requires client-side DOM traversal. | Absent in `server/` and `worker/`. | Build client-side DOM mapper in the Browser Copilot extension (Phase 4). |
| **Direct Career Page Scraping & Discovery** | **Partially implemented** | Manual URL import exists (`JobImportModal.tsx`, `server/jobImportEngine.ts`); automated scheduled crawl of 500+ domains is partial. | `server/jobImportEngine.ts`, `src/utils/growthEngine.ts`. | Implement automated periodic cron job to ping canonical employer career sitemaps. |
| **Job Freshness & Closure Detection** | **Partially implemented** | HEAD request recheck exists in `server/jobDiscovery.ts:recheckVacancy`, but is on-demand rather than background scheduled. | `server/jobDiscovery.ts:228-240`. | Build a background queue worker to recheck active vacancies older than 48 hours. |
| **Job Deduplication Engine** | **Already implemented and verified** | Composite key hashing (`generateDuplicateKey`: normalized title + company + user). | `src/utils/rules.ts:29-51`, `tests/rules.test.ts`. | Fully functional and regression tested. |

---

### B. Matching & Fit Intelligence
| Capability | Classification | Current Codebase State | Exact Files & Evidence | Required Remediation / Action |
| :--- | :--- | :--- | :--- | :--- |
| **Explainable 6-Dimension Fit Scoring (COME)** | **Already implemented and verified** | Skills (30%), Experience (25%), Role (20%), Mandatory (10%), Geo (10%), Prefs (5%). | `src/utils/explainableMatcher.ts`, `tests/explainable_matcher.test.ts`. | Fully operational. Exposes granular scores and evidence. |
| **Transparent Disqualification Explanations** | **Already implemented and verified** | Hard gate penalty caps score at $\le 45\%$ when visa sponsorship or mandatory clearance is missing. | `src/utils/explainableMatcher.ts:220-227`. | Expand heuristic rules for specialized professional licenses. |
| **True Competition / Application Volume Metric** | **Missing** | Protocol displays "applicants: 12" or "low competition" without evidence. ApplyVise refuses to fabricate competition. | N/A | Add authentic metadata: "Discovered 4h ago", "Feed Index Date". Never fabricate applicant counts. |
| **Skill Gap Recommendations** | **Already implemented and verified** | Returns explicit `missingSkills` array with transparent candidate recommendations. | `src/utils/explainableMatcher.ts:101-108`, `JobDetailDrawer.tsx`. | Display remediation suggestions in Job Detail drawer. |

---

### C. Resume & Profile Intelligence
| Capability | Classification | Current Codebase State | Exact Files & Evidence | Required Remediation / Action |
| :--- | :--- | :--- | :--- | :--- |
| **Candidate Fact Registry** | **Already implemented and verified** | Categorized facts (Identity, Titles, Employers, Skills, Education) tied to source documents. | `src/utils/candidateFactRegistry.ts`, `tests/candidate_fact_registry.test.ts`. | Ground truth anchor for all downstream generative actions. |
| **Zero-Hallucination Tailoring Engine** | **Already implemented and verified** | Validates every bullet point against Candidate Facts. Flags ungrounded claims. | `src/utils/resumeValidationEngine.ts`, `worker/resumeEngine.ts`, `tests/ai_resume_extraction.test.ts`. | Enforce candidate review gate before application export. |
| **ATS-Native DOCX Export** | **Already implemented and verified** | Pure binary DOCX generator without corrupt XML or style bleed. | `src/utils/docxExtractor.ts`, `src/components/ResumeStudioTab.tsx`. | Production verified. |
| **Side-by-Side Resume Diff Comparison** | **Present in UI but not functionally connected** | UI has tabs for original vs tailored preview, but lacks a word-by-word visual diff component. | `src/components/ResumeStudioTab.tsx`. | Implement visual diff highlighting changed bullet points and matching keywords. |

---

### D. Application Execution & Browser Autofill
| Capability | Classification | Current Codebase State | Exact Files & Evidence | Required Remediation / Action |
| :--- | :--- | :--- | :--- | :--- |
| **Web-Based Application Tracker** | **Already implemented and verified** | 12-state transition engine (`READY_TO_SUBMIT`, `SUBMITTED`, `INTERVIEW_SCHEDULED`, etc.). | `src/utils/rules.ts:validateStateTransition`, `ApplicationTracker.tsx`. | Fully operational with audit timestamps. |
| **Web Autopilot Simulation** | **Partially implemented** | Step-by-step assistant in `AiAutopilotStudio.tsx`, but requires manual click-through on external ATS. | `src/components/AiAutopilotStudio.tsx`, `worker/autopilotEngine.ts`. | Keep as guided web workflow; build Chrome extension for native browser autofill. |
| **Browser Extension (Chrome / Edge)** | **Missing** | No Chrome Extension package currently exists in the repository. | N/A | **Phase 4 Mandatory Deliverable**: Build standalone `packages/browser-copilot` Manifest V3 extension. |
| **One-Click Automated ATS Submission** | **Requires architectural redesign** | Automated submission without candidate oversight risks account ban and ATS bot detection. | `worker/submissionAdapter.ts`. | Shift paradigm to "Candidate-Authorized Copilot": Extension pre-fills fields; candidate reviews and clicks submit. |

---

### E. Recruiter Intelligence & Outreach
| Capability | Classification | Current Codebase State | Exact Files & Evidence | Required Remediation / Action |
| :--- | :--- | :--- | :--- | :--- |
| **Public HR Contact Discovery** | **Already implemented and verified** | Extracts verified emails from public career pages; parses mailto and obfuscated text. | `src/utils/hrContactDiscovery.ts`, `tests/hr_contact_discovery.test.ts`. | Production verified with strict legal and permission boundaries. |
| **Email Verification & MX Checking** | **Already implemented and verified** | Multi-level verification: Syntax, MX records, Disposable domain blacklist, Role-based check. | `src/utils/hrEmailVerification.ts`, `tests/hr_email_verification.test.ts`. | Operational. Never fabricates mailbox deliverability. |
| **Recruiter-to-Opportunity Graph** | **Partially implemented** | Contacts are mapped by company domain, but direct vacancy-to-recruiter binding is partial. | `server/hrOutreachStore.ts`, `worker/hrOutreachStore.ts`. | Add explicit foreign key relationship `vacancy_id -> hr_contact_id` in SQLite and D1 stores. |
| **Email Sending Integration (Gmail/Outlook)** | **Requires external provider** | UI generates personalized outreach emails; actual SMTP sending requires candidate OAuth grant. | `src/utils/emailProviders.ts`, `src/components/AiHrOutreachTab.tsx`. | Maintain safe copy-to-clipboard / `mailto:` fallback; integrate OAuth providers for Black Elite tier. |

---

### F. Career Outcome Intelligence & Analytics
| Capability | Classification | Current Codebase State | Exact Files & Evidence | Required Remediation / Action |
| :--- | :--- | :--- | :--- | :--- |
| **Application Funnel Pipeline Counts** | **Already implemented and verified** | Counts applications in Prepared, Submitted, Interview, Offer, Rejected stages. | `CareerDesk.tsx`, `CareerMomentumCard.tsx`. | High readability and contrast verified. |
| **Response Rate Analytics by Sourcing Channel** | **Partially implemented** | Data exists in SQLite `applications` table, but aggregations are not visualized. | `server/authAndStore.ts`, `worker/d1Store.ts`. | Build Outcome Analytics tab in Career Atlas / Reports. |
| **Fit Score vs Interview Conversion Correlation**| **Missing** | Correlation engine linking initial COME score to interview invitation is not computed. | N/A | Implement outcome analysis function to measure predictive accuracy of COME matching. |
| **Resume Version Performance Tracking** | **Missing** | Tailored resume ID is saved with application, but comparative response rate is not computed. | `types/index.ts:ApplicationRecord`. | Add statistical summary table comparing version response rates. |

---

## 3. Prioritized Gap Summary

1. **P0 — Browser Copilot Chrome Extension (Missing):** Protocol’s main competitive weapon is its 1-click Chrome Extension. ApplyVise needs a secure Manifest V3 extension mapped to the Candidate Fact Registry.
2. **P1 — Automated Periodic Career Page Discovery (Partially Implemented):** Expand GCDE from on-demand search to background scheduled ingestion across top employer career portals.
3. **P1 — Vacancy-to-Recruiter Graph Linking (Partially Implemented):** Bind discovered hiring contacts directly to matching vacancies.
4. **P2 — Visual Side-by-Side Resume Diff (Present in UI but not Connected):** Give candidates visual diff highlighting showing exactly which bullet points were aligned.
5. **P2 — Career Outcome Intelligence Analytics (Missing):** Measure real response rates, interview conversions, and fit score predictive accuracy.
