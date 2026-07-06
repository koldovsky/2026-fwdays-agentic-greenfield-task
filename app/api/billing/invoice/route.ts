import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createInvoice } from '@/lib/monobank';
import { getPricingDetails } from '@/lib/pricing';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Неавторизовано' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Некоректний JSON' }, { status: 400 });
    }

    const { tariffPlan } = body;
    if (!tariffPlan || (tariffPlan !== 'monthly' && tariffPlan !== 'yearly')) {
      return NextResponse.json({ error: 'Некоректний тарифний план' }, { status: 400 });
    }

    // Calculate dynamic UAH amount and URLs
    const { amountInKopecks, redirectUrl, webHookUrl } = await getPricingDetails(tariffPlan);

    // Create invoice via Monobank API
    const invoiceRes = await createInvoice(amountInKopecks, redirectUrl, webHookUrl);
    const { invoiceId, pageUrl } = invoiceRes;

    // Check if subscription record exists
    const existingSub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    const now = new Date();

    if (existingSub.length > 0) {
      await db
        .update(subscriptions)
        .set({
          tariffPlan,
          status: 'created',
          amount: amountInKopecks,
          lastInvoiceId: invoiceId,
          failedAttemptsCount: 0,
          currentPeriodEnd: now,
          updatedAt: now,
        })
        .where(eq(subscriptions.userId, user.id));
    } else {
      await db
        .insert(subscriptions)
        .values({
          userId: user.id,
          tariffPlan,
          status: 'created',
          amount: amountInKopecks,
          lastInvoiceId: invoiceId,
          failedAttemptsCount: 0,
          currentPeriodEnd: now,
        });
    }

    return NextResponse.json({ pageUrl, invoiceId });
  } catch (error) {
    console.error('Invoice creation API error:', error);
    const message = error instanceof Error ? error.message : 'Внутрішня помилка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
