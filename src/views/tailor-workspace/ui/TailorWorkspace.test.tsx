// Render test for the tailor-workspace view (jsdom project), FR-SHELL-01/02 +
// FR-BULLETS-02 / BC-HONESTY-02. Renders the workspace with its stub fixture and
// asserts that toggling an overclaim-risk bullet updates its included state.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TailorWorkspace } from "./TailorWorkspace";
import { tailoringFixture } from "../lib/fixture";

const overclaimBullet = tailoringFixture.bullets.find(
  (bullet) => bullet.grounding === "overclaim-risk",
)!;

describe("TailorWorkspace (FR-SHELL-01/02)", () => {
  it("renders the workspace with the fixture score", () => {
    render(<TailorWorkspace />);
    expect(screen.getByText(String(tailoringFixture.matchScore))).toBeInTheDocument();
    expect(screen.getByText(overclaimBullet.text)).toBeInTheDocument();
  });

  it("toggling an overclaim-risk bullet updates its included state", async () => {
    render(<TailorWorkspace />);
    const row = screen.getByText(overclaimBullet.text).closest("li") as HTMLElement;
    const toggle = within(row).getByRole("checkbox");

    // Seeded excluded by default (BC-HONESTY-02).
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);

    // State flip re-renders the bullet as included.
    expect(within(row).getByRole("checkbox")).toBeChecked();
  });
});
