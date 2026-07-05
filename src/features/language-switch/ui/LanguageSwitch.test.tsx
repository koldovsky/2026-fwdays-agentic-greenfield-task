// LanguageSwitch behavior (add-language-toggle, NFR-I18N-01, NFR-A11Y-01):
// marks the active locale, persists the choice in the cookie, and refreshes the
// route so the server re-renders in the chosen language.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import { LanguageSwitch } from "./LanguageSwitch";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

beforeEach(() => {
  refresh.mockClear();
  document.cookie = "locale=; max-age=0; path=/";
});

describe("LanguageSwitch", () => {
  it("marks the active locale via aria-pressed", () => {
    render(<LanguageSwitch locale="ua" />);
    expect(screen.getByRole("button", { name: "UA" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "false");
  });

  it("persists the chosen locale and refreshes on switch", async () => {
    render(<LanguageSwitch locale="ua" />);
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(document.cookie).toContain("locale=en");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("no-ops when the current locale is chosen again", async () => {
    render(<LanguageSwitch locale="ua" />);
    await userEvent.click(screen.getByRole("button", { name: "UA" }));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("exposes an accessible group label", () => {
    render(<LanguageSwitch locale="ua" />);
    expect(
      screen.getByRole("group", { name: ua.topBar.languageLabel }),
    ).toBeInTheDocument();
  });
});
