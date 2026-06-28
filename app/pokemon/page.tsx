import { redirect } from "next/navigation";
import { PokemonCard, EmptyState } from "@/components/ds";
import type { PokemonType } from "@/components/ds";
import { SearchBar } from "@/components/features/SearchBar";
import { FilterBar } from "@/components/features/FilterBar";
import { Pagination } from "@/components/features/Pagination";
import pokemonIndex from "@/data/pokemon-index.json";
import type { PokemonIndexEntry } from "@/lib/pokemon";
import { filterByName } from "@/lib/search";
import { filterByType, filterByGeneration, filterByLegendary } from "@/lib/filters";
import { paginate } from "@/lib/paginate";
import { strings } from "@/lib/i18n/en";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    gen?: string;
    legendary?: string;
    page?: string;
  }>;
}

export default async function PokemonListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const selectedTypes = params.type ? params.type.split(",").filter(Boolean) : [];
  const gen = params.gen ? parseInt(params.gen, 10) : null;
  const legendary = params.legendary === "1";

  const rawPage = params.page ? parseInt(params.page, 10) : 1;
  const requestedPage = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const allPokemon = pokemonIndex as PokemonIndexEntry[];

  let filtered = filterByName(allPokemon, search);
  filtered = filterByType(filtered, selectedTypes);
  if (gen) filtered = filterByGeneration(filtered, gen);
  if (legendary) filtered = filterByLegendary(filtered);

  const { items: pokemon, totalPages } = paginate(filtered, requestedPage, PAGE_SIZE);

  // Redirect out-of-range page numbers to the last valid page
  if (requestedPage > totalPages) {
    const base = new URLSearchParams();
    if (search) base.set("search", search);
    if (selectedTypes.length > 0) base.set("type", selectedTypes.join(","));
    if (gen) base.set("gen", String(gen));
    if (legendary) base.set("legendary", "1");
    base.set("page", String(totalPages));
    redirect(`/pokemon?${base.toString()}`);
  }

  const hasActiveFilters = !!(search || selectedTypes.length > 0 || gen || legendary);

  return (
    <div className="space-y-6">
      <SearchBar key={search} initialValue={search} />
      <FilterBar
        initialTypes={selectedTypes}
        initialGen={params.gen ?? ""}
        initialLegendary={legendary}
        initialSearch={search}
      />

      {pokemon.length === 0 ? (
        <EmptyState
          title={
            hasActiveFilters
              ? strings.search.noResults.title
              : strings.emptyState.title
          }
          description={
            hasActiveFilters
              ? strings.search.noResults.description
              : strings.emptyState.description
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {pokemon.map((p) => (
            <PokemonCard
              key={p.id}
              id={p.id}
              name={p.name}
              types={p.types as PokemonType[]}
              href={`/pokemon/${p.id}`}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination page={requestedPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
