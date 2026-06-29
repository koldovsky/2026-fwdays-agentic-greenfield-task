// RED (Phase 4b) — written from the spec BEFORE the implementation exists.
// The import of `@/components/ui/Button` will FAIL (module not yet created),
// which is the right reason for red: the six-variant Button is specified by
// FR-DS-02 / design.md D4 but has no code yet. Asserts each variant renders a
// keyboard-focusable <button> with a stable per-variant hook, forwards
// onClick/children/type, and that the `icon` variant carries an accessible name.
//
// @trace FR-DS-02
// @trace NFR-A11Y-04
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/Button";

afterEach(cleanup);

const VARIANTS = [
  "primary",
  "secondary",
  "soft",
  "ghost",
  "danger-ghost",
  "danger",
  "icon",
] as const;

// A stable, implementation-agnostic variant hook: either a `data-variant`
// attribute or a class containing the variant name. The implementer may choose
// either; the contract is that the rendered element exposes which variant it is.
function hasVariantHook(el: HTMLElement, variant: string): boolean {
  if (el.getAttribute("data-variant") === variant) return true;
  return new RegExp(`(^|[\\s-])${variant}([\\s-]|$)`).test(el.className);
}

describe("<Button> — variants (FR-DS-02)", () => {
  it.each(VARIANTS)(
    "renders a real <button> for the %s variant with a stable variant hook",
    (variant) => {
      const label = variant === "icon" ? "Полити" : `${variant} action`;
      render(
        <Button variant={variant} aria-label={variant === "icon" ? label : undefined}>
          {variant === "icon" ? null : label}
        </Button>,
      );
      const btn = screen.getByRole("button", { name: label });
      expect(btn.tagName).toBe("BUTTON");
      expect(hasVariantHook(btn, variant)).toBe(true);
    },
  );

  it("defaults to type=button (does not implicitly submit) unless type is given", () => {
    render(<Button variant="primary">Зберегти</Button>);
    const btn = screen.getByRole("button", { name: "Зберегти" });
    // A design-system button must not silently default to submit; either it is
    // explicitly type=button, or type is forwarded (asserted below).
    expect(btn.getAttribute("type")).toBe("button");
  });

  it("forwards an explicit type (e.g. submit) to the underlying button", () => {
    render(
      <Button variant="primary" type="submit">
        Зберегти
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Зберегти" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("forwards children as the accessible name", () => {
    render(<Button variant="secondary">Редагувати</Button>);
    expect(
      screen.getByRole("button", { name: "Редагувати" }),
    ).toBeInTheDocument();
  });

  it("the danger-ghost variant bakes danger-red text into the variant (not text-stone)", () => {
    // A destructive ghost trigger must render danger-red regardless of CSS
    // source order. The variant itself carries `text-danger`; it must NOT carry
    // the ghost variant's `text-stone` (which, with no tailwind-merge, could win
    // by cascade order and mute the destructive affordance).
    render(<Button variant="danger-ghost">Видалити</Button>);
    const btn = screen.getByRole("button", { name: "Видалити" });
    expect(btn.className).toContain("text-danger");
    expect(btn.className).not.toContain("text-stone");
  });
});

describe("<Button> — interaction & a11y (FR-DS-02, NFR-A11Y-04)", () => {
  it("forwards onClick (pointer activation)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button variant="primary" onClick={onClick}>
        Додати
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Додати" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is keyboard-focusable and activates on Enter (keyboard parity)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button variant="primary" onClick={onClick}>
        Додати
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Додати" });
    btn.focus();
    expect(btn).toHaveFocus();
    expect(btn.getAttribute("tabindex")).not.toBe("-1");
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("the icon variant exposes an accessible name via aria-label", () => {
    // Icon-only buttons have no text child, so they MUST carry an accessible
    // name (NFR-A11Y-04) — here the water action «Полити».
    render(<Button variant="icon" aria-label="Полити" />);
    const btn = screen.getByRole("button", { name: "Полити" });
    expect(btn).toHaveAccessibleName("Полити");
  });
});
