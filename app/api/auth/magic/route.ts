import { NextResponse } from 'next/server';
import { db } from '@/db';
import { magicLinks, users, sessions } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { sendBotMessage } from '@/lib/telegram-bot';
import crypto from 'crypto';

// In-memory rate limiting for IPs
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRateLimits.get(ip);

  if (record && record.resetAt > now) {
    if (record.count >= 3) {
      return false;
    }
    record.count++;
  } else {
    ipRateLimits.set(ip, { count: 1, resetAt: now + 60 * 1000 });
  }
  return true;
}

// GET: Validate Magic Link and create session
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url));
  }

  try {
    const linkList = await db
      .select()
      .from(magicLinks)
      .where(eq(magicLinks.token, token))
      .limit(1);

    if (linkList.length === 0) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    const link = linkList[0];
    const now = new Date();

    if (link.expiresAt < now || link.isUsed) {
      return NextResponse.redirect(new URL('/login?error=expired_token', request.url));
    }

    // Mark as used
    await db
      .update(magicLinks)
      .set({ isUsed: true })
      .where(eq(magicLinks.id, link.id));

    // Create session (valid for 30 days)
    const sessionToken = crypto.randomUUID();
    const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(sessions).values({
      userId: link.userId,
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

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Error validating magic link:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}

// POST: Request new Magic Link
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  if (!checkIpRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Занадто багато запитів. Будь ласка, спробуйте пізніше' },
      { status: 429 }
    );
  }

  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query user
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    const genericSuccessResponse = {
      message: 'Якщо вказана адреса зареєстрована, ми надіслали посилання для входу у ваш Telegram-бот',
    };

    if (userList.length === 0) {
      // User enumeration protection
      return NextResponse.json(genericSuccessResponse);
    }

    const user = userList[0];

    // Check DB rate limiting (max 3 tokens per minute for this user)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentTokens = await db
      .select()
      .from(magicLinks)
      .where(and(eq(magicLinks.userId, user.id), gt(magicLinks.createdAt, oneMinuteAgo)));

    if (recentTokens.length >= 3) {
      return NextResponse.json(
        { error: 'Занадто багато запитів. Будь ласка, спробуйте пізніше' },
        { status: 429 }
      );
    }

    // Invalidate old active magic links
    await db.delete(magicLinks).where(eq(magicLinks.userId, user.id));

    // Generate new token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(magicLinks).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLinkUrl = `${appUrl}/api/auth/magic?token=${token}`;
    const textMessage = `Для входу в особистий кабінет перейдіть за цим посиланням: ${magicLinkUrl}`;

    try {
      await sendBotMessage(user.telegramId, textMessage);
    } catch (botError) {
      console.error('Failed to send magic link via Telegram bot:', botError);
      return NextResponse.json(
        {
          error: 'Не вдалося надіслати повідомлення у Telegram. Будь ласка, переконайтеся, що наш бот не заблокований, і спробуйте знову',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(genericSuccessResponse);
  } catch (error) {
    console.error('Error requesting magic link:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
