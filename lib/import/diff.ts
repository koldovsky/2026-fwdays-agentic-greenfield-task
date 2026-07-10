import type { RawRow, RowDiff, TableDiff } from './types.ts'

/**
 * Normalizes a cell value to a trimmed string.
 *
 * @param v - The cell value to normalize
 * @returns An empty string for `undefined` or `null`; otherwise, the trimmed string representation of `v`
 */
function cellString(v: RawRow[string] | undefined): string {
  if (v === undefined || v === null) return ''
  return String(v).trim()
}

/**
 * Identifies fields with different values between two rows.
 *
 * Values are compared after conversion to trimmed strings, and the resulting field names are sorted lexicographically.
 *
 * @returns The sorted field names whose normalized values differ.
 */
function differingFields(prev: RawRow, next: RawRow): string[] {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)])
  const changed: string[] = []
  for (const k of keys) {
    if (cellString(prev[k]) !== cellString(next[k])) changed.push(k)
  }
  return changed.sort()
}

/**
 * Compares two table snapshots by stable row key and summarizes their differences.
 *
 * @param keyOf - Extracts the stable identifier used to match corresponding rows.
 * @returns Counts and details of added, removed, and changed rows.
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
