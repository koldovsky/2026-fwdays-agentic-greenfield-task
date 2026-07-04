// Behavioral tests for the upload dropzone (add-upload-cv task 3.3, FR-CV-01,
// NFR-OBS-01). `parseCvFile` is mocked — these exercise the component's own
// validation + state machine; the real wire client is covered by
// parse-cv-file.test.ts and the route by route.test.ts.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import { MAX_ATTACHMENT_BYTES, MAX_UPLOAD_BYTES, PDF_MIME } from "@/shared/lib/parse-document";

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

function dropzone(): HTMLElement {
  return screen.getByText(ua.uploadCv.dropLabel).closest("div") as HTMLElement;
}

function drop(zone: HTMLElement, file: File) {
  fireEvent.drop(zone, { dataTransfer: { files: [file] } });
}

describe("UploadCvDropzone (FR-CV-01)", () => {
  it("parses a dropped PDF and hands the extracted text to onExtracted", async () => {
    parseCvFileMock.mockResolvedValue({ ok: true, text: "extracted resume text" });
    const onExtracted = vi.fn();
    render(<UploadCvDropzone onExtracted={onExtracted} />);

    drop(dropzone(), pdfFile());

    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith("extracted resume text"));
    expect(parseCvFileMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("parses a file chosen via the browse input", async () => {
    parseCvFileMock.mockResolvedValue({ ok: true, text: "picked text" });
    const onExtracted = vi.fn();
    const { container } = render(<UploadCvDropzone onExtracted={onExtracted} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, pdfFile());

    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith("picked text"));
  });

  it("shows the pending status while extraction is in flight", async () => {
    let release: (outcome: { ok: true; text: string }) => void = () => {};
    parseCvFileMock.mockImplementation(
      () => new Promise((resolve) => {
        release = resolve;
      }),
    );
    render(<UploadCvDropzone onExtracted={vi.fn()} />);

    drop(dropzone(), pdfFile());

    expect(await screen.findByRole("status")).toHaveTextContent(ua.uploadCv.pending);
    release({ ok: true, text: "done" });
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("rejects a wrong file type client-side without uploading", async () => {
    const onExtracted = vi.fn();
    render(<UploadCvDropzone onExtracted={onExtracted} />);

    drop(dropzone(), new File(["hello"], "cv.txt", { type: "text/plain" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.uploadCv.error.unsupportedType);
    expect(parseCvFileMock).not.toHaveBeenCalled();
    expect(onExtracted).not.toHaveBeenCalled();
  });

  it("rejects an oversized file client-side without uploading", async () => {
    render(<UploadCvDropzone onExtracted={vi.fn()} />);

    drop(dropzone(), pdfFile({ size: MAX_UPLOAD_BYTES + 1 }));

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.uploadCv.error.tooLarge);
    expect(parseCvFileMock).not.toHaveBeenCalled();
  });

  it("surfaces a server-side unparseable error calmly with the paste fallback copy", async () => {
    parseCvFileMock.mockResolvedValue({ ok: false, error: "unparseable" });
    const onExtracted = vi.fn();
    render(<UploadCvDropzone onExtracted={onExtracted} />);

    drop(dropzone(), pdfFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.uploadCv.error.unparseable);
    expect(onExtracted).not.toHaveBeenCalled();
  });

  it("clears a previous error once a following upload succeeds", async () => {
    parseCvFileMock.mockResolvedValueOnce({ ok: false, error: "failed" });
    parseCvFileMock.mockResolvedValueOnce({ ok: true, text: "second try" });
    const onExtracted = vi.fn();
    render(<UploadCvDropzone onExtracted={onExtracted} />);
    const zone = dropzone();

    drop(zone, pdfFile());
    expect(await screen.findByRole("alert")).toHaveTextContent(ua.uploadCv.error.failed);

    drop(zone, pdfFile());
    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith("second try"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// add-premium-pdf-attach (T5): the attach control is server-gated on paid
// entitlement, so the client only ever offers or advertises it (FR-PAYWALL-02).
describe("UploadCvDropzone premium attach control (T5)", () => {
  it("free/anon: shows a premium affordance that opens the upgrade surface, never attaches", async () => {
    parseCvFileMock.mockResolvedValue({ ok: true, text: "text" });
    const onAttachmentChange = vi.fn();
    const onUpgrade = vi.fn();
    render(
      <UploadCvDropzone
        onExtracted={vi.fn()}
        paid={false}
        onAttachmentChange={onAttachmentChange}
        onUpgrade={onUpgrade}
      />,
    );

    const control = screen.getByText(ua.uploadCv.attach.addOriginalPdf).closest("button")!;
    expect(control).toBeInTheDocument();
    expect(screen.getByText(ua.uploadCv.attach.premiumBadge)).toBeInTheDocument();

    await userEvent.click(control);
    expect(onUpgrade).toHaveBeenCalledTimes(1);

    // Even after uploading a PDF, a non-paid user never produces an attachment.
    drop(dropzone(), pdfFile());
    await waitFor(() => expect(parseCvFileMock).toHaveBeenCalled());
    expect(onAttachmentChange).not.toHaveBeenCalled();
  });

  it("paid: offers the uploaded PDF to generation and can remove it", async () => {
    parseCvFileMock.mockResolvedValue({ ok: true, text: "text" });
    const onAttachmentChange = vi.fn();
    render(<UploadCvDropzone onExtracted={vi.fn()} paid onAttachmentChange={onAttachmentChange} />);

    drop(dropzone(), pdfFile());

    await waitFor(() =>
      expect(onAttachmentChange).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "pdf", mediaType: "application/pdf" }),
      ),
    );
    const call = onAttachmentChange.mock.calls[0][0];
    expect(typeof call.dataBase64).toBe("string");
    expect(call.dataBase64.length).toBeGreaterThan(0);
    expect(screen.getByText(new RegExp(ua.uploadCv.attach.attachedLabel))).toBeInTheDocument();

    // No premium affordance for a paid user.
    expect(screen.queryByText(ua.uploadCv.attach.addOriginalPdf)).not.toBeInTheDocument();

    // Remove clears the attachment.
    await userEvent.click(screen.getByText(ua.uploadCv.attach.remove));
    expect(onAttachmentChange).toHaveBeenLastCalledWith(null);
  });

  it("paid: a PDF over the attachment cap is not attached and shows a calm note", async () => {
    parseCvFileMock.mockResolvedValue({ ok: true, text: "text" });
    const onAttachmentChange = vi.fn();
    render(<UploadCvDropzone onExtracted={vi.fn()} paid onAttachmentChange={onAttachmentChange} />);

    // Passes the 5 MB upload check but exceeds the 3 MB attachment cap.
    drop(dropzone(), pdfFile({ size: MAX_ATTACHMENT_BYTES + 1 }));

    expect(await screen.findByText(ua.uploadCv.attach.tooLarge)).toBeInTheDocument();
    // Cleared, never attached with bytes.
    expect(onAttachmentChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "pdf" }),
    );
  });
});
