# APPLYVISE GROWTH ENGINE — SOCIAL MEDIA & EXTERNAL INTEGRATIONS

This document outlines the multi-platform social media distribution pipeline and API integration governance.

---

## 1. SUPPORTED CHANNELS

The Social Media Marketing Agent prepares tailored thought leadership snippets for:
- **LinkedIn**: Long-form professional perspectives on ATS parsing reliability, employment history truthfulness, and hiring trends.
- **X (Twitter)**: Concise insights (<= 280 characters), actionable tips, and links to published guides.
- **YouTube / Video**: Video description outlines, titles, and tutorial script breakdowns.

---

## 2. HONEST CONNECTION TRANSPARENCY

ApplyVise rejects simulated or deceptive marketing dashboards that claim "Connected to LinkedIn" or "Connected to Google Search Console" without real credentials.

The `marketing_integrations` table tracks real integration state:
- **Connected**: Valid OAuth 2.0 or Service Account credentials supplied and verified.
- **Disconnected**: Displayed with an honest badge and setup instructions (e.g., "Service Account credentials required for real-time query harvesting").
- **Error**: Token expired or insufficient OAuth scope.

### Pre-Configured Integration Definitions
1. `gsc`: Google Search Console API.
2. `ga4`: Google Analytics 4 (Measurement Protocol).
3. `pagespeed`: Google PageSpeed Insights API.
4. `linkedin`: LinkedIn Community Management API.
5. `x`: X (Twitter) Developer API v2.

---

## 3. CHARACTER COUNT & POST VALIDATION RULES

- **LinkedIn Limit:** Up to 3,000 characters; recommended sweet spot: 600 - 1,200 characters.
- **X Limit:** 280 characters maximum.
- **Media Attachments:** Validated against allowed image types (JPG, PNG, WebP) with maximum 5 MB payload limit.
- **Approval Gate:** All social drafts default to `draft` or `review_required` in Supervised Autopilot mode until confirmed by an administrator.
