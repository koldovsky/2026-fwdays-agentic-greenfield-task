// Notely UI kit — full-page note editor.
const { IconButton, Button, Tag, EditorToolbar, ChecklistItem, Avatar } = window.NotelyDesignSystem_fd4cb3;

function EditorView({ note, onBack }) {
  const [checks, setChecks] = React.useState({ a: false, b: true });
  if (!note) return null;
  return (
    <main style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderBottom: "1px solid var(--color-border)" }}>
        <IconButton icon={<i data-lucide="arrow-left" style={{ width: 18, height: 18 }} />} label="Back" onClick={onBack} />
        <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>{note.folder} · Edited {note.date}</span>
        <div style={{ flex: 1 }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--color-success)", marginRight: 4 }}>
          <i data-lucide="check" style={{ width: 14, height: 14 }} /> Saved
        </span>
        <IconButton icon={<i data-lucide="star" style={{ width: 18, height: 18, fill: note.favorite ? "var(--color-warning)" : "none" }} />} label="Favorite" active={note.favorite} />
        <IconButton icon={<i data-lucide="pin" style={{ width: 18, height: 18, fill: note.pinned ? "var(--color-primary)" : "none" }} />} label="Pin" active={note.pinned} />
        <Button variant="secondary" size="sm" leadingIcon={<i data-lucide="share-2" style={{ width: 15, height: 15 }} />}>Share</Button>
        <IconButton icon={<i data-lucide="more-horizontal" style={{ width: 18, height: 18 }} />} label="More" />
      </header>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px 80px" }}>
          <input defaultValue={note.title} style={{
            width: "100%", border: "none", outline: "none", background: "transparent",
            fontFamily: "var(--font-sans)", fontSize: 34, fontWeight: 700,
            letterSpacing: "-0.02em", color: "var(--color-text)", marginBottom: 12,
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            {note.tags.map((t) => <Tag key={t.label} color={t.color} removable>{t.label}</Tag>)}
            <Tag onClick={() => {}}>+ Add tag</Tag>
          </div>
          <div style={{ marginBottom: 20 }}><EditorToolbar active={{ bold: false }} /></div>
          <div style={{ fontSize: 17, lineHeight: "var(--lh-relaxed)", color: "var(--color-text)", whiteSpace: "pre-wrap" }}>
            {note.body}
          </div>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--color-divider)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>Action items</div>
            <ChecklistItem checked={checks.a} text="Polish sync conflict UI" onToggle={() => setChecks((c) => ({ ...c, a: !c.a }))} />
            <ChecklistItem checked={checks.b} text="Share recap with the team" onToggle={() => setChecks((c) => ({ ...c, b: !c.b }))} />
          </div>
        </div>
      </div>
    </main>
  );
}

window.EditorView = EditorView;
