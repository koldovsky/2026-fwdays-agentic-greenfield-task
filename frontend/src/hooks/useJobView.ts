/**
 * `useJobView` — react-query hook for `GET /api/v1/jobs/{id}`.
 *
 * Reads the `JobView` for a given job id; the response is cached in
 * the query client (react-query) so the second navigation to
 * `/jobs?id={id}` after a hard reload is instant. The hook is used
 * by `/jobs/page.tsx` to read the job's `job_type` for the
 * `<JobStatusPanel>` title branch ("Translation progress" vs.
 * "Voice-Over progress") + the two artifact flags
 * (`hasEpubArtifact` + `hasZipArtifact`) that drive the F6
 * download row visibility per 04-UI-SPEC.md §3.1.
 */
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { JobView } from "@/lib/api-contract";

export interface UseJobViewResult {
  /** The job view from the cache (null while loading). */
  data: JobView | undefined;
  /** True while the GET /api/v1/jobs/{id} request is in flight. */
  isLoading: boolean;
  /** True when the job produces a translated EPUB artifact. */
  hasEpubArtifact: boolean;
  /** True when the job produces an audio ZIP artifact. */
  hasZipArtifact: boolean;
}

export function useJobView(jobId: string | null): UseJobViewResult {
  const query = useQuery<JobView>({
    queryKey: ["/jobs", jobId],
    queryFn: async () => {
      const response = await api.get<JobView>(`/jobs/${encodeURIComponent(jobId ?? "")}`);
      return response.data;
    },
    enabled: Boolean(jobId),
    // The JobView is immutable for the lifetime of a job id; the WS
    // event stream drives the progress display. No need to refetch on
    // window focus — the cached view is authoritative.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const jobType = query.data?.job_type;
  // 04-UI-SPEC §3.1 visibility table:
  //   translation           → EPUB only
  //   voiceover             → ZIP only
  //   translation+voiceover → both
  const hasEpubArtifact = jobType === "translation" || jobType === "translation+voiceover";
  const hasZipArtifact = jobType === "voiceover" || jobType === "translation+voiceover";

  return {
    data: query.data,
    isLoading: query.isLoading,
    hasEpubArtifact,
    hasZipArtifact,
  };
}
