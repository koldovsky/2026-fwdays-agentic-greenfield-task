import { useEffect, useState } from 'react'

import { ApiError, getMe, logout, type User } from './api'
import AuthPage from './pages/AuthPage'
import CategoriesPage from './pages/Categories/CategoriesPage'

type Session = { status: 'loading' } | { status: 'anon' } | { status: 'authed'; user: User }

export default function App() {
  const [session, setSession] = useState<Session>({ status: 'loading' })

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

  // Minimal authenticated view: a slim top bar (identity + sign out) over the
  // Categories screen (slice 002). A full nav shell (Timer / Stats / Categories)
  // is a later slice, so this stays deliberately minimal.
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
        <span className="micro-label">{session.user.email}</span>
        <button className="link-btn" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </header>
      <CategoriesPage />
    </div>
  )
}
