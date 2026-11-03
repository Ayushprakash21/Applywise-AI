# ApplyVise AI

> **Intelligent Job Discovery, Zero-Hallucination Resume Optimization & Career Preparation Platform**

[![ApplyVise AI CI/CD Pipeline](https://github.com/Ayushprakash21/Applywise-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/Ayushprakash21/Applywise-AI/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Edge: Cloudflare Workers](https://img.shields.io/badge/Edge-Cloudflare%20Workers-orange.svg)](https://workers.cloudflare.com/)

---

## Overview

**ApplyVise AI** is a production-grade career operating system and job-search platform designed for real job seekers. It unites verified live job aggregation, zero-hallucination ATS resume optimization, application lifecycle management, and context-aware AI coaching in one cohesive, tactile user interface.

Unlike generic generative AI tools that hallucinate employment credentials, fabricate degrees, or flood ATS portals with spam, ApplyVise AI strictly adheres to the **Zero-Hallucination Factual Standard**: every resume bullet, skill, and qualification originates provably from the candidate's verified master profile.

---

## Core Capabilities

- **Live Vacancy Discovery**: Multi-source aggregator connectors (Remotive, Arbeitnow, Jobicy) querying live, verified roles.
- **Career Digital Twin & Fit Scoring**: Multi-dimensional matching algorithm evaluating skills, experience depth, domain competencies, and work authorization.
- **ATS Resume Intelligence & Document Studio**: Factual PDF/Word text extraction, dynamic experience calculation, and verified DOCX resume exports.
- **Context-Aware AI Copilot**: Guided career advisory powered by Gemini AI with deterministic fallback engines.
- **Application Lifecycle Tracking**: Kanban pipeline tracking across Saved, Applied, Interviewing, Offered, and Rejected stages.
- **Enterprise-Grade Admin Console**: Role-based access control (RBAC) enforced cryptographically on Cloudflare edge.

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env

# 3. Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

---

## Testing & Quality Assurance

```bash
# Static type checking
npm run lint

# Automated test suite (120+ tests)
npm test

# Production build
npm run build
```

---

## Architecture & Edge Deployment

ApplyVise AI is designed for serverless edge deployment on **Cloudflare Workers** with **Cloudflare D1** (SQLite at the edge) and asset distribution via Cloudflare's global network.

For deployment instructions, refer to [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

© 2026 ApplyVise AI. All rights reserved.
