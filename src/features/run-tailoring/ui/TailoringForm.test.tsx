// Behavioral tests for the tailoring form (FR-CV-02, FR-JD-01, FR-TAILOR-01,
// NFR-OBS-01). `streamTailoring` is mocked with scripted async generators so
// these tests exercise the form's own state machine, not the real NDJSON
// parsing (that's stream-tailoring.test.ts's job).
import { render, screen, waitFor } from "@testing-library/react";
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
});
