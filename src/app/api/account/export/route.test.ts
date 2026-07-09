// Route-level tests for GET /api/account/export — GDPR data export (NFR-GDPR-01).
// The route now returns a PDF (application/pdf, vouch-export.pdf) instead of JSON
// (2026-07-09 decision: PDF for human-readability). The confirmed 500 source was
// getCvEncryptionKey()/getDb() throwing (unset env) or an assembly error
// propagating uncaught. All of those must degrade to a calm coded 500, never an
// uncaught raw 500 leaking the missing-key detail or a stack (NFR-OBS-01, no
// information disclosure). Session + service + PDF renderer are mocked; the
// route's gating + envelope run for real.
import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

const exportAccountData = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/account", () => ({ exportAccountData }));

const getCvEncryptionKey = vi.hoisted(() => vi.fn(() => Buffer.alloc(32)));
vi.mock("@/shared/lib/crypto", () => ({ getCvEncryptionKey }));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));
vi.mock("@/shared/lib/db", () => ({
  createUserRepo: () => ({}),
  createCvProfileRepo: () => ({}),
  createTailoringRepo: () => ({}),
}));

// Mock the co-located PDF renderer — same pattern as /api/export/pdf and
// /api/export/cover-letter route tests. Returns a minimal valid-header PDF
// buffer so all content-type / body-prefix assertions hold without @react-pdf
// actually running (fonts not available in the test environment).
const FAKE_PDF = Buffer.from("%PDF-1.4 fake-pdf-bytes-for-testing");
const renderAccountExportPdf = vi.hoisted(() => vi.fn());
vi.mock("./account-export-pdf", () => ({ renderAccountExportPdf }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  getCvEncryptionKey.mockReturnValue(Buffer.alloc(32));
  renderAccountExportPdf.mockResolvedValue(FAKE_PDF);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/account/export (NFR-GDPR-01)", () => {
  it("401s an anonymous caller without assembling anything", async () => {
    currentUserId.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(exportAccountData).not.toHaveBeenCalled();
  });

  // Flipped from the old JSON contract: the route now returns application/pdf
  // with vouch-export.pdf as the attachment filename (2026-07-09 decision).
  // Body bytes begin with %PDF (the standard PDF magic number).
  it("returns a PDF attachment for an authenticated owner (NFR-GDPR-01)", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue({
      exportedAt: "2026-07-04T00:00:00.000Z",
      user: { id: "u1", email: "u@example.com", name: "U", createdAt: "2026-07-01T00:00:00.000Z" },
      cvProfiles: [],
      tailorings: [],
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain('filename="vouch-export.pdf"');
    // Body must be non-empty and begin with the PDF magic number.
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(0);
    // %PDF = 0x25 0x50 0x44 0x46
    expect(bytes[0]).toBe(0x25);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x44);
    expect(bytes[3]).toBe(0x46);
  });

  it("sets Cache-Control: no-store to prevent browser caching of personal data (NFR-SEC-01)", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue({
      exportedAt: "2026-07-04T00:00:00.000Z",
      user: { id: "u1", email: "u@example.com", name: "U", createdAt: "2026-07-01T00:00:00.000Z" },
      cvProfiles: [],
      tailorings: [],
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("404s when the user row is gone", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(404);
  });

  it("returns a calm coded 500 when the encryption key is unset (the confirmed root cause)", async () => {
    currentUserId.mockResolvedValue("u1");
    getCvEncryptionKey.mockImplementation(() => {
      throw new Error("CV_ENCRYPTION_KEY is not set");
    });

    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "export_failed" });
    // The missing-key detail never reaches the caller.
    expect(JSON.stringify(body)).not.toContain("CV_ENCRYPTION_KEY");
    expect(exportAccountData).not.toHaveBeenCalled();
  });

  it("returns a calm coded 500 (never an uncaught throw) when assembly fails", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockRejectedValue(new Error("db connection refused"));

    const res = await GET();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "export_failed" });
  });

  it("returns a calm coded 500 when the PDF renderer throws (NFR-OBS-01)", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue({
      exportedAt: "2026-07-04T00:00:00.000Z",
      user: { id: "u1", email: "u@example.com", name: "U", createdAt: "2026-07-01T00:00:00.000Z" },
      cvProfiles: [],
      tailorings: [],
    });
    renderAccountExportPdf.mockRejectedValue(new Error("react-pdf layout error"));

    const res = await GET();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "export_failed" });
  });

  // NFR-GDPR-01/02, NFR-OBS-01: when one or more profiles fail decryption the
  // PDF renderer shows a placeholder ("Raw CV text could not be decrypted…")
  // in place of the missing text, so the route still returns 200 PDF — the
  // caller is never shown a 500 because of a single failed decrypt.
  it("returns 200 PDF (not 500) when one profile fails decryption (NFR-GDPR-01/02)", async () => {
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue({
      exportedAt: "2026-07-06T00:00:00.000Z",
      user: { id: "u1", email: "u@example.com", name: "U", createdAt: "2026-07-01T00:00:00.000Z" },
      cvProfiles: [
        {
          id: "p1",
          createdAt: "2026-07-01T00:00:00.000Z",
          profile: { skills: [], sentences: [] },
          rawText: null,
          decryptionFailed: true as const,
        },
        {
          id: "p2",
          createdAt: "2026-07-02T00:00:00.000Z",
          profile: { skills: ["react"], sentences: ["Built a thing"] },
          rawText: "Ada — React engineer",
        },
      ],
      tailorings: [],
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  // The PDF renderer receives the full AccountExport including the
  // decryptionFailed flag — it renders the placeholder text in place of the
  // missing raw CV. Verify renderAccountExportPdf is called with the data
  // exactly as assembled, so both the failed and the succeeded profiles are
  // handed to the renderer (NFR-GDPR-02: don't drop the good profile).
  it("passes the full profile list (failed + ok) to the PDF renderer (NFR-GDPR-02)", async () => {
    currentUserId.mockResolvedValue("u1");
    const exportData = {
      exportedAt: "2026-07-06T00:00:00.000Z",
      user: { id: "u1", email: "u@example.com", name: "U", createdAt: "2026-07-01T00:00:00.000Z" },
      cvProfiles: [
        {
          id: "p-fail",
          createdAt: "2026-07-01T00:00:00.000Z",
          profile: { skills: [], sentences: [] },
          rawText: null,
          decryptionFailed: true as const,
        },
        {
          id: "p-ok",
          createdAt: "2026-07-02T00:00:00.000Z",
          profile: { skills: ["go"], sentences: ["Shipped a feature"] },
          rawText: "Ada — Go engineer",
        },
      ],
      tailorings: [],
    };
    exportAccountData.mockResolvedValue(exportData);

    await GET();

    expect(renderAccountExportPdf).toHaveBeenCalledTimes(1);
    const calledWith = renderAccountExportPdf.mock.calls[0][0] as typeof exportData;
    expect(calledWith.cvProfiles).toHaveLength(2);
    expect(calledWith.cvProfiles[0].decryptionFailed).toBe(true);
    expect(calledWith.cvProfiles[1].rawText).toBe("Ada — Go engineer");
  });

  // NFR-SEC-01: the PDF body (even our fake bytes) must never contain key
  // material or any internal error details — confirming the catch boundary works.
  it("PDF body contains no key material when a profile fails decryption (NFR-SEC-01)", async () => {
    const KEY_MATERIAL = "CV_ENCRYPTION_KEY=sup3rS3cr3t";
    currentUserId.mockResolvedValue("u1");
    exportAccountData.mockResolvedValue({
      exportedAt: "2026-07-06T00:00:00.000Z",
      user: { id: "u1", email: "u@example.com", name: "U", createdAt: "2026-07-01T00:00:00.000Z" },
      cvProfiles: [
        {
          id: "p-fail",
          createdAt: "2026-07-01T00:00:00.000Z",
          profile: { skills: [], sentences: [] },
          rawText: null,
          decryptionFailed: true as const,
        },
      ],
      tailorings: [],
    });

    const res = await GET();
    const rawBody = await res.text();

    // No key fragments must appear anywhere in the serialized response.
    expect(rawBody).not.toContain(KEY_MATERIAL);
    expect(rawBody).not.toContain("sup3rS3cr3t");
    // The internal error message must not be forwarded to the client.
    expect(rawBody).not.toContain("CV_ENCRYPTION_KEY");
  });
});
