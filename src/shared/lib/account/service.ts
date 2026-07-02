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
    cvProfiles.push({
      id: p.id,
      createdAt: p.createdAt,
      profile: p.profile,
      rawText: await stores.cvProfiles.getRawText(p.id),
    });
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
