import type { PokemonIndexEntry } from "./pokemon";

export function filterByType(
  list: PokemonIndexEntry[],
  types: string[]
): PokemonIndexEntry[] {
  if (types.length === 0) return list;
  return list.filter((p) => p.types.some((t) => types.includes(t)));
}

export function filterByGeneration(
  list: PokemonIndexEntry[],
  gen: number | null
): PokemonIndexEntry[] {
  if (!gen) return list;
  return list.filter((p) => p.generation === gen);
}

export function filterByLegendary(
  list: PokemonIndexEntry[]
): PokemonIndexEntry[] {
  return list.filter((p) => p.isLegendary || p.isMythical);
}
