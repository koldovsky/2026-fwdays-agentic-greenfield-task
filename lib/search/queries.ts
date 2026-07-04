import { Prisma } from "@prisma/client";
import type { Note } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SearchFilters = {
  query?: string;
  folderId?: string;
  tagIds?: string[];
  from?: Date;
  to?: Date;
};

const NOTE_COLUMNS = Prisma.sql`
  "Note"."id", "Note"."userId", "Note"."folderId", "Note"."title", "Note"."content",
  "Note"."color", "Note"."isFavorite", "Note"."isPinned", "Note"."deletedAt",
  "Note"."createdAt", "Note"."updatedAt"
`;

export function searchNotes(userId: string, filters: SearchFilters) {
  const { folderId, tagIds, from, to } = filters;
  const query = filters.query?.trim();

  const conditions: Prisma.Sql[] = [
    Prisma.sql`"Note"."userId" = ${userId}`,
    Prisma.sql`"Note"."deletedAt" IS NULL`,
  ];

  if (folderId) {
    conditions.push(Prisma.sql`"Note"."folderId" = ${folderId}`);
  }

  if (tagIds && tagIds.length > 0) {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "NoteTag"
        WHERE "NoteTag"."noteId" = "Note"."id" AND "NoteTag"."tagId" = ANY(${tagIds})
      )`
    );
  }

  if (from) {
    conditions.push(Prisma.sql`"Note"."updatedAt" >= ${from}`);
  }

  if (to) {
    conditions.push(Prisma.sql`"Note"."updatedAt" <= ${to}`);
  }

  if (query) {
    conditions.push(
      Prisma.sql`"Note"."searchVector" @@ websearch_to_tsquery('english', ${query})`
    );
  }

  const orderBy = query
    ? Prisma.sql`ORDER BY ts_rank("Note"."searchVector", websearch_to_tsquery('english', ${query})) DESC, "Note"."updatedAt" DESC`
    : Prisma.sql`ORDER BY "Note"."updatedAt" DESC`;

  return prisma.$queryRaw<Note[]>`
    SELECT ${NOTE_COLUMNS}
    FROM "Note"
    WHERE ${Prisma.join(conditions, " AND ")}
    ${orderBy}
    LIMIT 50
  `;
}
