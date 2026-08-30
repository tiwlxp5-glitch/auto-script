-- 20260830154000_webhook_idempotency.sql
-- Description: Upgrades webhook_events to support state-aware idempotency.
-- Adds status and error_message columns to handle concurrent retries and failures safely.

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add a check constraint for valid statuses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'webhook_events_status_check'
    ) THEN
        ALTER TABLE public.webhook_events
            ADD CONSTRAINT webhook_events_status_check
            CHECK (status IN ('pending', 'success', 'failed'));
    END IF;
END $$;
