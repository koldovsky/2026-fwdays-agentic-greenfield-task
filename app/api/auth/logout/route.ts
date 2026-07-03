import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
  
  // Use status 303 for POST redirects to ensure the browser performs a GET request to the redirect target
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
