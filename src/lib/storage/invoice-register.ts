import {
  INVOICE_STATUSES,
  type InvoiceRecord,
  type InvoiceRecordInput,
  type InvoiceSnapshot,
  type InvoiceStatus,
} from "@/types/invoice-record";

export const INVOICE_REGISTER_STORAGE_KEY = "invoice-maker:invoices:v1";

type InvoiceStore = {
  version: 1;
  invoices: InvoiceRecord[];
};

type Listener = () => void;

const listeners = new Set<Listener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeInvoices(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export class InvoiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceValidationError";
  }
}

export class InvoiceStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "InvoiceStorageError";
  }
}

export class InvoiceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceNotFoundError";
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  // Shape AND true calendar validity: reconstruct the date and require the
  // components to round-trip, so overflow days (2026-02-30, 2026-04-31) that
  // Date.parse silently rolls over are rejected, not just impossible months.
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// createdAt/updatedAt are full ISO timestamps, not YYYY-MM-DD; validate them the
// way clients.ts validates its date fields (parseable), not merely non-empty.
function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isStatus(value: unknown): value is InvoiceStatus {
  return (
    typeof value === "string" &&
    (INVOICE_STATUSES as readonly string[]).includes(value)
  );
}

function isSnapshot(value: unknown): value is InvoiceSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const s = value as Record<string, unknown>;
  const isObject = (v: unknown) =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  const t = s.termsText as Record<string, unknown> | null | undefined;
  return (
    isObject(s.supplier) &&
    isObject(s.customer) &&
    Array.isArray(s.serviceRows) &&
    isObject(s.totals) &&
    isObject(s.termsText) &&
    // termsText is concretely typed { en: string; ua: string } — validate it as
    // such, not just as an object, to match the deep date validation.
    typeof t?.en === "string" &&
    typeof t?.ua === "string"
  );
}

function isValidRecord(value: unknown): value is InvoiceRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isNonEmptyString(record.id) &&
    isNonEmptyString(record.invoiceNumber) &&
    isStatus(record.status) &&
    isIsoDate(record.issueDateIso) &&
    isIsoDate(record.paymentDeadlineIso) &&
    isSnapshot(record.snapshot) &&
    isIsoTimestamp(record.createdAt) &&
    isIsoTimestamp(record.updatedAt)
  );
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `invoice-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Read localStorage fresh on every operation so a write from another tab is
// never lost to a stale in-memory copy (matches clients.ts).
function readStore(): InvoiceStore {
  if (!isBrowser()) {
    return { version: 1, invoices: [] };
  }
  try {
    const raw = window.localStorage.getItem(INVOICE_REGISTER_STORAGE_KEY);
    if (!raw) {
      return { version: 1, invoices: [] };
    }
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      invoices?: unknown;
    } | null;
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.invoices)
    ) {
      return { version: 1, invoices: [] };
    }
    // Drop corrupt records instead of crashing on render.
    return { version: 1, invoices: parsed.invoices.filter(isValidRecord) };
  } catch {
    return { version: 1, invoices: [] };
  }
}

function writeStore(store: InvoiceStore): void {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(
      INVOICE_REGISTER_STORAGE_KEY,
      JSON.stringify(store)
    );
  } catch (error) {
    throw new InvoiceStorageError(
      "Failed to persist the invoice register to browser storage.",
      { cause: error }
    );
  }
}

function sortByUpdatedDesc(invoices: InvoiceRecord[]): InvoiceRecord[] {
  return [...invoices].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  );
}

const EMPTY_INVOICES: readonly InvoiceRecord[] = Object.freeze([]);

// Reference-stable snapshot for useSyncExternalStore; invalidated in every
// write path before listeners are notified.
let cachedInvoices: readonly InvoiceRecord[] | null = null;

function invalidateSnapshot(): void {
  cachedInvoices = null;
}

function persist(store: InvoiceStore): void {
  // Persist FIRST: a failed write must not leave a phantom record in memory.
  writeStore(store);
  invalidateSnapshot();
  notifyListeners();
}

function nowIso(): string {
  return new Date().toISOString();
}

// Returns a normalized input (trimmed invoice number) so padded values are not
// persisted, mirroring validateClientInput in clients.ts.
function validateInput(input: InvoiceRecordInput): InvoiceRecordInput {
  const invoiceNumber = input.invoiceNumber?.trim() ?? "";
  if (!invoiceNumber) {
    throw new InvoiceValidationError("Invoice number is required.");
  }
  if (!isStatus(input.status)) {
    throw new InvoiceValidationError(
      `Status must be one of ${INVOICE_STATUSES.join(", ")}.`
    );
  }
  if (!isIsoDate(input.issueDateIso)) {
    throw new InvoiceValidationError("Issue date must be an ISO date (YYYY-MM-DD).");
  }
  if (!isIsoDate(input.paymentDeadlineIso)) {
    throw new InvoiceValidationError(
      "Payment deadline must be an ISO date (YYYY-MM-DD)."
    );
  }
  if (!isSnapshot(input.snapshot)) {
    throw new InvoiceValidationError("A full invoice snapshot is required.");
  }
  return { ...input, invoiceNumber };
}

export function listInvoices(): readonly InvoiceRecord[] {
  if (cachedInvoices === null) {
    // Deep-freeze the cached snapshot so the list path has the same read
    // isolation as getInvoice (which re-parses per call): a consumer cannot
    // mutate a nested snapshot field and pollute the shared cache.
    const sorted = sortByUpdatedDesc(readStore().invoices).map(deepFreeze);
    cachedInvoices =
      sorted.length === 0 ? EMPTY_INVOICES : Object.freeze(sorted);
  }
  return cachedInvoices;
}

export function getInvoicesServerSnapshot(): readonly InvoiceRecord[] {
  return EMPTY_INVOICES;
}

export function getInvoice(id: string): InvoiceRecord | null {
  // readStore() re-parses localStorage, so the returned record is a fresh value
  // a caller may edit without touching the persisted register.
  return readStore().invoices.find((invoice) => invoice.id === id) ?? null;
}

export function saveInvoice(input: InvoiceRecordInput): InvoiceRecord {
  const validated = validateInput(input);
  const store = readStore();
  const timestamp = nowIso();

  if (validated.id) {
    const existingIndex = store.invoices.findIndex(
      (invoice) => invoice.id === validated.id
    );
    if (existingIndex === -1) {
      throw new InvoiceNotFoundError(
        `Cannot update invoice ${input.id}: not found in the register.`
      );
    }
    const previous = store.invoices[existingIndex];
    const updated: InvoiceRecord = {
      ...previous,
      invoiceNumber: validated.invoiceNumber,
      status: validated.status,
      issueDateIso: validated.issueDateIso,
      paymentDeadlineIso: validated.paymentDeadlineIso,
      // FR-REG-03: store a value copy so a later directory edit to the
      // caller's source object cannot reach into the stored record.
      snapshot: clone(validated.snapshot),
      updatedAt: timestamp,
    };
    store.invoices[existingIndex] = updated;
    persist(store);
    return updated;
  }

  const created: InvoiceRecord = {
    id: createId(),
    invoiceNumber: validated.invoiceNumber,
    status: validated.status,
    issueDateIso: validated.issueDateIso,
    paymentDeadlineIso: validated.paymentDeadlineIso,
    snapshot: clone(validated.snapshot),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.invoices.push(created);
  persist(store);
  return created;
}

export function setInvoiceStatus(
  id: string,
  status: InvoiceStatus
): InvoiceRecord {
  if (!isStatus(status)) {
    throw new InvoiceValidationError(
      `Status must be one of ${INVOICE_STATUSES.join(", ")}.`
    );
  }
  const store = readStore();
  const index = store.invoices.findIndex((invoice) => invoice.id === id);
  if (index === -1) {
    throw new InvoiceNotFoundError(
      `Cannot set status on invoice ${id}: not found in the register.`
    );
  }
  const updated: InvoiceRecord = {
    ...store.invoices[index],
    status,
    updatedAt: nowIso(),
  };
  store.invoices[index] = updated;
  persist(store);
  return updated;
}

export function deleteInvoice(id: string): boolean {
  const store = readStore();
  const invoices = store.invoices.filter((invoice) => invoice.id !== id);
  if (invoices.length === store.invoices.length) {
    return false;
  }
  persist({ version: 1, invoices });
  return true;
}

/**
 * FR-REG-02: `overdue` is derived for display and never stored. ISO
 * `YYYY-MM-DD` strings compare lexicographically = chronologically, so this
 * needs no Date math and carries no timezone hazard. Pass a `YYYY-MM-DD`
 * `todayIso` (not a full timestamp) so a same-day deadline is not overdue.
 */
export function deriveOverdue(record: InvoiceRecord, todayIso: string): boolean {
  // Normalize to YYYY-MM-DD so a caller passing a full ISO timestamp
  // (e.g. new Date().toISOString()) does not flag a same-day deadline overdue.
  return (
    record.status === "sent" && record.paymentDeadlineIso < todayIso.slice(0, 10)
  );
}

export function __resetInvoiceCacheForTests(): void {
  invalidateSnapshot();
}
