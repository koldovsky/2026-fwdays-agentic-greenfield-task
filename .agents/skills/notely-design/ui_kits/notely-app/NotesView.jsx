// Notely UI kit — notes list/grid view with top bar.
const { NoteCard, SearchField, Select, IconButton, Tabs } = window.NotelyDesignSystem_fd4cb3;

function NotesView({ notes, onOpen, query, onQuery, layout, onLayout }) {
  const pinned = notes.filter((n) => n.pinned);
  const others = notes.filter((n) => !n.pinned);

  const Grid = ({ items }) => (
    <div style={{
      display: "grid",
      gridTemplateColumns: layout === "grid" ? "repeat(auto-fill, minmax(240px, 1fr))" : "1fr",
      gap: 12,
    }}>
      {items.map((n) => (
        <NoteCard key={n.id} {...n} layout={layout} onClick={() => onOpen(n.id)} />
      ))}
    </div>
  );

  return (
    <main style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <header style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 24px",
        borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)",
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.01em" }}>All notes</div>
          <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{notes.length} notes · synced just now</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: 260 }}>
          <SearchField value={query} onChange={(e) => onQuery(e.target.value)} onClear={() => onQuery("")} shortcut="⌘K" />
        </div>
        <div style={{ width: 168 }}>
          <Select value="recent" options={[{ value: "recent", label: "Recently edited" }, { value: "created", label: "Date created" }, { value: "title", label: "Title A–Z" }]} />
        </div>
        <div style={{ display: "flex", gap: 2, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", padding: 2 }}>
          <IconButton icon={<i data-lucide="layout-grid" style={{ width: 16, height: 16 }} />} label="Grid" size="sm" active={layout === "grid"} onClick={() => onLayout("grid")} />
          <IconButton icon={<i data-lucide="list" style={{ width: 16, height: 16 }} />} label="List" size="sm" active={layout === "list"} onClick={() => onLayout("list")} />
        </div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {pinned.length > 0 && query === "" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>
              <i data-lucide="pin" style={{ width: 13, height: 13 }} /> Pinned
            </div>
            <Grid items={pinned} />
          </div>
        )}
        {others.length > 0 && (
          <div>
            {pinned.length > 0 && query === "" && <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Others</div>}
            <Grid items={others} />
          </div>
        )}
        {notes.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--color-text-secondary)", paddingTop: 80, fontSize: 14 }}>No notes match "{query}"</div>
        )}
      </div>
    </main>
  );
}

window.NotesView = NotesView;
