import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// auth-onboarding not yet built — no Supabase client or /sign-in route exists.
// This guard is a stub; wire up the real session check once auth-onboarding ships.
export function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/((?!sign-in|_next/static|_next/image|favicon.ico).*)'],
}
