"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchJson } from "./fetchJson";

interface BOMComponent {
  partRole: string;
  sku: string;
  label: string;
}

interface BOMError {
  partRole: string;
  message: string;
}

export interface ConfigurationInput {
  productTypeId: number;
  topSizeCm: number;
  bottomSizeCm: number;
  facadeColorId: number;
  facadeMaterialId: number;
  corpusMaterialId: number;
  hardwareItemIds: number[];
}

export interface ConfigurationResponse {
  bomResult: { valid: true; bom: BOMComponent[] } | { valid: false; errors: BOMError[] };
  isStandard: boolean;
  matchingEntry: { id: number; sku: string } | null;
}

export function useSubmitConfigurationMutation() {
  return useMutation({
    mutationFn: (input: ConfigurationInput) =>
      fetchJson<ConfigurationResponse>("/api/configurations", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}
