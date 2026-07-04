import assert from "node:assert/strict";
import test from "node:test";

import {
  consecutiveRunFrom,
  filterSlotsStartingConsecutiveRun,
  formatAggregatedSlotLabel,
  generateTennisSlotLabels,
  nextConsecutiveSlot,
  parseSlotStartMinutes,
  pickDefaultSlot,
  slotInWindow,
  slotsAreConsecutive,
  stubTennisAvailability,
} from "./availability.ts";

test("parseSlotStartMinutes parses AM slot", () => {
  assert.equal(parseSlotStartMinutes("9:00 AM-9:45 AM"), 9 * 60);
});

test("slotInWindow matches parsed window", () => {
  assert.equal(slotInWindow("10:30 AM-11:15 AM", "09:00", "12:00"), true);
  assert.equal(slotInWindow("1:00 PM-1:45 PM", "09:00", "12:00"), false);
});

test("pickDefaultSlot prefers in-window slot on preferred court", () => {
  const data = stubTennisAvailability("2026-07-08");
  assert.equal(data.status, "ok");
  if (data.status !== "ok") return;
  const pick = pickDefaultSlot(data.courts, "09:00", "12:00", "West Court");
  assert.ok(pick);
  assert.equal(pick!.court, "West Court");
  assert.match(pick!.slot, /AM/);
});

test("stubTennisAvailability returns both courts", () => {
  const data = stubTennisAvailability("2026-07-08");
  assert.equal(data.status, "ok");
  if (data.status !== "ok") return;
  assert.equal(data.courts.length, 2);
  assert.equal(data.courts[0].court, "East Court");
  assert.equal(data.courts[1].court, "West Court");
  assert.ok(data.courts[0].slots.length > 0);
});

test("slotsAreConsecutive detects back-to-back MHOA slots", () => {
  assert.equal(slotsAreConsecutive("9:00 AM-9:45 AM", "9:45 AM-10:30 AM"), true);
  assert.equal(slotsAreConsecutive("9:00 AM-9:45 AM", "10:30 AM-11:15 AM"), false);
});

test("consecutiveRunFrom returns two slots in a row", () => {
  const slots = ["9:00 AM-9:45 AM", "9:45 AM-10:30 AM", "1:00 PM-1:45 PM"];
  assert.deepEqual(consecutiveRunFrom(slots, "9:00 AM-9:45 AM", 2), [
    "9:00 AM-9:45 AM",
    "9:45 AM-10:30 AM",
  ]);
  assert.deepEqual(consecutiveRunFrom(slots, "9:45 AM-10:30 AM", 2), []);
  assert.deepEqual(consecutiveRunFrom(slots, "1:00 PM-1:45 PM", 2), []);
});

test("filterSlotsStartingConsecutiveRun hides gaps", () => {
  const slots = ["9:00 AM-9:45 AM", "9:45 AM-10:30 AM", "1:00 PM-1:45 PM"];
  assert.deepEqual(filterSlotsStartingConsecutiveRun(slots, 2), ["9:00 AM-9:45 AM"]);
  assert.equal(nextConsecutiveSlot(slots, "9:45 AM-10:30 AM"), null);
});

test("formatAggregatedSlotLabel spans first start to last end", () => {
  const run = ["9:00 AM-9:45 AM", "9:45 AM-10:30 AM"];
  assert.equal(formatAggregatedSlotLabel(run), "9:00 AM - 10:30 AM");
  const three = ["9:00 AM-9:45 AM", "9:45 AM-10:30 AM", "10:30 AM-11:15 AM"];
  assert.equal(formatAggregatedSlotLabel(three), "9:00 AM - 11:15 AM");
});

test("generateTennisSlotLabels covers 9 AM through 9 PM", () => {
  const labels = generateTennisSlotLabels();
  assert.equal(labels[0], "9:00 AM-9:45 AM");
  assert.match(labels.at(-1)!, /9:00 PM-9:45 PM/);
  assert.equal(labels.length, 17);
});
