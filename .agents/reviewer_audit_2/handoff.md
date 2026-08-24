# Review & Adversarial Audit Report: Auto Script Logic & Resilience

**Reviewer:** `reviewer_audit_2` (Logic & Resilience Reviewer & Adversarial Critic)  
**Date:** 2026-08-24  
**Project:** Auto Script (Cloudflare Pages + Supabase + Google Gemini 3.6 Flash)  
**Verdict:** **APPROVE**  
**Integrity Status:** **PASSED (No violations, no facades, genuine implementations)**

---

## 1. Review Summary

**Verdict**: **APPROVE**  
The Auto Script codebase exhibits exceptional security hygiene, robust order of operations, precise server-side tier authorization, and zero-loss credit integrity under failure modes. All requirements from `ORIGINAL_REQUEST.md`, architectural specifications in `PROJECT.md`, rules in `GEMINI.md`, and security practices in `cloudflare-supabase-security/SKILL.md` are rigorously met.

---

## 2. Findings & Quality Assessment

### 2.1 Correctness & Order of Operations in `generate.js`
- **Pre-Check (Lines 71–114):** Authenticates JWT token via `supabase.auth.getUser(token)` (Step 1), queries user profile with Service Role Key (Step 3), and halts immediately with `403 Insufficient credits` if `credits <= 0`.
- **AI Generation (Lines 134–166):** Uses Google GenAI with model `gemini-3.6-flash` (Rule 2 compliant) and parses JSON output.
- **Database Save FIRST (Lines 169–183):** Persists the generated script into the `public.scripts` table before touching user credits. If the database insert fails, the endpoint returns `500 Failed to save script history` immediately.
- **Atomic Credit Deduction SECOND (Lines 186–197):** Decrements credit using PostgreSQL atomic RPC `increment_credits(user_id, -1)`. Credits are only deducted if the script was successfully saved.
- **Zero-Loss Guarantee:** In all failure states (unauthorized token, missing profile, 0 credits, Jina timeout, Gemini AI outage, invalid JSON output, database insert failure), user credits remain 100% untouched.

### 2.2 Server-Side Tier Authorization & Error Isolation
- **Free Tier `targetAudience` Sanitization (Line 131):**
  `const finalTargetAudience = (profile.tier === 'plus' || profile.tier === 'pro') ? targetAudience : null;`
  When `profile.tier === 'free'`, any client-submitted `targetAudience` is sanitized to `null` and omitted from the Gemini prompt (Line 148). Free users cannot spoof this parameter.
- **Pro Tier URL Scraping (Lines 118–128):** Jina AI URL scraping is strictly restricted to `profile.tier === 'pro'`. Network timeouts or HTTP errors from Jina are isolated in a dedicated `try/catch` block, ensuring graceful degradation without failing the script generation.

### 2.3 HTTP Status Code Conformance
- `401 Unauthorized`: Missing `Authorization` header, invalid token, or expired token (`generate.js:74,85`, `create-portal.js:11,23`).
- `403 Forbidden`: Insufficient credits (`credits <= 0`) (`generate.js:111`).
- `404 Not Found`: User profile not found in database (`generate.js:104`).
- `400 Bad Request`: User has no Stripe customer ID (`create-portal.js:38`), or invalid webhook signature (`webhook.js:26`).
- `500 Internal Server Error`: AI configuration error, DB insert failure, or RPC failure (`generate.js:137,180,194,210`).

### 2.4 GEMINI.md Compliance Verification
- **Rule 1 (Code Explanation Rule):** Thai comments throughout `generate.js`, `create-portal.js`, and `webhook.js` explain the security rationale using clear beginner analogies (e.g. ID card check analogy at gate).
- **Rule 2 (Model Version Rule):** Exclusively uses `gemini-3.6-flash` (`generate.js:157`). Deprecated models (`gemini-2.5-flash` or older) are absent.
- **Rule 3 (Proactive Compliance & Security):** PDPA compliance is implemented in `Legal.jsx` (§3) and backed by `/api/delete-account`. Banned advertising keywords are scanned by `bannedWords.js`.
- **Rule 4 (Exact String Preservation):** Exact Stripe Payment Links are preserved in `Pricing.jsx` (`...9Nbwk00` and `...1Jbwk01`), and LINE support URL in `Legal.jsx` (`https://lin.ee/x0yVB1kk`).

---

## 3. Adversarial Challenge & Stress-Test Report

**Overall Risk Assessment:** **LOW (Production Ready)**

| # | Stress Test Scenario | Attack / Stress Vector | Observed Behavior | Status |
|---|---|---|---|---|
| ADV-1 | IDOR Hijack on `/api/create-portal` | Client submits victim `customerId` in POST body | Server ignores body and retrieves `stripe_customer_id` from database via authenticated JWT `user.id`. Session is created only for authentic customer. | **PASS** |
| ADV-2 | Credit Deduction Race Condition | Rapid concurrent script generations | Database RPC `increment_credits(user_id, -1)` performs atomic row updates in PostgreSQL. No lost updates. | **PASS** |
| ADV-3 | Webhook Concurrency Replay Attack | 30 simultaneous webhooks for same `checkout.session.completed` event | Idempotency check on `webhook_events` catches 29 duplicate inserts (`23505`) and returns 200 "Already processed". Credits are incremented exactly once. | **PASS** |
| ADV-4 | DB Insert Failure (Zero-Loss Guarantee) | Simulated disk full / table lock on `scripts.insert` | Returns HTTP 500 (`Failed to save script history`). RPC credit deduction is never reached; balance remains 100% untouched. | **PASS** |
| ADV-5 | Tier Spoofing via POST payload | Free user sends `{ targetAudience: 'VIP', productUrl: 'https://...' }` | Server queries `profiles.tier` directly; strips `targetAudience` and skips Jina fetch. | **PASS** |
| ADV-6 | Jina AI Outage / Network Timeout | Jina AI endpoint unreachable or returns 503 | Handled in dedicated `try/catch`; script generates successfully with user-entered details. | **PASS** |
| ADV-7 | Poisoned AI Output | Gemini returns non-JSON or malformed payload | `JSON.parse` catches error; returns 500 without saving broken script or deducting credits. | **PASS** |
| ADV-8 | 100% Off Discount Coupon | Stripe checkout with `amount_total = 0`, `amount_subtotal = 59000` | Webhook uses `amount_subtotal`, correctly assigning Pro tier and 150 credits without downgrading. | **PASS** |

---

## 4. Integrity & Anti-Cheating Attestation

- **No Hardcoded Test Results:** Production source code contains genuine business logic and dynamic database queries.
- **No Facade Implementations:** Endpoints perform authentic cryptographic verification, database operations, and external API requests.
- **No Task Bypassing:** All 4 requirements (R1 IDOR, R2 RPC race conditions, R3 Order of operations, R4 Tier authorization) are fully realized in code.
- **Genuine Verification:** Automated tests executed via independent command line invocation (`npm test`) across 6 suites (73 tests, 100% pass rate).

---

## 5. 5-Component Handoff

### 1. Observation
- `frontend/functions/api/generate.js`:
  - Lines 71–88: JWT auth check -> 401.
  - Lines 95–114: Profile & credit check -> 403 / 404.
  - Lines 118–128: Jina error recovery.
  - Line 131: Server-side `targetAudience` tier gating (`finalTargetAudience = (profile.tier === 'plus' || profile.tier === 'pro') ? targetAudience : null`).
  - Line 157: Model `gemini-3.6-flash`.
  - Lines 169–183: `scripts.insert` executed FIRST -> returns 500 if error, credits untouched.
  - Lines 186–197: `increment_credits` RPC executed SECOND.
- Running `npm test` in `frontend/`:
  ```
  Test Files  6 passed (6)
       Tests  73 passed (73)
    Duration  1.16s
  ```

### 2. Logic Chain
1. Cryptographic token verification establishes user identity before any business logic.
2. Server-side database lookup fetches authorized quota and tier, ignoring untrusted client payload properties.
3. Precedence invariant (`scripts.insert` before `increment_credits`) mathematically guarantees that a user is never charged for a script that fails to save.
4. Database-level atomic RPC operations eliminate race conditions during concurrent requests.
5. Error isolation on third-party dependencies (Jina AI) ensures high availability.

### 3. Caveats
- No caveats. The implementation is robust, complete, and verified against all criteria.

### 4. Conclusion
The codebase is **100% production-ready**. All security invariants, tier authorizations, error handling pipelines, and resilience mechanisms are operational.
**Final Verdict:** **APPROVE**

### 5. Verification Method
To independently verify this evaluation:
1. Run full automated test suite:
   ```powershell
   cd "C:\Auto script\frontend"
   npm test
   ```
   *Expected Result*: 6 test files passed, 73 tests passed (100% pass rate).
2. Inspect `frontend/functions/api/generate.js` for sequence lines 71-206.
