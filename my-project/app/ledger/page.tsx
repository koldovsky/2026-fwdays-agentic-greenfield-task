import { Shell } from "@/components/shell";
import { movementLedger } from "@/lib/ledger";
import { readDatabase } from "@/lib/repository";

export default async function Ledger() {
  const data = await readDatabase();
  const rows = movementLedger(data);
  return <Shell eyebrow="Незмінна історія" title="Журнал рухів"><section className="panel"><div className="panel-head"><div><p className="eyebrow">Аудиторський слід</p><h2>Записано рухів: {rows.length}</h2></div><span className="badge neutral">Лише читання</span></div><div className="table-wrap"><table><thead><tr><th>Дата й час</th><th>Позиція</th><th>Рух</th><th>Причина</th><th>Документ</th><th>Виконавець</th></tr></thead><tbody>{rows.map((movement) => <tr key={movement.movementId}><td>{new Date(movement.timestamp).toLocaleString("uk-UA")}</td><td><strong>{movement.itemName}</strong><small>{movement.itemTypeLabel}</small></td><td><span className={`quantity ${movement.direction.toLowerCase()}`}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</span></td><td>{movement.reason}</td><td><code>{movement.associatedDocId}</code></td><td>{movement.actorName}</td></tr>)}</tbody></table></div></section></Shell>;
}
