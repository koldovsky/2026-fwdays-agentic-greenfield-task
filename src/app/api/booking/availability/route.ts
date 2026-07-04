import { NextResponse } from "next/server";

import { fetchTennisAvailability } from "@/lib/booking/availability-server";

export async function POST(request: Request) {
  const body = (await request.json()) as { date?: string };
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json(
      { status: "error", reason: "Valid date (YYYY-MM-DD) is required." },
      { status: 400 },
    );
  }

  const result = await fetchTennisAvailability(body.date);
  return NextResponse.json(result, { status: 200 });
}
