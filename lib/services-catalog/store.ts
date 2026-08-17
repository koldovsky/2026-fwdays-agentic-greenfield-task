import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getServicesCatalogPath,
  type ServiceLine,
  type StoreOptions,
} from "../document-session";
import { InvalidServiceError } from "./errors";

/** Catalog entry: names required; amount/price optional last-used hints. */
export type CatalogServiceEntry = {
  "sign-name": string;
  "service-name": string;
  amount?: number;
  price?: number;
};

function trimField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalNumber(
  value: unknown,
  field: "amount" | "price",
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) {
    throw new InvalidServiceError(`Service field "${field}" must be a finite number`);
  }
  if (field === "amount" && !(n > 0)) {
    throw new InvalidServiceError(`Service field "amount" must be greater than zero`);
  }
  if (field === "price" && n < 0) {
    throw new InvalidServiceError(`Service field "price" must be greater than or equal to zero`);
  }
  return n;
}

/**
 * Normalize a catalog entry. `sign-name` and `service-name` are required;
 * `amount` / `price` are optional hints when present.
 */
export function normalizeCatalogEntry(input: unknown): CatalogServiceEntry {
  if (input === null || typeof input !== "object") {
    throw new InvalidServiceError("Service entry must be an object");
  }
  const raw = input as Record<string, unknown>;
  const signName = trimField(raw["sign-name"]);
  const serviceName = trimField(raw["service-name"]);
  if (!signName) {
    throw new InvalidServiceError('Service field "sign-name" is required');
  }
  if (!serviceName) {
    throw new InvalidServiceError('Service field "service-name" is required');
  }

  const entry: CatalogServiceEntry = {
    "sign-name": signName,
    "service-name": serviceName,
  };

  const amount = parseOptionalNumber(raw.amount, "amount");
  if (amount !== undefined) entry.amount = amount;

  const price = parseOptionalNumber(raw.price, "price");
  if (price !== undefined) entry.price = price;

  return entry;
}

/**
 * Normalize a document service line. All four fields are required.
 */
export function normalizeServiceLine(input: unknown): ServiceLine {
  const entry = normalizeCatalogEntry(input);
  if (entry.amount === undefined) {
    throw new InvalidServiceError('Service field "amount" is required');
  }
  if (entry.price === undefined) {
    throw new InvalidServiceError('Service field "price" is required');
  }
  return {
    "sign-name": entry["sign-name"],
    "service-name": entry["service-name"],
    amount: entry.amount,
    price: entry.price,
  };
}

export function normalizeCatalogArray(input: unknown): CatalogServiceEntry[] {
  if (!Array.isArray(input)) {
    throw new InvalidServiceError("Services catalog must be an array");
  }
  return input.map((item, index) => {
    try {
      return normalizeCatalogEntry(item);
    } catch (error) {
      if (error instanceof InvalidServiceError) {
        throw new InvalidServiceError(`Entry ${index}: ${error.message}`);
      }
      throw error;
    }
  });
}

async function writeJsonAtomic(
  filePath: string,
  data: CatalogServiceEntry[],
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

export async function readServicesCatalog(
  options: StoreOptions = {},
): Promise<CatalogServiceEntry[]> {
  const filePath = getServicesCatalogPath(options.dataRoot);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeCatalogArray(parsed);
  } catch (error) {
    if (error instanceof InvalidServiceError) throw error;
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    if (error instanceof SyntaxError) {
      throw new InvalidServiceError("Services catalog file is not valid JSON");
    }
    throw error;
  }
}

export async function writeServicesCatalog(
  services: unknown,
  options: StoreOptions = {},
): Promise<CatalogServiceEntry[]> {
  const normalized = normalizeCatalogArray(services);
  await writeJsonAtomic(
    getServicesCatalogPath(options.dataRoot),
    normalized,
  );
  return normalized;
}

/**
 * Upsert document lines into the catalog by trimmed `sign-name` (last wins).
 * Returns the merged catalog after write.
 */
export async function upsertServicesIntoCatalog(
  lines: unknown,
  options: StoreOptions = {},
): Promise<CatalogServiceEntry[]> {
  if (!Array.isArray(lines)) {
    throw new InvalidServiceError("Service lines must be an array");
  }
  if (lines.length === 0) {
    throw new InvalidServiceError("At least one service line is required");
  }

  const normalizedLines = lines.map((line, index) => {
    try {
      return normalizeServiceLine(line);
    } catch (error) {
      if (error instanceof InvalidServiceError) {
        throw new InvalidServiceError(`Line ${index}: ${error.message}`);
      }
      throw error;
    }
  });

  const catalog = await readServicesCatalog(options);
  const bySign = new Map(
    catalog.map((entry) => [entry["sign-name"], entry] as const),
  );

  for (const line of normalizedLines) {
    bySign.set(line["sign-name"], {
      "sign-name": line["sign-name"],
      "service-name": line["service-name"],
      amount: line.amount,
      price: line.price,
    });
  }

  return writeServicesCatalog([...bySign.values()], options);
}

export { getServicesCatalogPath, getJobsDir } from "../document-session";
