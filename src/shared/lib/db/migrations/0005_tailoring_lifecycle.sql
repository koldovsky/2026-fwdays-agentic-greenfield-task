-- Tailoring lifecycle (persist-tailoring-lifecycle, FR-TAILOR-04, FR-HISTORY-01/02,
-- NFR-OBS-01, NFR-COST-02). Additive + backward compatible.
--
-- A tailoring is now persisted at generation START as a `pending` row and moved
-- to `complete` or `failed` on the terminal lifecycle event, so an in-flight or
-- crashed run leaves a durable trace and the free-tier cap cannot be probed by
-- intentionally abandoned runs. The status column also lets the history list
-- surface only completed tailorings.
--
-- DEFAULT 'pending' keeps the migration additive (no NOT NULL without a default);
-- the CHECK constrains the enum in the database, not just the app. Every row that
-- existed before this migration was a completed save (the old `save` wrote only on
-- completion), so they are back-filled to 'complete'.
ALTER TABLE tailorings ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'failed'));
UPDATE tailorings SET status = 'complete';
