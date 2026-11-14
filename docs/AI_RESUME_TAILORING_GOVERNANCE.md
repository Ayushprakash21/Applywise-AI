# APPLYVISE AI — AI RESUME TAILORING GOVERNANCE
**Document Reference:** ARTG-2026-v1  
**Engines:** `server/resumeEngine.ts` & `worker/resumeEngine.ts`  
**Model:** Google Gemini Pro / Flash Enterprise API  

---

## 1. Zero-Hallucination Tailoring Contract

The purpose of the AI Tailoring Engine is to re-target emphasis, highlight relevant transferable skills, and structure bullets to align with the vacancy requirements.

**The AI is explicitly forbidden from:**
1. Altering employer names.
2. Altering job titles.
3. Altering employment start dates, end dates, or current employment status.
4. Inventing achievements, client engagements, metrics, or degrees.
5. Emitting empty bullet strings (`""` or `" "`).

---

## 2. Deterministic Experience Mapping Pattern

In both the Node.js runtime and the Cloudflare Workers edge runtime, the AI is prompted to return tailored bullet points mapped by company name:

```typescript
// Deterministic Grounding in resumeEngine.ts:
const tailoredExperiences = (profile.experiences || []).map((exp) => {
  const matchingTailored = parsed.tailoredExperiences?.find(
    (te) =>
      te.company.toLowerCase().trim() === exp.company.toLowerCase().trim() ||
      exp.company.toLowerCase().includes(te.company.toLowerCase().trim())
  );

  return {
    company: exp.company,       // IMMUTABLE: derived directly from master profile
    role: exp.role,             // IMMUTABLE: derived directly from master profile
    period: formatExperiencePeriod(exp.startDate, exp.endDate, exp.current), // IMMUTABLE
    bulletPoints: (matchingTailored?.bulletPoints || [exp.description])
      .filter((bp): bp is string => typeof bp === 'string' && bp.trim().length > 0)
  };
});
```

Because the outer loop iterates over `profile.experiences`, the AI cannot add phantom employers, delete authentic historical roles, or mutate employment dates.
