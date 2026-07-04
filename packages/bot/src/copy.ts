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
