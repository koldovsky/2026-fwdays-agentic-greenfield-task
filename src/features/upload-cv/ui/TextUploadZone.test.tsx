// Behavioral tests for the free, ungated CV text intake (gate-premium-upload-zone,
// T4 §3.2 — migrated parse-path coverage from the pre-split UploadCvDropzone.test.tsx;
// FR-CV-01, FR-ONBOARD-01, NFR-OBS-01). `parseCvFile` is mocked — these exercise the
// component's own validation + state machine; the real wire client is covered by
// parse-cv-file.test.ts and the route by route.test.ts. This zone has no knowledge
// of paid status or attachment (that lives in PremiumAttachZone.test.tsx).
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import { MAX_UPLOAD_BYTES, PDF_MIME } from "@/shared/lib/parse-document";

import { TextUploadZone } from "./TextUploadZone";

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

describe("TextUploadZone (FR-CV-01, FR-ONBOARD-01)", () => {
  it("parses a dropped PDF and hands the extracted text to onExtracted", async () => {
    parseCvFileMock.mockResolvedValue({ ok: true, text: "extracted resume text" });
    const onExtracted = vi.fn();
    render(<TextUploadZone onExtracted={onExtracted} />);

    drop(dropzone(), pdfFile());

    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith("extracted resume text"));
    expect(parseCvFileMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("parses a file chosen via the browse input", async () => {
    parseCvFileMock.mockResolvedValue({ ok: true, text: "picked text" });
    const onExtracted = vi.fn();
    const { container } = render(<TextUploadZone onExtracted={onExtracted} />);

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
    render(<TextUploadZone onExtracted={vi.fn()} />);

    drop(dropzone(), pdfFile());

    expect(await screen.findByRole("status")).toHaveTextContent(ua.uploadCv.pending);
    release({ ok: true, text: "done" });
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("rejects a wrong file type client-side without uploading", async () => {
    const onExtracted = vi.fn();
    render(<TextUploadZone onExtracted={onExtracted} />);

    drop(dropzone(), new File(["hello"], "cv.txt", { type: "text/plain" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.uploadCv.error.unsupportedType);
    expect(parseCvFileMock).not.toHaveBeenCalled();
    expect(onExtracted).not.toHaveBeenCalled();
  });

  it("rejects an oversized file client-side without uploading", async () => {
    render(<TextUploadZone onExtracted={vi.fn()} />);

    drop(dropzone(), pdfFile({ size: MAX_UPLOAD_BYTES + 1 }));

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.uploadCv.error.tooLarge);
    expect(parseCvFileMock).not.toHaveBeenCalled();
  });

  it("surfaces a server-side unparseable error calmly with the paste fallback copy", async () => {
    parseCvFileMock.mockResolvedValue({ ok: false, error: "unparseable" });
    const onExtracted = vi.fn();
    render(<TextUploadZone onExtracted={onExtracted} />);

    drop(dropzone(), pdfFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.uploadCv.error.unparseable);
    expect(onExtracted).not.toHaveBeenCalled();
  });

  it("surfaces the generic failed copy for an unknown/network failure", async () => {
    parseCvFileMock.mockResolvedValue({ ok: false, error: "failed" });
    render(<TextUploadZone onExtracted={vi.fn()} />);

    drop(dropzone(), pdfFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.uploadCv.error.failed);
  });

  it("clears a previous error once a following upload succeeds", async () => {
    parseCvFileMock.mockResolvedValueOnce({ ok: false, error: "failed" });
    parseCvFileMock.mockResolvedValueOnce({ ok: true, text: "second try" });
    const onExtracted = vi.fn();
    render(<TextUploadZone onExtracted={onExtracted} />);
    const zone = dropzone();

    drop(zone, pdfFile());
    expect(await screen.findByRole("alert")).toHaveTextContent(ua.uploadCv.error.failed);

    drop(zone, pdfFile());
    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith("second try"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
