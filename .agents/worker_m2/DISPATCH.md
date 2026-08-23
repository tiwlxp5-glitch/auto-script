# DISPATCH — worker_m2

## Mission
Implement Milestone 2: Fix Race Condition in `webhook.js` using atomic Supabase RPC `increment_credits`.

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
- `frontend/functions/api/webhook.js` (Exclusive ownership)
- `supabase/migrations/` or schema docs if creating SQL migration for `increment_credits` RPC (Exclusive ownership)

## Implementation Requirements
1. **`frontend/functions/api/webhook.js`**:
   - Refactor the `checkout.session.completed` handler.
   - Remove the non-atomic JS read-modify-write (`select credits` -> `newCredits = currentCredits + addCredits` -> `upsert with newCredits`).
   - Upsert/update `profiles` with `id: userId`, `tier: tier`, and `stripe_customer_id: session.customer` without overwriting credits.
   - Invoke Supabase atomic RPC: `supabase.rpc('increment_credits', { user_id: userId, amount: addCredits })` (+60 for Plus, +150 for Pro).
   - If either DB operation fails, log error, delete `event.id` from `webhook_events` to preserve Stripe retry capabilities, and return 500.
2. Verify build (`npm run build` in `frontend/`) and lint (`npm run lint`).
3. Output your implementation report to `c:\Auto script\.agents\worker_m2\handoff.md` and send a completion message to the parent orchestrator.
