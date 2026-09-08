import { useState } from 'react'

import {
  addSession,
  deleteSession,
  editSession,
  type Category,
  type SavedSession,
} from '../../api'
import { formatDuration } from './format'
import { IconEdit, IconPlus, IconTrash } from './icons'
import SessionForm, { type SessionDraft } from './SessionForm'

function categoryOf(categories: Category[], id: number): Category | undefined {
  return categories.find((c) => c.id === id)
}

function SavedRow({
  session,
  categories,
  onChanged,
  offerUndo,
}: {
  session: SavedSession
  categories: Category[]
  onChanged: () => void
  offerUndo: (token: string, message: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const category = categoryOf(categories, session.category_id)

  async function onEdit(draft: SessionDraft) {
    const result = await editSession(session.id, {
      category_id: draft.categoryId,
      started_at: draft.startedIso,
      ended_at: draft.endedIso,
      notes: draft.notes,
      pauses: draft.pauses,
    })
    setEditing(false)
    offerUndo(result.undo_token, 'Session edited.')
    onChanged()
  }

  async function onDelete() {
    setBusy(true)
    try {
      const { undo_token } = await deleteSession(session.id)
      offerUndo(undo_token, 'Session deleted.')
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <li className="saved-row saved-row--editing">
        <SessionForm
          categories={categories}
          initial={{
            categoryId: session.category_id,
            startedIso: session.started_at,
            endedIso: session.ended_at,
            notes: session.notes,
            pauses: session.pauses,
          }}
          submitLabel="Save changes"
          onSave={onEdit}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li className="saved-row">
      <span
        className="saved-swatch"
        style={{ backgroundColor: category?.color ?? 'var(--border-strong)' }}
        aria-hidden="true"
      />
      <div className="saved-main">
        <div className="saved-top">
          <span className="saved-category">{category?.name ?? 'Unknown'}</span>
          <span className="saved-source">{session.source}</span>
        </div>
        <div className="saved-times">
          <span className="saved-net" title="Net (excludes pauses)">
            {formatDuration(session.net_seconds)}
          </span>
          <span className="saved-gross" title="Gross (wall clock)">
            gross {formatDuration(session.gross_seconds)}
          </span>
          {session.pauses.length > 0 && (
            <span className="saved-pauses">
              {session.pauses.length} pause{session.pauses.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {session.notes && <p className="saved-notes">{session.notes}</p>}
      </div>
      <div className="saved-actions">
        <button
          type="button"
          className="icon-btn"
          aria-label="Edit session"
          onClick={() => setEditing(true)}
        >
          <IconEdit />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Delete session"
          onClick={onDelete}
          disabled={busy}
        >
          <IconTrash />
        </button>
      </div>
    </li>
  )
}

export default function SessionLog({
  categories,
  sessions,
  onChanged,
  offerUndo,
}: {
  categories: Category[]
  sessions: SavedSession[]
  onChanged: () => void
  offerUndo: (token: string, message: string) => void
}) {
  const [adding, setAdding] = useState(false)

  async function onAdd(draft: SessionDraft) {
    await addSession({
      category_id: draft.categoryId,
      started_at: draft.startedIso,
      ended_at: draft.endedIso,
      notes: draft.notes,
      pauses: draft.pauses,
    })
    setAdding(false)
    onChanged()
  }

  return (
    <section className="session-log">
      <header className="log-header">
        <h2 className="section-title">Session log</h2>
        {!adding && categories.length > 0 && (
          <button type="button" className="btn-ghost btn-small" onClick={() => setAdding(true)}>
            <IconPlus />
            Add past session
          </button>
        )}
      </header>

      {adding && (
        <SessionForm
          categories={categories}
          submitLabel="Add session"
          onSave={onAdd}
          onCancel={() => setAdding(false)}
        />
      )}

      {sessions.length === 0 ? (
        <p className="log-empty">No saved sessions yet. Start a timer or add a past session.</p>
      ) : (
        <ul className="saved-list">
          {sessions.map((session) => (
            <SavedRow
              key={session.id}
              session={session}
              categories={categories}
              onChanged={onChanged}
              offerUndo={offerUndo}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
