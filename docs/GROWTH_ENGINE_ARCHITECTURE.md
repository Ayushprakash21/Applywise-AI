# APPLYVISE GROWTH ENGINE — SYSTEM ARCHITECTURE SPECIFICATION

**Product:** ApplyVise AI  
**Module:** Growth Engine (Autonomous AI Marketing Department)  
**Location:** `/admin/growth-engine`  
**Execution Runtime:** Dual-Runtime (Node.js/Express + Cloudflare Workers/Hono)  
**Storage Architecture:** SQLite Local + Cloudflare D1 Serverless Relational Database  

---

## 1. EXECUTIVE OVERVIEW

The **ApplyVise Growth Engine** is an integrated, multi-agent AI marketing department operating inside the ApplyVise Admin Console. Rather than functioning as a cosmetic dashboard or disconnected automation script, the Growth Engine operates eight specialized AI agents that continuously plan, optimize, distribute, and measure ApplyVise's market presence.

The engine coordinates organic search visibility, high-authority educational publishing, multi-platform thought leadership, competitor benchmark monitoring, and 7-stage user conversion funnels.

```
                              ┌────────────────────────────────────────┐
                              │      Admin Executive Command Center    │
                              │         (/admin/growth-engine)         │
                              └───────────────────┬────────────────────┘
                                                  │
                                                  ▼
                        ┌────────────────────────────────────────────────────┐
                        │        Chief Growth Intelligence Agent (CGIA)       │
                        │    - Weekly Executive Growth Memos                 │
                        │    - Inter-Agent Task Dispatcher & Approvals       │
                        │    - Budget & Autonomy Safety Governance           │
                        └─────────┬──────────────┬──────────────┬────────────┘
                                  │              │              │
         ┌────────────────────────┴─┐            │            ┌─┴────────────────────────┐
         ▼                          ▼            ▼            ▼                          ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ SEO Intelligence │    │  AI Content      │    │  Social Media    │    │ Competitor       │
│ Agent            │    │  Marketing Agent │    │  Marketing Agent │    │ Intelligence     │
│ - Keyword Hub    │    │  - Editorial     │    │  - Multi-Channel │    │ - Price Radar    │
│ - On-Page Audit  │    │  - Fact Grounded │    │  - Thought Lead  │    │ - Feature Gaps   │
│ - Canonical URLs │    │  - Canonical Doc │    │  - Transp. State │    │ - Value Prop     │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
         │                          │                                            │
         ▼                          ▼                                            ▼
┌──────────────────┐    ┌──────────────────┐                        ┌──────────────────┐
│ Growth Strategy  │    │ Conversion       │                        │ Reputation &     │
│ Agent            │    │ Optimization     │                        │ Brand Agent      │
│ - Channel Split  │    │ - 7-Stage Funnel │                        │ - Trust Score    │
│ - Viral Loops    │    │ - A/B Proposals  │                        │ - Zero Halluc.   │
└──────────────────┘    └──────────────────┘                        └──────────────────┘
```

---

## 2. DUAL-RUNTIME DATA PERSISTENCE LAYER

In full alignment with ApplyVise's architectural design, the Growth Engine operates symmetrically across Node.js (`DatabaseSync` SQLite) and Cloudflare Workers (`D1Database`):

### 16 Normalized Relational Tables
1. `growth_agent_settings`: Autonomy mode, pause toggle, emergency stop flag, budget ceiling, and publishing permissions.
2. `growth_agent_runs`: Audit history of scheduled and manually triggered agent runs.
3. `growth_agent_tasks`: Queued marketing action proposals requiring human sign-off or auto-execution.
4. `seo_properties`: Audited landing and resource pages with health scores, canonical tags, word counts, and issues.
5. `seo_keyword_groups`: Clustered high-intent keyword targets with monthly search volume and difficulty.
6. `seo_audit_results`: Historical technical crawl logs.
7. `marketing_content`: Long-form educational articles with full markdown body, SEO title, meta descriptions, outlines, reading times, and conversion CTAs.
8. `marketing_calendar`: Editorial publication schedule across channels.
9. `social_accounts`: Connected social network identity records.
10. `social_posts`: Drafted and published snippets for LinkedIn, X, and YouTube with character counts and engagement tracking.
11. `competitor_profiles`: Structured competitive benchmarks for Simplify, Teal, Jobscan, and Huntr.
12. `competitor_observations`: Strategic takeaway logs on competitor pricing or feature shifts.
13. `marketing_campaigns`: Acquisition initiatives with budget allocations and UTM tracking.
14. `marketing_funnel_metrics`: 7-stage conversion funnel statistics (visits -> signups -> profile -> resume -> apply -> checkout -> paid).
15. `marketing_integrations`: Real status registry for Google Search Console, Google Analytics 4, PageSpeed Insights, LinkedIn, and X.
16. `growth_agent_activity`: Granular audit log of agent operations.

---

## 3. AUTONOMY & SAFETY CONTROLS

The Growth Engine enforces three explicit operational modes:
- **Mode 1: Assisted**: All agent proposals remain in `review_required` status until an authorized administrator explicitly clicks "Approve & Execute".
- **Mode 2: Supervised Autopilot (Default)**: Routine data collection, keyword clustering, and SEO crawls run autonomously. Content publishing, ad campaigns, and external distribution require one-click human confirmation.
- **Mode 3: Controlled Autonomous**: Agents may auto-publish articles within approved categories (e.g. ATS tutorials) provided the monthly budget ceiling is strictly respected.
- **Immediate Emergency Stop**: A persistent toggle immediately halts all autonomous background tasks and blocks publishing across all agents.
- **Pause/Resume Control**: Allows operators to pause all agent runs temporarily during maintenance or marketing review periods.
