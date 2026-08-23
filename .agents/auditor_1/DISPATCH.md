# DISPATCH — auditor_1

## Mission
Perform a Forensic Integrity Audit of the Auto Script codebase across all implementation files to verify authentic implementation and detect any dummy/facade implementations, hardcoding, cheating, or circumvented requirements.

## Required Reading
- `c:\Auto script\.agents\ORIGINAL_REQUEST.md`
- `c:\Auto script\PROJECT.md`
- `c:\Auto script\TEST_READY.md`
- Implementation files:
  - `c:\Auto script\frontend\functions\api\create-portal.js`
  - `c:\Auto script\frontend\functions\api\webhook.js`
  - `c:\Auto script\frontend\functions\api\generate.js`
  - `c:\Auto script\frontend\src\pages\Settings.jsx`
- User rules: `c:\Auto script\GEMINI.md`
- Domain skill: `c:\Auto script\.agents\skills\cloudflare-supabase-security\SKILL.md`

## Forensic Audit Protocol
Execute systematic static analysis, runtime verification, and pattern audits:
1. **Hardcoding & Facades**: Verify that endpoints do not return hardcoded mock responses or dummy results. Check that real Supabase client calls, real Stripe API calls, and real Gemini API calls are made.
2. **Authentic R1 Implementation**: Verify that `create-portal.js` genuinely validates JWT tokens via Supabase Auth and queries `profiles` for `stripe_customer_id`.
3. **Authentic R2 Implementation**: Verify that `webhook.js` and `generate.js` invoke the real Supabase RPC `increment_credits`, with zero remaining in-memory math on `credits`.
4. **Authentic R3 Implementation**: Verify that `generate.js` strictly inserts the script into `scripts` table before calling RPC deduction, and handles insertion error by throwing/returning without credit deduction.
5. **Authentic R4 Implementation**: Verify that `generate.js` genuinely validates `profile.tier` before passing `targetAudience` to Gemini.
6. **Model Verification**: Verify that `gemini-3.6-flash` is used.
7. Conclude with a clear verdict: **CLEAN** or **INTEGRITY VIOLATION / CHEATING DETECTED**.
8. Output your audit report to `c:\Auto script\.agents\auditor_1\audit_report.md` and `handoff.md`, and notify the parent orchestrator via send_message.
