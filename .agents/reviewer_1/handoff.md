# Handoff Report — reviewer_1

**Review Verdict**: **APPROVE**  
**Integrity Status**: **CLEAN (0 Integrity Violations)**  
**Date**: 2026-08-24T02:29:30Z  
**Author**: reviewer_1 (Reviewer & Adversarial Critic)

---

## 1. Observation

### 1.1 Source Code Inspections

1. **`frontend/functions/api/create-portal.js`** (Lines 8-41, 51-54):
   - **Authorization Validation:** Inspects `request.headers.get('Authorization')` for `Bearer ` prefix (lines 8-14). Validates JWT token via `supabaseAdmin.auth.getUser(token)` (lines 20-26).
   - **IDOR Elimination:** Ignores any request body `customerId`. Selects `stripe_customer_id` strictly from `profiles` table matching `user.id` (lines 30-34):
     ```javascript
     const { data: profile, error: profileError } = await supabaseAdmin
       .from('profiles')
       .select('stripe_customer_id')
       .eq('id', user.id)
       .single();
     ```
   - If `stripe_customer_id` is missing/null, returns 400 with `{ "error": "No Stripe customer found for this account" }` (lines 36-41).
   - Creates Stripe billing portal session using `profile.stripe_customer_id` (line 52).

2. **`frontend/src/pages/Settings.jsx`** (Lines 91-105):
   - In `handleManageSubscription`, retrieves session from `supabase.auth.getSession()` and adds header `'Authorization': 'Bearer ' + session.access_token` to `fetch('/api/create-portal')` (lines 101-104).

3. **`frontend/functions/api/webhook.js`** (Lines 31-45, 63-91):
   - **Idempotency Check:** Attempts insert to `webhook_events` with `[{ id: event.id }]` (lines 32-34). Catches PostgreSQL error code `23505` (unique violation) and immediately returns `200` `'Already processed'` (lines 37-40).
   - **Plan Calculation:** Uses `session.amount_subtotal` (protecting against 100% coupon edge cases) where `>= 59000` assigns `'pro'` (+150 credits) and `< 59000` assigns `'plus'` (+60 credits) (lines 53-61).
   - **Profiles Upsert:** Upserts `tier` and `stripe_customer_id` into `profiles` without modifying `credits` (lines 64-70).
   - **Atomic Credit RPC:** Calls `supabase.rpc('increment_credits', { user_id: userId, amount: addCredits })` (lines 80-83), avoiding any in-memory read-modify-write.
   - **Fault Recovery:** On upsert or RPC error, deletes `event.id` from `webhook_events` to allow Stripe webhook retry (lines 75, 88, 100).

4. **`frontend/functions/api/generate.js`** (Lines 71-88, 131, 156-163, 169-197):
   - **JWT Auth & Profile Check:** Validates JWT Bearer token via `supabaseClient.auth.getUser(token)` (lines 79-88). Queries `profiles` for `credits, tier` and enforces `profile.credits <= 0` -> 403 Forbidden (lines 96-114).
   - **R4 Tier Authorization for `targetAudience`:** 
     ```javascript
     const finalTargetAudience = (profile.tier === 'plus' || profile.tier === 'pro') ? targetAudience : null;
     ```
     Free tier users have `finalTargetAudience` set to `null`, completely omitting `- กลุ่มเป้าหมาย:` from the Gemini prompt (lines 148, 131).
   - **Model Compliance (GEMINI.md Rule 2):** Explicitly calls `@google/genai` with `model: 'gemini-3.6-flash'` (line 157).
   - **R3 Order of Operations (Insert First, Deduct Second):** Inserts generated script into `scripts` table FIRST (lines 169-175). If `insertError` occurs, returns 500 error and exits immediately (lines 177-183) — credit deduction is never reached.
   - **R2 Atomic Credit Deduction:** After successful insert, executes `supabaseAdmin.rpc('increment_credits', { user_id: user.id, amount: -1 })` (lines 186-189).

### 1.2 Automated Test & Build Execution Outputs

- **Vitest Test Suite (`npm test` in `frontend/`):**
  - Ran 5 test files with 59 test cases covering Tiers 1–5:
    - `create-portal.test.js` (11 tests) — PASS
    - `webhook.test.js` (11 tests) — PASS
    - `generate.test.js` (16 tests) — PASS
    - `scenarios.test.js` (6 tests) — PASS
    - `adversarial.test.js` (15 tests) — PASS
  - **Result:** `59 passed (59)` in 464ms.
- **Linter (`npm run lint` / Oxlint):**
  - 0 errors, 10 pre-existing warnings in UI files.
- **Production Build (`npm run build` / Vite):**
  - Output: `dist/index.html` (0.84 kB), `dist/assets/index-DJKNa68B.css` (43.63 kB), `dist/assets/index-BkfPJo96.js` (530.73 kB).
  - **Result:** Build succeeded with exit code 0 in 338ms.

### 1.3 Adversarial Audit & Integrity Checks

- **Integrity Violations Check:**
  - Hardcoded test outputs in source files: None.
  - Dummy / facade logic: None. All handlers interact with database, stripe, and AI clients dynamically.
  - Verification cheating: None. All Vitest tests exercise mock database state machines with real state tracking.
- **Edge Cases & Invariants Tested:**
  - IDOR injection payload in body/query (`customerId: "cus_attacker"`) -> Safely discarded; uses authenticated user's DB profile.
  - Webhook concurrency & duplicate replay -> Handled atomically via PostgreSQL RPC and `webhook_events` `23505` constraint.
  - Network / DB fault during script insert -> 0 credits lost; user credit balance guaranteed intact.
  - Input smuggling in `targetAudience` by Free tier -> Blocked and sanitized; prompt template excludes field.
  - Stripe 100% discount coupon (`amount_total = 0`, `amount_subtotal = 59000`) -> Accurately resolves to Pro tier (+150 credits).

---

## 2. Logic Chain

1. **R1 Resolution:** Observation 1.1.1 and 1.1.2 show that `create-portal.js` and `Settings.jsx` enforce Bearer JWT authentication, query the user profile directly for `stripe_customer_id`, and completely ignore user-submitted `customerId`. This eliminates the IDOR vulnerability.
2. **R2 Resolution:** Observation 1.1.3 and 1.1.4 show that credit additions in `webhook.js` and credit deductions in `generate.js` use `increment_credits` RPC. This offloads math and locking to PostgreSQL, preventing concurrent lost updates.
3. **R3 Resolution:** Observation 1.1.4 shows that `generate.js` records the script in `scripts` table before invoking credit deduction. If the script insert fails, the function returns 500 without deducting credits, satisfying the order of operations invariant.
4. **R4 Resolution:** Observation 1.1.4 shows that `targetAudience` is conditioned on `profile.tier === 'plus' || profile.tier === 'pro'`. For free tier, it evaluates to `null` and is excluded from the Gemini prompt template.
5. **Platform Rules Compliance:** Observation 1.1.4 confirms `gemini-3.6-flash` is used (Rule 2). Detailed Thai code explanations with analogies are included in all modified files (Rule 1). Strict secret separation and webhook idempotency conform to domain skill and Rule 3.
6. **Reliability & Build Conformance:** Observation 1.2 shows 59/59 automated tests passing across 5 test suites, 0 lint errors, and successful production compilation.

---

## 3. Caveats

- **No caveats.** The implementation thoroughly covers all 4 requirements (R1-R4), all testing tiers (Tiers 1-5), and all project-specific rules in `GEMINI.md` and `PROJECT.md`.

---

## 4. Conclusion

The remediation across `create-portal.js`, `webhook.js`, `generate.js`, and `Settings.jsx` is complete, robust, secure, and compliant with all project constraints.

**Review Verdict:** **APPROVE**

---

## 5. Verification Method

To independently reproduce and verify this review:

1. Run automated test suite:
   ```bash
   cd "c:\Auto script\frontend"
   npm test
   ```
   *Expected:* 5 test files, 59 tests passing.

2. Run linter:
   ```bash
   cd "c:\Auto script\frontend"
   npm run lint
   ```
   *Expected:* 0 errors.

3. Run production build:
   ```bash
   cd "c:\Auto script\frontend"
   npm run build
   ```
   *Expected:* Vite build completed successfully without errors.

4. Inspect source files:
   - `c:\Auto script\frontend\functions\api\create-portal.js`
   - `c:\Auto script\frontend\functions\api\webhook.js`
   - `c:\Auto script\frontend\functions\api\generate.js`
   - `c:\Auto script\frontend\src\pages\Settings.jsx`
