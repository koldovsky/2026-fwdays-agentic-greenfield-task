import { NextResponse } from "next/server";

import { isValidCronRequest } from "@/lib/auth/cron-auth";
import { hasActiveScheduledJobs } from "@/lib/booking/schedule/active-jobs";
import { runScheduledBookings } from "@/lib/booking/schedule/runner";
import { listScheduledJobs } from "@/lib/booking/schedule/store";

async function handleRun(request: Request) {
  if (!isValidCronRequest(request as import("next/server").NextRequest)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await listScheduledJobs();
  if (!hasActiveScheduledJobs(jobs)) {
    return NextResponse.json({
      skipped: true,
      reason: "no active scheduled jobs",
      processed: 0,
      completed: 0,
      failed: 0,
      waiting: 0,
      jobs: [],
    });
  }

  const result = await runScheduledBookings();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return handleRun(request);
}

export async function GET(request: Request) {
  return handleRun(request);
}
