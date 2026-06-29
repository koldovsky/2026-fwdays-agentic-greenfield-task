// Plants schema (design D1, D2) — the aggregate root of the tracker.
// The species DB default is the single SPECIES_DEFAULT constant (validation.ts)
// so a no-species insert and a prefilled form agree exactly (design D2, R3).
// The acquired date is a plain `YYYY-MM-DD` text (no native SQLite date type),
// keeping it a pure calendar date with no timezone drift (design D1, SC-1).
//
// Later slices add child tables referencing plants.id ON DELETE CASCADE; this
// slice owns the parent and the cascade DIRECTION (design D5).
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { SPECIES_DEFAULT } from "@/lib/plants/validation";

export const plants = sqliteTable("plants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  species: text("species").notNull().default(SPECIES_DEFAULT),
  acquiredDate: text("acquired_date"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type Plant = typeof plants.$inferSelect;
export type NewPlant = typeof plants.$inferInsert;
