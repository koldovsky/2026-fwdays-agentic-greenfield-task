#!/usr/bin/env node
/** Run scheduled MHOA bookings — use in cron e.g. hourly: 0 * * * * cd /path && npm run schedule:run */
import { runScheduledBookings } from "../src/lib/booking/schedule/runner";

const result = await runScheduledBookings();
console.log(JSON.stringify(result, null, 2));
process.exit(result.failed > 0 ? 1 : 0);
