// StatsPage — owns the single snapshot fetch and its loading/error/empty/loaded state,
// renders StatsView, and composes the slice-003 session log below it. It fetches the
// snapshot once on mount (slice 007 adds the live poll); on failure it shows the error
// state with a working retry. The session log needs the user's categories + sessions and
// an undo handler; those are fetched here and the undo notice (a Stats-owned component)
// auto-dismisses after 5s, committing the pending change via applyUndo.
import { useCallback, useEffect, useState } from 'react'

import {
  applyUndo,
  getStatsSnapshot,
  listCategories,
  listSessions,
  type Category,
  type SavedSession,
} from '../../api'
import SessionLog from '../Timer/SessionLog'
import type { SnapshotResponse } from './types'
import StatsView, { isEmptySnapshot, type StatsState } from './StatsView'
import UndoNotice from './UndoNotice'
import './stats.css'

type FetchState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; snapshot: SnapshotResponse }

interface PendingUndo {
  token: string
  message: string
}

export default function StatsPage() {
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'loading' })
  const [categories, setCategories] = useState<Category[]>([])
  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [undo, setUndo] = useState<PendingUndo | null>(null)

  const loadSnapshot = useCallback(async () => {
    setFetchState({ status: 'loading' })
    try {
      setFetchState({ status: 'ready', snapshot: await getStatsSnapshot() })
    } catch {
      setFetchState({ status: 'error' })
    }
  }, [])

  const reloadSessions = useCallback(async () => {
    try {
      setSessions(await listSessions())
    } catch {
      /* the log stays as-is on a transient read error */
    }
  }, [])

  useEffect(() => {
    void loadSnapshot()
    listCategories()
      .then(setCategories)
      .catch(() => undefined)
    void reloadSessions()
  }, [loadSnapshot, reloadSessions])

  // Auto-dismiss the undo notice after 5 s (the change then commits).
  useEffect(() => {
    if (!undo) return
    const id = window.setTimeout(() => setUndo(null), 5000)
    return () => window.clearTimeout(id)
  }, [undo])

  const offerUndo = useCallback((token: string, message: string) => {
    setUndo({ token, message })
  }, [])

  const onUndo = useCallback(async () => {
    if (!undo) return
    const current = undo
    setUndo(null)
    try {
      await applyUndo(current.token)
      await reloadSessions()
    } catch {
      /* the notice is already dismissed; leave the log as-is on failure */
    }
  }, [undo, reloadSessions])

  const onSessionsChanged = useCallback(() => {
    void reloadSessions()
  }, [reloadSessions])

  let viewState: StatsState
  if (fetchState.status === 'loading') {
    viewState = { status: 'loading' }
  } else if (fetchState.status === 'error') {
    viewState = { status: 'error', onRetry: () => void loadSnapshot() }
  } else if (isEmptySnapshot(fetchState.snapshot)) {
    viewState = { status: 'empty' }
  } else {
    viewState = { status: 'loaded', snapshot: fetchState.snapshot }
  }

  return (
    <main className="stats-screen">
      <StatsView state={viewState} />
      <SessionLog
        categories={categories}
        sessions={sessions}
        onChanged={onSessionsChanged}
        offerUndo={offerUndo}
      />
      {undo && <UndoNotice message={undo.message} onUndo={onUndo} />}
    </main>
  )
}
