import { PrismaClient } from '@prisma/client';

// Pin the pool small. The host's Postgres is capped at max_connections=20 and co-resident with
// another project's MySQL (invariant #7); Prisma's default pool (num_cpus*2+1) could exceed that on
// a multi-core box. Cap it explicitly unless the URL already sets connection_limit.
const withConnectionLimit = (url: string | undefined): string | undefined => {
  if (!url || url.includes('connection_limit=')) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=5`;
};

const datasourceUrl = withConnectionLimit(process.env.DATABASE_URL);

// Single pooled client for the whole process. A global cache prevents `tsx watch` hot-reloads from
// spawning duplicate clients (and duplicate pools) in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
