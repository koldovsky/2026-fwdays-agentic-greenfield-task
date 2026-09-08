import { useState, type FormEvent } from 'react'

import { ApiError, login, register, type User } from '../api'

type Mode = 'login' | 'register'

const MIN_PASSWORD = 8

export default function AuthPage({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isRegister = mode === 'register'

  function switchMode() {
    setMode(isRegister ? 'login' : 'register')
    setError('')
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!email.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    if (isRegister && password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`)
      return
    }

    setSubmitting(true)
    try {
      if (isRegister) {
        await register(email, password)
      }
      // Register does not open a session; log in to establish the cookie + CSRF.
      const result = await login(email, password)
      onAuthenticated(result.user)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <div className="wordmark">
          <span className="thin">TRACK YOUR</span>
          <span className="bold">CADENCE</span>
        </div>

        <h1 className="auth-title">{isRegister ? 'Create your account' : 'Sign in'}</h1>
        <p className="auth-subtitle">
          {isRegister ? 'Start tracking your focus rhythm.' : 'Welcome back.'}
        </p>

        <p className="auth-error" role="alert">
          {error}
        </p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>

        <p className="auth-footer">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button type="button" className="link-btn" onClick={switchMode}>
            {isRegister ? 'Sign in' : 'Register'}
          </button>
        </p>
      </form>
    </main>
  )
}
