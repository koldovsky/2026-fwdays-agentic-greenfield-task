import { describe, expect, it } from "vitest";
import { createOrder, receiveOrder } from "@/lib/procurement";
import { seedData } from "@/lib/seed";

describe("purchase-order creation", () => {
  // @trace FR-18 FR-19 FR-20
  it("creates a calculated order without mutating its input", () => {
    const next = createOrder(seedData, "sup_101", "mat_201", 12, 3.5);
    expect(next.purchaseOrders.at(-1)).toMatchObject({ status: "Замовлено", totalCost: 42 });
    expect(next.purchaseOrders.at(-1)?.poNumber).toMatch(/^ЗМ-\d{4}-\d{4}$/);
    expect(next.purchaseOrders).toHaveLength(seedData.purchaseOrders.length + 1);
    expect(seedData.purchaseOrders).toHaveLength(2);
  });

  // @trace FR-18 FR-39
  it.each([
    ["missing", "mat_201", 1, 1, /постачальника/i],
    ["sup_101", "missing", 1, 1, /матеріал/i],
    ["sup_101", "mat_201", 0, 1, /додатними/i],
    ["sup_101", "mat_201", 1, -1, /додатними/i],
  ] as const)("rejects invalid order input", (supplier, material, quantity, price, message) => {
    expect(() => createOrder(seedData, supplier, material, quantity, price)).toThrow(message);
  });
});

describe("purchase-order receiving", () => {
  // @trace FR-21 FR-22 FR-24 FR-38
  it("records a partial receipt, quality hold, stock increase, and movement atomically", () => {
    const next = receiveOrder(seedData, "po_502", 20, "usr_001");
    expect(next.purchaseOrders[1]).toMatchObject({ status: "Частково отримано", receivedDate: null });
    expect(next.purchaseOrders[1].items[0].quantityReceived).toBe(20);
    expect(next.rawMaterials[1]).toMatchObject({ quantityInStock: 65, stockType: "quality_inspection" });
    expect(next.stockMovements.at(-1)).toMatchObject({ quantity: 20, direction: "IN", reason: "Надходження за замовленням", userId: "usr_001" });
    expect(seedData.rawMaterials[1].quantityInStock).toBe(45);
  });

  // @trace FR-21 FR-23 FR-24
  it("closes a fully received order with a timestamp", () => {
    const next = receiveOrder(seedData, "po_502", 50, "usr_001");
    expect(next.purchaseOrders[1].status).toBe("Отримано");
    expect(next.purchaseOrders[1].receivedDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // @trace FR-21
  it.each([[0, /додатною/i], [51, /залишок/i]] as const)("rejects invalid receipt quantity %s", (quantity, message) => {
    expect(() => receiveOrder(seedData, "po_502", quantity, "usr_001")).toThrow(message);
  });

  // @trace FR-21 FR-39
  it("rejects an unknown purchase order", () => {
    expect(() => receiveOrder(seedData, "missing", 1, "usr_001")).toThrow(/не знайдено/i);
  });

  // @trace FR-24 FR-39
  it("rejects a receipt whose referenced material was removed", () => {
    const data = structuredClone(seedData);
    data.purchaseOrders[1].items[0].materialId = "missing";
    expect(() => receiveOrder(data, "po_502", 1, "usr_001")).toThrow(/більше не існує/i);
  });
});

// @trace FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-38, FR-39
