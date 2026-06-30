// Playwright global setup (Phase 5). Runs ONCE before the webServer boots:
// migrates the dedicated E2E SQLite file and seeds the deterministic demo
// baseline. Because the webServer is started with DATABASE_URL pointed at the
// SAME file (see playwright.config.ts), the served app reads exactly what we
// seeded here. Individual specs additionally re-seed in beforeEach to undo any
// mutations from earlier specs.
import { migrateE2eDb, reseed, E2E_DB_URL } from "./helpers/e2e-db";

export default async function globalSetup() {
  migrateE2eDb();
  const ids = await reseed();
  console.log(
    `[e2e] seeded ${E2E_DB_URL} — overdue=${ids.overdue} soon=${ids.soon} healthy=${ids.healthy} never=${ids.never}`,
  );
}
