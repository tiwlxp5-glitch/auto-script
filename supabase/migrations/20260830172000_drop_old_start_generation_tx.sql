-- 20260830172000_drop_old_start_generation_tx.sql
-- Drop the older signature of start_generation_tx to fix PGRST203 function overload error.

DROP FUNCTION IF EXISTS public.start_generation_tx(UUID, INTEGER, TEXT);