// RED (Phase 4b, slice 7 add-reminders, task 1.11) — the reminder-row contract,
// written from the spec BEFORE the implementation. The row is a client island
// (the done-swap is an optimistic local transition, design D7). Asserts the
// jsdom-provable contract:
//   - the plant name and an urgency-COLORED due line render (overdue -> danger
//     class, soon -> soon class), so an overdue row never shows the soon color;
//   - the water-now control has an ACCESSIBLE LABEL and is keyboard-operable
//     (SC-6, NFR-A11Y-04);
//   - activating it INVOKES waterNowAction(id) once, then the control SWAPS to a
//     done/confirmation state showing "Полито щойно ✓" (FR-REM-05).
//
// What it deliberately does NOT assert: exact paint (radius, the 54px thumb,
// the stripe gradient) — those are Phase-6 vision concerns.
//
// Imports fail until components/reminders/ReminderRow.tsx, lib/reminders/actions
// (waterNowAction), and uk.reminders copy exist. That is the intended RED.
//
// @trace FR-REM-04
// @trace FR-REM-05
// @trace SC-6
// @trace NFR-A11Y-04
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";

// The row calls the water-now server action; mock it so we assert the wiring +
// the done-swap, not a real DB write.
const waterNowAction = vi.fn<(plantId: number) => Promise<ActionResult>>();
vi.mock("@/lib/reminders/actions", () => ({
  waterNowAction: (plantId: number) => waterNowAction(plantId),
}));

import { ReminderRow } from "@/components/reminders/ReminderRow";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<ReminderRow> — structure & urgency-colored due line (FR-REM-04)", () => {
  it("renders the plant name", () => {
    render(
      <ReminderRow id={7} name="Монстера" status="overdue" dueLabel="Прострочено на 3 дні" />,
    );
    expect(screen.getByText("Монстера")).toBeInTheDocument();
  });

  it("colors the due line with the OVERDUE/danger class for an overdue row", () => {
    render(
      <ReminderRow id={7} name="Монстера" status="overdue" dueLabel="Прострочено на 3 дні" />,
    );
    const dueLine = screen.getByText("Прострочено на 3 дні");
    // Overdue uses the danger/overdue color, never the soon color (design D7).
    expect(dueLine.className).toMatch(/danger|overdue/);
    expect(dueLine.className).not.toMatch(/\bsoon\b/);
  });

  it("colors the due line with the SOON class for a soon row", () => {
    render(<ReminderRow id={8} name="Фікус" status="soon" dueLabel="Полити сьогодні" />);
    const dueLine = screen.getByText("Полити сьогодні");
    expect(dueLine.className).toMatch(/soon|clay/);
  });
});

describe("<ReminderRow> — water-now action + done swap (FR-REM-05, SC-6, NFR-A11Y-04)", () => {
  it("exposes a keyboard-operable water-now control with an accessible label", () => {
    render(<ReminderRow id={7} name="Монстера" status="overdue" dueLabel="Прострочено" />);
    const control = screen.getByRole("button", { name: uk.reminders.waterNow });
    expect(control).toBeInTheDocument();
  });

  it("invokes waterNowAction(id) once on click, then swaps to the done state", async () => {
    const user = userEvent.setup();
    waterNowAction.mockResolvedValue({ ok: true });
    render(<ReminderRow id={7} name="Монстера" status="overdue" dueLabel="Прострочено" />);

    await user.click(screen.getByRole("button", { name: uk.reminders.waterNow }));

    expect(waterNowAction).toHaveBeenCalledTimes(1);
    expect(waterNowAction).toHaveBeenCalledWith(7);

    // The control swaps to the done/confirmation state ("Полито щойно ✓").
    expect(await screen.findByText(uk.reminders.doneLabel)).toBeInTheDocument();
  });

  it("surfaces the returned error inline and does NOT swap to done when the action fails (FR-REM-05, FR-SHELL-03)", async () => {
    const user = userEvent.setup();
    waterNowAction.mockResolvedValue({
      ok: false,
      formError: uk.reminders.notFound,
    });
    render(<ReminderRow id={7} name="Монстера" status="overdue" dueLabel="Прострочено" />);

    await user.click(screen.getByRole("button", { name: uk.reminders.waterNow }));

    // The returned formError is shown to the user (role=alert), not swallowed.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(uk.reminders.notFound);

    // The row stays in the not-done state: the done confirmation is absent and
    // the water-now control remains available.
    expect(screen.queryByText(uk.reminders.doneLabel)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: uk.reminders.waterNow }),
    ).toBeInTheDocument();
  });

  it("is operable by keyboard (Enter activates the water-now control)", async () => {
    const user = userEvent.setup();
    waterNowAction.mockResolvedValue({ ok: true });
    render(<ReminderRow id={9} name="Кактус" status="soon" dueLabel="Полити сьогодні" />);

    const control = screen.getByRole("button", { name: uk.reminders.waterNow });
    control.focus();
    expect(control).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(waterNowAction).toHaveBeenCalledWith(9);
  });
});
