-- Migration: Add daily analyze quota tracking to profiles table
-- Run this in Supabase SQL Editor

-- Step 1: Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS analyze_quota_used int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_analyze_date date;

-- Step 2: Create a function to check + enforce daily analyze quota
-- This uses "Lazy Reset" — it auto-resets quota when a new day starts
CREATE OR REPLACE FUNCTION public.check_and_increment_analyze_quota(
  p_user_id uuid,
  p_tier text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_daily_limit int;
  v_today date := CURRENT_DATE;
  v_current_used int;
BEGIN
  -- Determine daily limit based on tier
  v_daily_limit := CASE
    WHEN p_tier = 'pro' THEN 20
    WHEN p_tier = 'plus' THEN 5
    ELSE 0
  END;

  -- Lock the row
  SELECT analyze_quota_used, last_analyze_date
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  -- Lazy reset: if last_analyze_date is not today, reset the counter
  IF v_profile.last_analyze_date IS NULL OR v_profile.last_analyze_date < v_today THEN
    v_current_used := 0;
  ELSE
    v_current_used := v_profile.analyze_quota_used;
  END IF;

  -- Check if limit exceeded
  IF v_current_used >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'used', v_current_used,
      'limit', v_daily_limit
    );
  END IF;

  -- Increment usage
  UPDATE public.profiles
  SET
    analyze_quota_used = v_current_used + 1,
    last_analyze_date = v_today
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'used', v_current_used + 1,
    'limit', v_daily_limit
  );
END;
$$;
