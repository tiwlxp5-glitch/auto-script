-- Migration: Add check_email_exists RPC function

CREATE OR REPLACE FUNCTION check_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  );
END;
$$;

-- Grant execution to anon and authenticated users
REVOKE EXECUTE ON FUNCTION check_email_exists(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon, authenticated;
