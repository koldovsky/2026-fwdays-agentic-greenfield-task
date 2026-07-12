import { useEffect, useRef, useState, type FormEvent } from 'react'

import {
  ApiError,
  applyUndo,
  continueTimer,
  discardTimer,
  getActiveTimer,
  listCategories,
  pauseTimer,
  startTimer,
  stopTimer,
  type ActiveTimer,
  type Category,
} from '../../api'
import { elapsedSeconds, formatDuration } from './format'
import { IconClose, IconPause, IconPlay, IconStop, IconUndo } from './icons'
import { resolveShortcut, type TimerAction, type TimerState } from './resolveShortcut'
import CategorySelect from './CategorySelect'
import Heatmap from './Heatmap'
import './timer.css'

interface UndoState {
  token: string
  message: string
  restore: () => void
}

export default function TimerPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [active, setActive] = useState<ActiveTimer | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState<number>(Date.now())
  const [showSave, setShowSave] = useState(false)
  const [saveNotes, setSaveNotes] = useState('')
  const [saveCategoryId, setSaveCategoryId] = useState<number>(0)
  const [showDiscard, setShowDiscard] = useState(false)
  const [undo, setUndo] = useState<UndoState | null>(null)
  const [error, setError] = useState('')

  const state: TimerState = active ? active.state : 'idle'

  useEffect(() => {
    let alive = true
    listCategories()
      .then((rows) => {
        if (!alive) return
        setCategories(rows)
        setSelectedCategoryId(rows[0]?.id ?? null)
      })
      .catch(() => {
        if (alive) setError('Could not load categories.')
      })
    // Resume a timer that is still running server-side (survives reload / tab switch).
    getActiveTimer()
      .then((t) => {
        if (alive && t) setActive(t)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  // Tick the local display only while running; paused/idle freezes it. Sync nowMs
  // immediately on entering the running state (start / resume / reload-resume) so
  // the first frame never uses a clock frozen during the previous pause.
  useEffect(() => {
    if (!active || active.state !== 'running') return
    setNowMs(Date.now())
    const id = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [active])

  // Auto-dismiss the undo notification after 5 s (the action then commits).
  useEffect(() => {
    if (!undo) return
    const id = window.setTimeout(() => setUndo(null), 5000)
    return () => window.clearTimeout(id)
  }, [undo])

  function offerUndo(token: string, message: string, restore?: () => void) {
    setUndo({ token, message, restore: restore ?? (() => undefined) })
  }

  async function onStart() {
    if (selectedCategoryId == null) {
      setError('Pick a category first.')
      return
    }
    setError('')
    try {
      const started = await startTimer(selectedCategoryId)
      setNowMs(Date.now())
      setActive(started)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the timer.')
    }
  }

  async function onPause() {
    if (!active) return
    setError('')
    try {
      setActive(await pauseTimer(active.version))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not pause.')
    }
  }

  async function onContinue() {
    if (!active) return
    setError('')
    try {
      const resumed = await continueTimer(active.version)
      // Refresh the clock in the same commit as the resume, so the display never
      // renders with a nowMs frozen during the pause — otherwise elapsed briefly
      // reads (old elapsed − pause length), i.e. it jumps backwards for one tick.
      setNowMs(Date.now())
      setActive(resumed)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not continue.')
    }
  }

  function onStopRequest() {
    if (!active) return
    setSaveCategoryId(active.category_id)
    setSaveNotes('')
    setShowSave(true)
  }

  async function onStopConfirm(event: FormEvent) {
    event.preventDefault()
    if (!active) return
    setError('')
    try {
      await stopTimer(active.version, saveCategoryId, saveNotes.trim() ? saveNotes.trim() : null)
      setActive(null)
      setShowSave(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the session.')
    }
  }

  function onDiscardRequest() {
    if (!active) return
    setShowDiscard(true)
  }

  async function onDiscardConfirm() {
    if (!active) return
    const snapshot = active
    setError('')
    try {
      const { undo_token } = await discardTimer(active.version)
      setActive(null)
      setShowDiscard(false)
      offerUndo(undo_token, 'Timer discarded.', () => setActive(snapshot))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not discard.')
      setShowDiscard(false)
    }
  }

  async function onUndoClick() {
    if (!undo) return
    const current = undo
    setUndo(null)
    try {
      await applyUndo(current.token)
      current.restore()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Undo failed.')
    }
  }

  // Keep the latest dispatch reachable from the once-mounted keydown listener.
  const dispatchRef = useRef<(action: TimerAction) => void>(() => undefined)
  dispatchRef.current = (action: TimerAction) => {
    if (showSave || showDiscard) return
    if (action === 'start') void onStart()
    else if (action === 'pause') void onPause()
    else if (action === 'continue') void onContinue()
    else if (action === 'stop') onStopRequest()
    else if (action === 'discard') onDiscardRequest()
  }
  const stateRef = useRef<TimerState>(state)
  stateRef.current = state

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return
      }
      const action = resolveShortcut(event.key, stateRef.current)
      if (!action) return
      event.preventDefault()
      dispatchRef.current(action)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const activeCategory = active ? categories.find((c) => c.id === active.category_id) : undefined
  const display = active ? formatDuration(elapsedSeconds(active, nowMs)) : '00:00:00'
  const clock = display.split(':')

  return (
    <div className="view">
      <section className="card timer-card">
        <div className="cat-pill-wrap">
          <div className="micro-label">Category</div>
          {state === 'idle' ? (
            categories.length === 0 ? (
              <p className="hint">Create a category first to start tracking.</p>
            ) : (
              <CategorySelect
                categories={categories}
                value={selectedCategoryId}
                onChange={setSelectedCategoryId}
                onCreated={(c) => setCategories((prev) => [...prev, c])}
              />
            )
          ) : (
            <div className="cat-pill">
              <span
                className="cat-dot"
                style={{
                  background: activeCategory?.color ?? 'var(--accent)',
                  color: activeCategory?.color ?? 'var(--accent)',
                }}
                aria-hidden="true"
              />
              <span className="cat-pill-name">{activeCategory?.name ?? 'Session'}</span>
            </div>
          )}
        </div>

        <div className={`timer-display${state === 'running' ? ' running' : ''}`}>
          {clock[0]}
          <span className="colon">:</span>
          {clock[1]}
          <span className="colon">:</span>
          {clock[2]}
        </div>

        <div className="timer-controls">
          {state === 'idle' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onStart}
              disabled={categories.length === 0}
            >
              <IconPlay />
              Start
            </button>
          )}
          {state === 'running' && (
            <>
              <button type="button" className="btn btn-ghost" onClick={onPause}>
                <IconPause />
                Pause
              </button>
              <button type="button" className="btn btn-primary" onClick={onStopRequest}>
                <IconStop />
                Stop
              </button>
            </>
          )}
          {state === 'paused' && (
            <>
              <button type="button" className="btn btn-primary" onClick={onContinue}>
                <IconPlay />
                Continue
              </button>
              <button type="button" className="btn btn-ghost" onClick={onStopRequest}>
                <IconStop />
                Stop
              </button>
            </>
          )}
          {state !== 'idle' && (
            <button type="button" className="btn btn-text" onClick={onDiscardRequest}>
              Discard
            </button>
          )}
        </div>

        <p className="hint">
          <kbd>Space</kbd> start / pause
          <span className="dot-sep">·</span>
          <kbd>S</kbd> save
          <span className="dot-sep">·</span>
          <kbd>Esc</kbd> discard
        </p>

        {error && (
          <p className="cat-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <Heatmap />

      {showSave && active && (
        <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="Save session">
          <form className="modal-card" onSubmit={onStopConfirm}>
            <div className="modal-head">
              <h2 className="section-title">Save session</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Cancel"
                onClick={() => setShowSave(false)}
              >
                <IconClose />
              </button>
            </div>
            <div className="modal-readout">{display}</div>
            <label className="field-label" htmlFor="save-category">
              Category
            </label>
            <select
              id="save-category"
              className="cat-input"
              value={saveCategoryId}
              onChange={(e) => setSaveCategoryId(Number(e.target.value))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="field-label" htmlFor="save-notes">
              Notes
            </label>
            <input
              id="save-notes"
              className="cat-input"
              value={saveNotes}
              onChange={(e) => setSaveNotes(e.target.value)}
              maxLength={2000}
              placeholder="Optional"
            />
            <div className="cat-actions-row">
              <button type="submit" className="btn-accent">
                Save
              </button>
              <button type="button" className="btn-ghost" onClick={() => setShowSave(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showDiscard && (
        <div className="modal-scrim" role="alertdialog" aria-modal="true" aria-label="Discard session">
          <div className="modal-card modal-card--confirm">
            <h2 className="section-title">Discard this session?</h2>
            <p className="modal-text">It will not be saved. You can undo for a few seconds.</p>
            <div className="cat-actions-row">
              <button type="button" className="btn-danger" onClick={onDiscardConfirm}>
                Discard
              </button>
              <button type="button" className="btn-ghost" onClick={() => setShowDiscard(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {undo && (
        <div className="undo-toast" role="status">
          <span className="undo-message">{undo.message}</span>
          <button type="button" className="undo-btn" onClick={onUndoClick}>
            <IconUndo />
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
