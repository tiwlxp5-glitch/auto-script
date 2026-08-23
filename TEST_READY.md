# TEST_READY: Backend Security & Architecture Remediation Test Suite

**Date:** 2026-08-24  
**Status:** READY (All 44 automated tests passing)  
**Test Framework:** Vitest (Node ESM runner)  
**Execution Command:** `cd frontend && npm test`

---

## 1. Executive Summary
The end-to-end and integration test harness for the Auto Script backend architecture has been constructed, validated, and published. The test suite covers all 4 critical security and architectural requirements across four testing tiers (Tiers 1–4), with 44 automated tests verifying endpoint integrity, concurrency resistance, execution order, and tier-based authorization.

---

## 2. Test Suite Summary Matrix

| Test File | Target Endpoint / Scope | Requirement | Test Count | Pass / Fail |
|---|---|---|---|---|
| `frontend/functions/api/__tests__/create-portal.test.js` | `POST /api/create-portal` | **R1:** IDOR Elimination & JWT Bearer Authentication | 11 | 11 / 0 PASS |
| `frontend/functions/api/__tests__/webhook.test.js` | `POST /api/webhook` | **R2:** Atomic Credit RPC (`increment_credits`) & Idempotency (`webhook_events`) | 11 | 11 / 0 PASS |
| `frontend/functions/api/__tests__/generate.test.js` | `POST /api/generate` | **R2, R3, R4:** Order of Operations (`scripts.insert` first), Atomic deduction (-1), Tier Authorization (`targetAudience`), Gemini 3.6 Flash | 16 | 16 / 0 PASS |
| `frontend/functions/api/__tests__/scenarios.test.js` | Cross-Endpoint Workflows | **Tiers 3 & 4:** Top-up & Generation cycle, Tier upgrade flow, Webhook replay, Full User Lifecycles | 6 | 6 / 0 PASS |
| **Total** | | **All Requirements (Tiers 1–4)** | **44** | **44 / 0 PASS** |

---

## 3. Requirement Verification & Acceptance Mapping

### R1: Fix IDOR in `create-portal.js`
- [x] **Missing / Invalid Auth:** POST without `Authorization` or with invalid JWT returns `401 Unauthorized`.
- [x] **IDOR Protection:** POST with `{ customerId: "cus_attacker" }` discards client payload and queries `profiles.stripe_customer_id` for authenticated `user.id`.
- [x] **No Customer Record:** User with null/empty `stripe_customer_id` in database returns `400 Bad Request`.
- [x] **Portal Session Creation:** Valid authenticated user receives 200 with `{ "url": "https://billing.stripe.com/p/session/..." }`.

### R2: Fix Race Condition using Supabase RPC (`webhook.js` & `generate.js`)
- [x] **Webhook Credit Addition:** `checkout.session.completed` invokes `supabase.rpc('increment_credits', { user_id, amount: 60 })` for Plus and `150` for Pro.
- [x] **No JS Read-Modify-Write:** Credits are not calculated in Node.js memory (`select credits` -> `math` -> `upsert`), preventing lost updates under concurrency.
- [x] **Webhook Idempotency:** Duplicate delivery of identical `event.id` encounters unique constraint code `23505` and returns 200 `'Already processed'`.
- [x] **Generate Credit Deduction:** Script generation invokes `supabaseAdmin.rpc('increment_credits', { user_id, amount: -1 })` after saving the script.

### R3: Fix Order of Operations in `generate.js`
- [x] **Precedence Verification:** Generated script is inserted into `public.scripts` table *before* credit deduction is invoked.
- [x] **Failure Guarantee:** If `scripts.insert()` fails or throws an exception, `increment_credits` is NEVER called, and the user's credit balance remains 100% untouched.

### R4: Enforce Authorization for `targetAudience` in `generate.js`
- [x] **Free Tier Prompt Sanitization:** If `profile.tier === 'free'`, any client-supplied `targetAudience` is stripped/ignored and NOT included in the Google Gemini prompt.
- [x] **Plus / Pro Tier Retention:** If `profile.tier === 'plus'` or `'pro'`, `targetAudience` is included in the Gemini prompt under `- กลุ่มเป้าหมาย: <audience>`.

### Platform & Compliance Rules (GEMINI.md & SKILL.md)
- [x] **GEMINI.md Rule 2:** AI model parameter is strictly verified to be `'gemini-3.6-flash'`.
- [x] **Domain Skill:** Webhook failure deletes event ID from `webhook_events` for retry; all credit operations occur on backend with service role.

---

## 4. Verification Output
```
 RUN  v4.1.11 C:/Auto script/frontend

 ✓ functions/api/__tests__/create-portal.test.js (11 tests) 43ms
 ✓ functions/api/__tests__/generate.test.js (16 tests) 45ms
 ✓ functions/api/__tests__/webhook.test.js (11 tests) 48ms
 ✓ functions/api/__tests__/scenarios.test.js (6 tests) 52ms

 Test Files  4 passed (4)
      Tests  44 passed (44)
   Duration  422ms
```

---

## 5. Next Steps
The test harness is complete and active. All milestone workers and final verification agents can run `npm test` at any time to validate ongoing changes.
