#!/usr/bin/env node
/**
 * Enforce capability dependency gates before starting or applying work.
 *
 * Usage:
 *   node scripts/check-capability-gates.mjs
 *   node scripts/check-capability-gates.mjs --capability form-input
 *   node scripts/check-capability-gates.mjs --capability export-share --gate pdf
 *   node scripts/check-capability-gates.mjs --list
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAP_PATH = join(__dirname, "..", "openspec", "capability-map.yaml");

const SHIPPED = "shipped";

function loadMap() {
  const raw = readFileSync(MAP_PATH, "utf8");
  return parseYaml(raw);
}

function parseArgs(argv) {
  const args = { capability: null, gate: null, list: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--capability" || arg === "-c") {
      args.capability = argv[++i];
    } else if (arg === "--gate" || arg === "-g") {
      args.gate = argv[++i];
    } else if (arg === "--list" || arg === "-l") {
      args.list = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run capability:check
  npm run capability:check -- --capability <id>
  npm run capability:check -- --capability export-share --gate pdf
  npm run capability:check -- --list

Options:
  -c, --capability <id>   Check whether this capability is unblocked
  -g, --gate <name>       Optional sub-gate (e.g. export-share.preview)
  -l, --list              Print capability status table
  --json                  Machine-readable output
`);
}

function resolveDependsOn(map, capabilityId, gateName) {
  const capability = map.capabilities[capabilityId];
  if (!capability) {
    throw new Error(`Unknown capability: ${capabilityId}`);
  }

  if (gateName) {
    const gateKey = gateName.includes(".") ? gateName.split(".").pop() : gateName;
    const gates = capability.gates ?? {};
    const gate = gates[gateKey];
    if (!gate) {
      throw new Error(`Unknown gate "${gateName}" on capability "${capabilityId}"`);
    }
    return gate.depends_on ?? [];
  }

  return capability.depends_on ?? [];
}

function normalizeDep(dep) {
  const [capabilityId, gateName] = dep.split(".");
  return { capabilityId, gateName: gateName ?? null };
}

function isDependencySatisfied(map, dep) {
  const { capabilityId, gateName } = normalizeDep(dep);
  const capability = map.capabilities[capabilityId];
  if (!capability) {
    return { ok: false, reason: `missing capability "${capabilityId}" in map` };
  }

  if (gateName) {
    const gate = capability.gates?.[gateName];
    if (!gate) {
      return { ok: false, reason: `missing gate "${capabilityId}.${gateName}"` };
    }
    const gateStatus = gate.status ?? capability.status;
    if (gateStatus !== SHIPPED) {
      return {
        ok: false,
        reason: `gate "${capabilityId}.${gateName}" is ${gateStatus ?? "not_started"}`,
      };
    }
    return { ok: true };
  }

  if (capability.status !== SHIPPED) {
    return {
      ok: false,
      reason: `capability "${capabilityId}" is ${capability.status}`,
    };
  }
  return { ok: true };
}

function checkCapability(map, capabilityId, gateName) {
  const capability = map.capabilities[capabilityId];
  if (!capability) {
    return {
      ok: false,
      capability: capabilityId,
      gate: gateName,
      blockers: [`unknown capability "${capabilityId}"`],
    };
  }

  const dependsOn = resolveDependsOn(map, capabilityId, gateName);
  const blockers = [];

  for (const dep of dependsOn) {
    const result = isDependencySatisfied(map, dep);
    if (!result.ok) {
      blockers.push(result.reason);
    }
  }

  return {
    ok: blockers.length === 0,
    capability: capabilityId,
    gate: gateName,
    depends_on: dependsOn,
    blockers,
    owner: capability.owner,
    status: capability.status,
  };
}

function listCapabilities(map) {
  const rows = Object.entries(map.capabilities).map(([id, cap]) => ({
    id,
    owner: cap.owner,
    status: cap.status,
    depends_on: (cap.depends_on ?? []).join(", ") || "—",
    blocks: (cap.blocks ?? []).join(", ") || "—",
  }));

  const idWidth = Math.max(2, ...rows.map((r) => r.id.length));
  const ownerWidth = Math.max(5, ...rows.map((r) => r.owner.length));

  console.log(
    `${"id".padEnd(idWidth)}  ${"owner".padEnd(ownerWidth)}  status         depends_on`,
  );
  for (const row of rows) {
    console.log(
      `${row.id.padEnd(idWidth)}  ${row.owner.padEnd(ownerWidth)}  ${row.status.padEnd(13)}  ${row.depends_on}`,
    );
  }

  console.log("\nSlices (execute in order):");
  for (const slice of map.slices) {
    console.log(`  ${slice.id}: ${slice.title} → ${slice.capabilities.join(", ")}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const map = loadMap();

  if (args.list) {
    listCapabilities(map);
    process.exit(0);
  }

  if (!args.capability) {
    const notShipped = Object.entries(map.capabilities)
      .filter(([, cap]) => cap.status !== SHIPPED)
      .map(([id]) => id);

    const unblocked = notShipped.filter((id) => checkCapability(map, id).ok);
    const result = {
      mode: "suggest-next",
      unblocked,
      next_unblocked: unblocked[0] ?? null,
      not_shipped: notShipped,
    };

    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (unblocked.length > 0) {
      console.log("Unblocked capabilities (pick one):");
      for (const id of unblocked) {
        const cap = map.capabilities[id];
        console.log(`  - ${id} (owner: ${cap.owner}) → ${cap.spec}`);
      }
    } else {
      console.log("No unblocked capabilities remain, or all are shipped.");
      listCapabilities(map);
    }
    process.exit(0);
  }

  const result = checkCapability(map, args.capability, args.gate);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    const label = args.gate ? `${result.capability}.${args.gate}` : result.capability;
    console.log(`OK: "${label}" is unblocked (owner: ${result.owner}).`);
  } else {
    const label = args.gate ? `${result.capability}.${args.gate}` : result.capability;
    console.error(`BLOCKED: cannot start "${label}" yet.`);
    console.error(`Owner: ${result.owner}`);
    console.error("Blockers:");
    for (const blocker of result.blockers) {
      console.error(`  - ${blocker}`);
    }
    console.error("\nDepends on:");
    for (const dep of result.depends_on) {
      console.error(`  - ${dep}`);
    }
  }

  process.exit(result.ok ? 0 : 1);
}

main();
