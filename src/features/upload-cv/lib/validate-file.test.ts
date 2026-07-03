// Unit tests for the pure client-side pre-upload validation (add-upload-cv
// task 3.3 UX half). Pure project: plain objects, no File/DOM (TC-PURE-01).
import { describe, expect, it } from "vitest";

import { DOCX_MIME, MAX_UPLOAD_BYTES, PDF_MIME } from "@/shared/lib/parse-document";

import { resolveCvMime, validateCvFile } from "./validate-file";

const pdf = { name: "cv.pdf", type: PDF_MIME, size: 1024 };
const docx = { name: "cv.docx", type: DOCX_MIME, size: 2048 };

describe("resolveCvMime", () => {
  it("keeps a supported browser-declared MIME", () => {
    expect(resolveCvMime(pdf)).toBe(PDF_MIME);
    expect(resolveCvMime(docx)).toBe(DOCX_MIME);
  });

  it("falls back to the extension when the drag source omits the type", () => {
    expect(resolveCvMime({ name: "CV.PDF", type: "", size: 10 })).toBe(PDF_MIME);
    expect(resolveCvMime({ name: "резюме.docx", type: "", size: 10 })).toBe(DOCX_MIME);
  });

  it("returns null for unsupported types and extensions", () => {
    expect(resolveCvMime({ name: "cv.txt", type: "text/plain", size: 10 })).toBeNull();
    expect(resolveCvMime({ name: "cv.doc", type: "application/msword", size: 10 })).toBeNull();
    expect(resolveCvMime({ name: "archive.zip", type: "application/zip", size: 10 })).toBeNull();
  });
});

describe("validateCvFile", () => {
  it("accepts a supported file under the cap", () => {
    expect(validateCvFile(pdf)).toBeNull();
    expect(validateCvFile(docx)).toBeNull();
  });

  it("flags unsupported files before size", () => {
    expect(
      validateCvFile({ name: "cv.txt", type: "text/plain", size: MAX_UPLOAD_BYTES + 1 }),
    ).toBe("unsupported_type");
  });

  it("flags files over the 5 MB cap", () => {
    expect(validateCvFile({ ...pdf, size: MAX_UPLOAD_BYTES + 1 })).toBe("too_large");
  });

  it("accepts a file exactly at the cap", () => {
    expect(validateCvFile({ ...pdf, size: MAX_UPLOAD_BYTES })).toBeNull();
  });
});
