// CheckoutPage session-state tests: the P0 fix that resolved the TopBar
// signed-in vs anonymous branch from the server session (auth()). This test
// file covers the NEW behavior introduced by the vouch branch, orthogonal to
// the 404-matrix tests in page.test.tsx.
//
// Behaviors verified:
//  1. Logged-in visitor: auth() returns a user → TopBar receives that user →
//     signed-in branch (account menu trigger visible, no "Увійти" link).
//  2. Anonymous visitor: auth() returns null → TopBar receives null → anonymous
//     branch ("Увійти" link present, no account menu trigger).
//  3. Trust-boundary regression: the HMAC-signed token still drives the
//     checkout session (plan, returnTo, userId). The TopBar session prop has
//     NO authority over what plan is being purchased — verified by supplying
//     a logged-in user whose id differs from the token userId. The checkout
//     view still renders with the token-derived plan.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ── next/navigation and next/headers stubs ──────────────────────────────────
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => undefined }),
}));

// ── Payments / config stubs ─────────────────────────────────────────────────
const isPaymentsEmulatorEnabled = vi.hoisted(() => vi.fn(() => true));
const getPaymentsWebhookSecret = vi.hoisted(() => vi.fn(() => "test-secret"));
vi.mock("@/shared/config", () => ({
  isPaymentsEmulatorEnabled,
  getPaymentsWebhookSecret,
}));

const verifyCheckoutToken = vi.hoisted(() =>
  vi.fn(() => ({ userId: "token-user-id", plan: "pro", returnTo: "/tailor" })),
);
vi.mock("@/shared/lib/payments", () => ({ verifyCheckoutToken }));

// ── Auth seam ───────────────────────────────────────────────────────────────
// auth() is the new addition in this fix; the previous version never called it.
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ auth }));

// ── Shallow stubs for view and widget ───────────────────────────────────────
// TopBar stub captures the `user` prop so we can assert signed-in vs anonymous
// branch without depending on the full widget internals.
vi.mock("@/widgets/top-bar", () => ({
  TopBar: ({
    user,
  }: {
    user: { email?: string | null; name?: string | null } | null;
    locale?: string;
  }) => (
    <div data-testid="top-bar" data-signed-in={user !== null ? "true" : "false"}>
      {user === null ? (
        <a href="/sign-in">Увійти</a>
      ) : (
        <button aria-label="Меню акаунта">{user.email ?? "user"}</button>
      )}
    </div>
  ),
}));

vi.mock("@/views/checkout", () => ({
  CheckoutView: ({ plan }: { plan: string; returnTo: string; token: string; locale?: string }) => (
    <div data-testid="checkout-view" data-plan={plan} />
  ),
}));

import CheckoutPage from "./page";

function searchParams(token = "valid-token") {
  return Promise.resolve({ token });
}

async function renderPage(token = "valid-token") {
  const element = await CheckoutPage({ searchParams: searchParams(token) });
  // Server components return a React element tree. Use render() from
  // @testing-library so we can query DOM with getByRole/getByTestId.
  // The element is a JSX tree (not async generator), so render works directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render(element as any);
}

describe("CheckoutPage — TopBar session state (P0 fix)", () => {
  it("passes the authenticated user to TopBar when auth() resolves a session", async () => {
    auth.mockResolvedValue({
      user: { id: "session-user-id", email: "olena@example.com", name: "Olena" },
    });

    await renderPage();

    // Signed-in branch: account menu trigger present, no "Увійти" link.
    expect(screen.getByRole("button", { name: "Меню акаунта" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Увійти" })).not.toBeInTheDocument();
    expect(screen.getByTestId("top-bar")).toHaveAttribute("data-signed-in", "true");
  });

  it("passes null to TopBar when auth() returns null (anonymous visitor)", async () => {
    auth.mockResolvedValue(null);

    await renderPage();

    // Anonymous branch: "Увійти" link present, no account menu trigger.
    expect(screen.getByRole("link", { name: "Увійти" })).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByRole("button", { name: "Меню акаунта" })).not.toBeInTheDocument();
    expect(screen.getByTestId("top-bar")).toHaveAttribute("data-signed-in", "false");
  });

  it("renders fine when auth() returns a session with no name (email-only identity)", async () => {
    // Edge case: user has no name set (created via email+password, name optional).
    // TopBar receives the user object → signed-in branch renders without crash.
    auth.mockResolvedValue({
      user: { id: "u-no-name", email: "nemo@example.com", name: null },
    });

    await renderPage();

    // Signed-in branch — account menu trigger present; email shown as fallback.
    expect(screen.getByRole("button", { name: "Меню акаунта" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Увійти" })).not.toBeInTheDocument();
    expect(screen.getByTestId("top-bar")).toHaveAttribute("data-signed-in", "true");
  });
});

describe("CheckoutPage — trust-boundary regression", () => {
  it("renders the token-derived plan regardless of the TopBar session user", async () => {
    // Session user has a DIFFERENT id than the token userId. This is an
    // intentional accepted state (the comment in page.tsx documents that a
    // hard IDOR check was deliberately omitted to avoid regressing completion
    // when the auth cookie is absent). What MUST hold is that the plan and
    // returnTo come solely from the verified token, never from the session.
    auth.mockResolvedValue({
      user: {
        id: "a-different-session-user", // differs from token's "token-user-id"
        email: "attacker@example.com",
        name: null,
      },
    });
    // Token still signs for "pro".
    verifyCheckoutToken.mockReturnValue({
      userId: "token-user-id",
      plan: "pro",
      returnTo: "/tailor",
    });

    await renderPage();

    // The checkout view must render with the token's plan ("pro"), not
    // something derived from the session user.
    expect(screen.getByTestId("checkout-view")).toHaveAttribute("data-plan", "pro");
  });

  it("token's plan is immune to session presence — anonymous session still shows the correct plan", async () => {
    auth.mockResolvedValue(null);
    verifyCheckoutToken.mockReturnValue({
      userId: "token-user-id",
      plan: "job_hunt_pass",
      returnTo: "/tailor",
    });

    await renderPage();

    expect(screen.getByTestId("checkout-view")).toHaveAttribute("data-plan", "job_hunt_pass");
    // Anonymous TopBar confirmed alongside correct plan.
    expect(screen.getByTestId("top-bar")).toHaveAttribute("data-signed-in", "false");
  });
});
