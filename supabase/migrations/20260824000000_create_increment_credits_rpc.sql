-- Migration: Create atomic increment_credits RPC function
-- Description: Safely increments or decrements user credits directly in PostgreSQL
-- to prevent race conditions and lost updates under concurrent requests.

CREATE OR REPLACE FUNCTION increment_credits(user_id UUID, amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_credits INT;
BEGIN
  UPDATE public.profiles
  SET credits = COALESCE(credits, 0) + amount
  WHERE id = user_id
  RETURNING credits INTO new_credits;
  
  RETURN new_credits;
END;
$$;
