import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SavedList } from "@/app/components/planner/SavedList";
import { makeProfile } from "./_util";

describe("SavedList (FR-LIST-01, FR-LIST-02, FR-UX-01)", () => {
  it("renders saved rows with a clickable status badge that advances the status", () => {
    const advanceStatus = vi.fn();
    render(
      <SavedList
        profile={makeProfile({
          saved: { "kma-f": { status: "Збережено", priority: 1 } },
          advanceStatus,
        })}
        onOpen={vi.fn()}
      />,
    );
    const badge = screen.getByRole("button", { name: /Статус: Збережено/ });
    expect(badge.textContent).toContain("Збережено");
    fireEvent.click(badge);
    expect(advanceStatus).toHaveBeenCalledWith("kma-f");
  });

  it("shows the empty-list hint when nothing is saved", () => {
    render(<SavedList profile={makeProfile({ saved: {} })} onOpen={vi.fn()} />);
    expect(screen.getByText("Список порожній")).toBeTruthy();
  });
});
