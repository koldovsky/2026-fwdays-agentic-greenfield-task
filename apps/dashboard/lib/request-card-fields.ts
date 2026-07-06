// apps/dashboard — a plain, 1:1 snake_case -> camelCase field mapper
// (dashboard tasks.md §6.9). `RequestRow` (the SQLite-backed row a
// `STATE_SNAPSHOT`'s `dashboard.activeRequests` carries) and
// `RequestCardFields` (the client reducer's own live-patched shape, camel-
// cased to match the AG-UI wire contract) hold the exact same intake
// fields under different naming conventions — this is the one place that
// bridges them, so `DashboardApp.tsx` can render a `RequestCard` from
// EITHER a live-patched `requestCards[threadId]` entry OR (before any
// `STATE_DELTA` has arrived for that thread yet) the DB-backed row itself,
// with no duplicated field list.

import type { RequestRow } from "@kamerton/db";
import type { RequestCardFields } from "./agui-client.ts";

export function requestRowToCardFields(row: RequestRow): RequestCardFields {
  return {
    studentName: row.student_name,
    studentAge: row.student_age,
    format: row.format,
    goalTag: row.goal_tag,
    goalText: row.goal_text,
    tastes: row.tastes,
    dreamSong: row.dream_song,
    experience: row.experience,
    comfort: row.comfort,
    preferredWeekdays: row.preferred_weekdays,
    preferredTimeRange: row.preferred_time_range,
  };
}
