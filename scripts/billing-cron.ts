import { db } from '../db';
import { subscriptions, users } from '../db/schema';
import { eq, lte } from 'drizzle-orm';
import { getExchangeRate, executeWalletPayment, deleteCard } from '../lib/monobank';
import { sendAdminAlert, sendUserAlert } from '../lib/notifications';

export async function runBillingCron() {
  const now = new Date();
  console.log(`Starting billing cron run at ${now.toISOString()}...`);

  try {
    // Find subscriptions that have expired (currentPeriodEnd <= now)
    const expiredSubs = await db
      .select()
      .from(subscriptions)
      .where(lte(subscriptions.currentPeriodEnd, now));

    console.log(`Found ${expiredSubs.length} expired subscriptions to process.`);

    for (const sub of expiredSubs) {
      console.log(`Processing subscription ID: ${sub.id}, userId: ${sub.userId}, status: ${sub.status}`);

      // Lookup user
      const userList = await db
        .select()
        .from(users)
        .where(eq(users.id, sub.userId))
        .limit(1);
      if (userList.length === 0) {
        console.error(`User not found for subscription ${sub.id}`);
        continue;
      }
      const user = userList[0];

      // A. Active subscription with autoRenew = true (needs billing or retry)
      if (sub.status === 'active' && sub.autoRenew) {
        // Skip retry if last failed attempt was within the last 24 hours
        if (sub.lastFailedAttemptAt) {
          const hoursSinceLastFail = (now.getTime() - sub.lastFailedAttemptAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastFail < 24) {
            console.log(`Skipping subscription ${sub.id} - last failure was ${hoursSinceLastFail.toFixed(1)} hours ago (retry interval is 24h).`);
            continue;
          }
        }

        console.log(`Attempting billing charge for subscription ${sub.id}...`);

        if (!sub.cardToken) {
          console.error(`No card token stored for active subscription ${sub.id}. Suspending subscription.`);
          await db
            .update(subscriptions)
            .set({
              status: 'suspended',
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, sub.id));
          await sendUserAlert(user.telegramId, 'suspended_cancelled');
          continue;
        }

        // Calculate dynamic payment amount
        const exchangeRate = await getExchangeRate();
        const usdPrice = sub.tariffPlan === 'monthly' ? 10.99 : 120.00;
        const amountInKopecks = Math.round(usdPrice * exchangeRate * 100);

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const webHookUrl = process.env.MONOBANK_WEBHOOK_URL || `${appUrl}/api/billing/webhook`;
        const redirectUrl = `${appUrl}/dashboard`;

        try {
          const paymentRes = await executeWalletPayment(
            sub.cardToken,
            amountInKopecks,
            redirectUrl,
            webHookUrl
          );

          const { invoiceId, status: paymentStatus } = paymentRes;

          // Store lastInvoiceId and amount
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
                currentPeriodEnd: newPeriodEnd,
                failedAttemptsCount: 0,
                lastFailedAttemptAt: null,
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.id, sub.id));

            // Notify admin
            await sendAdminAlert({
              event: 'Платіж отримано',
              name: 'не вказано',
              phone: 'не вказано',
              time: new Date().toISOString(),
              email: user.email || 'не вказано',
              website: user.websiteUrl || 'не вказано',
              telegramUsername: user.telegramUsername,
              amount: amountInKopecks,
            });

            console.log(`Successfully charged subscription ${sub.id}.`);
          } else {
            throw new Error(`Payment returned status ${paymentStatus}`);
          }
        } catch (paymentErr) {
          console.error(`Charge failed for subscription ${sub.id}:`, paymentErr);

          const nextAttemptsCount = sub.failedAttemptsCount + 1;

          if (nextAttemptsCount <= 2) {
            // Retries left, update stats and keep active
            await db
              .update(subscriptions)
              .set({
                failedAttemptsCount: nextAttemptsCount,
                lastFailedAttemptAt: now,
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.id, sub.id));

            // Notify user
            await sendUserAlert(user.telegramId, 'payment_failed');
            console.log(`Failed charge recorded. Attempt count: ${nextAttemptsCount}. Scheduled next retry.`);
          } else {
            // 2 retries exhausted, suspend subscription
            await db
              .update(subscriptions)
              .set({
                status: 'suspended',
                failedAttemptsCount: nextAttemptsCount,
                lastFailedAttemptAt: now,
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.id, sub.id));

            // Notify user
            await sendUserAlert(user.telegramId, 'suspended_cancelled');
            console.log(`Retries exhausted for subscription ${sub.id}. Status set to suspended.`);
          }
        }
      }
      // B. Active subscription with autoRenew = false (period end reached -> transition to paused)
      else if (sub.status === 'active' && !sub.autoRenew) {
        await db
          .update(subscriptions)
          .set({
            status: 'paused',
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));

        // Notify user about paused status
        await sendUserAlert(user.telegramId, 'paused');
        console.log(`Subscription ${sub.id} transitioned to paused status.`);
      }
      // C. Cancelled subscription (period end reached -> delete token)
      else if (sub.status === 'cancelled') {
        if (sub.cardToken) {
          try {
            await deleteCard(sub.cardToken);
            console.log(`Successfully deleted card token from Monobank for subscription ${sub.id}.`);
          } catch (deleteErr) {
            console.error(`Failed to delete card token from Monobank for subscription ${sub.id}:`, deleteErr);
          }
        }

        // Clear cardToken and walletId from database
        await db
          .update(subscriptions)
          .set({
            cardToken: null,
            walletId: null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));

        // Notify user about cancellation
        await sendUserAlert(user.telegramId, 'suspended_cancelled');
        console.log(`Subscription ${sub.id} card token cleared and cancellation completed.`);
      }
    }
  } catch (cronErr) {
    console.error('Error during billing cron execution:', cronErr);
  }
}

if (require.main === module) {
  runBillingCron()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
