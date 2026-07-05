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

// Escapes ILIKE wildcards so a query like "50%" or "a_b" is matched literally.
function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// End-of-day (UTC) boundary for an inclusive "to" date filter. Date-only strings
// (e.g. "2026-07-05") parse to UTC midnight, so without this a "to" of today would
// exclude nearly the entire day instead of including it.
function endOfDayUtc(date: Date) {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

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
    conditions.push(Prisma.sql`"Note"."updatedAt" <= ${endOfDayUtc(to)}`);
  }

  if (query) {
    const likePattern = `%${escapeLikePattern(query)}%`;
    conditions.push(
      Prisma.sql`(
        "Note"."searchVector" @@ websearch_to_tsquery('english', ${query})
        OR "Note"."title" ILIKE ${likePattern} ESCAPE '\\'
      )`
    );
  }

  const orderBy = query
    ? Prisma.sql`ORDER BY
        (CASE WHEN "Note"."title" ILIKE ${`%${escapeLikePattern(query)}%`} ESCAPE '\\' THEN 1 ELSE 0 END) DESC,
        ts_rank("Note"."searchVector", websearch_to_tsquery('english', ${query})) DESC,
        "Note"."updatedAt" DESC`
    : Prisma.sql`ORDER BY "Note"."updatedAt" DESC`;

  return prisma.$queryRaw<Note[]>`
    SELECT ${NOTE_COLUMNS}
    FROM "Note"
    WHERE ${Prisma.join(conditions, " AND ")}
    ${orderBy}
    LIMIT 50
  `;
}
