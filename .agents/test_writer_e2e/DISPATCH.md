# DISPATCH — test_writer_e2e

## Mission
Design and create the complete E2E opaque-box test suite (Tiers 1-4) for Auto Script backend security and architecture fixes, setup the test infrastructure/runner in `frontend/`, and publish `TEST_READY.md`.

## Required Reading
- `c:\Auto script\.agents\ORIGINAL_REQUEST.md`
- `c:\Auto script\PROJECT.md`
- `c:\Auto script\.agents\explorer_survey_2\survey_report.md`
- `c:\Auto script\.agents\spec_miner_survey_3\survey_report.md`
- User rules: `c:\Auto script\GEMINI.md`
- Domain skill: `c:\Auto script\.agents\skills\cloudflare-supabase-security\SKILL.md`

## Testing Methodology (4 Tiers)
1. **Tier 1 - Feature Coverage (>=5 per feature)**:
   - R1: `/api/create-portal` (missing token, invalid token, valid token fetches stripe_customer_id, ignores client body customerId, user without customer ID returns 400).
   - R2: `/api/webhook` (checkout.session.completed calls `increment_credits` with +60 for Plus, +150 for Pro, idempotency via webhook_events, no JS credit addition).
   - R3: `/api/generate` Order of Operations (script saved to `scripts` table before credit deduction; insert failure throws error and skips credit deduction).
   - R4: `/api/generate` Tier Authorization (Free tier strips `targetAudience` from Gemini prompt; Plus/Pro tier includes it).
2. **Tier 2 - Boundary & Corner Cases (>=5 per feature)**:
   - Malformed Authorization headers, empty strings, null values, 0 credits, negative credits, duplicate webhook delivery, rapid succession requests, database timeout/error handling.
3. **Tier 3 - Cross-Feature Combinations**:
   - Webhook top-up followed by script generation; concurrent webhook and generation credit changes; user upgrade from free to plus then generate with targetAudience.
4. **Tier 4 - Real-World Application Scenarios**:
   - End-to-end user journeys: User registers, attempts generation with 0 credits -> 403; purchases Plus via webhook -> receives 60 credits; generates script with targetAudience -> gets script, credits become 59, script history saved; opens Stripe billing portal -> gets valid portal session for own customer ID.

## Requirements
1. Setup Vitest / test runner in `frontend/` (update `package.json` with `test` script and test packages if needed).
2. Create test files in `frontend/functions/api/__tests__/` (or `frontend/tests/`).
3. Ensure tests can run via `npm test` or `npx vitest run`.
4. Create `c:\Auto script\TEST_INFRA.md` and `c:\Auto script\TEST_READY.md` following the orchestrator templates.
5. Report results in `c:\Auto script\.agents\test_writer_e2e\handoff.md` and notify the parent orchestrator.
