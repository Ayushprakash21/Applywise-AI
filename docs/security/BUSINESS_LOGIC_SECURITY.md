# APPLYVISE AI — BUSINESS LOGIC & ENTITLEMENT SECURITY AUDIT

**Scope:** AI Autopilot Execution, Quota Management, Tier Entitlements, Payment Webhook Integrity  
**Key Standards:** OWASP API Security Top 10 (API6:2023 Unrestricted Access to Sensitive Business Flows)

---

## 1. AUTOPILOT SUBMISSION INTEGRITY & ZERO-FABRICATION (SEC-002)

### Defect Identified
In `worker/autopilotEngine.ts`, `executeSubmission` previously simulated automated submissions for Greenhouse and Lever boards by fabricating random reference strings (`GH-SUB-...`, `LEV-SUB-...`) without candidate evidence or employer confirmation. This committed user application quota prematurely and violated truth-in-advertising guarantees.

### Remediation Implemented
1. Unless genuine candidate verification evidence (`confirmationCode`, `confirmationUrl`, or `verifiedByCandidate`) is provided, `executeSubmission` returns:
   - `success: false`
   - `requiresAttention: true`
   - `submissionReference: undefined`
   - `attentionReason: 'Employer portal requires direct candidate screening questions or verification.'`
2. No subscription quota is consumed or committed for unconfirmed portal redirects.
3. In `worker/index.ts` (`POST /api/autopilot/jobs/:id/submit`), unverified applications are routed to `NEEDS_MY_ATTENTION` with zero quota deducted.

---

## 2. PAYMENT SIGNATURE INTEGRITY & TIMING ATTACKS (SEC-003)

### Defect Identified
Payment verification in `server.ts` and `worker/index.ts` previously compared the received Razorpay HMAC signature using variable-time comparison (`!==` and `===`).

### Remediation Implemented
Signatures are validated using constant-time comparison algorithms:
- **Node.js:** `crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))`
- **Cloudflare Workers:** Constant-time bitwise XOR comparison over all bytes, preventing timing side-channel attacks from leaking cryptographic signature bits.
- Price, currency, and tier parameters are calculated strictly server-side based on user id and internal pricing catalogue. Client-submitted prices are rejected.

---

## 3. SUBSCRIPTION TIERS & LIMIT CONTROLS

| Plan Tier | Daily Limit | Monthly Limit | Autopilot Allowed |
| :--- | :--- | :--- | :--- |
| **FREE** | 3 applications | 20 applications | Guided Only |
| **PRO** | 10 applications | 150 applications | Candidate-Governed |
| **BLACK ELITE** | 25 applications | 500 applications | Executive White-Glove |

Entitlement checks are enforced on the backend prior to starting any application pipeline.
