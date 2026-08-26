-- Drop the dangerous public policy that allowed anyone to read/write moderation_logs
DROP POLICY IF EXISTS "Service role can manage moderation_logs" ON public.moderation_logs;
