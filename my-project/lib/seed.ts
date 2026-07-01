import type { Database } from "./types";

export const seedData: Database = {
  users: [
    { userId: "usr_001", username: "test", passwordHash: "test", fullName: "System Testing Administrator", role: "Admin", isActive: true },
    { userId: "usr_002", username: "operator1", passwordHash: "securepass123", fullName: "Warehouse Floor Lead", role: "Staff", isActive: true },
  ],
  suppliers: [
    { supplierId: "sup_101", companyName: "Apex Steel Works", contactName: "Sarah Jenkins", email: "procurement@apexsteel.com", phone: "+1-555-019-8234", leadTimeDays: 5, rating: 4.8 },
    { supplierId: "sup_102", companyName: "Polymer Synthetics Corp", contactName: "Michael Chang", email: "orders@polysynth.com", phone: "+1-555-014-9988", leadTimeDays: 7, rating: 4.2 },
  ],
  rawMaterials: [
    { materialId: "mat_201", materialName: "Hardened Carbon Steel Rod 20mm", sku: "RM-ST-20MM", category: "Metals", quantityInStock: 150, unitOfMeasure: "KG", unitPrice: 12.5, reorderLevel: 50, stockType: "unrestricted", supplierId: "sup_101" },
    { materialId: "mat_202", materialName: "Industrial Polyurethane Resin", sku: "RM-PL-RESIN", category: "Plastics", quantityInStock: 45, unitOfMeasure: "L", unitPrice: 25, reorderLevel: 60, stockType: "quality_inspection", supplierId: "sup_102" },
    { materialId: "mat_203", materialName: "Anti-Corrosion Structural Coating", sku: "RM-CH-COAT", category: "Chemicals", quantityInStock: 12, unitOfMeasure: "L", unitPrice: 18, reorderLevel: 20, stockType: "blocked", supplierId: "sup_102" },
  ],
  finishedGoods: [{ productId: "prd_301", productName: "Heavy Duty Steel Bracket", sku: "FG-ST-HDB", category: "Structural Consumables", quantityInStock: 80, unitOfMeasure: "PC", unitPrice: 45, reorderLevel: 20, bomId: "bom_401" }],
  boms: [{ bomId: "bom_401", productId: "prd_301", version: "1.0", materials: [{ materialId: "mat_201", quantityRequired: 1.5 }, { materialId: "mat_202", quantityRequired: 0.25 }] }],
  purchaseOrders: [
    { poId: "po_501", poNumber: "PO-2026-0001", supplierId: "sup_101", status: "Received", items: [{ materialId: "mat_201", quantityOrdered: 100, unitPrice: 12.5, quantityReceived: 100 }], totalCost: 1250, createdDate: "2026-03-01T08:30:00Z", receivedDate: "2026-03-06T14:15:00Z" },
    { poId: "po_502", poNumber: "PO-2026-0002", supplierId: "sup_102", status: "Ordered", items: [{ materialId: "mat_202", quantityOrdered: 50, unitPrice: 25, quantityReceived: 0 }], totalCost: 1250, createdDate: "2026-03-08T10:00:00Z", receivedDate: null },
  ],
  stockMovements: [
    { movementId: "mvt_601", timestamp: "2026-03-06T14:20:00Z", itemType: "RAW_MATERIAL", itemId: "mat_201", quantity: 100, direction: "IN", reason: "Purchase Order Receipt", associatedDocId: "po_501", userId: "usr_001" },
    { movementId: "mvt_602", timestamp: "2026-03-09T09:15:00Z", itemType: "RAW_MATERIAL", itemId: "mat_201", quantity: -1.5, direction: "OUT", reason: "Production Consumption", associatedDocId: "bom_401", userId: "usr_001" },
    { movementId: "mvt_603", timestamp: "2026-03-09T09:15:00Z", itemType: "FINISHED_GOOD", itemId: "prd_301", quantity: 1, direction: "IN", reason: "Work Order Completion", associatedDocId: "bom_401", userId: "usr_001" },
  ],
};

