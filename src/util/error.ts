// One home for the "unwrap an unknown catch value to a safe string" idiom (rule #12). Used by the
// Notion outbox + worker for warn-logging and for `last_error` — a MESSAGE only, never raw
// body/progress values (invariant #9).

/** The message of an `Error`, or a fixed fallback for a non-Error throw. Never the raw value. */
export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';
