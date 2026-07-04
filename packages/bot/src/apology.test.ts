// Test-first per tasks.md 5.3 — same "plain string literal, no behaviour to
// fake" precedent as `copy.test.ts` above and `packages/agent/src/
// apology.test.ts`. Content-shape assertions on `TELEGRAM_SEND_FAILURE_
// APOLOGY` may legitimately pass immediately; the genuinely red half (that
// `pipeline.ts` actually sends this constant on a retried `sendMessage`
// call after a Telegram-send failure, `@trace NFR-REL-01`) lives in
// `pipeline.test.ts`, not here.
import { describe, expect, it } from "vitest";
import { TELEGRAM_SEND_FAILURE_APOLOGY } from "./apology.ts";

const PRESSURE_VOCABULARY = ["останнє місце", "тільки сьогодні", "поспішайте"];
const TECH_JARGON = ["api", "сервер", "помилка з'єднання"];

describe("TELEGRAM_SEND_FAILURE_APOLOGY (@trace NFR-REL-01)", () => {
  it("contains no exclamation marks and no pressure vocabulary (BC-BRAND-01)", () => {
    expect(TELEGRAM_SEND_FAILURE_APOLOGY).not.toContain("!");
    for (const phrase of PRESSURE_VOCABULARY) {
      expect(TELEGRAM_SEND_FAILURE_APOLOGY.toLowerCase()).not.toContain(phrase);
    }
  });

  it("contains no technical jargon — kind, plain Ukrainian only", () => {
    const lowered = TELEGRAM_SEND_FAILURE_APOLOGY.toLowerCase();
    for (const jargon of TECH_JARGON) {
      expect(lowered).not.toContain(jargon);
    }
  });

  it("makes clear nothing the lead wrote was lost (NFR-REL-01's own wording)", () => {
    expect(TELEGRAM_SEND_FAILURE_APOLOGY).toMatch(/збереж|нікуди не зникло/);
  });
});
