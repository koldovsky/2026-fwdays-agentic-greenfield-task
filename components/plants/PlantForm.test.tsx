// Component test for the add/edit form island (task 1.6). Asserts the jsdom-level
// a11y + repopulation contract the design's "Accepted limitations" relies on:
// every field renders with an accessible label; on a { ok:false } round-trip the
// FormErrorBanner + per-field FieldError show, the FieldError is associated via
// the {id}-error convention (aria-describedby), and the typed value is preserved
// via defaultValue (slice-1 D3 repopulation). The acquired-date field is a
// native <input type="date">.
//
// The server actions are mocked: PlantForm calls them through useActionState, so
// we drive the action to a chosen ActionResult and assert the rendered result.
//
// @trace FR-PLANT-01
// @trace FR-SHELL-03
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";
import { SPECIES_DEFAULT } from "@/lib/plants/validation";

// next/navigation's useRouter is used by the success-navigation effect; stub it
// so the client component renders outside the App Router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// The form invokes these server actions through useActionState. We control the
// returned ActionResult per test so we can render the failure UI deterministically.
const createPlantAction = vi.fn<(formData: FormData) => Promise<ActionResult>>();
const updatePlantAction =
  vi.fn<(id: number, formData: FormData) => Promise<ActionResult>>();
vi.mock("@/lib/plants/actions", () => ({
  createPlantAction: (formData: FormData) => createPlantAction(formData),
  updatePlantAction: (id: number, formData: FormData) =>
    updatePlantAction(id, formData),
}));

// Imported after the mocks are registered.
import { PlantForm } from "@/components/plants/PlantForm";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<PlantForm> — fields & labels (FR-PLANT-01)", () => {
  it("renders the name, species and acquired-date fields with accessible labels", () => {
    render(<PlantForm />);
    expect(
      screen.getByRole("textbox", { name: uk.plants.nameLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: uk.plants.speciesLabel }),
    ).toBeInTheDocument();

    // The acquired-date field is a native <input type="date"> (not a textbox).
    const dateInput = screen.getByLabelText(uk.plants.acquiredDateLabel);
    expect(dateInput).toHaveAttribute("type", "date");
  });

  it("prefills the species field with the canonical default for a fresh add", () => {
    render(<PlantForm />);
    const species = screen.getByRole("textbox", {
      name: uk.plants.speciesLabel,
    }) as HTMLInputElement;
    expect(species.value).toBe(SPECIES_DEFAULT);
  });
});

describe("<PlantForm> — failed submit shows + repopulates (FR-SHELL-03)", () => {
  it("shows a FieldError associated via {id}-error and repopulates the typed value", async () => {
    const user = userEvent.setup();
    // The action rejects the submit: a name field error, echoing the typed values
    // so the uncontrolled inputs repopulate.
    createPlantAction.mockResolvedValue({
      ok: false,
      fieldErrors: { name: uk.plants.fieldErrors.nameRequired },
      values: { name: "", species: "Кактус", acquiredDate: "" },
    });

    render(<PlantForm />);

    const nameInput = screen.getByRole("textbox", {
      name: uk.plants.nameLabel,
    });
    // Type a value the server will reject (then echo back) into species.
    const speciesInput = screen.getByRole("textbox", {
      name: uk.plants.speciesLabel,
    });
    await user.clear(speciesInput);
    await user.type(speciesInput, "Кактус");

    await user.click(screen.getByRole("button", { name: uk.plants.save }));

    // The per-field FieldError renders the Ukrainian message via role=alert. Ids
    // are namespaced per form instance (the add form is the "plant-new" scope) so
    // the pattern matches the watering/measurement forms (design R7).
    const fieldError = await screen.findByText(
      uk.plants.fieldErrors.nameRequired,
    );
    expect(fieldError).toHaveAttribute("id", "plant-new-name-error");
    // The name field has no hint, so its describedby is just the error id.
    await waitFor(() =>
      expect(nameInput).toHaveAttribute(
        "aria-describedby",
        "plant-new-name-error",
      ),
    );
    expect(nameInput).toHaveAttribute("aria-invalid", "true");

    // The typed value is repopulated from result.values via defaultValue.
    await waitFor(() =>
      expect((speciesInput as HTMLInputElement).value).toBe("Кактус"),
    );
  });

  it("shows the FormErrorBanner for a whole-form error", async () => {
    const user = userEvent.setup();
    createPlantAction.mockResolvedValue({
      ok: false,
      formError: uk.errors.generic,
      values: { name: "Фікус", species: "", acquiredDate: "" },
    });

    render(<PlantForm />);
    await user.type(
      screen.getByRole("textbox", { name: uk.plants.nameLabel }),
      "Фікус",
    );
    await user.click(screen.getByRole("button", { name: uk.plants.save }));

    expect(await screen.findByText(uk.errors.generic)).toBeInTheDocument();
  });
});

describe("<PlantForm> — namespaced field ids avoid DOM-id collisions (design R7)", () => {
  it("scopes field ids per instance so an add form + an edit form do not collide", () => {
    const { container } = render(
      <div>
        <PlantForm />
        <PlantForm
          id={9}
          defaults={{ name: "Фікус", species: "Кактус", acquiredDate: "" }}
        />
      </div>,
    );

    const ids = Array.from(container.querySelectorAll("[id]")).map(
      (el) => el.id,
    );
    expect(new Set(ids).size).toBe(ids.length);

    expect(container.querySelector("#plant-new-name")).not.toBeNull();
    expect(container.querySelector("#plant-9-name")).not.toBeNull();
  });

  it("keeps the hint id in aria-describedby alongside the error id when a hinted field errors", async () => {
    const user = userEvent.setup();
    createPlantAction.mockResolvedValue({
      ok: false,
      fieldErrors: { species: uk.plants.fieldErrors.speciesTooLong },
      values: { name: "Фікус", species: "x", acquiredDate: "" },
    });

    render(<PlantForm />);
    await user.type(
      screen.getByRole("textbox", { name: uk.plants.nameLabel }),
      "Фікус",
    );
    await user.click(screen.getByRole("button", { name: uk.plants.save }));

    const speciesInput = screen.getByRole("textbox", {
      name: uk.plants.speciesLabel,
    });
    await waitFor(() =>
      expect(speciesInput).toHaveAttribute(
        "aria-describedby",
        "plant-new-species-error plant-new-species-hint",
      ),
    );
    expect(
      document.getElementById("plant-new-species-error"),
    ).not.toBeNull();
    expect(document.getElementById("plant-new-species-hint")).not.toBeNull();
  });
});
