import { prisma } from "@/lib/prisma";

export function listFolders(userId: string) {
  return prisma.folder.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export function getOwnedFolder(userId: string, id: string) {
  return prisma.folder.findFirst({
    where: { id, userId },
  });
}
