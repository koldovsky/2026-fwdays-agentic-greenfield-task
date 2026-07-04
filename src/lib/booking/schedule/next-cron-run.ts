import type { ScheduledJob } from "@/lib/booking/schedule/types";

/** Minutes past the hour — must match deploy/colibri-schedule.cron */
export const SCHEDULE_CRON_MINUTES = [1, 11, 21, 31, 41, 51] as const;

/** Calgary and Edmonton share America/Edmonton (MDT/MST). */
export const SCHEDULE_CRON_TIMEZONE = "America/Edmonton";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/** UTC instant for a wall-clock time in the given IANA zone. */
export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  for (let i = 0; i < 6; i++) {
    const formatted = getZonedParts(new Date(guess), timeZone);
    if (
      formatted.year === year &&
      formatted.month === month &&
      formatted.day === day &&
      formatted.hour === hour &&
      formatted.minute === minute
    ) {
      return new Date(guess);
    }

    const formattedMs = Date.UTC(
      formatted.year,
      formatted.month - 1,
      formatted.day,
      formatted.hour,
      formatted.minute,
      0,
      0,
    );
    const desiredMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    guess += desiredMs - formattedMs;
  }

  return new Date(guess);
}

function isCronMinute(minute: number): boolean {
  return (SCHEDULE_CRON_MINUTES as readonly number[]).includes(minute);
}

/** Next cron tick strictly after `after` (Edmonton schedule). */
export function getNextScheduleCronRun(after: Date = new Date()): Date {
  const timeZone = SCHEDULE_CRON_TIMEZONE;
  let probe = new Date(after.getTime() + 1_000);

  for (let i = 0; i < 70; i++) {
    const p = getZonedParts(probe, timeZone);
    if (isCronMinute(p.minute)) {
      const runAt = zonedDateTimeToUtc(p.year, p.month, p.day, p.hour, p.minute, timeZone);
      if (runAt > after) return runAt;
    }
    const minuteStart = zonedDateTimeToUtc(p.year, p.month, p.day, p.hour, p.minute, timeZone);
    probe = new Date(minuteStart.getTime() + 60_000);
  }

  throw new Error("Could not find next schedule cron run within 70 minutes");
}

export function formatNextRetryCalgary(at: Date): string {
  const formatted = at.toLocaleString("en-CA", {
    timeZone: SCHEDULE_CRON_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatted} Calgary`;
}

/** When cron will next attempt this job, or null if terminal. */
export function getNextRetryAt(job: ScheduledJob, now: Date = new Date()): Date | null {
  if (job.status === "completed" || job.status === "failed") return null;

  if (job.status === "waiting") {
    const opens = new Date(job.opensAt);
    const earliest = opens > now ? opens : now;
    return getNextScheduleCronRun(earliest);
  }

  if (job.status === "ready" || job.status === "running") {
    return getNextScheduleCronRun(now);
  }

  return null;
}
