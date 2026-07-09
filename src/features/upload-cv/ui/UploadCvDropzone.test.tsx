// Composer integration tests (gate-premium-upload-zone, T4 §4.3). The parse-path
// unit coverage now lives in TextUploadZone.test.tsx and the paid-gate unit
// coverage in PremiumAttachZone.test.tsx; this file only asserts the composition
// contract: `UploadCvDropzone` always renders `TextUploadZone`, renders
// `PremiumAttachZone` only when `onAttachmentChange` is wired, and forwards
// `paid` / `onUpgrade` straight through (FR-CV-01, FR-PAYWALL-01/02, NFR-SEC-04).
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import { MAX_ATTACHMENT_BYTES, PDF_MIME } from "@/shared/lib/parse-document";

import { UploadCvDropzone } from "./UploadCvDropzone";

const parseCvFileMock = vi.hoisted(() => vi.fn());
vi.mock("../api/parse-cv-file", () => ({ parseCvFile: parseCvFileMock }));

beforeEach(() => {
  parseCvFileMock.mockReset();
});

function pdfFile(overrides?: { size?: number }): File {
  const file = new File(["%PDF-1.4 tiny"], "cv.pdf", { type: PDF_MIME });
  if (overrides?.size !== undefined) {
    Object.defineProperty(file, "size", { value: overrides.size });
  }
  return file;
}

function textDropzone(): HTMLElement {
  return screen.getByText(ua.uploadCv.dropLabel).closest("div") as HTMLElement;
}

/** The paid PremiumAttachZone's live drop target (the second zone). */
function attachDropzone(): HTMLElement {
  return screen.getByText(ua.uploadCv.attach.addOriginalPdf).closest("div") as HTMLElement;
}

function drop(zone: HTMLElement, file: File) {
  fireEvent.drop(zone, { dataTransfer: { files: [file] } });
}

describe("UploadCvDropzone composer (gate-premium-upload-zone, T4)", () => {
  it("free users see the blurred Premium zone and banner; that zone has no file input", () => {
    const { container } = render(
      <UploadCvDropzone onExtracted={vi.fn()} paid={false} onAttachmentChange={vi.fn()} />,
    );

    expect(container.querySelector(".blur-sm")).not.toBeNull();
    expect(screen.getByText(ua.uploadCv.premiumZone.headline)).toBeInTheDocument();

    // Exactly one file input in the tree: the free TextUploadZone's own input.
    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBe(1);
  });

  it("paid users see the live Premium zone: a second file input is present, no blur", () => {
    const { container } = render(
      <UploadCvDropzone onExtracted={vi.fn()} paid onAttachmentChange={vi.fn()} />,
    );

    expect(container.querySelector(".blur-sm")).toBeNull();
    // TextUploadZone's input + PremiumAttachZone's live input.
    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs.length).toBe(2);
  });

  it("forwards onUpgrade to the banner CTA", async () => {
    const onUpgrade = vi.fn();
    render(
      <UploadCvDropzone
        onExtracted={vi.fn()}
        paid={false}
        onAttachmentChange={vi.fn()}
        onUpgrade={onUpgrade}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: ua.uploadCv.premiumZone.upgradeAction }),
    );
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("onExtracted still fires after a successful parse regardless of paid (free)", async () => {
    parseCvFileMock.mockResolvedValue({ ok: true, text: "extracted text" });
    const onExtracted = vi.fn();
    render(
      <UploadCvDropzone onExtracted={onExtracted} paid={false} onAttachmentChange={vi.fn()} />,
    );

    drop(textDropzone(), pdfFile());

    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith("extracted text"));
  });

  it("onExtracted still fires after a successful parse regardless of paid (paid)", async () => {
    parseCvFileMock.mockResolvedValue({ ok: true, text: "extracted text" });
    const onExtracted = vi.fn();
    render(<UploadCvDropzone onExtracted={onExtracted} paid onAttachmentChange={vi.fn()} />);

    drop(textDropzone(), pdfFile());

    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith("extracted text"));
  });

  it("paid: a PDF dropped in the premium zone is read to base64 and offered via onAttachmentChange", async () => {
    parseCvFileMock.mockResolvedValue({ ok: true, text: "text" });
    const onAttachmentChange = vi.fn();
    render(<UploadCvDropzone onExtracted={vi.fn()} paid onAttachmentChange={onAttachmentChange} />);

    // Drop into the SECOND zone (PremiumAttachZone), not the text parse zone.
    drop(attachDropzone(), pdfFile());

    await waitFor(() =>
      expect(onAttachmentChange).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "pdf", mediaType: "application/pdf" }),
      ),
    );
    const attachment = onAttachmentChange.mock.calls[0][0];
    expect(typeof attachment.dataBase64).toBe("string");
    expect(attachment.dataBase64.length).toBeGreaterThan(0);
    // The parse path is untouched by an attach action.
    expect(parseCvFileMock).not.toHaveBeenCalled();
  });

  it("paid: a PDF over the attachment cap shows the too-large note and is never attached with bytes", async () => {
    const onAttachmentChange = vi.fn();
    render(<UploadCvDropzone onExtracted={vi.fn()} paid onAttachmentChange={onAttachmentChange} />);

    drop(attachDropzone(), pdfFile({ size: MAX_ATTACHMENT_BYTES + 1 }));

    expect(await screen.findByText(ua.uploadCv.attach.tooLarge)).toBeInTheDocument();
    expect(onAttachmentChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "pdf" }),
    );
  });

  it("when onAttachmentChange is omitted, the Premium zone is not rendered at all", () => {
    const { container } = render(<UploadCvDropzone onExtracted={vi.fn()} paid={false} />);

    expect(screen.queryByText(ua.uploadCv.premiumZone.headline)).not.toBeInTheDocument();
    expect(container.querySelector(".blur-sm")).toBeNull();
    // Only the always-present TextUploadZone input.
    expect(container.querySelectorAll('input[type="file"]').length).toBe(1);
  });
});
