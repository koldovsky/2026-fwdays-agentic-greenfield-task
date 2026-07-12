import type {
  Client,
  ClientInput,
  InvoiceCustomerFields,
} from "@/types/client";

export const CLIENTS_STORAGE_KEY = "invoice-maker:clients:v1";

type ClientsStore = {
  version: 1;
  clients: Client[];
};

type Listener = () => void;

const listeners = new Set<Listener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeClients(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export class ClientValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientValidationError";
  }
}

export class ClientStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ClientStorageError";
  }
}

export class ClientNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientNotFoundError";
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringIfPresent(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isParseableIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isValidClientRecord(value: unknown): value is Client {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    isNonEmptyString(record.id) &&
    isNonEmptyString(record.name) &&
    isParseableIsoDate(record.createdAt) &&
    isParseableIsoDate(record.updatedAt) &&
    typeof record.address === "string" &&
    typeof record.email === "string" &&
    typeof record.phone === "string" &&
    typeof record.website === "string" &&
    isStringIfPresent(record.company) &&
    isStringIfPresent(record.taxId)
  );
}

function readStore(): ClientsStore {
  if (!isBrowser()) {
    return { version: 1, clients: [] };
  }

  try {
    const raw = window.localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (!raw) {
      return { version: 1, clients: [] };
    }

    const parsed = JSON.parse(raw) as {
      version?: unknown;
      clients?: unknown;
    } | null;
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.clients)
    ) {
      return { version: 1, clients: [] };
    }

    // Silently drop corrupt records instead of crashing on render.
    return { version: 1, clients: parsed.clients.filter(isValidClientRecord) };
  } catch {
    return { version: 1, clients: [] };
  }
}

function writeStore(store: ClientsStore): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    throw new ClientStorageError(
      "Failed to persist clients to browser storage.",
      { cause: error }
    );
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validateClientInput(input: ClientInput): ClientInput {
  const name = input.name.trim();
  const address = input.address.trim();
  const email = input.email.trim();

  if (!name) {
    throw new ClientValidationError("Client name is required.");
  }

  if (!address) {
    throw new ClientValidationError("Client address is required.");
  }

  if (!email) {
    throw new ClientValidationError("Client email is required.");
  }

  return {
    ...input,
    name,
    address,
    email,
    phone: input.phone.trim(),
    website: input.website.trim(),
    company: normalizeOptional(input.company),
    taxId: normalizeOptional(input.taxId),
  };
}

function sortClients(clients: Client[]): Client[] {
  return [...clients].sort(
    (left, right) =>
      Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  );
}

const EMPTY_CLIENTS: readonly Client[] = Object.freeze([]);

// Cached snapshot so useSyncExternalStore gets a reference-stable value;
// invalidated in every write path before listeners are notified.
let cachedClients: readonly Client[] | null = null;

function invalidateClientsSnapshot(): void {
  cachedClients = null;
}

export function listClients(): readonly Client[] {
  if (cachedClients === null) {
    const sorted = sortClients(readStore().clients);
    // Reuse EMPTY_CLIENTS so an empty store hydrates against the same
    // reference as the server snapshot (no extra post-hydration render).
    cachedClients = sorted.length === 0 ? EMPTY_CLIENTS : Object.freeze(sorted);
  }
  return cachedClients;
}

export function getClientsServerSnapshot(): readonly Client[] {
  return EMPTY_CLIENTS;
}

export function getClient(id: string): Client | null {
  return readStore().clients.find((client) => client.id === id) ?? null;
}

export function saveClient(input: ClientInput): Client {
  const validated = validateClientInput(input);
  const store = readStore();
  const now = new Date().toISOString();

  if (validated.id) {
    const existingIndex = store.clients.findIndex(
      (client) => client.id === validated.id
    );
    if (existingIndex === -1) {
      throw new ClientNotFoundError("Client not found.");
    }

    const existing = store.clients[existingIndex];
    const updated: Client = {
      ...existing,
      ...validated,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    store.clients[existingIndex] = updated;
    writeStore(store);
    invalidateClientsSnapshot();
    notifyListeners();
    return updated;
  }

  const created: Client = {
    ...validated,
    id: createId(),
    createdAt: now,
    updatedAt: now,
  };
  store.clients.push(created);
  writeStore(store);
  invalidateClientsSnapshot();
  notifyListeners();
  return created;
}

export function deleteClient(id: string): boolean {
  const store = readStore();
  const nextClients = store.clients.filter((client) => client.id !== id);

  if (nextClients.length === store.clients.length) {
    return false;
  }

  writeStore({ version: 1, clients: nextClients });
  invalidateClientsSnapshot();
  notifyListeners();
  return true;
}

export function clientToInvoiceCustomerFields(
  client: Client
): InvoiceCustomerFields {
  return {
    customerName: client.company
      ? `${client.name} (${client.company})`
      : client.name,
    customerAddress1: client.address,
    customerEmail: client.email,
    customerPhone: client.phone,
    customerWebsite: client.website,
  };
}

/** Test helper: reset the cached snapshot so the next read hits storage. */
export function __resetClientsCacheForTests(): void {
  invalidateClientsSnapshot();
}
