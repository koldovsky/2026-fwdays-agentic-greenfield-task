import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DetailModal } from "@/app/components/planner/DetailModal";
import { makeProfile } from "./_util";

describe("DetailModal (FR-DETAIL-01, NFR-A11Y-01)", () => {
  it("is a labelled modal dialog and focuses the close button", () => {
    render(<DetailModal programId="kma-f" profile={makeProfile()} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Закрити"));
  });

  it("shows the score total and the honesty (not-a-guarantee) sentence", () => {
    render(<DetailModal programId="kma-f" profile={makeProfile()} onClose={vi.fn()} />);
    expect(screen.getByText("Конкурсний бал")).toBeTruthy();
    expect(screen.getByText(/а не гарантія/)).toBeTruthy();
  });

  it("closes on Escape and on overlay click, but not on inner-content click", () => {
    const onClose = vi.fn();
    const { container } = render(
      <DetailModal programId="kma-f" profile={makeProfile()} onClose={onClose} />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1); // inner click ignored

    const overlay = container.querySelector(".pk-modal-overlay") as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
