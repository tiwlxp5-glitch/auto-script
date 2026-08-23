# BRIEFING — 2026-08-24T02:22:30Z

## Mission
Implement Milestone 2: Fix Race Condition in `frontend/functions/api/webhook.js` using Supabase atomic RPC `increment_credits` and provide the SQL migration/definition for the RPC.

## 🔒 My Identity
- Archetype: Implementer / QA / Specialist
- Roles: implementer, qa, specialist
- Working directory: c:\Auto script\.agents\worker_m2
- Original parent: e539761c-128a-4e65-b5fa-642b91d0bc21
- Milestone: M2 (Fix Race Condition in webhook.js)

## 🔒 Key Constraints
- File ownership: `frontend/functions/api/webhook.js` (Exclusive ownership) and `supabase/migrations/` / schema SQL.
- Must eliminate non-atomic JS read-modify-write (`select credits` -> `math in JS` -> `upsert with newCredits`).
- Must update/upsert `profiles` (`id`, `tier`, `stripe_customer_id`) without overwriting credits.
- Must invoke atomic Supabase RPC `increment_credits` ({ user_id: userId, amount: addCredits }) (+60 for Plus, +150 for Pro).
- Must preserve idempotency in `webhook_events` and delete event from `webhook_events` on error to allow Stripe retry.
- Must comply with User Rules in `GEMINI.md` and `cloudflare-supabase-security` skill.
- Must verify changes via build and lint.

## Current Parent
- Conversation ID: e539761c-128a-4e65-b5fa-642b91d0bc21
- Updated: 2026-08-24T02:22:30Z

## Task Summary
- **What to build**: Refactored `frontend/functions/api/webhook.js` checkout.session.completed handler to use `supabase.rpc('increment_credits', ...)`, created Supabase SQL migration for `increment_credits` RPC function.
- **Success criteria**: Webhook handler avoids race conditions, uses atomic RPC, preserves idempotency, passes build/lint.
- **Interface contracts**: `PROJECT.md` § Interface Contracts (Supabase RPC `increment_credits`, `POST /api/webhook`).
- **Code layout**: `frontend/functions/api/webhook.js`, `supabase/migrations/20260824000000_create_increment_credits_rpc.sql`.

## Key Decisions Made
- Replaced JS read-modify-write with atomic PostgreSQL function `increment_credits(user_id UUID, amount INT)`.
- Upsert profile metadata (`id`, `tier`, `stripe_customer_id`) with `{ onConflict: 'id' }` without touching `credits`.
- On database failure (either metadata upsert or credit increment RPC), delete `event.id` from `webhook_events` to preserve Stripe retry capabilities.

## Artifact Index
- `c:\Auto script\frontend\functions\api\webhook.js` — Refactored webhook handler with atomic credit increments
- `c:\Auto script\supabase\migrations\20260824000000_create_increment_credits_rpc.sql` — PostgreSQL RPC function definition
- `c:\Auto script\.agents\worker_m2\handoff.md` — Final handoff report

## Change Tracker
- **Files modified**: `frontend/functions/api/webhook.js` (Replaced non-atomic read-modify-write with atomic RPC)
- **Files created**: `supabase/migrations/20260824000000_create_increment_credits_rpc.sql` (PostgreSQL function definition)
- **Build status**: `npm run build` PASS (vite v8.2.2)
- **Pending issues**: None

## Quality Status
- **Build/test result**: `npm run build` PASSED; `npm run lint` PASSED (0 errors)
- **Lint status**: 0 errors
- **Tests added/modified**: Coordinated with test suite

## Loaded Skills
- **Source**: `c:\Auto script\.agents\skills\cloudflare-supabase-security\SKILL.md`
- **Local copy**: `c:\Auto script\.agents\worker_m2\SKILL.md`
- **Core methodology**: Enforce backend-only secrets, service role key security, webhook idempotency with `webhook_events`, atomic quota updates, restrictive security headers.
