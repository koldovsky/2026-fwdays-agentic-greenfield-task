// Smoke render test for Button — also proves the jsdom test project is wired.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders label text", () => {
    render(<Button label="Адаптувати" />);
    expect(screen.getByRole("button", { name: "Адаптувати" })).toBeInTheDocument();
  });

  it("fires onClick when enabled", async () => {
    const onClick = vi.fn();
    render(<Button label="Go" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(<Button label="Go" onClick={onClick} disabled />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders a link when href is set", () => {
    render(<Button label="Try free" href="/tailor" />);
    const link = screen.getByRole("link", { name: "Try free" });
    expect(link).toHaveAttribute("href", "/tailor");
  });

  it("drops href and marks aria-disabled when a link is disabled", () => {
    render(<Button label="Soon" href="/tailor" disabled aria-label="Soon" />);
    // A disabled link renders no href, so it is intentionally not a link role.
    const link = screen.getByText("Soon");
    expect(link).not.toHaveAttribute("href");
    expect(link).toHaveAttribute("aria-disabled", "true");
  });
});
