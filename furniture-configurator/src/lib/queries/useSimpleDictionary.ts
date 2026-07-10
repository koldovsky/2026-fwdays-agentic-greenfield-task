"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "./fetchJson";

export interface SimpleDictionaryEntry {
  id: number;
  name: string;
  active: boolean;
}

export function useSimpleDictionaryQuery(
  resourcePath: string,
  listKey: string,
  initialData: SimpleDictionaryEntry[],
) {
  return useQuery({
    queryKey: [resourcePath],
    queryFn: () =>
      fetchJson<Record<string, SimpleDictionaryEntry[]>>(resourcePath).then(
        (json) => json[listKey],
      ),
    initialData,
  });
}

export function useAddSimpleDictionaryItemMutation(resourcePath: string, itemKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      fetchJson<Record<string, SimpleDictionaryEntry>>(resourcePath, {
        method: "POST",
        body: JSON.stringify({ name }),
      }).then((json) => json[itemKey]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resourcePath] });
    },
  });
}

export function useToggleSimpleDictionaryActiveMutation(resourcePath: string, itemKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: SimpleDictionaryEntry) =>
      fetchJson<Record<string, SimpleDictionaryEntry>>(`${resourcePath}/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !item.active }),
      }).then((json) => json[itemKey]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resourcePath] });
    },
  });
}
