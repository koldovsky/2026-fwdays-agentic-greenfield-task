import { NextResponse } from "next/server";

import { createJobsFromInput } from "@/lib/booking/schedule/runner";
import { addScheduledJobs } from "@/lib/booking/schedule/store";
import type { ScheduledJobInput } from "@/lib/booking/schedule/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { jobs?: ScheduledJobInput[] };

  if (!body.jobs?.length) {
    return NextResponse.json({ error: "jobs array required" }, { status: 400 });
  }

  for (const job of body.jobs) {
    if (!job.targetDate || !job.residentId || !job.bookingRequest?.trim()) {
      return NextResponse.json({ error: "Invalid job payload" }, { status: 400 });
    }
    if (job.residentId === "other" && !job.guestContact) {
      return NextResponse.json({ error: "guestContact required for other guest" }, { status: 400 });
    }
  }

  const created = createJobsFromInput(body.jobs);
  await addScheduledJobs(created);

  return NextResponse.json({ jobs: created }, { status: 201 });
}
