import { prisma } from "@/lib/prisma";

export function listActiveNotes(userId: string) {
  return prisma.note.findMany({
    where: { userId, deletedAt: null, isArchived: false },
    orderBy: { updatedAt: "desc" },
  });
}

export function listTrashedNotes(userId: string) {
  return prisma.note.findMany({
    where: { userId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });
}

export function listFavoriteNotes(userId: string) {
  return prisma.note.findMany({
    where: { userId, deletedAt: null, isFavorite: true },
    orderBy: { updatedAt: "desc" },
  });
}

export function listPinnedNotes(userId: string) {
  return prisma.note.findMany({
    where: { userId, deletedAt: null, isPinned: true },
    orderBy: { updatedAt: "desc" },
  });
}

export function listArchivedNotes(userId: string) {
  return prisma.note.findMany({
    where: { userId, deletedAt: null, isArchived: true },
    orderBy: { updatedAt: "desc" },
  });
}

export function getOwnedNote(userId: string, id: string) {
  return prisma.note.findFirst({
    where: { id, userId, deletedAt: null },
    include: { tags: { include: { tag: true } } },
  });
}

export function listNotesByFolder(userId: string, folderId: string) {
  return prisma.note.findMany({
    where: { userId, folderId, deletedAt: null, isArchived: false },
    orderBy: { updatedAt: "desc" },
  });
}

export function listNotesByTag(userId: string, tagId: string) {
  return prisma.note.findMany({
    where: {
      userId,
      deletedAt: null,
      isArchived: false,
      tags: { some: { tagId } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
