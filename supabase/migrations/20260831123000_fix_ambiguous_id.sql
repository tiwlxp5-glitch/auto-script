-- ==============================================================================
-- Migration: Fix Ambiguous ID in get_admin_feedbacks
-- Created:   2026-08-31
-- Purpose:   Qualify the 'id' column in the SELECT query to prevent collision
--            with the 'id' output column defined in RETURNS TABLE.
-- ==============================================================================

-- 3. ADMIN RPC: get_admin_feedbacks
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

  -- FIX: Use public.profiles.id to avoid ambiguity with output column 'id'
  SELECT role INTO v_caller_role FROM public.profiles WHERE public.profiles.id = auth.uid();
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
