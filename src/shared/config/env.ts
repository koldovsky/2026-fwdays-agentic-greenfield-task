// Server-only environment accessors. Read lazily (never at import) so build and
// prerender don't require secrets; throw a clear error at first use if missing.

/** Postgres connection string (`DATABASE_URL`). Required by the pg adapter. */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}
