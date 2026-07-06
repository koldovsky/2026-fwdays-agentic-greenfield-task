import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    // 1. Check CRON_SECRET in environment
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('Configuration error: CRON_SECRET environment variable is missing.');
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // 2. Check Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const tokenBuffer = Buffer.from(token);
    const secretBuffer = Buffer.from(cronSecret);

    if (tokenBuffer.length !== secretBuffer.length || !crypto.timingSafeEqual(tokenBuffer, secretBuffer)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 3. Delete old records in batches of 10,000
    let totalDeleted = 0;
    let rowsDeleted = 0;

    do {
      const result = await db.execute(sql`
        DELETE FROM conversions
        WHERE id IN (
          SELECT id FROM conversions
          WHERE conversion_time < NOW() - INTERVAL '14 months'
          LIMIT 10000
        )
      `);
      rowsDeleted = result.rowCount ?? 0;
      totalDeleted += rowsDeleted;
    } while (rowsDeleted === 10000);

    // 4. Log the deletion count
    console.log(`${totalDeleted} records deleted`);

    // 5. Return response
    return NextResponse.json(
      { deleted: totalDeleted },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cleanup Cron API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
