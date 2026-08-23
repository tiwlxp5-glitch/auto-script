# DISPATCH — spec_miner_survey_3

## Mission
Extract and formalize precise specifications, constraints, security requirements, and acceptance criteria for the 4 critical security vulnerabilities.

## Required Reading
- `c:\Auto script\.agents\ORIGINAL_REQUEST.md`
- Codebase APIs (`api/create-portal.js`, `api/webhook.js`, `api/generate.js`)
- Domain skill: `c:\Auto script\.agents\skills\cloudflare-supabase-security\SKILL.md`
- User rules: `c:\Auto script\GEMINI.md`

## Instructions
1. Read `c:\Auto script\.agents\ORIGINAL_REQUEST.md`.
2. Formulate formal specifications for:
   - R1: `/api/create-portal` JWT auth validation, user.id extraction, `profiles` lookup for `stripe_customer_id`, error codes (401 if missing/invalid auth), ignoring client `customerId`.
   - R2: `increment_credits` Supabase RPC usage in `webhook.js` and `generate.js` for atomic credit increments/decrements, preventing race conditions.
   - R3: `generate.js` order of operations: insert into `scripts` table first, only deduct credits upon success; if insert fails, throw error and do NOT deduct credits.
   - R4: `generate.js` `targetAudience` tier authorization: if `profile.tier === 'free'`, ignore or clear `targetAudience` before calling AI model.
3. Define edge cases, error responses, HTTP status codes, and verification criteria for every requirement.
4. Output your formal spec report to `c:\Auto script\.agents\spec_miner_survey_3\survey_report.md` and write your `handoff.md`.
5. Send a completion message to the parent orchestrator with the report path.

## 2026-08-23T19:15:25Z
You are spec_miner_survey_3.
Working directory: c:\Auto script\.agents\spec_miner_survey_3
Project root: c:\Auto script
Authoritative user request: c:\Auto script\.agents\ORIGINAL_REQUEST.md
Domain skill: c:\Auto script\.agents\skills\cloudflare-supabase-security\SKILL.md
User rules: c:\Auto script\GEMINI.md

Please read c:\Auto script\.agents\spec_miner_survey_3\DISPATCH.md and c:\Auto script\.agents\ORIGINAL_REQUEST.md.
Extract precise specifications, acceptance criteria, HTTP contracts, and edge cases for the 4 critical security requirements, and output your report to c:\Auto script\.agents\spec_miner_survey_3\survey_report.md.
Deliver handoff.md in your working directory and notify the parent orchestrator via send_message when complete.

