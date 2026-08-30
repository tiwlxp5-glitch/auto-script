-- 20260830170000_universal_ledger_and_admin.sql
-- Description: Phase 1 - Universal Ledger, Admin Security, and Idempotency Enforcements

-- ============================================================================
-- 1. PROFILES: ADMIN ROLE
-- ============================================================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- Note: No need to REVOKE or UPDATE policies for `role`. 
-- The existing `GRANT UPDATE (display_name, updated_at) ON public.profiles TO authenticated;` 
-- implicitly prevents users from modifying their own `role`.

-- ============================================================================
-- 2. AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Protect audit_logs: Append-only for service_role/RPCs. Read-only for admins.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users. 
-- Mutations happen exclusively via SECURITY DEFINER RPCs or service_role.

-- ============================================================================
-- 3. UNIVERSAL LEDGER UPGRADE
-- ============================================================================
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Safe Backfill: Generate a UUID for existing rows before setting NOT NULL
-- This prevents the migration from crashing on V1/V2 data.
UPDATE public.credit_transactions 
SET 
  source = COALESCE(source, 'legacy_ai_generation'),
  reference_id = COALESCE(reference_id, gen_random_uuid()::text)
WHERE source IS NULL OR reference_id IS NULL;

-- Now enforce NOT NULL
ALTER TABLE public.credit_transactions
  ALTER COLUMN source SET NOT NULL,
  ALTER COLUMN reference_id SET NOT NULL;

-- Unique constraint for logical idempotency
-- SQL treats NULL != NULL, but since we enforced NOT NULL above, this perfectly guarantees zero duplicate transactions.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'credit_transactions_source_reference_id_key'
    ) THEN
        ALTER TABLE public.credit_transactions
            ADD CONSTRAINT credit_transactions_source_reference_id_key UNIQUE (source, reference_id);
    END IF;
END $$;

-- Ledger Protection: Explicitly deny all direct client mutations
-- (In Supabase, if no INSERT policy exists, it's denied by default for authenticated, but we document it here)
-- No INSERT/UPDATE/DELETE policies will be created for public.credit_transactions.

-- ============================================================================
-- 4. INCREMENT CREDITS WITH LEDGER & IDEMPOTENT SUCCESS
-- ============================================================================
-- We replace the old increment_credits to enforce the Universal Ledger invariant.
CREATE OR REPLACE FUNCTION public.increment_credits(
  p_user_id UUID, 
  p_amount INT,
  p_source TEXT,
  p_reference_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_credits INT;
  v_profile RECORD;
BEGIN
  -- Strict caller verification: only service_role or DB superuser
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: increment_credits may only be executed by service_role';
  END IF;

  -- 1. Logical Idempotency Check (Idempotent Success)
  -- If this exact transaction (e.g. Stripe webhook retry) already happened, DO NOTHING and return success.
  IF EXISTS (
    SELECT 1 FROM public.credit_transactions 
    WHERE source = p_source AND reference_id = p_reference_id
  ) THEN
    RETURN jsonb_build_object(
      'success', true, 
      'idempotent_success', true, 
      'message', 'Transaction already processed.'
    );
  END IF;

  -- 2. Lock row for atomic balance update
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  -- 3. Calculate and update balance
  -- Note: Refund/Dispute business rule dictates balance CAN go negative.
  -- But standard deposits/deductions shouldn't push it below 0 unless it's a penalty.
  -- We'll allow negative balances here if p_amount < 0 and it exceeds current credits.
  v_new_credits := coalesce(v_profile.credits, 0) + p_amount;
  
  UPDATE public.profiles
  SET 
    credits = v_new_credits,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  -- 4. Insert into Universal Ledger (Atomic)
  INSERT INTO public.credit_transactions (
    user_id, amount, status, source, reference_id, mode
  ) VALUES (
    p_user_id, p_amount, 'completed', p_source, p_reference_id, 'ledger_sync'
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_credits', v_new_credits
  );
END;
$$;

-- Revoke public access, grant strictly to service_role
REVOKE ALL ON FUNCTION public.increment_credits(UUID, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credits(UUID, INT, TEXT, TEXT) TO service_role;

-- ============================================================================
-- 5. ADMIN RPC: GRANT CREDITS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_grant_credits(
  p_target_user_id UUID,
  p_amount INT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_role TEXT;
  v_new_credits INT;
  v_old_credits INT;
  v_audit_id UUID;
BEGIN
  -- 1. Authentication & Authorization (auth.uid() ONLY)
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = v_admin_id;
  IF v_admin_role <> 'admin' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Caller is not an admin';
  END IF;

  -- 2. Lock target user row
  SELECT credits INTO v_old_credits FROM public.profiles WHERE id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  v_new_credits := coalesce(v_old_credits, 0) + p_amount;

  -- 3. Update Balance
  UPDATE public.profiles
  SET credits = v_new_credits, updated_at = now()
  WHERE id = p_target_user_id;

  -- 4. Insert Audit Log
  INSERT INTO public.audit_logs (
    admin_id, target_user_id, action, previous_value, new_value, reason
  ) VALUES (
    v_admin_id, p_target_user_id, 'grant_credits', 
    jsonb_build_object('credits', v_old_credits), 
    jsonb_build_object('credits', v_new_credits), 
    p_reason
  ) RETURNING id INTO v_audit_id;

  -- 5. Insert Universal Ledger
  INSERT INTO public.credit_transactions (
    user_id, amount, status, source, reference_id, mode
  ) VALUES (
    p_target_user_id, p_amount, 'completed', 'admin_grant', v_audit_id::text, 'admin_adjustment'
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_credits', v_new_credits
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_credits(UUID, INT, TEXT) TO authenticated;

-- ============================================================================
-- 6. ADMIN RPC: LIST USERS (LEAST PRIVILEGE)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  tier TEXT,
  credits INT,
  role TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_role TEXT;
BEGIN
  -- Verify caller is admin
  SELECT public.profiles.role INTO v_admin_role FROM public.profiles WHERE public.profiles.id = auth.uid();
  IF coalesce(v_admin_role, '') <> 'admin' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  -- Return joined data (Auth email + Profile data)
  RETURN QUERY
  SELECT 
    p.id,
    u.email::TEXT,
    p.display_name,
    p.tier,
    p.credits,
    p.role,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(INT, INT) TO authenticated;
