#!/usr/bin/env node
// Generates src/data/pokemon-index.json at build time.
// Run via: node scripts/generate-pokemon-index.mjs

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "../src/data/pokemon-index.json");
const BASE = "https://pokeapi.co/api/v2";
const BATCH = 50;

const GENERATION_NUMBER = {
  "generation-i": 1,
  "generation-ii": 2,
  "generation-iii": 3,
  "generation-iv": 4,
  "generation-v": 5,
  "generation-vi": 6,
  "generation-vii": 7,
  "generation-viii": 8,
  "generation-ix": 9,
};

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

function idFromUrl(url) {
  const parts = url.replace(/\/$/, "").split("/");
  return Number(parts[parts.length - 1]);
}

async function fetchEntry(id) {
  const [pokemon, species] = await Promise.all([
    fetchJSON(`${BASE}/pokemon/${id}`),
    fetchJSON(`${BASE}/pokemon-species/${id}`),
  ]);
  return {
    id: pokemon.id,
    name: pokemon.name,
    types: pokemon.types.map((t) => t.type.name),
    generation: GENERATION_NUMBER[species.generation.name] ?? 0,
    isLegendary: species.is_legendary,
    isMythical: species.is_mythical,
  };
}

async function main() {
  console.log("Fetching Pokémon list…");
  const list = await fetchJSON(`${BASE}/pokemon?limit=1025&offset=0`);
  const ids = list.results.map((e) => idFromUrl(e.url));
  console.log(`Fetched ${ids.length} entries. Building index in batches of ${BATCH}…`);

  const index = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const entries = await Promise.all(batch.map(fetchEntry));
    index.push(...entries);
    process.stdout.write(`\r  ${index.length}/${ids.length}`);
  }
  process.stdout.write("\n");

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(index, null, 0));
  console.log(`✓ Written ${index.length} entries to src/data/pokemon-index.json`);
}

main().catch((err) => {
  console.error("✗ Failed to generate Pokémon index:", err.message);
  process.exit(1);
});
