/**
 * `useCancelJob` — react-query mutation for `DELETE /api/v1/jobs/{id}`.
 *
 * Quick 260710-oih / JOBS-06: the SPA's "Cancel" button on the
 * progress view calls this mutation; on success the panel navigates
 * back to the chooser (default behaviour) or runs a caller-supplied
 * `onCancelled` callback (for page-level state resets). On a
 * non-2xx the response envelope is unwrapped into a typed
 * `CancelJobServerError` so the panel can render the user-facing
 * copy per the inline error banner. On a network failure the
 * mutation throws `CancelJobNetworkError`.
 *
 * The cancel surface (DELETE /api/v1/jobs/{id}) is documented in
 * docs/agents/api-contract.md; the SPA consumes it via this hook
 * (no shared schema type — 204 No-Content has no body).
 */
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { api } from "@/lib/api";
import type { ErrorPayload } from "@/lib/api-contract";

export class CancelJobServerError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(payload: ErrorPayload, status: number) {
    super(payload.message);
    this.name = "CancelJobServerError";
    this.code = payload.code;
    this.status = status;
    this.details = payload.details;
  }
}

export class CancelJobNetworkError extends Error {
  readonly code = "network";
  constructor(message: string) {
    super(message);
    this.name = "CancelJobNetworkError";
  }
}

export type CancelJobVariables = string;

export type CancelJobOptions = Omit<
  UseMutationOptions<void, Error, CancelJobVariables>,
  "mutationFn"
>;

async function deleteJob(jobId: CancelJobVariables): Promise<void> {
  try {
    await api.delete<unknown>(`/jobs/${encodeURIComponent(jobId)}`);
    return;
  } catch (err) {
    const axiosErr = err as AxiosError<{ error?: ErrorPayload }>;
    if (axiosErr?.response) {
      const payload = axiosErr.response.data?.error;
      if (payload?.code) {
        throw new CancelJobServerError(payload, axiosErr.response.status);
      }
      throw new CancelJobNetworkError(
        payload?.message ?? `Server returned ${axiosErr.response.status}.`,
      );
    }
    throw new CancelJobNetworkError(
      axiosErr?.message || "Couldn't reach the server. Check your connection and try again.",
    );
  }
}

export function useCancelJob(options: CancelJobOptions = {}) {
  return useMutation<void, Error, CancelJobVariables>({
    mutationFn: deleteJob,
    ...options,
  });
}
