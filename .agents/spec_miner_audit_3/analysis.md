# Infrastructure, Rate Limiting & Webhook Security Audit Report

**Target System:** Auto Script (Cloudflare Pages Functions + Google Gemini 3.6 Flash + Stripe + Supabase)  
**Project Path:** `C:\Auto script`  
**Auditor:** `spec_miner_audit_3` (Infrastructure & API Spec Miner)  
**Date:** 2026-08-25  

---

## Executive Summary

A comprehensive architectural and security audit was conducted across all Cloudflare Pages Functions (`frontend/functions/api/`), the Stripe webhook integration (`webhook.js`), security headers (`public/_headers`), and the database interaction layer.

The overall security architecture implements several strong foundational patterns:
1. **Server-Side Identity & Secret Boundary**: All sensitive API keys (`GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) are kept strictly within Cloudflare Pages Functions environment (`env`), and the client only holds anonymous Supabase credentials.
2. **Atomic Quota Management**: Credit deductions and additions use PostgreSQL stored procedures (`increment_credits`) with `FOR UPDATE` row locks, preventing race condition double-spending under normal operations.
3. **Webhook Signature & Idempotency**: Stripe webhook signature verification uses cryptographic verification (`stripe.webhooks.constructEventAsync`) and idempotency deduplication backed by `webhook_events` primary key constraints.

However, the audit identified several **critical vulnerabilities, resource exhaustion risks, and unhandled webhook flows** that must be remediated prior to full production scale:
- **VULN-01 (High - Flawed Rollback Logic)**: Double compensatory refund bug in `/api/generate` during script history insertion failures, leading to free credit creation.
- **VULN-02 (High - Rate Limiting & Bot Vulnerability)**: Complete absence of Cloudflare Turnstile bot verification and API rate limiting on `/api/generate`, exposing Google Gemini quota and Supabase database connection pool to DDoS exhaustion.
- **VULN-03 (High - Webhook Financial Leakage)**: Unhandled `charge.refunded` and `charge.dispute.created` events leave user credits and Pro tier intact after financial refunds or chargebacks.
- **VULN-04 (Medium - Unchecked Payment Status)**: Missing validation for `session.payment_status === 'paid'` in `checkout.session.completed`, allowing potential credit grant before asynchronous payment settlement.
- **VULN-05 (Medium - Partial Rollback on Multi-Version Generation)**: Outer catch block in `generate.js` hardcodes refund amount to 1 credit instead of 2 credits for multi-version failures.
- **VULN-06 (Low/Medium - CORS & Preflight OPTIONS)**: Static `Access-Control-Allow-Origin` in `_headers` blocks Cloudflare Pages preview environments (`*.pages.dev`), and API endpoints lack explicit `onRequestOptions` handling.

---

## 1. Endpoint-by-Endpoint Analysis (`frontend/functions/api/`)

### 1.1 `frontend/functions/api/generate.js`
- **Purpose**: Generates short-form video sales scripts in Thai using Google Gemini 3.6 Flash. Persists generated scripts into the `scripts` table and deducts user credits.
- **HTTP Method**: `POST`
- **Authentication**: Validates Bearer token via `supabaseClient.auth.getUser(token)` (lines 117-134).
- **Authorization & Tier Rules**:
  - Gated server-side based on `profile.tier` and `profile.trial_pro_remaining`.
  - Multi-version (`isMultiVersion: true`) strictly requires Pro tier or active Pro trial (lines 152-154).
  - Target audience field (`targetAudience`) is discarded for Free tier (line 173).
- **Credit Deduction & Rollback Flow**:
  - Deducts credit upfront via `supabaseAdmin.rpc('increment_credits', { p_user_id, p_amount: -creditAmount })` (lines 159-163).
  - Cost: 1 credit for single version, 2 credits for multi-version.
  - If deduction returns `< 0` or `null`, returns HTTP 402 `เครดิตไม่พอ` (lines 167-169).
  - Saves script into `scripts` table (lines 219-225).
  - If script insert fails:
    ```javascript
    // Lines 227-237:
    if (insertError) {
      console.error("Failed to insert script:", insertError);
      
      // ROLLBACK: Refund credits if history save fails
      await supabaseAdmin.rpc('increment_credits', {
        p_user_id: user.id,
        p_amount: creditAmount
      });
      
      throw new Error("Failed to save script history");
    }
    ```
    - **CRITICAL BUG (VULN-01)**: When `insertError` occurs, the code refunds `creditAmount` and then throws `Error("Failed to save script history")`. The outer `catch (err)` block (lines 257-263) executes:
    ```javascript
    // Lines 257-263:
    } catch (err) {
      if (creditDeducted && userIdForRefund) {
        console.error("Execution failed after deduction. Issuing compensatory refund:", err);
        try {
          await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 });
        } catch {}
      }
    ```
    Because `creditDeducted` remains `true`, the outer catch block issues a **second compensatory refund** (and hardcodes `p_amount: 1`). A user whose script insert fails receives a net +1 bonus credit instead of a net 0 change.
  - **DEFECT (VULN-05)**: If Gemini generation fails (before script insertion), the outer catch block refunds only 1 credit (`p_amount: 1`), even if the user ran a multi-version generation that deducted 2 credits (`creditAmount = 2`).

### 1.2 `frontend/functions/api/create-portal.js`
- **Purpose**: Creates a Stripe Customer Billing Portal session URL allowing users to manage payment methods, invoices, and subscriptions.
- **HTTP Method**: `POST`
- **Authentication**: Validates Bearer token via `supabaseAdmin.auth.getUser(token)` (lines 8-26).
- **IDOR Protection**: Excellent. Retrieves `stripe_customer_id` strictly from the authenticated user's database record (`profiles.id = user.id`) (lines 30-35). Any client-provided customer ID is ignored.
- **Stripe Client**: Uses `Stripe.createFetchHttpClient()` (line 46), ensuring full compatibility with Cloudflare Workers fetch-based runtime.
- **Error Behavior**: Returns 400 if user has no `stripe_customer_id` (free tier users), 401 if unauthenticated, 500 on Stripe API errors.

### 1.3 `frontend/functions/api/delete-account.js`
- **Purpose**: Implements GDPR / PDPA right-to-be-forgotten by deleting the user's Supabase Auth account.
- **HTTP Method**: `POST`
- **Authentication**: Validates Bearer token via `supabaseAdmin.auth.getUser(token)` (lines 6-20).
- **Execution**: Calls `supabaseAdmin.auth.admin.deleteUser(user.id)` (line 25).
- **Potential Gaps**:
  - Relies on database foreign keys having `ON DELETE CASCADE`. If foreign key cascade is missing, deletion will fail with PostgreSQL foreign key constraint error.
  - Does not notify Stripe to delete or anonymize customer records.

### 1.4 `frontend/functions/api/webhook.js`
- **Purpose**: Handles asynchronous Stripe webhook notifications to update tiers and grant credits.
- **HTTP Method**: `POST`
- **Signature Verification**: Validates `stripe-signature` header using `stripe.webhooks.constructEventAsync` with `STRIPE_WEBHOOK_SECRET` (lines 18-27). Returns 400 on signature failure.
- **Idempotency**:
  - Inserts `event.id` into `webhook_events` table before processing (lines 32-34).
  - If PostgreSQL returns error code `23505` (unique constraint violation), immediately returns HTTP 200 `Already processed` (lines 37-41).
  - If downstream processing fails, removes `event.id` from `webhook_events` to allow Stripe to retry (lines 73, 86, 98).
- **Event Handling**:
  - Handles `checkout.session.completed`.
  - Determines tier from `session.amount_subtotal` (59000 satang = Pro / 150 credits; 24900 satang = Plus / 60 credits).
  - Preserves user tier if existing tier is Pro (`targetTier = (currentTier === 'pro' || amountPaid >= 59000) ? 'pro' : 'plus'`).
  - Calls `increment_credits` RPC to atomically add credits.

---

## 2. Rate Limiting & Resource Exhaustion Audit

### 2.1 Concurrency & Spam Attack Simulation (/api/generate 1,000 req/sec)

| Attack Vector | Current Defense Status | Observable Behavior | Impact / Vulnerability Rating |
|---|---|---|---|
| **Single User Spam (1,000 req/s with 3 credits)** | **Protected by Atomic RPC Lock** | The first 3 requests acquire `SELECT ... FOR UPDATE` lock in PostgreSQL and deduct 1 credit each. The remaining 997 requests receive `-1` (insufficient credits) from `increment_credits` and are rejected with HTTP 402 before reaching Gemini. | **LOW RISK** for single user overspending. |
| **Distributed / Multi-Account Spam (100 accounts x 10 req/s)** | **UNPROTECTED (No Turnstile / No IP Rate Limit)** | 100 authenticated accounts with 3 free credits each send 300 simultaneous valid requests. All 300 requests pass credit deduction and concurrently invoke Google Gemini API. | **CRITICAL RISK**: Triggers Google Gemini `429 RESOURCE_EXHAUSTED`, causes global denial of service for all legitimate users. |
| **Unauthenticated / Invalid Token Flood (10,000 req/s)** | **UNPROTECTED (No Edge WAF Rate Limiting)** | Requests hit `supabaseClient.auth.getUser(token)` at lines 126-127. 10,000 req/s overwhelm Supabase Auth REST endpoint (`/auth/v1/user`). | **HIGH RISK**: Supabase Auth rate limit exhaustion and connection starvation. |
| **Cloudflare Workers CPU / Daily Request Quota** | **UNPROTECTED** | Cloudflare Pages Functions free tier allows 100k requests/day. A flood of 1,000 req/s exhausts the daily allowance in 100 seconds. | **HIGH RISK**: Cloudflare displays HTTP 1015 / Error 429 across the entire domain. |

### 2.2 Turnstile Bot Protection Analysis
- **Current State**: Cloudflare Turnstile is **NOT IMPLEMENTED**.
  - `frontend/src/pages/CreateScript.jsx` contains no `<Turnstile />` widget or token generation.
  - `frontend/functions/api/generate.js` does not accept or verify any Turnstile `cf-turnstile-response` token.
- **Consequences**:
  - Automated bots can register unlimited free accounts using disposable emails and programmatic Supabase Auth sign-ups.
  - Bots can drain the platform owner's Google Gemini API quota without human friction.

### 2.3 Supabase Connection Pool & Database Locks
- `increment_credits` uses `SELECT ... FOR UPDATE;` on `public.profiles`.
- Under high concurrency (e.g. 50 parallel requests for the same user), row locking serializes updates correctly.
- However, if 500 different users invoke `/api/generate` simultaneously, 500 simultaneous database transactions open via PostgREST. If Supabase pool size is exceeded, transactions will timeout with `canceling statement due to lock timeout` or `sorry, too many clients already`.

---

## 3. Stripe Webhook Deep Dive

### 3.1 Webhook Event Handling Matrix

| Stripe Event Type | Current Code Status | Business & Security Impact | Action Required |
|---|---|---|---|
| `checkout.session.completed` | **HANDLED** (`webhook.js:46-90`) | Correctly upgrades tier and increments credits. Handles 100% discount coupons via `amount_subtotal`. | Needs `session.payment_status === 'paid'` guard. |
| `charge.refunded` | **UNHANDLED** (Ignored, returns 200) | **CRITICAL FINANCIAL LEAK**: Customer receives full refund via Stripe dashboard, but their purchased credits (+60 or +150) and Pro tier remain active in Supabase. | Implement event handler to deduct remaining credits and reset tier to `free`. |
| `charge.dispute.created` | **UNHANDLED** (Ignored, returns 200) | **FRAUD RISK**: Chargeback filed by cardholder; Auto Script account continues to consume Gemini compute. | Freeze user account or revoke credits upon dispute. |
| `invoice.payment_succeeded` | **UNHANDLED** (Ignored, returns 200) | **SUBSCRIPTION DESYNC**: If recurring subscriptions are activated, monthly renewals will charge cardholders but fail to grant monthly credits. | Implement handler if recurring subscriptions are added. |
| `customer.subscription.deleted` | **UNHANDLED** (Ignored, returns 200) | **TIER PERSISTENCE**: If subscription is canceled, user remains in Pro/Plus tier indefinitely. | Downgrade tier to `free`. |
| `payment_intent.payment_failed` | **UNHANDLED** (Ignored, returns 200) | Async payments that fail leave no audit record. | Log failure or notify user. |

### 3.2 Unchecked `payment_status` Vulnerability
In `webhook.js` line 46:
```javascript
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const userId = session.client_reference_id;
  // ... credits granted immediately
}
```
For delayed payment methods (such as bank transfers, Boleto, or async SEPA), Stripe sends `checkout.session.completed` while `session.payment_status === 'unpaid'`. Once the bank transfer settles days later, `checkout.session.async_payment_succeeded` is sent. Granting credits immediately in `checkout.session.completed` without verifying `session.payment_status === 'paid'` allows malicious actors to initiate pending transfers and consume AI credits before canceling the bank transfer.

---

## 4. Security Headers & CORS Audit

### 4.1 Evaluation of `frontend/public/_headers`

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self' https://js.stripe.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://*.stripe.com; frame-src 'self' https://js.stripe.com https://checkout.stripe.com;
  Access-Control-Allow-Origin: https://autoscript-ai.com
```

### 4.2 Security Headers Rating & Findings

1. **Content-Security-Policy (CSP) (Score: A-)**:
   - `script-src` restricts script execution to `'self'`, Stripe JS, and Cloudflare Insights.
   - `frame-src` restricts iframes to Stripe checkout.
   - `connect-src` restricts API calls to `'self'`, Supabase (`https://*.supabase.co`), and Stripe (`https://*.stripe.com`).
   - *Improvement*: When Cloudflare Turnstile is added, `https://challenges.cloudflare.com` must be appended to `script-src` and `frame-src`.
2. **Clickjacking & MIME Protection (Score: A+)**:
   - `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` prevent framing and MIME type sniffing.
3. **HSTS (Score: A+)**:
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` enforces HTTPS for 1 full year across all subdomains.
4. **CORS & Preflight OPTIONS (Score: B)**:
   - Line 8 hardcodes `Access-Control-Allow-Origin: https://autoscript-ai.com`.
   - On Cloudflare Pages preview deployments (`https://<branch>.<project>.pages.dev`) or local development (`http://localhost:5173`), this causes cross-origin request rejections unless overridden.
   - Cloudflare Pages Functions in `frontend/functions/api/` do not export `onRequestOptions` handlers, causing HTTP 405 Method Not Allowed on cross-origin preflight requests.

---

## 5. Summary of Identified Defects & Remediation Blueprint

| ID | Component | Severity | Defect Description | Actionable Remediation Blueprint |
|---|---|---|---|---|
| **VULN-01** | `generate.js:227-263` | **HIGH** | Double Compensatory Refund on Script Save Failure | Remove the nested RPC refund inside `if (insertError)` OR set `creditDeducted = false;` immediately after the internal refund to prevent the outer `catch` block from triggering a second refund. |
| **VULN-02** | `generate.js:257-264` | **MEDIUM** | Hardcoded Single-Credit Refund in Catch Block | In the outer `catch (err)` block, refund `creditAmount` instead of hardcoded `1` (`{ p_user_id: userIdForRefund, p_amount: creditAmount }`). |
| **VULN-03** | `generate.js` | **HIGH** | Missing Rate Limiting & Turnstile Bot Guard | 1. Integrate Cloudflare Turnstile in `CreateScript.jsx` and verify token in `generate.js` via `https://challenges.cloudflare.com/turnstile/v0/siteverify`.<br>2. Configure Cloudflare WAF Rate Limiting rule (e.g. max 10 requests / 10 seconds per IP on `/api/*`). |
| **VULN-04** | `webhook.js:46-90` | **HIGH** | Unhandled `charge.refunded` & `charge.dispute.created` | Add webhook event listener for `charge.refunded` and `charge.dispute.created` to look up `stripe_customer_id`, decrement unspent credits, and downgrade tier to `free`. |
| **VULN-05** | `webhook.js:46-50` | **MEDIUM** | Unchecked `payment_status` in Checkout Session | Add `if (session.payment_status !== 'paid') { return new Response('Payment pending', { status: 200 }); }` in `checkout.session.completed`. |
| **VULN-06** | `generate.js:136-138` | **MEDIUM** | Missing Request Body Size & Length Bounds | Add string length limits (e.g. `productName.slice(0, 100)`, `productDetails.slice(0, 1000)`) to prevent prompt bloating and memory abuse. |
| **VULN-07** | `public/_headers` | **LOW** | Static Single-Origin CORS in Headers | Update `_headers` or dynamically return `Access-Control-Allow-Origin` matching allowed domains (`autoscript-ai.com`, `*.pages.dev`, `localhost`) and implement `onRequestOptions` in API functions. |
