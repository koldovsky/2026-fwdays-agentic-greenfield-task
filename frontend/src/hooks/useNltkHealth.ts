/**
 * `useNltkHealth` — react-query hook for `GET /api/v1/health/nltk`.
 *
 * D-09 (NLTK data-package health endpoint). The NLTK data state does not
 * change at runtime (punkt_tab is downloaded once into a volume
 * on the backend container), so we cache the response with
 * `staleTime: Infinity` — the SPA never re-fetches.
 *
 * Used by `<TranslationConfigStep>` to drive the inline `<NoticeBanner>`
 * visibility check: when the target language is in
 * `data.fallback_languages`, the banner renders the
 * `suggest_command` + a "Copy command" button. When the target is
 * NOT in `supported_languages` (NLTK does not ship a tokenizer for
 * that language at all), the banner renders without an install
 * command. Otherwise (target is in `supported_languages` and not in
 * `fallback_languages`) the banner is hidden.
 */
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { HealthNltkResponse } from "@/lib/api-contract";

export function useNltkHealth() {
  return useQuery<HealthNltkResponse>({
    queryKey: ["/health/nltk"],
    queryFn: async () => {
      const response = await api.get<HealthNltkResponse>("/health/nltk");
      return response.data;
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}
