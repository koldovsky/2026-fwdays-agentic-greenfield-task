import type { PartSizeSpec, SizeValidationResult } from "./types";

export function validateSize(
  partSpec: PartSizeSpec,
  requestedSize: number,
): SizeValidationResult {
  if (partSpec.standardSizesCm.includes(requestedSize)) {
    return { valid: true, isStandard: true };
  }

  if (!partSpec.allowsCustomSize) {
    return {
      valid: false,
      error: `Розмір ${requestedSize}см не є стандартним для цієї частини; індивідуальні розміри не дозволені.`,
    };
  }

  const { minCm, maxCm } = partSpec;
  if (minCm == null || maxCm == null || requestedSize < minCm || requestedSize > maxCm) {
    return {
      valid: false,
      error: `Розмір ${requestedSize}см поза допустимим діапазоном ${minCm}-${maxCm}см.`,
    };
  }

  return { valid: true, isStandard: false };
}
