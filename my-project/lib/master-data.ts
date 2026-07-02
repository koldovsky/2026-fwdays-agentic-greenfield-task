import type { Database, StockType, Supplier } from "./types";

export function addSupplier(data: Database, supplier: Supplier): Database {
  if (data.suppliers.some((item) => item.supplierId === supplier.supplierId)) throw new Error("Постачальник із таким ідентифікатором уже існує.");
  if (!supplier.companyName.trim() || !supplier.contactName.trim() || !supplier.email.trim() || !supplier.phone.trim()) throw new Error("Заповніть усі обов’язкові дані постачальника.");
  if (!Number.isInteger(supplier.leadTimeDays) || supplier.leadTimeDays < 0) throw new Error("Термін постачання має бути цілим невід’ємним числом.");
  if (supplier.rating < 0 || supplier.rating > 5) throw new Error("Рейтинг має бути від 0 до 5.");
  const next = structuredClone(data) as Database;
  next.suppliers.push({ ...supplier, companyName: supplier.companyName.trim(), contactName: supplier.contactName.trim(), email: supplier.email.trim(), phone: supplier.phone.trim() });
  return next;
}

export function updateMaterialSettings(data: Database, materialId: string, reorderLevel: number, stockType: StockType): Database {
  if (reorderLevel < 0) throw new Error("Рівень поповнення не може бути від’ємним.");
  const next = structuredClone(data) as Database;
  const material = next.rawMaterials.find((item) => item.materialId === materialId);
  if (!material) throw new Error("Матеріал не знайдено.");
  material.reorderLevel = reorderLevel;
  material.stockType = stockType;
  return next;
}
