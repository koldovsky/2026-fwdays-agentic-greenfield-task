export function calculateStreak(logs: Date[]): number {
  if (logs.length === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const unique = Array.from(
    new Set(logs.map((d) => toISODate(d)))
  )
    .map((s) => new Date(s + 'T00:00:00'))
    .sort((a, b) => b.getTime() - a.getTime())

  let streak = 0
  let expected = today

  for (const log of unique) {
    if (isSameDay(log, expected)) {
      streak++
      expected = addDays(expected, -1)
    } else if (log < expected) {
      break
    }
  }

  return streak
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b)
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}
