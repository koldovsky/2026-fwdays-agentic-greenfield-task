import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getContactsDir,
  type ContactRef,
  type StoreOptions,
} from "../document-session";
import { ContactNotFoundError, InvalidContactError } from "./errors";

const CONTACT_FIELDS = [
  "full-name",
  "inn",
  "phone",
  "acc",
  "bank",
  "mfo-bank",
  "addr",
] as const satisfies ReadonlyArray<keyof ContactRef>;

/** Reject empty inn and path-unsafe characters used as filename keys. */
export function isSafeInn(inn: string): boolean {
  if (!inn) return false;
  if (inn.includes("/") || inn.includes("\\")) return false;
  if (inn.includes("..")) return false;
  if (inn.includes("\0")) return false;
  return true;
}

export function contactPath(inn: string, dataRoot?: string): string {
  return path.join(getContactsDir(dataRoot), `${inn}.json`);
}

function trimField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalize and validate a contact payload. All FR-10 fields must be
 * non-empty after trim; `inn` must be a safe filename key.
 */
export function normalizeContact(input: unknown): ContactRef {
  if (input === null || typeof input !== "object") {
    throw new InvalidContactError("Contact body must be an object");
  }
  const raw = input as Record<string, unknown>;
  const contact = {} as ContactRef;

  for (const field of CONTACT_FIELDS) {
    const value = trimField(raw[field]);
    if (!value) {
      throw new InvalidContactError(`Contact field "${field}" is required`);
    }
    contact[field] = value;
  }

  if (!isSafeInn(contact.inn)) {
    throw new InvalidContactError(
      `Invalid contact inn (РНОКПП): ${contact.inn}`,
    );
  }

  return contact;
}

async function writeJsonAtomic(
  filePath: string,
  data: ContactRef,
): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmpPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  try {
    await writeFile(tmpPath, payload, "utf8");
    await rename(tmpPath, filePath);
  } catch (error) {
    await unlink(tmpPath).catch(() => undefined);
    throw error;
  }
}

export async function putContact(
  contact: unknown,
  options: StoreOptions = {},
): Promise<ContactRef> {
  const normalized = normalizeContact(contact);
  await writeJsonAtomic(contactPath(normalized.inn, options.dataRoot), normalized);
  return normalized;
}

export async function getContact(
  inn: string,
  options: StoreOptions = {},
): Promise<ContactRef> {
  const trimmed = inn.trim();
  if (!isSafeInn(trimmed)) {
    throw new InvalidContactError(`Invalid contact inn (РНОКПП): ${inn}`);
  }
  try {
    const raw = await readFile(contactPath(trimmed, options.dataRoot), "utf8");
    return normalizeContact(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error instanceof InvalidContactError) throw error;
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new ContactNotFoundError(trimmed);
    }
    throw error;
  }
}

export async function listContacts(
  options: StoreOptions & { q?: string } = {},
): Promise<ContactRef[]> {
  const dir = getContactsDir(options.dataRoot);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw error;
  }

  const contacts: ContactRef[] = [];
  for (const name of names) {
    if (!name.endsWith(".json") || name.startsWith(".")) continue;
    const inn = name.slice(0, -".json".length);
    if (!isSafeInn(inn)) continue;
    try {
      contacts.push(await getContact(inn, options));
    } catch {
      // Skip unreadable / invalid files
    }
  }

  contacts.sort((a, b) => a.inn.localeCompare(b.inn));

  const q = options.q?.trim().toLowerCase();
  if (!q) return contacts;

  return contacts.filter(
    (c) =>
      c.inn.toLowerCase().includes(q) ||
      c["full-name"].toLowerCase().includes(q),
  );
}

export { getContactsDir };
