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

    if (sub.status !== 'active') {
      return NextResponse.json({ error: 'Підписка не є активною' }, { status: 400 });
    }

    // Set autoRenew to false
    await db
      .update(subscriptions)
      .set({
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
        console.error('Failed to fetch invoice status for pause notification:', err);
      }
    }

    // Send Telegram alert to administrator
    await sendAdminAlert({
      event: 'Пауза підписки',
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
    console.error('Pause subscription API error:', error);
    const message = error instanceof Error ? error.message : 'Внутрішня помилка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
