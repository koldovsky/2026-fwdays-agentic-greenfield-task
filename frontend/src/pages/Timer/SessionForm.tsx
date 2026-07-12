import { useState, type FormEvent } from 'react'

import { type Category, type Pause } from '../../api'
import CategorySelect from './CategorySelect'
import DateTimeField from './DateTimeField'
import { isoToLocal, localToIso } from './format'
import { IconClose, IconPlus, IconTrash } from './icons'

// A pause being edited, held as two datetime-local input values.
interface PauseDraft {
  paused_at: string
  resumed_at: string
}

export interface SessionDraft {
  categoryId: number
  startedIso: string
  endedIso: string
  notes: string | null
  pauses: Pause[]
}

function toDrafts(pauses: Pause[]): PauseDraft[] {
  return pauses.map((p) => ({ paused_at: isoToLocal(p.paused_at), resumed_at: isoToLocal(p.resumed_at) }))
}

/**
 * The manual add / edit form (FR-SESS-03/04). Collects a category, start, end,
 * notes and any number of discrete pauses (the add-pause control, A-6), converts
 * the local datetime inputs to ISO-8601 UTC, and hands a validated draft up.
 */
export default function SessionForm({
  categories,
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  categories: Category[]
  initial?: {
    categoryId: number
    startedIso: string
    endedIso: string
    notes: string | null
    pauses: Pause[]
  }
  submitLabel: string
  onSave: (draft: SessionDraft) => Promise<void>
  onCancel?: () => void
}) {
  const [categoryId, setCategoryId] = useState<number>(
    initial?.categoryId ?? categories[0]?.id ?? 0,
  )
  const [start, setStart] = useState(initial ? isoToLocal(initial.startedIso) : '')
  const [end, setEnd] = useState(initial ? isoToLocal(initial.endedIso) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [pauses, setPauses] = useState<PauseDraft[]>(initial ? toDrafts(initial.pauses) : [])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function addPause() {
    setPauses((prev) => [...prev, { paused_at: '', resumed_at: '' }])
  }

  function removePause(index: number) {
    setPauses((prev) => prev.filter((_, i) => i !== index))
  }

  function setPauseField(index: number, field: keyof PauseDraft, value: string) {
    setPauses((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const startedIso = localToIso(start)
    const endedIso = localToIso(end)
    if (!categoryId) {
      setError('Pick a category.')
      return
    }
    if (!startedIso || !endedIso) {
      setError('Start and end are required.')
      return
    }
    if (Date.parse(endedIso) <= Date.parse(startedIso)) {
      setError('End must be after start.')
      return
    }
    const converted: Pause[] = []
    for (const draft of pauses) {
      const pausedIso = localToIso(draft.paused_at)
      const resumedIso = localToIso(draft.resumed_at)
      if (!pausedIso || !resumedIso) {
        setError('Every pause needs a start and an end.')
        return
      }
      converted.push({ paused_at: pausedIso, resumed_at: resumedIso })
    }
    setBusy(true)
    setError('')
    try {
      await onSave({
        categoryId,
        startedIso,
        endedIso,
        notes: notes.trim() ? notes.trim() : null,
        pauses: converted,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the session.')
      setBusy(false)
    }
  }

  return (
    <form className="session-form" onSubmit={onSubmit}>
      <div className="session-form-grid">
        <div className="field-block">
          <span className="field-label">Category</span>
          <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
        </div>
        <div className="field-block">
          <span className="field-label">Start</span>
          <DateTimeField value={start} onChange={setStart} ariaLabel="Start" />
        </div>
        <div className="field-block">
          <span className="field-label">End</span>
          <DateTimeField value={end} onChange={setEnd} ariaLabel="End" />
        </div>
      </div>

      <label className="field-label">
        Notes
        <input
          className="cat-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          placeholder="Optional"
        />
      </label>

      <div className="pause-editor">
        <div className="pause-editor-head">
          <span className="micro-label">Pauses</span>
          <button type="button" className="btn-ghost btn-small" onClick={addPause}>
            <IconPlus />
            Add pause
          </button>
        </div>
        {pauses.length === 0 && <p className="pause-empty">No pauses.</p>}
        {pauses.map((pause, index) => (
          <div className="pause-row" key={index}>
            <DateTimeField
              value={pause.paused_at}
              onChange={(v) => setPauseField(index, 'paused_at', v)}
              ariaLabel={`Pause ${index + 1} start`}
            />
            <span className="pause-dash">to</span>
            <DateTimeField
              value={pause.resumed_at}
              onChange={(v) => setPauseField(index, 'resumed_at', v)}
              ariaLabel={`Pause ${index + 1} end`}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove pause ${index + 1}`}
              onClick={() => removePause(index)}
            >
              <IconTrash />
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="cat-error" role="alert">
          {error}
        </p>
      )}

      <div className="cat-actions-row">
        <button type="submit" className="btn-accent" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
            <IconClose />
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
