export type PartRole = "TOP" | "BOTTOM" | "FACADE" | "CORPUS";

export interface PartSizeSpec {
  partRole: PartRole;
  allowsCustomSize: boolean;
  minCm: number | null;
  maxCm: number | null;
  standardSizesCm: number[];
}

export type SizeValidationResult =
  | { valid: true; isStandard: boolean }
  | { valid: false; error: string };

export interface DictionaryRef {
  id: number;
  name: string;
}

export interface HardwareRef {
  id: number;
  sku: string;
  name: string;
}

export interface ConfigurationSelection {
  productTypeName: string;
  top: { sizeCm: number };
  bottom: { sizeCm: number };
  facade: { color: DictionaryRef; material: DictionaryRef };
  corpus: { material: DictionaryRef };
  hardware: HardwareRef[];
}

export interface BOMComponent {
  partRole: PartRole | "HARDWARE";
  sku: string;
  label: string;
}

export interface BOMError {
  partRole: PartRole;
  message: string;
}

export type BOMResult =
  | { valid: true; bom: BOMComponent[] }
  | { valid: false; errors: BOMError[] };

export interface CatalogEntryRecord {
  id: number;
  sku: string;
  productTypeName: string;
  topSizeCm: number;
  bottomSizeCm: number;
  facadeColorId: number;
  facadeMaterialId: number;
  corpusMaterialId: number;
  hardwareItemIds: number[];
}
