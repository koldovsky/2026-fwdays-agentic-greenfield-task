// CheckoutView tests (task 1.2): the screen only ever talks to the two
// payments endpoints — sign, then deliver to the webhook — and never writes
// state itself. Success returns to the exact prior screen (FR-PAYWALL-03);
// failure shows calm copy + retry with no grant (FR-BILLING-03).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckoutView } from "./CheckoutView";

const SIGNED = { event: '{"id":"evt_1"}', signature: "abc123" };

function mockFetch(sequence: Array<{ ok: boolean; json?: unknown }>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  for (const step of sequence) {
    fetchMock.mockResolvedValueOnce({
      ok: step.ok,
      json: async () => step.json ?? {},
    });
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CheckoutView", () => {
  it("renders the plan, the emulator notice, and both outcome actions", () => {
    render(<CheckoutView plan="pro" returnTo="/tailor" token="tok" />);

    expect(screen.getByRole("heading", { name: "Оплата" })).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Тестовий режим оплати. Кошти не списуються.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Емулювати успішну оплату" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Емулювати відмову" })).toBeInTheDocument();
  });

  it("delivers the signed event to the webhook and returns to returnTo on success", async () => {
    const fetchMock = mockFetch([
      { ok: true, json: SIGNED },
      { ok: true, json: { received: true } },
    ]);
    const navigate = vi.fn();
    render(<CheckoutView plan="pro" returnTo="/tailor" token="tok" navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: "Емулювати успішну оплату" }));

    // Hop 1: exchange token + outcome for a signed event.
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/payments/checkout/complete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "tok", outcome: "succeeded" }),
      }),
    );
    // Hop 2: deliver the signed event to the sole writer — the webhook.
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/payments/webhook",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-payments-signature": SIGNED.signature }),
        body: SIGNED.event,
      }),
    );
    expect(navigate).toHaveBeenCalledWith("/tailor");
  });

  it("shows calm declined copy with a retry CTA on a failed payment", async () => {
    mockFetch([
      { ok: true, json: SIGNED },
      { ok: true, json: { received: true } },
    ]);
    const navigate = vi.fn();
    render(<CheckoutView plan="pro" returnTo="/tailor" token="tok" navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: "Емулювати відмову" }));

    expect(
      await screen.findByText("Оплату відхилено. Кошти не списано, доступ не змінено."),
    ).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();

    // Retry returns to the idle actions (FR-BILLING-03 retry CTA).
    await userEvent.click(screen.getByRole("button", { name: "Спробувати ще раз" }));
    expect(
      screen.getByRole("button", { name: "Емулювати успішну оплату" }),
    ).toBeInTheDocument();
  });

  it("shows the calm generic error when the round-trip fails (NFR-OBS-01)", async () => {
    mockFetch([{ ok: false }]);
    render(<CheckoutView plan="pro" returnTo="/tailor" token="tok" navigate={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Емулювати успішну оплату" }));

    expect(
      await screen.findByText("Щось пішло не так. Спробуйте ще раз."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Спробувати ще раз" })).toBeInTheDocument();
  });
});
