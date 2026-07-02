import { describe, expect, it } from "vitest";
import { dashboardMetrics, stockAlert, stockAlertClass } from "@/lib/dashboard";
import { seedData } from "@/lib/seed";

describe("dashboard calculations", () => {
  // @trace FR-8 FR-9 FR-10
  it("calculates inventory and pending-order values from current data", () => {
    const data = structuredClone(seedData);
    data.purchaseOrders.push({ ...data.purchaseOrders[1], poId: "po_closed", poNumber: "ЗМ-2026-0099", status: "Закрито", totalCost: 999 });
    const metrics = dashboardMetrics(data);
    expect(metrics.rawValue).toBe(3216);
    expect(metrics.finishedValue).toBe(3600);
    expect(metrics.pendingOrdersValue).toBe(1250);
  });

  // @trace FR-11 FR-12
  it.each([
    [61, 60, "Достатній запас", "healthy"],
    [60, 60, "Низький запас", "low"],
    [1, 60, "Низький запас", "low"],
    [0, 60, "Критичний запас", "critical"],
  ] as const)("classifies quantity %s against threshold %s", (quantity, threshold, label, cssClass) => {
    expect(stockAlert(quantity, threshold)).toBe(label);
    expect(stockAlertClass(label)).toBe(cssClass);
  });

  // @trace FR-11
  it("returns every material at or below its reorder level", () => {
    const warningNames = dashboardMetrics(seedData).warnings.map((item) => "materialName" in item ? item.materialName : item.productName);
    expect(warningNames).toEqual(["Промислова поліуретанова смола", "Антикорозійне структурне покриття"]);
  });
});

// @trace FR-8, FR-9, FR-10, FR-11, FR-12
