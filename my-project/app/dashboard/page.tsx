import Link from "next/link";
import { Shell } from "@/components/shell";
import { dashboardMetrics, stockAlert, stockAlertClass } from "@/lib/dashboard";
import { formatMoney } from "@/lib/format";
import { readDatabase } from "@/lib/repository";

export default async function Dashboard() {
  const data = await readDatabase();
  const metrics = dashboardMetrics(data);
  return <Shell eyebrow="Операційний пульс" title="Доброго дня, командо">
    <section className="metrics">
      <article><span>Сировина</span><strong>{formatMoney(metrics.rawValue)}</strong><small>Поточна вартість на складі</small></article>
      <article><span>Готова продукція</span><strong>{formatMoney(metrics.finishedValue)}</strong><small>Запаси, готові до продажу</small></article>
      <article><span>Незавершені замовлення</span><strong>{formatMoney(metrics.pendingOrdersValue)}</strong><small>Вартість відкритих закупівель</small></article>
    </section>
    <section className="split">
      <div className="panel"><div className="panel-head"><div><p className="eyebrow">Потребує уваги</p><h2>Контроль поповнення запасів</h2></div><Link href="/inventory">Переглянути запаси →</Link></div>
        <div className="table-wrap"><table><thead><tr><th>Матеріал</th><th>У наявності</th><th>Поріг</th><th>Стан</th></tr></thead><tbody>{metrics.warnings.map((item) => { const status = stockAlert(item.quantityInStock, item.reorderLevel); return <tr key={"materialId" in item ? item.materialId : item.productId}><td><strong>{"materialName" in item ? item.materialName : item.productName}</strong><small>{item.sku}</small></td><td>{item.quantityInStock} {item.unitOfMeasure}</td><td>{item.reorderLevel} {item.unitOfMeasure}</td><td><span className={`badge ${stockAlertClass(status)}`}>{status}</span></td></tr>; })}</tbody></table></div>
      </div>
      <div className="panel quick"><p className="eyebrow">Швидкі дії</p><h2>Підтримуйте робочий ритм</h2><Link href="/procurement">Створити замовлення на закупівлю <span>→</span></Link><Link href="/manufacturing">Запланувати виробництво <span>→</span></Link><Link href="/inventory">Переглянути обмежені запаси <span>→</span></Link></div>
    </section>
  </Shell>;
}
