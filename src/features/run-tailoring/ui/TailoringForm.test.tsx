// Behavioral tests for the tailoring form (FR-CV-02, FR-JD-01, FR-TAILOR-01,
// NFR-OBS-01). `streamTailoring` is mocked with scripted async generators so
// these tests exercise the form's own state machine, not the real NDJSON
// parsing (that's stream-tailoring.test.ts's job).
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { TailorRunEvent, TailoringRunResult } from "../model/types";

import { TailoringForm } from "./TailoringForm";

const streamTailoringMock = vi.hoisted(() => vi.fn());
vi.mock("../api/stream-tailoring", () => ({ streamTailoring: streamTailoringMock }));

const SCRIPTED_RESULT: TailoringRunResult = {
  checklist: [],
  bullets: [],
  matchScore: 42,
};

/** Build an async generator that yields the given events, in order, one real
 * macrotask apart — so intermediate render states are observable by findBy
 * queries instead of collapsing before the test can see them. */
function scripted(events: readonly TailorRunEvent[]): () => AsyncGenerator<TailorRunEvent> {
  return async function* gen() {
    for (const event of events) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      yield event;
    }
  };
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText(ua.workspace.cvLabel), "cv text");
  await userEvent.type(screen.getByLabelText(ua.workspace.jdLabel), "jd text");
  await userEvent.click(screen.getByRole("button", { name: ua.action.tailor }));
}

describe("TailoringForm (FR-TAILOR-01)", () => {
  it("streams progress and hands the result to onResult on the happy path", async () => {
    streamTailoringMock.mockImplementation(
      scripted([
        { type: "status", phase: "queued" },
        { type: "status", phase: "processing" },
        { type: "result", result: SCRIPTED_RESULT },
        { type: "status", phase: "done" },
      ]),
    );
    const onResult = vi.fn();
    render(<TailoringForm onResult={onResult} />);

    await fillAndSubmit();

    expect(await screen.findByText(ua.tailorRun.processing)).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledWith(SCRIPTED_RESULT);
  });

  it("shows the empty-input copy on an empty_input error", async () => {
    streamTailoringMock.mockImplementation(
      scripted([
        { type: "error", code: "empty_input" },
        { type: "status", phase: "failed" },
      ]),
    );
    render(<TailoringForm onResult={vi.fn()} />);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.tailorRun.emptyInput);
  });

  it("shows the generic failed copy on a failed error", async () => {
    streamTailoringMock.mockImplementation(
      scripted([
        { type: "error", code: "failed" },
        { type: "status", phase: "failed" },
      ]),
    );
    render(<TailoringForm onResult={vi.fn()} />);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.tailorRun.failed);
  });

  it("surfaces a thrown error (e.g. malformed NDJSON) as the calm failed alert", async () => {
    streamTailoringMock.mockImplementation(async function* () {
      yield { type: "status", phase: "queued" } as TailorRunEvent;
      throw new Error("boom");
    });
    render(<TailoringForm onResult={vi.fn()} />);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.tailorRun.failed);
  });

  it("disables the submit button while a run is in flight", async () => {
    let releaseRun = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseRun = resolve;
    });
    streamTailoringMock.mockImplementation(async function* () {
      yield { type: "status", phase: "queued" } as TailorRunEvent;
      await gate;
      yield { type: "result", result: SCRIPTED_RESULT } as TailorRunEvent;
      yield { type: "status", phase: "done" } as TailorRunEvent;
    });
    render(<TailoringForm onResult={vi.fn()} />);

    await fillAndSubmit();

    expect(await screen.findByText(ua.tailorRun.queued)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ua.action.tailor })).toBeDisabled();

    releaseRun();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: ua.action.tailor })).not.toBeDisabled();
    });
  });

  it("renders the CV textarea as controlled when cvText is provided (add-upload-cv 4.1)", async () => {
    const onCvTextChange = vi.fn();
    render(
      <TailoringForm onResult={vi.fn()} cvText="from upload" onCvTextChange={onCvTextChange} />,
    );

    const textarea = screen.getByLabelText(ua.workspace.cvLabel);
    expect(textarea).toHaveValue("from upload");

    await userEvent.type(textarea, "x");
    expect(onCvTextChange).toHaveBeenCalledWith("from uploadx");
  });

  it("relays a rate_limited rejection to onRateLimited and shows the inline copy", async () => {
    streamTailoringMock.mockImplementation(
      scripted([
        { type: "error", code: "rate_limited" },
        { type: "status", phase: "failed" },
      ]),
    );
    const onRateLimited = vi.fn();
    render(<TailoringForm onResult={vi.fn()} onRateLimited={onRateLimited} />);

    await fillAndSubmit();

    // Inline copy stays (the form owns the run's error UI)...
    expect(await screen.findByRole("alert")).toHaveTextContent(ua.tailorRun.rateLimited);
    // ...and the composing view is told once, so it can open the paywall
    // above the form (FR-PAYWALL-01) without duplicating limit logic.
    expect(onRateLimited).toHaveBeenCalledTimes(1);
  });

  it("silently drops a submission with a filled honeypot (NFR-SEC-04)", async () => {
    streamTailoringMock.mockClear();
    streamTailoringMock.mockImplementation(
      scripted([{ type: "result", result: SCRIPTED_RESULT }]),
    );
    const onResult = vi.fn();
    const { container } = render(<TailoringForm onResult={onResult} />);

    await userEvent.type(screen.getByLabelText(ua.workspace.cvLabel), "cv text");
    await userEvent.type(screen.getByLabelText(ua.workspace.jdLabel), "jd text");
    // The honeypot is aria-hidden and off-screen — a real visitor never sees
    // it; only a scripted submitter fills it (fireEvent, since userEvent
    // rightly refuses to interact with hidden elements).
    const honeypot = container.querySelector('input[name="website"]');
    expect(honeypot).not.toBeNull();
    fireEvent.change(honeypot as HTMLInputElement, {
      target: { value: "https://spam.example" },
    });
    await userEvent.click(screen.getByRole("button", { name: ua.action.tailor }));

    // Silent no-op: no API call, no error, no progress, no disabled button —
    // nothing distinguishes detection to the submitter.
    expect(streamTailoringMock).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: ua.action.tailor })).not.toBeDisabled();
  });
});
