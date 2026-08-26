-- Migration: Create moderation_logs table
-- Purpose: Store records of blocked or reviewed content for auditing without persisting full sensitive payload

CREATE TABLE IF NOT EXISTS public.moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    action TEXT NOT NULL CHECK (action IN ('allow', 'review', 'block')),
    matched_rule TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own logs (if needed)
CREATE POLICY "Users can view their own moderation logs"
ON public.moderation_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role bypasses RLS inherently, so we DO NOT need a policy for it.
-- Creating a policy WITHOUT a "TO" clause defaults to PUBLIC, causing a massive data leak.
-- Intentionally leaving this blank to ensure strict lock-down.

-- Index for performance on queries by user or time
CREATE INDEX IF NOT EXISTS idx_moderation_logs_user_id ON public.moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_timestamp ON public.moderation_logs(timestamp);
