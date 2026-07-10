import { useEffect, useState } from 'react'

import { ApiError, getMe, logout, type User } from './api'
import AuthPage from './pages/AuthPage'

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

  // Minimal authenticated placeholder — confirms the session is live. The real
  // app shell (Timer / Stats / Categories) is a later slice.
  return (
    <main className="placeholder">
      <div>
        <span className="micro-label">Signed in as</span>
        <p className="email">{session.user.email}</p>
        <button className="btn-primary" type="button" onClick={onSignOut} style={{ maxWidth: 200 }}>
          Sign out
        </button>
      </div>
    </main>
  )
}
