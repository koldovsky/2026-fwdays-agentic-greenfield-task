// Component test for the add/edit measurement form island (task 1.7). Asserts the
// jsdom-level a11y + repopulation contract the design's SC-6 deferral note relies
// on: every field renders with an accessible label; the measured-on field is a
// native <input type="date"> defaulting to today; on a { ok:false } round-trip the
// FormErrorBanner + per-field FieldError show, the FieldError is associated via the
// {id}-error convention (aria-describedby + aria-invalid), and the typed value is
// preserved via defaultValue.
//
// The server actions are mocked: MeasurementForm calls them through
// useActionState, so we drive the action to a chosen ActionResult and assert the
// rendered result.
//
// @trace FR-GROWTH-01
// @trace FR-GROWTH-05
// @trace FR-SHELL-03
// @trace NFR-A11Y-04
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";

// next/navigation's useRouter is used by the success-refresh effect; stub it so
// the client component renders outside the App Router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// The form invokes these server actions through useActionState. We control the
// returned ActionResult per test so we can render the failure UI deterministically.
const createMeasurementAction =
  vi.fn<(plantId: number, formData: FormData) => Promise<ActionResult>>();
const updateMeasurementAction =
  vi.fn<(id: number, formData: FormData) => Promise<ActionResult>>();
vi.mock("@/lib/growth/actions", () => ({
  createMeasurementAction: (plantId: number, formData: FormData) =>
    createMeasurementAction(plantId, formData),
  updateMeasurementAction: (id: number, formData: FormData) =>
    updateMeasurementAction(id, formData),
}));

// Imported after the mocks are registered.
import { MeasurementForm } from "@/components/growth/MeasurementForm";

const TODAY = "2026-06-29";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<MeasurementForm> — fields & labels (FR-GROWTH-01, NFR-A11Y-04)", () => {
  it("renders the height and measured-on fields with accessible labels", () => {
    render(<MeasurementForm plantId={1} today={TODAY} />);

    expect(
      screen.getByRole("textbox", { name: uk.growth.heightLabel }),
    ).toBeInTheDocument();

    // The measured-on field is a native <input type="date"> (not a textbox).
    const dateInput = screen.getByLabelText(uk.growth.measuredOnLabel);
    expect(dateInput).toHaveAttribute("type", "date");
  });

  it("defaults the date field to today for a fresh add", () => {
    render(<MeasurementForm plantId={1} today={TODAY} />);
    const dateInput = screen.getByLabelText(
      uk.growth.measuredOnLabel,
    ) as HTMLInputElement;
    expect(dateInput.value).toBe(TODAY);
  });
});

describe("<MeasurementForm> — failed submit shows + repopulates (FR-GROWTH-05, FR-SHELL-03)", () => {
  it("shows a FieldError associated via {id}-error and repopulates the typed value", async () => {
    const user = userEvent.setup();
    // The action rejects the submit with a height field error, echoing the typed
    // values so the uncontrolled inputs repopulate.
    createMeasurementAction.mockResolvedValue({
      ok: false,
      fieldErrors: { heightCm: uk.growth.fieldErrors.heightInvalid },
      values: { heightCm: "abc", measuredOn: TODAY },
    });

    render(<MeasurementForm plantId={1} today={TODAY} />);

    const heightInput = screen.getByRole("textbox", {
      name: uk.growth.heightLabel,
    });
    await user.type(heightInput, "abc");
    await user.click(screen.getByRole("button", { name: uk.growth.add }));

    // The per-field FieldError renders the Ukrainian message.
    const fieldError = await screen.findByText(
      uk.growth.fieldErrors.heightInvalid,
    );
    // Associated via the {id}-error convention so the input aria-describedby it.
    expect(fieldError).toHaveAttribute("id", "heightCm-error");
    await waitFor(() =>
      expect(heightInput).toHaveAttribute(
        "aria-describedby",
        "heightCm-error",
      ),
    );
    expect(heightInput).toHaveAttribute("aria-invalid", "true");

    // The typed value is repopulated from result.values via defaultValue.
    await waitFor(() =>
      expect((heightInput as HTMLInputElement).value).toBe("abc"),
    );
  });

  it("shows the FormErrorBanner for a whole-form error", async () => {
    const user = userEvent.setup();
    createMeasurementAction.mockResolvedValue({
      ok: false,
      formError: uk.errors.generic,
      values: { heightCm: "12,5", measuredOn: TODAY },
    });

    render(<MeasurementForm plantId={1} today={TODAY} />);
    await user.type(
      screen.getByRole("textbox", { name: uk.growth.heightLabel }),
      "12,5",
    );
    await user.click(screen.getByRole("button", { name: uk.growth.add }));

    expect(await screen.findByText(uk.errors.generic)).toBeInTheDocument();
  });
});
