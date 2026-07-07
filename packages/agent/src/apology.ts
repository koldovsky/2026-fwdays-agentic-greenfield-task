// @kamerton/agent — the Anthropic-call-failure apology (tasks.md 4.5,
// design.md Decision 3, `@trace NFR-REL-01`).
//
// Plain string literal, real content shipped in this red round — the same
// "no behaviour to fake" precedent as S1 `slots/propose.ts`'s
// `CALENDAR_UNAVAILABLE_APOLOGY` and S2 `lib/src/intake/copy.ts`'s
// guardrail copy constants: a constant has nothing for a throwing stub to
// meaningfully hollow out. Placed next to the failure it apologizes for
// (this package, not a generic shared file), mirroring `propose.ts`'s own
// convention (design.md Decision 3). The RED half this task actually owes
// is behavioural, not textual: `apology.test.ts` asserts `loop.ts`'s
// `runIntakeTurn()` returns THIS constant, with the input `IntakeState`
// preserved, when `ModelPort.send()` rejects — and that assertion is
// genuinely red right now, because `loop.ts` is still a throwing stub
// (tasks.md 4.4's red half, not yet green).
//
// Composed with zero I/O and zero LLM involvement — a plain string literal,
// always available even when the Anthropic API itself is down. Kind, no
// tech jargon (never "API"/"сервер"/"помилка з'єднання"), no pressure
// vocabulary (never "останнє місце"/"тільки сьогодні"/"поспішайте" —
// DESIGN.md "No pressure vocabulary"), invites the lead to try again
// shortly while making clear nothing was lost (NFR-REL-01: "preserves the
// conversation state for resumption, and never silently drops a lead
// message").
export const ANTHROPIC_UNAVAILABLE_APOLOGY: string =
  "Вибачте, зараз не вдається обробити ваше повідомлення. Спробуйте, будь ласка, написати ще раз за кілька хвилин — усе, що ви вже розповіли, нікуди не зникло, ми продовжимо з того самого місця.";

// Review-gate finding (kb-learning slice, Fix 4/MAJOR-tone): `loop.ts`'s
// shared `applyToolUse` dispatch catch used to return
// `CALENDAR_UNAVAILABLE_APOLOGY` for ANY dispatch failure, including a
// `QuestionsPort` (DB-write) failure while logging an FAQ question — telling
// a lead who merely asked a question that "the schedule is broken", which
// has nothing to do with what they did (BC-BRAND-01/BC-LANG-01 kind-tone).
// This constant is the question-logging-appropriate apology instead: kind,
// pressure-free, no exclamation, no tech jargon, and — like
// `ANTHROPIC_UNAVAILABLE_APOLOGY` — makes clear nothing was lost (NFR-REL-01:
// state preserved for resumption, the lead's message never silently
// dropped).
export const QUESTION_LOGGING_UNAVAILABLE_APOLOGY: string =
  "Вибачте, зараз не вдається зберегти ваше запитання. Спробуйте, будь ласка, написати його ще раз за кілька хвилин — усе інше, про що ми вже говорили, нікуди не зникло.";
