---
name: cloudflare-supabase-security
description: >-
  Use this skill when developing new features, API endpoints, or payment flows in the Auto Script project (or similar React + Cloudflare Pages + Supabase stacks). It enforces production-grade security, secure credential handling, and Cloudflare Pages security headers.
---

# Cloudflare + Supabase Security Runbook

When building features for this architecture, you MUST adhere to the following security standards:

## 1. Secrets & API Keys Boundary
- **Frontend (Vite/React)**: NEVER use `import.meta.env.VITE_...` for sensitive keys (e.g., LLM API keys, Stripe Secret Keys, Supabase Service Role Keys). The frontend must only possess the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Backend (Cloudflare Functions)**: All interactions with 3rd-party APIs (Google Gemini, Stripe, Jina AI) must happen here. Access environment variables via the `env` object provided in the function context (e.g., `env.GEMINI_API_KEY`).

## 2. Business Logic & Credit Deduction
- NEVER trust the client to manage its own billing or quotas (e.g., `update({ credits: newCredits })` on the frontend).
- Credit deduction and sensitive database updates must be executed in Cloudflare Functions using the `SUPABASE_SERVICE_ROLE_KEY`.
- Always verify the user's identity on the backend using `supabase.auth.getUser(token)` with the JWT passed from the frontend `Authorization: Bearer <token>` header.

## 3. Webhook Idempotency
- When building or modifying webhook handlers (e.g., Stripe webhooks), you MUST enforce idempotency.
- Stripe guarantees "at least once" delivery, which can result in duplicate events.
- Implement a `webhook_events` table in Supabase. Attempt to insert the `event.id` before processing. If a unique constraint violation occurs (code `23505`), return 200 early to prevent double-crediting.

## 4. Frontend Security Headers
- Ensure the `public/_headers` file exists with restrictive policies to score an A+ on security scanners.
- If a new 3rd-party integration is added (e.g., Analytics, Pixel), you MUST remind the user to update the `Content-Security-Policy` and `Access-Control-Allow-Origin` in `public/_headers`.

## 5. Financial Integrity & Rollbacks (Auto Script Learnings)
- **Symmetrical Refunds**: If you deduct `N` credits upfront and any downstream operation fails (AI error, DB insert failure), you MUST refund exactly `N` credits in the `catch` block. Never hardcode refund amounts — always use the `creditAmount` variable.
- **Double-Refund Prevention**: After issuing a compensatory refund inside an `if (insertError)` block, immediately set a `creditDeducted = false` flag so the outer `catch` block does not issue a second refund (the bug that gave users free credits).
- **Zero-Credit Bypass Prevention**: Use `greatest(0, coalesce(credits, 0) + p_amount)` in RPC SQL BUT also explicitly return `-1` (or an error code) when `credits < Math.abs(p_amount)`. Check for this return value in Node.js and return HTTP 402 immediately.

## 6. Frontend Resilience Patterns (Auto Script Learnings)
- **ChunkLoadError Recovery**: When lazy-loading React components with `lazy()`, always wrap the importer in a `lazyWithRetry()` utility. This utility uses `sessionStorage` to track a `page-has-been-force-refreshed` flag. On first chunk failure it calls `window.location.reload()`. On second consecutive failure it throws to the ErrorBoundary (prevents infinite loops).
- **Hanging Request Prevention**: All `fetch()` calls to long-running endpoints (e.g., AI generation) MUST include an `AbortController` with a `setTimeout` of 60,000ms. In the `catch` block, check `err.name === 'AbortError'` and display a user-friendly Thai timeout message. Always call `clearTimeout(timeoutId)` in the `finally` block.

## 7. Webhook Edge Cases (Auto Script Learnings)
- **Payment Status Guard (INF-03)**: When listening to `checkout.session.completed`, ALWAYS verify `session.payment_status === 'paid'` before granting credits or upgrading tier. This prevents fraud via asynchronous payment methods (Bank Transfer, Boleto) where the session completes but money has not settled.
- **Refund & Chargeback Handlers (INF-02)**: ALWAYS implement handlers for `charge.refunded` and `charge.dispute.created`. These must: (1) look up the user by `stripe_customer_id`, (2) downgrade their tier to `free`, (3) deduct the granted credits using `increment_credits` with `Math.max(0, credits - grantedAmount)`.
- **Mock DB for Tests**: When writing tests for webhook handlers that look up users by `stripe_customer_id`, ensure the mock DB's `select().eq()` chain supports filtering by field name (not just by primary key ID).

## 8. Test Harness Integrity (Auto Script Learnings)
- **Audit Test Pattern**: "Challenger" or "Audit" tests that were originally written to PROVE a bug exists must be updated to VERIFY the fix when the bug is patched. Flip `.not.toContain()` to `.toContain()` and update expected values to reflect the correct post-fix behavior.
- **Test Payload Completeness**: When implementing new backend guards (e.g., `payment_status` check), search ALL test files for event payloads that trigger that code path and update them to include the new required fields. Use a search + regex replace script to update multiple files at once safely.
- **No Duplicate Code in Tests**: After using `replace_file_content` tool on test files, ALWAYS verify the file line count to ensure no duplicate blocks were accidentally appended. Use `node -e "require('fs').readFileSync(...)"` to inspect and trim if needed.

## 9. Data Leak Prevention (RLS)
- **The `TO` Clause Requirement**: When writing `CREATE POLICY` statements in Supabase PostgreSQL, ALWAYS specify the `TO` clause (e.g., `TO authenticated`). Omitting it defaults the policy to `PUBLIC`, which is a critical data leak allowing anonymous internet access.
- **Service Role RLS**: Do NOT create RLS policies for `service_role`. The `service_role` key natively bypasses RLS. Creating an RLS policy for `service_role` (especially without a `TO` clause) is dangerous and redundant.

## 10. Memory Exhaustion & Edge Function DoS
- **Pre-Truncation**: Cloudflare Edge Functions have strict memory and CPU limits. Never pass raw user inputs (like `request.json()`) directly into heavy synchronous processing (e.g., regex-based moderation engines).
- **Destructuring Guard**: Always use `.slice(0, MAX_LENGTH)` immediately upon destructuring the HTTP request body to protect the server from ReDoS (Regular Expression Denial of Service) and OOM (Out of Memory) attacks.

## 11. Advanced Concurrency & Access Control
- **Strict Tier Enforcement (Broken Access Control)**: When building premium features (e.g., "Pro only" modes), enforce the tier check explicitly against THAT specific mode value on the backend. Do not rely on overarching flags if the user can still bypass the tier by manually modifying the request payload.
- **Race Condition Prevention (TOC-TOU)**: NEVER read a quota value (e.g., `trial_pro_remaining`) in Node.js, calculate the deduction, and write it back using a simple `UPDATE`. This is vulnerable to concurrent double-click requests. ALWAYS use an atomic SQL RPC (e.g., `decrement_trial_quota`) for any quota or financial deduction.
- **Email Enumeration Anti-Pattern**: NEVER expose a public RPC like `check_email_exists` to the frontend for UI convenience. For password reset flows, always use the standard security UX ("If this email is in our system, a link has been sent...") to prevent attackers from scraping registered users.

