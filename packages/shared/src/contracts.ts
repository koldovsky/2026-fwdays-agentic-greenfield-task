/**
 * API type contracts shared between `apps/api` (producer) and `apps/mobile`
 * (consumer). Framework-free — no Nest, Prisma, or RN imports here. These are the
 * single source of truth for request/response shapes; never duplicate them in an app.
 */

/** A single tracked time entry, owned by one user. `durationSec` is null while running. */
export interface TimeEntry {
  id: string;
  /** Owning user's id (BC-SCOPE-01). */
  userId: string;
  /** Free-text note about what the user is doing. */
  note: string;
  /** ISO 8601 start timestamp. */
  startedAt: string;
  /** ISO 8601 stop timestamp, or null while running. */
  stoppedAt: string | null;
  /** Elapsed seconds once stopped, or null while running. */
  durationSec: number | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-update timestamp. */
  updatedAt: string;
}

/** Payload to start a new timer. Starting stops any running entry first (FR-ENTRY-03). */
export interface CreateTimeEntry {
  note: string;
  /** Optional explicit start; defaults to server "now" when omitted. */
  startedAt?: string;
}

/** Payload to add a completed manual entry with explicit times (FR-ENTRY-04). */
export interface ManualTimeEntry {
  note: string;
  /** ISO 8601 start timestamp. */
  startedAt: string;
  /** ISO 8601 stop timestamp; MUST be after `startedAt`. */
  stoppedAt: string;
}

/** Payload to edit an existing entry; every field optional (FR-ENTRY-05). */
export interface UpdateTimeEntry {
  note?: string;
  /** ISO 8601 start timestamp. */
  startedAt?: string;
  /** ISO 8601 stop timestamp. */
  stoppedAt?: string;
}

/** Payload to stop a running timer. */
export interface StopTimeEntry {
  /** Optional explicit stop; defaults to server "now" when omitted. */
  stoppedAt?: string;
}

/** Aggregated total for a single day, used by the Stats screen. */
export interface DayTotal {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  totalSec: number;
}

/** Health/readiness response. */
export interface HealthStatus {
  status: 'ok';
  service: string;
  time: string;
}
