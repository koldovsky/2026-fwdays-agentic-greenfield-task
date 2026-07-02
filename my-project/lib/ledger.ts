import type { Database, StockMovement } from "./types";

export type MovementLedgerRow = StockMovement & {
  itemName: string;
  itemTypeLabel: "Сировина" | "Готова продукція";
  actorName: string;
};

export function movementLedger(data: Database): MovementLedgerRow[] {
  const itemNames = new Map([
    ...data.rawMaterials.map((item) => [item.materialId, item.materialName] as const),
    ...data.finishedGoods.map((item) => [item.productId, item.productName] as const),
  ]);
  const actorNames = new Map(data.users.map((user) => [user.userId, user.fullName] as const));
  return structuredClone(data.stockMovements)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .map((movement) => ({
      ...movement,
      itemName: itemNames.get(movement.itemId) ?? movement.itemId,
      itemTypeLabel: movement.itemType === "RAW_MATERIAL" ? "Сировина" : "Готова продукція",
      actorName: actorNames.get(movement.userId) ?? movement.userId,
    }));
}
