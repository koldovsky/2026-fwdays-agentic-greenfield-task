import type { Database } from "./types";

export function productionPreview(data: Database, productId: string, quantity: number) {
  const product = data.finishedGoods.find((item) => item.productId === productId);
  const bom = data.boms.find((item) => item.bomId === product?.bomId);
  if (!product || !bom || quantity <= 0) throw new Error("Select a product and enter a positive output quantity.");
  return bom.materials.map((line) => {
    const material = data.rawMaterials.find((item) => item.materialId === line.materialId);
    if (!material) throw new Error(`Missing material ${line.materialId}.`);
    return { ...material, required: line.quantityRequired * quantity };
  });
}

export function validateProduction(data: Database, productId: string, quantity: number): string | null {
  for (const item of productionPreview(data, productId, quantity)) {
    if (item.stockType !== "unrestricted") return `${item.materialName} is in ${item.stockType.replace("_", " ")}.`;
    if (item.quantityInStock < item.required) return `${item.materialName} is short by ${(item.required - item.quantityInStock).toFixed(2)} ${item.unitOfMeasure}.`;
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
    next.stockMovements.push({ movementId: `mvt_${crypto.randomUUID()}`, timestamp: now, itemType: "RAW_MATERIAL", itemId: material.materialId, quantity: -used, direction: "OUT", reason: "Production Consumption", associatedDocId: bom.bomId, userId });
  }
  product.quantityInStock += quantity;
  next.stockMovements.push({ movementId: `mvt_${crypto.randomUUID()}`, timestamp: now, itemType: "FINISHED_GOOD", itemId: productId, quantity, direction: "IN", reason: "Work Order Completion", associatedDocId: bom.bomId, userId });
  return next;
}

