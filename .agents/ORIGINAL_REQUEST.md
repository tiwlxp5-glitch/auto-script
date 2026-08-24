# Original User Request

## 2026-08-24T02:13:12+07:00

Fix 4 critical security and architecture vulnerabilities (IDOR, Race Condition, Order of Operations, Auth bypass) in the existing Cloudflare Pages + Supabase backend APIs.

Working directory: c:/Auto script
Integrity mode: development

## Requirements

### R1. Fix IDOR in `create-portal.js`
The API `/api/create-portal` currently accepts `customerId` directly from the client. Update it to require a valid JWT `Authorization` header. Extract the `user.id`, then query the `profiles` table to safely retrieve the user's `stripe_customer_id`. Do not trust client input for the customer ID.

### R2. Fix Race Condition using RPC
The application suffers from a race condition when updating credits in `webhook.js` and `generate.js`. Update both files to stop reading the current credits and calculating the math in Node.js. Instead, use the newly created Supabase RPC function `increment_credits` to perform atomic increment/decrement operations directly in the database.

### R3. Fix Order of Operations in `generate.js`
Currently, `generate.js` deducts user credits before successfully saving the script history to the database. Reorder the logic so that the script history is inserted into the `scripts` table *first*. Only after a successful insert should the credits be deducted. If the insert fails, an error should be thrown and credits must remain untouched.

### R4. Enforce Authorization for `targetAudience` in `generate.js`
The `targetAudience` feature is a premium feature, but the backend currently accepts it without verifying the user's tier. Add a check in `generate.js` to ensure that if `profile.tier === 'free'`, the `targetAudience` parameter is explicitly ignored or cleared before calling the AI model.

## Acceptance Criteria

### Security & Integrity
- [ ] Making a POST request to `/api/create-portal` without a valid Authorization header returns a 401 error.
- [ ] Making a POST request to `/api/create-portal` with a valid token successfully creates a Stripe session for the correct user, regardless of what `customerId` is passed in the payload.
- [ ] Concurrent requests to `/api/webhook` (e.g., simulating 2 rapid checkout sessions) correctly increment the user's credits without overwriting each other (verified via RPC usage).
- [ ] If inserting into the `scripts` table in `generate.js` fails for any reason, the user's credit balance is NOT deducted.
- [ ] A 'free' tier user passing a `targetAudience` string to `/api/generate` does not have that string included in the final AI prompt.

## 2026-08-24T00:23:10Z

# Teamwork Project Prompt — Draft

> Status: Launched.
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Perform a final, comprehensive security, architecture, and logic audit on the Auto Script project, specifically focusing on the recent Cloudflare Pages API changes (`/api/*.js`). The goal is to ensure absolutely no flaws remain and the project is 100% production-ready without breaking anything.

Working directory: C:\Auto script
Integrity mode: development

## Requirements

### R1. Audit Security and Race Conditions
Review the newly implemented Supabase JWT auth, Stripe Webhook idempotency, and the `increment_credits` RPC calls in the `functions/api/` directory. Ensure there are no IDOR, bypassing mechanisms, or race conditions remaining.

### R2. Audit Logic and Order of Operations
Review `generate.js` to ensure the flow of checking credits, scraping Jina AI, generating via Gemini, saving to the database, and deducting credits is rock-solid and handles all failure states gracefully.

### R3. Audit Client-Side vs Server-Side Enforcement
Verify that premium features (like `targetAudience` and `productUrl`) are strictly enforced on the server-side based on the user's tier, and cannot be spoofed by modifying the client request.

## Acceptance Criteria

### Security & Architecture
- [ ] Confirmed that `create-portal.js` cannot be exploited using arbitrary `customerId`s (No IDOR).
- [ ] Confirmed that credit deduction and incrementing use atomic operations (RPC) and cannot be bypassed via concurrent requests.
- [ ] Confirmed that all error states in `generate.js` return appropriate HTTP status codes without leaving the database in an inconsistent state (e.g., losing a credit without getting history).
- [ ] A final Markdown report is produced detailing any remaining issues, or explicitly confirming 100% production readiness.

