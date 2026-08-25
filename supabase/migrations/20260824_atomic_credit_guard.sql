-- Migration: supabase/migrations/20260824_atomic_credit_guard.sql

CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits int;
  v_new_credits int;
BEGIN
  -- Lock the row for update to prevent concurrent race conditions
  SELECT credits INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  -- If deducting credits and current balance is insufficient, reject with -1
  IF p_amount < 0 AND coalesce(v_current_credits, 0) < abs(p_amount) THEN
    RETURN -1;
  END IF;

  -- Calculate new balance
  v_new_credits := greatest(0, coalesce(v_current_credits, 0) + p_amount);

  UPDATE public.profiles
  SET credits = v_new_credits
  WHERE id = p_user_id;

  RETURN v_new_credits;
END;
$$;
