// @vitest-environment jsdom
// apps/dashboard/components/ds/RequestCard — dashboard tasks.md §6.5.
// Includes the FOCUSED oversized-content test the task explicitly calls
// for: a multi-thousand-character field must not grow the card's own
// bounding region, must not force a horizontal scrollbar, and its full
// text must stay reachable (present in the DOM, scrollable), while the
// card's other fields and its `DecisionBar` remain visible
// (baseline spec's "Multi-thousand-character answer on the request card"
// scenario).
//
// jsdom does not run a real layout engine (no computed pixel box model
// from CSS classes), so "does not grow the bounding box" is asserted the
// way that is actually meaningful without a browser: the bounded
// container's inline `style.maxHeight` (the CONCRETE, content-independent
// constraint `BoundedText` applies) is IDENTICAL for a 10-character value
// and a 5,000-character value, its `overflow-y`/`overflow-x` stay
// "auto"/"hidden" regardless of content length, and the full text is still
// present in the DOM (reachable by scrolling that one container) — not
// truncated by JavaScript.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequestCard } from "./RequestCard.tsx";
import { EMPTY_REQUEST_CARD_FIELDS, type RequestCardFields } from "../../lib/agui-client.ts";

function fieldsWith(overrides: Partial<RequestCardFields>): RequestCardFields {
  return { ...EMPTY_REQUEST_CARD_FIELDS, ...overrides };
}

describe("RequestCard — booked-slot banner (which day/time the lead is booked for)", () => {
  it("shows a 'Записаний на' banner with the held slot's weekday, date and time", () => {
    render(
      <RequestCard
        fields={fieldsWith({ studentName: "Саша" })}
        status="pending"
        bookedSlotStart="2026-07-10T11:00"
      />,
    );
    // 2026-07-10 is a Friday.
    expect(screen.getByText("Записаний на")).toBeTruthy();
    expect(screen.getByText("Пт, 10.07 о 11:00")).toBeTruthy();
  });

  it("omits the banner when no slot is booked yet", () => {
    render(<RequestCard fields={fieldsWith({ studentName: "Саша" })} />);
    expect(screen.queryByText("Записаний на")).toBeNull();
  });
});

describe("RequestCard — oversized field content (dashboard tasks.md §6.5, baseline spec)", () => {
  it("a multi-thousand-character goal answer stays in a fixed-height, scrollable container", () => {
    const shortText = "Хочу співати для друзів.";
    const longText = "Дуже довга відповідь. ".repeat(400); // ~9,200 characters

    const { unmount } = render(
      <RequestCard fields={fieldsWith({ studentName: "Оксана", goalText: shortText })} />,
    );
    const shortContainer = screen.getByTestId("bounded-text");
    const shortMaxHeight = shortContainer.style.maxHeight;
    unmount();

    render(<RequestCard fields={fieldsWith({ studentName: "Оксана", goalText: longText })} />);
    const longContainer = screen.getByTestId("bounded-text");

    // The bounding constraint itself never grows with content length.
    expect(longContainer.style.maxHeight).toBe(shortMaxHeight);
    expect(longContainer.style.overflowY).toBe("auto");
    expect(longContainer.style.overflowX).toBe("hidden");

    // The FULL text is still present in the DOM (reachable by scrolling),
    // never truncated.
    expect(longContainer.textContent).toBe(longText);
  });

  it("other fields and the DecisionBar remain visible alongside an oversized field", () => {
    const longTastes = "музика ".repeat(2000); // > 10,000 characters

    render(
      <RequestCard
        fields={fieldsWith({
          studentName: "Іван",
          studentAge: 9,
          format: "individual",
          tastes: longTastes,
        })}
        requestId={5}
        showDecisionBar
      />,
    );

    expect(screen.getByText("Іван")).toBeInTheDocument();
    expect(screen.getByText("9 років")).toBeInTheDocument();
    expect(screen.getByText("individual")).toBeInTheDocument();
    expect(screen.getByTestId("decision-bar")).toBeInTheDocument();
  });

  it("the card's own root never sets a horizontal-scroll-inducing overflow", () => {
    const { container } = render(
      <RequestCard fields={fieldsWith({ studentName: "Марія", experience: "х".repeat(6000) })} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("overflow-x-hidden");
  });
});

describe("RequestCard — basic rendering", () => {
  it("shows a placeholder title when the student name is not yet known", () => {
    render(<RequestCard fields={fieldsWith({})} />);
    expect(screen.getByText("Нова заявка")).toBeInTheDocument();
  });

  it("renders a compiled brief string (pending-queue entries) in its own bounded region", () => {
    render(<RequestCard fields={fieldsWith({ studentName: "Петро" })} brief={"Учень: Петро\nВік: 8"} />);
    expect(screen.getByText(/Учень: Петро/)).toBeInTheDocument();
  });
});
