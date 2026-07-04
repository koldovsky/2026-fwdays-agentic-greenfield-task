import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/session-server";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
