import type { ValidationError } from '../../lib/import/index.ts'

interface Props {
  errors: ValidationError[]
}

/** 5.2 — Таблиця помилок валідації: рядок, поле, причина (FR-IMP-09). */
export function ValidationErrors({ errors }: Props) {
  if (errors.length === 0) {
    return <p className="ok">Помилок немає ✓</p>
  }
  return (
    <table className="grid grid--errors">
      <thead>
        <tr>
          <th>Рядок</th>
          <th>Поле</th>
          <th>Причина</th>
          <th>Рівень</th>
        </tr>
      </thead>
      <tbody>
        {errors.map((e, i) => (
          <tr key={`${e.row}-${e.field}-${i}`} className={`err err--${e.severity}`}>
            <td>{e.row}</td>
            <td>{e.field}</td>
            <td>{e.reason}</td>
            <td>{e.severity === 'error' ? 'помилка' : 'попередження'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
