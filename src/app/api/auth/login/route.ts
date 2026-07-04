import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/session-server";
import { authenticateUser, ensureUserStore } from "@/lib/auth/users-store";

export async function POST(request: Request) {
  await ensureUserStore();

  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required." }, { status: 400 });
  }

  const user = await authenticateUser(username, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  await setSessionCookie({ id: user.id, username: user.username, role: user.role });

  return NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role },
  });
}
