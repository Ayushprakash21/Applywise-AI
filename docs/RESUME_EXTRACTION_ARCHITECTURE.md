# APPLYVISE AI — RESUME EXTRACTION ARCHITECTURE
**Document Reference:** REA-2026-v2  
**Component:** Universal Multi-Format Text Extraction & Parsing Engine  
**Runtime Targets:** Cloudflare Workers (V8 Edge Isolates) & Node.js 20+  

---

## 1. Pipeline Overview

The ApplyVise Resume Extraction Pipeline ingests candidate resumes across diverse formats (DOCX, PDF, Plain Text) and extracts structured, typed employment entities without hallucination.

```
[Uploaded Resume File]
         │
         ├── DOCX XML Engine (word/document.xml extraction)
         └── PDF / Plain Text Ingestion
         │
         ▼
[Deterministic Text Stream]
         │
         ▼
[Structural Employment Parser]
  ├── Section Classification (Professional Experience Isolation)
  ├── Header Tokenization (Role, Company, Location, Date extraction)
  ├── Sentence Continuation & Action Verb Analysis
  ├── Per-Record Evidence Isolation
  └── Universal Token Validation & Blacklist Guard
         │
         ▼
[Verified Profile Experiences] ──► [Candidate Fact Registry]
```

---

## 2. Structural Parsing Safeguards

### 2.1 Universal Disallowed Token Blacklist
To prevent fragmented text lines from becoming companies or roles, `structuralEmploymentParser.ts` enforces `isInvalidToken(token: string)`:
- Standalone years: `^(?:19|20)\d{2}$`
- Standalone months / seasons: `January`, `Feb`, `Summer`, `Winter`, etc.
- Relative temporal tokens: `Present`, `Current`, `Till Date`, `Now`
- Trailing phrase markers: `to-end ...`, `discrepancies in a ...`, `checking services for ...`, `environment.`
- Action verbs & gerunds: `Carried out`, `Providing`, `Reconciling`, `Managing`

### 2.2 Boundary Detection
An entity candidate must satisfy:
`!isInvalidToken(company) && !isInvalidToken(role)`  
If either field matches a disallowed token, the line is rejected as a new job block and stitched into the preceding role's responsibility stream.

### 2.3 Responsibility Continuation Stitching
Lines following a valid job header that begin with lowercase letters, gerunds, or prepositions are recognized as wrapped clauses and stitched onto the previous sentence, preventing artificial sentence truncation.
