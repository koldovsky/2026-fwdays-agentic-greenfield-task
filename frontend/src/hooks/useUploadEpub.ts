/**
 * `useUploadEpub` — react-query mutation that POSTs an EPUB to the backend.
 *
 * Per D-02, the client pre-rejects files > 50 MB before the upload begins so
 * the user gets immediate feedback. The server-side chunked read remains the
 * authoritative size gate (Plan 02). No byte-progress bar is rendered (D-02).
 *
 * The backend error envelope is unwrapped here into a plain `Error` whose
 * `.code` is the stable code from `ErrorCode` (or `null` for network/timeout
 * failures). The `ErrorBlock` maps the code to user-facing copy per UI-SPEC
 * §Copywriting.
 */
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { type EpubUploadResponse, ErrorCode, type ErrorPayload } from "@/lib/api-contract";

/** Mirrors the server-side cap. Keep in sync with `MAX_BYTES` in the backend. */
export const MAX_BYTES = 50 * 1024 * 1024;

/** Non-EPUB extension rejected at the picker (no upload attempted). */
const EPUB_EXT_RE = /\.epub$/i;

export class UploadPreRejectError extends Error {
  readonly code: "non_epub_extension" | "oversize";
  readonly filename: string;
  readonly sizeBytes: number;

  constructor(
    code: "non_epub_extension" | "oversize",
    message: string,
    filename: string,
    sizeBytes: number,
  ) {
    super(message);
    this.name = "UploadPreRejectError";
    this.code = code;
    this.filename = filename;
    this.sizeBytes = sizeBytes;
  }
}

export class UploadServerError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(payload: ErrorPayload, status: number) {
    super(payload.message);
    this.name = "UploadServerError";
    this.code = payload.code;
    this.status = status;
    this.details = payload.details;
  }
}

export class UploadNetworkError extends Error {
  readonly code: "network";
  constructor(message: string) {
    super(message);
    this.name = "UploadNetworkError";
    this.code = "network";
  }
}

export interface UploadEpubVariables {
  file: File;
}

export type UploadEpubOptions = Omit<
  UseMutationOptions<EpubUploadResponse, Error, UploadEpubVariables>,
  "mutationFn"
>;

/** Validate a file before issuing the POST. Throws `UploadPreRejectError`. */
export function validateFileForUpload(file: File): void {
  if (!EPUB_EXT_RE.test(file.name)) {
    throw new UploadPreRejectError(
      "non_epub_extension",
      "Only EPUB 2.0/3.0 files are accepted.",
      file.name,
      file.size,
    );
  }
  if (file.size > MAX_BYTES) {
    throw new UploadPreRejectError(
      "oversize",
      "That file is larger than 50 MB. Choose a smaller file.",
      file.name,
      file.size,
    );
  }
}

async function postEpub({ file }: UploadEpubVariables): Promise<EpubUploadResponse> {
  const form = new FormData();
  form.append("file", file, file.name);
  try {
    const response = await api.post<EpubUploadResponse>("/epubs", form, {
      headers: { "Content-Type": "multipart/form-data" },
      // D-02: no byte-progress bar — no `onUploadProgress` callback.
    });
    return response.data;
  } catch (err) {
    if (axiosIsAxiosError(err)) {
      if (err.response) {
        const payload = (err.response.data as { error?: ErrorPayload } | undefined)?.error;
        if (payload?.code) {
          throw new UploadServerError(payload, err.response.status);
        }
        throw new UploadNetworkError(payload?.message ?? `Server returned ${err.response.status}.`);
      }
      throw new UploadNetworkError(
        err.message || "Couldn't reach the server. Check your connection and try again.",
      );
    }
    throw err;
  }
}

function axiosIsAxiosError(err: unknown): err is import("axios").AxiosError<unknown> {
  return Boolean(
    err &&
      typeof err === "object" &&
      "isAxiosError" in err &&
      (err as { isAxiosError?: boolean }).isAxiosError === true,
  );
}

export function useUploadEpub(options: UploadEpubOptions = {}) {
  return useMutation<EpubUploadResponse, Error, UploadEpubVariables>({
    mutationFn: postEpub,
    ...options,
  });
}

/** Re-export the canonical code constants for tests. */
export { ErrorCode };
