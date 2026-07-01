export type Role = "Admin" | "Staff";
export type StockType = "unrestricted" | "quality_inspection" | "blocked";
export type PurchaseOrderStatus = "Ordered" | "Partially Received" | "Received" | "Closed";

export interface User { userId: string; username: string; passwordHash: string; fullName: string; role: Role; isActive: boolean }
export interface Supplier { supplierId: string; companyName: string; contactName: string; email: string; phone: string; leadTimeDays: number; rating: number }
export interface RawMaterial { materialId: string; materialName: string; sku: string; category: string; quantityInStock: number; unitOfMeasure: string; unitPrice: number; reorderLevel: number; stockType: StockType; supplierId: string }
export interface FinishedGood { productId: string; productName: string; sku: string; category: string; quantityInStock: number; unitOfMeasure: string; unitPrice: number; reorderLevel: number; bomId: string }
export interface Bom { bomId: string; productId: string; version: string; materials: Array<{ materialId: string; quantityRequired: number }> }
export interface PurchaseOrder { poId: string; poNumber: string; supplierId: string; status: PurchaseOrderStatus; items: Array<{ materialId: string; quantityOrdered: number; unitPrice: number; quantityReceived: number }>; totalCost: number; createdDate: string; receivedDate: string | null }
export interface StockMovement { movementId: string; timestamp: string; itemType: "RAW_MATERIAL" | "FINISHED_GOOD"; itemId: string; quantity: number; direction: "IN" | "OUT" | "ADJUST"; reason: "Purchase Order Receipt" | "Production Consumption" | "Work Order Completion" | "Production Scrap" | "Inventory Adjustment" | "Quality Status Shift"; associatedDocId: string; userId: string }
export interface Database { users: User[]; suppliers: Supplier[]; rawMaterials: RawMaterial[]; finishedGoods: FinishedGood[]; boms: Bom[]; purchaseOrders: PurchaseOrder[]; stockMovements: StockMovement[] }

