import { NextResponse } from "next/server";

import { deleteScheduledJob, getScheduledJob } from "@/lib/booking/schedule/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const job = await getScheduledJob(id);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "waiting" && job.status !== "ready") {
    return NextResponse.json(
      { error: "Only waiting or ready jobs can be cancelled" },
      { status: 409 },
    );
  }

  await deleteScheduledJob(id);
  return NextResponse.json({ ok: true });
}
