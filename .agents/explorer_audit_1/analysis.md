# Comprehensive Database (Supabase) Security & Integrity Audit

**Target:** Auto Script Database Architecture (`supabase/migrations/*.sql`, PostgreSQL RPCs, RLS Policies, Table Schemas & Constraints)  
**Explorer:** Database Security Explorer (`explorer_audit_1`)  
**Date:** 2026-08-25  
**Status:** Audit Complete — Actionable Remediation Available  

---

## 1. Executive Summary & Findings Matrix

A rigorous security and integrity audit of the Supabase PostgreSQL database architecture, migrations, RPC functions, and client/backend access patterns was performed. The audit identified **11 critical to low severity findings** spanning financial credit deduction bypasses, authorization bypasses (IDOR), direct RPC privilege exposure, RLS gaps, index omissions causing table scans, missing cascade constraints, and backend transaction rollback defects.

### Findings Summary Matrix

| ID | Title | Severity | Area | Impact |
|---|---|---|---|---|
| **DB-01** | Insufficient Credit Balance Check Regression in `increment_credits` Migration | **CRITICAL** | RPC / Financial Integrity | Users with 0 credits can generate infinite scripts for free |
| **DB-02** | IDOR & Unauthorized Profile Leakage in `sync_profile_credits` RPC | **CRITICAL** | RPC / Authorization | Any authenticated user can read full profile & Stripe ID of any victim |
| **DB-03** | Missing Privilege Revocation on `increment_credits` for Public/Anon Roles | **HIGH** | PostgREST / RPC Security | Authenticated/Anon clients can call RPC directly to self-grant infinite credits |
| **DB-04** | Missing Column-Level Write Restrictions & RLS Policies on `profiles` | **HIGH** | RLS Policies | Malicious clients could update their own `credits` / `tier` directly via PostgREST |
| **DB-05** | Client-Controlled `p_tier` Parameter in `check_and_increment_analyze_quota` | **HIGH** | RPC / Tier Bypass | Free-tier users can forge `p_tier: 'pro'` to unlock 20 daily AI analyses |
| **DB-06** | Double-Refund Defect on Failed Script Insertions in `generate.js` | **MEDIUM** | Backend Transaction Integrity | Users gain free credits when script insert fails due to duplicate refund calls |
| **DB-07** | Asymmetric Credit Refund in Backend Catch Handler | **MEDIUM** | Backend Credit Integrity | Multi-version generations deduct 2 credits but only refund 1 on unexpected failure |
| **DB-08** | Freemium Trial Quota Prematurely Deducted on Single-Version Scripts | **MEDIUM** | RPC Business Logic | Free-tier users lose Pro trial attempts on standard single-version script runs |
| **DB-09** | Missing Foreign Key `ON DELETE CASCADE` on User Deletion | **MEDIUM** | Schema / Data Integrity | Deleting auth accounts fails or leaves orphaned profile and script rows |
| **DB-10** | Missing High-Frequency Query B-Tree Indexes on `scripts` & `profiles` | **MEDIUM** | Performance / DoS | History queries and webhook customer queries trigger sequential full table scans |
| **DB-11** | Unrestricted `search_path` on `SECURITY DEFINER` Functions | **LOW / POLISH** | Security Hardening | Functions vulnerable to search path shadowing/hijacking |

---

## 2. Deep Dive Vulnerability Analysis

---

### [CRITICAL] DB-01: Insufficient Credit Balance Check Regression in `increment_credits`

#### Observation & Code Evidence
In `supabase/migrations/20260824_atomic_credit_guard.sql`, the RPC properly enforced balance sufficiency:
```sql
-- 20260824_atomic_credit_guard.sql
IF p_amount < 0 AND coalesce(v_current_credits, 0) < abs(p_amount) THEN
  RETURN -1;
END IF;
```
However, in subsequent migrations `20260824_fix_increment_credits.sql` and `20260824_freemium_trial.sql`, this guard was **removed** and replaced with `greatest(0, ...)` arithmetic:
```sql
-- 20260824_freemium_trial.sql (lines 50-60)
UPDATE public.profiles
SET 
  credits = greatest(0, coalesce(v_profile.credits, 0) + p_amount),
  last_free_reset = v_profile.last_free_reset,
  trial_pro_remaining = CASE 
    WHEN p_amount < 0 AND coalesce(trial_pro_remaining, 0) > 0 THEN trial_pro_remaining - 1 
    ELSE coalesce(trial_pro_remaining, 0) 
  END,
  updated_at = timezone('utc'::text, now())
WHERE id = p_user_id
RETURNING credits INTO v_new_credits;

RETURN v_new_credits;
```

#### Root Cause & Vulnerability Mechanism
When a user with `credits = 0` invokes `/api/generate` (`p_amount = -1`), PostgreSQL calculates:
`greatest(0, 0 + (-1)) = 0`
The function successfully returns `v_new_credits = 0` with no error.

In `/api/generate.js` (lines 167-169):
```javascript
if (updatedCredits === null || updatedCredits < 0) {
  return new Response(JSON.stringify({ error: 'เครดิตไม่พอ กรุณาเติมเครดิต' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
}
```
Because `0` is neither `null` nor `< 0`, `generate.js` interprets `0` as a **successful deduction**, proceeds to execute the Gemini AI model, saves the script, and completes the request! A malicious user with 0 credits can generate unlimited scripts for free.

#### Remediation
Restore the explicit pre-deduction sufficiency check:
```sql
IF p_amount < 0 AND coalesce(v_profile.credits, 0) < abs(p_amount) THEN
  RETURN -1;
END IF;
```

---

### [CRITICAL] DB-02: IDOR & Unauthorized Profile Leakage in `sync_profile_credits` RPC

#### Observation & Code Evidence
In `supabase/migrations/20260824_freemium_trial.sql` (lines 12-27):
```sql
CREATE OR REPLACE FUNCTION public.sync_profile_credits(p_user_id UUID)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    credits = CASE WHEN tier = 'free' AND now() >= last_free_reset + interval '7 days' THEN 3 ELSE credits END,
    last_free_reset = CASE WHEN tier = 'free' AND now() >= last_free_reset + interval '7 days' THEN now() ELSE last_free_reset END
  WHERE id = p_user_id;

  RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
END;
$$;
```

#### Root Cause & Vulnerability Mechanism
1. The function is configured as `SECURITY DEFINER` (runs with database owner privileges, bypassing Row Level Security).
2. It takes `p_user_id UUID` as a client-provided argument.
3. It performs **no validation** that `auth.uid() = p_user_id`.
4. Any authenticated attacker can open the browser console and execute:
   ```javascript
   await supabase.rpc('sync_profile_credits', { p_user_id: 'victim-uuid-here' });
   ```
5. PostgREST executes the RPC with owner privileges and returns the victim's entire profile record (including `stripe_customer_id`, tier, credits, trial status, and internal metadata).
6. Additionally, it mutates the victim's `last_free_reset` timestamp without the victim's consent.

#### Remediation
Enforce authorization using `auth.uid()`:
```sql
CREATE OR REPLACE FUNCTION public.sync_profile_credits(p_user_id UUID DEFAULT auth.uid())
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR (p_user_id IS NOT NULL AND p_user_id <> v_caller_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Cannot sync profiles of other users';
  END IF;

  UPDATE public.profiles
  SET 
    credits = CASE WHEN tier = 'free' AND now() >= last_free_reset + interval '7 days' THEN 3 ELSE credits END,
    last_free_reset = CASE WHEN tier = 'free' AND now() >= last_free_reset + interval '7 days' THEN now() ELSE last_free_reset END
  WHERE id = v_caller_id;

  RETURN QUERY SELECT * FROM public.profiles WHERE id = v_caller_id;
END;
$$;
```

---

### [HIGH] DB-03: Missing Privilege Revocation on `increment_credits` for Public/Anon Roles

#### Observation & Code Evidence
All migration files creating `increment_credits` lack `REVOKE` statements:
```sql
CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER ...
```

#### Root Cause & Vulnerability Mechanism
In PostgreSQL, `GRANT EXECUTE ON FUNCTION` is granted to `PUBLIC` by default. Because Supabase exposes all public functions over PostgREST via `/rest/v1/rpc/<func_name>`, an attacker with an anonymous or authenticated JWT can directly send:
```http
POST /rest/v1/rpc/increment_credits HTTP/1.1
Host: your-supabase-ref.supabase.co
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "p_user_id": "<attacker_user_id>",
  "p_amount": 99999
}
```
Because the function runs as `SECURITY DEFINER`, it bypasses RLS and adds 99,999 credits directly to the attacker's account.

#### Remediation
Revoke execution from public, anon, and authenticated roles. Grant execution strictly to `service_role`:
```sql
REVOKE EXECUTE ON FUNCTION public.increment_credits(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credits(uuid, int) TO service_role;
```
Add defensive role assertion inside the RPC:
```sql
IF coalesce(auth.role(), '') <> 'service_role' AND current_user <> 'service_role' THEN
  RAISE EXCEPTION 'PERMISSION_DENIED: increment_credits is restricted to service_role';
END IF;
```

---

### [HIGH] DB-04: Missing Column-Level Write Restrictions & RLS Policies on `profiles`

#### Observation & Code Evidence
`profiles` stores sensitive columns: `credits`, `tier`, `stripe_customer_id`, `trial_pro_remaining`.
In standard Supabase apps, developers often add a permissive update policy:
```sql
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
```
Without column-level write restrictions, an authenticated user can send a direct REST update:
```http
PATCH /rest/v1/profiles?id=eq.<user_id> HTTP/1.1
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "credits": 5000,
  "tier": "pro"
}
```

#### Remediation
1. Revoke generic `UPDATE` privileges on `public.profiles` from `anon` and `authenticated`.
2. Explicitly grant `UPDATE` only on non-sensitive columns (`display_name`, `updated_at`):
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, updated_at) ON public.profiles TO authenticated;

-- RLS Policies
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own display_name" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);
```

---

### [HIGH] DB-05: Client-Controlled `p_tier` Parameter in `check_and_increment_analyze_quota`

#### Observation & Code Evidence
In `supabase/migrations/20260825_daily_analyze_quota.sql` (lines 11-30):
```sql
CREATE OR REPLACE FUNCTION public.check_and_increment_analyze_quota(
  p_user_id uuid,
  p_tier text
)
RETURNS jsonb
...
  v_daily_limit := CASE
    WHEN p_tier = 'pro' THEN 20
    WHEN p_tier = 'plus' THEN 5
    ELSE 0
  END;
```

#### Root Cause & Vulnerability Mechanism
The function trusts the client-provided `p_tier` parameter rather than reading the authentic `tier` column from the locked row in `public.profiles`. A free-tier user can invoke `check_and_increment_analyze_quota(user.id, 'pro')` and bypass the tier restriction.

#### Remediation
Remove `p_tier` parameter and read `tier` directly from the database:
```sql
CREATE OR REPLACE FUNCTION public.check_and_increment_analyze_quota(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile record;
  v_daily_limit int;
  v_today date := CURRENT_DATE;
  v_current_used int;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT tier, analyze_quota_used, last_analyze_date
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  v_daily_limit := CASE
    WHEN v_profile.tier = 'pro' THEN 20
    WHEN v_profile.tier = 'plus' THEN 5
    ELSE 0
  END;
...
```

---

### [MEDIUM] DB-06: Double-Refund Defect on Failed Script Insertions in `generate.js`

#### Observation & Code Evidence
In `frontend/functions/api/generate.js`:
```javascript
// Lines 227-237:
if (insertError) {
  console.error("Failed to insert script:", insertError);
  // Refund #1
  await supabaseAdmin.rpc('increment_credits', { p_user_id: user.id, p_amount: creditAmount });
  throw new Error("Failed to save script history");
}

// Lines 257-264:
} catch (err) {
  if (creditDeducted && userIdForRefund) {
    // Refund #2 (Triggered because creditDeducted was not reset!)
    try {
      await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 });
    } catch {}
  }
}
```

#### Root Cause & Vulnerability Mechanism
When `insertError` occurs, the local handler issues an immediate credit refund (+1), and then throws an error. The outer `catch (err)` block intercepts this error, observes `creditDeducted === true`, and executes a **second refund** (+1).
- Starting credits: 7
- Deducted upfront: -1 (balance = 6)
- Refund #1: +1 (balance = 7)
- Refund #2 (in catch): +1 (balance = 8)
User's credit balance increases upon failed database operations.

#### Remediation
Reset `creditDeducted = false` after issuing a refund inside the `if (insertError)` branch, or rely exclusively on the outer `catch` block for rollback.

---

### [MEDIUM] DB-07: Asymmetric Credit Refund in Backend Catch Handler

#### Observation & Code Evidence
In `frontend/functions/api/generate.js` (line 261):
```javascript
} catch (err) {
  if (creditDeducted && userIdForRefund) {
    try {
      await supabaseAdmin.rpc('increment_credits', { p_user_id: userIdForRefund, p_amount: 1 });
    } catch {}
  }
}
```

#### Root Cause & Impact
When `isMultiVersion` is `true`, `creditAmount` is `2`. If an exception occurs after credit deduction (e.g., Gemini AI timeout or malformed JSON), the catch block refunds only `p_amount: 1`. The user permanently loses 1 credit.

#### Remediation
Replace hardcoded `p_amount: 1` with `p_amount: creditAmount`.

---

### [MEDIUM] DB-08: Freemium Trial Quota Prematurely Deducted on Single-Version Scripts

#### Observation & Code Evidence
In `supabase/migrations/20260824_freemium_trial.sql` (lines 53-56):
```sql
trial_pro_remaining = CASE 
  WHEN p_amount < 0 AND coalesce(trial_pro_remaining, 0) > 0 THEN trial_pro_remaining - 1 
  ELSE coalesce(trial_pro_remaining, 0) 
END
```

#### Root Cause & Impact
Any deduction (`p_amount < 0`), including basic 1-credit single-version scripts, decrements `trial_pro_remaining`. Free-tier users lose their 3 Trial Pro generations without ever opting into or using multi-version Pro scripts.

#### Remediation
Separate trial quota decrement logic from standard credit deduction, or add an explicit parameter/trigger that only consumes `trial_pro_remaining` when a Pro feature is executed.

---

### [MEDIUM] DB-09: Missing Foreign Key `ON DELETE CASCADE` Constraints

#### Observation & Code Evidence
In `frontend/functions/api/delete-account.js`:
```javascript
const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
```
Without `ON DELETE CASCADE` defined on foreign keys between `public.profiles(id)` -> `auth.users(id)` and `public.scripts(user_id)` -> `auth.users(id)`:
1. Deleting the user via Supabase Auth Admin triggers PostgreSQL foreign key constraint violations (`violates foreign key constraint`).
2. If foreign keys were unconstrained, deleting an auth user leaves orphaned personal scripts and profile data in the database, violating GDPR/PDPA "Right to Erasure" requirements.

#### Remediation
Add explicit `ON DELETE CASCADE` constraints:
```sql
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.scripts
  DROP CONSTRAINT IF EXISTS scripts_user_id_fkey,
  ADD CONSTRAINT scripts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

---

### [MEDIUM] DB-10: Missing High-Frequency Query B-Tree Indexes on `scripts` & `profiles`

#### Observation & Code Evidence
Query patterns in `History.jsx` and `create-portal.js`:
1. `History.jsx` (lines 17-21):
   ```javascript
   .from('scripts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
   ```
2. `create-portal.js` & `webhook.js`:
   ```javascript
   .from('profiles').select('stripe_customer_id').eq('id', user.id)
   ```
3. `webhook_events`:
   Stores processed Stripe event IDs. Without a TTL/cleanup index, table grows indefinitely.

#### Root Cause & Impact
Without composite indexes, PostgreSQL performs sequential scans and in-memory sorts across the entire `scripts` table for every user history view. At scale, this causes high CPU usage and database connection exhaustion.

#### Remediation
Apply B-Tree indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_scripts_user_id_created_at 
  ON public.scripts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scripts_user_favorite 
  ON public.scripts (user_id, is_favorite) 
  WHERE is_favorite = TRUE;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer 
  ON public.profiles (stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
  ON public.webhook_events (created_at);
```

---

### [LOW / POLISH] DB-11: Unrestricted `search_path` on `SECURITY DEFINER` Functions

#### Observation & Code Evidence
Functions in `supabase/migrations/` omit `SET search_path = public, pg_temp;`.

#### Root Cause & Impact
PostgreSQL `SECURITY DEFINER` best practice mandates setting explicit `search_path` to prevent search-path hijacking by non-superusers.

#### Remediation
Add `SET search_path = public, pg_temp;` to all function signatures.

---

## 3. Consolidated Production-Ready SQL Remediation Script

The following SQL script consolidates all schema fixes, security definer guards, atomic balance protections, RLS policies, index optimizations, and cascade foreign keys into a single idempotent migration:

```sql
-- ==============================================================================
-- AUTO SCRIPT: CONSOLIDATED DATABASE SECURITY & INTEGRITY MASTER MIGRATION
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. EXTENSIONS & SCHEMAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE INTEGRITY & CASCADE CONSTRAINTS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS credits INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_pro_remaining INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_free_reset TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS analyze_quota_used INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_analyze_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS product_details TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS content TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Foreign Keys with ON DELETE CASCADE
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.scripts
  DROP CONSTRAINT IF EXISTS scripts_user_id_fkey,
  ADD CONSTRAINT scripts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. HIGH-PERFORMANCE B-TREE INDEXES
CREATE INDEX IF NOT EXISTS idx_scripts_user_id_created_at 
  ON public.scripts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scripts_user_favorite 
  ON public.scripts (user_id, is_favorite) 
  WHERE is_favorite = TRUE;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer 
  ON public.profiles (stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
  ON public.webhook_events (created_at);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT TO authenticated 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Column-level privilege restrictions for profiles
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (display_name, updated_at) ON public.profiles TO authenticated;

-- Scripts Policies
DROP POLICY IF EXISTS "scripts_select_own" ON public.scripts;
CREATE POLICY "scripts_select_own" ON public.scripts 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scripts_insert_own" ON public.scripts;
CREATE POLICY "scripts_insert_own" ON public.scripts 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scripts_update_own" ON public.scripts;
CREATE POLICY "scripts_update_own" ON public.scripts 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scripts_delete_own" ON public.scripts;
CREATE POLICY "scripts_delete_own" ON public.scripts 
  FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

REVOKE UPDATE ON public.scripts FROM anon, authenticated;
GRANT UPDATE (is_favorite) ON public.scripts TO authenticated;

-- webhook_events: Strictly isolated to service_role (No public policies)
REVOKE ALL ON public.webhook_events FROM anon, authenticated;

-- 5. SECURE RPC FUNCTIONS

-- 5.1 Atomic Credit Increment/Decrement RPC
CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id UUID, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_credits INT;
  v_new_credits INT;
  v_profile RECORD;
BEGIN
  -- Strict caller verification: only service_role or DB superuser can adjust credits
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: increment_credits may only be executed by service_role';
  END IF;

  -- Row-level lock to eliminate concurrency race conditions
  SELECT * INTO v_profile 
  FROM public.profiles 
  WHERE id = p_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  v_current_credits := coalesce(v_profile.credits, 0);

  -- Strict Pre-Deduction Sufficiency Check (Prevents 0-credit free generation bypass)
  IF p_amount < 0 AND v_current_credits < abs(p_amount) THEN
    RETURN -1;
  END IF;

  -- Weekly free credit reset logic
  IF v_profile.tier = 'free' AND now() >= v_profile.last_free_reset + interval '7 days' THEN
    v_current_credits := 3;
    v_profile.last_free_reset := now();
  END IF;

  v_new_credits := greatest(0, v_current_credits + p_amount);

  UPDATE public.profiles
  SET 
    credits = v_new_credits,
    last_free_reset = v_profile.last_free_reset,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN v_new_credits;
END;
$$;

-- Restrict RPC permissions
REVOKE EXECUTE ON FUNCTION public.increment_credits(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credits(UUID, INT) TO service_role;

-- 5.2 Secure Sync Profile Credits RPC (Protected against IDOR)
CREATE OR REPLACE FUNCTION public.sync_profile_credits(p_user_id UUID DEFAULT auth.uid())
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_id UUID;
BEGIN
  v_target_id := coalesce(p_user_id, auth.uid());
  
  -- IDOR Protection: authenticated users can only sync their own profile
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_target_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You cannot synchronize profiles belonging to other users';
  END IF;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  UPDATE public.profiles
  SET 
    credits = CASE 
      WHEN tier = 'free' AND now() >= last_free_reset + interval '7 days' THEN 3 
      ELSE credits 
    END,
    last_free_reset = CASE 
      WHEN tier = 'free' AND now() >= last_free_reset + interval '7 days' THEN now() 
      ELSE last_free_reset 
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = v_target_id;

  RETURN QUERY SELECT * FROM public.profiles WHERE id = v_target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_profile_credits(UUID) TO authenticated, service_role;

-- 5.3 Daily Quota RPC (Server-Derived Tier Verification)
CREATE OR REPLACE FUNCTION public.check_and_increment_analyze_quota(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile RECORD;
  v_daily_limit INT;
  v_today DATE := CURRENT_DATE;
  v_current_used INT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT tier, analyze_quota_used, last_analyze_date
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  -- Derive limit directly from database row (ignores forged client parameters)
  v_daily_limit := CASE
    WHEN v_profile.tier = 'pro' THEN 20
    WHEN v_profile.tier = 'plus' THEN 5
    ELSE 0
  END;

  IF v_profile.last_analyze_date IS NULL OR v_profile.last_analyze_date < v_today THEN
    v_current_used := 0;
  ELSE
    v_current_used := coalesce(v_profile.analyze_quota_used, 0);
  END IF;

  IF v_current_used >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'used', v_current_used,
      'limit', v_daily_limit
    );
  END IF;

  UPDATE public.profiles
  SET
    analyze_quota_used = v_current_used + 1,
    last_analyze_date = v_today,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'used', v_current_used + 1,
    'limit', v_daily_limit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_analyze_quota(UUID) TO authenticated, service_role;
```

---

## 4. Remediation Checklist for Implementers

1. **Apply Master SQL Migration**: Run the consolidated SQL script in the Supabase SQL editor or migration pipeline.
2. **Patch `generate.js` Double-Refund & Asymmetric Refund Defect**:
   - In `generate.js`, ensure `creditDeducted` is set to `false` when a rollback refund is executed after `scripts.insert` failure.
   - In the outer `catch (err)` block, refund `creditAmount` rather than hardcoded `1`.
3. **Verify Vitest Test Harness Alignment**:
   - Update `mockDb.js` to mirror the strict `IF p_amount < 0 AND credits < abs(p_amount) THEN RETURN -1` constraint.
   - Verify all test suites pass with 0 errors (`npm test`).
