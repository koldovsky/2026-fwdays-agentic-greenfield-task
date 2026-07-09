// @kamerton/bot — bot-owned copy (tasks.md 5.3, design.md Decision 3's
// colocation rule: `@kamerton/lib/src/intake/copy.ts` is committed and
// byte-identical-protected for the guardrail copy a parallel slice-pass
// owns; bot-layer text that is NOT an apology-for-a-failure — and so does
// not belong in `apology.ts` either — lives here instead).
//
// Plain string literal, real content shipped in this red round — the same
// "no behaviour to fake" precedent as S1 `slots/propose.ts`'s
// `CALENDAR_UNAVAILABLE_APOLOGY`, S2 `lib/src/intake/copy.ts`'s guardrail
// constants, and `packages/agent/src/apology.ts`'s
// `ANTHROPIC_UNAVAILABLE_APOLOGY`: a constant has nothing for a throwing
// stub to meaningfully hollow out. `copy.test.ts`'s content-shape
// assertions are therefore legitimately green immediately, same as those
// precedents' own red rounds — the genuinely red half this task owes is
// `pipeline.test.ts`'s BEHAVIOURAL assertion (not in this file): that
// `handleUpdate()` actually sends a reply containing this notice on a
// brand-new lead's very first turn (`@trace NFR-PRIV-02`).

/**
 * The one-line Anthropic-processing notice `pipeline.ts` appends to the
 * very first reply a brand-new lead ever receives — once per lead, on the
 * turn that creates their `leads` row (`@trace NFR-PRIV-02`, spec.md intake
 * §"data & privacy": "the greeting SHALL carry a one-line notice that
 * messages are processed via the Anthropic API"). Kind, factual, a
 * disclosure rather than a marketing line — no exclamation marks, no
 * pressure vocabulary (BC-BRAND-01, DESIGN.md voice rules).
 */
export const ANTHROPIC_PROCESSING_NOTICE: string =
  "Зауважте: ваші повідомлення тут обробляє асистент на основі штучного інтелекту Anthropic Claude.";

/**
 * A deterministic, kind Ukrainian acknowledgement used ONLY when a turn's
 * own reply would otherwise be empty — a bare tool-use model response with
 * no accompanying text (notably `cancel_request`), or a button-callback tap
 * this pipeline's own wire-format mapping does not recognise (tasks.md 5.4
 * green half). A lead must never receive an empty Telegram message; this is
 * this module's own fallback, never a substitute for the model's real
 * narration when one exists. No exclamation marks, no pressure vocabulary
 * (BC-BRAND-01).
 */
export const EMPTY_NARRATION_FALLBACK_COPY: string = "Дякую, я це записала.";

/**
 * booking-hitl design.md Decision 2 (tasks.md C.5): the deterministic reply
 * for a `"slot:<n>"` callback tap that successfully holds a slot
 * (`HoldStorePort.holdSlot` resolves `{status:"held"}`) — a warm
 * confirmation-of-hold, never claiming the lesson itself is confirmed
 * (`@trace FR-GUARD-01`: only the dashboard's decision route may ever say
 * that). No exclamation marks, no pressure vocabulary (BC-BRAND-01).
 */
export const HOLD_CONFIRMATION_COPY: string =
  "Дякуємо, утримали цей час для вас. Повідомимо, щойно адміністратор прийме рішення.";

/**
 * booking-hitl design.md Decision 2 (tasks.md C.5): the kind nudge sent when
 * a `"slot:<n>"` callback tap loses a fresh hold-race
 * (`HoldStorePort.holdSlot` resolves `{status:"collision"}`) — baseline
 * `slots` spec's own hold-race scenario. No exclamation marks, no pressure
 * vocabulary (BC-BRAND-01) — never "останнє місце"/"тільки сьогодні"/
 * "поспішайте".
 */
export const SLOT_COLLISION_NUDGE_COPY: string =
  "На жаль, цей час щойно зайняли. Оберіть, будь ласка, інший варіант зі списку нижче.";

/**
 * The reply that ACCOMPANIES a freshly-offered set of slot chips (a turn whose
 * `propose_slots` applied). It replaces the `PROFILE_COMPLETE_CLOSING_COPY`
 * "we'll come back with a proposal" text, which contradicts buttons shown in
 * the same message — here the proposal IS in the message. A tap holds the slot
 * for the administrator's decision; this copy never claims the lesson is
 * itself confirmed (`@trace FR-GUARD-01`) and carries no pressure vocabulary
 * (BC-BRAND-01).
 */
export const SLOTS_OFFER_COPY: string =
  "Дякую, профіль зібрано. Ось вільні варіанти часу — оберіть зручний, і я утримаю його до підтвердження адміністратором:";
