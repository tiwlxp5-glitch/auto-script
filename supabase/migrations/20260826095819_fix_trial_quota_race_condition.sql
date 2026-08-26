-- Migration: Fix Race Condition for trial_pro_remaining

CREATE OR REPLACE FUNCTION public.decrement_trial_quota(p_user_id UUID, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile RECORD;
  v_new_trial INT;
BEGIN
  -- Strict caller verification: only service_role
  IF coalesce(auth.role(), '') <> 'service_role' AND current_user <> 'service_role' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  SELECT * INTO v_profile 
  FROM public.profiles 
  WHERE id = p_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF coalesce(v_profile.trial_pro_remaining, 0) > 0 THEN
    v_new_trial := greatest(0, coalesce(v_profile.trial_pro_remaining, 0) - p_amount);
    
    UPDATE public.profiles
    SET trial_pro_remaining = v_new_trial,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;
    
    RETURN v_new_trial;
  END IF;

  RETURN coalesce(v_profile.trial_pro_remaining, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrement_trial_quota(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_trial_quota(UUID, INT) TO service_role;
