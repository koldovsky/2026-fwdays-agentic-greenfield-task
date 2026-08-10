import { db } from '../db';
import { subscriptions, users } from '../db/schema';
import { eq, lte } from 'drizzle-orm';
import { executeWalletPayment, deleteCard, getInvoiceStatus } from '../lib/monobank';
import { getPricingDetails } from '../lib/pricing';
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
      try {
        console.log(`Processing subscription ID: ${sub.id}, userId: ${sub.userId}, status: ${sub.status}`);

        // Lookup user
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

          // Check if there is an invoice from the current period that is still pending or was already successful
          if (sub.lastInvoiceId) {
            try {
              console.log(`Checking status of last invoice ${sub.lastInvoiceId} for subscription ${sub.id}...`);
              const statusRes = await getInvoiceStatus(sub.lastInvoiceId);
              const invoiceCreated = statusRes.createdDate ? new Date(statusRes.createdDate) : null;

              // Only check invoice if it was created for the current expiration period (i.e. after currentPeriodEnd)
              if (invoiceCreated && invoiceCreated.getTime() > sub.currentPeriodEnd.getTime()) {
                const actualStatus = statusRes.status;
                
                if (actualStatus === 'success') {
                  console.log(`Last invoice ${sub.lastInvoiceId} was successful. Upgrading period.`);
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

                  await sendAdminAlert({
                    event: 'Платіж отримано',
                    name: 'не вказано',
                    phone: 'не вказано',
                    time: new Date().toISOString(),
                    email: user.email || 'не вказано',
                    website: user.websiteUrl || 'не вказано',
                    telegramUsername: user.telegramUsername || 'не вказано',
                    amount: sub.amount || undefined,
                  });
                  continue;
                } else if (actualStatus === 'processing' || actualStatus === 'created' || actualStatus === 'hold') {
                  console.log(`Last invoice ${sub.lastInvoiceId} is still pending (${actualStatus}). Deferring new charge.`);
                  continue;
                } else {
                  console.log(`Last invoice ${sub.lastInvoiceId} failed with status: ${actualStatus}. Recording failure.`);
                  const nextAttemptsCount = sub.failedAttemptsCount + 1;

                  if (nextAttemptsCount <= 2) {
                    await db
                      .update(subscriptions)
                      .set({
                        failedAttemptsCount: nextAttemptsCount,
                        lastFailedAttemptAt: now,
                        updatedAt: new Date(),
                      })
                      .where(eq(subscriptions.id, sub.id));

                    await sendUserAlert(user.telegramId, 'payment_failed');
                    console.log(`Failed charge recorded via status check. Attempt count: ${nextAttemptsCount}. Scheduled next retry.`);
                  } else {
                    await db
                      .update(subscriptions)
                      .set({
                        status: 'suspended',
                        failedAttemptsCount: nextAttemptsCount,
                        lastFailedAttemptAt: now,
                        updatedAt: new Date(),
                      })
                      .where(eq(subscriptions.id, sub.id));

                    await sendUserAlert(user.telegramId, 'suspended_cancelled');
                    console.log(`Retries exhausted via status check for subscription ${sub.id}. Status set to suspended.`);
                  }
                  continue;
                }
              } else {
                console.log(`Last invoice ${sub.lastInvoiceId} belongs to a previous billing period. Proceeding with new charge.`);
              }
            } catch (err) {
              console.error(`Failed to verify status of last invoice ${sub.lastInvoiceId}:`, err);
              continue; // Skip this cron iteration for safety
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
          const { amountInKopecks, redirectUrl, webHookUrl } = await getPricingDetails(sub.tariffPlan);

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
                telegramUsername: user.telegramUsername || 'не вказано',
                amount: amountInKopecks,
              });


              console.log(`Successfully charged subscription ${sub.id}.`);
            } else if (paymentStatus === 'processing') {
              console.log(`Payment status is processing for subscription ${sub.id}. Leaving subscription in pending/unchanged state.`);
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
          if (!sub.cardToken) {
            console.log(`Subscription ${sub.id} is cancelled and has already been processed (no card token). Skipping.`);
            continue;
          }

          try {
            await deleteCard(sub.cardToken);
            console.log(`Successfully deleted card token from Monobank for subscription ${sub.id}.`);
          } catch (deleteErr) {
            console.error(`Failed to delete card token from Monobank for subscription ${sub.id}:`, deleteErr);
          }

          // Clear cardToken and walletId from database, and set currentPeriodEnd to far future to make it non-eligible for expired query
          await db
            .update(subscriptions)
            .set({
              cardToken: null,
              walletId: null,
              currentPeriodEnd: new Date('9999-12-31T00:00:00Z'),
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, sub.id));

          // Notify user about cancellation
          await sendUserAlert(user.telegramId, 'suspended_cancelled');
          console.log(`Subscription ${sub.id} card token cleared and cancellation completed.`);
        }
      } catch (err) {
        console.error(`Failed to process subscription ${sub.id}:`, err);
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
