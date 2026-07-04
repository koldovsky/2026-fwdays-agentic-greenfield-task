import assert from "node:assert/strict";
import test from "node:test";

import {
  dayDiffFrom,
  getBookableDates,
  getMaxSchedulableDate,
  getMinSchedulableDate,
  getOpensAt,
  isSchedulableDate,
  isWithinBookingWindow,
} from "./tennis-window.ts";

const REF = new Date(2026, 6, 3); // Fri Jul 3 2026

test("isWithinBookingWindow allows days 1-7", () => {
  assert.equal(isWithinBookingWindow("2026-07-04", REF), true);
  assert.equal(isWithinBookingWindow("2026-07-10", REF), true);
  assert.equal(isWithinBookingWindow("2026-07-03", REF), false);
  assert.equal(isWithinBookingWindow("2026-07-11", REF), false);
});

test("getOpensAt for Jul 11 is midnight Jul 4", () => {
  const opens = getOpensAt("2026-07-11");
  assert.equal(opens.getFullYear(), 2026);
  assert.equal(opens.getMonth(), 6);
  assert.equal(opens.getDate(), 4);
  assert.equal(opens.getHours(), 0);
});

test("getBookableDates returns 7 days from ref", () => {
  const dates = getBookableDates(REF, 7);
  assert.equal(dates.length, 7);
  assert.equal(dates[0], "2026-07-04");
  assert.equal(dates[6], "2026-07-10");
});

test("isSchedulableDate allows day 8 through 56", () => {
  assert.equal(isSchedulableDate("2026-07-11", REF), true);
  assert.equal(isSchedulableDate("2026-08-28", REF), true);
  assert.equal(isSchedulableDate("2026-07-10", REF), false);
  assert.equal(isSchedulableDate("2026-08-29", REF), false);
});

test("getMinSchedulableDate is day 8", () => {
  assert.equal(getMinSchedulableDate(REF), "2026-07-11");
});

test("getMaxSchedulableDate is 56 days ahead", () => {
  assert.equal(getMaxSchedulableDate(REF), "2026-08-28");
});

test("dayDiffFrom counts calendar days", () => {
  assert.equal(dayDiffFrom(REF, "2026-07-11"), 8);
});
