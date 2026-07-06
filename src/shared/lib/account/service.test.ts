// Unit tests for exportAccountData — partial-decrypt resilience (NFR-GDPR-01/02,
// NFR-SEC-01). Uses hand-rolled fakes for AccountStores so no DB or encryption
// key is required. Covers task 4.3: one profile's getRawText rejects; the export
// must still resolve with ALL profiles present, the failing one having
// rawText:null + decryptionFailed:true, the others retaining their decrypted text.
import { describe, expect, it, vi } from "vitest";

import type { AccountUser, ExportedCvProfile } from "./service";
import { exportAccountData } from "./service";

// -----------------------------------------------------------------------
// Shared fixtures
// -----------------------------------------------------------------------

const USER: AccountUser = {
  id: "u1",
  email: "test@example.com",
  name: "Test User",
  createdAt: "2026-07-01T00:00:00.000Z",
};

const PROFILE_A = {
  id: "p1",
  createdAt: "2026-07-01T00:00:00.000Z",
  profile: { skills: ["react"], sentences: ["Built an API"] },
};
const PROFILE_B = {
  id: "p2",
  createdAt: "2026-07-02T00:00:00.000Z",
  profile: { skills: ["node"], sentences: ["Deployed a service"] },
};

const RAW_A = "Ada — React engineer";
const RAW_B = "Ada — Node engineer";

// -----------------------------------------------------------------------
// Helper: build an AccountStores with controlled per-profile getRawText.
// -----------------------------------------------------------------------

function makeStores({
  profiles = [PROFILE_A, PROFILE_B],
  getRawTextImpl,
}: {
  profiles?: typeof PROFILE_A[];
  getRawTextImpl: (id: string) => Promise<string | null>;
}) {
  return {
    users: {
      findById: vi.fn(async (id: string) => (id === USER.id ? USER : null)),
      deleteById: vi.fn(async () => {}),
    },
    cvProfiles: {
      findByUser: vi.fn(async () => profiles),
      getRawText: vi.fn(getRawTextImpl),
    },
    tailorings: {
      listByUser: vi.fn(async () => []),
      findById: vi.fn(async () => null),
    },
  };
}

// -----------------------------------------------------------------------
// Task 4.3 tests
// -----------------------------------------------------------------------

describe("exportAccountData — partial-decrypt resilience (NFR-GDPR-01/02, NFR-SEC-01)", () => {
  it("resolves with ALL profiles when one getRawText rejects", async () => {
    // PROFILE_A (p1) throws; PROFILE_B (p2) succeeds.
    const stores = makeStores({
      getRawTextImpl: async (id) => {
        if (id === PROFILE_A.id) throw new Error("decrypt_error: auth tag mismatch");
        return RAW_B;
      },
    });

    const result = await exportAccountData(stores, USER.id);

    expect(result).not.toBeNull();
    // Both profiles must appear — the failing one does not drop from the export.
    expect(result?.cvProfiles).toHaveLength(2);
  });

  it("marks the failing profile with rawText:null and decryptionFailed:true", async () => {
    const stores = makeStores({
      getRawTextImpl: async (id) => {
        if (id === PROFILE_A.id) throw new Error("decrypt_error");
        return RAW_B;
      },
    });

    const result = await exportAccountData(stores, USER.id);

    const failing = result?.cvProfiles.find((p) => p.id === PROFILE_A.id);
    expect(failing).toBeDefined();
    expect(failing?.rawText).toBeNull();
    expect(failing?.decryptionFailed).toBe(true);
  });

  it("preserves the raw text for profiles that decrypt successfully", async () => {
    const stores = makeStores({
      getRawTextImpl: async (id) => {
        if (id === PROFILE_A.id) throw new Error("decrypt_error");
        return RAW_B;
      },
    });

    const result = await exportAccountData(stores, USER.id);

    const succeeding = result?.cvProfiles.find((p) => p.id === PROFILE_B.id);
    expect(succeeding?.rawText).toBe(RAW_B);
    expect(succeeding?.decryptionFailed).toBeUndefined();
  });

  it("does not set decryptionFailed on profiles that decrypt successfully", async () => {
    const stores = makeStores({
      getRawTextImpl: async (id) => {
        if (id === PROFILE_A.id) throw new Error("decrypt_error");
        return RAW_B;
      },
    });

    const result = await exportAccountData(stores, USER.id);

    for (const p of result?.cvProfiles ?? []) {
      if (p.id !== PROFILE_A.id) {
        // A successful profile must not carry the decryptionFailed flag at all.
        expect((p as ExportedCvProfile).decryptionFailed).toBeUndefined();
      }
    }
  });

  it("the export promise itself never rejects when a profile decrypt fails", async () => {
    const stores = makeStores({
      getRawTextImpl: async () => {
        throw new Error("always fails");
      },
    });

    // Must resolve (not reject) even when every profile decrypt throws.
    await expect(exportAccountData(stores, USER.id)).resolves.not.toBeNull();
  });

  it("handles multiple simultaneous profile failures gracefully", async () => {
    const stores = makeStores({
      getRawTextImpl: async () => {
        throw new Error("key rotated");
      },
    });

    const result = await exportAccountData(stores, USER.id);

    expect(result?.cvProfiles).toHaveLength(2);
    for (const p of result?.cvProfiles ?? []) {
      expect(p.rawText).toBeNull();
      expect(p.decryptionFailed).toBe(true);
    }
  });

  it("preserves the profile structural data (id, createdAt, profile) even on decrypt failure", async () => {
    const stores = makeStores({
      getRawTextImpl: async (id) => {
        if (id === PROFILE_A.id) throw new Error("key error");
        return RAW_B;
      },
    });

    const result = await exportAccountData(stores, USER.id);

    const failing = result?.cvProfiles.find((p) => p.id === PROFILE_A.id);
    expect(failing?.id).toBe(PROFILE_A.id);
    expect(failing?.createdAt).toBe(PROFILE_A.createdAt);
    expect(failing?.profile).toEqual(PROFILE_A.profile);
  });

  it("does not include the internal error message in any exported field (NFR-SEC-01)", async () => {
    const secretError = "CV_ENCRYPTION_KEY_VALUE=abc123secret";
    const stores = makeStores({
      getRawTextImpl: async () => {
        throw new Error(secretError);
      },
    });

    const result = await exportAccountData(stores, USER.id);

    // Serialize the whole export and check no internal detail leaked through.
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(secretError);
    expect(serialized).not.toContain("abc123secret");
  });
});

describe("exportAccountData — non-failure baseline", () => {
  it("returns null for an unknown user", async () => {
    const stores = makeStores({ getRawTextImpl: async () => RAW_A });
    const result = await exportAccountData(stores, "unknown-user-id");
    expect(result).toBeNull();
  });

  it("exports clean profiles when all decryptions succeed", async () => {
    const stores = makeStores({
      getRawTextImpl: async (id) => (id === PROFILE_A.id ? RAW_A : RAW_B),
    });

    const result = await exportAccountData(stores, USER.id);

    expect(result?.cvProfiles).toHaveLength(2);
    for (const p of result?.cvProfiles ?? []) {
      expect(p.rawText).not.toBeNull();
      expect(p.decryptionFailed).toBeUndefined();
    }
  });
});
