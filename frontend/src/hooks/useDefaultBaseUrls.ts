/**
 * `useDefaultBaseUrls` — react-query hook for the runtime-configured
 * provider default base URLs.
 *
 * Quick 260708-t1t: surfaces the runtime-configured default base
 * URLs (`GET /api/v1/providers/ollama/base-url` +
 * `GET /api/v1/providers/openai-compatible/base-url`) to the SPA
 * at mount time. The two endpoints are fetched in parallel via a
 * single `useQuery` so both URLs share one network round-trip per
 * session; the `queryKey` is `["/providers/base-urls"]` so
 * react-query's cache deduplicates the second
 * `useDefaultBaseUrls()` subscriber. `staleTime: Infinity` mirrors
 * the NLTK health hook's posture — the defaults do not change at
 * runtime, so the SPA never re-fetches.
 *
 * Used by `<ProviderModelSelect>` + `<TranslationConfigStep>` +
 * `<VoiceoverConfigStep>` to seed the `Base URL` form fields. The
 * form's `useState` initial value falls back to a literal
 * mock-friendly default while the API fetch is in flight (and
 * when the backend is unreachable).
 */
import { useQuery } from "@tanstack/react-query";

import { fetchOllamaBaseUrl, fetchOpenAIBaseUrl } from "@/lib/api";

export interface DefaultBaseUrls {
  ollamaBaseUrl: string | undefined;
  openaiBaseUrl: string | undefined;
}

export function useDefaultBaseUrls(): {
  ollamaBaseUrl: string | undefined;
  openaiBaseUrl: string | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const query = useQuery<DefaultBaseUrls>({
    queryKey: ["/providers/base-urls"],
    queryFn: async () => {
      const [ollamaResp, openaiResp] = await Promise.all([
        fetchOllamaBaseUrl(),
        fetchOpenAIBaseUrl(),
      ]);
      return {
        ollamaBaseUrl: ollamaResp.base_url,
        openaiBaseUrl: openaiResp.base_url,
      };
    },
    // The defaults do not change at runtime (the env var resolves
    // once at process start), so we cache forever — same posture
    // as the NLTK health hook.
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
  return {
    ollamaBaseUrl: query.data?.ollamaBaseUrl,
    openaiBaseUrl: query.data?.openaiBaseUrl,
    isLoading: query.isLoading,
    error: query.error,
  };
}
