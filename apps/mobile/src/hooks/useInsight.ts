/**
 * Today's daily insight (FR-INSIGHT-01). One cached query per day — the server generates at
 * most once per local day (NFR-COST-01), so we keep it fresh for the session and only refetch
 * on an explicit refresh, which replaces the cached value.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DailyInsight } from '@honeydo/shared';
import { insightApi } from '../api/insight';

const KEY = ['insight'] as const;

export function useInsight() {
  return useQuery({ queryKey: KEY, queryFn: insightApi.get, staleTime: Infinity });
}

/** Force a regeneration and write the fresh insight straight into the cache. */
export function useRefreshInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => insightApi.refresh(),
    onSuccess: (data: DailyInsight) => qc.setQueryData(KEY, data),
  });
}
