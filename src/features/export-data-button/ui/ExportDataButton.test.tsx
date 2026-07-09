// ExportDataButton — fetch-based GDPR download control (NFR-OBS-01, NFR-GDPR-01,
// NFR-I18N-01). Verifies the five states: idle, success, non-ok failure, network
// throw, and pending. Tests are against the spec (tasks.md §4.1), not the
// implementation — the exact DOM structure may differ.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { en, ua } from "@/shared/lib/i18n";

import { ExportDataButton } from "./ExportDataButton";

// jsdom does not implement URL.createObjectURL / revokeObjectURL — assign
// spies on the static methods directly without replacing the URL constructor.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:fake-url");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExportDataButton — idle state (NFR-I18N-01)", () => {
  it("renders the exportAction label by default (ua locale)", () => {
    render(<ExportDataButton />);
    expect(screen.getByRole("button", { name: ua.profile.exportAction })).toBeInTheDocument();
  });

  it("renders the exportAction label in English when locale=en", () => {
    render(<ExportDataButton locale="en" />);
    expect(screen.getByRole("button", { name: en.profile.exportAction })).toBeInTheDocument();
  });

  it("does not show an error alert in the idle state", () => {
    render(<ExportDataButton />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ExportDataButton — success path (NFR-GDPR-01, NFR-OBS-01)", () => {
  it("creates a download anchor and fires .click() — no page navigation", async () => {
    // Mock fetch returning ok + a blob body.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(['{"user":"ok"}'], { type: "application/json" }), { status: 200 }),
    );

    // Intercept only the synthetic anchor element created by the component.
    // Spying on document.createElement lets us inject a click spy on just the <a>
    // without disturbing appendChild (which React Testing Library also uses to
    // mount the component into the DOM).
    const anchorClickSpy = vi.fn();
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, ...rest) => {
      const el = realCreateElement(tag, ...rest);
      if (tag === "a") {
        el.click = anchorClickSpy;
      }
      return el;
    });

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: ua.profile.exportAction }));

    await waitFor(() => expect(anchorClickSpy).toHaveBeenCalledTimes(1));

    // The trigger button itself must never have carried an href (no navigation).
    const trigger = screen.getByRole("button", { name: ua.profile.exportAction });
    expect(trigger).not.toHaveAttribute("href");

    // Revoke must have been called to free the object URL.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("returns to idle (exportAction label) after a successful download", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(["{}"], { type: "application/json" }), { status: 200 }),
    );
    // Suppress real anchor clicks (noop is fine — we just care about idle state).
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, ...rest) => {
      const el = realCreateElement(tag, ...rest);
      if (tag === "a") el.click = vi.fn();
      return el;
    });

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: ua.profile.exportAction }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: ua.profile.exportAction })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ExportDataButton — non-ok failure (NFR-OBS-01, NFR-GDPR-01)", () => {
  it("shows a role=alert with exportError when the server returns 500", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: ua.profile.exportAction }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(ua.profile.exportError);
  });

  it("shows exportError in English when locale=en and server returns 500", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    render(<ExportDataButton locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: en.profile.exportAction }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(en.profile.exportError);
  });

  it("shows role=alert with exportError for any non-ok status (e.g. 403)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 403 }));

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: ua.profile.exportAction }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(ua.profile.exportError);
  });
});

describe("ExportDataButton — network throw (NFR-OBS-01, NFR-GDPR-01)", () => {
  it("shows role=alert with exportError when fetch throws a network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: ua.profile.exportAction }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(ua.profile.exportError);
  });

  it("never leaks the thrown error message into the rendered text", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("SECRET_KEY_FAILURE internal xyz"));

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: ua.profile.exportAction }));

    await screen.findByRole("alert");
    expect(document.body.textContent).not.toContain("SECRET_KEY_FAILURE");
    expect(document.body.textContent).not.toContain("internal xyz");
  });
});

describe("ExportDataButton — pending state (NFR-OBS-01)", () => {
  it("shows exportPending and disables the button while the fetch is in flight", async () => {
    // A promise that never resolves keeps the component in pending.
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: ua.profile.exportAction }));

    // The button should transition to disabled with the pending label.
    const pendingButton = await screen.findByRole("button", { name: ua.profile.exportPending });
    expect(pendingButton).toBeDisabled();
  });

  it("cannot be re-activated while pending (second click has no effect)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(new Promise(() => {}));

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: ua.profile.exportAction }));

    await screen.findByRole("button", { name: ua.profile.exportPending });

    // A second click on the now-disabled button must not dispatch another fetch.
    const pendingButton = screen.getByRole("button", { name: ua.profile.exportPending });
    fireEvent.click(pendingButton);

    // Still only one fetch call — the button is disabled.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

// PDF-contract tests (2026-07-09: route now returns application/pdf, vouch-export.pdf).
// Verify the component sets the correct download filename and blob type on the
// synthetic anchor — the trigger button must never carry an href (NFR-OBS-01,
// NFR-GDPR-01).
describe("ExportDataButton — PDF contract (NFR-GDPR-01, 2026-07-09 decision)", () => {
  it("sets download='vouch-export.pdf' on the synthetic anchor (not vouch-export.json)", async () => {
    // Simulate a PDF response (the real server now returns application/pdf).
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(["%PDF-1.4 fake"], { type: "application/pdf" }), { status: 200 }),
    );

    let capturedAnchor: HTMLAnchorElement | null = null;
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, ...rest) => {
      const el = realCreateElement(tag, ...rest);
      if (tag === "a") {
        capturedAnchor = el as HTMLAnchorElement;
        el.click = vi.fn();
      }
      return el;
    });

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: ua.profile.exportAction }));

    // Wait for the download flow to complete (anchor click fires).
    await waitFor(() => expect(capturedAnchor).not.toBeNull());
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());

    expect(capturedAnchor!.download).toBe("vouch-export.pdf");
  });

  it("passes the object URL (blob:) to the anchor href — no direct /api href on the trigger", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(["%PDF-1.4 fake"], { type: "application/pdf" }), { status: 200 }),
    );

    let capturedAnchorHref: string | null = null;
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, ...rest) => {
      const el = realCreateElement(tag, ...rest);
      if (tag === "a") {
        el.click = vi.fn();
        // Capture the href after click (the component sets href before clicking).
        Object.defineProperty(el, "href", {
          set(v: string) { capturedAnchorHref = v; },
          get() { return capturedAnchorHref ?? ""; },
          configurable: true,
        });
      }
      return el;
    });

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: ua.profile.exportAction }));

    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());

    // The synthetic anchor gets the blob: object URL (not a raw /api path).
    expect(capturedAnchorHref).toBe("blob:fake-url");
    // The trigger button itself must never carry an href (no page navigation).
    const trigger = screen.getByRole("button", { name: ua.profile.exportAction });
    expect(trigger).not.toHaveAttribute("href");
  });

  it("calls fetch('/api/account/export') — correct endpoint (NFR-GDPR-01)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob(["%PDF-1.4 fake"], { type: "application/pdf" }), { status: 200 }),
    );
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, ...rest) => {
      const el = realCreateElement(tag, ...rest);
      if (tag === "a") el.click = vi.fn();
      return el;
    });

    render(<ExportDataButton />);
    fireEvent.click(screen.getByRole("button", { name: ua.profile.exportAction }));

    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());

    expect(fetchSpy).toHaveBeenCalledWith("/api/account/export");
  });
});
