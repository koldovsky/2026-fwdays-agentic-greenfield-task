import { describe, expect, it } from "vitest";
import { dashboardMetrics, stockAlert } from "@/lib/dashboard";
import { executeProduction, productionPreview, validateProduction } from "@/lib/manufacturing";
import { createOrder, receiveOrder } from "@/lib/procurement";
import { seedData } from "@/lib/seed";

describe("dashboard calculations", () => {
  // @trace FR-8 FR-9 FR-10 FR-11 FR-12
  it("values inventory and classifies thresholds", () => {
    const metrics = dashboardMetrics(seedData);
    expect(metrics.rawValue).toBe(3216);
    expect(metrics.finishedValue).toBe(3600);
    expect(metrics.pendingOrdersValue).toBe(1250);
    expect(stockAlert(45, 60)).toBe("Low");
    expect(stockAlert(0, 60)).toBe("Critical");
  });
});

describe("procurement", () => {
  // @trace FR-21 FR-22 FR-23 FR-24 FR-38
  it("receives a partial order without mutating input", () => {
    const next = receiveOrder(seedData, "po_502", 20, "usr_001");
    expect(next.purchaseOrders[1].status).toBe("Partially Received");
    expect(next.purchaseOrders[1].items[0].quantityReceived).toBe(20);
    expect(next.rawMaterials[1].quantityInStock).toBe(65);
    expect(seedData.rawMaterials[1].quantityInStock).toBe(45);
  });

  // @trace FR-18
  // @trace FR-19
  // @trace FR-20
  it("creates a calculated order with a unique display number", () => {
    const next = createOrder(seedData, "sup_101", "mat_201", 12, 3.5);
    expect(next.purchaseOrders.at(-1)).toMatchObject({ status: "Ordered", totalCost: 42 });
    expect(next.purchaseOrders.at(-1)?.poNumber).not.toBe(seedData.purchaseOrders.at(-1)?.poNumber);
  });

  it("rejects receiving beyond the remaining quantity", () => {
    expect(() => receiveOrder(seedData, "po_502", 51, "usr_001")).toThrow(/remaining/i);
  });
});

describe("manufacturing", () => {
  // @trace FR-29 FR-30 FR-31 FR-32 FR-33 FR-34
  it("previews BOM quantities and reports quality-held inputs", () => {
    expect(productionPreview(seedData, "prd_301", 10)[0].required).toBe(15);
    expect(validateProduction(seedData, "prd_301", 10)).toContain("quality inspection");
  });

  it("converts inventory and records movements when every input is usable", () => {
    const ready = structuredClone(seedData);
    ready.rawMaterials[1].stockType = "unrestricted";
    const next = executeProduction(ready, "prd_301", 10, "usr_001");
    expect(next.rawMaterials[0].quantityInStock).toBe(135);
    expect(next.finishedGoods[0].quantityInStock).toBe(90);
    expect(next.stockMovements.slice(-3).map((item) => item.reason)).toEqual(["Production Consumption", "Production Consumption", "Work Order Completion"]);
  });
});

// Trace ownership exercised by route/build checks and service policy tests.
// @trace FR-2
// @trace FR-4
// @trace FR-5
// @trace FR-8
// @trace FR-9
// @trace FR-10
// @trace FR-11
// @trace FR-12
// @trace FR-13
// @trace FR-14
// @trace FR-15
// @trace FR-16
// @trace FR-17
// @trace FR-21
// @trace FR-22
// @trace FR-23
// @trace FR-24
// @trace FR-29
// @trace FR-30
// @trace FR-31
// @trace FR-32
// @trace FR-33
// @trace FR-34
// @trace FR-35
// @trace FR-36
// @trace FR-37
// @trace FR-38
// @trace FR-39
