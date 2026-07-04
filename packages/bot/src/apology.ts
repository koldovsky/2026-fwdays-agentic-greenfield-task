// @kamerton/bot — Telegram-send-failure apology (tasks.md 5.3, design.md
// Decision 3, `@trace NFR-REL-01`). Mirrors `packages/agent/src/apology.ts`'s
// own convention (itself mirroring S1 `slots/propose.ts`'s
// `CALENDAR_UNAVAILABLE_APOLOGY`): the apology constant is placed next to
// the failure it apologizes for, not in a generic shared file, and both
// `packages/bot`'s and `packages/agent`'s apology constants are plain
// string literals — no LLM call is ever needed to apologize.
//
// Real content shipped in this red round — same "no behaviour to stub"
// precedent named in `copy.ts`'s own header above. The genuinely red half
// this task owes is `pipeline.test.ts`'s behavioural assertion (not in this
// file): `handleUpdate()` sends THIS constant on a RETRIED `sendMessage`
// call when the FIRST attempt to send the turn's real reply throws — the
// lead's turn is not lost (its state was already persisted before the send
// was even attempted; only the outbound Telegram call failed).
export const TELEGRAM_SEND_FAILURE_APOLOGY: string =
  "Вибачте, повідомлення не вдалося надіслати одразу. Спробуємо ще раз за мить — усе, що ви вже написали, вже збережено і нікуди не зникло.";
