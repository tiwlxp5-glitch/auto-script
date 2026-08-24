# Comprehensive Specification, Schema & Alignment Audit Report

**Audit Target**: Auto Script SaaS Platform (`frontend/`, `functions/api/`, `supabase/migrations/`)  
**Auditor**: Specification & Schema Alignment Auditor (`teamwork_preview_spec_miner_1`)  
**Date**: 2026-08-24  
**Status**: COMPLETE  

---

## Executive Summary

This audit evaluates the codebase against the authoritative rules established in `GEMINI.md`, the architecture blueprints in `PROJECT.md`, the security requirements in `cloudflare-supabase-security`, and actual PostgreSQL migration scripts in `supabase/migrations/`.

### Key Audit Scorecard
| Audit Area | Specification Rule | Status | Key Findings |
|---|---|---|---|
| **Supabase RPC Alignment** | GEMINI.md Rule 5 | ⚠️ **FAIL (Test Harness Sync)** / ✅ **PASS (Production Code)** | Production code migrated to `p_user_id`/`p_amount`, but test mock (`mockDb.js`) and tests retain old `user_id`/`amount`, failing 43 tests. |
| **Database Schema Alignment** | GEMINI.md Rule 5 | ✅ **PASS (Production Schema)** / ⚠️ **WARNING (Manual Refund)** | Table columns align with migrations; `analyze.js` contains a non-atomic read-modify-write refund fallback. |
| **Gemini Model Version** | GEMINI.md Rule 2 | ✅ **PASS (100% Compliant)** | All AI generation strictly uses `gemini-3.6-flash`. Zero instances of deprecated `gemini-2.5-flash`. |
| **Exact String & URL Preservation** | GEMINI.md Rule 4 | ✅ **PASS (100% Compliant)** | Stripe payment links, portal configurations, and LINE URLs preserved verbatim down to the last character. |
| **Compliance, Security & PDPA** | GEMINI.md Rule 3 & Skill | ⚠️ **NEEDS REMEDIATION (3 Issues)** | Register page has dead link (`#`) to Legal/PDPA; Test script contains hardcoded live project keys; Jina AI unauthenticated rate limit risk. |

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Database RPC | `increment_credits` | Atomic PL/pgSQL function to increment or decrement user credits with row lock (`FOR UPDATE`) and trial tier awareness. | `p_user_id: UUID`, `p_amount: INT` | `v_new_credits: INT` | Returns PostgreSQL error if user not found; clamps credits at `GREATEST(0, ...)` | `supabase/migrations/20260824_freemium_trial.sql` |
| 2 | Database RPC | `sync_profile_credits` | Synchronizes user profile credits, executing weekly 3-credit replenishment for free tier users past 7 days. | `p_user_id: UUID` | `SETOF public.profiles` | Returns profile row | `supabase/migrations/20260824_freemium_trial.sql` |
| 3 | Backend API | `/api/generate` | Generates short-form viral e-commerce video scripts using Google Gemini `gemini-3.6-flash`. Enforces server-side tier gating, saves script history first, then atomically deducts 1 credit. | `Authorization: Bearer <JWT>`, JSON `{ productName, productDetails, pricePromo, videoLength, mode, competitor, targetAudience, productUrls }` | JSON `{ script: {...}, credits_remaining: INT }` | 401 Unauthorized, 402 Insufficient credits, 404 Profile not found, 500 Internal error | `frontend/functions/api/generate.js` |
| 4 | Backend API | `/api/analyze` | Streams product extraction and analysis by scraping up to 5 e-commerce URLs via Jina AI and summarizing with Gemini `gemini-3.6-flash`. | `Authorization: Bearer <JWT>`, JSON `{ urls: string[] }` | `text/event-stream` (Server-Sent Events) | 401 Unauthorized, 402 Insufficient credits, 403 Forbidden (Free tier without trial), 500 Internal error | `frontend/functions/api/analyze.js` |
| 5 | Backend API | `/api/create-portal` | Creates a Stripe Customer Portal session allowing subscribers to manage billing, view invoices, or change cards. Prevents IDOR by resolving customer ID exclusively from authenticated user session. | `Authorization: Bearer <JWT>` | JSON `{ url: string }` | 401 Unauthorized, 400 No customer found, 500 Internal error | `frontend/functions/api/create-portal.js` |
| 6 | Backend API | `/api/webhook` | Handles Stripe checkout completion webhooks. Enforces idempotency via `webhook_events` table (error 23505), upserts tier, and credits account via atomic RPC. | `stripe-signature` header, Stripe event payload | JSON `{ received: true }` or status 200/500 | 400 Signature failure, 500 DB error with event deletion for retry | `frontend/functions/api/webhook.js` |
| 7 | Backend API | `/api/delete-account` | Deletes user from Supabase Auth admin API, triggering cascading deletion of profiles and scripts. | `Authorization: Bearer <JWT>` | Status 200 "Account deleted" | 401 Unauthorized, 500 Delete failure | `frontend/functions/api/delete-account.js` |
| 8 | Frontend UI | Script Creator (`CreateScript.jsx`) | Form allowing users to configure script modes, length, target audience, and scrape URLs with real-time profanity and banned word scanning. | User input fields, auth session | Rendered script blocks, clipboard copy, TXT download | Displays error banners and alerts on validation failure | `frontend/src/pages/CreateScript.jsx` |
| 9 | Frontend UI | Pricing & Checkout (`Pricing.jsx`) | Displays Free, Plus (249 THB), and Pro (590 THB) tiers. Attaches `client_reference_id=${user.id}` to Stripe checkout links. | Auth session, profile state | Redirects to Stripe Checkout | Prevents checkout if unauthenticated | `frontend/src/pages/Pricing.jsx` |
| 10 | Frontend UI | Account Settings (`Settings.jsx`) | Profile management, display name update, current plan display, Stripe portal trigger, and account deletion. | Auth session, form inputs | Updates profile, redirects to portal | Displays toast notifications and confirm modals | `frontend/src/pages/Settings.jsx` |
| 11 | Frontend UI | Script History (`History.jsx`) | Lists previously generated scripts with search filtering, mode filtering, favorite toggling, and export to TXT. | User session | Filtered script cards | Empty state if no scripts found | `frontend/src/pages/History.jsx` |
| 12 | Frontend UI | Legal & Compliance (`Legal.jsx`) | Terms of service, no-refund policy, PDPA privacy declaration, and LINE Official contact. | None (static) | Rendered policy text | N/A | `frontend/src/pages/Legal.jsx` |

---

## Edge Cases Observed & Tested

| # | Feature | Input / Scenario | Observed Behavior | Specification Assessment |
|---|---|---|---|---|
| 1 | RPC Parameter Calling | Calling `supabase.rpc('increment_credits', { user_id, amount })` vs `{ p_user_id, p_amount }` | PostgREST matches exact SQL parameter names. PostgreSQL function defined with `p_user_id` and `p_amount` will reject `{ user_id, amount }` with PostgREST 404/400 parameter mismatch. | **CRITICAL SPEC ALIGNMENT**: Production code was updated to `{ p_user_id, p_amount }`, but test suite `mockDb.js` was not synced, causing all 43 vitest tests to fail. |
| 2 | Model Version Calling | Gemini API called with `model: 'gemini-3.6-flash'` | Google GenAI SDK executes prompt against `gemini-3.6-flash`. | **PASS**: 100% compliant with GEMINI.md Rule 2. |
| 3 | Exact Stripe Links | Plus checkout URL clicked | Produces `https://buy.stripe.com/9B6fZi0454Tg7ZSf5Nbwk00?client_reference_id=<uid>`. | **PASS**: String preserved verbatim down to `5Nbwk00`. |
| 4 | Exact Stripe Links | Pro checkout URL clicked | Produces `https://buy.stripe.com/3cIbJ2045adAgwoe1Jbwk01?client_reference_id=<uid>`. | **PASS**: String preserved verbatim down to `e1Jbwk01`. |
| 5 | Free Tier Weekly Credit Reset | Free tier user whose `last_free_reset` is >= 7 days ago calls `sync_profile_credits` | Function automatically resets `credits := 3` and updates `last_free_reset := now()`. | **PASS**: Handled cleanly in SQL function. |
| 6 | Jina AI URL Analysis Failure | Target URL is protected by bot shield (Shopee/TikTok) returning no meaningful content | Gemini detects absence of product and outputs `<ERROR>NO_PRODUCT_FOUND</ERROR>`. Backend refunds 1 credit. | **WARNING**: Backend refund in `analyze.js:147-150` performs manual JS read-modify-write rather than atomic RPC. |
| 7 | Profanity Input | User inputs vulgarity into `productName`, `productDetails`, `competitor`, or `targetAudience` | Frontend `containsProfanity` blocks submission with Thai error message before API call. | **PASS**: Protects AI prompt and platform integrity. |
| 8 | Unregistered User Clicking Legal Link | User on `/register` clicks "เงื่อนไขการให้บริการ" or "นโยบายความเป็นส่วนตัว" | Link has `href="#"` and scrolls to top of page without navigating to `/legal`. | **COMPLIANCE RISK**: Violates PDPA/GDPR informed consent requirements. |

---

## Detailed Rule-by-Rule Audit Findings

### 1. Rule 5: Supabase Schema & RPC Alignment Audit

#### A. Database Migration Definitions (`supabase/migrations/`)
1. **Initial RPC (`20260824000000_create_increment_credits_rpc.sql`)**:
   ```sql
   CREATE OR REPLACE FUNCTION increment_credits(user_id UUID, amount INT)
   ```
   *Parameters*: `user_id`, `amount`
2. **Fixed RPC & Freemium Trial (`20260824_fix_increment_credits.sql` & `20260824_freemium_trial.sql`)**:
   ```sql
   CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid, p_amount int)
   RETURNS int
   LANGUAGE plpgsql
   SECURITY DEFINER
   ...
   CREATE OR REPLACE FUNCTION public.sync_profile_credits(p_user_id UUID)
   RETURNS SETOF public.profiles
   ```
   *Parameters*: `p_user_id`, `p_amount`

#### B. JavaScript Invocation Alignment
- `frontend/functions/api/generate.js` (Line 201):
  ```javascript
  const { data: updatedCredits, error: rpcError } = await supabaseAdmin.rpc('increment_credits', {
    p_user_id: user.id,
    p_amount: -1
  });
  ```
  *(Aligned with migration)*
- `frontend/functions/api/webhook.js` (Line 80):
  ```javascript
  const { error: rpcError } = await supabase.rpc('increment_credits', {
    p_user_id: userId,
    p_amount: addCredits
  });
  ```
  *(Aligned with migration)*
- `frontend/functions/api/analyze.js` (Line 59):
  ```javascript
  const { data: updatedCredits, error: creditError } = await supabase.rpc('increment_credits', {
    p_user_id: user.id,
    p_amount: -1
  });
  ```
  *(Aligned with migration)*
- `frontend/src/pages/CreateScript.jsx` (Line 87):
  ```javascript
  await supabase.rpc('sync_profile_credits', { p_user_id: userId }).single();
  ```
  *(Aligned with migration)*
- `frontend/src/pages/Settings.jsx` (Line 42):
  ```javascript
  await supabase.rpc('sync_profile_credits', { p_user_id: session.user.id }).single();
  ```
  *(Aligned with migration)*

#### C. Discrepancy in Test Suite (`frontend/functions/api/__tests__/`)
In `frontend/functions/api/__tests__/helpers/mockDb.js` (Line 108):
```javascript
if (functionName === 'increment_credits') {
  const { user_id, amount } = args; // <-- BUG: Expects legacy un-prefixed user_id, amount!
  const profile = db.profiles.get(user_id);
```
Because the production code was updated to `{ p_user_id, p_amount }`, `args.user_id` is `undefined`, causing `mockDb.js` to return `Profile not found for user undefined` and causing 43 test assertions in `generate.test.js`, `webhook.test.js`, and `stress-concurrency.test.js` to fail.

**Remediation Blueprint for Test Harness**:
In `mockDb.js`, update parameter destructuring to support both or standardize on `p_user_id`/`p_amount`:
```javascript
const userId = args.p_user_id || args.user_id;
const delta = args.p_amount !== undefined ? args.p_amount : args.amount;
```
And update test expectations in `generate.test.js:289` and `webhook.test.js:124, 158` to assert `{ p_user_id, p_amount }`.

---

### 2. Rule 2: Gemini Model Version Rule Audit

- **Rule Requirement**: ALWAYS use `gemini-3.6-flash`. NEVER use `gemini-2.5-flash` or older models.
- **Production Code Check**:
  - `frontend/functions/api/generate.js` Line 172: `model: 'gemini-3.6-flash'` ✅
  - `frontend/functions/api/analyze.js` Line 131: `model: 'gemini-3.6-flash'` ✅
- **Global Search Results**:
  - Total instances of `gemini-2.5-flash` in production code: **0**
  - Total instances of `gemini-1.5-pro` in production code: **0**
  - Total instances of `gemini-pro` in production code: **0**
- **Verdict**: **100% COMPLIANT**.

---

### 3. Rule 4: Exact String & URL Preservation Rule Audit

- **Stripe Payment Links**:
  - Plus Tier: `https://buy.stripe.com/9B6fZi0454Tg7ZSf5Nbwk00` (Preserved in `Pricing.jsx:11`) ✅
  - Pro Tier: `https://buy.stripe.com/3cIbJ2045adAgwoe1Jbwk01` (Preserved in `Pricing.jsx:12`) ✅
- **Customer Reference Attachment**:
  - `Pricing.jsx:37`: `${baseLink}?client_reference_id=${user.id}` ✅
- **LINE Support Link**:
  - `Legal.jsx:66`: `https://lin.ee/x0yVB1kk` ✅
- **Stripe Price Verification**:
  - `webhook.js:58`: `amountPaid >= 59000` (590.00 THB) -> tier `pro`, credits `150`.
  - `webhook.js:55-56`: Default -> tier `plus`, credits `60`.
- **Verdict**: **100% COMPLIANT**.

---

### 4. Rule 3: Proactive Compliance, Licensing & Security Audit

#### Risk 1: Dead Legal Agreement Links on Register Page (PDPA Compliance)
- **Location**: `frontend/src/pages/Register.jsx` Lines 120–122
- **Issue**:
  ```jsx
  <label htmlFor="privacy" className="ml-2 block text-sm text-slate-600 cursor-pointer">
    ฉันยอมรับ <a href="#" className="text-blue-600 hover:underline">เงื่อนไขการให้บริการ (Terms of Service)</a> และ <a href="#" className="text-blue-600 hover:underline">นโยบายความเป็นส่วนตัว (Privacy Policy)</a>
  </label>
  ```
- **Risk**: Users cannot view the terms before consenting. Under Thai PDPA Section 19 and GDPR Article 7, consent obtained without accessible terms is legally invalid.
- **Remediation**: Change `href="#"` to `href="/legal"` or React Router `<Link to="/legal" target="_blank">`.

#### Risk 2: Hardcoded Production Credentials in Repository Test File
- **Location**: `frontend/test_rpc.mjs` Lines 3–4
- **Issue**:
  ```javascript
  const SUPABASE_URL = 'https://ieomclhmsmskxblcmxpc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_JUe3tiuvTPBFtO3ViZIVeQ_I2bihkbC';
  ```
- **Risk**: Hardcoded project URL and Supabase key in repository files. While `sb_publishable_` is intended to be public, test scripts should read from environment variables or `.env` and `.gitignore` should prevent committing scratch scripts.
- **Remediation**: Remove `frontend/test_rpc.mjs` or add `test_*.mjs` to `.gitignore`.

#### Risk 3: Non-Atomic In-Memory Credit Refund in URL Analysis
- **Location**: `frontend/functions/api/analyze.js` Lines 144–150
- **Issue**:
  ```javascript
  const { data: dbProfile } = await supabase.from('profiles').select('credits, trial_pro_remaining, tier').eq('id', user.id).single();
  if (dbProfile) {
    const shouldRestoreTrial = dbProfile.tier === 'free' && dbProfile.trial_pro_remaining < 3;
    await supabase.from('profiles').update({
      credits: (dbProfile.credits || 0) + 1,
      trial_pro_remaining: shouldRestoreTrial ? (dbProfile.trial_pro_remaining || 0) + 1 : dbProfile.trial_pro_remaining
    }).eq('id', user.id);
  }
  ```
- **Risk**: Violates the project's atomic RPC rule (Rule 5 & Skill Section 2). If another operation occurs concurrently (e.g. webhook credit top-up), this `update` will overwrite the new balance with stale data (`dbProfile.credits + 1`).
- **Remediation**: Call `supabase.rpc('increment_credits', { p_user_id: user.id, p_amount: 1 })`.

#### Risk 4: Unauthenticated Jina AI Rate Limiting
- **Location**: `frontend/functions/api/analyze.js:86` and `generate.js:126`
- **Issue**: Jina AI Reader (`https://r.jina.ai/<url>`) is called without an `Authorization: Bearer <JINA_KEY>` header.
- **Risk**: Free anonymous rate limit on Jina AI is 20 requests per minute per IP. On Cloudflare Pages, outbound IP pooling may trigger 429 Too Many Requests during high concurrent traffic.
- **Remediation**: Add optional `env.JINA_API_KEY` header support (`headers: { 'Authorization': `Bearer ${env.JINA_API_KEY}` }`) if configured.

---

## Conclusion & Action Items

1. **Test Suite Fix**: Update `mockDb.js` and vitest test files to accept `{ p_user_id, p_amount }` so the 43 failing tests pass.
2. **PDPA Link Fix**: Update `Register.jsx` to link directly to `/legal`.
3. **Atomic Refund Fix**: Refactor `analyze.js` refund to use `supabase.rpc('increment_credits')`.
4. **Security Hygiene**: Clean up `test_rpc.mjs` and ensure `.gitignore` excludes `.env` and `.env.*`.
