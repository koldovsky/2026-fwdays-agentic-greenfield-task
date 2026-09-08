import { useEffect, useRef, useState } from 'react'

import { getCoachInsight, getStatsSnapshot, sendCoachChat, type CoachCard } from '../../api'
import type { SnapshotResponse } from '../Stats/types'
import './coach.css'

// --- Inline SVG icons (stroke 1.6, currentColor; NFR-DES-01: never emoji) ----

function IconCoach() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 8l.85 1.9 1.9.85-1.9.85L12 13.5l-.85-1.9-1.9-.85 1.9-.85z" fill="currentColor" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12l16-8-6 16-3-6-7-2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Round the long raw decimals the model sometimes emits ("0.59763…" -> "0.6"). Display only:
 *  the raw value already passed grounding, this just spares the reader the tail. */
function polish(text: string): string {
  return text.replace(/\d+\.\d{3,}/g, (m) => String(Math.round(parseFloat(m) * 100) / 100))
}

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** A compact per-day activity strip (Whoop-style: the coach reads your week, and you see it). */
function MiniActivity({ perDay }: { perDay: { date: string; min: number }[] }) {
  if (!perDay.length) return null
  const max = Math.max(1, ...perDay.map((d) => d.min))
  return (
    <div className="coach-mini">
      {perDay.map((d) => {
        const h = d.min > 0 ? Math.max(4, Math.round((d.min / max) * 34)) : 2
        const cls =
          'coach-mini-bar' +
          (d.min === max ? ' coach-mini-bar--peak' : '') +
          (d.min === 0 ? ' coach-mini-bar--zero' : '')
        return (
          <div key={d.date} className="coach-mini-col" title={`${d.min} min`}>
            <div className="coach-mini-track">
              <div className={cls} style={{ height: `${h}px` }} />
            </div>
            <span className="coach-mini-day">{WEEKDAY[new Date(d.date + 'T00:00:00').getDay()]}</span>
          </div>
        )
      })}
    </div>
  )
}

/** A coach card rendered as a chat message — flowing prose, no technical chips: observations are
 *  plain lines, recommendations carry a small lime arrow. */
function Card({ card }: { card: CoachCard }) {
  const empty = card.observations.length === 0 && card.recommendations.length === 0
  if (empty) return <p className="coach-quiet">Nothing notable to flag right now.</p>
  return (
    <div className={`coach-card${card.fallback ? ' coach-card--fallback' : ''}`}>
      {card.observations.map((o, i) => (
        <p key={`o${i}`} className="coach-say">
          {polish(o.text)}
        </p>
      ))}
      {card.recommendations.map((r, i) => (
        <p key={`r${i}`} className="coach-say coach-say--rec">
          <svg
            className="coach-rec-arrow"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 12h13M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {polish(r.text)}
        </p>
      ))}
    </div>
  )
}

// Chat resilience: a single turn retries transient failures — an HTTP 4xx/5xx AND a degraded
// `fallback` card (the coach returns 200 + fallback when a model errors) — up to MAX_CHAT_ATTEMPTS
// with a short backoff so a rate-limit window can ease; if all fail, show the "on vacation" card.
const MAX_CHAT_ATTEMPTS = 10

const VACATION_CARD: CoachCard = {
  language: 'en',
  quiet: true,
  fallback: true,
  observations: [
    {
      text: "The coach is on vacation right now and can't answer. Please try again in a little while.",
      metric_refs: [],
    },
  ],
  recommendations: [],
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export default function CoachDrawer() {
  const [open, setOpen] = useState(false)
  const [insight, setInsight] = useState<CoachCard | null>(null)
  const [insightState, setInsightState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null)
  const [turns, setTurns] = useState<{ user: string; reply: CoachCard | null }[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch the week's insight + activity strip the first time the drawer opens.
  useEffect(() => {
    if (!open || insight || insightState !== 'idle') return
    setInsightState('loading')
    getCoachInsight()
      .then((c) => {
        setInsight(c)
        setInsightState('idle')
      })
      .catch(() => setInsightState('error'))
    getStatsSnapshot()
      .then(setSnapshot)
      .catch(() => undefined)
  }, [open, insight, insightState])

  // Esc closes the drawer (DESIGN 11).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Keep the newest turn in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, sending])

  async function send() {
    const msg = input.trim()
    if (!msg || sending) return
    setInput('')
    setTurns((t) => [...t, { user: msg, reply: null }])
    setSending(true)
    let reply: CoachCard = VACATION_CARD
    for (let attempt = 1; attempt <= MAX_CHAT_ATTEMPTS; attempt++) {
      try {
        const card = await sendCoachChat(msg)
        if (!card.fallback) {
          reply = card // a real, grounded answer — stop retrying
          break
        }
      } catch {
        // HTTP 4xx / 5xx — fall through to the backoff and retry
      }
      if (attempt < MAX_CHAT_ATTEMPTS) await sleep(800)
    }
    setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, reply } : x)))
    setSending(false)
  }

  return (
    <>
      <button
        className={`coach-fab${open ? ' coach-fab--open' : ''}`}
        type="button"
        aria-label="Open coach"
        onClick={() => setOpen((o) => !o)}
      >
        <IconCoach />
      </button>

      {open && (
        <>
          <div className="coach-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="side-panel coach-drawer" role="dialog" aria-modal="true" aria-label="Coach">
            <div className="side-panel-header coach-header">
              <div className="coach-title">
                <span className="coach-title-dot" aria-hidden="true" />
                Coach
              </div>
              <button className="icon-btn" type="button" aria-label="Close" onClick={() => setOpen(false)}>
                <IconClose />
              </button>
            </div>

            <div className="coach-scroll" ref={scrollRef}>
              <div className="micro-label coach-section-label">This week</div>
              {snapshot && <MiniActivity perDay={snapshot.volume.per_day} />}
              {insightState === 'loading' && <p className="coach-quiet">Reading your week…</p>}
              {insightState === 'error' && (
                <p className="coach-quiet">Couldn&apos;t load the insight — it&apos;ll be back shortly.</p>
              )}
              {insight && <Card card={insight} />}

              {turns.length > 0 && <div className="coach-section-sep" />}

              {turns.map((t, i) => (
                <div key={i} className="coach-turn">
                  <div className="coach-msg coach-msg--user">{t.user}</div>
                  {t.reply ? (
                    <div className="coach-msg coach-msg--coach">
                      <Card card={t.reply} />
                    </div>
                  ) : (
                    <div className="coach-msg coach-msg--coach coach-msg--pending">
                      <span className="coach-dots">
                        <i />
                        <i />
                        <i />
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form
              className="coach-input-row"
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              <input
                className="coach-input"
                placeholder="Ask your coach…"
                value={input}
                maxLength={500}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
                aria-label="Message the coach"
              />
              <button
                className="coach-send"
                type="submit"
                aria-label="Send"
                disabled={sending || !input.trim()}
              >
                <IconSend />
              </button>
            </form>
          </aside>
        </>
      )}
    </>
  )
}
