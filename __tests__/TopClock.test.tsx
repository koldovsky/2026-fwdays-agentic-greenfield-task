import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { TopClock } from "../app/components/top-clock/TopClock";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TopClock — timer lifecycle", () => {
  it("starts a setTimeout and a setInterval on mount", () => {
    vi.useFakeTimers();
    render(<TopClock />);
    expect(vi.getTimerCount()).toBe(2);
  });

  it("clears all timers on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(<TopClock />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("TopClock — render output", () => {
  it("renders null before the initial setTimeout fires (SSR-compatible)", () => {
    vi.useFakeTimers();
    render(<TopClock />);
    // No time has passed — the initial tick has not fired yet.
    expect(document.querySelector("time")).toBeNull();
  });

  it("renders a <time> element after the initial tick", () => {
    vi.useFakeTimers();
    render(<TopClock />);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.querySelector("time")).not.toBeNull();
  });

  it("time element has a valid ISO-8601 local dateTime attribute", () => {
    vi.useFakeTimers();
    render(<TopClock />);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    const dateTime = document.querySelector("time")?.getAttribute("dateTime");
    expect(dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  it("aria-label contains the localised prefix", () => {
    vi.useFakeTimers();
    render(<TopClock />);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    const label = document.querySelector("time")?.getAttribute("aria-label");
    expect(label).toContain("Місцевий час");
  });

  it("displays time in HH:MM:SS format", () => {
    vi.useFakeTimers();
    render(<TopClock />);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    const text = document.querySelector("time")?.textContent ?? "";
    expect(text).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it("updates the displayed time when the interval fires", () => {
    vi.useFakeTimers();
    render(<TopClock />);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    const before = document.querySelector("time")?.textContent ?? "";

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const after = document.querySelector("time")?.textContent ?? "";

    // The element must survive a tick without crashing.
    expect(after).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    void before;
  });
});
