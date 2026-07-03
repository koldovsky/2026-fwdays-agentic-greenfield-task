// Route-level tests for POST /api/cv/parse (add-upload-cv task 2.4, FR-CV-01,
// TC-PARSE-01/02, NFR-OBS-01, NFR-SEC-04). The extraction adapter is mocked —
// the real validation core (size, declared MIME, magic bytes) runs unchanged,
// so these prove the trust boundary itself: a spoofed Content-Type never
// reaches an extraction library, every failure is a calm coded JSON error,
// and the per-IP limiter throttles scripted abuse. The limiter runs for real
// against its module-level in-memory store, so every test uses its own IP to
// stay isolated (the tailor route test precedent).
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DOCX_MIME, MAX_UPLOAD_BYTES, PDF_MIME } from "@/shared/lib/parse-document";

const extractDocumentText = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/parse-document/extract", () => ({ extractDocumentText }));

import { POST } from "./route";

const PDF_BYTES = new TextEncoder().encode("%PDF-1.4 tiny fixture body");
const DOCX_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);

function upload(
  ip: string,
  file: { bytes: Uint8Array; name: string; mime: string } | null,
): Request {
  const body = new FormData();
  if (file !== null) {
    body.append("file", new File([file.bytes], file.name, { type: file.mime }));
  }
  return new Request("http://localhost/api/cv/parse", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/cv/parse (FR-CV-01, TC-PARSE-01/02)", () => {
  it("extracts text from a valid PDF upload", async () => {
    extractDocumentText.mockResolvedValue("extracted resume text");

    const res = await POST(
      upload("203.0.113.20", { bytes: PDF_BYTES, name: "cv.pdf", mime: PDF_MIME }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "extracted resume text" });
    expect(extractDocumentText).toHaveBeenCalledTimes(1);
    expect(extractDocumentText.mock.calls[0][0]).toBe("pdf");
  });

  it("extracts text from a valid DOCX upload", async () => {
    extractDocumentText.mockResolvedValue("docx resume text");

    const res = await POST(
      upload("203.0.113.21", { bytes: DOCX_BYTES, name: "cv.docx", mime: DOCX_MIME }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "docx resume text" });
    expect(extractDocumentText.mock.calls[0][0]).toBe("docx");
  });
});

describe("POST /api/cv/parse validation (NFR-SEC-04, NFR-OBS-01)", () => {
  it("rejects an unsupported declared type with coded JSON, no extraction", async () => {
    const res = await POST(
      upload("203.0.113.22", {
        bytes: new TextEncoder().encode("plain text resume"),
        name: "cv.txt",
        mime: "text/plain",
      }),
    );

    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ error: "unsupported_type" });
    expect(extractDocumentText).not.toHaveBeenCalled();
  });

  it("rejects a spoofed PDF Content-Type whose bytes are not a PDF", async () => {
    const res = await POST(
      upload("203.0.113.23", {
        bytes: new TextEncoder().encode("#!/bin/sh not a pdf"),
        name: "cv.pdf",
        mime: PDF_MIME,
      }),
    );

    // Magic bytes, not the client claim, are the trust boundary — the parse
    // library is never invoked on the spoofed bytes (TC-PARSE-01/02).
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ error: "unsupported_type" });
    expect(extractDocumentText).not.toHaveBeenCalled();
  });

  it("rejects an oversized file with the coded too_large error", async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(PDF_BYTES); // valid PDF magic — size alone must reject it

    const res = await POST(upload("203.0.113.24", { bytes: big, name: "cv.pdf", mime: PDF_MIME }));

    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "too_large" });
    expect(extractDocumentText).not.toHaveBeenCalled();
  });

  it("maps a parse-library failure to the coded unparseable error, never a 500", async () => {
    extractDocumentText.mockRejectedValue(new Error("bad xref table"));

    const res = await POST(
      upload("203.0.113.25", { bytes: PDF_BYTES, name: "cv.pdf", mime: PDF_MIME }),
    );

    // The library's message is never echoed — code only (NFR-SEC-01).
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "unparseable" });
  });

  it("rejects a multipart body without a file as invalid_body", async () => {
    const res = await POST(upload("203.0.113.26", null));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
    expect(extractDocumentText).not.toHaveBeenCalled();
  });

  it("rejects a non-multipart body calmly as invalid_body", async () => {
    const res = await POST(
      new Request("http://localhost/api/cv/parse", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.27", "content-type": "application/json" },
        body: JSON.stringify({ file: "nope" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });
});

describe("POST /api/cv/parse throttling (NFR-SEC-04)", () => {
  it("rate-limits the 11th attempt from one IP with calm coded JSON", async () => {
    extractDocumentText.mockResolvedValue("ok");
    const ip = "198.51.100.30";

    for (let i = 0; i < 10; i++) {
      const res = await POST(upload(ip, { bytes: PDF_BYTES, name: "cv.pdf", mime: PDF_MIME }));
      expect(res.status).toBe(200);
    }

    const throttled = await POST(
      upload(ip, { bytes: PDF_BYTES, name: "cv.pdf", mime: PDF_MIME }),
    );

    expect(throttled.status).toBe(429);
    expect(await throttled.json()).toEqual({ error: "rate_limited" });
    expect(extractDocumentText).toHaveBeenCalledTimes(10);

    // Another IP is unaffected — the limit is per client, not global.
    const other = await POST(
      upload("198.51.100.31", { bytes: PDF_BYTES, name: "cv.pdf", mime: PDF_MIME }),
    );
    expect(other.status).toBe(200);
  });

  it("counts failed attempts too — CPU is spent either way", async () => {
    extractDocumentText.mockRejectedValue(new Error("boom"));
    const ip = "198.51.100.32";

    for (let i = 0; i < 10; i++) {
      const res = await POST(upload(ip, { bytes: PDF_BYTES, name: "cv.pdf", mime: PDF_MIME }));
      expect(res.status).toBe(422);
    }

    const throttled = await POST(
      upload(ip, { bytes: PDF_BYTES, name: "cv.pdf", mime: PDF_MIME }),
    );
    expect(throttled.status).toBe(429);
  });
});
