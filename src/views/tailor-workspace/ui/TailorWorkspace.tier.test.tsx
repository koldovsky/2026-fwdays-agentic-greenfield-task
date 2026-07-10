// Tier-state render tests for TailorWorkspace (FR-ONBOARD-01 revised 2026-07-09,
// FR-PAYWALL-01, NFR-SEC-04). Distinct from TailorWorkspace.test.tsx (which owns
// the wizard state-machine). This file is test-author-independent (clean context):
// the maker wrote the component; these tests are written against the spec, not
// the implementation.
//
// Three tier states under test:
//   A) paid=false, freeExhausted=false → inputs shown (upload zone + CV textarea + JD + Analyze).
//   B) paid=false, freeExhausted=true  → Paywall rendered; NO inputs.
//   C) paid=true                       → upload zone (premium badge visible) + JD + Analyze;
//                                        NO CV résumé textarea.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";

// ── Stub run-tailoring to prevent real network/streaming calls ────────────────
// AnalyzeForm is replaced with a minimal stub that renders the key landmarks
// so we can assert on input presence without running the real form.
const streamGenerateMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/run-tailoring", () => ({
  AnalyzeForm: ({
    paid,
    cvText,
    onCvTextChange,
  }: {
    paid?: boolean;
    cvText?: string;
    onCvTextChange?: (v: string) => void;
  }) => (
    <div data-testid="analyze-form" data-paid={String(paid ?? false)}>
      {/* Résumé textarea only when !paid (mirrors the real component contract). */}
      {!paid && (
        <textarea
          aria-label={ua.workspace.cvLabel}
          value={cvText ?? ""}
          onChange={(e) => onCvTextChange?.(e.target.value)}
        />
      )}
      <textarea aria-label={ua.workspace.jdLabel} readOnly value="" onChange={() => {}} />
      <button type="button">{ua.wizard.analyzeAction}</button>
    </div>
  ),
  streamGenerate: streamGenerateMock,
}));

// ── Stub UploadCvDropzone to surface the paid prop + a recognisable landmark ──
vi.mock("@/features/upload-cv", () => ({
  UploadCvDropzone: ({
    paid,
  }: {
    paid?: boolean;
    locale?: string;
    onExtracted?: (t: string) => void;
    onAttachmentChange?: (a: unknown) => void;
    onUpgrade?: () => void;
  }) => (
    <div data-testid="upload-cv-dropzone" data-paid={String(paid ?? false)}>
      {paid && (
        <span data-testid="premium-badge">{ua.uploadCv.attach.premiumBadge}</span>
      )}
    </div>
  ),
}));

// ── Stub Paywall to expose reason prop for assertions ─────────────────────────
vi.mock("@/widgets/paywall", () => ({
  Paywall: ({ reason }: { reason: string; locale?: string; onDismiss?: () => void }) => (
    <div
      data-testid="paywall"
      data-reason={reason}
      role="region"
      aria-label={ua.paywall.regionLabel}
    >
      {ua.paywall.limitLead}
    </div>
  ),
}));

// ── Stub remaining widgets that the component composes ────────────────────────
vi.mock("@/widgets/checklist-panel", () => ({
  ChecklistPanel: () => <div data-testid="checklist-panel" />,
}));
vi.mock("@/widgets/bullet-list", () => ({
  BulletList: () => <div data-testid="bullet-list" />,
}));
vi.mock("@/widgets/result-view", () => ({
  ResultView: ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) => (
    <div data-testid="result-view">{left}{right}</div>
  ),
}));
vi.mock("@/widgets/export-stepper", () => ({
  ExportStepper: () => <div data-testid="export-stepper" />,
}));
vi.mock("@/features/clarify-tailoring", () => ({
  ClarifyingQuestions: () => <div data-testid="clarify" />,
}));

import { TailorWorkspace } from "./TailorWorkspace";

describe("TailorWorkspace tier state A — free account, first run available (paid=false, freeExhausted=false)", () => {
  it("renders the upload zone and AnalyzeForm", () => {
    render(<TailorWorkspace paid={false} freeExhausted={false} />);
    expect(screen.getByTestId("upload-cv-dropzone")).toBeInTheDocument();
    expect(screen.getByTestId("analyze-form")).toBeInTheDocument();
  });

  it("shows the CV résumé textarea (free paste path, FR-CV-03)", () => {
    render(<TailorWorkspace paid={false} freeExhausted={false} />);
    expect(screen.getByLabelText(ua.workspace.cvLabel)).toBeInTheDocument();
  });

  it("shows the JD textarea and Analyze button", () => {
    render(<TailorWorkspace paid={false} freeExhausted={false} />);
    expect(screen.getByLabelText(ua.workspace.jdLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ua.wizard.analyzeAction })).toBeInTheDocument();
  });

  it("does NOT render the Paywall", () => {
    render(<TailorWorkspace paid={false} freeExhausted={false} />);
    expect(screen.queryByTestId("paywall")).not.toBeInTheDocument();
  });

  it("defaults to this state when no props are passed (safe default)", () => {
    render(<TailorWorkspace />);
    expect(screen.getByTestId("analyze-form")).toBeInTheDocument();
    expect(screen.queryByTestId("paywall")).not.toBeInTheDocument();
  });
});

describe("TailorWorkspace tier state B — free account, limit spent (paid=false, freeExhausted=true)", () => {
  it("renders the Paywall widget with reason='tailoring-limit'", () => {
    render(<TailorWorkspace paid={false} freeExhausted={true} />);
    const paywall = screen.getByTestId("paywall");
    expect(paywall).toBeInTheDocument();
    expect(paywall).toHaveAttribute("data-reason", "tailoring-limit");
  });

  it("shows limit-specific copy inside the Paywall (NFR-I18N-01)", () => {
    render(<TailorWorkspace paid={false} freeExhausted={true} />);
    expect(screen.getByText(ua.paywall.limitLead)).toBeInTheDocument();
  });

  it("does NOT render UploadCvDropzone (no inputs for an exhausted account)", () => {
    render(<TailorWorkspace paid={false} freeExhausted={true} />);
    expect(screen.queryByTestId("upload-cv-dropzone")).not.toBeInTheDocument();
  });

  it("does NOT render AnalyzeForm (no inputs for an exhausted account)", () => {
    render(<TailorWorkspace paid={false} freeExhausted={true} />);
    expect(screen.queryByTestId("analyze-form")).not.toBeInTheDocument();
  });

  it("does NOT render the CV résumé textarea", () => {
    render(<TailorWorkspace paid={false} freeExhausted={true} />);
    expect(screen.queryByLabelText(ua.workspace.cvLabel)).not.toBeInTheDocument();
  });

  it("still renders WizardSteps and the lead paragraph above the phase (layout remains)", () => {
    render(<TailorWorkspace paid={false} freeExhausted={true} />);
    // The workspace lead text is always rendered regardless of tier state.
    expect(screen.getByText(ua.workspace.lead)).toBeInTheDocument();
  });
});

describe("TailorWorkspace tier state C — paid account (paid=true)", () => {
  it("renders the upload zone and AnalyzeForm", () => {
    render(<TailorWorkspace paid={true} freeExhausted={false} />);
    expect(screen.getByTestId("upload-cv-dropzone")).toBeInTheDocument();
    expect(screen.getByTestId("analyze-form")).toBeInTheDocument();
  });

  it("passes paid=true to the upload zone (enables live drop target)", () => {
    render(<TailorWorkspace paid={true} />);
    expect(screen.getByTestId("upload-cv-dropzone")).toHaveAttribute("data-paid", "true");
  });

  it("does NOT render the CV résumé textarea (paid users upload via the drop zone)", () => {
    render(<TailorWorkspace paid={true} />);
    // AnalyzeForm suppresses the textarea when paid=true; the JD field stays.
    expect(screen.queryByLabelText(ua.workspace.cvLabel)).not.toBeInTheDocument();
  });

  it("still renders the JD textarea and Analyze button", () => {
    render(<TailorWorkspace paid={true} />);
    expect(screen.getByLabelText(ua.workspace.jdLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ua.wizard.analyzeAction })).toBeInTheDocument();
  });

  it("does NOT render the Paywall (freeExhausted is ignored for paid)", () => {
    // Even if freeExhausted=true is erroneously passed alongside paid=true,
    // the paid branch takes precedence and no paywall is rendered.
    render(<TailorWorkspace paid={true} freeExhausted={true} />);
    expect(screen.queryByTestId("paywall")).not.toBeInTheDocument();
  });
});

describe("TailorWorkspace AnalyzeForm paid prop threading", () => {
  it("passes paid=false to AnalyzeForm for a free user", () => {
    render(<TailorWorkspace paid={false} freeExhausted={false} />);
    expect(screen.getByTestId("analyze-form")).toHaveAttribute("data-paid", "false");
  });

  it("passes paid=true to AnalyzeForm for a paid user", () => {
    render(<TailorWorkspace paid={true} />);
    expect(screen.getByTestId("analyze-form")).toHaveAttribute("data-paid", "true");
  });
});
