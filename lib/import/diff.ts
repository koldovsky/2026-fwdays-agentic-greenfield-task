import type { RawRow, RowDiff, TableDiff } from './types.ts'

function cellString(v: RawRow[string] | undefined): string {
  if (v === undefined || v === null) return ''
  return String(v).trim()
}

/** Поля, значення яких відрізняються між двома рядками (об'єднання ключів). */
function differingFields(prev: RawRow, next: RawRow): string[] {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)])
  const changed: string[] = []
  for (const k of keys) {
    if (cellString(prev[k]) !== cellString(next[k])) changed.push(k)
  }
  return changed.sort()
}

/**
 * 3.1 — Diff між попереднім і новим імпортом таблиці (FR-IMP-10).
 * Рядки зіставляються за стабільним ключем `keyOf`; повертає кількості й перелік
 * доданих / видалених / змінених рядків (для змінених — які поля відрізняються).
 */
export function diffRows(
  prev: RawRow[],
  next: RawRow[],
  keyOf: (row: RawRow) => string,
): TableDiff {
  const prevByKey = new Map(prev.map((r) => [keyOf(r), r]))
  const nextByKey = new Map(next.map((r) => [keyOf(r), r]))

  const rows: RowDiff[] = []
  let added = 0
  let removed = 0
  let changed = 0

  for (const [key, nextRow] of nextByKey) {
    const prevRow = prevByKey.get(key)
    if (!prevRow) {
      added++
      rows.push({ key, change: 'added' })
      continue
    }
    const changedFields = differingFields(prevRow, nextRow)
    if (changedFields.length > 0) {
      changed++
      rows.push({ key, change: 'changed', changedFields })
    }
  }
  for (const key of prevByKey.keys()) {
    if (!nextByKey.has(key)) {
      removed++
      rows.push({ key, change: 'removed' })
    }
  }

  return { added, removed, changed, rows }
}
