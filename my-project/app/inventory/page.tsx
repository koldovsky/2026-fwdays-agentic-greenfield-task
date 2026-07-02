import { Shell } from "@/components/shell";
import { Feedback } from "@/components/feedback";
import { createSupplierAction, updateMaterialAction } from "@/lib/actions";
import { requireSession } from "@/lib/auth/session";
import { readDatabase } from "@/lib/repository";
import { formatMoney } from "@/lib/format";
import type { StockType } from "@/lib/types";

const stockTypes: Record<StockType, string> = { unrestricted: "Доступний", quality_inspection: "Контроль якості", blocked: "Заблокований" };

export default async function Inventory({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const [data, user] = await Promise.all([readDatabase(), requireSession()]);
  const isAdmin = user.role === "Адміністратор";
  return <Shell eyebrow="Контроль запасів" title="Запаси й постачальники">
    <Feedback searchParams={searchParams}/>
    <section className="panel"><div className="panel-head"><div><p className="eyebrow">Сировина</p><h2>Складські запаси</h2></div></div><div className="table-wrap"><table><thead><tr><th>Позиція</th><th>У наявності</th><th>Ціна за одиницю</th><th>Стан запасу</th>{isAdmin && <th>Налаштування адміністратора</th>}</tr></thead><tbody>{data.rawMaterials.map((item) => <tr key={item.materialId}><td><strong>{item.materialName}</strong><small>{item.sku}</small></td><td>{item.quantityInStock} {item.unitOfMeasure}</td><td>{formatMoney(item.unitPrice)}</td><td><span className="badge neutral">{stockTypes[item.stockType]}</span></td>{isAdmin && <td><form action={updateMaterialAction} className="inline-form"><input type="hidden" name="materialId" value={item.materialId}/><input aria-label={`Рівень поповнення для ${item.materialName}`} name="reorderLevel" type="number" min="0" step="0.01" defaultValue={item.reorderLevel}/><select aria-label={`Стан запасу для ${item.materialName}`} name="stockType" defaultValue={item.stockType}><option value="unrestricted">Доступний</option><option value="quality_inspection">Контроль якості</option><option value="blocked">Заблокований</option></select><button className="button small">Зберегти</button></form></td>}</tr>)}</tbody></table></div></section>
    <section className="split equal"><div className="panel"><p className="eyebrow">Мережа партнерів</p><h2>Постачальники</h2>{data.suppliers.map((supplier) => <div className="list-row" key={supplier.supplierId}><div><strong>{supplier.companyName}</strong><small>{supplier.contactName} · {supplier.email}</small></div><span>{supplier.rating.toFixed(1)} ★</span></div>)}</div>{isAdmin && <div className="panel"><p className="eyebrow">Інструмент адміністратора</p><h2>Додати постачальника</h2><form action={createSupplierAction} className="form-grid"><label>Компанія<input name="companyName" required/></label><label>Контактна особа<input name="contactName" required/></label><label>Електронна пошта<input name="email" type="email" required/></label><label>Телефон<input name="phone" required/></label><label>Термін постачання (днів)<input name="leadTimeDays" type="number" min="0" required/></label><label>Рейтинг<input name="rating" type="number" min="0" max="5" step="0.1" required/></label><button className="button primary">Додати постачальника</button></form></div>}</section>
  </Shell>;
}
