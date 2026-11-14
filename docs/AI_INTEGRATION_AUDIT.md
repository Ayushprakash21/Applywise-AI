# APPLYVISE AI — AI INTEGRATION & RELIABILITY AUDIT
**Document Reference:** AIA-2026-v2  
**Provider:** Google Gemini API (`gemini-2.5-flash` / `gemini-1.5-pro`)  
**Auditor:** AI/LLM Reliability & Engineering Lead  
**Date:** November 14, 2026  

---

## 1. AI Architecture Overview

ApplyVise AI integrates Google Gemini across four primary capabilities:
1. **Resume Ingestion & Structuring**: Extracts candidate work history, skills, and achievements from unstructured text.
2. **ATS Resume Tailoring**: Re-words candidate achievements to align with specific vacancy requirements.
3. **AI Copilot**: Answers candidate questions using 10 specific profile data-gathering tools.
4. **AI HR Outreach Studio**: Generates personalized direct recruiter emails based on verified candidate accomplishments.

---

## 2. Zero-Hallucination Governance & Reliability

### 2.1 Prompt Grounding & Guardrails
- **No Fabricated Facts**: Prompts explicitly pass candidate facts extracted into the `CandidateFactRegistry`. LLMs are forbidden from introducing new employers, unverified metrics, or phantom degrees.
- **Deterministic Experience Binding**: The tailoring engine maps AI-generated bullet points back to the immutable `profile.experiences` records. The model cannot alter company names, job titles, start dates, or end dates.
- **Post-Generation Fact Audit**: Tailored documents are audited via `auditTailoredResume(tailored, facts)`. Any document containing unverified companies or ungrounded percentage metrics is rejected.

### 2.2 Rate Limiting & Timeout Controls
- **Client Timeouts**: All Gemini API calls enforce `AbortSignal.timeout(15000)` (15 seconds), preventing indefinite hangs during upstream provider degradation.
- **Graceful Deterministic Fallbacks**: If the Gemini API key is unset or rate-limited, the system falls back to deterministic rule-based algorithms (e.g. `structuralEmploymentParser.ts` for extraction, rule-based STAR frameworks for interview prep) rather than throwing uncaught errors.
- **Transparent Status**: When an AI request fails, the application informs the candidate honestly rather than simulating a fake AI response.

---

## 3. Secret Management & Compliance
- **Zero Hardcoded Secrets**: Gemini API keys are loaded strictly from environment variables (`GEMINI_API_KEY` in Node.js, `c.env.GEMINI_API_KEY` in Cloudflare Workers).
- **Candidate Data Privacy**: Candidate PII (phone numbers, full postal addresses) is stripped from LLM prompts where not strictly necessary for document generation.
