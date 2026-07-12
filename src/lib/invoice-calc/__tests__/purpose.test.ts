import { describe, expect, it } from "vitest";
import { paymentPurpose } from "@/lib/invoice-calc/purpose";

// @trace FR-CALC-06
describe("paymentPurpose (FR-CALC-06)", () => {
  it("produces the exact purpose string", () => {
    expect(paymentPurpose("2026-001", "May 03, 2026")).toBe(
      "Payment by the invoice №2026-001 from May 03, 2026"
    );
  });

  it("uses U+2116 NUMERO SIGN, not a hash or N+o", () => {
    const purpose = paymentPurpose("2026-001", "May 03, 2026");
    const numeroIndex = purpose.indexOf("№");
    expect(numeroIndex).toBeGreaterThan(-1);
    expect(purpose.codePointAt(numeroIndex)).toBe(0x21_16);
    expect(purpose).not.toContain("#");
  });
});
