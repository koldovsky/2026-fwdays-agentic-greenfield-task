// Render tests for the bullet-list widget (jsdom project).
// Covers FR-BULLETS-01 (grounding badge) and FR-BULLETS-02 / BC-HONESTY-02
// (overclaim-risk excluded from export by default; explicit opt-in via toggle).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { applyExportDefaults, type Bullet } from "@/entities/bullet";
import { BulletList } from "./BulletList";

// Seeded via the entity export-default rule, so state matches real usage.
const bullets: Bullet[] = applyExportDefaults([
  {
    id: "b1",
    text: "Led migration of the billing service to Postgres.",
    grounding: "grounded",
    sourceSentence: "Migrated billing to Postgres over two quarters.",
    includedInExport: false,
  },
  {
    id: "b2",
    text: "Scaled the platform to ten million daily users.",
    grounding: "overclaim-risk",
    includedInExport: false,
  },
]);

describe("BulletList", () => {
  it("renders one entry per bullet", () => {
    render(<BulletList bullets={bullets} onToggleInclude={vi.fn()} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText(bullets[0].text)).toBeInTheDocument();
    expect(screen.getByText(bullets[1].text)).toBeInTheDocument();
  });

  it("shows a grounded badge for grounded bullets and an overclaim badge for overclaim-risk", () => {
    render(<BulletList bullets={bullets} onToggleInclude={vi.fn()} />);
    // grounded -> "Підтверджено"; overclaim-risk badge -> "Немає підтверджень · …".
    expect(screen.getByText("Підтверджено")).toBeInTheDocument();
    expect(screen.getByText(/немає підтверджень/i)).toBeInTheDocument();
  });

  it("marks an overclaim-risk bullet as excluded from export by default", () => {
    render(<BulletList bullets={bullets} onToggleInclude={vi.fn()} />);
    const overclaimRow = screen.getByText(bullets[1].text).closest("li");
    expect(overclaimRow).not.toBeNull();
    const toggle = within(overclaimRow as HTMLElement).getByRole("checkbox");
    expect(toggle).not.toBeChecked();
    expect(
      within(overclaimRow as HTMLElement).getByText("Виключено з експорту"),
    ).toBeInTheDocument();
  });

  it("calls onToggleInclude with the bullet id when its toggle is clicked", async () => {
    const onToggleInclude = vi.fn();
    render(<BulletList bullets={bullets} onToggleInclude={onToggleInclude} />);
    const overclaimRow = screen.getByText(bullets[1].text).closest("li") as HTMLElement;
    await userEvent.click(within(overclaimRow).getByRole("checkbox"));
    expect(onToggleInclude).toHaveBeenCalledOnce();
    expect(onToggleInclude).toHaveBeenCalledWith("b2");
  });
});
