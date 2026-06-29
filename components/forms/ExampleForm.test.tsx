// Pins the "input intact" behavior of the shared FR-SHELL-03 form pattern that
// slices 2–5 inherit. React 19's <form action> auto-resets uncontrolled inputs
// once the action resolves, so on a { ok:false } validation failure the typed
// value would be wiped — contradicting design D3's "input intact" promise. The
// fix echoes the submitted `values` and repopulates via defaultValue. This test
// asserts the typed value survives a failed-submit round-trip.
//
// @trace FR-SHELL-03
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExampleForm } from "@/components/forms/ExampleForm";
import { uk } from "@/lib/i18n/uk";

// Mock the server action with a plain function: on empty name it returns the
// real { ok:false, fieldErrors, values } shape, echoing the submitted value.
vi.mock("@/app/example-form-action", () => ({
  submitExample: async (_prev: unknown, formData: FormData) => {
    const rawName = String(formData.get("name") ?? "");
    if (!rawName.trim()) {
      return {
        ok: false,
        fieldErrors: { name: uk.example.nameRequired },
        values: { name: rawName },
      };
    }
    return { ok: true };
  },
}));

afterEach(cleanup);

describe("<ExampleForm> — input intact on validation failure (FR-SHELL-03)", () => {
  it("preserves the previously-entered value after a failed submit", async () => {
    const user = userEvent.setup();
    render(<ExampleForm />);

    const input = screen.getByLabelText(uk.example.nameLabel) as HTMLInputElement;
    // A value that the demo action rejects (whitespace-only => trim() is empty),
    // so we can prove the EXACT submitted string survives the React 19 reset.
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: uk.example.submit }));

    // The inline error appears (failure path taken)...
    await waitFor(() => {
      expect(screen.getByText(uk.example.nameRequired)).toBeInTheDocument();
    });

    // ...and the user's typed value is still in the field (not wiped to empty).
    const after = screen.getByLabelText(uk.example.nameLabel) as HTMLInputElement;
    expect(after.value).toBe("   ");
  });
});
