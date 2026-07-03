import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Comparison } from "@/app/components/planner/Comparison";
import { makeProfile } from "./_util";

describe("Comparison (FR-COMPARE-01, FR-UX-01)", () => {
  it("renders the table and a recommendation for 2+ selections", () => {
    render(<Comparison profile={makeProfile({ compare: ["kma-f", "hnu-p"] })} />);
    expect(screen.getByText("Шанс")).toBeTruthy();
    expect(screen.getByText("96 % · Надійно")).toBeTruthy();
    expect(screen.getByText("Гуртожиток")).toBeTruthy();
    // Higher-chance option (ХНУ, ~96 %) is named as priority 1.
    expect(screen.getByText(/ХНУ ім. Каразіна.*пріоритет/)).toBeTruthy();
  });

  it("shows the empty state with fewer than 2 selections", () => {
    render(<Comparison profile={makeProfile({ compare: ["kma-f"] })} />);
    expect(screen.getByText("Поки порівнювати нема що")).toBeTruthy();
  });
});
