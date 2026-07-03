import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pendingRegistrations, users, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    const regList = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.token, token))
      .limit(1);

    if (regList.length === 0) {
      return NextResponse.json({ completed: false, error: 'Registration session not found' });
    }

    const reg = regList[0];
    const now = new Date();

    if (reg.expiresAt < now) {
      return NextResponse.json({ completed: false, error: 'Registration session expired' });
    }

    if (!reg.isCompleted) {
      return NextResponse.json({ completed: false });
    }

    if (!reg.telegramId) {
      return NextResponse.json({ completed: false, error: 'Telegram ID missing' });
    }

    // Find the user created by the bot
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, reg.telegramId))
      .limit(1);

    if (userList.length === 0) {
      return NextResponse.json({ completed: false, error: 'User profile not created yet' });
    }

    const user = userList[0];

    // Create session in database
    const sessionToken = crypto.randomUUID();
    const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(sessions).values({
      userId: user.id,
      token: sessionToken,
      expiresAt: sessionExpires,
    });

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // Invalidate the temporary token allowing a 30-second grace period.
    // If it's already set to a short expiration, don't update it again.
    const timeRemaining = reg.expiresAt.getTime() - now.getTime();
    if (timeRemaining > 30 * 1000) {
      const gracePeriod = new Date(now.getTime() + 30 * 1000);
      await db
        .update(pendingRegistrations)
        .set({ expiresAt: gracePeriod })
        .where(eq(pendingRegistrations.id, reg.id));
    }

    return NextResponse.json({ completed: true });
  } catch (error) {
    console.error('Error during registration polling:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
