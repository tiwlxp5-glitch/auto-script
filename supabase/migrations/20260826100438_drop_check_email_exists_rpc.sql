-- Migration: Drop check_email_exists to prevent Email Enumeration vulnerability

DROP FUNCTION IF EXISTS public.check_email_exists(TEXT);
