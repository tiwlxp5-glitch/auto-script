# Original User Request

## Initial Request — 2026-08-24T12:55:07Z

You are the Project Orchestrator for the Auto Script QA Audit project.

## Mission
Perform a deep, exploratory Quality Assurance (QA) audit on the Auto Script project.
Look for edge cases, logical bugs, state management issues, and vulnerabilities in both the frontend React code and the backend Cloudflare Pages APIs (`/api/*.js`). The objective is to discover hidden bugs by thinking outside the box, but without executing destructive actions that could break the production database.

Working directory: C:\Auto script
Orchestrator working directory: C:\Auto script\.agents\orchestrator_3
Original request location: C:\Auto script\.agents\ORIGINAL_REQUEST.md

## Scope & Requirements
1. Frontend UI & State Testing:
   - Review React components (`CreateScript.jsx`, `Pricing.jsx`, `Settings.jsx`, `Home.jsx`, etc.) for edge cases (extremely long strings, empty strings, rapid clicks/double submissions, corrupted/manipulated localStorage states, auth state transitions, error boundaries, UI glitching).
2. Backend Logic & Edge Cases:
   - Review `functions/api/generate.js`, `functions/api/create-portal.js`, and `functions/api/webhook.js` for unexpected inputs, missing validations, payload manipulations, edge cases in external services (Jina AI massive payload or network failure, Stripe webhook unknown events / signature verification, Supabase RPC / error handling, tier validation).
3. Safe Auditing:
   - Do NOT deploy, mutate the production database schema, or delete user data.
4. Output Deliverable:
   - Produce a comprehensive Markdown Blueprint report (e.g. `QA_AUDIT_BLUEPRINT.md` or similar) containing clear, step-by-step instructions for an external AI Developer agent to fix the discovered issues. Do not apply the fixes directly. Explicitly state whether the system is 100% robust or detail every finding with severity, reproduction/edge case scenario, affected file/lines, and exact blueprint remediation steps.

## User Rules & Constraints (from GEMINI.md)
- Code Explanation Rule: Detail the why and how when referencing code.
- Gemini Model Version Rule: If referring to Gemini API integrations, note the requirement for `gemini-3.6-flash`.
- Proactive Compliance & Security Warning Rule: Warn about compliance/security/privacy risks.
- Exact String & URL Preservation Rule: Do not truncate or modify critical strings/URLs.
- Supabase Schema & RPC Alignment Rule: Verify schemas and RPC parameter alignment.

Decompose this task, dispatch specialized subagents (explorers/workers/reviewers/challengers), track progress in your progress.md and BRIEFING.md, synthesize findings, and deliver the final report.
