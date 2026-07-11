/**
 * `useCreateJob` — react-query mutation for `POST /api/v1/jobs`.
 *
 * The backend Pydantic v2 discriminated union (D-05 + F4-AC1) accepts
 * the three variants; the SPA constructs the correct variant from the
 * chooser state. On 422 (Pydantic rejects stray fields) or 422
 * `source_language_required` (D-06), the response envelope is unwrapped
 * into a typed `CreateJobServerError` so the form can render the
 * user-facing copy per UI-SPEC.
 *
 * Phase 3 D-15: the `VoiceoverJobBody` variant is accepted by the
 * discriminated union (TypeScript's structural typing does NOT enforce
 * the per-variant `extra="forbid"` the way Pydantic does, so the SPA
 * must construct the correct variant from the chooser state at the
 * call site). Re-exported here for ergonomic import from
 * `<VoiceoverConfigStep>`.
 */
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { api } from "@/lib/api";
import type {
  CombinedJobBody,
  ErrorPayload,
  JobCreateBody,
  JobView,
  TranslationJobBody,
  VoiceoverJobBody,
} from "@/lib/api-contract";

/** Re-export the discriminated-union body variants for ergonomic import. */
export type CreateJobBody = JobCreateBody;
export type { CombinedJobBody, TranslationJobBody, VoiceoverJobBody };

export class CreateJobServerError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(payload: ErrorPayload, status: number) {
    super(payload.message);
    this.name = "CreateJobServerError";
    this.code = payload.code;
    this.status = status;
    this.details = payload.details;
  }
}

export class CreateJobNetworkError extends Error {
  readonly code = "network";
  constructor(message: string) {
    super(message);
    this.name = "CreateJobNetworkError";
  }
}

export type CreateJobVariables = JobCreateBody;

export type CreateJobOptions = Omit<
  UseMutationOptions<JobView, Error, CreateJobVariables>,
  "mutationFn"
>;

async function postJob(body: CreateJobVariables): Promise<JobView> {
  try {
    const response = await api.post<JobView>("/jobs", body);
    return response.data;
  } catch (err) {
    const axiosErr = err as AxiosError<{ error?: ErrorPayload }>;
    if (axiosErr?.response) {
      const payload = axiosErr.response.data?.error;
      if (payload?.code) {
        throw new CreateJobServerError(payload, axiosErr.response.status);
      }
      throw new CreateJobNetworkError(
        payload?.message ?? `Server returned ${axiosErr.response.status}.`,
      );
    }
    throw new CreateJobNetworkError(
      axiosErr?.message || "Couldn't reach the server. Check your connection and try again.",
    );
  }
}

export function useCreateJob(options: CreateJobOptions = {}) {
  return useMutation<JobView, Error, CreateJobVariables>({
    mutationFn: postJob,
    ...options,
  });
}
