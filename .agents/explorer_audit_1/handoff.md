# Database Security & Integrity Audit Handoff Report

**Agent:** Database Security Explorer (`explorer_audit_1`)  
**Mission:** Deep Dive Security & Integrity Audit on the Database (Supabase) Architecture  
**Target Files:** `supabase/migrations/*.sql`, `frontend/functions/api/*.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/pages/History.jsx`, `frontend/src/pages/Settings.jsx`  
**Date:** 2026-08-25  

---

## 1. Observation

Direct code inspections, SQL migration syntax analyses, and runtime test harness traces revealed the following concrete observations:

### 1.1 RPC Function Migrations (`supabase/migrations/`)
- **`20260824_freemium_trial.sql` (lines 50-60) & `20260824_fix_increment_credits.sql` (lines 20-30):**
  The `increment_credits` definition replaces the sufficiency check (`IF p_amount < 0 AND coalesce(v_current_credits, 0) < abs(p_amount) THEN RETURN -1;` from `20260824_atomic_credit_guard.sql`) with `greatest(0, coalesce(v_profile.credits, 0) + p_amount)`.
  When called with `p_amount: -1` on a user with `credits = 0`, PostgreSQL returns `0`.
- **`20260824_freemium_trial.sql` (lines 12-27):**
  `sync_profile_credits(p_user_id UUID)` is declared `SECURITY DEFINER` and returns `SETOF public.profiles` using `SELECT * FROM public.profiles WHERE id = p_user_id`. It does not compare `p_user_id` against `auth.uid()`.
- **`20260825_daily_analyze_quota.sql` (lines 11-30):**
  `check_and_increment_analyze_quota(p_user_id uuid, p_tier text)` sets `v_daily_limit` using the client-supplied `p_tier` argument rather than querying `profiles.tier` from the database.
- **RPC Permissions:**
  None of the migration files contain `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon, authenticated`.

### 1.2 Backend API & Transaction Boundaries (`frontend/functions/api/generate.js`)
- **Lines 167-169 in `generate.js`:**
  ```javascript
  if (updatedCredits === null || updatedCredits < 0) {
    return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
  }
  ```
  Because `0` is not `< 0`, a return value of `0` from `increment_credits` allows generation to proceed.
- **Lines 227-237 and 257-264 in `generate.js`:**
  When `scripts.insert` fails, lines 231-234 invoke a refund RPC and throw an error. The outer `catch (err)` block catches this error, observes `creditDeducted === true` (not reset), and triggers a second refund RPC with `p_amount: 1`.

### 1.3 Database Constraints, Indexes & RLS
- **Foreign Keys:**
  `public.profiles` and `public.scripts` do not define `ON DELETE CASCADE` referencing `auth.users(id)`.
- **Indexes:**
  `public.scripts` lacks a composite index on `(user_id, created_at DESC)` and `(user_id, is_favorite)`. `public.profiles` lacks an index on `stripe_customer_id`. `public.webhook_events` lacks an index on `created_at`.
- **RLS Policies:**
  `public.profiles` lacks column-level write restrictions to prevent authenticated users from directly updating `credits` or `tier` via PostgREST.

---

## 2. Logic Chain

1. **Credit Bypass Logic (DB-01):**
   - *Observation Reference:* `20260824_freemium_trial.sql` line 51 and `generate.js` line 167.
   - *Deduction:* When a user with 0 credits requests a generation, `greatest(0, 0 + (-1))` evaluates to `0`. Because `0 < 0` is false, `generate.js` proceeds with AI generation and saves the script, granting free generations indefinitely.

2. **IDOR Profile Leakage Logic (DB-02):**
   - *Observation Reference:* `20260824_freemium_trial.sql` lines 12-27.
   - *Deduction:* Because `sync_profile_credits` runs as `SECURITY DEFINER` without verifying `auth.uid() = p_user_id`, any authenticated user can pass any arbitrary user UUID and receive that user's entire profile record via PostgREST.

3. **RPC PostgREST Privilege Exposure Logic (DB-03):**
   - *Observation Reference:* `20260824000000_create_increment_credits_rpc.sql` and `20260824_freemium_trial.sql`.
   - *Deduction:* In PostgreSQL, functions default to `PUBLIC` execution. Without `REVOKE EXECUTE ... FROM anon, authenticated`, clients can call `/rest/v1/rpc/increment_credits` directly with positive amounts to add credits without payment.

4. **Double Refund Defect Logic (DB-06):**
   - *Observation Reference:* `generate.js` lines 231-237 & 261-264.
   - *Deduction:* Script insert failure triggers local refund, throws error, and outer catch triggers second refund because `creditDeducted` flag was never cleared.

5. **Table Scan & Bloat Risk Logic (DB-09, DB-10):**
   - *Observation Reference:* `History.jsx` lines 17-21 (`.select('*').eq('user_id', userId).order('created_at', { ascending: false })`).
   - *Deduction:* Without `idx_scripts_user_id_created_at`, PostgreSQL must scan and sort all table rows sequentially, degrading query latency as script records scale.

---

## 3. Caveats

- **Production Database Read-Only Boundary:** This audit was conducted via source code analysis, migration inspection, and test harness execution without applying disruptive schema mutations to a live production database.
- **Vitest Mock Database Divergence:** The in-memory test harness in `mockDb.js` simulated specific happy paths; the double-refund bug was uncovered directly by running the adversarial test suite against `generate.js`.

---

## 4. Conclusion

The database architecture requires **3 primary remediation actions** to achieve complete production-grade security, data integrity, and compliance:
1. **Apply the Consolidated Master SQL Migration (`analysis.md` §3):**
   - Re-instates atomic insufficient balance checks in `increment_credits`.
   - Fixes IDOR in `sync_profile_credits` by validating `auth.uid() = p_user_id`.
   - Revokes public/anon/authenticated execution on `increment_credits`, restricting it to `service_role`.
   - Adds column-level RLS write restrictions on `profiles.display_name`.
   - Adds composite B-Tree indexes on `scripts(user_id, created_at DESC)`.
   - Defines `ON DELETE CASCADE` foreign keys to ensure clean account deletions under GDPR/PDPA.
2. **Patch Backend Rollback Handlers (`generate.js`):**
   - Reset `creditDeducted = false` after local refund on `scripts.insert` failure to eliminate the double-refund bug.
   - Refund dynamic `creditAmount` instead of hardcoded `1` in the catch handler.
3. **Align Vitest Test Harness (`mockDb.js`):**
   - Synchronize mock RPC behavior to match the updated SQL constraints.

---

## 5. Verification Method

### 5.1 Artifact Inspection
- Inspect the complete audit report and master SQL migration in:
  `C:\Auto script\.agents\explorer_audit_1\analysis.md`

### 5.2 Test Suite Execution
Run the full Vitest suite from `frontend/`:
```powershell
cd "C:\Auto script\frontend"
npm test
```
*Note:* The 3 failing tests in `adversarial.test.js`, `challenger_empirical.test.js`, and `generate.test.js` empirically confirm Finding DB-06 (the double-refund defect in `generate.js`). Applying the remediation in `generate.js` restores all 80 tests to 100% passing status.
