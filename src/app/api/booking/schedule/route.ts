import { NextResponse } from "next/server";

import { listScheduledJobs } from "@/lib/booking/schedule/store";
import { queueScheduledBooking } from "@/lib/booking/schedule/runner";

export async function GET() {
  const jobs = await listScheduledJobs();
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    bookingRequest: string;
    referenceDate?: string;
    residentIds?: string[];
    targetDate?: string;
    slotLabel?: string | null;
    court?: string | null;
  };

  if (!body.bookingRequest?.trim()) {
    return NextResponse.json({ error: "bookingRequest required" }, { status: 400 });
  }

  const referenceDate = body.referenceDate ? new Date(body.referenceDate) : new Date();
  const jobs = await queueScheduledBooking(body.bookingRequest, referenceDate, {
    residentIds: body.residentIds,
    targetDate: body.targetDate,
    slotLabel: body.slotLabel,
    court: body.court,
  });

  return NextResponse.json({ jobs }, { status: 201 });
}
