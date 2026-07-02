import type { Database } from "./types";

export type Alert = "Достатній запас" | "Низький запас" | "Критичний запас";
export const stockAlert = (quantity: number, reorderLevel: number): Alert => quantity <= 0 ? "Критичний запас" : quantity <= reorderLevel ? "Низький запас" : "Достатній запас";
export const stockAlertClass = (alert: Alert) => alert === "Достатній запас" ? "healthy" : alert === "Низький запас" ? "low" : "critical";
export function dashboardMetrics(data: Database) {
  return {
    rawValue: data.rawMaterials.reduce((sum, item) => sum + item.quantityInStock * item.unitPrice, 0),
    finishedValue: data.finishedGoods.reduce((sum, item) => sum + item.quantityInStock * item.unitPrice, 0),
    pendingOrdersValue: data.purchaseOrders.filter((order) => !["Отримано", "Закрито"].includes(order.status)).reduce((sum, order) => sum + order.totalCost, 0),
    warnings: [...data.rawMaterials, ...data.finishedGoods].filter((item) => stockAlert(item.quantityInStock, item.reorderLevel) !== "Достатній запас"),
  };
}
