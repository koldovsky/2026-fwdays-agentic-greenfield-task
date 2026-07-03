import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getExchangeRate, executeWalletPayment, createInvoice, getInvoiceStatus } from '@/lib/monobank';
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
    const now = new Date();
    const isWithinPaidPeriod = now < sub.currentPeriodEnd;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webHookUrl = process.env.MONOBANK_WEBHOOK_URL || `${appUrl}/api/billing/webhook`;
    const redirectUrl = `${appUrl}/dashboard`;

    // 1. Paid period is still active
    if (isWithinPaidPeriod) {
      await db
        .update(subscriptions)
        .set({
          status: 'active',
          autoRenew: true,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sub.id));

      // Try to fetch metadata for admin alert
      const clientName = 'не вказано';
      const phone = 'не вказано';
      let transactionTime = 'не вказано';

      if (sub.lastInvoiceId) {
        try {
          const statusRes = await getInvoiceStatus(sub.lastInvoiceId);
          transactionTime = statusRes.modifiedDate || 'не вказано';
        } catch (err) {
          console.error('Failed to fetch status for resumption:', err);
        }
      }

      await sendAdminAlert({
        event: 'Поновлення підписки',
        name: clientName,
        phone,
        time: transactionTime,
        email: user.email || 'не вказано',
        website: user.websiteUrl || 'не вказано',
        telegramUsername: user.telegramUsername,
        amount: sub.amount || undefined,
      });

      return NextResponse.json({ success: true });
    }

    // 2. Paid period has expired (now >= currentPeriodEnd)
    // Calculate dynamic UAH price
    const exchangeRate = await getExchangeRate();
    const usdPrice = sub.tariffPlan === 'monthly' ? 10.99 : 120.00;
    const amountInKopecks = Math.round(usdPrice * exchangeRate * 100);

    // If card token is available, attempt merchant-initiated wallet payment
    if (sub.cardToken && (sub.status === 'paused' || sub.status === 'suspended' || sub.status === 'active')) {
      try {
        const paymentRes = await executeWalletPayment(
          sub.cardToken,
          amountInKopecks,
          redirectUrl,
          webHookUrl
        );

        const { invoiceId, status: paymentStatus, tdsUrl } = paymentRes;

        // Store returned invoiceId as lastInvoiceId
        await db
          .update(subscriptions)
          .set({
            lastInvoiceId: invoiceId,
            amount: amountInKopecks,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));

        if (paymentStatus === 'success') {
          const intervalMonths = sub.tariffPlan === 'yearly' ? 12 : 1;
          const newPeriodEnd = new Date();
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + intervalMonths);

          await db
            .update(subscriptions)
            .set({
              status: 'active',
              autoRenew: true,
              currentPeriodEnd: newPeriodEnd,
              failedAttemptsCount: 0,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, sub.id));

          // Send admin alert
          await sendAdminAlert({
            event: 'Поновлення підписки',
            name: 'не вказано',
            phone: 'не вказано',
            time: new Date().toISOString(),
            email: user.email || 'не вказано',
            website: user.websiteUrl || 'не вказано',
            telegramUsername: user.telegramUsername,
            amount: amountInKopecks,
          });

          return NextResponse.json({ success: true });
        } else if (paymentStatus === 'processing' && tdsUrl) {
          // Requires 3DS verification, return redirect url
          return NextResponse.json({ success: true, redirectUrl: tdsUrl });
        } else {
          // Payment failed
          return NextResponse.json({ error: 'Спроба оплати карткою була неуспішною' }, { status: 400 });
        }
      } catch (err) {
        console.error('Wallet payment resumption failed:', err);
        const message = err instanceof Error ? err.message : 'Помилка при проведенні оплати';
        return NextResponse.json({ error: message }, { status: 500 });
      }
    } else {
      // No card token (e.g. cancelled subscription after period end) -> create invoice for tokenization
      try {
        const invoiceRes = await createInvoice(amountInKopecks, redirectUrl, webHookUrl);
        const { invoiceId, pageUrl } = invoiceRes;

        await db
          .update(subscriptions)
          .set({
            status: 'created',
            lastInvoiceId: invoiceId,
            amount: amountInKopecks,
            currentPeriodEnd: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));

        return NextResponse.json({ success: true, redirectUrl: pageUrl });
      } catch (err) {
        console.error('New invoice creation for resumption failed:', err);
        const message = err instanceof Error ? err.message : 'Помилка створення рахунку';
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Resume subscription API error:', error);
    const message = error instanceof Error ? error.message : 'Внутрішня помилка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
