// Bookshelf UI kit — single book page (cover, score, tabs, notes, summary).
function BookPage({ book, notes, onBack, onAddNote, onOpenNote, onRate }) {
  const { Rating, Tabs, Tag, Badge, Button, NoteCard, Card, Textarea } = window.BookshelfDesignSystem_18192e;
  const [tab, setTab] = React.useState('notes');

  const COVER = {
    blue: 'linear-gradient(160deg,#3a4fe0,#242fa3)', coral: 'linear-gradient(160deg,#ff6f5e,#d8463a)',
    teal: 'linear-gradient(160deg,#3ccfbf,#1f8f82)', purple: 'linear-gradient(160deg,#b083f5,#7a4fd0)',
    amber: 'linear-gradient(160deg,#ffaf45,#d98a23)', green: 'linear-gradient(160deg,#7fd96f,#45a83a)',
    ink: 'linear-gradient(160deg,#4b4334,#2a2419)',
  };
  const statusTone = { reading: 'brand', finished: 'success', toread: 'neutral' };
  const statusLabel = { reading: 'Reading', finished: 'Finished', toread: 'To read' };

  return (
    <div style={{ maxWidth: 'var(--reading-max)', margin: '0 auto', padding: '24px 28px 80px' }}>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
        cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-sm)', fontWeight: 500, padding: 0, marginBottom: 22,
      }}><Icon name="arrow-left" size={15} /> Back to shelf</button>

      {/* header */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 28 }}>
        <div style={{
          width: 132, flexShrink: 0, aspectRatio: '3/4', borderRadius: 'var(--radius-md)',
          background: COVER[book.cover] || COVER.ink, boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 16,
        }}>
          <span style={{ width: 24, height: 3, borderRadius: 2, background: '#ffffff66' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, lineHeight: 1.1, color: '#fff' }}>{book.title}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          <Badge tone={statusTone[book.status]} dot={book.status === 'finished'}>{statusLabel[book.status]}</Badge>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 600, lineHeight: 1.08 }}>{book.title}</h1>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)', color: 'var(--text-muted)' }}>
            {book.author} · {book.year} · {book.pages} pp
          </div>
          <div style={{ marginTop: 4 }}><Rating value={book.rating} onChange={onRate} size="md" /></div>
          <div style={{ display: 'flex', gap: 7, marginTop: 4, flexWrap: 'wrap' }}>
            {book.tags.map((t) => <Tag key={t} size="sm">#{t}</Tag>)}
          </div>
        </div>
      </div>

      <Tabs value={tab} onChange={setTab} style={{ marginBottom: 20 }} items={[
        { value: 'notes', label: 'Notes', count: notes.length },
        { value: 'summary', label: 'Summary' },
        { value: 'links', label: 'Links', count: notes.reduce((a, n) => a + n.links, 0) },
      ]} />

      {tab === 'notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button variant="soft" block onClick={onAddNote}
            iconLeft={<Icon name="highlighter" size={16} />}>Add a note</Button>
          {notes.map((n) => <NoteCard key={n.id} {...n} onClick={() => onOpenNote(n.id)} />)}
          {notes.length === 0 && <p style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)', textAlign: 'center', padding: 32 }}>No notes yet — highlight your first passage.</p>}
        </div>
      )}

      {tab === 'summary' && (
        book.summary
          ? <Card ruled padding="lg"><p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', lineHeight: '32px', color: 'var(--text-primary)', margin: 0 }}>{book.summary}</p></Card>
          : <Textarea ruled rows={6} placeholder="Write your summary — what should future-you remember about this book?" />
      )}

      {tab === 'links' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.filter((n) => n.links > 0).map((n) => (
            <Card key={n.id} interactive padding="md" onClick={() => onOpenNote(n.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--hl-${n.color})`, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontStyle: 'italic', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.excerpt}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-meta)', fontSize: 'var(--text-xs)', color: 'var(--accent-hover)' }}>
                  <Icon name="link" size={12} />{n.links}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
window.BookPage = BookPage;
