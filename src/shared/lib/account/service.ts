// GDPR account service (NFR-GDPR-01/02, BC-PRIVACY-02). Pure orchestration over
// injected store ports (the db repos satisfy them; fakes satisfy them in tests).
// Export returns everything we hold on the user — including decrypted CV text,
// since the export is for the data subject themself. Deletion is a hard delete
// of the user row; the schema's ON DELETE CASCADE removes all children.
import type { CvProfile } from "@/shared/lib/scoring";

export interface AccountUser {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
  readonly createdAt: string;
}

export interface ExportedCvProfile {
  readonly id: string;
  readonly createdAt: string;
  readonly profile: CvProfile;
  /** Decrypted résumé text — the subject's own data (NFR-GDPR-01). */
  readonly rawText: string | null;
  /**
   * Set when this one profile could not be decrypted (e.g. a rotated key). The
   * export still succeeds for every other profile (NFR-GDPR-01/02). A boolean
   * flag only — no internal error detail reaches the client (NFR-SEC-01).
   */
  readonly decryptionFailed?: true;
}

export interface AccountStores {
  readonly users: {
    findById(id: string): Promise<AccountUser | null>;
    deleteById(id: string): Promise<void>;
  };
  readonly cvProfiles: {
    findByUser(userId: string): Promise<ReadonlyArray<{ id: string; createdAt: string; profile: CvProfile }>>;
    getRawText(id: string): Promise<string | null>;
  };
  readonly tailorings: {
    listByUser(userId: string): Promise<ReadonlyArray<{ id: string }>>;
    findById(id: string): Promise<unknown | null>;
  };
}

export interface AccountExport {
  readonly exportedAt: string;
  readonly user: AccountUser;
  readonly cvProfiles: readonly ExportedCvProfile[];
  readonly tailorings: readonly unknown[];
}

/** Everything stored for `userId` as one JSON-serializable object; null if the user does not exist. */
export async function exportAccountData(
  stores: AccountStores,
  userId: string,
): Promise<AccountExport | null> {
  const user = await stores.users.findById(userId);
  if (user === null) return null;

  const profiles = await stores.cvProfiles.findByUser(userId);
  const cvProfiles: ExportedCvProfile[] = [];
  for (const p of profiles) {
    // One profile's decrypt failure (e.g. rotated key) must never fail the whole
    // export — the subject still gets everything else (NFR-GDPR-01/02). The log
    // carries the profile id + a stable code ONLY: never the key, the CV
    // plaintext, or the ciphertext (NFR-SEC-01).
    try {
      cvProfiles.push({
        id: p.id,
        createdAt: p.createdAt,
        profile: p.profile,
        rawText: await stores.cvProfiles.getRawText(p.id),
      });
    } catch {
      console.error(`[account/export] decrypt_failed profile=${p.id}`);
      cvProfiles.push({
        id: p.id,
        createdAt: p.createdAt,
        profile: p.profile,
        rawText: null,
        decryptionFailed: true,
      });
    }
  }

  const summaries = await stores.tailorings.listByUser(userId);
  const tailorings: unknown[] = [];
  for (const s of summaries) {
    const full = await stores.tailorings.findById(s.id);
    if (full !== null) tailorings.push(full);
  }

  return { exportedAt: new Date().toISOString(), user, cvProfiles, tailorings };
}

/** Hard-delete the account; children go via FK cascade (NFR-GDPR-02: immediate, well within 24 h). */
export async function deleteAccount(stores: AccountStores, userId: string): Promise<void> {
  await stores.users.deleteById(userId);
}
