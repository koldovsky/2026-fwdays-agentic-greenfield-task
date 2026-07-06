import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (sessionToken) {
    try {
      await db.delete(sessions).where(eq(sessions.token, sessionToken));
    } catch (error) {
      console.error('Error invalidating session in DB:', error);
    }
  }

  cookieStore.delete('session_token');
  
  // Use status 303 for POST redirects to ensure the browser performs a GET request to the redirect target
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
