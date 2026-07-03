import { pgTable, uuid, varchar, integer, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const tariffPlanEnum = pgEnum('tariff_plan', ['monthly', 'yearly']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['created', 'active', 'paused', 'suspended', 'cancelled']);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tariffPlan: tariffPlanEnum('tariff_plan').notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  walletId: varchar('wallet_id', { length: 255 }),
  cardToken: varchar('card_token', { length: 255 }),
  amount: integer('amount'), // in minor units (kopecks)
  currency: varchar('currency', { length: 3 }).default('980').notNull(),
  lastInvoiceId: varchar('last_invoice_id', { length: 255 }),
  autoRenew: boolean('auto_renew').default(true).notNull(),
  failedAttemptsCount: integer('failed_attempts_count').default(0).notNull(),
  lastFailedAttemptAt: timestamp('last_failed_attempt_at', { withTimezone: true, mode: 'date' }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

