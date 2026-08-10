import { NextResponse, after } from 'next/server';
import { db } from '@/db';
import { pendingRegistrations } from '@/db/schema';
import { lt } from 'drizzle-orm';
import { getClientIp, checkDbRateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const isAllowed = await checkDbRateLimit(ip, 'register-token-creation', 5, 60);
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Занадто багато запитів. Будь ласка, спробуйте пізніше' },
      { status: 429 }
    );
  }

  try {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up expired registrations in background after response is sent
    after(() => {
      db.delete(pendingRegistrations)
        .where(lt(pendingRegistrations.expiresAt, new Date()))
        .catch((err) => console.error('Background pruning error:', err));
    });

    await db.insert(pendingRegistrations).values({
      token,
      expiresAt,
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Failed to create registration token:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
