import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getInvoiceStatus } from '@/lib/monobank';
import { sendAdminAlert } from '@/lib/notifications';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Неавторизовано' }, { status: 401 });
    }

    const existingSubs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (existingSubs.length === 0) {
      return NextResponse.json({ error: 'Підписку не знайдено' }, { status: 404 });
    }

    const sub = existingSubs[0];

    // Status changes to cancelled immediately
    await db
      .update(subscriptions)
      .set({
        status: 'cancelled',
        autoRenew: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    // Try to fetch transaction details from Monobank for admin alert
    const clientName = 'не вказано';
    const phone = 'не вказано';
    let transactionTime = 'не вказано';

    if (sub.lastInvoiceId) {
      try {
        const statusRes = await getInvoiceStatus(sub.lastInvoiceId);
        transactionTime = statusRes.modifiedDate || 'не вказано';
      } catch (err) {
        console.error('Failed to fetch invoice status for cancel notification:', err);
      }
    }

    // Send Telegram alert to administrator
    await sendAdminAlert({
      event: 'Скасування підписки',
      name: clientName,
      phone,
      time: transactionTime,
      email: user.email || 'не вказано',
      website: user.websiteUrl || 'не вказано',
      telegramUsername: user.telegramUsername || 'не вказано',
      amount: sub.amount || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel subscription API error:', error);
    const message = error instanceof Error ? error.message : 'Внутрішня помилка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
