# Original User Request

## Initial Request — 2026-08-24T23:23:55+07:00

You are the SWE Orchestrator for the Auto Script project.
Working directory: c:\Auto script\.agents\teamwork_preview_swe_1
Project root: c:\Auto script
Original request location: c:\Auto script\.agents\ORIGINAL_REQUEST.md

Mission:
This is a single self-contained fix; keep it small and focused. Fix the frontend reference errors in `CreateScript.jsx` and the backend 500 Internal Server Error in the `/api/generate` Cloudflare Worker.

Requirements:
1. Fix Frontend Reference Errors:
`CreateScript.jsx` is throwing `ReferenceError: analyzeAbortRef is not defined` and `ReferenceError: setUser is not defined`. Ensure these variables are properly declared or refactored to use the correct `useAuth` context or `useRef` hooks as appropriate.

2. Fix Backend 500 Error:
`/api/generate` endpoint (in `frontend/functions/api/generate.js`) is failing with a 500 error: `Failed to deduct credits`. Identify why the Supabase RPC call `increment_credits` is failing or why the turnstile logic is throwing this error, and fix it. The atomic deduction pattern must be preserved.

3. Preserve Test Harness:
The project has 80 passing Vitest tests in `frontend/functions/api/__tests__`. Do not delete or disable any tests. Update the tests only if the API logic changes in a way that requires it, but ensure all 80 tests pass (`npm test` inside `frontend` directory).

4. User Rules & Constraints (from GEMINI.md):
- Code Explanation Rule: Explain code logically.
- Gemini Model Version Rule: Use `gemini-3.6-flash` if any Gemini API integration is touched.
- Proactive Compliance & Security Warning Rule: Follow security best practices.
- Exact String & URL Preservation Rule: Preserve strings/URLs verbatim.
- Supabase Schema & RPC Alignment Rule: Verify schemas and RPC parameter alignment.

Run the SWE Light loop: dispatch to teamwork_preview_implementer, run reviews/tests, track progress in your progress.md and BRIEFING.md, and report back when finished.

## Follow-up — 2026-08-25T10:08:36+07:00

# Teamwork Project Prompt — Draft

> Status: Launched.
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Perform the **Ultimate Final Polish & Deep Security Audit** on the Auto Script project (`C:\Auto script`). This is the final sweep before production launch. The goal is to find obscure edge cases, database vulnerabilities, UX friction points, and infrastructure limits. Do not execute destructive actions on the production database.

Working directory: C:\Auto script
Integrity mode: development

## Requirements

### R1. Database & Security Deep Dive (Supabase)
Analyze all Supabase RLS (Row Level Security) policies, table constraints, and RPC functions. Are there any ways a malicious user could delete other users' history, bypass credit deductions via weird constraints, or cause database bloat?

### R2. Infrastructure & Rate Limiting (Cloudflare / Stripe)
Review the API architecture for rate limiting and resource exhaustion. Can a user spam `/api/generate` 1,000 times a second and crash the Stripe/Supabase quota? Are there any unhandled Stripe webhook events that could cause silent failures?

### R3. UX, State, & Edge Case Polish
Review the newly implemented `ErrorBoundary`, Code Splitting, and React Router logic. Are there any memory leaks? Do loading states hang if network drops? Are there any missing `alt` tags or mobile responsiveness issues in Tailwind classes?

## Acceptance Criteria

### Final Polish Blueprint
- [ ] A final Markdown report detailing any remaining obscure issues or UX improvements.
- [ ] The output MUST be formatted as an "Actionable Blueprint" for the AI Developer.
- [ ] If the system is 100% flawless, issue a "READY FOR LAUNCH" certificate.

