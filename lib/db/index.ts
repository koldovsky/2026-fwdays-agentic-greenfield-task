import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * The one shared Prisma client for Kolo360 (TC-STACK-04). All database access
 * goes through `db`; nothing instantiates its own client.
 *
 * Prisma 7 connects through a driver adapter rather than a datasource url, so
 * the pooled `DATABASE_URL` is wired here via `@prisma/adapter-pg`. The pool is
 * lazy — no connection opens until a query runs — so importing this module is
 * safe during build with no database provisioned yet.
 *
 * The instance is cached on `globalThis` in development so Next's hot reload
 * reuses one client instead of leaking a new pool per reload. The global is
 * typed via `declare global`, so no cast or `@ts-ignore` is needed (TC-TS-01).
 */
declare global {
  // A global cache var must be declared with `var` to augment globalThis.
  var prismaClient: PrismaClient | undefined;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const db = globalThis.prismaClient ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = db;
}
