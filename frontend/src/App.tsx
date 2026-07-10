import { useEffect, useState } from 'react'

import { ApiError, getMe, logout, type User } from './api'
import AuthPage from './pages/AuthPage'
import CategoriesPage from './pages/Categories/CategoriesPage'
import TimerPage from './pages/Timer/TimerPage'

type Session = { status: 'loading' } | { status: 'anon' } | { status: 'authed'; user: User }

type Tab = 'timer' | 'categories'

export default function App() {
  const [session, setSession] = useState<Session>({ status: 'loading' })
  const [tab, setTab] = useState<Tab>('timer')

  useEffect(() => {
    getMe()
      .then((user) => setSession({ status: 'authed', user }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setSession({ status: 'anon' })
        } else {
          // Backend unreachable, etc. — treat as signed out so the form still shows.
          setSession({ status: 'anon' })
        }
      })
  }, [])

  if (session.status === 'loading') {
    return (
      <main className="placeholder">
        <span className="micro-label">Loading…</span>
      </main>
    )
  }

  if (session.status === 'anon') {
    return <AuthPage onAuthenticated={(user) => setSession({ status: 'authed', user })} />
  }

  async function onSignOut() {
    try {
      await logout()
    } finally {
      setSession({ status: 'anon' })
    }
  }

  // Minimal authenticated view: a slim top bar (identity + a two-item nav +
  // sign out) over the Timer screen (slice 003, the home) with Categories
  // (slice 002) still reachable. A full nav shell is a later slice, so this
  // stays deliberately minimal.
  const navBtn = (target: Tab, label: string) => (
    <button
      type="button"
      className="link-btn"
      onClick={() => setTab(target)}
      style={{
        color: tab === target ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: tab === target ? 600 : 400,
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 28px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <nav style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <span className="micro-label">{session.user.email}</span>
          {navBtn('timer', 'Timer')}
          {navBtn('categories', 'Categories')}
        </nav>
        <button className="link-btn" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </header>
      {tab === 'timer' ? <TimerPage /> : <CategoriesPage />}
    </div>
  )
}
