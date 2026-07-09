// @vitest-environment jsdom
// apps/dashboard/components/ds/RequestTranscript — lazy-loads the lead's full
// persisted transcript on first expand and renders role-labelled bubbles.

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequestTranscript } from "./RequestTranscript.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RequestTranscript", () => {
  it("is collapsed and does NOT fetch until expanded, then renders the transcript role-labelled", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        messages: [
          { role: "assistant", content: "Як звати дитину і скільки років?" },
          { role: "user", content: "Саша, 7" },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<RequestTranscript requestId={8} />);

    // Collapsed: no fetch yet, no body.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("transcript-body")).toBeNull();

    fireEvent.click(screen.getByTestId("transcript-toggle"));

    await waitFor(() => expect(screen.getByText("Саша, 7")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/requests/8/messages");
    expect(screen.getByText("Як звати дитину і скільки років?")).toBeTruthy();
    // Both role labels present (Школа for assistant, Лід for user).
    expect(screen.getAllByText("Школа").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Лід").length).toBeGreaterThan(0);
  });

  it("shows an error message when the fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    );

    render(<RequestTranscript requestId={9} />);
    fireEvent.click(screen.getByTestId("transcript-toggle"));

    await waitFor(() => expect(screen.getByText("Не вдалося завантажити листування.")).toBeTruthy());
  });
});
