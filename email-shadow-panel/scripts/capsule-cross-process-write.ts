import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { sealSessionCapsule } from "../server/providers/emailnator/capsule.server.ts";
import { createEmptyProviderState } from "../server/providers/emailnator/provider.server.ts";

const outputPath = resolve(process.cwd(), ".local/phase0/cross-process-capsule.json");
const secret = "phase0-cross-process-secret";
const address = "shadow.panel.001@gmail.com";
const state = { ...createEmptyProviderState(), address };
const capsule = sealSessionCapsule(state, secret, { now: new Date("2026-07-05T12:00:00.000Z") });

mkdirSync(resolve(process.cwd(), ".local/phase0"), { recursive: true });
writeFileSync(outputPath, JSON.stringify({ capsule, secret, address }), "utf8");
console.log(`Prepared cross-process capsule fixture at ${outputPath}`);
