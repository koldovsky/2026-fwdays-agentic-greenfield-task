// RED (Phase 4b) — component test for the add/edit watering form island (task
// 1.7), written from the spec BEFORE the implementation. Asserts the jsdom-level
// a11y + repopulation contract the design's SC-6 deferral note relies on: every
// field renders with an accessible label; the watered-on field is a native
// <input type="date"> defaulting to today; the note is OPTIONAL (an empty-note
// submit is allowed); on a { ok:false } round-trip the FormErrorBanner +
// per-field FieldError show, the FieldError is associated via the {id}-error
// convention (aria-describedby + aria-invalid), and the typed values (date + note)
// are preserved via defaultValue. The server actions are mocked: WateringForm
// calls them through useActionState, so we drive the action to a chosen
// ActionResult and assert the rendered result. Imports fail until the component +
// the lib/watering actions + the uk.watering copy block exist.
//
// @trace FR-WATER-01
// @trace FR-WATER-02
// @trace FR-SHELL-03
// @trace NFR-A11Y-04
// @trace SC-1
// @trace SC-6
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
const createWateringAction =
  vi.fn<(plantId: number, formData: FormData) => Promise<ActionResult>>();
const updateWateringAction =
  vi.fn<(id: number, formData: FormData) => Promise<ActionResult>>();
vi.mock("@/lib/watering/actions", () => ({
  createWateringAction: (plantId: number, formData: FormData) =>
    createWateringAction(plantId, formData),
  updateWateringAction: (id: number, formData: FormData) =>
    updateWateringAction(id, formData),
}));

// Imported after the mocks are registered.
import { WateringForm } from "@/components/watering/WateringForm";

const TODAY = "2026-06-29";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<WateringForm> — fields & labels (FR-WATER-01, FR-WATER-02, NFR-A11Y-04)", () => {
  it("renders the watered-on date field with an accessible label, as a native date input", () => {
    render(<WateringForm plantId={1} today={TODAY} />);

    const dateInput = screen.getByLabelText(uk.watering.wateredOnLabel);
    expect(dateInput).toHaveAttribute("type", "date");
  });

  it("renders an OPTIONAL note field with an accessible label", () => {
    render(<WateringForm plantId={1} today={TODAY} />);

    const noteInput = screen.getByLabelText(uk.watering.noteLabel);
    expect(noteInput).toBeInTheDocument();
    // Optional: the note field is NOT marked required.
    expect(noteInput).not.toBeRequired();
  });

  it("defaults the date field to today for a fresh add (FR-WATER-01)", () => {
    render(<WateringForm plantId={1} today={TODAY} />);
    const dateInput = screen.getByLabelText(
      uk.watering.wateredOnLabel,
    ) as HTMLInputElement;
    expect(dateInput.value).toBe(TODAY);
  });
});

describe("<WateringForm> — optional note: empty submit is allowed (FR-WATER-02)", () => {
  it("submits successfully with the note left empty (the note is optional)", async () => {
    const user = userEvent.setup();
    createWateringAction.mockResolvedValue({ ok: true });

    render(<WateringForm plantId={1} today={TODAY} />);
    // Submit WITHOUT typing a note.
    await user.click(screen.getByRole("button", { name: uk.watering.add }));

    await waitFor(() => expect(createWateringAction).toHaveBeenCalledTimes(1));
    // No field error surfaced for the missing note.
    expect(
      screen.queryByText(uk.watering.fieldErrors.noteTooLong),
    ).not.toBeInTheDocument();
  });
});

describe("<WateringForm> — failed submit shows + repopulates (FR-WATER-02, FR-SHELL-03)", () => {
  it("shows the note FieldError associated via {id}-error and repopulates the typed note", async () => {
    const user = userEvent.setup();
    const longNote = "я".repeat(501);
    // The action rejects the submit with a note field error, echoing the typed
    // values so the uncontrolled inputs repopulate.
    createWateringAction.mockResolvedValue({
      ok: false,
      fieldErrors: { note: uk.watering.fieldErrors.noteTooLong },
      values: { wateredOn: TODAY, note: longNote },
    });

    render(<WateringForm plantId={1} today={TODAY} />);

    const noteInput = screen.getByLabelText(uk.watering.noteLabel);
    await user.type(noteInput, "забагато");
    await user.click(screen.getByRole("button", { name: uk.watering.add }));

    // The per-field FieldError renders the Ukrainian message. Ids are namespaced
    // per form instance (the add form is the "watering-new" scope) so a row's edit
    // form on the same page never collides (design R7).
    const fieldError = await screen.findByText(
      uk.watering.fieldErrors.noteTooLong,
    );
    expect(fieldError).toHaveAttribute("id", "watering-new-note-error");
    // When an error shows, aria-describedby references BOTH the error and the hint
    // so assistive tech keeps announcing the constraint hint (append, not replace).
    await waitFor(() =>
      expect(noteInput).toHaveAttribute(
        "aria-describedby",
        "watering-new-note-error watering-new-note-hint",
      ),
    );
    expect(noteInput).toHaveAttribute("aria-invalid", "true");

    // The typed note is repopulated from result.values via defaultValue.
    await waitFor(() =>
      expect((noteInput as HTMLTextAreaElement | HTMLInputElement).value).toBe(
        longNote,
      ),
    );
  });

  it("shows the date FieldError + repopulates the typed date on a future-date rejection (SC-2)", async () => {
    const user = userEvent.setup();
    createWateringAction.mockResolvedValue({
      ok: false,
      fieldErrors: { wateredOn: uk.watering.fieldErrors.dateFuture },
      values: { wateredOn: "2999-01-01", note: "" },
    });

    render(<WateringForm plantId={1} today={TODAY} />);
    await user.click(screen.getByRole("button", { name: uk.watering.add }));

    const fieldError = await screen.findByText(
      uk.watering.fieldErrors.dateFuture,
    );
    expect(fieldError).toHaveAttribute("id", "watering-new-wateredOn-error");
    const dateInput = screen.getByLabelText(
      uk.watering.wateredOnLabel,
    ) as HTMLInputElement;
    await waitFor(() => expect(dateInput.value).toBe("2999-01-01"));
  });

  it("shows the FormErrorBanner for a whole-form error", async () => {
    const user = userEvent.setup();
    createWateringAction.mockResolvedValue({
      ok: false,
      formError: uk.errors.generic,
      values: { wateredOn: TODAY, note: "" },
    });

    render(<WateringForm plantId={1} today={TODAY} />);
    await user.click(screen.getByRole("button", { name: uk.watering.add }));

    expect(await screen.findByText(uk.errors.generic)).toBeInTheDocument();
  });
});

describe("<WateringForm> — namespaced field ids avoid DOM-id collisions (design R7)", () => {
  it("scopes field ids per instance so an add form + an edit form do not collide", () => {
    const { container } = render(
      <div>
        {/* The always-present add form... */}
        <WateringForm plantId={1} today={TODAY} />
        {/* ...alongside an inline edit form for an existing row. */}
        <WateringForm
          plantId={1}
          id={42}
          today={TODAY}
          defaults={{ wateredOn: "2026-06-01", note: "колись" }}
        />
      </div>,
    );

    // Every element id in the combined tree must be unique (duplicate ids break
    // label[for] / aria-describedby association per the HTML spec).
    const ids = Array.from(container.querySelectorAll("[id]")).map(
      (el) => el.id,
    );
    expect(new Set(ids).size).toBe(ids.length);

    // The two instances expose distinct, scoped ids.
    expect(container.querySelector("#watering-new-wateredOn")).not.toBeNull();
    expect(container.querySelector("#watering-new-note")).not.toBeNull();
    expect(container.querySelector("#watering-42-wateredOn")).not.toBeNull();
    expect(container.querySelector("#watering-42-note")).not.toBeNull();
  });

  it("keeps the hint id in aria-describedby alongside the error id when an error shows", async () => {
    const user = userEvent.setup();
    createWateringAction.mockResolvedValue({
      ok: false,
      fieldErrors: { wateredOn: uk.watering.fieldErrors.dateFuture },
      values: { wateredOn: "2999-01-01", note: "" },
    });

    render(<WateringForm plantId={1} today={TODAY} />);
    await user.click(screen.getByRole("button", { name: uk.watering.add }));

    const dateInput = screen.getByLabelText(uk.watering.wateredOnLabel);
    await waitFor(() =>
      expect(dateInput).toHaveAttribute(
        "aria-describedby",
        "watering-new-wateredOn-error watering-new-wateredOn-hint",
      ),
    );
    // Both referenced ids resolve to real nodes.
    expect(
      document.getElementById("watering-new-wateredOn-error"),
    ).not.toBeNull();
    expect(
      document.getElementById("watering-new-wateredOn-hint"),
    ).not.toBeNull();
  });
});
