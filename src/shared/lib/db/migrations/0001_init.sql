-- Vouch initial schema (TC-STACK-05). Matches the entities in
-- docs/system-design.md §7. Portable PostgreSQL DDL — no ORM. Uses core
-- `gen_random_uuid()` (built in since PostgreSQL 13; no extension needed).
--
-- Delete semantics: every child references its owner ON DELETE CASCADE, so a
-- single `DELETE FROM users` propagates to all personal data — the backbone of
-- account delete (NFR-GDPR-02) and CV profile removal (FR-CV-05).

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE,                       -- NULL for anonymous (FR-ONBOARD-01)
  name          text,
  auth_provider text NOT NULL CHECK (auth_provider IN ('anonymous', 'password', 'google')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cv_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_text text NOT NULL,                    -- AES-256-GCM envelope (NFR-SEC-01)
  normalized     jsonb NOT NULL,                   -- { skills, sentences }
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cv_profiles_user_id_idx ON cv_profiles(user_id);

CREATE TABLE job_descriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_descriptions_user_id_idx ON job_descriptions(user_id);

CREATE TABLE tailorings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cv_profile_id       uuid NOT NULL REFERENCES cv_profiles(id) ON DELETE CASCADE,
  job_description_id  uuid NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  match_score         int CHECK (match_score BETWEEN 0 AND 100),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tailorings_user_id_idx ON tailorings(user_id);

CREATE TABLE checklist_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailoring_id uuid NOT NULL REFERENCES tailorings(id) ON DELETE CASCADE,
  ord          bigint GENERATED ALWAYS AS IDENTITY,  -- stable display order
  requirement  text NOT NULL,
  importance   text NOT NULL CHECK (importance IN ('must', 'nice')),
  status       text NOT NULL CHECK (status IN ('met', 'partial', 'gap', 'overclaim-risk')),
  rationale    text NOT NULL
);
CREATE INDEX checklist_items_tailoring_id_idx ON checklist_items(tailoring_id);

CREATE TABLE bullets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailoring_id uuid NOT NULL REFERENCES tailorings(id) ON DELETE CASCADE,
  ord          bigint GENERATED ALWAYS AS IDENTITY,  -- stable display order
  text         text NOT NULL,
  grounding    text NOT NULL CHECK (grounding IN ('met', 'partial', 'overclaim', 'manual')),
  included     boolean NOT NULL DEFAULT true
);
CREATE INDEX bullets_tailoring_id_idx ON bullets(tailoring_id);

CREATE TABLE subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan               text NOT NULL CHECK (plan IN ('free', 'pro', 'job_hunt_pass')),
  status             text NOT NULL CHECK (status IN ('active', 'canceled', 'expired')),
  current_period_end timestamptz
);

CREATE TABLE usage_counters (
  user_id         uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tailorings_used int NOT NULL DEFAULT 0 CHECK (tailorings_used >= 0)
);
