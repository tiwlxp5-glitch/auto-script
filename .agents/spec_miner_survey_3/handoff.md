# Handoff Report: Specification Mining for 4 Critical Security Requirements

**Agent:** spec_miner_survey_3  
**Target Milestone:** survey  
**Deliverables:** `c:\Auto script\.agents\spec_miner_survey_3\survey_report.md`  
**Handoff Type:** Hard  

---

## 1. Observation

1. **R1 (`create-portal.js`):**
   - In `frontend/functions/api/create-portal.js` (lines 3-26), the endpoint extracts `const { customerId } = await request.json();` directly with zero authentication header check (`request.headers.get('Authorization')` is not called).
   - In `frontend/src/pages/Settings.jsx` (lines 91-95), the client calls `/api/create-portal` with `body: JSON.stringify({ customerId: profile.stripe_customer_id })` without passing an `Authorization: Bearer <token>` header.
   - In `frontend/functions/api/delete-account.js` (lines 6-16), a standard JWT verification pattern is used: `request.headers.get('Authorization')` -> `supabaseAdmin.auth.getUser(token)`.

2. **R2 (`webhook.js` & `generate.js` Credit Calculation):**
   - In `frontend/functions/api/webhook.js` (lines 64-81), credits are retrieved via `select('credits')`, manipulated in JS (`newCredits = currentCredits + addCredits`), and written back via `upsert`. Under concurrent deliveries, this causes lost updates.
   - In `frontend/functions/api/generate.js` (lines 150-152), credits are deducted in JS: `const newCredits = profile.credits - 1; await supabaseAdmin.from('profiles').update({ credits: newCredits }).eq('id', user.id);`.

3. **R3 (`generate.js` Order of Operations):**
   - In `frontend/functions/api/generate.js` (lines 150-161), credit deduction (`supabaseAdmin.from('profiles').update`) occurs on lines 151-152, *before* script insertion on lines 155-161 (`supabaseAdmin.from('scripts').insert`). A failure in script insertion leaves the user charged with lost credit.

4. **R4 (`generate.js` Tier Gating for `targetAudience`):**
   - In `frontend/functions/api/generate.js` (lines 85-86 & 130), `targetAudience` is extracted from request JSON and directly interpolated into `userPrompt` (`${targetAudience ? '- กลุ่มเป้าหมาย: ' + targetAudience : ''}`) without checking `profile.tier === 'free'`.

5. **Project Rules & Invariants:**
   - In `GEMINI.md` and `PROJECT_DOCUMENTATION.md`, AI model is strictly locked to `gemini-3.6-flash`.
   - `cloudflare-supabase-security` skill requires all sensitive updates to run on backend Cloudflare Functions with `SUPABASE_SERVICE_ROLE_KEY`.

---

## 2. Logic Chain

1. **R1 Elimination of IDOR & Enforcement of JWT Auth:**
   - Because `create-portal.js` lacks authentication, any caller can submit an arbitrary `customerId` to view private billing information.
   - By adopting the authentication pattern from `delete-account.js` (`supabase.auth.getUser(token)`), only authenticated users can access the endpoint.
   - By querying `profiles.stripe_customer_id` for the authenticated `user.id` and discarding client input, IDOR is completely eliminated.
   - If the user has no `stripe_customer_id`, returning HTTP 400 Bad Request prevents invalid Stripe API calls.

2. **R2 Elimination of Concurrency Race Conditions via Supabase RPC:**
   - Non-atomic Read-Modify-Write in application code suffers from race conditions when two events run concurrently on the serverless edge.
   - A PostgreSQL RPC function (`increment_credits(user_id UUID, amount INT)`) executes atomic `UPDATE profiles SET credits = COALESCE(credits, 0) + amount WHERE id = user_id`, guaranteeing serializable row-level updates.
   - `webhook.js` must call RPC with `amount: +60` (Plus) or `+150` (Pro).
   - `generate.js` must call RPC with `amount: -1`.

3. **R3 Atomicity and Data Integrity in `generate.js`:**
   - If credit deduction runs before history insertion, any DB failure in `scripts.insert` causes permanent credit loss for the end user.
   - Inverting the order so `scripts.insert` runs first ensures that if saving fails, an exception is thrown, the catch block intercepts it, `increment_credits` is never called, and the user's credit balance remains 100% untouched.

4. **R4 Enforcing Authorization on Premium Features (`targetAudience`):**
   - Client-side gating in `CreateScript.jsx` can be bypassed via direct API calls.
   - Server-side authorization must inspect `profile.tier` retrieved from the database.
   - If `profile.tier === 'free'`, setting `effectiveTargetAudience = ''` ensures that the Gemini AI prompt excludes `- กลุ่มเป้าหมาย:` regardless of payload manipulation.

---

## 3. Caveats

1. **Frontend Callers:**
   - `frontend/src/pages/Settings.jsx` must be updated during milestone implementation to send `Authorization: Bearer <session.access_token>` when calling `/api/create-portal`.
2. **Database RPC Migration:**
   - Supabase project must have the `increment_credits` function deployed or defined in test database fixtures/mocks.
3. **Coupon Pricing Edge Cases:**
   - `webhook.js` uses `amount_subtotal` to correctly distinguish tiers even when 100% discount coupons are applied; this logic must be preserved during RPC refactoring.

---

## 4. Conclusion

The specifications, HTTP API contracts, error statuses, RPC schemas, and edge cases have been exhaustively formalized and documented in `c:\Auto script\.agents\spec_miner_survey_3\survey_report.md`. All 4 security vulnerabilities are fully mapped with unambiguous acceptance criteria and verification methods.

---

## 5. Verification Method

To verify the specifications and artifacts:
1. Inspect `c:\Auto script\.agents\spec_miner_survey_3\survey_report.md` for completeness against `c:\Auto script\.agents\ORIGINAL_REQUEST.md`.
2. Check that all 4 requirements (R1, R2, R3, R4) have explicit HTTP status codes, error payload contracts, and edge cases documented.
3. Cross-reference code references against `frontend/functions/api/create-portal.js`, `webhook.js`, `generate.js`, `delete-account.js`, and `Settings.jsx`.
4. Validate that all user rules in `GEMINI.md` (gemini-3.6-flash, code explanations, exact string preservation) are upheld.
