# APPLYVISE GROWTH ENGINE — SEO AUTOMATION SPECIFICATION

This document outlines the SEO intelligence architecture, on-page technical audit rules, keyword clustering algorithms, and public indexing requirements.

---

## 1. TECHNICAL ON-PAGE AUDIT CRITERIA

The SEO Intelligence Agent audits all key routes according to an automated 100-point rubric:

1. **HTTP Status & Indexability (25 pts)**:
   - Must return HTTP 200.
   - Robots directive must contain `index, follow` on public routes.
   - `canonical_url` must match the production canonical URL without query string pollution.

2. **Semantic Hierarchy & Content Depth (25 pts)**:
   - Exactly one `<h1>` tag matching page intent.
   - Minimum word count threshold:
     - Landing page (`/`): >= 1,000 words.
     - Pricing page (`/pricing`): >= 800 words.
     - Resource articles (`/resources/:slug`): >= 1,200 words.

3. **Metadata & OpenGraph Completeness (25 pts)**:
   - Title length: between 45 and 65 characters with brand suffix `| ApplyVise AI`.
   - Meta description: between 120 and 160 characters containing primary target keyword.
   - OpenGraph `og:title`, `og:description`, `og:image`, and `og:type` declarations.

4. **Structured Schema.org Data (25 pts)**:
   - Home: `SoftwareApplication` JSON-LD schema with `applicationCategory: BusinessApplication`.
   - Pricing: `Product` with `offers` defining Free, Pro, and Black Elite pricing tiers.
   - Resources: `Article` or `CollectionPage` schema with author, datePublished, and dateModified.

---

## 2. HIGH-INTENT KEYWORD CLUSTER REGISTRY

The platform tracks four core keyword clusters grounded in verified candidate search behavior:

| Cluster Name | Primary Keyword | Search Intent | Monthly Vol | Difficulty | Target Route |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ATS Resume Optimization** | `ATS resume builder` | Commercial | 49,500 | 42 | `/resources/ats-resume-optimization-guide` |
| **AI Job Application Automation** | `AI job application agent` | Commercial | 33,100 | 38 | `/resources/autonomous-job-applications-guide` |
| **STAR Interview Intelligence** | `STAR interview framework AI` | Informational | 27,800 | 35 | `/resources/star-method-interview-preparation` |
| **Career Skill Gap Analysis** | `career skill gap analysis` | Informational | 18,200 | 29 | `/resources/career-skill-gap-analysis-guide` |

---

## 3. ZERO-FABRICATION RULE FOR RANKINGS

Unlike generic SaaS marketing dashboards that display fake simulated SERP positions (#1 on Google), the ApplyVise SEO Agent reports real verified crawl status, internal link depth, and honest API connection status for Google Search Console (GSC). Disconnected endpoints display `disconnected` badges rather than synthetic rankings.
