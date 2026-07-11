/**
 * `useVoices` — react-query hook for `GET /api/v1/voices`.
 *
 * D-07: OpenAI voices are a fixed set; there is no per-language
 * provider endpoint to call. The response is a single flat list;
 * the SPA renders the entire list in the voice dropdown
 * (no per-language matching).
 *
 * The voice catalog does not change at runtime, so we cache the
 * response with `staleTime: Infinity` — the SPA never re-fetches.
 *
 * Used by `<VoiceoverConfigStep>` to populate the voice `<select>`
 * dropdown.
 */
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { VoicesResponse } from "@/lib/api-contract";

export function useVoices() {
  return useQuery<VoicesResponse>({
    queryKey: ["/voices"],
    queryFn: async () => {
      const response = await api.get<VoicesResponse>("/voices");
      return response.data;
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}
