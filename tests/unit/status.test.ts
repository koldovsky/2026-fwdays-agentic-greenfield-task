import { describe, expect, it } from "vitest";
import { STATUSES, STATUS_MODIFIER, nextStatus } from "@/app/lib/status";

describe("application status progression (FR-LIST-02)", () => {
  it("defines the five stages in order", () => {
    expect(STATUSES).toEqual([
      "Збережено",
      "Подано",
      "Розглядається",
      "Рекомендовано",
      "Зараховано",
    ]);
  });

  it("advances through every stage and cycles back to the first", () => {
    expect(nextStatus("Збережено")).toBe("Подано");
    expect(nextStatus("Подано")).toBe("Розглядається");
    expect(nextStatus("Розглядається")).toBe("Рекомендовано");
    expect(nextStatus("Рекомендовано")).toBe("Зараховано");
    expect(nextStatus("Зараховано")).toBe("Збережено");
  });

  it("maps every stage to a design-system status modifier", () => {
    for (const status of STATUSES) {
      expect(STATUS_MODIFIER[status]).toBeTruthy();
    }
  });
});

// @trace FR-LIST-02
