CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_credits int;
  v_profile record;
BEGIN
  -- ล็อก Row ป้องกัน Concurrent Updates
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  -- รีเซ็ตเครดิตให้ลูกค้าที่เคยได้ Trial Pro ถ้าหมดเวลา 7 วัน
  IF v_profile.tier = 'free' AND now() >= v_profile.last_free_reset + interval '7 days' THEN
    v_profile.credits := 3;
    v_profile.last_free_reset := now();
  END IF;

  -- อัปเดตตาราง profiles
  UPDATE public.profiles
  SET 
    credits = greatest(0, coalesce(v_profile.credits, 0) + p_amount),
    last_free_reset = v_profile.last_free_reset,
    trial_pro_remaining = CASE 
      WHEN p_amount < 0 AND coalesce(trial_pro_remaining, 0) > 0 THEN trial_pro_remaining - 1 
      ELSE coalesce(trial_pro_remaining, 0) 
    END
  WHERE id = p_user_id
  RETURNING credits INTO v_new_credits;

  RETURN v_new_credits;
END;
$$;
