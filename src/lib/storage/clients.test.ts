import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientInput } from "@/types/client";
import {
  __resetClientsCacheForTests,
  CLIENTS_STORAGE_KEY,
  ClientNotFoundError,
  ClientStorageError,
  ClientValidationError,
  clientToInvoiceCustomerFields,
  deleteClient,
  getClient,
  listClients,
  saveClient,
  subscribeClients,
} from "@/lib/storage/clients";

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

function buildClientInput(overrides: Partial<ClientInput> = {}): ClientInput {
  return {
    name: "Acme Corp",
    address: "вул. Хрещатик, 1, Київ",
    email: "billing@acme.example",
    phone: "+380501112233",
    website: "https://acme.example",
    ...overrides,
  };
}

describe("clients storage", () => {
  let idCounter = 0;

  beforeEach(() => {
    idCounter = 0;
    const storage = createLocalStorageMock();

    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("crypto", {
      randomUUID: () => `client-test-id-${++idCounter}`,
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T10:00:00.000Z"));
    __resetClientsCacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // @trace FR-CLIENT-01, FR-CLIENT-02
  // `getClient(id)).toEqual(created)` is a strict round-trip over every stored
  // field (required and optional), and the body exercises create/read/update/
  // delete against browser storage.
  it("creates, reads, updates, and deletes clients", () => {
    const created = saveClient(buildClientInput());
    expect(created.id).toBe("client-test-id-1");
    expect(getClient(created.id)).toEqual(created);

    vi.setSystemTime(new Date("2026-07-10T11:00:00.000Z"));
    const updated = saveClient({
      ...created,
      name: "Acme Updated",
      phone: "+380509998877",
    });
    expect(updated.name).toBe("Acme Updated");
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).not.toBe(created.updatedAt);

    expect(deleteClient(created.id)).toBe(true);
    expect(getClient(created.id)).toBeNull();
    expect(deleteClient(created.id)).toBe(false);
  });

  it("lists clients sorted by updatedAt descending", () => {
    const older = saveClient(
      buildClientInput({
        name: "Older Client",
        email: "older@example.com",
      })
    );

    vi.setSystemTime(new Date("2026-07-10T12:00:00.000Z"));
    const newer = saveClient(
      buildClientInput({
        name: "Newer Client",
        email: "newer@example.com",
      })
    );

    expect(listClients().map((client) => client.id)).toEqual([
      newer.id,
      older.id,
    ]);
  });

  // @trace FR-CLIENT-01
  it("rejects saves without required fields", () => {
    expect(() => saveClient(buildClientInput({ name: "   " }))).toThrow(
      ClientValidationError
    );
    expect(() => saveClient(buildClientInput({ address: "" }))).toThrow(
      ClientValidationError
    );
    expect(() => saveClient(buildClientInput({ email: " " }))).toThrow(
      ClientValidationError
    );
  });

  // @trace FR-CLIENT-03
  it("maps client fields to invoice customer placeholders", () => {
    const client = saveClient(
      buildClientInput({
        name: "Олена Коваль",
        company: "Acme LLC",
      })
    );

    expect(clientToInvoiceCustomerFields(client)).toEqual({
      customerName: "Олена Коваль (Acme LLC)",
      customerAddress1: client.address,
      customerEmail: client.email,
      customerPhone: client.phone,
      customerWebsite: client.website,
    });
  });

  it("falls back to an empty store when stored JSON is corrupt", () => {
    window.localStorage.setItem(CLIENTS_STORAGE_KEY, "{not valid json");

    expect(listClients()).toEqual([]);
  });

  it("drops invalid records from a version-1 store instead of crashing", () => {
    const valid = {
      id: "client-valid",
      name: "Valid Client",
      address: "вул. Хрещатик, 1, Київ",
      email: "valid@example.com",
      phone: "",
      website: "",
      createdAt: "2026-07-10T09:00:00.000Z",
      updatedAt: "2026-07-10T09:00:00.000Z",
    };
    const missingRequiredFields = {
      id: "client-missing-fields",
      name: "Incomplete Client",
      createdAt: "2026-07-10T09:00:00.000Z",
      updatedAt: "2026-07-10T09:00:00.000Z",
    };
    window.localStorage.setItem(
      CLIENTS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        clients: [
          null,
          valid,
          { id: "", name: 7 },
          missingRequiredFields,
          {
            ...valid,
            id: "client-bad-date",
            createdAt: "not-a-date",
            updatedAt: "2026-07-10T09:00:00.000Z",
          },
        ],
      })
    );

    expect(listClients()).toEqual([valid]);
  });

  it("treats an unknown store version as empty", () => {
    window.localStorage.setItem(
      CLIENTS_STORAGE_KEY,
      JSON.stringify({ version: 2, clients: [{ id: "x", name: "X" }] })
    );

    expect(listClients()).toEqual([]);
  });

  it("throws ClientStorageError and does not notify listeners when persistence fails", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
        removeItem: () => undefined,
        clear: () => undefined,
      },
    });

    const listener = vi.fn();
    const unsubscribe = subscribeClients(listener);

    expect(() => saveClient(buildClientInput())).toThrow(ClientStorageError);
    try {
      saveClient(buildClientInput());
    } catch (error) {
      expect(error).toBeInstanceOf(ClientStorageError);
      expect((error as ClientStorageError).cause).toBeInstanceOf(Error);
      expect(((error as ClientStorageError).cause as Error).message).toBe(
        "QuotaExceededError"
      );
    }
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("throws ClientNotFoundError when saving with an id missing from the store", () => {
    expect(() =>
      saveClient(buildClientInput({ id: "missing-client-id" }))
    ).toThrow(ClientNotFoundError);
    expect(listClients()).toEqual([]);
  });

  it("returns a reference-stable snapshot until data changes", () => {
    const first = listClients();
    expect(listClients()).toBe(first);

    saveClient(buildClientInput());

    const second = listClients();
    expect(second).not.toBe(first);
    expect(listClients()).toBe(second);
  });
});
