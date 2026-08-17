import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getDataRoot,
  readSession,
  updateSession,
  type DocType,
  type DocumentSession,
  type StoreOptions,
} from "../document-session";
import { InvalidDateError } from "./errors";
import type { DocNumberCounter } from "./types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** In-process mutex chains per year (NFR-06). */
const yearLocks = new Map<number, Promise<unknown>>();

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
    return false;
  }
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function yearFromIsoDate(date: string): number {
  if (!isValidIsoDate(date)) {
    throw new InvalidDateError(date);
  }
  return Number(date.slice(0, 4));
}

export function docNumberPath(year: number, dataRoot?: string): string {
  return path.join(getDataRoot(dataRoot), String(year), "doc_number.json");
}

function emptyCounter(year: number): DocNumberCounter {
  return {
    year,
    "last-invoice-seq": 0,
    "last-act-seq": 0,
  };
}

function formatInvoiceNumber(seq: number): string {
  return `Р-${String(seq).padStart(7, "0")}`;
}

function formatActNumber(seq: number): string {
  return String(seq);
}

function needsInvoice(docType: DocType): boolean {
  return docType === "invoice" || docType === "invoice_act";
}

function needsAct(docType: DocType): boolean {
  return docType === "act" || docType === "invoice_act";
}

async function writeJsonAtomic(
  filePath: string,
  data: DocNumberCounter,
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

export async function readOrInitCounter(
  year: number,
  options: StoreOptions = {},
): Promise<DocNumberCounter> {
  const filePath = docNumberPath(year, options.dataRoot);
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as DocNumberCounter;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      const counter = emptyCounter(year);
      await writeJsonAtomic(filePath, counter);
      return counter;
    }
    throw error;
  }
}

async function withYearLock<T>(year: number, fn: () => Promise<T>): Promise<T> {
  const previous = yearLocks.get(year) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const current = previous.then(() => gate);
  yearLocks.set(year, current);

  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (yearLocks.get(year) === current) {
      yearLocks.delete(year);
    }
  }
}

/**
 * Set session date and issue missing invoice/act numbers for the session's
 * doc-type from that year's counter file. Idempotent when numbers already set.
 */
export async function issueNumbersForSession(
  guid: string,
  date: string,
  options: StoreOptions = {},
): Promise<DocumentSession> {
  if (!isValidIsoDate(date)) {
    throw new InvalidDateError(date);
  }

  const year = yearFromIsoDate(date);

  return withYearLock(year, async () => {
    const session = await readSession(guid, options);
    const docType = session["doc-type"];
    const needInv = needsInvoice(docType);
    const needAct = needsAct(docType);
    const missingInvoice = needInv && !session["invoice-number"];
    const missingAct = needAct && !session["act-number"];

    let invoiceNumber = session["invoice-number"];
    let actNumber = session["act-number"];

    if (missingInvoice || missingAct) {
      const counter = await readOrInitCounter(year, options);
      if (missingInvoice) {
        counter["last-invoice-seq"] += 1;
        invoiceNumber = formatInvoiceNumber(counter["last-invoice-seq"]);
      }
      if (missingAct) {
        counter["last-act-seq"] += 1;
        actNumber = formatActNumber(counter["last-act-seq"]);
      }
      await writeJsonAtomic(docNumberPath(year, options.dataRoot), counter);
    }

    const patch: {
      date: string;
      "invoice-number"?: string;
      "act-number"?: string;
    } = { date };

    if (invoiceNumber !== undefined) {
      patch["invoice-number"] = invoiceNumber;
    }
    if (actNumber !== undefined) {
      patch["act-number"] = actNumber;
    }

    return updateSession(guid, patch, options);
  });
}
