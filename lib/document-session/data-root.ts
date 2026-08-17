import path from "node:path";

const DEFAULT_DATA_ROOT = "./data";

/**
 * Resolves the configurable data root (env `DATA_ROOT`, default `./data`).
 * Relative paths are resolved against `process.cwd()` (NFR-12).
 */
export function getDataRoot(override?: string): string {
  const raw = override ?? process.env.DATA_ROOT ?? DEFAULT_DATA_ROOT;
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

/** `{data-root}/docs` — session JSON directory. */
export function getDocsDir(override?: string): string {
  return path.join(getDataRoot(override), "docs");
}

/** `{data-root}/contacts` — contact catalog JSON directory. */
export function getContactsDir(override?: string): string {
  return path.join(getDataRoot(override), "contacts");
}

/** `{data-root}/jobs` — jobs / services catalog directory. */
export function getJobsDir(override?: string): string {
  return path.join(getDataRoot(override), "jobs");
}

/** `{data-root}/jobs/services.json` — reusable services catalog file. */
export function getServicesCatalogPath(override?: string): string {
  return path.join(getJobsDir(override), "services.json");
}
