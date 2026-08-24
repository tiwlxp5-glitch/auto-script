## 2026-08-24T13:29:10Z
You are the QA Blueprint Patch Worker for the Auto Script project.

Your mission is to update `C:\Auto script\QA_AUDIT_BLUEPRINT.md` by applying the 4 critical patches identified in Reviewer 2's report (`C:\Auto script\.agents\reviewer_audit_2\review_report.md`).

Working directory: C:\Auto script\.agents\worker_patch_1
Target file to edit: C:\Auto script\QA_AUDIT_BLUEPRINT.md

Read:
- C:\Auto script\.agents\reviewer_audit_2\review_report.md
- C:\Auto script\QA_AUDIT_BLUEPRINT.md
- C:\Auto script\GEMINI.md

Required Updates to `C:\Auto script\QA_AUDIT_BLUEPRINT.md`:
1. SQL Migration (`DB-LOGIC-01`): Update `supabase/migrations/20260824_atomic_credit_guard.sql` in the blueprint to preserve the 7-day freemium replenishment reset (`last_free_reset`) and `trial_pro_remaining` tracking from `20260824_freemium_trial.sql` while enforcing the atomic insufficiency guard.
2. Webhook Customer Email Fallback (`WH-RES-01`): Replace the query on non-existent `profiles.email` with `supabase.auth.admin.listUsers()` to safely find matching auth users by email per GEMINI.md Rule 5.
3. Backend URL Validation (`BE-SEC-02`): Add backend defense-in-depth URL domain whitelist validation (`isValidPlatformUrl`) to `functions/api/analyze.js` and `functions/api/generate.js`.
4. Trial Pro Credit Restoration (`BE-SEC-01`): Ensure the compensatory refund code block in `generate.js` restores `trial_pro_remaining` for trial users upon failed AI script generations.

Write the updated `C:\Auto script\QA_AUDIT_BLUEPRINT.md`, verify all rules from GEMINI.md are preserved, deliver your handoff report to `C:\Auto script\.agents\worker_patch_1\handoff.md`, and send a completion message.
