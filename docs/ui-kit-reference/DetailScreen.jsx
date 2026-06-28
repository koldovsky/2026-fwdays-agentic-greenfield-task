/* Detail screen — full profile for one Pokémon (FR-DETAIL-01..09):
   artwork, dex number, name, genus, types, flavor text, base stats,
   abilities (hidden marked), height/weight (metric), generation, and a
   Legendary/Mythical label when applicable. Back link returns to the list. */
(function () {
  const NS = window.PokDexExplorerDesignSystem_6555a0;
  const { TypeBadge, Badge, StatBar, artworkUrl } = NS;
  const { ArrowLeft, Ruler, Weight, Sparkles, Layers } = window.PokeIcons;

  const dsCSS = `
  .px-detail { display: flex; flex-direction: column; gap: var(--space-6); }
  .px-back { align-self: flex-start; display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3) var(--space-2) var(--space-2); border-radius: var(--radius-control); border: 1px solid transparent; background: transparent; color: var(--text-secondary); font-family: var(--font-sans); font-size: var(--text-sm); font-weight: 600; cursor: pointer; transition: background-color .12s, color .12s; }
  .px-back:hover { background: var(--surface-hover); color: var(--text-primary); }
  .px-detail__grid { display: grid; grid-template-columns: 440px 1fr; gap: var(--space-8); align-items: start; }
  .px-art {
    position: sticky; top: 84px;
    aspect-ratio: 1 / 1;
    background: radial-gradient(120% 120% at 50% 22%, var(--surface-card) 0%, var(--surface-sunken) 100%);
    border: 1px solid var(--border-subtle); border-radius: var(--radius-2xl);
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .px-art__num { position: absolute; top: var(--space-5); left: var(--space-5); font-family: var(--font-mono); font-size: var(--text-md); color: var(--text-tertiary); font-variant-numeric: tabular-nums; letter-spacing: .02em; }
  .px-art img { width: 76%; height: 76%; object-fit: contain; filter: drop-shadow(0 14px 22px rgba(14,14,12,.16)); }
  .px-info { display: flex; flex-direction: column; gap: var(--space-6); }
  .px-info__genus { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: .08em; text-transform: uppercase; color: var(--text-tertiary); }
  .px-info__name { font-family: var(--font-sans); font-weight: 800; font-size: var(--text-5xl); letter-spacing: -0.03em; line-height: 1; color: var(--text-primary); text-transform: capitalize; margin-top: 4px; }
  .px-info__types { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
  .px-flavor { font-size: var(--text-md); line-height: 1.6; color: var(--text-secondary); max-width: 56ch; }
  .px-section { display: flex; flex-direction: column; gap: var(--space-3); }
  .px-section__title { font-family: var(--font-mono); font-size: var(--text-2xs); font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--text-tertiary); }
  .px-stats { display: flex; flex-direction: column; gap: var(--space-2-5, 10px); }
  .px-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
  .px-meta__item { border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); background: var(--surface-card); }
  .px-meta__k { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: var(--text-2xs); letter-spacing: .06em; text-transform: uppercase; color: var(--text-tertiary); }
  .px-meta__v { font-family: var(--font-mono); font-size: var(--text-lg); font-weight: 500; color: var(--text-primary); font-variant-numeric: tabular-nums; }
  .px-abilities { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .px-ability { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-pill); background: var(--surface-card); font-size: var(--text-sm); color: var(--text-primary); text-transform: capitalize; }
  .px-ability__hidden { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--text-tertiary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 1px 5px; }
  @media (max-width: 1024px) { .px-detail__grid { grid-template-columns: 1fr; } .px-art { position: static; max-width: 380px; } .px-info__name { font-size: var(--text-4xl); } }
  `;
  if (!document.getElementById("px-detail-style")) {
    const el = document.createElement("style"); el.id = "px-detail-style"; el.textContent = dsCSS; document.head.appendChild(el);
  }

  const STAT_ROWS = [["hp","HP"],["atk","Attack"],["def","Defense"],["spa","Sp. Atk"],["spd","Sp. Def"],["spe","Speed"]];
  const GEN_LABEL = { 1:"Gen 1 — Kanto",2:"Gen 2 — Johto",3:"Gen 3 — Hoenn",4:"Gen 4 — Sinnoh",5:"Gen 5 — Unova",6:"Gen 6 — Kalos",7:"Gen 7 — Alola",8:"Gen 8 — Galar",9:"Gen 9 — Paldea" };

  function DetailScreen({ pokemon: p, onBack }) {
    const dex = `#${String(p.id).padStart(4, "0")}`;
    return (
      <div className="px-detail">
        <button className="px-back" onClick={onBack}><ArrowLeft size={18} /> Back to results</button>

        <div className="px-detail__grid">
          <div className="px-art">
            <span className="px-art__num">{dex}</span>
            <img src={artworkUrl(p.id)} alt={p.name} />
          </div>

          <div className="px-info">
            <div>
              <div className="px-info__genus">{p.genus}</div>
              <h1 className="px-info__name">{p.name}</h1>
              <div className="px-info__types">
                {p.types.map((t) => <TypeBadge key={t} type={t} size="lg" />)}
                {p.legendary ? <Badge variant="legendary" size="lg">Legendary</Badge> : null}
                {p.mythical ? <Badge variant="legendary" size="lg">Mythical</Badge> : null}
              </div>
            </div>

            <p className="px-flavor">{p.flavor}</p>

            <div className="px-section">
              <div className="px-section__title">Base stats</div>
              <div className="px-stats">
                {STAT_ROWS.map(([k, label]) => <StatBar key={k} label={label} value={p.stats[k]} />)}
              </div>
            </div>

            <div className="px-section">
              <div className="px-section__title">Profile</div>
              <div className="px-meta">
                <div className="px-meta__item"><span className="px-meta__k"><Ruler size={13} /> Height</span><span className="px-meta__v">{p.height.toFixed(1)} m</span></div>
                <div className="px-meta__item"><span className="px-meta__k"><Weight size={13} /> Weight</span><span className="px-meta__v">{p.weight.toFixed(1)} kg</span></div>
                <div className="px-meta__item"><span className="px-meta__k"><Layers size={13} /> Generation</span><span className="px-meta__v" style={{ fontSize: "var(--text-sm)" }}>{GEN_LABEL[p.generation]}</span></div>
              </div>
            </div>

            <div className="px-section">
              <div className="px-section__title">Abilities</div>
              <div className="px-abilities">
                {p.abilities.map((a) => (
                  <span key={a.name} className="px-ability">
                    {a.name}
                    {a.hidden ? <span className="px-ability__hidden">Hidden</span> : null}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.DetailScreen = DetailScreen;
})();
