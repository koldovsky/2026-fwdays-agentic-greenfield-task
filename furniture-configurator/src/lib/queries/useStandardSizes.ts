"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "./fetchJson";

export type DimensionType = "WIDTH" | "HEIGHT" | "DEPTH";

export interface StandardSizeEntry {
  id: number;
  dimensionType: DimensionType;
  valueCm: number;
  active: boolean;
}

const queryKey = ["standard-sizes"];

export function useStandardSizesQuery(initialData: StandardSizeEntry[]) {
  return useQuery({
    queryKey,
    queryFn: () =>
      fetchJson<{ standardSizes: StandardSizeEntry[] }>("/api/standard-sizes").then(
        (json) => json.standardSizes,
      ),
    initialData,
  });
}

export function useAddStandardSizeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dimensionType: DimensionType; valueCm: number }) =>
      fetchJson<{ standardSize: StandardSizeEntry }>("/api/standard-sizes", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((json) => json.standardSize),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useToggleStandardSizeActiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: StandardSizeEntry) =>
      fetchJson<{ standardSize: StandardSizeEntry }>(`/api/standard-sizes/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !item.active }),
      }).then((json) => json.standardSize),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
