import { cookies } from 'next/headers';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;

  const sessionList = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (sessionList.length === 0 || sessionList[0].expiresAt < new Date()) {
    return null;
  }

  const userList = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionList[0].userId))
    .limit(1);

  return userList[0] || null;
}
