// Bookshelf UI kit — note editor (modal sheet). Highlight → color → note → link.
function NoteEditor({ note, books, onClose, onSave }) {
  const { HighlighterPicker, Textarea, Input, Button, Tag, Card } = window.BookshelfDesignSystem_18192e;
  const [color, setColor] = React.useState(note?.color || 'yellow');
  const [excerpt, setExcerpt] = React.useState(note?.excerpt || '');
  const [body, setBody] = React.useState(note?.note || '');
  const [page, setPage] = React.useState(note?.page || '');

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: '#17130c66', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-default)', padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>{note ? 'Edit note' : 'New note'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Highlighter</div>
            <HighlighterPicker value={color} onChange={setColor} />
          </div>

          {/* live preview of the highlighted excerpt */}
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Passage</div>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="Paste or type the passage you highlighted…"
              className="bs-input" style={{
                width: '100%', resize: 'vertical', fontFamily: 'var(--font-display)', fontStyle: 'italic',
                fontSize: 'var(--text-md)', lineHeight: 1.4, color: 'var(--text-primary)',
                background: `var(--hl-${color}-mark)`, border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)', padding: '10px 12px', outline: 'none',
                transition: 'background var(--dur-base) var(--ease-out)',
              }} />
          </div>

          <Textarea label="Your note" rows={4} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="What does this passage make you think?" />

          <div style={{ display: 'flex', gap: 14 }}>
            <Input label="Page" size="sm" value={page} onChange={(e) => setPage(e.target.value)} placeholder="—" style={{ width: 80 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Link to</div>
              <Card padding={10} style={{ display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'none', cursor: 'pointer' }}>
                <Icon name="link-2" size={15} color="var(--text-faint)" />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Connect a book or note…</span>
              </Card>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave({ color, excerpt, note: body, page })}
            iconLeft={<Icon name="check" size={16} />}>Save note</Button>
        </div>
      </div>
    </div>
  );
}
window.NoteEditor = NoteEditor;
