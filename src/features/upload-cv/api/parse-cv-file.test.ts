// Tests for the parse-cv-file client (add-upload-cv task 3.4; prod-hotfix
// batch, FR-CV-01/NFR-OBS-01). fetch is stubbed — these verify the outcome
// mapping: known codes (incl. `rate_limited`) pass through unchanged, a
// genuinely unknown code degrades to `failed`, a >=500 response with no/
// non-JSON body maps to `server_error`, a <500 non-JSON body maps to `failed`,
// and a rejected fetch (network) maps to `failed`. Not the route itself
// (route.test.ts covers that side of the wire).
import { afterEach, describe, expect, it, vi } from "vitest";

import { PDF_MIME } from "@/shared/lib/parse-document";

import { parseCvFile } from "./parse-cv-file";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

function pdfFile(name = "cv.pdf", type: string = PDF_MIME): File {
  return new File(["%PDF-1.4 tiny"], name, { type });
}

describe("parseCvFile", () => {
  it("posts multipart form data and returns the extracted text", async () => {
    fetchMock.mockResolvedValue(Response.json({ text: "extracted resume text" }));

    const outcome = await parseCvFile(pdfFile());

    expect(outcome).toEqual({ ok: true, text: "extracted resume text" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/cv/parse");
    expect(init.method).toBe("POST");
    const sent = (init.body as FormData).get("file");
    expect(sent).toBeInstanceOf(File);
    expect((sent as File).type).toBe(PDF_MIME);
  });

  it("normalizes an empty declared MIME from the extension before uploading", async () => {
    fetchMock.mockResolvedValue(Response.json({ text: "ok" }));

    await parseCvFile(pdfFile("cv.pdf", ""));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(((init.body as FormData).get("file") as File).type).toBe(PDF_MIME);
  });

  it("maps known coded errors through unchanged", async () => {
    for (const code of ["unsupported_type", "too_large", "unparseable"] as const) {
      fetchMock.mockResolvedValue(Response.json({ error: code }, { status: 422 }));
      expect(await parseCvFile(pdfFile())).toEqual({ ok: false, error: code });
    }
  });

  it("maps the rate_limited server code through unchanged (known code, distinct UA copy)", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "rate_limited" }, { status: 429 }));
    expect(await parseCvFile(pdfFile())).toEqual({ ok: false, error: "rate_limited" });
  });

  it("maps a genuinely unknown server code to failed", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "weird_code" }, { status: 422 }));
    expect(await parseCvFile(pdfFile())).toEqual({ ok: false, error: "failed" });
  });

  it("maps a network failure to failed instead of throwing (NFR-OBS-01)", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"));
    expect(await parseCvFile(pdfFile())).toEqual({ ok: false, error: "failed" });
  });

  it("maps a 5xx non-JSON body to server_error (distinct from a client-side network failure)", async () => {
    fetchMock.mockResolvedValue(new Response("<html>gateway error</html>", { status: 502 }));
    expect(await parseCvFile(pdfFile())).toEqual({ ok: false, error: "server_error" });
  });

  it("maps a <500 non-JSON body to failed", async () => {
    fetchMock.mockResolvedValue(new Response("<html>not found</html>", { status: 404 }));
    expect(await parseCvFile(pdfFile())).toEqual({ ok: false, error: "failed" });
  });

  it("maps an ok response without a text field to failed", async () => {
    fetchMock.mockResolvedValue(Response.json({}));
    expect(await parseCvFile(pdfFile())).toEqual({ ok: false, error: "failed" });
  });
});
