import { prisma } from "@/lib/prisma";

export const RETENTION_DAYS = 30;

// No scheduler is wired up yet (see design.md Open Questions) — invoke this
// from a Vercel Cron route or external cron hitting an authenticated endpoint.
export async function purgeExpiredNotes(now: Date = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const { count } = await prisma.note.deleteMany({
    where: { deletedAt: { lt: cutoff } },
  });

  return { purged: count };
}
