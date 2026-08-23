# DISPATCH — reviewer_2

## Mission
Perform an independent, objective review and security audit of all backend changes in Auto Script across M1, M2, and M3.

## Required Reading
- `c:\Auto script\.agents\ORIGINAL_REQUEST.md`
- `c:\Auto script\PROJECT.md`
- `c:\Auto script\TEST_READY.md`
- Modified source files:
  - `c:\Auto script\frontend\functions\api\create-portal.js`
  - `c:\Auto script\frontend\functions\api\webhook.js`
  - `c:\Auto script\frontend\functions\api\generate.js`
  - `c:\Auto script\frontend\src\pages\Settings.jsx`
- User rules: `c:\Auto script\GEMINI.md`
- Domain skill: `c:\Auto script\.agents\skills\cloudflare-supabase-security\SKILL.md`

## Review Focus
1. Architecture, interface contracts, error responses, and side-effect avoidance.
2. Security boundary verification (Service Role usage on backend only, no leak to client).
3. Concurrency safety of `increment_credits` RPC vs legacy in-memory math.
4. Run verification tests (`npm test` in `frontend/`, `npm run lint`, `npm run build`).
5. Conclude with a clear verdict: **APPROVE** or **REQUEST_CHANGES**.
6. Write your handoff report to `c:\Auto script\.agents\reviewer_2\handoff.md` and notify the parent orchestrator via send_message.

## 2026-08-23T19:26:38Z
You are reviewer_2.
Working directory: c:\Auto script\.agents\reviewer_2
Project root: c:\Auto script
Authoritative user request: c:\Auto script\.agents\ORIGINAL_REQUEST.md
Project blueprint: c:\Auto script\PROJECT.md
Domain skill: c:\Auto script\.agents\skills\cloudflare-supabase-security\SKILL.md
User rules: c:\Auto script\GEMINI.md

Please read c:\Auto script\.agents\reviewer_2\DISPATCH.md and c:\Auto script\.agents\ORIGINAL_REQUEST.md.
Perform a security & architecture review of all implemented changes (create-portal.js, webhook.js, generate.js, Settings.jsx).
Run tests (npm test in frontend/), lint, and build.
Deliver handoff.md with your APPROVE or REQUEST_CHANGES verdict and notify the parent orchestrator via send_message.

