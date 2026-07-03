// Tests for the server-only extraction adapter (add-upload-cv task 1.3,
// TC-PARSE-01/02). Runs the REAL pdf-parse/mammoth libraries against tiny
// hand-built in-memory fixtures — no fs, no network. Imported directly, not
// via the barrel, matching how the route consumes it.
import { describe, expect, it } from "vitest";

import { extractDocumentText } from "./extract";
import { docxFixture, pdfFixture } from "./testing/fixtures";

describe("extractDocumentText (pdf via pdf-parse)", () => {
  it("extracts the text of a minimal PDF", async () => {
    const text = await extractDocumentText("pdf", pdfFixture("Senior React Engineer"));
    expect(text).toContain("Senior React Engineer");
  });

  it("rejects a scanned-style PDF that parses to no text (maps to unparseable)", async () => {
    // Valid PDF, empty content stream — the image-only-scan stand-in.
    await expect(extractDocumentText("pdf", pdfFixture(null))).rejects.toThrow();
  });

  it("rejects bytes that are not a real PDF", async () => {
    await expect(
      extractDocumentText("pdf", Buffer.from("%PDF-1.4 but nothing else", "latin1")),
    ).rejects.toThrow();
  });
});

describe("extractDocumentText (docx via mammoth)", () => {
  it("extracts Ukrainian text from a minimal DOCX", async () => {
    const text = await extractDocumentText("docx", docxFixture("Інженерка React у Києві"));
    expect(text).toContain("Інженерка React у Києві");
  });

  it("rejects a DOCX whose document text is empty (maps to unparseable)", async () => {
    await expect(extractDocumentText("docx", docxFixture(""))).rejects.toThrow();
  });

  it("rejects a zip that is not a DOCX (design.md risk: PK magic only proves zip)", async () => {
    // A structurally-valid-enough zip missing every DOCX part.
    const notDocx = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.alloc(64),
    ]);
    await expect(extractDocumentText("docx", notDocx)).rejects.toThrow();
  });
});
