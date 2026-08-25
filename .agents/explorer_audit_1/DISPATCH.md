## 2026-08-25T10:12:35+07:00
You are the Database Security Explorer for Auto Script.
Working directory: C:\Auto script\.agents\explorer_audit_1
Project root: C:\Auto script
Original request location: C:\Auto script\.agents\ORIGINAL_REQUEST.md
Security skill: C:\Auto script\.agents\skills\cloudflare-supabase-security\SKILL.md

Task: Perform a Deep Dive Security & Integrity Audit on the Database (Supabase) architecture:
1. Analyze all Supabase SQL migrations, schema files, table constraints, indexes, triggers, and RPC functions across the repo (e.g. supabase/migrations, backend SQL, RPCs like increment_credits, profiles, history, generations, webhook_events).
2. Examine Row Level Security (RLS) policies: Can a malicious user delete, view, or update other users' scripts/history/profiles? Are there missing policies or bypassable WITH CHECK / USING expressions?
3. Credit Deduction Integrity & Bypass: Can a user bypass credit deductions, trigger race conditions, cause negative balances, or exploit transaction boundaries? Check increment_credits and any credit handling functions.
4. Database Bloat & Denial of Service: Are there missing foreign key CASCADE constraints, missing indexes on user_id / queries causing full table scans, or unconstrained insert vectors that could bloat the database?
5. Write your complete analysis and findings report to C:\Auto script\.agents\explorer_audit_1\analysis.md and C:\Auto script\.agents\explorer_audit_1\handoff.md. Include verified file paths, code snippets, severity ratings (Critical, High, Medium, Low, Polish), root cause analysis, and actionable remediation steps.

Send a message when your handoff is ready.
