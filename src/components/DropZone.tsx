import { useRef, useState } from 'react'
import type { ImportTable } from '../../lib/import/index.ts'
import { useSessionStore } from '../store/session-store.ts'
import { readSheet } from '../import/sheet.ts'

interface Props {
  table: ImportTable
  label: string
  selected: boolean
  onSelect: () => void
}

/** 5.1 — Зона завантаження однієї таблиці: drag-and-drop або кнопка (FR-IMP-01). */
export function DropZone({ table, label, selected, onSelect }: Props) {
  const state = useSessionStore((s) => s.tables[table])
  const importRows = useSessionStore((s) => s.importRows)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const rows = await readSheet(file)
      importRows(table, rows, file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка читання файлу')
    } finally {
      setBusy(false)
    }
  }

  const errorCount = state.parsed.errors.filter((e) => e.severity === 'error').length
  const rowCount = state.rawRows.length

  return (
    <div
      className={`dropzone${dragOver ? ' dropzone--over' : ''}${selected ? ' dropzone--selected' : ''}`}
      onClick={onSelect}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) void handleFile(file)
      }}
    >
      <div className="dropzone__label">{label}</div>
      <div className="dropzone__status">
        {busy
          ? 'Читання…'
          : rowCount > 0
            ? `${rowCount} рядк. · ${errorCount === 0 ? 'без помилок' : `${errorCount} помилк.`}`
            : 'Перетягніть файл або оберіть'}
      </div>
      {state.fileName && <div className="dropzone__file">{state.fileName}</div>}
      {error && <div className="dropzone__error">{error}</div>}
      <button
        type="button"
        className="dropzone__btn"
        onClick={(e) => {
          e.stopPropagation()
          inputRef.current?.click()
        }}
      >
        Обрати файл
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      {errorCount > 0 && <span className="dropzone__badge" aria-label="є помилки" />}
    </div>
  )
}
