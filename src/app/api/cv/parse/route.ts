// POST /api/cv/parse — server-side CV text extraction (add-upload-cv tasks
// 2.1–2.3, FR-CV-01, TC-PARSE-01/02). The client sends the raw file as
// multipart/form-data and gets only extracted text back; parse libraries never
// reach the browser. Node runtime: pdf-parse/mammoth are Node-only (they are
// also excluded from bundling via serverExternalPackages in next.config.ts).
//
// Trust boundary (NFR-SEC-04, defense-in-depth): size, declared MIME, and
// magic bytes are all re-validated here regardless of what the client claimed
// — the dropzone's checks are UX only. Failures are calm coded JSON errors
// (unsupported_type / too_large / unparseable), never a raw exception or 500
// (NFR-OBS-01). Bytes are transient: request memory only, no temp files, no
// blob writes; neither bytes nor extracted text are ever logged (NFR-SEC-01).
import { MAX_UPLOAD_BYTES, validateUpload } from "@/shared/lib/parse-document";
import { extractDocumentText } from "@/shared/lib/parse-document/extract";
import { clientIpFrom, reserveHitInMemory } from "@/shared/lib/rate-limit";

export const runtime = "nodejs";

/** Per-IP throttle for the most CPU-expensive anonymous endpoint (NFR-SEC-04):
 * 10 parse attempts per 10 minutes — generous for honest re-uploads, tight for
 * scripted abuse. Every attempt counts (CPU is spent either way), unlike the
 * tailor route's success-only budget charge. */
const PARSE_LIMIT = 10;
const PARSE_WINDOW_MS = 10 * 60 * 1000;

/** Multipart framing overhead allowed on top of the file cap for the
 * cheap Content-Length pre-check (the real check is file.size). */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function errorResponse(code: string, status: number): Response {
  return Response.json({ error: code }, { status });
}

export async function POST(request: Request): Promise<Response> {
  try {
    // Gate before touching the body (NFR-SEC-04). Over-limit gets the same
    // calm coded-JSON shape; the client surfaces it as generic failure copy.
    const clientIp = clientIpFrom(
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip"),
    );
    const rateKey = `cv-parse:ip:${clientIp}`;
    // Every attempt counts, success or fail (CPU is spent either way) —
    // unlike the tailor route's success-only budget, so a single atomic
    // reserve (no release path) is the whole gate.
    if (!reserveHitInMemory(rateKey, PARSE_WINDOW_MS, PARSE_LIMIT).allowed) {
      return errorResponse("rate_limited", 429);
    }

    // Cheap oversize rejection before buffering the body, when the client
    // declared a length. The authoritative check is on file.size below.
    const declaredLength = Number(request.headers.get("content-length") ?? "");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES) {
      return errorResponse("too_large", 413);
    }

    // A non-multipart or malformed body throws here — calm 400, never a 500.
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return errorResponse("invalid_body", 400);
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return errorResponse("invalid_body", 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return errorResponse("too_large", 413);
    }

    // Full validation on the actual bytes: declared MIME must be a supported
    // type AND the magic bytes must match it — a spoofed Content-Type never
    // reaches an extraction library (TC-PARSE-01/02, NFR-SEC-04).
    const bytes = new Uint8Array(await file.arrayBuffer());
    const verdict = validateUpload({
      byteLength: bytes.byteLength,
      declaredMime: file.type,
      bytes,
    });
    if (!verdict.ok) {
      return errorResponse(verdict.error, verdict.error === "too_large" ? 413 : 415);
    }

    // Extraction: any parse-library throw and the empty-text (scanned) case
    // both map to the coded `unparseable` — the reason is never echoed, so no
    // library internals or file content can leak into the response
    // (NFR-OBS-01, NFR-SEC-01).
    try {
      const text = await extractDocumentText(verdict.type, Buffer.from(bytes));
      return Response.json({ text });
    } catch (cause) {
      // A genuine parse failure OR an empty (scanned) extraction. Log the CAUSE
      // (type + message only, never the bytes or extracted text — NFR-SEC-01)
      // so Sentry/Vercel surface the real reason; the client still gets the
      // calm coded `unparseable` (NFR-OBS-01) with no library internals leaked.
      console.error("[cv-parse] extraction failed", {
        docType: verdict.type,
        cause: cause instanceof Error ? `${cause.name}: ${cause.message}` : "unknown",
      });
      return errorResponse("unparseable", 422);
    }
  } catch (cause) {
    // Last-resort guard: whatever happened, the caller gets a calm coded JSON
    // error — never a raw exception or 500 (NFR-OBS-01). Log the cause (no
    // request body, no file content — NFR-SEC-01) so an otherwise-silent prod
    // failure is diagnosable instead of collapsing to a mute generic error.
    console.error("[cv-parse] unexpected failure", {
      cause: cause instanceof Error ? `${cause.name}: ${cause.message}` : "unknown",
    });
    return errorResponse("failed", 400);
  }
}
