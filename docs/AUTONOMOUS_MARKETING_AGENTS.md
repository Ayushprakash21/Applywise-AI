# APPLYVISE GROWTH ENGINE — AUTONOMOUS MARKETING AGENTS SPECIFICATION

This document details the functional specifications, inputs, triggers, outputs, and deterministic constraints for all eight autonomous agents in the ApplyVise Marketing Department.

---

## 1. CHIEF GROWTH INTELLIGENCE AGENT (`chief_growth`)
- **Role:** Marketing Department Lead & Executive Strategist
- **Core Responsibilities:**
  - Synthesizes 30-day funnel performance and user acquisition metrics.
  - Produces structured weekly executive growth memos containing key initiatives, identified bottlenecks, and tactical recommendations.
  - Dispatches action tasks across the specialized agent workforce.
- **Trigger Mechanisms:** Weekly cron schedule or manual trigger via Admin Console.
- **Output:** Weekly Growth Memo + high-priority tactical tasks queued for operator approval.

---

## 2. SEO INTELLIGENCE AGENT (`seo_intelligence`)
- **Role:** Technical SEO & Organic Visibility Specialist
- **Core Responsibilities:**
  - Audits core landing pages (`/`, `/pricing`, `/resources`) for technical compliance.
  - Verifies canonical tag parity, HTTP 200 response codes, indexability flags, and structured schema markup (`SoftwareApplication`, `Product`, `CollectionPage`).
  - Clusters high-intent search queries into structured keyword groups with monthly volume and difficulty metrics.
- **Constraints:** Never reports hallucinated search engine rankings.

---

## 3. AI CONTENT MARKETING AGENT (`content_marketing`)
- **Role:** Educational Publisher & Career Authority Writer
- **Core Responsibilities:**
  - Researches and drafts long-form educational guides covering ATS mechanics, behavioral interview frameworks (STAR), and career advancement strategies.
  - Enforces the **ApplyVise Zero-Hallucination Standard**: all educational advice must align with verified recruitment mechanics and transparent data practices.
  - Manages the full editorial lifecycle: `IDEA` -> `IN_PROGRESS` -> `REVIEW_REQUIRED` -> `APPROVED` -> `PUBLISHED`.
- **Output:** Structured markdown articles published to the public resource hub (`/resources` and `/resources/:slug`).

---

## 4. SOCIAL MEDIA MARKETING AGENT (`social_media`)
- **Role:** Thought Leadership & Multi-Platform Distribution Specialist
- **Core Responsibilities:**
  - Plans and drafts contextual distribution snippets for LinkedIn, X (Twitter), and YouTube.
  - Highlights core platform advantages: verified fact registries, zero hallucinated dates, and supervised autopilot.
  - Displays transparent connection state (Honest Disconnected badges when API credentials are unconfigured).

---

## 5. COMPETITOR INTELLIGENCE AGENT (`competitor_intelligence`)
- **Role:** Market Intelligence & Benchmark Analyst
- **Core Responsibilities:**
  - Continuously monitors public pricing, feature tiers, and positioning shifts across competitors: **Simplify**, **Teal**, **Jobscan**, and **Huntr**.
  - Highlights ApplyVise's distinctive differentiators: multi-agent autonomous submission vs simple form autofill; verified fact grounding vs keyword stuffing.
- **Constraints:** Grounded strictly in verified public data; never fabricates fake competitor flaws.

---

## 6. GROWTH STRATEGY AGENT (`growth_strategy`)
- **Role:** Acquisition Channel Strategist & Partnership Planner
- **Core Responsibilities:**
  - Analyzes organic acquisition channels, university career center syndication, and developer community outreach.
  - Recommends tactical campaigns and calculates projected registration lifts.

---

## 7. CONVERSION OPTIMIZATION AGENT (`conversion_optimization`)
- **Role:** CRO Specialist & Experiment Architect
- **Core Responsibilities:**
  - Monitors progression across the 7-stage candidate conversion funnel.
  - Calculates stage-by-stage drop-off rates.
  - Proposes structured A/B hypothesis tests (e.g. 1-Click ATS Score Preview on landing pages).

---

## 8. REPUTATION & BRAND INTELLIGENCE AGENT (`reputation_brand`)
- **Role:** Brand Sentinel & Candidate Trust Auditor
- **Core Responsibilities:**
  - Monitors user trust metrics and platform truthfulness scores.
  - Audits system compliance with zero-hallucination policies across tailored documents and job applications.
