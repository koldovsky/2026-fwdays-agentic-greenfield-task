import { prisma } from "@/lib/prisma";

export function listTags(userId: string) {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export function getOwnedTag(userId: string, id: string) {
  return prisma.tag.findFirst({
    where: { id, userId },
  });
}
