/* Filter bar — name search, type multi-select chips, generation select,
   legendary switch, and clear (FR-SEARCH-01, FR-FILTER-01..05). Controlled. */
(function () {
  const NS = window.PokDexExplorerDesignSystem_6555a0;
  const { SearchInput, Select, Switch, TypeBadge, POKEMON_TYPES, Button } = NS;

  const fbCSS = `
  .px-filters { display: flex; flex-direction: column; gap: var(--space-4); }
  .px-filters__top { display: grid; grid-template-columns: minmax(0,1fr) 220px; gap: var(--space-3); align-items: end; }
  .px-filters__chips { display: flex; flex-wrap: wrap; gap: var(--space-1-5); }
  .px-filters__bottom { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; }
  .px-filters__legend { display: flex; align-items: center; gap: var(--space-4); }
  .px-fieldlabel { font-family: var(--font-mono); font-size: 11px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: var(--space-2); }
  @media (max-width: 768px) { .px-filters__top { grid-template-columns: 1fr; } }
  `;
  if (!document.getElementById("px-filters-style")) {
    const el = document.createElement("style"); el.id = "px-filters-style"; el.textContent = fbCSS; document.head.appendChild(el);
  }

  function FilterBar({ filters, setFilters, generations, resultCount, totalCount }) {
    const { search, types, generation, legendary } = filters;
    const activeCount = types.length + (generation ? 1 : 0) + (legendary ? 1 : 0) + (search ? 1 : 0);

    const toggleType = (t) => {
      const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
      setFilters({ ...filters, types: next });
    };

    return (
      <div className="px-filters">
        <div className="px-filters__top">
          <div>
            <div className="px-fieldlabel">Search</div>
            <SearchInput value={search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          </div>
          <Select
            label="Generation"
            placeholder="All generations"
            options={generations}
            value={generation}
            onChange={(e) => setFilters({ ...filters, generation: e.target.value })}
          />
        </div>

        <div>
          <div className="px-fieldlabel">Types</div>
          <div className="px-filters__chips">
            {POKEMON_TYPES.map((t) => (
              <TypeBadge key={t} type={t} selectable selected={types.includes(t)} onClick={() => toggleType(t)} />
            ))}
          </div>
        </div>

        <div className="px-filters__bottom">
          <div className="px-filters__legend">
            <Switch label="Legendary & Mythical only" checked={legendary} onChange={(e) => setFilters({ ...filters, legendary: e.target.checked })} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>
              {resultCount} of {totalCount}
            </span>
          </div>
          {activeCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setFilters({ search: "", types: [], generation: "", legendary: false })}>
              Clear filters ({activeCount})
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  window.FilterBar = FilterBar;
})();
