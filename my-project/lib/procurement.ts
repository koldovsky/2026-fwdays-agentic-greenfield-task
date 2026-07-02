import type { Database, PurchaseOrder } from "./types";

const clone = (data: Database): Database => structuredClone(data);
const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function createOrder(data: Database, supplierId: string, materialId: string, quantity: number, unitPrice: number): Database {
  if (!data.suppliers.some((s) => s.supplierId === supplierId)) throw new Error("Оберіть коректного постачальника.");
  if (!data.rawMaterials.some((m) => m.materialId === materialId)) throw new Error("Оберіть коректний матеріал.");
  if (quantity <= 0 || unitPrice <= 0) throw new Error("Кількість і ціна мають бути додатними.");
  const next = clone(data);
  const number = String(Math.max(0, ...next.purchaseOrders.map((p) => Number(p.poNumber.split("-").at(-1)))) + 1).padStart(4, "0");
  const order: PurchaseOrder = { poId: id("po"), poNumber: `ЗМ-${new Date().getUTCFullYear()}-${number}`, supplierId, status: "Замовлено", items: [{ materialId, quantityOrdered: quantity, unitPrice, quantityReceived: 0 }], totalCost: quantity * unitPrice, createdDate: new Date().toISOString(), receivedDate: null };
  next.purchaseOrders.push(order);
  return next;
}

export function receiveOrder(data: Database, poId: string, quantity: number, userId: string): Database {
  if (quantity <= 0) throw new Error("Кількість надходження має бути додатною.");
  const next = clone(data);
  const order = next.purchaseOrders.find((p) => p.poId === poId);
  if (!order || order.items.length !== 1) throw new Error("Замовлення не знайдено.");
  const line = order.items[0];
  const remaining = line.quantityOrdered - line.quantityReceived;
  if (quantity > remaining) throw new Error(`Кількість перевищує залишок до отримання: ${remaining}.`);
  const material = next.rawMaterials.find((m) => m.materialId === line.materialId);
  if (!material) throw new Error("Замовлений матеріал більше не існує.");
  line.quantityReceived += quantity;
  material.quantityInStock += quantity;
  material.stockType = "quality_inspection";
  order.status = line.quantityReceived === line.quantityOrdered ? "Отримано" : "Частково отримано";
  order.receivedDate = order.status === "Отримано" ? new Date().toISOString() : null;
  next.stockMovements.push({ movementId: id("mvt"), timestamp: new Date().toISOString(), itemType: "RAW_MATERIAL", itemId: material.materialId, quantity, direction: "IN", reason: "Надходження за замовленням", associatedDocId: poId, userId });
  return next;
}
