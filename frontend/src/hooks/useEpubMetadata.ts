/**
 * `useEpubMetadata` — react-query hook for `GET /api/v1/epubs/{id}`.
 *
 * D-06 SPA prefill: the form's source language field is pre-filled with
 * `declared_languages[0]` when the EPUB declares exactly one language.
 * The backend exposes the same `declared_languages` field on the
 * `EpubUploadResponse` from `POST /epubs`; the GET endpoint is a
 * re-read path used when the user lands on `/jobs/{id}` after a page
 * reload (the upload response is held in component state and is lost).
 */
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { EpubMetadataResponse } from "@/lib/api-contract";

export function useEpubMetadata(epubId: string | null) {
  return useQuery<EpubMetadataResponse>({
    queryKey: ["/epubs", epubId],
    queryFn: async () => {
      const response = await api.get<EpubMetadataResponse>(
        `/epubs/${encodeURIComponent(epubId ?? "")}`,
      );
      return response.data;
    },
    enabled: Boolean(epubId),
  });
}
