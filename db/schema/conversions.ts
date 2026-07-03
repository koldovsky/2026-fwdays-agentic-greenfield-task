import { pgTable, uuid, varchar, boolean, numeric, timestamp, date, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const conversions = pgTable('conversions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  date: date('date').notNull(),
  conversionTime: timestamp('conversion_time', { withTimezone: true, mode: 'date' }).notNull(),
  conversionName: varchar('conversion_name', { length: 255 }).notNull(),
  isAdConversion: boolean('is_ad_conversion').notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 255 }),
  conversionValue: numeric('conversion_value', { precision: 10, scale: 2 }),
  orderId: varchar('order_id', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  adSource: varchar('ad_source', { length: 255 }),
  channel: varchar('channel', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => {
  return {
    idxConversionsUserIdConversionTime: index('idx_conversions_user_id_conversion_time').on(table.userId, table.conversionTime),
    idxConversionsConversionTime: index('idx_conversions_conversion_time').on(table.conversionTime),
  };
});
