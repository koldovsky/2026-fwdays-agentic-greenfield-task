// WizardSteps reflects where the user actually is (FR-WIZARD-05): the clarify
// step is shown only when the flow includes it, so a skipped clarify never
// appears as a completed step.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ua } from "@/shared/lib/i18n";

import { WizardSteps } from "./WizardSteps";

describe("WizardSteps (FR-WIZARD-05)", () => {
  it("marks the current step and shows the full sequence by default", () => {
    render(<WizardSteps current="confirm" />);
    const current = screen.getByText(ua.wizard.stepConfirm).closest("[aria-current]");
    expect(current).toHaveAttribute("aria-current", "step");
    expect(screen.getByText(ua.wizard.stepClarify)).toBeInTheDocument();
  });

  it("drops the clarify step when the flow skips it", () => {
    render(<WizardSteps current="generate" includeClarify={false} />);
    expect(screen.queryByText(ua.wizard.stepClarify)).not.toBeInTheDocument();
    expect(screen.getByText(ua.wizard.stepGenerate)).toBeInTheDocument();
  });
});
