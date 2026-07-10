import { Fragment, useMemo, useState } from 'react'
import {
  buildBomTree,
  buildOrderDashboard,
  type BomTreeNode,
  type OrderStatus,
} from '../../lib/dashboard/index.ts'
import { useSessionStore } from '../store/session-store.ts'
import './dashboard.css'

const STATUS_LABEL: Record<OrderStatus, string> = {
  'on-schedule': 'В графіку',
  'at-risk': 'Під загрозою',
  late: 'Запізнення',
  'blocked-material': 'Заблоковано матеріалом',
}

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`
}
function fmtDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

function flatten(nodes: BomTreeNode[]): BomTreeNode[] {
  const out: BomTreeNode[] = []
  const walk = (list: BomTreeNode[]) => {
    for (const n of list) {
      out.push(n)
      walk(n.children)
    }
  }
  walk(nodes)
  return out
}

/** Зведення по замовленнях (FR-ORD-01..05). */
export function OrderDashboard() {
  const plan = useSessionStore((s) => s.plan)
  const planInput = useSessionStore((s) => s.planInput)
  const [expanded, setExpanded] = useState<string | null>(null)

  const dashboard = useMemo(() => {
    if (!plan || !planInput) return null
    return buildOrderDashboard({
      orders: planInput.orders,
      orderResults: plan.orders,
      deficits: plan.deficits,
      calendar: planInput.calendar,
    })
  }, [plan, planInput])

  const tree = useMemo(() => {
    if (!plan || !expanded) return []
    return flatten(buildBomTree(plan.operations, expanded))
  }, [plan, expanded])

  if (!dashboard || !plan) return null
  const { rows, summary } = dashboard
  const colCount = 7

  return (
    <section className="od">
      <h2>Зведення по замовленнях</h2>
      <table className="od-table">
        <thead>
          <tr>
            <th>Замовлення</th>
            <th>Виріб</th>
            <th>К-сть</th>
            <th>Дата здачі</th>
            <th>Готовність</th>
            <th>Відхилення (роб. дн.)</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = expanded === row.orderId
            return (
              <Fragment key={row.orderId}>
                <tr
                  className={`od-row od-row--${row.status}${isOpen ? ' od-row--open' : ''}`}
                  onClick={() => setExpanded(isOpen ? null : row.orderId)}
                >
                  <td>
                    <span className="od-caret">{isOpen ? '▾' : '▸'}</span>
                    {row.orderId}
                  </td>
                  <td>{row.productId}</td>
                  <td>{row.qty}</td>
                  <td>{fmtDate(row.dueDate)}</td>
                  <td>{fmtDate(row.plannedReadyDate)}</td>
                  <td className={row.delayDays > 0 ? 'od-delay' : ''}>
                    {row.delayDays > 0 ? `+${row.delayDays}` : '0'}
                  </td>
                  <td>
                    <span className={`od-badge od-badge--${row.status}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="od-tree-row">
                    <td colSpan={colCount}>
                      {tree.length === 0 ? (
                        <span className="muted">Немає розпланованих операцій для дерева BOM.</span>
                      ) : (
                        <table className="od-tree">
                          <thead>
                            <tr>
                              <th>Вузол BOM</th>
                              <th>Старт</th>
                              <th>Фініш</th>
                              <th>Статус</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tree.map((node) => (
                              <tr key={node.bomNodeId}>
                                <td style={{ paddingLeft: `${8 + node.level * 18}px` }}>
                                  {node.nomenclatureId}
                                </td>
                                <td>{fmtDateTime(node.plannedStart)}</td>
                                <td>{fmtDateTime(node.plannedEnd)}</td>
                                <td>
                                  <span className={`od-badge od-badge--${node.status}`}>
                                    {STATUS_LABEL[node.status]}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="od-summary">
            <td colSpan={3}>Усього: {summary.total}</td>
            <td colSpan={4}>
              В графіку: {summary.onSchedule} · Під загрозою: {summary.atRisk} · Запізнення:{' '}
              {summary.late} · Заблоковано: {summary.blocked}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}
