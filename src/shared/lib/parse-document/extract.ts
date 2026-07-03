// Server-only extraction adapter (add-upload-cv task 1.3, TC-PARSE-01/02).
// Wraps pdf-parse (PDF) and mammoth (DOCX): buffer in, plain text out. Node
// IO lives here, NOT in the pure barrel — import this file directly from the
// route handler, never via shared/lib/parse-document's index.ts (the
// shared/lib/db/pg.ts precedent that keeps server libs out of client bundles;
// both packages are also listed in serverExternalPackages in next.config.ts).
//
// Contract: resolves to the extracted text, throws on anything else — a parse
// failure OR an empty/whitespace-only extraction (a scanned, image-only CV).
// The caller maps any throw to the coded `unparseable` error and never echoes
// the reason, so no library internals or file content can leak (NFR-OBS-01,
// NFR-SEC-01). Bytes stay in memory for the duration of the call only.
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import type { DocumentType } from "./sniff";

/** Thrown when a document parses but carries no extractable text. */
const EMPTY_EXTRACTION = "empty_extraction";

async function extractPdfText(data: Buffer): Promise<string> {
  // verbosity 0: pdfjs otherwise logs warnings for quirky-but-parseable
  // files — the console stays clean on a healthy session (NFR-OBS-02).
  const parser = new PDFParse({ data, verbosity: 0 });
  try {
    const result = await parser.getText();
    // Join per-page text ourselves: result.text decorates every page with a
    // "-- N of M --" separator banner that would otherwise land in the user's
    // CV textarea (and make an image-only scan look non-empty).
    return result.pages.map((page) => page.text).join("\n");
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(data: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: data });
  return result.value;
}

/**
 * Extract the plain text of a validated upload. `type` comes from the pure
 * core's magic-byte verdict (`validateUpload`), never from the client claim.
 */
export async function extractDocumentText(type: DocumentType, data: Buffer): Promise<string> {
  const text = type === "pdf" ? await extractPdfText(data) : await extractDocxText(data);
  if (text.trim() === "") {
    throw new Error(EMPTY_EXTRACTION);
  }
  return text;
}
