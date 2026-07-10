import type { CellValue, ImportTable, RawRow } from '../../lib/import/index.ts'
import { useSessionStore } from '../store/session-store.ts'

interface Props {
  table: ImportTable
}

const MAX_VISIBLE = 200

function columnsOf(rows: RawRow[]): string[] {
  const cols: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        cols.push(key)
      }
    }
  }
  return cols
}

function cellToInput(v: CellValue | undefined): string {
  if (v === undefined || v === null) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v)
}

/** 5.3 — Редагована таблиця сирих рядків без повторного завантаження (FR-IMP-11). */
export function EditableTable({ table }: Props) {
  const rows = useSessionStore((s) => s.tables[table].rawRows)
  const updateRows = useSessionStore((s) => s.updateRows)

  if (rows.length === 0) {
    return <p className="muted">Немає даних. Завантажте файл у зону вище.</p>
  }

  const columns = columnsOf(rows)

  const setCell = (rowIdx: number, col: string, value: string) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r))
    updateRows(table, next)
  }
  const removeRow = (rowIdx: number) => {
    updateRows(table, rows.filter((_, i) => i !== rowIdx))
  }
  const addRow = () => {
    const blank: RawRow = {}
    for (const c of columns) blank[c] = ''
    updateRows(table, [...rows, blank])
  }

  const visible = rows.slice(0, MAX_VISIBLE)

  return (
    <div className="editable">
      <table className="grid">
        <thead>
          <tr>
            <th className="grid__rownum">#</th>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={i}>
              <td className="grid__rownum">{i + 1}</td>
              {columns.map((c) => (
                <td key={c}>
                  <input
                    className="grid__cell"
                    value={cellToInput(row[c])}
                    onChange={(e) => setCell(i, c, e.target.value)}
                  />
                </td>
              ))}
              <td>
                <button type="button" className="grid__del" onClick={() => removeRow(i)}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="editable__actions">
        <button type="button" onClick={addRow}>
          + Додати рядок
        </button>
        {rows.length > MAX_VISIBLE && (
          <span className="muted">
            Показано {MAX_VISIBLE} з {rows.length} рядків
          </span>
        )}
      </div>
    </div>
  )
}
