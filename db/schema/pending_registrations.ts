import { pgTable, uuid, varchar, bigint, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const pendingRegistrations = pgTable('pending_registrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: uuid('token').defaultRandom().unique().notNull(),
  telegramId: bigint('telegram_id', { mode: 'bigint' }),
  telegramUsername: varchar('telegram_username', { length: 255 }),
  email: varchar('email', { length: 255 }),
  websiteUrl: varchar('website_url', { length: 255 }),
  isCompleted: boolean('is_completed').default(false).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => {
  return {
    idxPendingRegistrationsTelegramId: index('idx_pending_registrations_telegram_id').on(table.telegramId),
  };
});
