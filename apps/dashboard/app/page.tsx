// apps/dashboard/app/page.tsx — the dashboard's entry point (dashboard
// tasks.md §6.9). A thin server component: reads the CURRENT truth
// straight from SQLite (`dashboard-db.ts`, the same read the SSE route's
// own on-connect `STATE_SNAPSHOT` performs, design.md Decision 1) and
// hands it to `DashboardApp` as the initial render — so the page never
// shows a blank flash before the browser's own `connectAgui` SSE
// connection delivers its first frame. Everything live from then on is
// `DashboardApp`'s job (client component, `"use client"`).
//
// Localhost-only (NFR-LOCAL-01): `next dev -H 127.0.0.1` / `next start -H
// 127.0.0.1` (package.json) already bind to loopback only — nothing here
// changes that.

import { openDatabase } from "@kamerton/db";
import { DashboardApp } from "./DashboardApp.tsx";
import { currentWeekStartIso, readDashboardSnapshot, resolveDbPath } from "../lib/dashboard-db.ts";

// Never statically cache this route: the snapshot must reflect whatever is
// in SQLite at request time (design.md Decision 1's own snapshot-on-connect
// discipline extends to snapshot-on-page-load).
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const db = openDatabase(resolveDbPath());
  let snapshot;
  try {
    snapshot = readDashboardSnapshot(db, currentWeekStartIso());
  } finally {
    db.close();
  }

  return <DashboardApp initialSnapshot={snapshot} />;
}
