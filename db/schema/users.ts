import { pgTable, uuid, varchar, bigint, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  telegramId: bigint('telegram_id', { mode: 'bigint' }).unique().notNull(),
  telegramUsername: varchar('telegram_username', { length: 255 }),
  email: varchar('email', { length: 255 }).unique(),
  websiteUrl: varchar('website_url', { length: 255 }),
  apiKeyHash: varchar('api_key_hash', { length: 64 }).unique().notNull(),
  crmUrl: varchar('crm_url', { length: 512 }),
  crmLogin: varchar('crm_login', { length: 255 }),
  crmPassword: varchar('crm_password', { length: 1024 }), // Persisted as iv_hex:auth_tag_hex:ciphertext_hex
  telephonyUrl: varchar('telephony_url', { length: 512 }),
  telephonyLogin: varchar('telephony_login', { length: 255 }),
  telephonyPassword: varchar('telephony_password', { length: 1024 }), // Persisted as iv_hex:auth_tag_hex:ciphertext_hex
  telephonyApiKey: varchar('telephony_api_key', { length: 1024 }), // Persisted as iv_hex:auth_tag_hex:ciphertext_hex
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});
