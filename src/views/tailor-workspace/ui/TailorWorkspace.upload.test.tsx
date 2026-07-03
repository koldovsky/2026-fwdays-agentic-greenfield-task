// View-level composition test for the upload path (add-upload-cv task 4.2,
// FR-CV-01 + the confirm/re-upload half of FR-CV-03). Only the upload-cv
// barrel is mocked (fake extract triggers); the REAL TailoringForm renders so
// the lifted cvText state is proven against the actual controlled textarea —
// extracted text lands there for review, editing works, a re-upload replaces
// it, and no tailoring run ever starts on its own.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";

import { TailorWorkspace } from "./TailorWorkspace";

vi.mock("@/features/upload-cv", () => ({
  UploadCvDropzone: ({ onExtracted }: { onExtracted: (text: string) => void }) => (
    <>
      <button type="button" onClick={() => onExtracted("first extracted text")}>
        fake extract first
      </button>
      <button type="button" onClick={() => onExtracted("second extracted text")}>
        fake extract second
      </button>
    </>
  ),
}));

function cvTextarea(): HTMLTextAreaElement {
  return screen.getByLabelText(ua.workspace.cvLabel) as HTMLTextAreaElement;
}

describe("TailorWorkspace upload composition (FR-CV-01, FR-CV-03)", () => {
  it("puts extracted text into the CV textarea without starting a run", async () => {
    render(<TailorWorkspace />);

    await userEvent.click(screen.getByRole("button", { name: "fake extract first" }));

    expect(cvTextarea()).toHaveValue("first extracted text");
    // Review, not run: no progress status, no result region, empty state intact.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(ua.workspace.emptyState)).toBeInTheDocument();
  });

  it("lets the user edit the extracted text before tailoring", async () => {
    render(<TailorWorkspace />);

    await userEvent.click(screen.getByRole("button", { name: "fake extract first" }));
    await userEvent.type(cvTextarea(), " plus manual edits");

    expect(cvTextarea()).toHaveValue("first extracted text plus manual edits");
  });

  it("replaces the textarea content on a subsequent upload", async () => {
    render(<TailorWorkspace />);

    await userEvent.click(screen.getByRole("button", { name: "fake extract first" }));
    await userEvent.type(cvTextarea(), " edited");
    await userEvent.click(screen.getByRole("button", { name: "fake extract second" }));

    expect(cvTextarea()).toHaveValue("second extracted text");
  });
});
