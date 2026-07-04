import { NextResponse } from "next/server";

import { recordConfirmedFromSuccess } from "@/lib/booking/confirmed/store";
import { parseBookingRequest } from "@/lib/booking/parse";
import { getResidentByEmail } from "@/lib/booking/residents";
import { submitBooking } from "@/lib/booking/submit";
import type { BookingIntake } from "@/lib/booking/types";
import { validateParsedBooking } from "@/lib/booking/validate-rules";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    intake: BookingIntake;
    referenceDate?: string;
    selection?: { court: string; slotLabel: string };
    residentId?: string | null;
  };
  const { intake, selection } = body;
  const referenceDate = body.referenceDate ? new Date(body.referenceDate) : new Date();

  const parsed = parseBookingRequest(intake.bookingRequest, intake.facility, referenceDate);
  const validation = validateParsedBooking(parsed, referenceDate);

  if (!validation.ok) {
    return NextResponse.json(
      { status: "validation_error", errors: validation.errors, parsed },
      { status: 400 },
    );
  }

  const result = await submitBooking(intake, parsed, selection);

  if (result.status === "success" && result.mhoaApproved) {
    const residentId =
      body.residentId ??
      getResidentByEmail(intake.email)?.id ??
      null;
    await recordConfirmedFromSuccess(result, { residentId, source: "wizard" });
  }

  return NextResponse.json(result);
}
