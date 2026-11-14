# AUTO-APPLY SUBSCRIPTION ENTITLEMENTS & FOUNDER PRIVILEGES

**Auditor:** SaaS Product & Subscription Reliability Team  
**Date:** November 14, 2026  

---

## 1. MONTHLY SUCCESSFUL SUBMISSION QUOTAS

| Plan Tier | Monthly Limit | Roll-Over / Reset | Quota Lock Mechanism |
|---|---|---|---|
| **FREE** | **2** submissions / month | Resets on 1st of calendar month | Transactional reservation lock |
| **PRO** | **10** submissions / month | Resets per billing cycle | Transactional reservation lock |
| **BLACK ELITE** | **20** submissions / month | Resets per billing cycle | Transactional reservation lock |
| **FOUNDER** | **Unlimited** | Permanent | Server-side allowlist verified |

---

## 2. TRANSACTIONAL RESERVATION & IDEMPOTENCY

Before attempting an automated submission, the backend:
1. Verifies `remaining_count > 0` (or `unlimited === 1`).
2. Reserves 1 credit via `auto_apply_reservations` with a unique idempotency key (`${userId}:${vacancyId}`).
3. If an application already exists for the vacancy, the duplicate submission is blocked.
4. On verified submission success: commits reservation and increments `usage_count`.
5. On failure or if user action is needed ("Needs Attention"): releases reservation and restores the quota.
