import { db } from '@/db';
import { rateLimits } from '@/db/schema';
import { sql } from 'drizzle-orm';

export function getClientIp(request: Request): string {
  // Try x-real-ip first (provided by Vercel/Cloudflare edge)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to x-forwarded-for chain, sanitize it by taking the first IP (the original client IP)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const parts = forwardedFor.split(',');
    const clientIp = parts[0]?.trim();
    if (clientIp) {
      return clientIp;
    }
  }

  return '127.0.0.1';
}

export async function checkDbRateLimit(
  ip: string,
  actionKey: string,
  max: number,
  windowSeconds = 60
): Promise<boolean> {
  const key = `${actionKey}:${ip}`;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    const results = await db
      .insert(rateLimits)
      .values({
        key,
        count: 1,
        resetAt,
      })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`CASE WHEN rate_limits.reset_at < ${now} THEN 1 ELSE rate_limits.count + 1 END`,
          resetAt: sql`CASE WHEN rate_limits.reset_at < ${now} THEN ${resetAt} ELSE rate_limits.reset_at END`,
        },
      })
      .returning();

    if (results.length > 0) {
      const record = results[0];
      if (record.count > max) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error(`Rate limit error for key ${key}:`, error);
    // Fail-open or fail-closed? Fail-open to avoid locking users out on temporary DB errors
    return true;
  }
}
