import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSlotLabels } from "./mhoa-tennis-scraper.ts";

test("normalizeSlotLabels strips trailing digits and dedupes", () => {
  assert.deepEqual(
    normalizeSlotLabels(["09:00 AM-09:45 AM3", "09:00 AM-09:45 AM3", "10:30 AM-11:15 AM1"]),
    ["09:00 AM-09:45 AM", "10:30 AM-11:15 AM"],
  );
});
