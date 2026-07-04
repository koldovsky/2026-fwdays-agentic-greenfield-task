import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/session-server";
import { createUser, listUsers } from "@/lib/auth/users-store";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      role?: "user" | "admin";
    };

    const user = await createUser({
      username: body.username ?? "",
      password: body.password ?? "",
      role: body.role === "admin" ? "admin" : "user",
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
