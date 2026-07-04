import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/monobank';
import { db } from '@/db';
import { subscriptions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendAdminAlert, sendUserAlert } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const xSign = req.headers.get('X-Sign');
    const rawBody = await req.text();

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(xSign, rawBody);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Некоректний підпис' }, { status: 400 });
    }

    // Parse the verified JSON payload
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Некоректний JSON' }, { status: 400 });
    }

    const { invoiceId, status, walletData, amount, modifiedDate, paymentInfo } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Відсутній invoiceId' }, { status: 400 });
    }

    // Lookup subscription by invoiceId matching lastInvoiceId
    const existingSubs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.lastInvoiceId, invoiceId))
      .limit(1);

    if (existingSubs.length === 0) {
      console.warn(`Subscription not found for invoiceId: ${invoiceId}`);
      return NextResponse.json({ error: 'Підписку не знайдено' }, { status: 404 });
    }

    const sub = existingSubs[0];

    // If status is not success, return 200 OK.
    if (status !== 'success') {
      console.log(`Webhook received non-success status: ${status} for invoiceId: ${invoiceId}`);
      return NextResponse.json({ ok: true });
    }

    // Idempotency Check: if status is already active for this invoiceId, return success immediately
    if (sub.status === 'active' && sub.lastInvoiceId === invoiceId) {
      return NextResponse.json({ ok: true });
    }

    // Extract walletData if present
    const cardToken = walletData?.cardToken || sub.cardToken;
    const walletId = walletData?.walletId || sub.walletId;

    // Fetch user details for notification
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.id, sub.userId))
      .limit(1);

    let user = userList[0];
    if (userList.length === 0) {
      console.warn(`User profile not found in database for ID: ${sub.userId}`);
      user = {
        id: sub.userId,
        email: 'не знайдено',
        websiteUrl: 'не знайдено',
        telegramUsername: 'не знайдено',
        telegramId: null,
      } as unknown as typeof users.$inferSelect;
    }

    // Calculate new period end date
    const intervalMonths = sub.tariffPlan === 'yearly' ? 12 : 1;
    const newPeriodEnd = new Date();
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + intervalMonths);

    const isInitialActivation = !sub.cardToken;

    // Update database
    await db
      .update(subscriptions)
      .set({
        status: 'active',
        cardToken,
        walletId,
        currentPeriodEnd: newPeriodEnd,
        failedAttemptsCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    // Get name, phone, and time from webhook payload
    const clientName = paymentInfo?.clientName || paymentInfo?.name || body.clientName || 'не вказано';
    const phone = paymentInfo?.phone || body.phone || 'не вказано';
    const transactionTime = modifiedDate || new Date().toISOString();

    // Send Telegram Admin Alert
    await sendAdminAlert({
      event: isInitialActivation ? 'Нова підписка' : 'Платіж отримано',
      name: clientName,
      phone,
      time: transactionTime,
      email: user.email || 'не вказано',
      website: user.websiteUrl || 'не вказано',
      telegramUsername: user.telegramUsername || 'не вказано',
      amount: amount || sub.amount || undefined,
    });


    // Send user notification (welcome if initial activation)
    if (isInitialActivation) {
      await sendUserAlert(user.telegramId, 'welcome');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Внутрішня помилка';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
