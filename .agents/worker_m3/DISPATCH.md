# DISPATCH — worker_m3

## 2026-08-24T02:20:02Z
## Mission
Implement Milestone 3: Fix Order of Operations, atomic credit deduction via RPC, and enforce `targetAudience` tier authorization in `generate.js`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Required Reading
- `c:\Auto script\.agents\ORIGINAL_REQUEST.md`
- `c:\Auto script\PROJECT.md`
- `c:\Auto script\.agents\explorer_survey_1\survey_report.md`
- `c:\Auto script\.agents\spec_miner_survey_3\survey_report.md`
- User rules: `c:\Auto script\GEMINI.md`
- Domain skill: `c:\Auto script\.agents\skills\cloudflare-supabase-security\SKILL.md`

## File Ownership
- `frontend/functions/api/generate.js` (Exclusive ownership)

## Implementation Requirements
1. **`frontend/functions/api/generate.js`**:
   - **Requirement 4 (Tier Gating for targetAudience)**: Check `profile.tier`. If `profile.tier === 'free'` (or not plus/pro), set `targetAudience` to empty/null so it is EXCLUDED from the Gemini AI prompt. Only Plus and Pro tiers may have `targetAudience` interpolated into the prompt.
   - **AI Model Compliance**: Retain `model: 'gemini-3.6-flash'` per GEMINI.md rules.
   - **Requirement 3 (Order of Operations)**: Save generated script to `public.scripts` table FIRST.
     - If insertion fails or returns `{ error }`, log error, return 500 (`{ error: "Failed to save script history" }`), and DO NOT deduct any credits.
   - **Requirement 2 (Atomic Credit Deduction)**: ONLY after successful insert into `scripts`, deduct credit by calling `supabaseAdmin.rpc('increment_credits', { user_id: user.id, amount: -1 })`.
   - Return 200 response with `{ script: resultJson, credits_remaining: updatedCredits }`.
2. Verify build (`npm run build` in `frontend/`) and lint (`npm run lint`).
3. Output your implementation report to `c:\Auto script\.agents\worker_m3\handoff.md` and send a completion message to the parent orchestrator.
