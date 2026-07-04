export const TENNIS_COURTS = ["East Court", "West Court"] as const;

export type TennisCourt = (typeof TENNIS_COURTS)[number];

function formatTime12(hour24: number, minute: number): string {
  const period = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/** Full MHOA tennis slot schedule 9:00 AM – 9:45 PM (BC-MHOA-TENNIS-08). */
export function generateTennisSlotLabels(): string[] {
  const labels: string[] = [];
  let startMinutes = 9 * 60;
  const lastEnd = 21 * 60 + 45;

  while (startMinutes + 45 <= lastEnd) {
    const endMinutes = startMinutes + 45;
    const sh = Math.floor(startMinutes / 60);
    const sm = startMinutes % 60;
    const eh = Math.floor(endMinutes / 60);
    const em = endMinutes % 60;
    labels.push(`${formatTime12(sh, sm)}-${formatTime12(eh, em)}`);
    startMinutes = endMinutes;
  }

  return labels;
}

export const TENNIS_SLOT_LABELS = generateTennisSlotLabels();

export type CourtAvailability = {
  court: TennisCourt;
  slots: string[];
};

export type AvailabilityResult =
  | {
      status: "ok";
      date: string;
      courts: CourtAvailability[];
      fetchedAt: string;
      stub: boolean;
    }
  | {
      status: "error";
      date: string;
      reason: string;
      fetchedAt: string;
    };

/** Parse end time from MHOA slot label e.g. "9:00 AM-9:45 AM". */
export function parseSlotEndMinutes(label: string): number | null {
  const match = label.match(/-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (match[3].toUpperCase() === "PM" && hour < 12) hour += 12;
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export function slotsAreConsecutive(current: string, next: string): boolean {
  const end = parseSlotEndMinutes(current);
  const start = parseSlotStartMinutes(next);
  return end !== null && start !== null && end === start;
}

/** Next slot on the same court whose start equals `current` end time. */
export function nextConsecutiveSlot(courtSlots: string[], current: string): string | null {
  const end = parseSlotEndMinutes(current);
  if (end === null) return null;
  return courtSlots.find((s) => parseSlotStartMinutes(s) === end) ?? null;
}

/** Consecutive run of `count` slots starting at `startSlot` (same court). */
export function consecutiveRunFrom(
  courtSlots: string[],
  startSlot: string,
  count: number,
  blockedSlots: Set<string> = new Set(),
): string[] {
  if (count < 1 || !courtSlots.includes(startSlot) || blockedSlots.has(startSlot)) {
    return [];
  }

  const run: string[] = [startSlot];
  let current = startSlot;

  for (let i = 1; i < count; i++) {
    const next = nextConsecutiveSlot(courtSlots, current);
    if (!next || blockedSlots.has(next)) return [];
    run.push(next);
    current = next;
  }

  return run;
}

/** Slots that can start a consecutive run of `count` on one court. */
export function filterSlotsStartingConsecutiveRun(
  courtSlots: string[],
  count: number,
  blockedSlots: Set<string> = new Set(),
): string[] {
  if (count <= 1) return courtSlots.filter((s) => !blockedSlots.has(s));
  return courtSlots.filter(
    (slot) =>
      !blockedSlots.has(slot) &&
      consecutiveRunFrom(courtSlots, slot, count, blockedSlots).length === count,
  );
}

export function filterAvailabilityForGroup(
  availability: AvailabilityResult,
  participantCount: number,
  activeIdx: number,
  blockedByCourt: Map<string, Set<string>>,
): AvailabilityResult {
  if (availability.status !== "ok" || participantCount <= 1) return availability;

  const remaining = participantCount - activeIdx;
  if (remaining <= 1) return availability;

  return {
    ...availability,
    courts: availability.courts.map((court) => ({
      ...court,
      slots: filterSlotsStartingConsecutiveRun(
        court.slots,
        remaining,
        blockedByCourt.get(court.court) ?? new Set(),
      ),
    })),
  };
}

export type AggregatedSlotRun = {
  startSlot: string;
  label: string;
  run: string[];
};

/** Combined label: start of first slot → end of last slot in the run. */
export function formatAggregatedSlotLabel(run: string[]): string {
  if (run.length === 0) return "";
  if (run.length === 1) return run[0]!;
  const first = run[0]!;
  const last = run[run.length - 1]!;
  const startMatch = first.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  const endMatch = last.match(/-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if (startMatch && endMatch) return `${startMatch[1]} - ${endMatch[1]}`;
  return `${first} (+${run.length - 1} more)`;
}

export function listAggregatedSlotRuns(
  courtSlots: string[],
  count: number,
  blockedSlots: Set<string> = new Set(),
): AggregatedSlotRun[] {
  return filterSlotsStartingConsecutiveRun(courtSlots, count, blockedSlots).map((startSlot) => {
    const run = consecutiveRunFrom(courtSlots, startSlot, count, blockedSlots);
    return { startSlot, label: formatAggregatedSlotLabel(run), run };
  });
}

export function buildAggregatedSlotLabels(
  availability: AvailabilityResult,
  participantCount: number,
  activeIdx: number,
  blockedByCourt: Map<string, Set<string>>,
): Partial<Record<TennisCourt, Record<string, string>>> {
  if (availability.status !== "ok" || participantCount <= 1) return {};

  const remaining = participantCount - activeIdx;
  if (remaining <= 1) return {};

  const labels: Partial<Record<TennisCourt, Record<string, string>>> = {};
  for (const court of availability.courts) {
    const blocked = blockedByCourt.get(court.court) ?? new Set();
    const runs = listAggregatedSlotRuns(court.slots, remaining, blocked);
    labels[court.court] = Object.fromEntries(runs.map((r) => [r.startSlot, r.label]));
  }
  return labels;
}

/** Label for an assigned consecutive group (multi-participant). */
export function formatAssignmentBlock(assignments: { slot: { slot: string } }[]): string | null {
  if (assignments.length === 0) return null;
  const run = assignments.map((a) => a.slot.slot);
  return formatAggregatedSlotLabel(run);
}

/** Parse start time from MHOA slot label e.g. "9:00 AM-9:45 AM". */
export function parseSlotStartMinutes(label: string): number | null {
  const match = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (match[3].toUpperCase() === "PM" && hour < 12) hour += 12;
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export function slotInWindow(
  label: string,
  windowStart: string,
  windowEnd: string,
): boolean {
  const start = parseSlotStartMinutes(label);
  if (start === null) return false;
  const [wsH, wsM] = windowStart.split(":").map(Number);
  const [weH, weM] = windowEnd.split(":").map(Number);
  const windowStartMin = wsH * 60 + wsM;
  const windowEndMin = weH * 60 + weM;
  return start >= windowStartMin && start < windowEndMin;
}

export function pickDefaultSlot(
  courts: CourtAvailability[],
  windowStart: string,
  windowEnd: string,
  preferredCourt: string | null,
): { court: TennisCourt; slot: string } | null {
  const order = preferredCourt
    ? ([preferredCourt, ...TENNIS_COURTS.filter((c) => c !== preferredCourt)] as string[])
    : [...TENNIS_COURTS];

  for (const courtName of order) {
    const court = courts.find((c) => c.court === courtName);
    if (!court) continue;
    const inWindow = court.slots.filter((s) => slotInWindow(s, windowStart, windowEnd));
    if (inWindow.length > 0) return { court: court.court, slot: inWindow[0] };
  }

  for (const court of courts) {
    if (court.slots.length > 0) return { court: court.court, slot: court.slots[0] };
  }
  return null;
}

function stubSlots(): string[] {
  return TENNIS_SLOT_LABELS;
}

export function stubTennisAvailability(date: string): AvailabilityResult {
  return {
    status: "ok",
    date,
    courts: TENNIS_COURTS.map((court) => ({
      court,
      slots: court === "West Court" ? stubSlots().slice(1) : stubSlots(),
    })),
    fetchedAt: new Date().toISOString(),
    stub: true,
  };
}
