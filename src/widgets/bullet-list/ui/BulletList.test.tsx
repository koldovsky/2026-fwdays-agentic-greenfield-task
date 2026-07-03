// Render tests for the bullet-list widget (jsdom project).
// Covers FR-BULLETS-01 (grounding badge) and FR-BULLETS-02 / BC-HONESTY-02
// (overclaim-risk excluded from export by default; explicit opt-in via toggle).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { applyExportDefaults, type Bullet } from "@/entities/bullet";
import { t } from "@/shared/lib/i18n";
import { BulletList } from "./BulletList";

const copy = t("ua").bullets;

// Seeded via the entity export-default rule, so state matches real usage.
const bullets: Bullet[] = applyExportDefaults([
  {
    id: "b1",
    text: "Led migration of the billing service to Postgres.",
    grounding: "grounded",
    source: { kind: "cv", sentence: "Migrated billing to Postgres over two quarters." },
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

  it("shows a CV-sourced badge for grounded bullets and an overclaim badge for overclaim-risk", () => {
    render(<BulletList bullets={bullets} onToggleInclude={vi.fn()} />);
    // Label appears twice: on the GroundingBadge and on the source line beneath it.
    expect(screen.getAllByText(copy.sourceCv).length).toBeGreaterThan(0);
    expect(screen.getByText(/немає підтверджень/i)).toBeInTheDocument();
  });

  it("labels a user-confirmed-evidence bullet distinctly from a CV-sourced one (BC-HONESTY-03)", () => {
    const wizardBullets: Bullet[] = applyExportDefaults([
      ...bullets,
      {
        id: "b3",
        text: "Mentored junior engineers on system design.",
        grounding: "grounded",
        source: {
          kind: "user-confirmed",
          question: "Чи є у вас практичний досвід з менторства",
          answer: "Так, менторив трьох джуніорів протягом року.",
        },
        includedInExport: false,
      },
    ]);

    render(<BulletList bullets={wizardBullets} onToggleInclude={vi.fn()} />);

    expect(copy.sourceUserConfirmed).not.toBe(copy.sourceCv);
    // Each label appears twice: once on the GroundingBadge, once on the source line beneath it.
    expect(screen.getAllByText(copy.sourceCv)).toHaveLength(2);
    expect(screen.getAllByText(copy.sourceUserConfirmed)).toHaveLength(2);
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
