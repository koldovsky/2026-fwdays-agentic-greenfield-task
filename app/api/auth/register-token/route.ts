import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pendingRegistrations } from '@/db/schema';
import { lt } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST() {
  try {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up expired registrations in background
    db.delete(pendingRegistrations)
      .where(lt(pendingRegistrations.expiresAt, new Date()))
      .catch((err) => console.error('Background pruning error:', err));

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
