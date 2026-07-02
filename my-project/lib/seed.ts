import type { Database } from "./types";

export const seedData: Database = {
  users: [
    { userId: "usr_001", username: "test", passwordHash: "test", fullName: "Адміністратор тестової системи", role: "Адміністратор", isActive: true },
    { userId: "usr_002", username: "operator1", passwordHash: "securepass123", fullName: "Керівник складської зміни", role: "Працівник", isActive: true },
  ],
  suppliers: [
    { supplierId: "sup_101", companyName: "Сталь-Пром Україна", contactName: "Сара Дженкінс", email: "procurement@apexsteel.com", phone: "+380 44 555 01 01", leadTimeDays: 5, rating: 4.8 },
    { supplierId: "sup_102", companyName: "Полімерні Системи", contactName: "Михайло Чанг", email: "orders@polysynth.com", phone: "+380 44 555 01 02", leadTimeDays: 7, rating: 4.2 },
  ],
  rawMaterials: [
    { materialId: "mat_201", materialName: "Загартований сталевий прут 20 мм", sku: "RM-ST-20MM", category: "Метали", quantityInStock: 150, unitOfMeasure: "кг", unitPrice: 12.5, reorderLevel: 50, stockType: "unrestricted", supplierId: "sup_101" },
    { materialId: "mat_202", materialName: "Промислова поліуретанова смола", sku: "RM-PL-RESIN", category: "Полімери", quantityInStock: 45, unitOfMeasure: "л", unitPrice: 25, reorderLevel: 60, stockType: "quality_inspection", supplierId: "sup_102" },
    { materialId: "mat_203", materialName: "Антикорозійне структурне покриття", sku: "RM-CH-COAT", category: "Хімічні матеріали", quantityInStock: 12, unitOfMeasure: "л", unitPrice: 18, reorderLevel: 20, stockType: "blocked", supplierId: "sup_102" },
  ],
  finishedGoods: [{ productId: "prd_301", productName: "Посилений сталевий кронштейн", sku: "FG-ST-HDB", category: "Конструкційні вироби", quantityInStock: 80, unitOfMeasure: "шт", unitPrice: 45, reorderLevel: 20, bomId: "bom_401" }],
  boms: [{ bomId: "bom_401", productId: "prd_301", version: "1.0", materials: [{ materialId: "mat_201", quantityRequired: 1.5 }, { materialId: "mat_202", quantityRequired: 0.25 }] }],
  purchaseOrders: [
    { poId: "po_501", poNumber: "ЗМ-2026-0001", supplierId: "sup_101", status: "Отримано", items: [{ materialId: "mat_201", quantityOrdered: 100, unitPrice: 12.5, quantityReceived: 100 }], totalCost: 1250, createdDate: "2026-03-01T08:30:00Z", receivedDate: "2026-03-06T14:15:00Z" },
    { poId: "po_502", poNumber: "ЗМ-2026-0002", supplierId: "sup_102", status: "Замовлено", items: [{ materialId: "mat_202", quantityOrdered: 50, unitPrice: 25, quantityReceived: 0 }], totalCost: 1250, createdDate: "2026-03-08T10:00:00Z", receivedDate: null },
  ],
  stockMovements: [
    { movementId: "mvt_601", timestamp: "2026-03-06T14:20:00Z", itemType: "RAW_MATERIAL", itemId: "mat_201", quantity: 100, direction: "IN", reason: "Надходження за замовленням", associatedDocId: "po_501", userId: "usr_001" },
    { movementId: "mvt_602", timestamp: "2026-03-09T09:15:00Z", itemType: "RAW_MATERIAL", itemId: "mat_201", quantity: -1.5, direction: "OUT", reason: "Списання у виробництво", associatedDocId: "bom_401", userId: "usr_001" },
    { movementId: "mvt_603", timestamp: "2026-03-09T09:15:00Z", itemType: "FINISHED_GOOD", itemId: "prd_301", quantity: 1, direction: "IN", reason: "Завершення виробничого замовлення", associatedDocId: "bom_401", userId: "usr_001" },
  ],
};
