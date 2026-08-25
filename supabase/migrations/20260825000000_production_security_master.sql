-- ==============================================================================
-- AUTO SCRIPT: PRODUCTION SECURITY & INTEGRITY MASTER MIGRATION
-- Fixes: DB-01, DB-02, DB-03, DB-04, DB-05, DB-08, DB-09, DB-10, DB-11
-- ==============================================================================

-- 1. TABLE STRUCTURE & CASCADE CONSTRAINTS
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

-- Foreign Keys with ON DELETE CASCADE (Fixes DB-09 / Account Deletion + PDPA/GDPR)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.scripts
  DROP CONSTRAINT IF EXISTS scripts_user_id_fkey,
  ADD CONSTRAINT scripts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. HIGH-PERFORMANCE B-TREE INDEXES (Fixes DB-10 / Table Scan Prevention)
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

-- 3. ROW LEVEL SECURITY (RLS) POLICIES (Fixes DB-04 / Write Restrictions)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can only read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT TO authenticated 
  USING (auth.uid() = id);

-- Profiles: Authenticated users can only update display_name and updated_at (NOT credits or tier)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, updated_at) ON public.profiles TO authenticated;

-- Scripts: Full CRUD strictly isolated to owner
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

REVOKE ALL ON public.scripts FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.scripts TO authenticated;
GRANT UPDATE (is_favorite) ON public.scripts TO authenticated;

-- Webhook Events: Strictly isolated to service_role (No client access)
REVOKE ALL ON public.webhook_events FROM anon, authenticated;

-- 4. SECURE ATOMIC RPC FUNCTIONS

-- 4.1 increment_credits (Fixes DB-01, DB-03, DB-08, DB-11)
-- Analogy: Like an armored car that only the bank manager can call.
-- Regular customers cannot phone the vault directly anymore.
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

  -- Strict Pre-Deduction Sufficiency Check (Fixes DB-01: 0-credit infinite bypass)
  -- Previously: greatest(0, 0 - 1) = 0 which passed the >= 0 check
  -- Now: We check if the user has enough credits BEFORE deducting
  IF p_amount < 0 AND v_current_credits < abs(p_amount) THEN
    RETURN -1;
  END IF;

  -- Weekly free credit replenishment logic for Free tier
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

-- Fixes DB-03: Remove PUBLIC execution rights so PostgREST cannot be called directly
REVOKE EXECUTE ON FUNCTION public.increment_credits(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credits(UUID, INT) TO service_role;

-- 4.2 sync_profile_credits (Fixes DB-02 / IDOR Protection)
-- Analogy: A customer can only check their OWN bank balance, not peek at their neighbor's.
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
  
  -- IDOR Guard: callers can only sync their own profile
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_target_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Cannot sync profiles belonging to other users';
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

-- 4.3 check_and_increment_analyze_quota (Fixes DB-05 / Server-Derived Tier)
-- Analogy: The quota checker reads the tier from the locked database row,
-- NOT from the customer's self-declared badge (client-provided p_tier).
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

  -- Tier is read from DB, NOT from client input (Fixes DB-05)
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
