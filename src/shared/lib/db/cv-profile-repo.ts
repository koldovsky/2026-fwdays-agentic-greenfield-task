// CV-profile repository (FR-CV-04/05, NFR-SEC-01). Persists a candidate's résumé:
// raw text encrypted at rest via shared/lib/crypto, normalized profile as jsonb.
// Depends only on the Queryable port — no concrete driver — and on shared/lib
// types, never on the entities layer above (FSD import rule).
import { decryptString, encryptString } from "@/shared/lib/crypto";
import type { CvProfile } from "@/shared/lib/scoring";
import type { Queryable } from "./port";

export interface CvProfileRecord {
  readonly id: string;
  readonly userId: string;
  readonly profile: CvProfile;
  readonly createdAt: string;
}

export interface SaveCvProfileInput {
  readonly userId: string;
  /** Raw résumé text — encrypted before it touches the database. */
  readonly rawText: string;
  /** Deterministic normalized profile (from entities/cv-profile). */
  readonly profile: CvProfile;
}

interface ProfileRow {
  readonly id: string;
  readonly user_id: string;
  readonly normalized: CvProfile | string;
  readonly created_at: string | Date;
}

function toRecord(row: ProfileRow): CvProfileRecord {
  const profile = typeof row.normalized === "string"
    ? (JSON.parse(row.normalized) as CvProfile)
    : row.normalized;
  const createdAt = row.created_at instanceof Date
    ? row.created_at.toISOString()
    : row.created_at;
  return { id: row.id, userId: row.user_id, profile, createdAt };
}

/**
 * Build a CV-profile repository over a {@link Queryable} and a 32-byte encryption
 * key. All CV text is AES-256-GCM encrypted on write and decrypted on read; the
 * plaintext is never sent to the database and never returned by list queries.
 */
export function createCvProfileRepo(db: Queryable, key: Buffer) {
  return {
    /** Insert a profile; returns the new record (without decrypting on the way out). */
    async save(input: SaveCvProfileInput): Promise<CvProfileRecord> {
      const encrypted = encryptString(input.rawText, key);
      const { rows } = await db.query<ProfileRow>(
        `INSERT INTO cv_profiles (user_id, encrypted_text, normalized)
         VALUES ($1, $2, $3::jsonb)
         RETURNING id, user_id, normalized, created_at`,
        [input.userId, encrypted, JSON.stringify(input.profile)],
      );
      return toRecord({ ...rows[0], normalized: input.profile });
    },

    /** All profiles for a user, newest first — normalized only, no plaintext. */
    async findByUser(userId: string): Promise<CvProfileRecord[]> {
      const { rows } = await db.query<ProfileRow>(
        `SELECT id, user_id, normalized, created_at
         FROM cv_profiles WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      );
      return rows.map(toRecord);
    },

    /**
     * Decrypt and return the raw résumé text for one profile (GDPR export, re-tailor).
     * Defense-in-depth (NFR-SEC-01, NFR-GDPR-01/02): a decrypt failure at this
     * boundary returns null rather than throwing, so a single unreadable profile
     * (e.g. a rotated key) never fails the caller. The log carries the profile id
     * ONLY — never the key, the plaintext, or the ciphertext.
     */
    async getRawText(id: string): Promise<string | null> {
      const { rows } = await db.query<{ encrypted_text: string }>(
        `SELECT encrypted_text FROM cv_profiles WHERE id = $1`,
        [id],
      );
      if (rows.length === 0) return null;
      try {
        return decryptString(rows[0].encrypted_text, key);
      } catch {
        console.error(`[cv-profile-repo] decrypt_failed profile=${id}`);
        return null;
      }
    },

    /** Delete every profile for a user; FK cascade removes dependent tailorings (FR-CV-05). */
    async deleteByUser(userId: string): Promise<void> {
      await db.query(`DELETE FROM cv_profiles WHERE user_id = $1`, [userId]);
    },
  };
}

export type CvProfileRepo = ReturnType<typeof createCvProfileRepo>;
