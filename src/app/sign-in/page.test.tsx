// Page-level tests for /sign-in: callbackUrl forwarding + open-redirect guard
// (NFR-SEC-04, FR-AUTH-01, FR-ONBOARD-01 revised 2026-07-09).
// Convention mirrors src/app/checkout/page.test.tsx: vi.hoisted() + vi.mock()
// for all seams; redirect throws a plain sentinel so we can inspect the
// destination without depending on Next's internal NEXT_REDIRECT error shape.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Redirect sentinel ─────────────────────────────────────────────────────────
class RedirectSignal {
  readonly destination: string;
  constructor(url: string) { this.destination = url; }
}

// ── next/navigation ───────────────────────────────────────────────────────────
const redirect = vi.hoisted(() =>
  vi.fn((url: string): never => {
    throw new RedirectSignal(url);
  }),
);
vi.mock("next/navigation", () => ({ redirect }));

// ── next/headers ──────────────────────────────────────────────────────────────
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => undefined }),
}));

// ── Auth seam — currentUserId (sign-in page uses this, not auth()) ────────────
const currentUserId = vi.hoisted(() => vi.fn<[], Promise<string | null>>());
vi.mock("@/app/auth", () => ({ currentUserId }));

// ── SignInView: captures locale + redirectTo ──────────────────────────────────
vi.mock("@/views/auth", () => ({
  SignInView: ({
    locale,
    redirectTo,
  }: {
    locale?: string;
    redirectTo?: string;
  }) => (
    <div
      data-testid="sign-in-view"
      data-locale={locale ?? "ua"}
      data-redirect-to={redirectTo ?? ""}
    />
  ),
}));

vi.mock("@/widgets/top-bar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));

import SignInPage from "./page";

function searchParams(callbackUrl?: string) {
  return Promise.resolve(
    callbackUrl !== undefined ? { callbackUrl } : {},
  );
}

async function renderPage(callbackUrl?: string) {
  const jsx = await SignInPage({ searchParams: searchParams(callbackUrl) });
  return render(jsx as React.ReactElement);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUserId.mockResolvedValue(null); // default: anonymous visitor
});

describe("SignInPage callbackUrl forwarding (NFR-SEC-04, FR-AUTH-01)", () => {
  it("renders SignInView with redirectTo=/tailor when callbackUrl=%2Ftailor", async () => {
    await renderPage("/tailor");
    expect(screen.getByTestId("sign-in-view")).toHaveAttribute("data-redirect-to", "/tailor");
  });

  it("renders SignInView with redirectTo=/tailor when no callbackUrl is present (default fallback)", async () => {
    await renderPage();
    // DEFAULT_REDIRECT in sign-in/page.tsx is "/tailor".
    expect(screen.getByTestId("sign-in-view")).toHaveAttribute("data-redirect-to", "/tailor");
  });
});

describe("SignInPage open-redirect guard (NFR-SEC-04)", () => {
  it("rejects an absolute external URL — falls back to /tailor", async () => {
    await renderPage("https://evil.example/steal");
    expect(screen.getByTestId("sign-in-view")).toHaveAttribute("data-redirect-to", "/tailor");
  });

  it("rejects a protocol-relative URL starting with // — falls back to /tailor", async () => {
    await renderPage("//evil.example");
    expect(screen.getByTestId("sign-in-view")).toHaveAttribute("data-redirect-to", "/tailor");
  });

  it("rejects a path starting with /\\ (Windows-style open redirect) — falls back to /tailor", async () => {
    await renderPage("/\\evil.example");
    expect(screen.getByTestId("sign-in-view")).toHaveAttribute("data-redirect-to", "/tailor");
  });

  it("accepts any safe same-origin relative path", async () => {
    await renderPage("/history");
    expect(screen.getByTestId("sign-in-view")).toHaveAttribute("data-redirect-to", "/history");
  });

  it("accepts the /tailor path (canonical callback)", async () => {
    await renderPage("/tailor");
    expect(screen.getByTestId("sign-in-view")).toHaveAttribute("data-redirect-to", "/tailor");
  });
});

describe("SignInPage already-signed-in redirect (FR-AUTH-01)", () => {
  it("redirects an already-signed-in user to /tailor (default) when no callbackUrl", async () => {
    currentUserId.mockResolvedValue("user-123");

    let caught: unknown;
    try {
      await SignInPage({ searchParams: searchParams() });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(RedirectSignal);
    expect((caught as RedirectSignal).destination).toBe("/tailor");
  });

  it("redirects an already-signed-in user to the callbackUrl destination", async () => {
    currentUserId.mockResolvedValue("user-123");

    let caught: unknown;
    try {
      await SignInPage({ searchParams: searchParams("/tailor") });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(RedirectSignal);
    expect((caught as RedirectSignal).destination).toBe("/tailor");
  });

  it("does NOT redirect an anonymous visitor (renders the sign-in form)", async () => {
    currentUserId.mockResolvedValue(null);
    await renderPage();
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByTestId("sign-in-view")).toBeInTheDocument();
  });
});
