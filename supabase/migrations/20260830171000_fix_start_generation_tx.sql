-- 20260830171000_fix_start_generation_tx.sql
-- Description: Update start_generation_tx to provide source and reference_id for universal ledger.

CREATE OR REPLACE FUNCTION public.start_generation_tx(
  p_user_id UUID,
  p_amount  INTEGER,
  p_mode    TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT gen_random_uuid()::text
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

  -- Insert into ledger with source and reference_id
  INSERT INTO public.credit_transactions (
    user_id, amount, status, mode, source, reference_id
  ) VALUES (
    p_user_id, -p_amount, 'pending', p_mode, 'ai_generation', p_reference_id
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success',        true,
    'transaction_id', v_transaction_id,
    'credits',        v_new_credits
  );
END;
$$;
