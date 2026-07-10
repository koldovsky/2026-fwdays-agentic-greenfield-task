"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "./fetchJson";

export interface PartSpecEntry {
  id: number;
  partRole: string;
  allowsCustomSize: boolean;
  minCm: number | null;
  maxCm: number | null;
}

const queryKey = ["part-specs"];

// There is no GET /api/part-specs list route: the list only ever comes from
// the server component's initial Prisma fetch, kept in sync locally via the
// update mutation's onSuccess below rather than by invalidate-and-refetch.
export function usePartSpecsQuery(initialData: PartSpecEntry[]) {
  return useQuery({
    queryKey,
    queryFn: () => Promise.resolve(initialData),
    initialData,
  });
}

export function useUpdatePartSpecMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: number;
      allowsCustomSize?: boolean;
      minCm?: number | null;
      maxCm?: number | null;
    }) =>
      fetchJson<{ partSpec: PartSpecEntry }>(`/api/part-specs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }).then((json) => json.partSpec),
    onSuccess: (updated) => {
      queryClient.setQueryData<PartSpecEntry[]>(queryKey, (prev) =>
        prev?.map((item) => (item.id === updated.id ? updated : item)),
      );
    },
  });
}
