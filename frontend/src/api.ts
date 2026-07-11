// The single HTTP boundary for the app (TC-STACK-03). Every request is credentialed
// so the session cookie flows; every mutating request carries the CSRF double-submit
// header read from the JS-readable CSRF cookie (architecture §8.2).

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// Must match backend Settings.csrf_cookie_name / csrf_header_name (app/config.py).
const CSRF_COOKIE = 'cadence_csrf'
const CSRF_HEADER = 'X-CSRF-Token'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface User {
  id: number
  email: string
  timezone: string
  coach_language: string
}

export interface LoginResponse {
  user: User
  csrf_token: string
}

function readCookie(name: string): string | null {
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=')
    if (eq > -1 && part.slice(0, eq) === name) {
      return decodeURIComponent(part.slice(eq + 1))
    }
  }
  return null
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers: Record<string, string> = {}

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (!SAFE_METHODS.has(method)) {
    const csrf = readCookie(CSRF_COOKIE)
    if (csrf) headers[CSRF_HEADER] = csrf
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 204) {
    return undefined as T
  }

  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(data, res.status))
  }
  return data as T
}

function errorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
  }
  return `Request failed (${status})`
}

export const register = (email: string, password: string): Promise<User> =>
  apiFetch<User>('/api/auth/register', { method: 'POST', body: { email, password } })

export const login = (email: string, password: string): Promise<LoginResponse> =>
  apiFetch<LoginResponse>('/api/auth/login', { method: 'POST', body: { email, password } })

export const logout = (): Promise<void> => apiFetch<void>('/api/auth/logout', { method: 'POST' })

export const getMe = (): Promise<User> => apiFetch<User>('/api/auth/me')

// --- Categories (slice 002) -------------------------------------------------
// CRUD over the per-user categories capability. All requests ride apiFetch, so
// credentials flow and mutations carry the CSRF double-submit header. Delete is
// server-side archive (FR-CAT-03); the list returns only active categories.

export interface Category {
  id: number
  name: string
  color: string
  description: string | null
}

export interface CategoryInput {
  name: string
  color: string
  description?: string | null
}

export const listCategories = (): Promise<Category[]> => apiFetch<Category[]>('/api/categories')

export const createCategory = (input: CategoryInput): Promise<Category> =>
  apiFetch<Category>('/api/categories', { method: 'POST', body: input })

export const updateCategory = (
  id: number,
  changes: Partial<CategoryInput>,
): Promise<Category> =>
  apiFetch<Category>(`/api/categories/${id}`, { method: 'PATCH', body: changes })

export const deleteCategory = (id: number): Promise<void> =>
  apiFetch<void>(`/api/categories/${id}`, { method: 'DELETE' })

// --- Timer, sessions & undo (slice 003) -------------------------------------
// The core loop over the timer, saved sessions and the undo notification. All
// requests ride apiFetch, so credentials flow and mutations carry the CSRF
// header. gross/net come derived from the server (never stored); timestamps are
// ISO-8601 UTC strings.

export interface Pause {
  paused_at: string
  resumed_at: string
}

export interface ActiveTimer {
  id: number
  category_id: number
  started_at: string
  state: 'running' | 'paused'
  pause_started_at: string | null
  accumulated_pauses: Pause[]
  version: number
}

export interface SavedSession {
  id: number
  category_id: number
  started_at: string
  ended_at: string
  notes: string | null
  source: 'timer' | 'manual'
  gross_seconds: number
  net_seconds: number
  pauses: Pause[]
}

export interface UndoToken {
  undo_token: string
}

export type SessionWithUndo = SavedSession & UndoToken

export interface ManualSessionInput {
  category_id: number
  started_at: string
  ended_at: string
  notes?: string | null
  pauses: Pause[]
}

export interface SessionEdit {
  category_id?: number
  started_at?: string
  ended_at?: string
  notes?: string | null
  pauses?: Pause[]
}

export const startTimer = (categoryId: number): Promise<ActiveTimer> =>
  apiFetch<ActiveTimer>('/api/timer/start', { method: 'POST', body: { category_id: categoryId } })

export const pauseTimer = (version: number): Promise<ActiveTimer> =>
  apiFetch<ActiveTimer>('/api/timer/pause', { method: 'POST', body: { version } })

export const continueTimer = (version: number): Promise<ActiveTimer> =>
  apiFetch<ActiveTimer>('/api/timer/continue', { method: 'POST', body: { version } })

export const stopTimer = (
  version: number,
  categoryId: number,
  notes: string | null,
): Promise<SavedSession> =>
  apiFetch<SavedSession>('/api/timer/stop', {
    method: 'POST',
    body: { version, category_id: categoryId, notes },
  })

export const discardTimer = (version: number): Promise<UndoToken> =>
  apiFetch<UndoToken>('/api/timer/discard', { method: 'POST', body: { version } })

export const listSessions = (): Promise<SavedSession[]> =>
  apiFetch<SavedSession[]>('/api/sessions')

export const addSession = (input: ManualSessionInput): Promise<SavedSession> =>
  apiFetch<SavedSession>('/api/sessions', { method: 'POST', body: input })

export const editSession = (id: number, changes: SessionEdit): Promise<SessionWithUndo> =>
  apiFetch<SessionWithUndo>(`/api/sessions/${id}`, { method: 'PATCH', body: changes })

export const deleteSession = (id: number): Promise<UndoToken> =>
  apiFetch<UndoToken>(`/api/sessions/${id}`, { method: 'DELETE' })

export const applyUndo = (token: string): Promise<void> =>
  apiFetch<void>(`/api/undo/${token}`, { method: 'POST' })

// --- Stats snapshot (slice 005) ---------------------------------------------
// Read-only fetch of the shipped slice-004 GET /api/stats/snapshot payload. The Stats
// page renders this; no metric is recomputed client-side. Rides apiFetch, so credentials
// flow. (The 5-second live poll that keeps it fresh across devices is slice 007.)
import type { SnapshotResponse } from './pages/Stats/types'

export const getStatsSnapshot = (): Promise<SnapshotResponse> =>
  apiFetch<SnapshotResponse>('/api/stats/snapshot')
