import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "colibri-book",
    submitMode: process.env.COLIBRI_SUBMIT_MODE ?? "stub",
  });
}
