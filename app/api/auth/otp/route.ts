import { NextResponse } from 'next/server';
import { db } from '@/db';
import { otpCodes, users, sessions } from '@/db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { sendBotMessage } from '@/lib/telegram-bot';
import { getClientIp, checkDbRateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  let body: { email?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, code } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // CASE 1: Verification (code is provided)
  if (code !== undefined) {
    const isAllowed = await checkDbRateLimit(ip, 'otp-verify', 5, 60);
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Занадто багато спроб перевірки. Будь ласка, спробуйте пізніше' },
        { status: 429 }
      );
    }

    try {
      const userList = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (userList.length === 0) {
        return NextResponse.json(
          { error: 'Некоректний код або його термін дії закінчився' },
          { status: 400 }
        );
      }

      const user = userList[0];
      const now = new Date();

      // Get current active OTP code (latest unused and not expired)
      const activeOtpList = await db
        .select()
        .from(otpCodes)
        .where(
          and(
            eq(otpCodes.userId, user.id),
            eq(otpCodes.isUsed, false),
            gt(otpCodes.expiresAt, now)
          )
        )
        .orderBy(desc(otpCodes.createdAt))
        .limit(1);

      if (activeOtpList.length === 0) {
        return NextResponse.json(
          { error: 'Некоректний код або його термін дії закінчився' },
          { status: 400 }
        );
      }

      const otp = activeOtpList[0];

      if (otp.isUsed || otp.expiresAt < now || otp.attempts >= 3) {
        return NextResponse.json(
          { error: 'Некоректний код або його термін дії закінчився' },
          { status: 400 }
        );
      }

      // Check if code matches
      if (otp.code === code.trim()) {
        // Mark as used
        await db
          .update(otpCodes)
          .set({ isUsed: true })
          .where(eq(otpCodes.id, otp.id));

        // Create session
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

        return NextResponse.json({ success: true });
      } else {
        // Increment failure counter
        const newAttempts = otp.attempts + 1;
        await db
          .update(otpCodes)
          .set({
            attempts: newAttempts,
            isUsed: newAttempts >= 3, // immediately invalidate if 3 attempts reached
          })
          .where(eq(otpCodes.id, otp.id));

        return NextResponse.json(
          { error: 'Некоректний код або його термін дії закінчився' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error during OTP verification:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }

  // CASE 2: Request OTP code (code is not provided)
  const isAllowed = await checkDbRateLimit(ip, 'otp-request', 3, 60);
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Занадто багато запитів. Будь ласка, спробуйте пізніше' },
      { status: 429 }
    );
  }

  try {
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    const genericSuccessResponse = {
      message: 'Якщо вказана адреса зареєстрована, ми надіслали одноразовий код у ваш Telegram-бот',
    };

    if (userList.length === 0) {
      // Protect against user enumeration
      return NextResponse.json(genericSuccessResponse);
    }

    const user = userList[0];

    // Check DB rate limit for OTP creation (max 3 tokens per minute for this user)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentOtps = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.userId, user.id), gt(otpCodes.createdAt, oneMinuteAgo)));

    if (recentOtps.length >= 3) {
      return NextResponse.json(
        { error: 'Занадто багато запитів. Будь ласка, спробуйте пізніше' },
        { status: 429 }
      );
    }

    // Invalidate previous OTP codes by marking them as used instead of deleting
    await db
      .update(otpCodes)
      .set({ isUsed: true })
      .where(eq(otpCodes.userId, user.id));

    // Generate random 6-digit code
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.insert(otpCodes).values({
      userId: user.id,
      code: rawCode,
      expiresAt,
    });

    const textMessage = `Ваш одноразовий код для входу: ${rawCode}`;

    try {
      await sendBotMessage(user.telegramId, textMessage);
    } catch (botError) {
      console.error('Failed to send OTP code via Telegram bot:', botError);
      return NextResponse.json(
        {
          error: 'Не вдалося надіслати повідомлення у Telegram. Будь ласка, переконайтеся, що наш бот не заблокований, і спробуйте знову',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(genericSuccessResponse);
  } catch (error) {
    console.error('Error during OTP request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
