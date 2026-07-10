// Behaviour of the loading-placeholder primitive (docs/vouch-design-system
// motion contract, NFR-PERF-04, NFR-A11Y-01, NFR-OBS-01): a decorative,
// aria-hidden block that carries the shared `.skeleton` pulse class and
// accepts extra sizing utilities via `className`.
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders a div with the skeleton class", () => {
    const { container } = render(<Skeleton />);
    const node = container.firstElementChild;
    expect(node?.tagName).toBe("DIV");
    expect(node?.classList.contains("skeleton")).toBe(true);
  });

  it("is aria-hidden (decorative only — no assistive-tech noise)", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("appends a passed className alongside the base classes", () => {
    const { container } = render(<Skeleton className="h-4 w-3/4" />);
    const node = container.firstElementChild;
    expect(node?.classList.contains("skeleton")).toBe(true);
    expect(node?.classList.contains("h-4")).toBe(true);
    expect(node?.classList.contains("w-3/4")).toBe(true);
  });

  it("renders with no extra classes when className is omitted", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.className.trim().endsWith("bg-hairline")).toBe(true);
  });
});
