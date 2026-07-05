import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/app/lib/session";

const publicRoutes = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  const cookie = request.cookies.get("session")?.value;
  const session = await decrypt(cookie);
  const isAuthenticated = Boolean(session?.userId);

  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
