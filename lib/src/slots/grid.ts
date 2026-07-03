// TYPED THROWING STUB — red state for tasks.md section 2. The signature and
// types below are the contract pinned by grid.test.ts; the body is
// implemented in tasks.md section 3 (3.1). No logic lives here yet.
//
// Framework-free pure core (TC-PURE-01): no Date.now(), no I/O, no SDKs.

/**
 * One 60-minute grid slot in Europe/Kyiv wall-clock LOCAL time.
 * `start`/`end` are fixed-width, zero-padded "YYYY-MM-DDTHH:mm" strings —
 * no UTC offset, no "Z" (design.md Decision 3: lib/ never touches a
 * timezone library; fixed width makes lexicographic order chronological).
 * A slot occupies the half-open interval [start, end) (Decision 4).
 */
export interface Slot {
  start: string;
  end: string;
}

/**
 * Deterministic Mon–Fri grid generator (FR-SLOT-01, FR-GUARD-03,
 * BC-SCHEDULE-01): 60-minute slots, starts 10:00–19:00 inclusive
 * Europe/Kyiv wall-clock, never Saturday/Sunday.
 *
 * @param from  First day of the horizon, Europe/Kyiv LOCAL calendar date
 *              "YYYY-MM-DD".
 * @param days  Horizon length in calendar days (production always passes 14
 *              per the baseline spec's Conventions — explicit argument, never
 *              an implicit "today").
 */
export function generateGrid(from: string, days: number): Slot[] {
  void from;
  void days;
  throw new Error(
    "Not implemented: generateGrid (red — implemented in tasks.md section 3)",
  );
}
