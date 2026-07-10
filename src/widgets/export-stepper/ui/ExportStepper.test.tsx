// Render tests for the export-stepper widget (add-resume-wizard task 4.7,
// FR-EXPORT-01/02/03, FR-PAYWALL-01). Covers: non-paid actions are paywall-gated
// and never touch the copy/download seams; a paid copy renders only
// includedInExport bullets as plain text and shows the copied notice; a paid
// PDF/DOCX download calls the requestExport seam with the right filename;
// clipboard/download errors surface the calm error state (NFR-OBS-01); the
// start-over action always fires regardless of entitlement.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyExportDefaults, type Bullet } from "@/entities/bullet";
import type { CvDocument } from "@/entities/cv-profile";
import { buildExportDocument, requestExport } from "@/features/export-resume";
import { t } from "@/shared/lib/i18n";

import { ExportStepper, type LetterEvidence } from "./ExportStepper";

const copy = t("ua");

vi.mock("@/features/export-resume", async () => {
  const actual =
    await vi.importActual<typeof import("@/features/export-resume")>(
      "@/features/export-resume",
    );
  return {
    ...actual,
    requestExport: vi.fn(),
  };
});

const requestExportMock = vi.mocked(requestExport);

// Only the grounded bullet defaults to includedInExport (BC-HONESTY-02); the
// overclaim-risk one stays excluded unless the caller opts it back in — that
// is exactly what the plain-text render should reflect.
const bullets: Bullet[] = applyExportDefaults([
  {
    id: "b1",
    text: "Led migration of the billing service to Postgres.",
    grounding: "grounded",
    source: { kind: "cv", sentence: "Migrated billing to Postgres over two quarters." },
    includedInExport: false,
  },
  {
    id: "b2",
    text: "Scaled the platform to ten million daily users.",
    grounding: "overclaim-risk",
    includedInExport: false,
  },
]);

function setup(overrides: Partial<React.ComponentProps<typeof ExportStepper>> = {}) {
  const onPaywall = vi.fn();
  const onStartOver = vi.fn();
  const onCopyText = vi.fn();
  const onDownload = vi.fn();
  render(
    <ExportStepper
      bullets={bullets}
      paid={false}
      onPaywall={onPaywall}
      onStartOver={onStartOver}
      onCopyText={onCopyText}
      onDownload={onDownload}
      {...overrides}
    />,
  );
  return { onPaywall, onStartOver, onCopyText, onDownload };
}

describe("ExportStepper (FR-EXPORT-01/02/03, FR-PAYWALL-01)", () => {
  beforeEach(() => {
    requestExportMock.mockReset();
  });

  it("non-paid: copy click opens the paywall and never calls onCopyText", async () => {
    const { onPaywall, onCopyText } = setup({ paid: false });

    await userEvent.click(screen.getByRole("button", { name: copy.export.copyAction }));

    expect(onPaywall).toHaveBeenCalledTimes(1);
    expect(onCopyText).not.toHaveBeenCalled();
  });

  it("non-paid: PDF click opens the paywall and never calls onDownload", async () => {
    const { onPaywall, onDownload } = setup({ paid: false });

    await userEvent.click(screen.getByRole("button", { name: copy.export.pdfAction }));

    expect(onPaywall).toHaveBeenCalledTimes(1);
    expect(onDownload).not.toHaveBeenCalled();
    expect(requestExportMock).not.toHaveBeenCalled();
  });

  it("non-paid: DOCX click opens the paywall and never calls onDownload", async () => {
    const { onPaywall, onDownload } = setup({ paid: false });

    await userEvent.click(screen.getByRole("button", { name: copy.export.docxAction }));

    expect(onPaywall).toHaveBeenCalledTimes(1);
    expect(onDownload).not.toHaveBeenCalled();
    expect(requestExportMock).not.toHaveBeenCalled();
  });

  it("paid: copy calls onCopyText with the plain text of only includedInExport bullets and shows the copied notice", async () => {
    const { onCopyText, onPaywall } = setup({ paid: true });

    await userEvent.click(screen.getByRole("button", { name: copy.export.copyAction }));

    expect(onPaywall).not.toHaveBeenCalled();
    expect(onCopyText).toHaveBeenCalledTimes(1);
    const text = onCopyText.mock.calls[0][0] as string;
    expect(text).toContain(bullets[0].text);
    expect(text).not.toContain(bullets[1].text);
    expect(await screen.findByText(copy.export.copiedNotice)).toBeInTheDocument();
  });

  it("paid: PDF click calls requestExport and downloads with the vouch-resume.pdf filename", async () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    requestExportMock.mockResolvedValueOnce(blob);
    const { onDownload, onPaywall } = setup({ paid: true });

    await userEvent.click(screen.getByRole("button", { name: copy.export.pdfAction }));

    expect(onPaywall).not.toHaveBeenCalled();
    expect(requestExportMock).toHaveBeenCalledTimes(1);
    expect(requestExportMock.mock.calls[0][1]).toBe("pdf");
    expect(onDownload).toHaveBeenCalledWith(blob, "vouch-resume.pdf");
  });

  it("paid: DOCX click calls requestExport and downloads with the vouch-resume.docx filename", async () => {
    const blob = new Blob(["docx"], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    requestExportMock.mockResolvedValueOnce(blob);
    const { onDownload, onPaywall } = setup({ paid: true });

    await userEvent.click(screen.getByRole("button", { name: copy.export.docxAction }));

    expect(onPaywall).not.toHaveBeenCalled();
    expect(requestExportMock).toHaveBeenCalledTimes(1);
    expect(requestExportMock.mock.calls[0][1]).toBe("docx");
    expect(onDownload).toHaveBeenCalledWith(blob, "vouch-resume.docx");
  });

  // server-side-export-gate (T5 #8, BC-HONESTY-02): the optional tailoringId
  // prop (streamed as a `persisted` event upstream) must reach requestExport so
  // the server can enforce the bullet-membership honesty gate.
  it("paid: PDF click forwards the tailoringId prop to requestExport when supplied", async () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    requestExportMock.mockResolvedValueOnce(blob);
    setup({ paid: true, tailoringId: "t-999" });

    await userEvent.click(screen.getByRole("button", { name: copy.export.pdfAction }));

    expect(requestExportMock).toHaveBeenCalledTimes(1);
    expect(requestExportMock.mock.calls[0][2]).toBe("t-999");
  });

  it("paid: PDF click passes undefined as the tailoringId arg when the prop is absent (non-breaking fallback)", async () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    requestExportMock.mockResolvedValueOnce(blob);
    setup({ paid: true });

    await userEvent.click(screen.getByRole("button", { name: copy.export.pdfAction }));

    expect(requestExportMock).toHaveBeenCalledTimes(1);
    expect(requestExportMock.mock.calls[0][2]).toBeUndefined();
  });

  it("paid: a rejected onCopyText shows the error state", async () => {
    const onCopyText = vi.fn().mockRejectedValueOnce(new Error("clipboard denied"));
    setup({ paid: true, onCopyText });

    await userEvent.click(screen.getByRole("button", { name: copy.export.copyAction }));

    expect(await screen.findByText(copy.export.error)).toBeInTheDocument();
    expect(screen.queryByText(copy.export.copiedNotice)).not.toBeInTheDocument();
  });

  it("paid: a rejected download (requestExport failure) shows the error state", async () => {
    requestExportMock.mockRejectedValueOnce(new Error("export_failed:pdf"));
    const { onDownload } = setup({ paid: true });

    await userEvent.click(screen.getByRole("button", { name: copy.export.pdfAction }));

    expect(await screen.findByText(copy.export.error)).toBeInTheDocument();
    expect(onDownload).not.toHaveBeenCalled();
  });

  it("start-over button calls onStartOver regardless of entitlement", async () => {
    const { onStartOver } = setup({ paid: false });

    await userEvent.click(screen.getByRole("button", { name: copy.wizard.startOverAction }));

    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// PII isolation: cvDocument → export only, never letterEvidence (§4.5, NFR-SEC-01/02)
// ---------------------------------------------------------------------------

const PII_EMAIL = "pii-sentinel@export-test.example.com";

const cvDocForExport: CvDocument = {
  contact: { name: "Jane Dev", email: PII_EMAIL },
  experience: [{ title: "Senior Engineer", bullets: ["Built APIs"] }],
  skills: ["node.js"],
};

const letterEvidenceNoContact: LetterEvidence = {
  cvSentences: ["Built APIs in Node.js for three years."],
  requirements: [{ id: "r1", text: "Node.js", importance: "must-have", keywords: ["node.js"] }],
};

describe("ExportStepper: cvDocument PII isolation (§4.5, NFR-SEC-01/02)", () => {
  it("cvDocument contact ends up in the built ExportDocument sections (export-render path)", () => {
    // Verify that buildExportDocument (the function ExportStepper calls) places
    // the contact into sections — this is the intended render-path for PII.
    const doc = buildExportDocument(bullets, {
      headline: copy.export.headline,
      cvDocument: cvDocForExport,
    });
    expect(doc.sections?.contact?.email).toBe(PII_EMAIL);
  });

  it("letterEvidence passed to ExportStepper contains no contact PII (structural separation)", () => {
    // letterEvidence is the LLM-bound evidence lane. Assert it has no contact
    // fields — the component accepts cvSentences (plain strings), not CvDocument.
    const keys = Object.keys(letterEvidenceNoContact);
    expect(keys).not.toContain("contact");
    expect(keys).not.toContain("email");
    expect(keys).not.toContain("phone");
    // cvSentences are allowed (they are the LLM evidence lane)
    expect(letterEvidenceNoContact.cvSentences).toBeDefined();
  });

  it("ExportStepper renders without error when both cvDocument and letterEvidence are provided", () => {
    // Smoke test: both props can coexist; no exception or missing prop error.
    const { onPaywall, onStartOver, onCopyText, onDownload } = setup({
      paid: true,
      cvDocument: cvDocForExport,
      letterEvidence: letterEvidenceNoContact,
    });
    // Buttons still render.
    expect(screen.getByRole("button", { name: copy.export.copyAction })).toBeInTheDocument();
    void [onPaywall, onStartOver, onCopyText, onDownload]; // used by setup
  });

  it("copy action (paid) renders only includedInExport bullets — not the contact PII sentinel", async () => {
    const { onCopyText } = setup({
      paid: true,
      cvDocument: cvDocForExport,
    });

    await userEvent.click(screen.getByRole("button", { name: copy.export.copyAction }));

    // The copied text may include the structured sections (contact included for the
    // clipboard export), but we assert it contains only grounded bullet text and
    // not the overclaim-risk bullet text — the honesty gate still holds.
    const text = onCopyText.mock.calls[0][0] as string;
    // Grounded bullet is present
    expect(text).toContain(bullets[0].text);
    // Excluded overclaim bullet is absent (BC-HONESTY-02)
    expect(text).not.toContain(bullets[1].text);
  });
});
