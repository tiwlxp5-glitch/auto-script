-- ==============================================================================
-- Migration: Featured Reviews System
-- Created:   2026-08-31
-- Purpose:   Allow admins (role = 'admin') to curate featured 4-5 star reviews
--            to display on the public landing page via an animated marquee.
--
-- SECURITY MODEL:
--   - `is_featured` can ONLY be toggled by admins via the `toggle_feedback_featured` RPC.
--   - Regular users CANNOT modify is_featured (not in their GRANT list).
--   - The public `get_featured_feedbacks` RPC is callable by 'anon' (no login required)
--     but returns ONLY is_featured=true rows with rating>=4.
--   - display_name is fetched from profiles, NOT auth.users, for minimum data exposure.
-- ==============================================================================

-- 1. Add is_featured column to feedbacks table
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Index for fast public query (is_featured = true AND rating >= 4)
CREATE INDEX IF NOT EXISTS idx_feedbacks_featured 
  ON public.feedbacks (is_featured, rating, created_at DESC)
  WHERE is_featured = true AND rating >= 4;

-- 2. PUBLIC RPC: get_featured_feedbacks
--    Callable by 'anon' (unauthenticated landing page visitors).
--    Returns ONLY curated 4-5 star reviews. No PII exposed (no email, no user_id).
CREATE OR REPLACE FUNCTION public.get_featured_feedbacks()
RETURNS TABLE (
  rating    SMALLINT,
  comment   TEXT,
  reviewer  TEXT  -- display_name from profiles (or masked fallback)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.rating,
    f.comment,
    COALESCE(NULLIF(TRIM(p.display_name), ''), 'ผู้ใช้งาน Auto Script') AS reviewer
  FROM public.feedbacks f
  LEFT JOIN public.profiles p ON f.user_id = p.id
  WHERE f.is_featured = true
    AND f.rating >= 4
    AND f.comment IS NOT NULL
    AND TRIM(f.comment) <> ''
  ORDER BY f.created_at DESC
  LIMIT 30;
END;
$$;

-- Grant to anon AND authenticated so the landing page works for both logged-in and logged-out visitors
REVOKE ALL ON FUNCTION public.get_featured_feedbacks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_featured_feedbacks() TO anon, authenticated;

-- 3. ADMIN RPC: get_admin_feedbacks
--    Lists recent 4-5 star reviews for admin review. Returns user_id for management.
--    Protected: caller MUST have role = 'admin' in profiles.
CREATE OR REPLACE FUNCTION public.get_admin_feedbacks(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id          UUID,
  user_id     UUID,
  rating      SMALLINT,
  comment     TEXT,
  is_featured BOOLEAN,
  reviewer    TEXT,
  created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Authorization: Must be authenticated admin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF COALESCE(v_caller_role, '') <> 'admin' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Caller is not an admin';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.user_id,
    f.rating,
    f.comment,
    f.is_featured,
    COALESCE(NULLIF(TRIM(p.display_name), ''), 'ผู้ใช้งาน Auto Script') AS reviewer,
    f.created_at
  FROM public.feedbacks f
  LEFT JOIN public.profiles p ON f.user_id = p.id
  WHERE f.rating >= 4
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_feedbacks(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_feedbacks(INT, INT) TO authenticated;

-- 4. ADMIN RPC: toggle_feedback_featured
--    Atomically toggles is_featured for a specific feedback row.
--    Protected: caller MUST have role = 'admin' in profiles.
CREATE OR REPLACE FUNCTION public.toggle_feedback_featured(p_feedback_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role  TEXT;
  v_new_value    BOOLEAN;
  v_feedback_row RECORD;
BEGIN
  -- Authentication check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- Authorization check
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF COALESCE(v_caller_role, '') <> 'admin' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Caller is not an admin';
  END IF;

  -- Find the target feedback (lock row for atomicity)
  SELECT * INTO v_feedback_row
  FROM public.feedbacks
  WHERE id = p_feedback_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FEEDBACK_NOT_FOUND';
  END IF;

  -- Enforce business rule: only 4-5 star reviews can be featured
  IF v_feedback_row.rating < 4 THEN
    RAISE EXCEPTION 'INVALID_OPERATION: Only 4-5 star reviews can be featured';
  END IF;

  -- Toggle the flag
  v_new_value := NOT v_feedback_row.is_featured;

  UPDATE public.feedbacks
  SET is_featured = v_new_value
  WHERE id = p_feedback_id;

  RETURN jsonb_build_object(
    'success',     true,
    'id',          p_feedback_id,
    'is_featured', v_new_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_feedback_featured(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_feedback_featured(UUID) TO authenticated;
