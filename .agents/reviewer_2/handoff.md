# Independent Quality, Adversarial & Security Review Report

**Agent:** reviewer_2  
**Role:** Reviewer & Adversarial Critic  
**Date:** 2026-08-24T02:29:00+07:00  
**Scope:** Auto Script Backend Security & Architecture Remediation (M1, M2, M3)  
**Target Files:**
- `c:\Auto script\frontend\functions\api\create-portal.js`
- `c:\Auto script\frontend\functions\api\webhook.js`
- `c:\Auto script\frontend\functions\api\generate.js`
- `c:\Auto script\frontend\src\pages\Settings.jsx`
- `c:\Auto script\frontend\functions\api\__tests__\create-portal.test.js`
- `c:\Auto script\frontend\functions\api\__tests__\webhook.test.js`
- `c:\Auto script\frontend\functions\api\__tests__\generate.test.js`
- `c:\Auto script\frontend\functions\api\__tests__\scenarios.test.js`

---

## 1. Observation

### 1.1 Integrity Check & Source Code Inspection
- **Hardcoding & Facades:** No hardcoded mock values, dummy implementations, or fake response short-circuits found in any implementation source file.
- **`create-portal.js` (lines 8–35):**
  ```javascript
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, ... });
  }
  const token = authHeader.split(' ')[1];
  const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, ... });
  }
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();
  ```
- **`webhook.js` (lines 32–91):**
  - Webhook Idempotency: `supabase.from('webhook_events').insert([{ id: event.id }])` catches PostgreSQL duplicate error code `23505` and returns 200 `'Already processed'`.
  - Atomic Credit Increment: Invokes `supabase.rpc('increment_credits', { user_id: userId, amount: addCredits })` (+60 for Plus, +150 for Pro).
  - Rollback on failure: `await supabase.from('webhook_events').delete().eq('id', event.id);`
- **`generate.js` (lines 71–206):**
  - Authorization & Profile check: Lines 71–114 verify JWT, fetch profile, and return 403 if `profile.credits <= 0`.
  - Tier-gating `targetAudience`: Line 131 sets `const finalTargetAudience = (profile.tier === 'plus' || profile.tier === 'pro') ? targetAudience : null;`. Prompt construction only includes `targetAudience` if non-null.
  - Model version: Line 157 uses `model: 'gemini-3.6-flash'` strictly compliant with `GEMINI.md Rule 2`.
  - Order of Operations: Script insertion to `public.scripts` (lines 169–183) occurs *before* credit deduction. If insertion fails, function returns 500 without calling RPC.
  - Atomic Credit Deduction: Lines 186–197 call `supabaseAdmin.rpc('increment_credits', { user_id: user.id, amount: -1 })`.
- **`Settings.jsx` (lines 90–105):**
  - Extracts active session token via `supabase.auth.getSession()` and passes `Authorization: Bearer ${session.access_token}` to `/api/create-portal`. Discards client-side `customerId`.

### 1.2 Automated Test Execution & Build Output
- **Vitest Execution (`npm test` in `frontend/`):**
  ```
   RUN  v4.1.11 C:/Auto script/frontend

   ✓ functions/api/__tests__/create-portal.test.js (11 tests) 41ms
   ✓ functions/api/__tests__/webhook.test.js (11 tests) 42ms
   ✓ functions/api/__tests__/scenarios.test.js (6 tests) 45ms
   ✓ functions/api/__tests__/generate.test.js (16 tests) 59ms

   Test Files  4 passed (4)
        Tests  44 passed (44)
     Duration  419ms
  ```
- **Linter Execution (`npm run lint` / `oxlint`):**
  - Finished with 0 errors (10 preexisting style warnings in UI components).
- **Vite Build (`npm run build`):**
  - Built production bundle (`dist/index.html`, `dist/assets/index-*.js`, `dist/assets/index-*.css`) in 253ms with 0 errors.

---

## 2. Logic Chain

1. **R1 (IDOR Elimination & Auth Verification):**
   - Observation 1.1 shows `create-portal.js` requires a Bearer JWT, authenticates against Supabase Auth, and exclusively retrieves the `stripe_customer_id` associated with `user.id` from the server database.
   - Any client payload containing `customerId` is ignored.
   - Tests `T1.1` to `T1.6` in `create-portal.test.js` pass, confirming IDOR is eliminated and unauthenticated/forged tokens receive 401.

2. **R2 (Race Condition Elimination via Atomic RPC):**
   - Observation 1.1 shows both `webhook.js` and `generate.js` eliminate all Node.js in-memory credit arithmetic (`credits = current + x`) and replace them with `supabase.rpc('increment_credits', { user_id, amount })`.
   - Concurrency tests in `webhook.test.js` (T2.5) and `scenarios.test.js` (T3.1, T3.3) confirm that concurrent webhook events and generations do not overwrite each other.

3. **R3 (Order of Operations & Side-Effect Prevention):**
   - Observation 1.1 shows `generate.js` inserts into `scripts` at step 6 before calling `increment_credits` at step 7.
   - Test `T3.2` confirms that if `scripts.insert` fails, `increment_credits` is never called, and the user's credits remain unchanged.

4. **R4 (Tier Authorization for `targetAudience`):**
   - Observation 1.1 shows `generate.js` checks `profile.tier`. If `tier === 'free'`, `targetAudience` is sanitized to `null` and omitted from the Gemini AI prompt.
   - Tests `T2.1`, `T2.2`, `T2.3` confirm free tier prompts exclude `targetAudience`, while Plus/Pro prompts retain it.

5. **Compliance & Platform Rules:**
   - Model name is strictly `'gemini-3.6-flash'` (GEMINI.md Rule 2).
   - Sensitive keys (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `GEMINI_API_KEY`) remain strictly on the Cloudflare Functions backend (Domain Skill).
   - Webhook idempotency via `webhook_events` prevents double-crediting on Stripe webhook retries (Domain Skill).

---

## 3. Adversarial Review & Threat Stress-Testing

| Threat / Failure Mode | Scenario / Attack Vector | Mitigation in Code | Stress Test Status |
|---|---|---|---|
| **IDOR Attack on Billing Portal** | Malicious user passes `customerId: "cus_victim"` in POST body | Endpoint ignores body, queries DB `stripe_customer_id` for authenticated `user.id` | **PASS** (`create-portal.test.js:T1.3`) |
| **Credit Balance Race Condition** | 2 checkout webhooks arrive simultaneously for same user | Both invoke atomic database RPC `increment_credits` | **PASS** (`webhook.test.js:T2.5`) |
| **Deduction without Generation** | Database error occurs while saving script to `scripts` table | Script insert happens first; failure triggers early return 500, skipping RPC credit deduction | **PASS** (`generate.test.js:T3.2`) |
| **Feature Gating Bypass** | Free tier user injects `targetAudience: "..."` in request payload | Backend verifies DB tier; strips targetAudience if tier is `'free'` | **PASS** (`generate.test.js:T2.1`) |
| **Webhook Double Delivery** | Stripe retries same event ID due to network delay | Unique constraint on `webhook_events.id` triggers code `23505` and returns 200 'Already processed' | **PASS** (`webhook.test.js:T1.2`) |
| **Transient Webhook Failure** | Database lock timeout during webhook credit addition | Catch block deletes `event.id` from `webhook_events` and returns 500 so Stripe can retry | **PASS** (`webhook.test.js:T1.6`) |

---

## 4. Caveats

- **External Live Services in Test Runner:** The automated test harness uses high-fidelity in-memory mocking for Supabase Auth, PostgreSQL tables, Stripe SDK, and Google GenAI SDK to enable deterministic, fast execution without requiring active internet connectivity or live Stripe/Supabase test keys during CI runs.

---

## 5. Conclusion

**Verdict:** **APPROVE**

All four core security and architectural remediation requirements (R1, R2, R3, R4) are correctly implemented and fully verified:
1. IDOR in `/api/create-portal` has been eliminated with JWT authentication and server-side profile resolution.
2. Race conditions in `/api/webhook` and `/api/generate` are eliminated via atomic Supabase RPC `increment_credits`.
3. Script insertion order in `/api/generate` guarantees that failed saves do not deduct user credits.
4. Tier-based authorization in `/api/generate` prevents free-tier users from using `targetAudience`.
5. GEMINI.md model rules (`gemini-3.6-flash`) and domain skill security guidelines are 100% satisfied.
6. Build and lint checks pass cleanly; all 44 automated tests pass with 0 failures.

---

## 6. Verification Method

To independently reproduce and verify this review:
1. **Run Full Test Suite:**
   ```powershell
   cd "c:\Auto script\frontend"
   npm test
   ```
   *Expected Output:* 4 test files passed, 44 tests passed.
2. **Run Linter:**
   ```powershell
   cd "c:\Auto script\frontend"
   npm run lint
   ```
   *Expected Output:* 0 errors.
3. **Run Production Build:**
   ```powershell
   cd "c:\Auto script\frontend"
   npm run build
   ```
   *Expected Output:* Built production bundle in `dist/` with exit code 0.
4. **Inspect Source Files:**
   - `frontend/functions/api/create-portal.js`
   - `frontend/functions/api/webhook.js`
   - `frontend/functions/api/generate.js`
   - `frontend/src/pages/Settings.jsx`
