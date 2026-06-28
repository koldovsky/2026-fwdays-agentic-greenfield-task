/* List screen — filter bar, responsive results grid, pagination, empty state
   (FR-LIST-01..04, FR-PAGE-01..02). Filtering/pagination computed locally. */
(function () {
  const NS = window.PokDexExplorerDesignSystem_6555a0;
  const { PokemonCard, Pagination, EmptyState, Button } = NS;

  const lsCSS = `
  .px-list { display: flex; flex-direction: column; gap: var(--space-8); }
  .px-list__head { display: flex; flex-direction: column; gap: var(--space-2); }
  .px-list__title { font-family: var(--font-sans); font-weight: 800; font-size: var(--text-3xl); letter-spacing: -0.03em; color: var(--text-primary); line-height: 1.05; }
  .px-list__sub { font-size: var(--text-base); color: var(--text-secondary); max-width: 52ch; }
  .px-list__panel { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: var(--space-6); }
  .px-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-5); }
  .px-list__footer { display: flex; justify-content: center; padding-top: var(--space-2); }
  @media (max-width: 1280px) { .px-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 768px) { .px-grid { grid-template-columns: 1fr; } .px-list__title { font-size: var(--text-2xl); } }
  @media (min-width: 769px) and (max-width: 1024px) { .px-grid { grid-template-columns: repeat(2, 1fr); } }
  `;
  if (!document.getElementById("px-list-style")) {
    const el = document.createElement("style"); el.id = "px-list-style"; el.textContent = lsCSS; document.head.appendChild(el);
  }

  function matches(p, f) {
    if (f.search && !p.name.toLowerCase().includes(f.search.trim().toLowerCase())) return false;
    if (f.types.length && !p.types.some((t) => f.types.includes(t))) return false;
    if (f.generation && String(p.generation) !== String(f.generation)) return false;
    if (f.legendary && !(p.legendary || p.mythical)) return false;
    return true;
  }

  function ListScreen({ data, filters, setFilters, page, setPage, onSelect }) {
    const { FilterBar } = window;
    const filtered = data.pokemon.filter((p) => matches(p, filters));
    const pageSize = data.pageSize;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    return (
      <div className="px-list">
        <div className="px-list__head">
          <h1 className="px-list__title">Search the dex</h1>
          <p className="px-list__sub">Browse every Pokémon. Filter by type, generation, or legendary status, then open a card for the full profile.</p>
        </div>

        <FilterBar
          filters={filters}
          setFilters={(f) => { setFilters(f); setPage(1); }}
          generations={data.generations}
          resultCount={filtered.length}
          totalCount={data.pokemon.length}
        />

        {pageItems.length === 0 ? (
          <EmptyState
            title="No Pokémon found"
            description="Nothing matches your current search and filters. Try a different name or clear some filters."
            action={<Button variant="secondary" onClick={() => setFilters({ search: "", types: [], generation: "", legendary: false })}>Clear filters</Button>}
          />
        ) : (
          <>
            <div className="px-grid">
              {pageItems.map((p) => (
                <PokemonCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  types={p.types}
                  href="#"
                  onClick={(e) => { e.preventDefault(); onSelect(p); }}
                />
              ))}
            </div>
            {totalPages > 1 ? (
              <div className="px-list__footer">
                <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  window.ListScreen = ListScreen;
})();
