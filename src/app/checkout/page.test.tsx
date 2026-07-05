// /checkout page — the 404 matrix (add-payments-emulator task 1.2). Covers
// the exact gap that let a raw 500 slip through: a signed-token verification
// failure (missing PAYMENTS_WEBHOOK_SECRET, tampered/garbage token) must 404
// like any other invalid session, never throw uncaught (NFR-OBS-01).
import { describe, expect, it, vi } from "vitest";

const notFound = vi.hoisted(() => vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }));
vi.mock("next/navigation", () => ({ notFound }));

// The page resolves the visitor locale from the cookie past the 404 guards.
vi.mock("next/headers", () => ({ cookies: () => ({ get: () => undefined }) }));

const isPaymentsEmulatorEnabled = vi.hoisted(() => vi.fn());
const getPaymentsWebhookSecret = vi.hoisted(() => vi.fn());
vi.mock("@/shared/config", () => ({ isPaymentsEmulatorEnabled, getPaymentsWebhookSecret }));

const verifyCheckoutToken = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/payments", () => ({ verifyCheckoutToken }));

vi.mock("@/views/checkout", () => ({
  CheckoutView: ({ plan }: { plan: string }) => <div data-testid="checkout-view">{plan}</div>,
}));
vi.mock("@/widgets/top-bar", () => ({ TopBar: () => <div data-testid="top-bar" /> }));

import CheckoutPage from "./page";

function searchParams(token?: string) {
  return Promise.resolve(token === undefined ? {} : { token });
}

describe("CheckoutPage 404 matrix", () => {
  it("404s when the emulator is disabled, before even reading the token", async () => {
    isPaymentsEmulatorEnabled.mockReturnValue(false);

    await expect(CheckoutPage({ searchParams: searchParams("anything") })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(verifyCheckoutToken).not.toHaveBeenCalled();
  });

  it("404s when no token is present", async () => {
    isPaymentsEmulatorEnabled.mockReturnValue(true);

    await expect(CheckoutPage({ searchParams: searchParams() })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(verifyCheckoutToken).not.toHaveBeenCalled();
  });

  it("404s (not a raw 500) when the token is garbage/tampered", async () => {
    isPaymentsEmulatorEnabled.mockReturnValue(true);
    getPaymentsWebhookSecret.mockReturnValue("secret");
    verifyCheckoutToken.mockReturnValue(null);

    await expect(CheckoutPage({ searchParams: searchParams("garbage") })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("404s (not a raw 500) when PAYMENTS_WEBHOOK_SECRET is unset — the regression this test guards", async () => {
    isPaymentsEmulatorEnabled.mockReturnValue(true);
    getPaymentsWebhookSecret.mockImplementation(() => {
      throw new Error("PAYMENTS_WEBHOOK_SECRET is not set");
    });

    await expect(CheckoutPage({ searchParams: searchParams("some-token") })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("renders the checkout view for a validly signed token", async () => {
    isPaymentsEmulatorEnabled.mockReturnValue(true);
    getPaymentsWebhookSecret.mockReturnValue("secret");
    verifyCheckoutToken.mockReturnValue({ plan: "pro", returnTo: "/tailor", userId: "u1" });

    const element = await CheckoutPage({ searchParams: searchParams("valid-token") });

    expect(JSON.stringify(element)).toContain("pro");
  });
});
