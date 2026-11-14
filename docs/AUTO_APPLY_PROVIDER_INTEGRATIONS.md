# AUTO-APPLY PROVIDER INTEGRATIONS & EXECUTION ADAPTERS

---

## 1. SUPPORTED ATS & PROVIDER ADAPTERS

1. **Greenhouse ATS (`boards.greenhouse.io`, `job-boards.greenhouse.io`):**
   - Supports automated application payload dispatch.
   - Captures confirmation references prefixed with `GH-SUB-`.

2. **Lever ATS (`jobs.lever.co`):**
   - Supports direct application endpoint execution.
   - Captures confirmation references prefixed with `LEV-SUB-`.

3. **Complex Custom Portals & Multi-Step Screening Forms:**
   - Instead of fragile, error-prone scraping or bypassing CAPTCHAs, the agent transitions the job to **`NEEDS_ATTENTION`**.
   - The user is provided with pre-filled application materials and direct links for human-in-the-loop completion.
   - **Zero fake submission receipts are generated.**
