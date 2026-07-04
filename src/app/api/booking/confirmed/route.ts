import { NextResponse } from "next/server";

import { listActiveConfirmedBookings } from "@/lib/booking/confirmed/store";

export async function GET() {
  const bookings = await listActiveConfirmedBookings();
  return NextResponse.json({ bookings });
}
