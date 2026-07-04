import { cookies } from "next/headers";

import { createSessionToken, SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token";
import type { SessionUser } from "@/lib/auth/types";

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return { id: payload.id, username: payload.username, role: payload.role };
}

function sessionCookieSecure(): boolean {
  const override = process.env.COLIBRI_COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;
  const publicUrl = process.env.COLIBRI_PUBLIC_URL?.trim();
  if (publicUrl) return publicUrl.startsWith("https://");
  return process.env.NODE_ENV === "production";
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const jar = await cookies();
  const token = await createSessionToken(user);
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSessionUser();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}
