// Unit tests for the pure upload-validation core (add-upload-cv task 1.2,
// TC-PARSE-01/02, NFR-SEC-04). Pure project: in-memory byte arrays only, no
// files, no DOM, no network (TC-PURE-01).
import { describe, expect, it } from "vitest";

import {
  DOCX_MIME,
  MAX_UPLOAD_BYTES,
  PDF_MIME,
  documentTypeForMime,
  sniffDocumentType,
  validateUpload,
} from "./index";

const encoder = new TextEncoder();

const PDF_BYTES = encoder.encode("%PDF-1.4 rest of a pdf body");
const ZIP_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const TEXT_BYTES = encoder.encode("just a plain text resume");

describe("sniffDocumentType (magic bytes)", () => {
  it("detects %PDF- as pdf", () => {
    expect(sniffDocumentType(PDF_BYTES)).toBe("pdf");
  });

  it("detects PK\\x03\\x04 as a docx candidate", () => {
    expect(sniffDocumentType(ZIP_BYTES)).toBe("docx");
  });

  it("returns null for plain text, empty, and too-short inputs", () => {
    expect(sniffDocumentType(TEXT_BYTES)).toBeNull();
    expect(sniffDocumentType(new Uint8Array(0))).toBeNull();
    expect(sniffDocumentType(new Uint8Array([0x25, 0x50]))).toBeNull();
  });
});

describe("documentTypeForMime (declared MIME)", () => {
  it("maps the two supported MIME types", () => {
    expect(documentTypeForMime(PDF_MIME)).toBe("pdf");
    expect(documentTypeForMime(DOCX_MIME)).toBe("docx");
  });

  it("rejects everything else, including empty and legacy .doc", () => {
    expect(documentTypeForMime("")).toBeNull();
    expect(documentTypeForMime("text/plain")).toBeNull();
    expect(documentTypeForMime("application/msword")).toBeNull();
    expect(documentTypeForMime("application/zip")).toBeNull();
  });
});

describe("validateUpload (server-side trust boundary, NFR-SEC-04)", () => {
  it("accepts a declared PDF with PDF magic bytes", () => {
    expect(
      validateUpload({ byteLength: PDF_BYTES.length, declaredMime: PDF_MIME, bytes: PDF_BYTES }),
    ).toEqual({ ok: true, type: "pdf" });
  });

  it("accepts a declared DOCX with zip magic bytes", () => {
    expect(
      validateUpload({ byteLength: ZIP_BYTES.length, declaredMime: DOCX_MIME, bytes: ZIP_BYTES }),
    ).toEqual({ ok: true, type: "docx" });
  });

  it("rejects an oversized upload before any other check", () => {
    expect(
      validateUpload({
        byteLength: MAX_UPLOAD_BYTES + 1,
        declaredMime: PDF_MIME,
        bytes: PDF_BYTES,
      }),
    ).toEqual({ ok: false, error: "too_large" });
  });

  it("accepts a file exactly at the size cap", () => {
    expect(
      validateUpload({ byteLength: MAX_UPLOAD_BYTES, declaredMime: PDF_MIME, bytes: PDF_BYTES }),
    ).toEqual({ ok: true, type: "pdf" });
  });

  it("rejects an unsupported declared MIME even with valid PDF bytes", () => {
    expect(
      validateUpload({ byteLength: PDF_BYTES.length, declaredMime: "text/plain", bytes: PDF_BYTES }),
    ).toEqual({ ok: false, error: "unsupported_type" });
  });

  it("rejects a spoofed extension/MIME whose bytes do not match (declared pdf, zip bytes)", () => {
    expect(
      validateUpload({ byteLength: ZIP_BYTES.length, declaredMime: PDF_MIME, bytes: ZIP_BYTES }),
    ).toEqual({ ok: false, error: "unsupported_type" });
  });

  it("rejects a declared docx carrying plain-text bytes", () => {
    expect(
      validateUpload({ byteLength: TEXT_BYTES.length, declaredMime: DOCX_MIME, bytes: TEXT_BYTES }),
    ).toEqual({ ok: false, error: "unsupported_type" });
  });
});
