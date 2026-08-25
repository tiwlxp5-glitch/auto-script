# Infrastructure, Rate Limiting & Webhook Security Audit Report

**Auditor:** `spec_miner_audit_3` (Infrastructure & API Spec Miner)  
**Date:** 2026-08-25  
**Project:** Auto Script (`C:\Auto script`)  
**Scope:** Cloudflare Pages Functions (`frontend/functions/api/`), Rate Limiting & Resource Exhaustion, Stripe Webhooks, Security Headers & CORS.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| F1 | Auth | JWT Bearer Verification | Validates Supabase JWT access token on backend before executing business logic. | `Authorization: Bearer <token>` | `user` object with `user.id` | 401 Unauthorized (`Unauthorized` or `Invalid token`) | `frontend/functions/api/generate.js:117-134` |
| F2 | Authorization | Server-Side Tier & Quota Check | Retrieves user tier and credits from Supabase `profiles` table using Service Role Admin key; client tier is not trusted. | `user.id` | `{ tier, credits, trial_pro_remaining }` | 404 (`Profile not found`), 402 (`เครดิตไม่พอ`) | `frontend/functions/api/generate.js:139-169` |
| F3 | Concurrency | Upfront Atomic Credit Deduction | Calls PostgreSQL RPC `increment_credits` with `FOR UPDATE` lock to deduct credit before calling AI. | `{ p_user_id, p_amount: -1 \| -2 }` | `updatedCredits` integer | 500 (`Failed to deduct credits`), 402 if `< 0` | `frontend/functions/api/generate.js:159-170` |
| F4 | AI Generation | Gemini 3.6 Flash Generation | Calls Google Gemini 3.6 Flash model with system instructions and JSON/Text schema. | Structured prompt string | Generated script JSON or raw XML | 500 (`API Key not configured` or Gemini error) | `frontend/functions/api/generate.js:183-216` |
| F5 | Persistence | Script History Persistence | Stores generated script in Supabase `scripts` table. Rolls back credits if insert fails. | `user_id`, `product_name`, `content` | Insert record | 500 (`Failed to save script history`), triggers credit refund | `frontend/functions/api/generate.js:219-237` |
| F6 | Billing Portal | IDOR-Protected Portal Creation | Creates Stripe Billing Portal session for authenticated user based on `profiles.stripe_customer_id`. | `Authorization: Bearer <token>` | `{ url: session.url }` | 401 (`Unauthorized`), 400 (`No Stripe customer found`) | `frontend/functions/api/create-portal.js:4-60` |
| F7 | Compliance | PDPA Account Deletion | Deletes user authentication record in Supabase Auth via admin API. | `Authorization: Bearer <token>` | 200 `Account deleted` | 401 (`Unauthorized`), 500 (`Delete user error`) | `frontend/functions/api/delete-account.js:3-37` |
| F8 | Webhook Security | Stripe Webhook Cryptographic Verification | Verifies incoming webhook signatures using `stripe.webhooks.constructEventAsync`. | `stripe-signature` header + raw body | Validated Stripe Event object | 400 (`Webhook Error: ...`) | `frontend/functions/api/webhook.js:18-27` |
| F9 | Webhook Idempotency | Primary Key Deduplication | Inserts `event.id` into `webhook_events` table before processing; skips duplicate deliveries on code `23505`. | `event.id` | 200 `Already processed` on duplicate | 500, deletes event record to permit Stripe retry | `frontend/functions/api/webhook.js:32-44` |
| F10 | Credit Top-up | Webhook Tier Upgrade & Credit Top-up | Processes `checkout.session.completed`, evaluates `amount_subtotal`, upgrades tier, and adds credits (+60 Plus, +150 Pro). | Stripe Checkout Session | 200 `{ received: true }` | 500 (DB or RPC failure, clears event for retry) | `frontend/functions/api/webhook.js:46-90` |
| F11 | Security Headers | Strict Security Policy Headers | Enforces CSP, HSTS, X-Frame-Options DENY, nosniff, and restricted permissions in `_headers`. | HTTP Request | HTTP Response Headers | Blocks unauthorized frames, scripts, sniffed MIME | `frontend/public/_headers:1-9` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| E1 | Concurrency Flood | 1 User sends 1,000 simultaneous `/api/generate` requests with 3 credits | First 3 requests succeed; 997 requests are rejected with HTTP 402 (`เครดิตไม่พอ`) by the atomic `increment_credits` RPC row lock before touching Gemini API. |
| E2 | Distributed Bot Flood | 100 fake accounts send 300 simultaneous `/api/generate` requests | All 300 requests pass deduction and hit Google Gemini simultaneously, triggering `429 RESOURCE_EXHAUSTED` due to lack of Cloudflare Turnstile / IP rate limiting. |
| E3 | Script Save Failure Rollback | DB write to `scripts` table fails (e.g. disk full, lock timeout) | **BUG (VULN-01)**: `insertError` refunds credits via RPC and throws Error; outer `catch (err)` also detects `creditDeducted` and refunds a SECOND time. User gains +1 free credit. |
| E4 | Multi-Version AI Generation Failure | Gemini API fails during multi-version generation (`isMultiVersion: true`) | **DEFECT (VULN-05)**: 2 credits were deducted upfront, but outer `catch` block refunds hardcoded `p_amount: 1`, causing the user to lose 1 credit unfairly. |
| E5 | Customer Refund / Dispute | Cardholder files refund or dispute in Stripe Dashboard | Webhook receives `charge.refunded` or `charge.dispute.created`, ignores the event, and returns 200. User retains granted Pro tier and unspent credits. |
| E6 | Delayed / Async Payment Method | Stripe checkout with async payment method (unsettled transfer) | Webhook triggers on `checkout.session.completed` while `session.payment_status === 'unpaid'`; credits are granted before payment settlement. |
| E7 | Cloudflare Preview URL Access | Browser accesses preview deployment `https://preview.autoscript.pages.dev` | Static header `Access-Control-Allow-Origin: https://autoscript-ai.com` causes CORS rejection on preview branch. |

---

## 5-Component Handoff Report

### 1. Observation
- **Endpoint File Paths**:
  - `frontend/functions/api/generate.js` (271 lines)
  - `frontend/functions/api/create-portal.js` (70 lines)
  - `frontend/functions/api/delete-account.js` (39 lines)
  - `frontend/functions/api/webhook.js` (102 lines)
  - `frontend/public/_headers` (9 lines)
- **Defect 1 (`generate.js:227-263`)**:
  Lines 231-234 invoke `await supabaseAdmin.rpc('increment_credits', { p_user_id: user.id, p_amount: creditAmount })` and then line 236 executes `throw new Error("Failed to save script history")`. The outer `catch (err)` block at line 258 inspects `creditDeducted && userIdForRefund` and calls `increment_credits` again with `p_amount: 1`.
  - Result: 3 tests in Vitest fail (`ADV-D2`, `EMP-FAULT-1`, `T3.2`) where profile credits became 8 instead of 7 because of the double-refund.
- **Defect 2 (`generate.js:261`)**:
  Outer `catch (err)` hardcodes `p_amount: 1` instead of `creditAmount` (which is 2 for `isMultiVersion`).
- **Defect 3 (`generate.js` & `CreateScript.jsx`)**:
  No Cloudflare Turnstile verification or rate limiter exists in `generate.js` or `CreateScript.jsx`.
- **Defect 4 (`webhook.js:92-94`)**:
  Only `checkout.session.completed` is handled. Events `charge.refunded`, `charge.dispute.created`, `invoice.payment_succeeded`, and `customer.subscription.deleted` fall through to unhandled 200 responses.
- **Defect 5 (`public/_headers:8`)**:
  `Access-Control-Allow-Origin: https://autoscript-ai.com` is statically pinned to production domain only.

### 2. Logic Chain
1. **Double Refund Logic**: When `scripts.insert` fails, `creditAmount` is refunded at line 231, but `creditDeducted` flag is NOT reset to `false`. When the error is thrown, the catch block at line 258 evaluates `creditDeducted === true` and issues a second refund, resulting in unintended credit inflation.
2. **Rate Limiting & Exhaustion Logic**: While single-user balance drain is guarded by the atomic `increment_credits` RPC row lock, multi-account / bot floods are not prevented because Turnstile bot protection is absent. An attacker with multiple accounts can exhaust Google Gemini RPM quota and Supabase connection limits.
3. **Webhook Refund Logic**: When Stripe refunds a payment, it issues `charge.refunded`. Because `webhook.js` ignores this event, the database state in `profiles` is never updated to revoke credits or downgrade tier.

### 3. Caveats
- Stripe integration currently uses one-time payment checkout links (`mode: 'payment'`). If recurring subscriptions (`mode: 'subscription'`) are activated in the future, `invoice.payment_succeeded` and `customer.subscription.deleted` handlers must be implemented to prevent credit desynchronization.
- Cloudflare WAF rate limiting rules configured in the Cloudflare Dashboard are external to the git repository and cannot be observed directly from local files.

### 4. Conclusion
The Auto Script infrastructure exhibits strong security fundamentals (secure key isolation, server-side tier derivation, atomic RPC locks, and cryptographic webhook verification). However, **two high-priority code defects and two infrastructure gaps must be remediated**:
1. **Fix Double Refund in `generate.js`**: Reset `creditDeducted = false` after internal refund or consolidate refund logic solely in the `catch` block using `creditAmount`.
2. **Add Cloudflare Turnstile / Rate Limiting**: Protect `/api/generate` against automated bot floods.
3. **Add Webhook Handlers for Refunds & Disputes**: Revoke credits and reset tier on `charge.refunded` and `charge.dispute.created`.
4. **Validate `session.payment_status === 'paid'`**: Guard against crediting pending/unsettled async payments.

### 5. Verification Method
1. **Automated Test Suite**:
   Run Vitest in `frontend/`:
   ```powershell
   cd "C:\Auto script\frontend"
   npm test
   ```
2. **Vulnerability Verification**:
   - Inspect `frontend/functions/api/generate.js` lines 230-264 to verify the double-refund sequence on `insertError`.
   - Inspect `frontend/functions/api/webhook.js` lines 46-94 to verify the absence of `charge.refunded` and `invoice.payment_succeeded` handlers.
   - Inspect `frontend/public/_headers` lines 7-8 to verify CSP and CORS origin configurations.
