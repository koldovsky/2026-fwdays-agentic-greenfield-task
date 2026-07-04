-- Generated tsvector column for full-text search (title weighted above content),
-- with a GIN index. Not modeled in schema.prisma: Prisma's Unsupported() type can't
-- express a GENERATED ALWAYS ... STORED column or a GIN index, so this column is
-- written by hand and only ever queried via prisma.$queryRaw.
ALTER TABLE "Note" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("content", '')), 'B')
  ) STORED;

CREATE INDEX "Note_searchVector_idx" ON "Note" USING GIN ("searchVector");