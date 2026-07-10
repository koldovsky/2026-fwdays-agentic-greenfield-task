// Page-level tests for /tailor (NFR-SEC-04, FR-ONBOARD-01 revised 2026-07-09,
// FR-PAYWALL-01, NFR-OBS-01). The page is a server component; we call it as an
// async function and assert on: redirect behavior, prop forwarding to
// TailorWorkspace, and the lenient-counter degradation path.
//
// Convention mirrors src/app/checkout/page.session.test.tsx:
// - vi.hoisted() + vi.mock() for all seams (auth, repos, next/navigation, next/headers).
// - `redirect` throws with a sentinel `{ __redirectTo: url }` — tests catch it
//   and inspect the destination without relying on Next's internal error shape.
// - TailorWorkspace + TopBar are stubbed to capture props.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Redirect sentinel ─────────────────────────────────────────────────────────
// next/navigation's redirect() throws a NEXT_REDIRECT error in production. In
// tests we throw a plain sentinel object so `getURLFromRedirectError` isn't
// needed (avoids a require() call inside vi.hoisted).
class RedirectSignal {
  readonly destination: string;
  constructor(url: string) { this.destination = url; }
}

const redirect = vi.hoisted(() =>
  vi.fn((url: string): never => {
    throw new RedirectSignal(url);
  }),
);
vi.mock("next/navigation", () => ({ redirect }));

// ── next/headers ─────────────────────────────────────────────────────────────
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: () => undefined,
  }),
}));

// ── Auth seam ────────────────────────────────────────────────────────────────
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ auth }));

// ── Subscription + usage-counter repos ───────────────────────────────────────
const subscriptionRepo = vi.hoisted(() => ({ get: vi.fn() }));
const usageCounterRepo = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/shared/lib/db", () => ({
  createSubscriptionRepo: () => subscriptionRepo,
  createUsageCounterRepo: () => usageCounterRepo,
}));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

// ── TailorWorkspace: capture paid + freeExhausted props ──────────────────────
vi.mock("@/views/tailor-workspace", () => ({
  TailorWorkspace: ({
    paid,
    freeExhausted,
  }: {
    paid?: boolean;
    freeExhausted?: boolean;
    locale?: string;
  }) => (
    <div
      data-testid="tailor-workspace"
      data-paid={String(paid ?? false)}
      data-free-exhausted={String(freeExhausted ?? false)}
    />
  ),
}));

// ── TopBar: minimal stub ──────────────────────────────────────────────────────
vi.mock("@/widgets/top-bar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));

import TailorPage from "./page";

// Free user session (not paid).
const FREE_SESSION = { user: { id: "user-free", email: "free@example.com", name: null } };
// Paid user subscription fixture.
const PAID_SUBSCRIPTION = {
  id: "s1",
  userId: "user-paid",
  plan: "pro",
  status: "active",
  currentPeriodEnd: "2999-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Safe defaults: authenticated free user with no paid subscription and 0 runs used.
  auth.mockResolvedValue(FREE_SESSION);
  subscriptionRepo.get.mockResolvedValue(null);
  usageCounterRepo.get.mockResolvedValue({ userId: "user-free", tailoringsUsed: 0 });
});

async function renderPage() {
  const jsx = await TailorPage();
  return render(jsx as React.ReactElement);
}

describe("TailorPage auth gate (NFR-SEC-04, FR-ONBOARD-01 revised 2026-07-09)", () => {
  it("redirects an anonymous visitor to /sign-in with callbackUrl=%2Ftailor", async () => {
    auth.mockResolvedValue(null);

    let caught: unknown;
    try {
      await TailorPage();
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(RedirectSignal);
    expect((caught as RedirectSignal).destination).toBe("/sign-in?callbackUrl=%2Ftailor");
  });

  it("renders the workspace for an authenticated user (no redirect)", async () => {
    await renderPage();
    expect(screen.getByTestId("tailor-workspace")).toBeInTheDocument();
  });

  it("does NOT call the redirect for an authenticated user", async () => {
    await renderPage();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("TailorPage paid prop forwarding (FR-PAYWALL-01)", () => {
  it("passes paid=false to TailorWorkspace when the subscription is absent", async () => {
    subscriptionRepo.get.mockResolvedValue(null);
    await renderPage();
    expect(screen.getByTestId("tailor-workspace")).toHaveAttribute("data-paid", "false");
  });

  it("passes paid=true for an active paid subscription", async () => {
    auth.mockResolvedValue({ user: { id: "user-paid", email: "paid@example.com", name: null } });
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    await renderPage();
    expect(screen.getByTestId("tailor-workspace")).toHaveAttribute("data-paid", "true");
  });

  it("degrades a broken subscription read to paid=false (NFR-OBS-01 — never a failure page)", async () => {
    subscriptionRepo.get.mockRejectedValue(new Error("db timeout"));
    await renderPage();
    expect(screen.getByTestId("tailor-workspace")).toHaveAttribute("data-paid", "false");
  });
});

describe("TailorPage freeExhausted signal (FR-ONBOARD-01 revised)", () => {
  it("passes freeExhausted=false when the free counter has 0 runs used", async () => {
    usageCounterRepo.get.mockResolvedValue({ userId: "user-free", tailoringsUsed: 0 });
    await renderPage();
    expect(screen.getByTestId("tailor-workspace")).toHaveAttribute("data-free-exhausted", "false");
  });

  it("passes freeExhausted=true when the free counter is at the limit (tailoringsUsed=1)", async () => {
    // FREE_TAILORING_LIMIT === 1, so tailoringsUsed=1 means canTailor returns false.
    usageCounterRepo.get.mockResolvedValue({ userId: "user-free", tailoringsUsed: 1 });
    await renderPage();
    expect(screen.getByTestId("tailor-workspace")).toHaveAttribute("data-free-exhausted", "true");
  });

  it("LENIENT degradation: a counter read error defaults to freeExhausted=false (NFR-OBS-01)", async () => {
    // A DB blip must NOT falsely lock a user out of a run they may still be owed.
    // The server-side reserve in /api/tailor/generate is the real gate.
    usageCounterRepo.get.mockRejectedValue(new Error("connection refused"));
    await renderPage();
    expect(screen.getByTestId("tailor-workspace")).toHaveAttribute("data-free-exhausted", "false");
  });

  it("LENIENT degradation: a null counter (new user, no row yet) defaults to freeExhausted=false", async () => {
    usageCounterRepo.get.mockResolvedValue(null);
    await renderPage();
    // null counter → zero-counter fallback → canTailor(true) → freeExhausted=false.
    expect(screen.getByTestId("tailor-workspace")).toHaveAttribute("data-free-exhausted", "false");
  });

  it("skips the counter read entirely for a paid user (always freeExhausted=false, no DB call)", async () => {
    auth.mockResolvedValue({ user: { id: "user-paid", email: "paid@example.com", name: null } });
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    await renderPage();
    // Counter repo must NOT be called for a paid account (no read waste, no signal needed).
    expect(usageCounterRepo.get).not.toHaveBeenCalled();
    expect(screen.getByTestId("tailor-workspace")).toHaveAttribute("data-free-exhausted", "false");
  });
});
