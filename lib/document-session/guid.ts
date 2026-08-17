import path from "node:path";
import { getDocsDir } from "./data-root";
import { InvalidGuidError } from "./errors";

/** UUID v4 string (RFC 4122 variant). */
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidGuid(guid: string): boolean {
  return UUID_V4_RE.test(guid);
}

export function assertValidGuid(guid: string): void {
  if (!isValidGuid(guid)) {
    throw new InvalidGuidError(guid);
  }
}

/**
 * Safe path to `{data-root}/docs/{guid}.json`.
 * Rejects malformed / traversal guids before joining.
 */
export function sessionPath(guid: string, dataRoot?: string): string {
  assertValidGuid(guid);
  const docsDir = getDocsDir(dataRoot);
  const filePath = path.join(docsDir, `${guid}.json`);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(docsDir) + path.sep)) {
    throw new InvalidGuidError(guid);
  }
  return resolved;
}
