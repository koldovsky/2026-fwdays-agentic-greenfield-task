// Growth measurements schema (design D1, D4) — the FIRST child of the plant
// aggregate. One measurement belongs to exactly one plant; the FK declares
// `onDelete: "cascade"`, realizing the cascade DIRECTION slice 2 owns: deleting
// a plant removes its measurements at the DB level (atomic, unbypassable). A
// measurement delete removes only its own row (SC-5).
//
// `heightCm` is stored as a number (REAL) per design D2 — the chart slice (5)
// needs a true numeric axis and a number sorts/compares without re-parsing.
// `measuredOn` is a plain ISO `YYYY-MM-DD` text (SC-1) — SQLite has no native
// date type and a string keeps it a pure calendar date with no timezone drift.
//
// @trace FR-GROWTH-01
// @trace SC-3
// @trace SC-5
import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { plants } from "@/db/schema/plants";

export const growthMeasurements = sqliteTable("growth_measurements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plantId: integer("plant_id")
    .notNull()
    .references(() => plants.id, { onDelete: "cascade" }),
  heightCm: real("height_cm").notNull(),
  measuredOn: text("measured_on").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type Measurement = typeof growthMeasurements.$inferSelect;
export type NewMeasurement = typeof growthMeasurements.$inferInsert;
