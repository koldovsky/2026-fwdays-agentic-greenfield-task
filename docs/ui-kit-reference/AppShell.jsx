/* App shell — top bar with the wordmark + a footer crediting PokéAPI
   (BC-BRAND-02). Pure layout; screens render as children. */
(function () {
  const shellCSS = `
  .px-shell { min-height: 100%; display: flex; flex-direction: column; background: var(--color-bg); }
  .px-topbar {
    position: sticky; top: 0; z-index: 20;
    display: flex; align-items: center; justify-content: space-between;
    height: 60px; padding: 0 var(--space-6);
    background: color-mix(in oklab, var(--color-bg) 86%, transparent);
    backdrop-filter: saturate(140%) blur(8px);
    border-bottom: 1px solid var(--border-subtle);
  }
  .px-brand { display: inline-flex; align-items: baseline; gap: 8px; text-decoration: none; }
  .px-brand__name { font-family: var(--font-sans); font-weight: 800; font-size: 19px; letter-spacing: -0.03em; color: var(--ink-900); }
  .px-brand__tag { font-family: var(--font-mono); font-weight: 500; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--paper); background: var(--ink-900); padding: 2px 6px; border-radius: var(--radius-sm); }
  .px-topbar__meta { font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); letter-spacing: .02em; }
  .px-main { flex: 1; width: 100%; max-width: var(--container-max); margin: 0 auto; padding: var(--space-8) var(--space-6) var(--space-12); }
  .px-footer {
    border-top: 1px solid var(--border-subtle);
    padding: var(--space-6);
    display: flex; justify-content: center;
  }
  .px-footer__inner { width: 100%; max-width: var(--container-max); display: flex; align-items: center; justify-content: space-between; font-size: var(--text-xs); color: var(--text-tertiary); }
  .px-footer a { color: var(--text-secondary); text-underline-offset: .2em; }
  @media (max-width: 768px) { .px-main { padding: var(--space-6) var(--space-4) var(--space-10); } .px-topbar { padding: 0 var(--space-4); } }
  `;
  if (!document.getElementById("px-shell-style")) {
    const el = document.createElement("style"); el.id = "px-shell-style"; el.textContent = shellCSS; document.head.appendChild(el);
  }

  function AppShell({ onHome, children }) {
    return (
      <div className="px-shell">
        <header className="px-topbar">
          <a className="px-brand" href="#" onClick={(e) => { e.preventDefault(); onHome && onHome(); }}>
            <span className="px-brand__name">Pokédex</span>
            <span className="px-brand__tag">EXPLORER</span>
          </a>
          <span className="px-topbar__meta">1025 Pokémon · keyless · no trackers</span>
        </header>
        <main className="px-main">{children}</main>
        <footer className="px-footer">
          <div className="px-footer__inner">
            <span>Data from <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer">PokéAPI</a></span>
            <span>No accounts · no cookies · no analytics</span>
          </div>
        </footer>
      </div>
    );
  }

  window.AppShell = AppShell;
})();
