# APPLYVISE AI — PRODUCTION DEPLOYMENT RUNBOOK

**Target Environment:** Cloudflare Workers & Cloudflare D1  
**Deployment Tool:** Wrangler CLI (`wrangler`)  
**Production URL:** `https://applyvise-ai.ayushprakash0021.workers.dev/`  

---

## 1. PRE-DEPLOYMENT SAFETY CHECKLIST

Before deploying any future release or configuration change:

1. [ ] Confirm you are on the intended release branch:
   ```bash
   git branch --show-current
   ```
2. [ ] Verify working tree is clean and latest commits are accounted for:
   ```bash
   git status
   ```
3. [ ] Run static TypeScript type check:
   ```bash
   npm run lint
   ```
4. [ ] Run full test suite (must report 443/443 passing):
   ```bash
   npm test
   ```
5. [ ] Run production asset build:
   ```bash
   npm run build
   ```

---

## 2. PRODUCTION SECRETS PROVISIONING (ONE-TIME SETUP)

Provision production secrets directly into Cloudflare Workers (never commit secrets to Git):

```bash
# Gemini AI API Key
npx wrangler secret put GEMINI_API_KEY

# Razorpay Payment Gateway Keys
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET

# JWT / Token Encryption Secret
npx wrangler secret put SESSION_SECRET
npx wrangler secret put EMAIL_ENCRYPTION_KEY

# Optional: Google & Microsoft OAuth
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put MICROSOFT_CLIENT_ID
npx wrangler secret put MICROSOFT_CLIENT_SECRET
```

---

## 3. ZERO-DOWNTIME DEPLOYMENT SEQUENCE

Deploy the built assets and worker bundle to Cloudflare:

```bash
# Deploys both frontend static assets (dist/) and the backend Worker entrypoint (worker/index.ts)
npm run cf:deploy
```

Cloudflare performs an atomic, instantaneous version cutover.

---

## 4. DATABASE MIGRATION EXECUTION (WHEN SCHEMA CHANGES OCCUR)

When a new migration file (e.g., `migrations/0017_*.sql`) is added:

```bash
# Apply migration to remote D1 production database
npx wrangler d1 execute applywise-db --remote --file=./migrations/0017_*.sql -y
```

> **Warning:** NEVER execute `DROP TABLE`, `TRUNCATE`, or destructive queries against the remote production database.
