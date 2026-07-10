"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, fetchJson } from "./fetchJson";
import type { ConfigurationInput } from "./useConfigurations";

export const catalogEntriesQueryKey = ["catalog-entries"] as const;

export interface CatalogEntryEntry {
  id: number;
  sku: string;
  active: boolean;
  topSizeCm: number;
  bottomSizeCm: number;
  facadeColor: { name: string };
  facadeMaterial: { name: string };
  corpusMaterial: { name: string };
}

interface CatalogEntryMatch {
  id: number;
  sku: string;
}

export function useCatalogEntriesQuery(initialData: CatalogEntryEntry[]) {
  return useQuery({
    queryKey: catalogEntriesQueryKey,
    queryFn: () =>
      fetchJson<{ catalogEntries: CatalogEntryEntry[] }>("/api/catalog-entries").then(
        (json) => json.catalogEntries,
      ),
    initialData,
  });
}

export function useSaveCatalogEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConfigurationInput) =>
      fetchJson<{ catalogEntry: { id: number; sku: string } }>("/api/catalog-entries", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogEntriesQueryKey });
    },
  });
}

export function useToggleCatalogEntryActiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: CatalogEntryEntry) =>
      fetchJson<{ catalogEntry: CatalogEntryEntry }>(`/api/catalog-entries/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !item.active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogEntriesQueryKey });
    },
  });
}

export function getExistingCatalogMatch(error: unknown): CatalogEntryMatch | null {
  if (error instanceof ApiError && error.status === 409) {
    const body = error.body as { existingMatch?: CatalogEntryMatch } | null;
    return body?.existingMatch ?? null;
  }
  return null;
}
