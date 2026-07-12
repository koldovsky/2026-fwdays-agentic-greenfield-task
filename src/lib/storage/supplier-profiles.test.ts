import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { SupplierProfile, SupplierProfileInput } from "@/types/supplier";
import {
  SUPPLIER_PROFILES_STORAGE_KEY,
  SupplierProfileStorageError,
  __clearStoreForTests,
  __seedRawStoreForTests,
  getActiveProfile,
  getActiveProfileId,
  getProfile,
  getServerActiveProfileId,
  getServerProfilesSnapshot,
  listProfiles,
  removeProfile,
  saveProfile,
  setActiveProfile,
  subscribeSupplierProfiles,
} from "@/lib/storage/supplier-profiles";

const validInput: SupplierProfileInput = {
  label: "Test FOP",
  nameEn: "Test Supplier LLC",
  nameUa: "Тестовий постачальник",
  addressEn: "1 Test Street, Kyiv",
  addressUa: "вул. Тестова, 1, Київ",
  taxId: "0000000000",
  bankName: "Test Bank",
  swift: "TESTUA2X",
  ibanUsd: "UA213223130000026007233566001",
  ibanEur: "UA903223130000026007233566020",
};

const validRecord: SupplierProfile = {
  ...validInput,
  id: "profile-seeded-1",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function createStorageMock() {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  } satisfies Storage;
}

describe("supplier-profiles storage", () => {
  let storage: Storage;
  let randomUUIDMock: Mock<() => string>;

  beforeEach(() => {
    storage = createStorageMock();
    randomUUIDMock = vi.fn(() => "profile-uuid-1");
    vi.stubGlobal("window", {
      localStorage: storage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("crypto", {
      randomUUID: randomUUIDMock,
    });
    __clearStoreForTests();
  });

  afterEach(() => {
    __clearStoreForTests();
    vi.unstubAllGlobals();
  });

  it("starts empty", () => {
    expect(listProfiles()).toEqual([]);
    expect(getActiveProfile()).toBeNull();
  });

  it("saves a new profile and lists it", () => {
    const saved = saveProfile(validInput);

    expect(saved.id).toBe("profile-uuid-1");
    expect(saved.nameEn).toBe(validInput.nameEn);
    expect(listProfiles()).toHaveLength(1);
    expect(getProfile(saved.id)?.ibanEur).toBe(validInput.ibanEur);
  });

  it("sets first saved profile as active automatically", () => {
    const saved = saveProfile(validInput);

    expect(getActiveProfileId()).toBe(saved.id);
    expect(getActiveProfile()?.id).toBe(saved.id);
  });

  it("returns a reference-stable getActiveProfile snapshot until the store changes", () => {
    saveProfile(validInput);

    const first = getActiveProfile();
    const second = getActiveProfile();

    expect(first).toBe(second);
  });

  it("keeps the active profile unchanged when a second profile is created", () => {
    const first = saveProfile(validInput);
    randomUUIDMock.mockReturnValueOnce("profile-uuid-2");

    const second = saveProfile({
      ...validInput,
      label: "Second",
      nameEn: "Second LLC",
    });

    expect(second.id).toBe("profile-uuid-2");
    expect(getActiveProfileId()).toBe(first.id);
  });

  it("edits an existing profile", () => {
    const saved = saveProfile(validInput);
    randomUUIDMock.mockReturnValueOnce("profile-uuid-2");

    const updated = saveProfile({
      ...validInput,
      id: saved.id,
      nameEn: "Updated Supplier LLC",
      bankName: "Updated Bank",
    });

    expect(updated.id).toBe(saved.id);
    expect(updated.nameEn).toBe("Updated Supplier LLC");
    expect(updated.bankName).toBe("Updated Bank");
    expect(listProfiles()).toHaveLength(1);
  });

  it("switches active profile", () => {
    const first = saveProfile(validInput);
    randomUUIDMock.mockReturnValueOnce("profile-uuid-2");
    const second = saveProfile({ ...validInput, label: "Second", nameEn: "Second LLC" });

    setActiveProfile(second.id);

    expect(getActiveProfileId()).toBe(second.id);
    expect(getActiveProfile()?.nameEn).toBe("Second LLC");
    expect(getProfile(first.id)?.nameEn).toBe(validInput.nameEn);
  });

  it("deletes a non-active profile", () => {
    const first = saveProfile(validInput);
    randomUUIDMock.mockReturnValueOnce("profile-uuid-2");
    const second = saveProfile({ ...validInput, label: "Second", nameEn: "Second LLC" });

    setActiveProfile(first.id);
    removeProfile(second.id);

    expect(listProfiles()).toHaveLength(1);
    expect(getActiveProfileId()).toBe(first.id);
  });

  it("reassigns active pointer when active profile is deleted", () => {
    const first = saveProfile(validInput);
    randomUUIDMock.mockReturnValueOnce("profile-uuid-2");
    const second = saveProfile({ ...validInput, label: "Second", nameEn: "Second LLC" });

    setActiveProfile(first.id);
    removeProfile(first.id);

    expect(listProfiles()).toHaveLength(1);
    expect(getActiveProfileId()).toBe(second.id);
  });

  it("clears active pointer when last profile is deleted", () => {
    const saved = saveProfile(validInput);
    removeProfile(saved.id);

    expect(listProfiles()).toEqual([]);
    expect(getActiveProfileId()).toBeNull();
    expect(getActiveProfile()).toBeNull();
  });

  it("persists across reload simulation via storage mock", () => {
    const saved = saveProfile(validInput);
    setActiveProfile(saved.id);

    const raw = storage.getItem(SUPPLIER_PROFILES_STORAGE_KEY);
    expect(raw).toBeTruthy();

    __clearStoreForTests();
    expect(listProfiles()).toEqual([]);

    __seedRawStoreForTests(raw!);

    expect(listProfiles()).toHaveLength(1);
    expect(getActiveProfile()?.id).toBe(saved.id);
    expect(getProfile(saved.id)?.swift).toBe(validInput.swift);
  });

  it("rejects save when required fields are empty", () => {
    expect(() =>
      saveProfile({ ...validInput, taxId: "   " })
    ).toThrow(/ІПН/);
  });

  it("persists swift uppercased and ibans uppercased without inner whitespace", () => {
    const saved = saveProfile({
      ...validInput,
      swift: " testua2x ",
      ibanUsd: "ua21 3223 1300 0002 6007 2335 6600 1",
      ibanEur: "\tua903223130000026007233566020",
    });

    expect(saved.swift).toBe("TESTUA2X");
    expect(saved.ibanUsd).toBe("UA213223130000026007233566001");
    expect(saved.ibanEur).toBe("UA903223130000026007233566020");
    expect(getProfile(saved.id)?.swift).toBe("TESTUA2X");
    expect(getProfile(saved.id)?.ibanUsd).toBe("UA213223130000026007233566001");
    expect(getProfile(saved.id)?.ibanEur).toBe("UA903223130000026007233566020");
  });

  it("falls back to an empty store when stored JSON is corrupt", () => {
    __seedRawStoreForTests("{not valid json");

    expect(listProfiles()).toEqual([]);
    expect(getActiveProfileId()).toBeNull();
  });

  it("falls back to an empty store on an unknown envelope version", () => {
    __seedRawStoreForTests(
      JSON.stringify({ version: 2, activeProfileId: null, profiles: [validRecord] })
    );

    expect(listProfiles()).toEqual([]);
    expect(getActiveProfileId()).toBeNull();
  });

  // @trace FR-BANK-02
  // `toEqual([validRecord])` is a STRICT object comparison over the full nine
  // -field set (nameEn/nameUa/addressEn/addressUa/taxId/bankName/swift/ibanUsd
  // /ibanEur). Drop any one of them from the storage round-trip and this fails.
  // It is the only test in this suite that proves field-set completeness; the
  // save/edit tests assert a subset only.
  it("drops invalid records and keeps valid ones", () => {
    __seedRawStoreForTests(
      JSON.stringify({
        version: 1,
        activeProfileId: validRecord.id,
        profiles: [null, "garbage", { id: 42 }, { ...validRecord, taxId: 123 }, validRecord],
      })
    );

    expect(listProfiles()).toEqual([validRecord]);
    expect(getActiveProfileId()).toBe(validRecord.id);
  });

  it("clears an active pointer that references no surviving profile", () => {
    __seedRawStoreForTests(
      JSON.stringify({
        version: 1,
        activeProfileId: "ghost-id",
        profiles: [validRecord],
      })
    );

    expect(getActiveProfileId()).toBeNull();
    expect(getActiveProfile()).toBeNull();
    expect(listProfiles()).toHaveLength(1);
  });

  it("throws SupplierProfileStorageError and skips notification when setItem fails", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSupplierProfiles(listener);
    vi.mocked(storage.setItem).mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => saveProfile(validInput)).toThrow(SupplierProfileStorageError);
    expect(listener).not.toHaveBeenCalled();
    expect(listProfiles()).toEqual([]);

    unsubscribe();
  });

  it("notifies subscribers after successful writes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSupplierProfiles(listener);

    const saved = saveProfile(validInput);
    expect(listener).toHaveBeenCalledTimes(1);

    setActiveProfile(saved.id);
    expect(listener).toHaveBeenCalledTimes(2);

    removeProfile(saved.id);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
  });

  it("throws when setting an unknown profile active", () => {
    saveProfile(validInput);

    expect(() => setActiveProfile("missing-id")).toThrow(
      SupplierProfileStorageError
    );
  });

  it("throws when editing a profile id that no longer exists", () => {
    saveProfile(validInput);

    expect(() => saveProfile({ ...validInput, id: "missing-id" })).toThrow(
      SupplierProfileStorageError
    );
  });

  it("throws when removing an unknown profile id", () => {
    saveProfile(validInput);

    expect(() => removeProfile("missing-id")).toThrow(
      SupplierProfileStorageError
    );
  });

  it("returns a reference-stable profiles snapshot between writes", () => {
    saveProfile(validInput);

    const first = listProfiles();
    expect(listProfiles()).toBe(first);

    randomUUIDMock.mockReturnValueOnce("profile-uuid-2");
    saveProfile({ ...validInput, label: "Second", nameEn: "Second LLC" });

    const second = listProfiles();
    expect(second).not.toBe(first);
    expect(listProfiles()).toBe(second);
  });

  it("serves a stable frozen empty server snapshot", () => {
    expect(getServerProfilesSnapshot()).toBe(getServerProfilesSnapshot());
    expect(getServerProfilesSnapshot()).toEqual([]);
    expect(Object.isFrozen(getServerProfilesSnapshot())).toBe(true);
    expect(getServerActiveProfileId()).toBeNull();
  });
});
