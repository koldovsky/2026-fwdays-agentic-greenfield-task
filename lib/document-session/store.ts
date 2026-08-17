import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDocsDir } from "./data-root";
import { InvalidGuidError, SessionNotFoundError } from "./errors";
import { assertValidGuid, sessionPath } from "./guid";
import type {
  DocType,
  DocumentSession,
  DocumentSessionPatch,
  WizardStep,
} from "./types";

export type StoreOptions = {
  dataRoot?: string;
};

const DOC_TYPES: ReadonlySet<DocType> = new Set([
  "invoice_act",
  "invoice",
  "act",
]);

export function isDocType(value: unknown): value is DocType {
  return typeof value === "string" && DOC_TYPES.has(value as DocType);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowIsoDateTime(): string {
  return new Date().toISOString();
}

async function ensureDocsDir(dataRoot?: string): Promise<string> {
  const docsDir = getDocsDir(dataRoot);
  await mkdir(docsDir, { recursive: true });
  return docsDir;
}

async function writeSessionAtomic(
  filePath: string,
  session: DocumentSession,
): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmpPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  const payload = `${JSON.stringify(session, null, 2)}\n`;
  try {
    await writeFile(tmpPath, payload, "utf8");
    await rename(tmpPath, filePath);
  } catch (error) {
    await unlink(tmpPath).catch(() => undefined);
    throw error;
  }
}

function isWizardStep(value: unknown): value is WizardStep {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 7
  );
}

export async function createSession(
  options: StoreOptions = {},
): Promise<DocumentSession> {
  await ensureDocsDir(options.dataRoot);
  const guid = randomUUID();
  const session: DocumentSession = {
    guid,
    "doc-type": "invoice_act",
    "current-step": 1,
    completed: false,
    date: todayIsoDate(),
    services: [],
    "updated-at": nowIsoDateTime(),
  };
  const filePath = sessionPath(guid, options.dataRoot);
  await writeSessionAtomic(filePath, session);
  return session;
}

export async function readSession(
  guid: string,
  options: StoreOptions = {},
): Promise<DocumentSession> {
  assertValidGuid(guid);
  const filePath = sessionPath(guid, options.dataRoot);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new SessionNotFoundError(guid);
    }
    throw error;
  }
  return JSON.parse(raw) as DocumentSession;
}

export async function updateSession(
  guid: string,
  patch: DocumentSessionPatch,
  options: StoreOptions = {},
): Promise<DocumentSession> {
  assertValidGuid(guid);
  const current = await readSession(guid, options);

  if (patch["current-step"] !== undefined && !isWizardStep(patch["current-step"])) {
    throw new Error(`Invalid current-step: ${String(patch["current-step"])}`);
  }

  if (patch["doc-type"] !== undefined && !isDocType(patch["doc-type"])) {
    throw new Error(`Invalid doc-type: ${String(patch["doc-type"])}`);
  }

  const next: DocumentSession = {
    ...current,
    ...patch,
    guid: current.guid,
    "updated-at": nowIsoDateTime(),
  };

  const filePath = sessionPath(guid, options.dataRoot);
  await writeSessionAtomic(filePath, next);
  return next;
}

/**
 * Copy business fields from source into target.
 * Omits document numbers (BC-11); preserves target guid, step, and completed.
 */
export async function copySessionFields(
  targetGuid: string,
  sourceGuid: string,
  options: StoreOptions = {},
): Promise<DocumentSession> {
  assertValidGuid(targetGuid);
  const source = await readSession(sourceGuid, options);
  const target = await readSession(targetGuid, options);

  const next: DocumentSession = {
    ...target,
    "doc-type": source["doc-type"],
    date: source.date,
    services: structuredClone(source.services),
    "copied-from": source.guid,
    "updated-at": nowIsoDateTime(),
  };

  if (source.client) {
    next.client = structuredClone(source.client);
  } else {
    delete next.client;
  }

  if (source["done-by"]) {
    next["done-by"] = structuredClone(source["done-by"]);
  } else {
    delete next["done-by"];
  }

  delete next["invoice-number"];
  delete next["act-number"];

  const filePath = sessionPath(targetGuid, options.dataRoot);
  await writeSessionAtomic(filePath, next);
  return next;
}

export async function readSessionOrNull(
  guid: string,
  options: StoreOptions = {},
): Promise<DocumentSession | null> {
  try {
    return await readSession(guid, options);
  } catch (error) {
    if (
      error instanceof SessionNotFoundError ||
      error instanceof InvalidGuidError
    ) {
      return null;
    }
    throw error;
  }
}
