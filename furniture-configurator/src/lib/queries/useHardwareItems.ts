"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "./fetchJson";

export interface HardwareItemEntry {
  id: number;
  name: string;
  sku: string;
  active: boolean;
}

const queryKey = ["hardware-items"];

export function useHardwareItemsQuery(initialData: HardwareItemEntry[]) {
  return useQuery({
    queryKey,
    queryFn: () =>
      fetchJson<{ hardwareItems: HardwareItemEntry[] }>("/api/hardware-items").then(
        (json) => json.hardwareItems,
      ),
    initialData,
  });
}

export function useAddHardwareItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; sku: string }) =>
      fetchJson<{ hardwareItem: HardwareItemEntry }>("/api/hardware-items", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((json) => json.hardwareItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useToggleHardwareItemActiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: HardwareItemEntry) =>
      fetchJson<{ hardwareItem: HardwareItemEntry }>(`/api/hardware-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !item.active }),
      }).then((json) => json.hardwareItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
