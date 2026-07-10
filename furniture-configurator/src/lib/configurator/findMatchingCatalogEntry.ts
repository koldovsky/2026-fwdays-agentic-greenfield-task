import type { CatalogEntryRecord, ConfigurationSelection } from "./types";

function sameHardwareSet(entryHardwareIds: number[], selectionHardwareIds: number[]): boolean {
  if (entryHardwareIds.length !== selectionHardwareIds.length) return false;
  const entrySet = new Set(entryHardwareIds);
  return selectionHardwareIds.every((id) => entrySet.has(id));
}

export function findMatchingCatalogEntry(
  selection: ConfigurationSelection,
  catalogEntries: CatalogEntryRecord[],
): CatalogEntryRecord | null {
  const selectionHardwareIds = selection.hardware.map((h) => h.id);
  return (
    catalogEntries.find(
      (entry) =>
        entry.productTypeName === selection.productTypeName &&
        entry.topSizeCm === selection.top.sizeCm &&
        entry.bottomSizeCm === selection.bottom.sizeCm &&
        entry.facadeColorId === selection.facade.color.id &&
        entry.facadeMaterialId === selection.facade.material.id &&
        entry.corpusMaterialId === selection.corpus.material.id &&
        sameHardwareSet(entry.hardwareItemIds, selectionHardwareIds),
    ) ?? null
  );
}
