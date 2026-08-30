-- =============================================================================
-- Migration: Lock Down Ledger RPCs (Expert Architecture Audit Item 2)
-- Created:   2026-08-30
-- Purpose:   Strictly enforce that the backend API is the primary security wall.
--            Since start_generation_tx, commit_generation_tx, and refund_generation_tx
--            are SECURITY DEFINER and bypass RLS, they MUST NOT be callable by clients.
--            This revokes public execution and restricts them exclusively to service_role.
-- =============================================================================

-- 1. start_generation_tx
CREATE OR REPLACE FUNCTION public.start_generation_tx(
  p_user_id UUID,
  p_amount  INTEGER,
  p_mode    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile         RECORD;
  v_new_credits     INTEGER;
  v_transaction_id  UUID;
BEGIN
  -- Strict caller verification: only service_role or DB superuser
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: start_generation_tx may only be executed by service_role';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'profile_not_found', 'credits', -1);
  END IF;

  IF coalesce(v_profile.credits, 0) < p_amount THEN
    RETURN jsonb_build_object('error', 'insufficient_credits', 'credits', -1);
  END IF;

  UPDATE public.profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id
  RETURNING credits INTO v_new_credits;

  INSERT INTO public.credit_transactions (user_id, amount, status, mode)
  VALUES (p_user_id, -p_amount, 'pending', p_mode)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'credits',        v_new_credits
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_generation_tx(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_generation_tx(UUID, INTEGER, TEXT) TO service_role;


-- 2. commit_generation_tx
CREATE OR REPLACE FUNCTION public.commit_generation_tx(
  p_transaction_id  UUID,
  p_user_id         UUID,
  p_product_name    TEXT,
  p_product_details TEXT,
  p_mode            TEXT,
  p_content         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
BEGIN
  -- Strict caller verification: only service_role or DB superuser
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: commit_generation_tx may only be executed by service_role';
  END IF;

  SELECT * INTO v_tx
  FROM public.credit_transactions
  WHERE id = p_transaction_id
    AND user_id = p_user_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'transaction_not_found_or_already_processed');
  END IF;

  INSERT INTO public.scripts (user_id, product_name, product_details, mode, content)
  VALUES (p_user_id, p_product_name, p_product_details, p_mode, p_content);

  UPDATE public.credit_transactions
  SET status = 'completed', updated_at = now()
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.commit_generation_tx(UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_generation_tx(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;


-- 3. refund_generation_tx
CREATE OR REPLACE FUNCTION public.refund_generation_tx(
  p_transaction_id  UUID,
  p_user_id         UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
BEGIN
  -- Strict caller verification: only service_role or DB superuser
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: refund_generation_tx may only be executed by service_role';
  END IF;

  SELECT * INTO v_tx
  FROM public.credit_transactions
  WHERE id = p_transaction_id
    AND user_id = p_user_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'transaction_not_found_or_already_processed');
  END IF;

  UPDATE public.profiles
  SET credits = credits + ABS(v_tx.amount)
  WHERE id = p_user_id;

  UPDATE public.credit_transactions
  SET status = 'refunded', updated_at = now()
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_generation_tx(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_generation_tx(UUID, UUID) TO service_role;
