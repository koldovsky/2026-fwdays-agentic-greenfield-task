-- Tailoring history (add-tailoring-history, FR-HISTORY-01, FR-TAILOR-04).
-- Additive + backward compatible: no data migration, existing rows keep their
-- values (job_title defaults NULL, cv_profile_id stays as-is).
--
-- job_title: the role extracted from the JD, shown in the history list.
-- cv_profile_id relaxed to NULL: history persists at generation time, where
-- only the structured cvProfile (not the raw CV text needed to encrypt a
-- cv_profiles row) is available. History needs the checklist/bullets/score, not
-- the CV blob (bullets already embed the grounded evidence), so the tailoring
-- is stored without a CV linkage rather than pushing encryption onto the hot
-- generation path.
ALTER TABLE tailorings ADD COLUMN job_title text;
ALTER TABLE tailorings ALTER COLUMN cv_profile_id DROP NOT NULL;
