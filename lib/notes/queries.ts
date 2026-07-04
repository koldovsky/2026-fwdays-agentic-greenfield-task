import { prisma } from "@/lib/prisma";

export function listActiveNotes(userId: string) {
  return prisma.note.findMany({
    where: { userId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
}

export function listTrashedNotes(userId: string) {
  return prisma.note.findMany({
    where: { userId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });
}
