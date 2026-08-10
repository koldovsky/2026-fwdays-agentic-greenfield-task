import { cookies } from 'next/headers';
import { db } from '@/db';
import { sessions, users, subscriptions } from '@/db/schema';
import { eq, desc, and, gt } from 'drizzle-orm';
import crypto from 'crypto';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;

  const result = await db
    .select({
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0].user;
}

export async function authenticateApiKey(request: Request) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return null;

  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const userList = await db
    .select()
    .from(users)
    .where(eq(users.apiKeyHash, apiKeyHash))
    .limit(1);

  return userList[0] || null;
}

export async function checkActiveSubscription(userId: string) {
  const subList = await db
    .select({
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (subList.length === 0) {
    return {
      allowed: false,
      statusCode: 403,
      error: 'No active subscription found.',
    };
  }

  const { status, currentPeriodEnd } = subList[0];
  const now = new Date();

  if (status === 'active') {
    if (currentPeriodEnd > now) {
      return {
        allowed: true,
        statusCode: 200,
        error: '',
      };
    } else {
      return {
        allowed: false,
        statusCode: 402,
        error: 'Subscription period has expired.',
      };
    }
  }

  const statusMap: Record<string, { allowed: boolean; statusCode: number; error: string }> = {
    paused: {
      allowed: false,
      statusCode: 402,
      error: 'Subscription is paused. Please resume your subscription.',
    },
    suspended: {
      allowed: false,
      statusCode: 402,
      error: 'Subscription is suspended due to payment failure.',
    },
    cancelled: {
      allowed: false,
      statusCode: 403,
      error: 'Subscription has been cancelled.',
    },
    created: {
      allowed: false,
      statusCode: 403,
      error: 'Subscription is not yet activated. Please complete your payment.',
    },
  };

  return statusMap[status] || {
    allowed: false,
    statusCode: 403,
    error: 'Invalid subscription status.',
  };
}

