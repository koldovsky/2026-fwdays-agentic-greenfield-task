import { Shell } from "@/components/shell";
import { Feedback } from "@/components/feedback";
import { productionAction } from "@/lib/actions";
import { productionPreview, validateProduction } from "@/lib/manufacturing";
import { readDatabase } from "@/lib/repository";

export default async function Manufacturing({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const data = await readDatabase();
  const product = data.finishedGoods[0];
  const preview = productionPreview(data, product.productId, 10);
  const warning = validateProduction(data, product.productId, 10);
  return <Shell eyebrow="Виробнича дільниця" title="Керування виробництвом"><Feedback searchParams={searchParams}/><section className="split equal"><div className="panel"><p className="eyebrow">Запуск операції</p><h2>Виробниче завдання</h2><form action={productionAction} className="form-grid"><label>Готова продукція<select name="productId">{data.finishedGoods.map((item) => <option key={item.productId} value={item.productId}>{item.productName}</option>)}</select></label><label>Кількість продукції<input name="quantity" type="number" min="0.01" step="0.01" defaultValue="10" required/></label><button className="button primary">Запустити виробництво</button></form><p className="hint">Сервер повторно розраховує потреби та перевіряє доступність матеріалів перед збереженням.</p></div><div className="panel"><p className="eyebrow">Специфікація {data.boms[0].version}</p><h2>Потреба матеріалів на 10 одиниць</h2>{preview.map((item) => <div className="requirement" key={item.materialId}><div><strong>{item.materialName}</strong><small>доступно {item.quantityInStock} {item.unitOfMeasure}</small></div><span>{item.required} {item.unitOfMeasure}</span></div>)}{warning && <div className="notice warning">Запуск заблоковано: {warning}</div>}</div></section><section className="panel"><p className="eyebrow">Структура продукту</p><h2>{product.productName}</h2><div className="structure"><div><span>Артикул продукції</span><strong>{product.sku}</strong></div><div><span>Поточний запас</span><strong>{product.quantityInStock} {product.unitOfMeasure}</strong></div><div><span>Специфікація</span><strong>{product.bomId}</strong></div><div><span>Компоненти</span><strong>{data.boms[0].materials.length}</strong></div></div></section></Shell>;
}
