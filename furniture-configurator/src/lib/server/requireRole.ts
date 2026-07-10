import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, type Role } from "@/lib/auth";

export function requireRole(request: NextRequest, allowed: Role[]): NextResponse | null {
  const sessionRole = request.cookies.get(SESSION_COOKIE)?.value as Role | undefined;
  if (!sessionRole || !allowed.includes(sessionRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
