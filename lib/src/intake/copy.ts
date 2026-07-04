// Deterministic guardrail copy (design.md Decision 1: "guardrail copy is
// deterministic, never model-composed"). These are plain string literals —
// zero I/O, zero LLM involvement — the same convention as
// slots/propose.ts's CALENDAR_UNAVAILABLE_APOLOGY. Unlike the throwing
// stubs elsewhere in this slice's red round, a constant has no logic to
// fake: there is nothing to defer to tasks.md 3.4's "green" half except the
// copy text itself, so it is written here directly (S1 precedent — see
// propose.ts's CALENDAR_UNAVAILABLE_APOLOGY, which shipped with its real
// text in the SAME commit as its red test round). copy.test.ts's
// content-shape assertions may therefore legitimately pass immediately;
// that is expected, not a red-discipline violation, because no behavior is
// being pinned here, only fixed text.
//
// Voice rules enforced by copy.test.ts (BC-BRAND-01, DESIGN.md): no
// exclamation marks, no scarcity/pressure vocabulary ("останнє місце",
// "тільки сьогодні", "поспішайте"), kind and pressure-free tone throughout.

/**
 * The minimum-age refusal (FR-GUARD-04, BC-AGE-01): kind, in Ukrainian,
 * names the age-4 threshold, ends with the door left open — never a
 * pressure-vocabulary "no".
 */
export const AGE_REFUSAL_COPY: string =
  "На жаль, ми починаємо заняття з 4 років — у цьому віці дітям вже цікаво й комфортно займатися вокалом. Будемо раді бачити вас знову, щойно дитині виповниться 4.";

/**
 * The voice-only scope explanation (FR-INTAKE-02, BC-SCOPE-01, BC-SCOPE-02):
 * never promises instrument lessons, explains the piano is for warm-up
 * accompaniment only, offers a voice trial as the nearest yes.
 */
export const SCOPE_EXPLANATION_COPY: string =
  "У нашій школі викладають лише вокал — фортепіано вчителька використовує виключно для акомпанементу під час розспівки, уроків гри на інструменті ми не проводимо. Натомість пропонуємо пробне заняття з вокалу — можемо його запланувати?";

/**
 * The format-unsure explanation (FR-INTAKE-02, BC-FORMAT-01, BC-PRICE-01
 * boundary — the format difference is explained without ever mentioning a
 * price, so this constant deliberately contains no digits).
 */
export const FORMAT_UNSURE_COPY: string =
  "Індивідуальні заняття — вчителька приділяє увагу лише вашій дитині, і розклад підлаштовується під вас. Групові заняття — це заняття в невеликій групі однолітків, більше спілкування та підтримки одне від одного. Що вам ближче — індивідуальний чи груповий формат?";
