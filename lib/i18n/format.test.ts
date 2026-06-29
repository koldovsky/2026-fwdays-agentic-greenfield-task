import { describe, it, expect } from "vitest";
import { formatDaysRemaining } from "./format";

const OVERDUE = "Прострочено";
const TODAY = "Сьогодні останній день";

describe("formatDaysRemaining (deadline-day inclusive)", () => {
  it("shows the today label when the deadline is today (0 days)", () => {
    expect(formatDaysRemaining(0, OVERDUE, TODAY)).toBe(TODAY);
  });

  it("shows overdue only for a negative count", () => {
    expect(formatDaysRemaining(-1, OVERDUE, TODAY)).toBe(OVERDUE);
  });

  it("shows a positive count with correct Ukrainian plural", () => {
    expect(formatDaysRemaining(1, OVERDUE, TODAY)).toBe("1 день залишилось");
    expect(formatDaysRemaining(3, OVERDUE, TODAY)).toBe("3 дні залишилось");
    expect(formatDaysRemaining(5, OVERDUE, TODAY)).toBe("5 днів залишилось");
  });
});
