// Deterministic guardrail copy (design.md Decision 3: "guardrail copy is
// code, never the model", the same rule `intake/copy.ts` already applies).
// These are plain string literals/composers — zero I/O, zero LLM
// involvement. Unlike the throwing stubs elsewhere in this slice's red
// round, there is no behavior to fake here beyond fixed text — same
// precedent as `intake/copy.ts`'s own header comment and S1's
// `slots/propose.ts` CALENDAR_UNAVAILABLE_APOLOGY, both of which shipped
// real content in the SAME commit as their red test round (task A.8). This
// file's tests (A.7) may therefore legitimately pass immediately; that is
// expected, not a red-discipline violation, because no BEHAVIOR is being
// pinned, only fixed copy content against a content-shape rubric.
//
// Voice rules enforced by copy.test.ts (FR-HITL-02, BC-BRAND-01,
// BC-LANG-01): Ukrainian, kind, pressure-free. The confirmation is the ONLY
// message that may carry at most one exclamation mark and the single
// sanctioned 🎵 emoji — decline and re-proposal messages carry neither.

/** A slot's Kyiv wall-clock local `start`, `"YYYY-MM-DDTHH:mm"` — the same
 *  shape `../slots/grid.ts`'s `Slot` uses. Declared locally (not imported)
 *  so this copy module needs only the one field every composer reads. */
export interface CopySlot {
  start: string;
}

/** Splits a Kyiv wall-clock local `start` into a Ukrainian-readable
 *  `"DD.MM.YYYY"` date and its verbatim `"HH:mm"` time. */
function formatDateTime(start: string): { date: string; time: string } {
  const [datePart, timePart] = start.split("T");
  const [year, month, day] = (datePart ?? "").split("-");
  return { date: `${day}.${month}.${year}`, time: timePart ?? "" };
}

/**
 * Confirmation message with the exact date and time (FR-HITL-02, baseline
 * spec.md "Confirmation message with date and time"). The ONLY composer
 * that may carry an exclamation mark / the sanctioned 🎵 — exactly one of
 * each, no other emoji.
 */
export function composeConfirmationMessage(slot: CopySlot): string {
  const { date, time } = formatDateTime(slot.start);
  return `Гарні новини: ваше заняття підтверджено на ${date} о ${time}. До зустрічі 🎵`;
}

/**
 * The kind refusal that leaves the door open (FR-HITL-02, baseline spec.md
 * "Decline message is a kind refusal with the door open"). No exclamation
 * marks, no emoji.
 */
export const DECLINE_COPY: string =
  "На жаль, цей час нам не підходить. Будемо раді бачити вас знову — напишіть нам, коли буде зручно, і ми підберемо інший варіант.";

/**
 * Presents the administrator's suggested slot(s) as a new proposal
 * (FR-HITL-02, baseline spec.md "Propose-another-time message carries the
 * admin's slots"). No exclamation marks, no emoji.
 */
export function composeReProposalMessage(slots: CopySlot[]): string {
  const list = slots
    .map((slot) => {
      const { date, time } = formatDateTime(slot.start);
      return `${date} о ${time}`;
    })
    .join(", ");
  return `На жаль, попередній час не підійшов, тож ми пропонуємо інший: ${list}. Оберіть зручний варіант, і ми запишемо вас.`;
}
