import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { openSessionCapsule } from "../server/providers/emailnator/capsule.server.ts";

const inputPath = resolve(process.cwd(), ".local/phase0/cross-process-capsule.json");
const payload = JSON.parse(readFileSync(inputPath, "utf8")) as {
  capsule: string;
  secret: string;
  address: string;
};
const restored = openSessionCapsule(payload.capsule, payload.secret, {
  now: new Date("2026-07-05T12:05:00.000Z"),
});

assert.equal(restored.address, payload.address);
console.log("Cross-process capsule restoration passed in a fresh Node process.");
