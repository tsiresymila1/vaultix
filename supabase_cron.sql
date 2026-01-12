-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule a job to run every 10 minutes
-- This job deletes shared secrets that are expired OR have 0 views remaining
SELECT cron.schedule(
  'cleanup-expired-secrets', -- unique name of the job
  '*/10 * * * *',           -- cron schedule (every 10 m)
  $$ DELETE FROM shared_secrets WHERE expires_at < NOW() OR (views_remaining IS NOT NULL AND views_remaining <= 0) $$
);
