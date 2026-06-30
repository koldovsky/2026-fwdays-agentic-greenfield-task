// `npm run db:seed` entrypoint (Phase 5). Seeds the REAL dev DB (the singleton
// client reads DATABASE_URL, default file:./data/app.db) with the deterministic
// demo dataset, re-pinning baseline state on every run. The actual fixture +
// reset logic lives in tests/helpers/seed-demo-data.ts so E2E and the Phase-6
// recordings share one source of truth.
import { db } from "@/db/client";
import { seedDemoData, DEMO_PLANT_NAMES } from "@/tests/helpers/seed-demo-data";

async function main() {
  const ids = await seedDemoData(db);
  console.log(
    `db:seed — re-pinned ${DEMO_PLANT_NAMES.length} demo plants (overdue=${ids.overdue}, soon=${ids.soon}, healthy=${ids.healthy}, never=${ids.never}).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("db:seed failed:", error);
    process.exit(1);
  });
