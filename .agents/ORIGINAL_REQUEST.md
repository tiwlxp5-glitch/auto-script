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
