-- Allow the new blue "info" checklist status (add-tailoring-intelligence,
-- FR-CHECKLIST-02): a requirement coverable by adjacent CV evidence, between
-- "partial" and "gap". Rewrites the inline CHECK from 0001_init.sql (Postgres
-- names a single-column inline check <table>_<column>_check).
ALTER TABLE checklist_items DROP CONSTRAINT checklist_items_status_check;
ALTER TABLE checklist_items ADD CONSTRAINT checklist_items_status_check
  CHECK (status IN ('met', 'partial', 'info', 'gap', 'overclaim-risk'));
