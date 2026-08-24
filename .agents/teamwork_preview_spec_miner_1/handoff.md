# Specification & Schema Alignment Audit Handoff Report

**Agent**: `teamwork_preview_spec_miner_1`  
**Archetype**: Specification Miner  
**Date**: 2026-08-24  
**Target Milestone**: Track 3 (Schema, RPC & Spec Alignment)  
**Audit File**: `C:\Auto script\.agents\teamwork_preview_spec_miner_1\spec_audit.md`  

---

## 1. Observation

1. **RPC Parameter Names in PostgreSQL Migrations vs Code**:
   - `supabase/migrations/20260824000000_create_increment_credits_rpc.sql` (Line 5):
     `CREATE OR REPLACE FUNCTION increment_credits(user_id UUID, amount INT)`
   - `supabase/migrations/20260824_fix_increment_credits.sql` (Line 1):
     `CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid, p_amount int)`
   - `supabase/migrations/20260824_freemium_trial.sql` (Lines 12 & 30):
     `CREATE OR REPLACE FUNCTION public.sync_profile_credits(p_user_id UUID)`
     `CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid, p_amount int)`
   - Production backend calls in `frontend/functions/api/generate.js:201`, `webhook.js:80`, `analyze.js:59`:
     All invoke `supabase.rpc('increment_credits', { p_user_id: ..., p_amount: ... })`.
   - Production frontend calls in `frontend/src/pages/CreateScript.jsx:87`, `Settings.jsx:42`:
     Invoke `supabase.rpc('sync_profile_credits', { p_user_id: ... })`.
   - Test harness in `frontend/functions/api/__tests__/helpers/mockDb.js` (Line 108):
     `const { user_id, amount } = args;` (Destructures legacy parameter names `user_id` and `amount`).
   - Running `npm test` in `frontend/` yields 43 test failures out of 80 tests because `mockDb.js` evaluates `user_id` as `undefined` when passed `{ p_user_id, p_amount }`.

2. **Gemini Model Version Verification**:
   - `frontend/functions/api/generate.js` (Line 172): `model: 'gemini-3.6-flash'`
   - `frontend/functions/api/analyze.js` (Line 131): `model: 'gemini-3.6-flash'`
   - Global ripgrep search for deprecated models (`gemini-2.5-flash`, `gemini-1.5-pro`, `gemini-pro`) across all `.js`, `.jsx`, `.json` source files returned 0 matches.

3. **Exact String & URL Preservation**:
   - `frontend/src/pages/Pricing.jsx` (Line 11): `const PLUS_LINK = "https://buy.stripe.com/9B6fZi0454Tg7ZSf5Nbwk00";`
   - `frontend/src/pages/Pricing.jsx` (Line 12): `const PRO_LINK = "https://buy.stripe.com/3cIbJ2045adAgwoe1Jbwk01";`
   - `frontend/src/pages/Legal.jsx` (Line 66): `https://lin.ee/x0yVB1kk`
   - `frontend/functions/api/webhook.js` (Line 58): `amountPaid >= 59000` (590.00 THB in satang).

4. **Compliance & Security Vulnerabilities**:
   - `frontend/src/pages/Register.jsx` (Lines 120–122):
     `<label htmlFor="privacy">ฉันยอมรับ <a href="#">เงื่อนไขการให้บริการ (Terms of Service)</a> และ <a href="#">นโยบายความเป็นส่วนตัว (Privacy Policy)</a></label>`
     The anchor tags use `href="#"`, preventing users from reading terms before consent (violates PDPA & GDPR informed consent).
   - `frontend/functions/api/analyze.js` (Lines 144–150):
     Refund fallback executes a non-atomic `supabase.from('profiles').update({ credits: (dbProfile.credits || 0) + 1 })` in-memory read-modify-write instead of using `increment_credits` RPC.
   - `frontend/test_rpc.mjs` (Lines 3–4):
     Hardcodes live Supabase project URL and publishable key.

---

## 2. Logic Chain

1. **Rule 5 (RPC Alignment)**:
   - Observation: Database migration `20260824_fix_increment_credits.sql` changed parameter signatures from `(user_id, amount)` to `(p_user_id, p_amount)`.
   - Observation: Production APIs (`generate.js`, `webhook.js`, `analyze.js`) were updated to `{ p_user_id, p_amount }`.
   - Observation: The mock database in the test harness (`mockDb.js:108`) was not updated, still expecting `{ user_id, amount }`.
   - Deduction: When `onRequestPost` invokes `increment_credits`, `mockDb.js` receives `args = { p_user_id: '...', p_amount: -1 }`. `args.user_id` evaluates to `undefined`, triggering `Profile not found for user undefined` and returning HTTP 500. This is the root cause of the 43 failing tests in the test suite.

2. **Rule 2 (Model Version)**:
   - Observation: Both `generate.js` and `analyze.js` explicitly pass `model: 'gemini-3.6-flash'`.
   - Deduction: The application strictly complies with GEMINI.md Rule 2 and will not encounter 404 deprecation errors from older models.

3. **Rule 4 (Exact Strings)**:
   - Observation: The Stripe checkout URLs in `Pricing.jsx` match the verbatim links with exact random suffix codes (`5Nbwk00` and `e1Jbwk01`), and append `?client_reference_id=${user.id}`.
   - Deduction: Stripe webhooks will receive the correct `client_reference_id` to correlate purchases with Supabase user IDs.

4. **Rule 3 & Compliance**:
   - Observation: `Register.jsx` has dummy `href="#"` links to Legal / Privacy policies.
   - Deduction: Thai PDPA requires active and informed consent. Fixing this link to route to `/legal` is necessary to ensure SaaS legal compliance.
   - Observation: `analyze.js` has a credit refund that updates `profiles` directly instead of calling `increment_credits`.
   - Deduction: Concurrent operations during an AI scrape failure could result in lost updates unless refactored to atomic RPC.

---

## 3. Caveats

1. The audit verified that `gemini-3.6-flash` is configured in code; live runtime responses from Google Gemini API were not executed against live API keys to avoid token usage and because API keys are stored in Cloudflare environment secrets.
2. The database schema verification was conducted against the SQL migration files in `supabase/migrations/`; no live production database mutations were made.

---

## 4. Conclusion

1. **Schema & Spec Compliance Status**:
   - **Production Application Code**: 100% compliant with Rules 2, 4, and 5. RPC arguments match the latest PostgreSQL migrations (`p_user_id`, `p_amount`).
   - **Test Suite Harness**: Discrepancy identified in `mockDb.js` (legacy argument expectation), explaining 43 vitest test failures.
   - **Compliance & Security**: 3 actionable items identified (dead Legal links on registration, non-atomic refund in `analyze.js`, and hardcoded keys in `test_rpc.mjs`).

---

## 5. Verification Method

To verify these findings independently:

1. **Verify RPC Parameter Discrepancy & Test Failures**:
   ```powershell
   cd "C:\Auto script\frontend"
   npm test
   ```
   *Inspect `functions/api/__tests__/helpers/mockDb.js:108` and compare with `supabase/migrations/20260824_fix_increment_credits.sql:1`.*

2. **Verify Gemini Model Version**:
   ```powershell
   Select-String -Path "C:\Auto script\frontend\functions\api\*.js" -Pattern "model:"
   ```
   *Expected Output: `model: 'gemini-3.6-flash'` in `generate.js` and `analyze.js`.*

3. **Verify Exact Stripe URLs**:
   ```powershell
   Select-String -Path "C:\Auto script\frontend\src\pages\Pricing.jsx" -Pattern "https://buy.stripe.com"
   ```

4. **Verify Dead Privacy Links**:
   ```powershell
   Select-String -Path "C:\Auto script\frontend\src\pages\Register.jsx" -Pattern "href="
   ```
