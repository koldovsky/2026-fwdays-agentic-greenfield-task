// Watering events schema (design D1, D4) — the SECOND child of the plant
// aggregate. One watering belongs to exactly one plant; the FK declares
// `onDelete: "cascade"`, realizing the cascade DIRECTION slice 2 owns (growth was
// the first): deleting a plant removes its waterings at the DB level (atomic,
// unbypassable). A watering delete removes only its own row (SC-5).
//
// `wateredOn` is a plain ISO `YYYY-MM-DD` text (SC-1) — SQLite has no native date
// type and a string keeps it a pure calendar date with no timezone drift. `note`
// is the one nullable column: it is OPTIONAL (FR-WATER-02), so its absence is
// modelled as SQL `NULL` (not `""`). There is intentionally NO amount column
// (FR-WATER-06 is Future).
//
// @trace FR-WATER-01
// @trace FR-WATER-02
// @trace SC-3
// @trace SC-5
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { plants } from "@/db/schema/plants";

export const wateringEvents = sqliteTable("watering_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plantId: integer("plant_id")
    .notNull()
    .references(() => plants.id, { onDelete: "cascade" }),
  wateredOn: text("watered_on").notNull(),
  note: text("note"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type Watering = typeof wateringEvents.$inferSelect;
export type NewWatering = typeof wateringEvents.$inferInsert;
