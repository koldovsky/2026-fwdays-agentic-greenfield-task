-- Add the new 'ultra' paid tier to the subscriptions.plan CHECK constraint
-- (rework-subscription-plans, FR-BILLING-01). Additive only: the existing
-- 'free' / 'pro' / 'job_hunt_pass' values stay valid, so no row is invalidated
-- or lost. Rewrites the inline CHECK from 0001_init.sql (Postgres names a
-- single-column inline check <table>_<column>_check).
ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'pro', 'ultra', 'job_hunt_pass'));
