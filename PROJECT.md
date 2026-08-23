# Project: Auto Script Security & Architecture Remediation

## Architecture
- **Runtime Environment:** Cloudflare Pages Functions (Edge V8 runtime, pure JS request handlers `onRequestPost({ request, env })`).
- **Frontend Application:** React 19 + Vite 8 SPA (`frontend/src/`).
- **Database & Auth:** Supabase PostgreSQL with Supabase Auth (JWT Bearer authentication) and `public.profiles`, `public.scripts`, `public.webhook_events`.
- **Database RPC:** Atomic PostgreSQL function `increment_credits(user_id UUID, amount INT) RETURNS INT`.
- **External Integrations:** Stripe Billing Portal & Checkout Webhooks, Google Gemini API (`gemini-3.6-flash`), Jina AI (`r.jina.ai`).

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| F1 | `create-portal.js` JWT Auth Validation | Inspect `Authorization: Bearer <jwt>`, verify with `supabase.auth.getUser(token)`, return 401 on missing/invalid token. | M1 | ORIGINAL_REQUEST §R1 | DONE |
| F2 | `create-portal.js` IDOR Elimination | Retrieve `stripe_customer_id` from `public.profiles` for authenticated `user.id`, discard client payload `customerId`. Return 400 if user has no stripe customer. | M1 | ORIGINAL_REQUEST §R1 | DONE |
| F3 | `Settings.jsx` Authorization Header | Update `handleManageSubscription` to pass `Authorization: Bearer ${session.access_token}`. | M1 | Survey explorer_survey_1/2 | DONE |
| F4 | `webhook.js` Atomic Credit RPC | Refactor `checkout.session.completed` handler to invoke `supabase.rpc('increment_credits', { user_id, amount })` (+60 for Plus, +150 for Pro), removing JS read-modify-write. | M2 | ORIGINAL_REQUEST §R2 | DONE |
| F5 | Database RPC `increment_credits` Definition | Define atomic PostgreSQL RPC function for credit increment/decrement. | M2 | ORIGINAL_REQUEST §R2 | DONE |
| F6 | `generate.js` Script Insertion Precedence | Insert generated script into `public.scripts` table FIRST before deducting credit. If insert fails, throw error and skip credit deduction. | M3 | ORIGINAL_REQUEST §R3 | DONE |
| F7 | `generate.js` Atomic Credit Deduction | Deduct 1 credit via `supabaseAdmin.rpc('increment_credits', { user_id: user.id, amount: -1 })` only after successful script insertion. | M3 | ORIGINAL_REQUEST §R2 | DONE |
| F8 | `generate.js` `targetAudience` Tier Authorization | Check `profile.tier`. If `profile.tier === 'free'`, strip/ignore `targetAudience` from Gemini AI prompt. Only Plus/Pro tiers retain `targetAudience`. | M3 | ORIGINAL_REQUEST §R4 | DONE |
| F9 | E2E Testing Infrastructure | Setup test runner (Vitest) with mocks for Supabase, Stripe, and Google GenAI. | M-E2E | Dual Track E2E | DONE |
| F10 | Comprehensive Test Suite & Adversarial Hardening | Execute Tiers 1-4 requirement tests and Tier 5 adversarial stress testing until 100% pass. | M-Final | Final Milestone | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M-E2E | E2E Test Suite Creation | Design and build Vitest test harness and test cases covering all requirements (Tiers 1-4). Publish `TEST_READY.md`. | none | DONE |
| M1 | Fix IDOR & Missing Auth in `create-portal.js` | Update `frontend/functions/api/create-portal.js` and `frontend/src/pages/Settings.jsx`. | none | DONE |
| M2 | Fix Race Condition via RPC in `webhook.js` | Refactor `frontend/functions/api/webhook.js` and document database RPC `increment_credits`. | none | DONE |
| M3 | Fix Order of Operations & `targetAudience` Auth in `generate.js` | Reorder script insert before credit deduction, use RPC for deduction, and enforce tier check for `targetAudience` in `frontend/functions/api/generate.js`. | M2 | DONE |
| M-Final | E2E Validation & Adversarial Hardening | Verify 100% pass of E2E test suite (Tiers 1-4), then execute Phase 2 adversarial hardening (Tier 5). | M-E2E, M1, M2, M3 | DONE |

## Interface Contracts

### 1. `POST /api/create-portal`
- **Request Headers:** `Authorization: Bearer <jwt_token>` (Required)
- **Request Body:** `{}` (any `customerId` passed is ignored)
- **Responses:**
  - `200 OK`: `{ "url": "<stripe_portal_url>" }`
  - `401 Unauthorized`: `{ "error": "Unauthorized" }` or `{ "error": "Invalid token" }`
  - `400 Bad Request`: `{ "error": "No Stripe customer found for this account" }`
  - `500 Internal Server Error`: `{ "error": "<msg>" }`

### 2. Supabase RPC `increment_credits`
- **Function Signature:** `increment_credits(user_id UUID, amount INT) RETURNS INT`
- **Behavior:** `UPDATE profiles SET credits = GREATEST(0, credits + amount), updated_at = NOW() WHERE id = user_id RETURNING credits;`
- **Call in JS:** `await supabase.rpc('increment_credits', { user_id, amount })`

### 3. `POST /api/webhook`
- **Request Headers:** `Stripe-Signature: <sig>`
- **Behavior:** Idempotency via `webhook_events`, upsert tier & stripe_customer_id in `profiles`, increment credits via `increment_credits(user_id, amount)` (+60 for Plus, +150 for Pro).
- **Responses:**
  - `200 OK`: `{ "received": true }` or `Already processed`
  - `400 Bad Request`: Webhook signature verification failure
  - `500 Internal Server Error`: Database failure (deletes event from `webhook_events` for retry)

### 4. `POST /api/generate`
- **Request Headers:** `Authorization: Bearer <jwt_token>`
- **Request Body:** `{ productName, productDetails, pricePromo, videoLength, mode, competitor, targetAudience, productUrl }`
- **Behavior Pipeline:**
  1. Auth check -> 401 if invalid
  2. Profile query -> 403 if `credits <= 0`
  3. Tier check: if `profile.tier === 'free'`, clear `targetAudience`
  4. Call Gemini `gemini-3.6-flash`
  5. Insert into `scripts` table FIRST -> 500 if fails (credits NOT touched)
  6. Deduct credit via `increment_credits(user.id, -1)`
  7. Return 200 `{ script, credits_remaining }`

## Code Layout & File Ownership
- `frontend/functions/api/create-portal.js` — Owned by M1 Worker (Updated)
- `frontend/src/pages/Settings.jsx` — Owned by M1 Worker (Updated)
- `frontend/functions/api/webhook.js` — Owned by M2 Worker (Updated)
- `frontend/functions/api/generate.js` — Owned by M3 Worker (Updated)
- `frontend/functions/api/__tests__/` — Owned by E2E Test Writer / Challengers (62 tests across 5 suites)
- `supabase/migrations/20260824000000_create_increment_credits_rpc.sql` — RPC Migration
