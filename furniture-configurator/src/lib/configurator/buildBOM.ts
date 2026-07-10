import { validateSize } from "./validateSize";
import type {
  BOMError,
  BOMResult,
  ConfigurationSelection,
  PartSizeSpec,
} from "./types";

export interface BuildBOMPartSpecs {
  top: PartSizeSpec;
  bottom: PartSizeSpec;
}

export function sanitizeSkuSegment(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

export function buildBOM(
  selection: ConfigurationSelection,
  partSpecs: BuildBOMPartSpecs,
): BOMResult {
  const errors: BOMError[] = [];

  const topResult = validateSize(partSpecs.top, selection.top.sizeCm);
  if (!topResult.valid) {
    errors.push({ partRole: "TOP", message: topResult.error });
  }

  const bottomResult = validateSize(partSpecs.bottom, selection.bottom.sizeCm);
  if (!bottomResult.valid) {
    errors.push({ partRole: "BOTTOM", message: bottomResult.error });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const bom = [
    {
      partRole: "TOP" as const,
      sku: `TOP-${selection.top.sizeCm}`,
      label: `Верх ${selection.top.sizeCm}см`,
    },
    {
      partRole: "BOTTOM" as const,
      sku: `BOTTOM-${selection.bottom.sizeCm}`,
      label: `Низ ${selection.bottom.sizeCm}см`,
    },
    {
      partRole: "FACADE" as const,
      sku: `FACADE-${sanitizeSkuSegment(selection.facade.material.name)}-${sanitizeSkuSegment(selection.facade.color.name)}`,
      label: `Фасад ${selection.facade.material.name}, ${selection.facade.color.name}`,
    },
    {
      partRole: "CORPUS" as const,
      sku: `CORPUS-${sanitizeSkuSegment(selection.corpus.material.name)}`,
      label: `Корпус ${selection.corpus.material.name}`,
    },
    ...selection.hardware.map((item) => ({
      partRole: "HARDWARE" as const,
      sku: item.sku,
      label: item.name,
    })),
  ];

  return { valid: true, bom };
}
