# DISPATCH — worker_m1

## Mission
Implement Milestone 1: Fix IDOR & Missing Authentication in `create-portal.js` and update `Settings.jsx`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Required Reading
- `c:\Auto script\.agents\ORIGINAL_REQUEST.md`
- `c:\Auto script\PROJECT.md`
- `c:\Auto script\.agents\explorer_survey_1\survey_report.md`
- `c:\Auto script\.agents\spec_miner_survey_3\survey_report.md`
- User rules: `c:\Auto script\GEMINI.md`
- Domain skill: `c:\Auto script\.agents\skills\cloudflare-supabase-security\SKILL.md`

## File Ownership
- `frontend/functions/api/create-portal.js` (Exclusive ownership)
- `frontend/src/pages/Settings.jsx` (Exclusive ownership)

## Implementation Requirements
1. **`frontend/functions/api/create-portal.js`**:
   - Check `Authorization` header. If missing or not starting with `Bearer `, return 401 `{ error: 'Unauthorized' }`.
   - Extract token and authenticate via `supabase.auth.getUser(token)`. If error or no user, return 401.
   - Query `profiles` table using Supabase Admin client for `stripe_customer_id` where `id = user.id`.
   - If profile not found or `stripe_customer_id` is missing/null, return 400 `{ error: 'No Stripe customer found for this account' }`.
   - Create Stripe billing portal session using `profile.stripe_customer_id` and return `{ url: session.url }`.
   - Disregard any `customerId` passed in request payload.
2. **`frontend/src/pages/Settings.jsx`**:
   - Update `handleManageSubscription` to retrieve session access token via `supabase.auth.getSession()` and pass `Authorization: Bearer ${session.access_token}` in fetch request to `/api/create-portal`.
3. Verify build (`npm run build` in `frontend/`) and lint (`npm run lint`).
4. Output your implementation report to `c:\Auto script\.agents\worker_m1\handoff.md` and send a completion message to the parent orchestrator.
