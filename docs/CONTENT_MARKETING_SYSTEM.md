# APPLYVISE GROWTH ENGINE — CONTENT MARKETING SYSTEM & EDITORIAL PIPELINE

This document describes the end-to-end editorial workflow, publishing standards, and public rendering architecture for ApplyVise's educational resource hub.

---

## 1. EDITORIAL STATE MACHINE

Every educational article follows a deterministic state machine:

```
[ IDEA ] ──> [ IN_PROGRESS ] ──> [ REVIEW_REQUIRED ] ──> [ APPROVED ] ──> [ PUBLISHED ] ──> [ ARCHIVED ]
                                          │                      │
                                          └───> [ REJECTED ] <───┘
```

1. **IDEA**: Keyword target identified with preliminary search volume and intent.
2. **IN_PROGRESS**: Outline structured and body markdown being authored by the AI Content Marketing Agent.
3. **REVIEW_REQUIRED**: Article complete with full markdown, meta description, SEO title, reading time, and call to action. Queued for operator sign-off in Mode 1 & 2.
4. **APPROVED**: Administrator or autonomy rule approves the article for distribution.
5. **PUBLISHED**: Instantly available at `/resources/:slug` and listed in public catalog `/resources`. Canonical tags and indexable headers applied.
6. **ARCHIVED**: Deprecated or superseded content removed from public catalog.

---

## 2. SEED CANONICAL GUIDES

The platform ships with two verified, authoritative articles pre-loaded in the database:

### Article 1: The Truth About Applicant Tracking Systems
- **Slug:** `ats-resume-optimization-guide`
- **Focus:** How modern enterprise ATS parsers (Greenhouse, Lever, Workday) decompose linear resumes into structured JSON entities; why multi-column layouts cause date corruption; why white-text keyword stuffing triggers disqualification; and how ApplyVise Candidate Fact Registry prevents hallucination.
- **Reading Time:** 6 minutes.
- **Target URL:** `/resources/ats-resume-optimization-guide`

### Article 2: Supervised Autopilot: Quality and Verification vs Mass-Spam Bots
- **Slug:** `autonomous-job-applications-guide`
- **Focus:** Why brute-force application bots get job seekers blacklisted; ATS anti-bot detection; the Supervised Autopilot model featuring explicit candidate approval and daily submission caps; and explainable 6-dimension job matching (COME).
- **Reading Time:** 5 minutes.
- **Target URL:** `/resources/autonomous-job-applications-guide`

---

## 3. PUBLIC HUB & ROUTING INTEGRATION

The frontend provides clean, responsive reading layouts:
- Catalog route: `/resources` (lists all published guides with reading times and descriptions).
- Individual article route: `/resources/:slug` (renders structured table of contents, author attribution, reading time, grounded badge, and high-conversion signup call-to-action).
