import assert from "node:assert/strict";
import test from "node:test";

import { parseResidentIds } from "./parse-residents.ts";

test("parseResidentIds finds Max, Nataliia, and Yurii", () => {
  const ids = parseResidentIds("book for Max and Nataliia next Saturday 9 AM");
  assert.deepEqual(ids.sort(), ["max", "nataliia"]);
  assert.deepEqual(parseResidentIds("Yurii wants tennis Tuesday").sort(), ["yurii"]);
});

test("parseResidentIds defaults empty", () => {
  assert.deepEqual(parseResidentIds("Friday morning tennis"), []);
});
