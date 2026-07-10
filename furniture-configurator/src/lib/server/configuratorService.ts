import { prisma } from "@/lib/prisma";
import { buildBOM, type BuildBOMPartSpecs } from "@/lib/configurator/buildBOM";
import { findMatchingCatalogEntry } from "@/lib/configurator/findMatchingCatalogEntry";
import type {
  BOMResult,
  CatalogEntryRecord,
  ConfigurationSelection,
  PartSizeSpec,
} from "@/lib/configurator/types";
import type { PartSpec } from "@/generated/prisma/client";

export interface ConfigurationInput {
  productTypeId: number;
  topSizeCm: number;
  bottomSizeCm: number;
  facadeColorId: number;
  facadeMaterialId: number;
  corpusMaterialId: number;
  hardwareItemIds: number[];
}

export type ResolvedConfiguration =
  | { ok: true; selection: ConfigurationSelection; partSpecs: BuildBOMPartSpecs }
  | { ok: false; error: string };

// Top/bottom parts in this product type are sized along the WIDTH dimension.
// A product type with more dimensions would need a per-part-role mapping.
async function loadStandardSizesCm(): Promise<number[]> {
  const sizes = await prisma.standardSize.findMany({
    where: { dimensionType: "WIDTH", active: true },
  });
  return sizes.map((s) => s.valueCm);
}

function toPartSizeSpec(spec: PartSpec, standardSizesCm: number[]): PartSizeSpec {
  return {
    partRole: spec.partRole,
    allowsCustomSize: spec.allowsCustomSize,
    minCm: spec.minCm,
    maxCm: spec.maxCm,
    standardSizesCm,
  };
}

export async function resolveConfiguration(
  input: ConfigurationInput,
): Promise<ResolvedConfiguration> {
  const [productType, facadeColor, facadeMaterial, corpusMaterial, hardwareItems, standardSizesCm] =
    await Promise.all([
      prisma.productType.findUnique({
        where: { id: input.productTypeId },
        include: { partSpecs: true },
      }),
      prisma.color.findUnique({ where: { id: input.facadeColorId } }),
      prisma.material.findUnique({ where: { id: input.facadeMaterialId } }),
      prisma.material.findUnique({ where: { id: input.corpusMaterialId } }),
      prisma.hardwareItem.findMany({
        where: { id: { in: input.hardwareItemIds }, active: true },
      }),
      loadStandardSizesCm(),
    ]);

  if (!productType) return { ok: false, error: "Product type not found" };
  if (!facadeColor?.active) return { ok: false, error: "Facade color not found or inactive" };
  if (!facadeMaterial?.active) return { ok: false, error: "Facade material not found or inactive" };
  if (!corpusMaterial?.active) return { ok: false, error: "Corpus material not found or inactive" };
  if (hardwareItems.length !== input.hardwareItemIds.length) {
    return { ok: false, error: "One or more hardware items not found or inactive" };
  }

  const topPartSpec = productType.partSpecs.find((p) => p.partRole === "TOP");
  const bottomPartSpec = productType.partSpecs.find((p) => p.partRole === "BOTTOM");
  if (!topPartSpec || !bottomPartSpec) {
    return { ok: false, error: "Product type is missing top/bottom part specs" };
  }

  const selection: ConfigurationSelection = {
    productTypeName: productType.name,
    top: { sizeCm: input.topSizeCm },
    bottom: { sizeCm: input.bottomSizeCm },
    facade: {
      color: { id: facadeColor.id, name: facadeColor.name },
      material: { id: facadeMaterial.id, name: facadeMaterial.name },
    },
    corpus: { material: { id: corpusMaterial.id, name: corpusMaterial.name } },
    hardware: hardwareItems.map((h) => ({ id: h.id, sku: h.sku, name: h.name })),
  };

  return {
    ok: true,
    selection,
    partSpecs: {
      top: toPartSizeSpec(topPartSpec, standardSizesCm),
      bottom: toPartSizeSpec(bottomPartSpec, standardSizesCm),
    },
  };
}

export async function getCatalogEntryRecords(productTypeId: number): Promise<CatalogEntryRecord[]> {
  const entries = await prisma.catalogEntry.findMany({
    where: { productTypeId, active: true },
    include: { productType: true, hardwareOptions: true },
  });
  return entries.map((e) => ({
    id: e.id,
    sku: e.sku,
    productTypeName: e.productType.name,
    topSizeCm: e.topSizeCm,
    bottomSizeCm: e.bottomSizeCm,
    facadeColorId: e.facadeColorId,
    facadeMaterialId: e.facadeMaterialId,
    corpusMaterialId: e.corpusMaterialId,
    hardwareItemIds: e.hardwareOptions.map((h) => h.hardwareItemId),
  }));
}

export interface SubmitConfigurationResult {
  bomResult: BOMResult;
  isStandard: boolean;
  matchingEntry: { id: number; sku: string } | null;
}

export async function submitConfiguration(
  input: ConfigurationInput,
): Promise<{ ok: true; result: SubmitConfigurationResult } | { ok: false; error: string }> {
  const resolved = await resolveConfiguration(input);
  if (!resolved.ok) return resolved;

  const bomResult = buildBOM(resolved.selection, resolved.partSpecs);
  if (!bomResult.valid) {
    return { ok: true, result: { bomResult, isStandard: false, matchingEntry: null } };
  }

  const catalogEntries = await getCatalogEntryRecords(input.productTypeId);
  const match = findMatchingCatalogEntry(resolved.selection, catalogEntries);

  return {
    ok: true,
    result: {
      bomResult,
      isStandard: match != null,
      matchingEntry: match ? { id: match.id, sku: match.sku } : null,
    },
  };
}
