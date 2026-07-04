// Behaviour of the scroll-reveal primitive: SSR-visible default, hide-then-reveal
// under IntersectionObserver, and full bypass under reduced-motion.
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "./Reveal";

type IOEntry = { readonly isIntersecting: boolean };
type IOCallback = (entries: readonly IOEntry[]) => void;

function installIntersectionObserver() {
  const callbacks: IOCallback[] = [];
  class MockIntersectionObserver {
    constructor(cb: IOCallback) {
      callbacks.push(cb);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  return {
    trigger(isIntersecting: boolean) {
      for (const cb of callbacks) cb([{ isIntersecting }]);
    },
  };
}

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Reveal", () => {
  it("renders children and is visible by default (no observer support)", () => {
    const { container, getByText } = render(<Reveal>Grounded rewrite</Reveal>);
    expect(getByText("Grounded rewrite")).toBeInTheDocument();
    const node = container.querySelector("[data-reveal]");
    // Without IntersectionObserver it must stay revealed (SSR-visible default).
    expect(node?.getAttribute("data-revealed")).toBe("true");
    expect(node?.getAttribute("data-fade")).toBe("true");
  });

  it("renders the polymorphic element from `as`", () => {
    const { container } = render(
      <Reveal as="section" className="py-16">
        section body
      </Reveal>,
    );
    const node = container.querySelector("section[data-reveal]");
    expect(node).not.toBeNull();
    expect(node?.className).toBe("py-16");
  });

  it("marks fade=false for transform-only (LCP-safe) reveals", () => {
    const { container } = render(<Reveal fade={false}>hero</Reveal>);
    expect(container.querySelector("[data-reveal]")?.getAttribute("data-fade")).toBe(
      "false",
    );
  });

  it("hides on mount then reveals once it intersects", () => {
    const io = installIntersectionObserver();
    stubMatchMedia(false);
    const { container } = render(<Reveal>content</Reveal>);
    const node = container.querySelector("[data-reveal]");
    // Layout effect hid it before paint.
    expect(node?.getAttribute("data-revealed")).toBe("false");
    act(() => io.trigger(true));
    expect(node?.getAttribute("data-revealed")).toBe("true");
  });

  it("stays visible under prefers-reduced-motion", () => {
    installIntersectionObserver();
    stubMatchMedia(true);
    const { container } = render(<Reveal>content</Reveal>);
    expect(container.querySelector("[data-reveal]")?.getAttribute("data-revealed")).toBe(
      "true",
    );
  });
});
