# Backend QA Explorer Handoff Report

**Date:** 2026-08-24  
**Agent:** Backend QA Explorer (`teamwork_preview_explorer_be_1`)  
**Parent Agent:** `parent` (`25fa285a-63ee-46c2-9d71-0b849d0c4ce0`)  
**Mission:** Deep QA exploration and vulnerability audit of Cloudflare Pages APIs (`functions/api/*`), Supabase RPCs, and external integrations (Google Gemini, Jina AI, Stripe, Supabase).

---

## 1. Observation

### 1.1 Quota Race Condition in `functions/api/generate.js`
- **Location:** `frontend/functions/api/generate.js` (Lines 108–110, 200–212)
- **Direct Code Quote:**
  ```javascript
  // Line 108:
  if (profile.credits < 1) {
    return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
  }
  ...
  // Line 201:
  const { data: updatedCredits, error: rpcError } = await supabaseAdmin.rpc('increment_credits', {
    p_user_id: user.id,
    p_amount: -1
  });
  ```
- **Finding:** Check `profile.credits < 1` is an un-locked read before invoking Gemini LLM API (Line 171). If concurrent requests arrive simultaneously, all pass the check before deduction occurs.

### 1.2 Flawed Zero-Credit Gate in `functions/api/analyze.js`
- **Location:** `frontend/functions/api/analyze.js` (Lines 59–70)
- **Direct Code Quote:**
  ```javascript
  const { data: updatedCredits, error: creditError } = await supabase.rpc('increment_credits', {
    p_user_id: user.id,
    p_amount: -1
  });
  ...
  if (updatedCredits === null || updatedCredits < 0) {
    return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  ```
- **PostgreSQL RPC Implementation (`supabase/migrations/20260824_fix_increment_credits.sql` Line 22):**
  `credits = greatest(0, coalesce(v_profile.credits, 0) + p_amount)`
- **Finding:** When `credits = 0`, `greatest(0, 0 + (-1))` returns `0`. In JavaScript, `updatedCredits` is `0`. Condition `0 === null` is false and `0 < 0` is false. The request proceeds to scrape and stream AI generation for free.

### 1.3 In-Memory Credit Update & Race Condition in `analyze.js`
- **Location:** `frontend/functions/api/analyze.js` (Lines 142–153)
- **Direct Code Quote:**
  ```javascript
  if (fullResponse.includes('<ERROR>NO_PRODUCT_FOUND</ERROR>')) {
      const { data: dbProfile } = await supabase.from('profiles').select('credits, trial_pro_remaining, tier').eq('id', user.id).single();
      if (dbProfile) {
          const shouldRestoreTrial = dbProfile.tier === 'free' && dbProfile.trial_pro_remaining < 3;
          await supabase.from('profiles').update({
              credits: (dbProfile.credits || 0) + 1,
              trial_pro_remaining: shouldRestoreTrial ? (dbProfile.trial_pro_remaining || 0) + 1 : dbProfile.trial_pro_remaining
          }).eq('id', user.id);
      }
  ```
- **Finding:** Direct in-memory addition `(dbProfile.credits || 0) + 1` with `.update()` instead of atomic RPC, violating Rule 5 and risking lost updates.

### 1.4 Unconditional Tier Upsert in `functions/api/webhook.js`
- **Location:** `frontend/functions/api/webhook.js` (Lines 55–71)
- **Direct Code Quote:**
  ```javascript
  const amountPaid = session.amount_subtotal;
  let tier = 'plus';
  let addCredits = 60;
  if (amountPaid >= 59000) {
    tier = 'pro';
    addCredits = 150;
  }
  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert({ 
      id: userId, 
      tier: tier, 
      stripe_customer_id: session.customer 
    }, { onConflict: 'id' });
  ```
- **Finding:** A Pro customer buying a smaller 60-credit pack (249 THB / 24900 satang) has `tier` unconditionally set to `'plus'`, downgrading their account.

### 1.5 Missing `client_reference_id` Silent Drop in `webhook.js`
- **Location:** `frontend/functions/api/webhook.js` (Lines 48–96)
- **Direct Code Quote:**
  ```javascript
  const session = event.data.object;
  const userId = session.client_reference_id;
  if (userId) {
    ...
  }
  return new Response(JSON.stringify({ received: true }), { status: 200 });
  ```
- **Finding:** If `client_reference_id` is null/stripped, webhook returns 200 with no credit addition and no alert, dropping the paid order silently.

### 1.6 Unbounded Jina AI Subrequests & Missing Timeout
- **Location:** `generate.js` (Lines 125–135) & `analyze.js` (Lines 83–100)
- **Direct Code Quote:**
  `const scrapedContents = await Promise.all(urlsToScrape.map(async (url) => { const jinaRes = await fetch('https://r.jina.ai/' + url, ...); }))`
- **Finding:** No array limit (exceeding Cloudflare 50 subrequests limit) and no `AbortSignal.timeout` on slow external fetches.

### 1.7 Gemini Model Compliance & Safety Parsing
- **Location:** `generate.js` (Line 172) & `analyze.js` (Line 131)
- **Direct Code Quote:** `model: 'gemini-3.6-flash'`
- **Finding:** Strictly compliant with GEMINI.md Rule 2. However, safety filter blocks leave `response.text` undefined, causing uncaught `JSON.parse` 500 crashes.

### 1.8 Test Harness Parameter Desync
- **Location:** `frontend/functions/api/__tests__/helpers/mockDb.js` (Lines 107–110)
- **Direct Code Quote:** `const { user_id, amount } = args;`
- **Finding:** Test mock uses legacy `{ user_id, amount }` instead of `{ p_user_id, p_amount }`, causing 43 automated tests to fail during `npm test`.

---

## 2. Logic Chain

1. **Premise 1 (Concurrency):** In `generate.js`, `profile.credits < 1` is evaluated before calling `ai.models.generateContent()`. Because `increment_credits` is only invoked after the AI generation finishes, concurrent requests share the same initial credit snapshot and all pass the check. Thus, a user with 1 credit can trigger $N$ simultaneous generations (Observation 1.1).
2. **Premise 2 (Zero-Credit Logic):** In `analyze.js`, PostgreSQL's `greatest(0, 0 - 1)` returns `0`. JavaScript checks `updatedCredits === null || updatedCredits < 0`. Since `0 === null` is false and `0 < 0` is false, the gate is bypassed for users with 0 credits (Observation 1.2).
3. **Premise 3 (State Desync):** In `analyze.js`, manual `.select()` and `.update()` during error refund overwrite concurrent balance increments from other transactions, causing lost updates and violating atomic RPC guarantees (Observation 1.3).
4. **Premise 4 (Payment Lifecycle):** In `webhook.js`, `tier` is determined solely by the single transaction's `amount_subtotal`. A Pro user buying a Plus top-up triggers `tier = 'plus'`, which overwrites their database tier to `plus` (Observation 1.4).
5. **Premise 5 (Payment Delivery Failure):** In `webhook.js`, when `client_reference_id` is missing, the code skips credit addition but returns HTTP 200 to Stripe, preventing Stripe from retrying and causing paid transactions to disappear (Observation 1.5).

---

## 3. Caveats

- **External Live Services:** Live external calls to Stripe API and Jina AI were audited through static code inspection, test harness execution, and architectural analysis rather than executing live financial transactions on Stripe production.
- **Client Side Coordination:** Frontend state changes in `CreateScript.jsx` and `Pricing.jsx` were examined to ensure end-to-end alignment with backend contracts.

---

## 4. Conclusion

The Cloudflare Pages backend has strong foundational elements (JWT token authentication, IDOR protection on Stripe billing portal, `gemini-3.6-flash` compliance, and atomic database increments for standard flows). 

However, **12 actionable findings** were identified across concurrency, billing logic, payment handling, and error resilience. The 2 Critical findings (TOCTOU race condition in `generate.js` and zero-credit gate bypass in `analyze.js`) and 3 High findings (tier demotion, silent payment drop, non-atomic refund) must be remediated in accordance with the detailed blueprints provided in `analysis.md` before production release.

---

## 5. Verification Method

To independently verify all findings:

1. **Verify Test Harness & Parameter Alignment:**
   - Inspect `frontend/functions/api/__tests__/helpers/mockDb.js` line 108.
   - Run `npm test` inside `c:\Auto script\frontend`. Note that 43 tests fail due to the `user_id` vs `p_user_id` parameter mismatch.
2. **Verify Quota Race Condition:**
   - Inspect `frontend/functions/api/generate.js` lines 108–110 and 200–205.
   - Trace line 108 `if (profile.credits < 1)` execution before line 171 `ai.models.generateContent` and line 201 `increment_credits`.
3. **Verify Zero-Credit Gate Bypass:**
   - Inspect `frontend/functions/api/analyze.js` lines 59–70.
   - Trace return value of `increment_credits` when starting balance is 0 (`greatest(0, -1) = 0`), and evaluate `updatedCredits === null || updatedCredits < 0` with `updatedCredits = 0`.
4. **Verify Tier Downgrade in Webhook:**
   - Inspect `frontend/functions/api/webhook.js` lines 55–70.
   - Observe that `amountPaid = 24900` sets `tier = 'plus'` and executes `upsert({ id: userId, tier: 'plus' })` without checking if existing profile tier is `'pro'`.
5. **Verify Full Report:**
   - Read full findings and step-by-step remediation blueprints in `C:\Auto script\.agents\teamwork_preview_explorer_be_1\analysis.md`.
