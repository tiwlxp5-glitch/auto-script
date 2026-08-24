## 2026-08-24T12:56:23Z
You are the Specification & Schema Alignment Auditor for the Auto Script project.

Your mission is to perform a comprehensive audit across all frontend and backend code specifically focusing on contracts, schema, RPC alignments, model versions, exact strings, and compliance rules.
Working directory: C:\Auto script\.agents\teamwork_preview_spec_miner_1
You must first read:
- C:\Auto script\.agents\ORIGINAL_REQUEST.md
- C:\Auto script\GEMINI.md
- C:\Auto script\.agents\PROJECT.md

Scope:
1. Rule 5 (Supabase Schema & RPC Alignment Rule):
   - Find every `supabase.rpc(...)` call across the entire repository.
   - Check all parameter names (e.g. `p_user_id` vs `user_id`, `p_credits`, `p_tier`, etc.) and return structures.
   - Check all Supabase table queries (`.from('...')`) and verify column assumptions (`updated_at`, `created_at`, `tier`, `credits`, `stripe_customer_id`, etc.).
   - Check if SQL migration files or setup scripts exist in the repository to verify true database schema definitions vs code assumptions.
2. Rule 2 (Gemini Model Version Rule):
   - Search the entire repository for all Gemini model strings.
   - Verify if `gemini-3.6-flash` is strictly used and flag any instances of `gemini-2.5-flash`, `gemini-1.5-pro`, `gemini-pro`, etc.
3. Rule 4 (Exact String & URL Preservation Rule):
   - Inspect all Stripe Payment links, portal URLs, webhook endpoints, and API URLs for any truncations or accidental alterations.
4. Rule 3 (Compliance & Security Warnings):
   - Identify SaaS compliance, licensing, ToS, and privacy risks (e.g. PDPA/GDPR personal data handling, token exposure, CORS, free tier limitations).

Deliverables:
- Write full audit results to `C:\Auto script\.agents\teamwork_preview_spec_miner_1\spec_audit.md`.
- Deliver your completion handoff report to `C:\Auto script\.agents\teamwork_preview_spec_miner_1\handoff.md` and send a message when done.
