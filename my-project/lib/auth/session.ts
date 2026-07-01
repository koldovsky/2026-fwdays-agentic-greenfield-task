import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "../types";

export interface Session { userId: string; username: string; fullName: string; role: Role }
const cookieName = "manufacturing_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "local-demo-secret-change-before-production-32chars");

export async function createSession(session: Session) {
  const token = await new SignJWT({ ...session }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret);
  (await cookies()).set(cookieName, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
}
export async function clearSession() { (await cookies()).delete(cookieName); }
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, secret)).payload as unknown as Session; } catch { return null; }
}
export async function requireSession(): Promise<Session> { const session = await getSession(); if (!session) redirect("/login"); return session; }
export async function requireAdmin(): Promise<Session> { const session = await requireSession(); if (session.role !== "Admin") throw new Error("Administrator access is required."); return session; }

