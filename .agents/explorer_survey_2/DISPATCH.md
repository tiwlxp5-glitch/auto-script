# DISPATCH — explorer_survey_2

## Mission
Survey test infrastructure, environment configurations, dependencies, call sites, database schema/RPC definitions, and build scripts.

## Required Reading
- `c:\Auto script\.agents\ORIGINAL_REQUEST.md`
- `package.json`, test scripts, existing test files, migrations/sql files in `c:\Auto script`
- Domain skill: `c:\Auto script\.agents\skills\cloudflare-supabase-security\SKILL.md`
- User rules: `c:\Auto script\GEMINI.md`

## Instructions
1. Read `c:\Auto script\.agents\ORIGINAL_REQUEST.md`.
2. Inspect testing setup (Vitest, Jest, scripts, mocks, Supabase test fixtures, Stripe test fixtures).
3. Investigate how backend APIs are invoked, how tests are executed (commands, configs), and any existing unit/integration/e2e tests.
4. Check Supabase table definitions (`profiles`, `scripts`, etc.) and RPC definitions (`increment_credits`).
5. Output your survey report to `c:\Auto script\.agents\explorer_survey_2\survey_report.md` and write your `handoff.md`.
6. Send a completion message to the parent orchestrator with the report path.
