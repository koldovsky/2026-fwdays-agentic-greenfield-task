import type { TableDiff } from '../../lib/import/index.ts'

interface Props {
  diff: TableDiff | null
}

/** 5.4 — Показ diff відносно попереднього імпорту (FR-IMP-10). */
export function DiffView({ diff }: Props) {
  if (!diff) return null
  if (diff.added === 0 && diff.removed === 0 && diff.changed === 0) {
    return <p className="muted">Повторний імпорт: змін немає.</p>
  }
  return (
    <div className="diff">
      <div className="diff__summary">
        <span className="diff__badge diff__badge--added">+{diff.added} додано</span>
        <span className="diff__badge diff__badge--removed">−{diff.removed} видалено</span>
        <span className="diff__badge diff__badge--changed">~{diff.changed} змінено</span>
      </div>
      <ul className="diff__list">
        {diff.rows.map((r) => (
          <li key={`${r.change}-${r.key}`} className={`diff__row diff__row--${r.change}`}>
            <code>{r.key}</code> — {labelOf(r.change)}
            {r.changedFields && r.changedFields.length > 0 && (
              <span className="diff__fields"> ({r.changedFields.join(', ')})</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function labelOf(change: TableDiff['rows'][number]['change']): string {
  switch (change) {
    case 'added':
      return 'додано'
    case 'removed':
      return 'видалено'
    case 'changed':
      return 'змінено'
    default:
      return 'без змін'
  }
}
