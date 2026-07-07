'use client'

import { useProgressStore } from '@/store/progress-logging'
import { useProgressCopy } from '@/lib/progress-logging/use-progress-copy'

export function DailyCheckIn() {
  const copy = useProgressCopy()
  const { currentStreak, lifetimeDays, todayCheckedIn, optimisticCheckIn } = useProgressStore()

  function handleCheckIn() {
    if (todayCheckedIn) return
    const today = new Date().toISOString().slice(0, 10)
    const newStreak = currentStreak + 1
    optimisticCheckIn(today, newStreak)
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-ds-border-light bg-white p-6 shadow-card">
      <h2 className="text-xl font-semibold leading-7 text-ds-text-primary">{copy.checkIn.heading}</h2>

      <div className="flex gap-6">
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-accent tabular-nums">{currentStreak}</span>
          <span className="text-[12px] text-ds-text-secondary mt-1">{copy.checkIn.streakLabel}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-accent tabular-nums">{lifetimeDays}</span>
          <span className="text-[12px] text-ds-text-secondary mt-1">{copy.checkIn.lifetimeLabel}</span>
        </div>
      </div>

      {todayCheckedIn ? (
        <p className="text-[14px] text-accent font-medium">{copy.checkIn.alreadyLoggedLabel}</p>
      ) : (
        <button
          onClick={handleCheckIn}
          className="
            w-full min-h-11 py-3 rounded-xl bg-accent text-white font-semibold text-[14px] leading-4.5
            hover:bg-accent-hover active:bg-accent-hover
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ds-accent)/20
            transition-colors duration-150
          "
        >
          {copy.checkIn.buttonLabel}
        </button>
      )}
    </div>
  )
}
