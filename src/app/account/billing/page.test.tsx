// Page-level test for /account/billing (fix-billing-locale). Regression lock:
// the page previously never read the LOCALE_COOKIE, so TopBar and
// AccountBillingView always rendered "ua" — the header EN switch had no
// effect on this route. This asserts the resolved locale is threaded to both
// children: "en" when the cookie says so, "ua" when absent (NFR-I18N-01).
//
// Convention mirrors src/app/tailor/page.test.tsx: vi.hoisted() + vi.mock()
// for all seams (auth, subscription repo, next/headers); TopBar and
// AccountBillingView are stubbed to capture the locale prop they receive.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── next/navigation ───────────────────────────────────────────────────────────
const redirect = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }));
vi.mock("next/navigation", () => ({ redirect }));

// ── next/headers — the cookie the page must read ──────────────────────────────
const cookieGet = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: () => ({ get: cookieGet }),
}));

// ── Auth seam ────────────────────────────────────────────────────────────────
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ auth }));

// ── Subscription repo ─────────────────────────────────────────────────────────
const subscriptionRepo = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/lib/db", () => ({
  createSubscriptionRepo: () => subscriptionRepo,
}));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

// ── AccountBillingView: capture the locale prop ───────────────────────────────
vi.mock("@/views/account-billing", () => ({
  AccountBillingView: ({ locale }: { locale?: string }) => (
    <div data-testid="account-billing-view" data-locale={String(locale ?? "undefined")} />
  ),
}));

// ── TopBar: capture the locale prop ───────────────────────────────────────────
vi.mock("@/widgets/top-bar", () => ({
  TopBar: ({ locale }: { locale?: string }) => (
    <div data-testid="top-bar" data-locale={String(locale ?? "undefined")} />
  ),
}));

import AccountBillingPage from "./page";

const SESSION = { user: { id: "user-1", email: "user@example.com", name: null } };

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue(SESSION);
  subscriptionRepo.get.mockResolvedValue(null);
  cookieGet.mockReturnValue(undefined);
});

async function renderPage() {
  const jsx = await AccountBillingPage();
  return render(jsx as React.ReactElement);
}

describe("AccountBillingPage locale threading (fix-billing-locale, NFR-I18N-01)", () => {
  it("reads the LOCALE_COOKIE via next/headers cookies()", async () => {
    await renderPage();
    expect(cookieGet).toHaveBeenCalledWith("locale");
  });

  it("passes locale=en to AccountBillingView and TopBar when the cookie is 'en'", async () => {
    cookieGet.mockReturnValue({ value: "en" });
    await renderPage();
    expect(screen.getByTestId("account-billing-view")).toHaveAttribute("data-locale", "en");
    expect(screen.getByTestId("top-bar")).toHaveAttribute("data-locale", "en");
  });

  it("defaults to locale=ua when the cookie is absent", async () => {
    cookieGet.mockReturnValue(undefined);
    await renderPage();
    expect(screen.getByTestId("account-billing-view")).toHaveAttribute("data-locale", "ua");
    expect(screen.getByTestId("top-bar")).toHaveAttribute("data-locale", "ua");
  });

  it("defaults to locale=ua when the cookie value is invalid/unrecognized", async () => {
    cookieGet.mockReturnValue({ value: "fr" });
    await renderPage();
    expect(screen.getByTestId("account-billing-view")).toHaveAttribute("data-locale", "ua");
    expect(screen.getByTestId("top-bar")).toHaveAttribute("data-locale", "ua");
  });
});
