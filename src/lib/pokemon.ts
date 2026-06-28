const BASE = "https://pokeapi.co/api/v2";

interface ListEntry {
  name: string;
  url: string;
}

interface PokéAPIListResponse {
  count: number;
  results: ListEntry[];
}

interface PokéAPIPokemon {
  id: number;
  name: string;
  types: Array<{ type: { name: string } }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  abilities: Array<{ ability: { name: string }; is_hidden: boolean }>;
  height: number;
  weight: number;
}

interface PokéAPISpecies {
  genera: Array<{ genus: string; language: { name: string } }>;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: { name: string };
  }>;
  generation: { name: string };
  is_legendary: boolean;
  is_mythical: boolean;
}

export interface PokemonListItem {
  id: number;
  name: string;
  types: string[];
}

export interface PokemonIndexEntry {
  id: number;
  name: string;
  types: string[];
  generation: number;
  isLegendary: boolean;
  isMythical: boolean;
}

export interface PokemonDetail {
  id: number;
  name: string;
  types: string[];
  stats: Record<string, number>;
  abilities: Array<{ name: string; hidden: boolean }>;
  height: number;
  weight: number;
}

export interface PokemonSpecies {
  genus: string;
  flavorText: string;
  generation: string;
  isLegendary: boolean;
  isMythical: boolean;
}

export async function fetchPokemonList(
  offset: number,
  limit: number
): Promise<PokemonListItem[]> {
  const res = await fetch(`${BASE}/pokemon?limit=${limit}&offset=${offset}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];
  const data: PokéAPIListResponse = await res.json();
  const entries = await Promise.all(
    data.results.map((entry) => fetchPokemon(idFromUrl(entry.url)))
  );
  return entries.filter((e): e is PokemonListItem => e !== null);
}

export async function fetchPokemon(
  id: number | string
): Promise<PokemonListItem | null> {
  const res = await fetch(`${BASE}/pokemon/${id}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data: PokéAPIPokemon = await res.json();
  return {
    id: data.id,
    name: data.name,
    types: data.types.map((t) => t.type.name),
  };
}

export async function fetchPokemonDetail(
  id: number | string
): Promise<PokemonDetail | null> {
  const res = await fetch(`${BASE}/pokemon/${id}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data: PokéAPIPokemon = await res.json();
  const stats: Record<string, number> = {};
  for (const s of data.stats) stats[s.stat.name] = s.base_stat;
  return {
    id: data.id,
    name: data.name,
    types: data.types.map((t) => t.type.name),
    stats,
    abilities: data.abilities.map((a) => ({
      name: a.ability.name,
      hidden: a.is_hidden,
    })),
    height: data.height / 10,
    weight: data.weight / 10,
  };
}

export async function fetchPokemonSpecies(
  id: number | string
): Promise<PokemonSpecies | null> {
  const res = await fetch(`${BASE}/pokemon-species/${id}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data: PokéAPISpecies = await res.json();
  const genus =
    data.genera.find((g) => g.language.name === "en")?.genus ?? "";
  const flavorEntry = [...data.flavor_text_entries]
    .reverse()
    .find((e) => e.language.name === "en");
  const flavorText = (flavorEntry?.flavor_text ?? "").replace(
    /[\n\f\r]/g,
    " "
  );
  return {
    genus,
    flavorText,
    generation: data.generation.name,
    isLegendary: data.is_legendary,
    isMythical: data.is_mythical,
  };
}

function idFromUrl(url: string): number {
  const parts = url.replace(/\/$/, "").split("/");
  return Number(parts[parts.length - 1]);
}
