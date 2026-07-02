import type { Database } from "./types";

export function productionPreview(data: Database, productId: string, quantity: number) {
  const product = data.finishedGoods.find((item) => item.productId === productId);
  const bom = data.boms.find((item) => item.bomId === product?.bomId);
  if (!product || !bom || quantity <= 0) throw new Error("Оберіть продукт і введіть додатну кількість випуску.");
  return bom.materials.map((line) => {
    const material = data.rawMaterials.find((item) => item.materialId === line.materialId);
    if (!material) throw new Error(`Матеріал ${line.materialId} відсутній.`);
    return { ...material, required: line.quantityRequired * quantity };
  });
}

export function validateProduction(data: Database, productId: string, quantity: number): string | null {
  for (const item of productionPreview(data, productId, quantity)) {
    if (item.stockType !== "unrestricted") return `${item.materialName} — ${item.stockType === "quality_inspection" ? "на контролі якості" : "заблоковано"}.`;
    if (item.quantityInStock < item.required) return `Не вистачає ${(item.required - item.quantityInStock).toFixed(2)} ${item.unitOfMeasure} матеріалу «${item.materialName}».`;
  }
  return null;
}

export function executeProduction(data: Database, productId: string, quantity: number, userId: string): Database {
  const error = validateProduction(data, productId, quantity);
  if (error) throw new Error(error);
  const next = structuredClone(data) as Database;
  const product = next.finishedGoods.find((item) => item.productId === productId)!;
  const bom = next.boms.find((item) => item.bomId === product.bomId)!;
  const now = new Date().toISOString();
  for (const line of bom.materials) {
    const material = next.rawMaterials.find((item) => item.materialId === line.materialId)!;
    const used = line.quantityRequired * quantity;
    material.quantityInStock -= used;
    next.stockMovements.push({ movementId: `mvt_${crypto.randomUUID()}`, timestamp: now, itemType: "RAW_MATERIAL", itemId: material.materialId, quantity: -used, direction: "OUT", reason: "Списання у виробництво", associatedDocId: bom.bomId, userId });
  }
  product.quantityInStock += quantity;
  next.stockMovements.push({ movementId: `mvt_${crypto.randomUUID()}`, timestamp: now, itemType: "FINISHED_GOOD", itemId: productId, quantity, direction: "IN", reason: "Завершення виробничого замовлення", associatedDocId: bom.bomId, userId });
  return next;
}
