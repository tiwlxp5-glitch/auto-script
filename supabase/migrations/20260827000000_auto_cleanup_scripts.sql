-- ============================================================
-- Migration: Auto-cleanup scripts based on user tier
-- Free  -> delete scripts older than 3 days
-- Plus  -> delete scripts older than 30 days
-- Pro   -> never delete
-- ============================================================

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create the cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_scripts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Free tier: delete scripts older than 3 days (skip favorites)
  DELETE FROM public.scripts s
  USING public.profiles p
  WHERE s.user_id = p.id
    AND p.tier = 'free'
    AND s.is_favorite = false
    AND s.created_at < NOW() - INTERVAL '3 days';

  -- Plus tier: delete scripts older than 30 days (skip favorites)
  DELETE FROM public.scripts s
  USING public.profiles p
  WHERE s.user_id = p.id
    AND p.tier = 'plus'
    AND s.is_favorite = false
    AND s.created_at < NOW() - INTERVAL '30 days';

  -- Pro tier: no deletion (keep forever)
END;
$$;

-- 3. Schedule pg_cron: run every day at 17:00 UTC (midnight Bangkok time UTC+7)
-- Unschedule old job first to prevent duplicates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-cleanup-scripts') THEN
    PERFORM cron.unschedule('auto-cleanup-scripts');
  END IF;
END;
$$;

SELECT cron.schedule(
  'auto-cleanup-scripts',
  '0 17 * * *',
  $$SELECT public.cleanup_old_scripts();$$
);
