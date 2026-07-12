import { useEffect, useState } from 'react'

import { getMe, getStatsSnapshot, logout, type User } from './api'
import AuthPage from './pages/AuthPage'
import CategoriesPage from './pages/Categories/CategoriesPage'
import CoachDrawer from './pages/Coach/CoachDrawer'
import StatsPage from './pages/Stats/StatsPage'
import TimerPage from './pages/Timer/TimerPage'

type Session = { status: 'loading' } | { status: 'anon' } | { status: 'authed'; user: User }
type Tab = 'timer' | 'stats' | 'categories'

export default function App() {
  const [session, setSession] = useState<Session>({ status: 'loading' })
  const [tab, setTab] = useState<Tab>('timer')
  const [streak, setStreak] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    getMe()
      .then((user) => setSession({ status: 'authed', user }))
      .catch(() => setSession({ status: 'anon' }))
  }, [])

  // Streak for the header badge — best-effort; empty history resolves to 0.
  useEffect(() => {
    if (session.status !== 'authed') return
    getStatsSnapshot()
      .then((s) => setStreak(s.streaks.current))
      .catch(() => setStreak(null))
  }, [session.status])

  // Close the user menu on any outside click.
  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  if (session.status === 'loading') {
    return (
      <main className="app-loading">
        <span className="micro-label">Loading…</span>
      </main>
    )
  }

  if (session.status === 'anon') {
    return <AuthPage onAuthenticated={(user) => setSession({ status: 'authed', user })} />
  }

  const user = session.user
  const monogram = (user.email.trim()[0] ?? '?').toUpperCase()

  async function onSignOut() {
    try {
      await logout()
    } finally {
      setSession({ status: 'anon' })
    }
  }

  const navLink = (target: Tab, label: string) => (
    <a
      href={`#${target}`}
      className={`nav-link${tab === target ? ' active' : ''}`}
      onClick={(e) => {
        e.preventDefault()
        setTab(target)
      }}
    >
      {label}
    </a>
  )

  return (
    <>
      <header className="header">
        <div className="header-left">
          <a
            className="wordmark"
            href="#timer"
            aria-label="Cadence"
            onClick={(e) => {
              e.preventDefault()
              setTab('timer')
            }}
          >
            <span className="line-2">cadence</span>
          </a>
          <nav className="nav">
            {navLink('timer', 'Timer')}
            {navLink('stats', 'Stats')}
            {navLink('categories', 'Categories')}
          </nav>
        </div>

        <div className="header-right">
          <span className="streak-badge" title="Current streak">
            <span className="streak-dot" />
            <span className="streak-label">{streak ?? 0}d streak</span>
          </span>

          <div className="user-menu-wrap">
            <button
              className="user-trigger"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((o) => !o)
              }}
            >
              <span className="user-monogram">{monogram}</span>
              <span className="user-name">{user.email}</span>
              <svg className="chev" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className={`dropdown user-dropdown${menuOpen ? '' : ' hidden'}`}>
              <button className="dd-option" type="button" onClick={onSignOut}>
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {tab === 'timer' ? <TimerPage /> : tab === 'stats' ? <StatsPage /> : <CategoriesPage />}
      </main>

      <CoachDrawer />
    </>
  )
}
