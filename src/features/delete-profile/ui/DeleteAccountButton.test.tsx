// Delete-account behavior (FR-CV-05, NFR-GDPR-02): two-step confirm, calls
// DELETE /api/account, navigates away on success, calm error on failure.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";

import { DeleteAccountButton } from "./DeleteAccountButton";

// jsdom's window.location.assign is non-configurable, so it can't be spied
// directly — swap the whole location object for the test and restore after.
const realLocation = window.location;
function stubLocationAssign() {
  const assign = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...realLocation, assign },
  });
  return assign;
}

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: realLocation });
  vi.restoreAllMocks();
});

describe("DeleteAccountButton", () => {
  it("requires a confirm step before deleting (never fires on one click)", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<DeleteAccountButton />);

    fireEvent.click(screen.getByRole("button", { name: ua.profile.deleteAction }));
    // Confirm prompt appears; no request yet.
    expect(screen.getByText(ua.profile.deleteConfirmPrompt)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    // Cancel returns to idle without deleting.
    fireEvent.click(screen.getByRole("button", { name: ua.profile.deleteCancelAction }));
    expect(screen.queryByText(ua.profile.deleteConfirmPrompt)).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls DELETE /api/account and navigates to / on success", async () => {
    const assign = stubLocationAssign();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(<DeleteAccountButton />);

    fireEvent.click(screen.getByRole("button", { name: ua.profile.deleteAction }));
    fireEvent.click(screen.getByRole("button", { name: ua.profile.deleteConfirmAction }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(fetchSpy).toHaveBeenCalledWith("/api/account", { method: "DELETE" });
  });

  it("shows a calm error and stays put when the request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));
    render(<DeleteAccountButton />);

    fireEvent.click(screen.getByRole("button", { name: ua.profile.deleteAction }));
    fireEvent.click(screen.getByRole("button", { name: ua.profile.deleteConfirmAction }));

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.profile.deleteError);
  });
});
