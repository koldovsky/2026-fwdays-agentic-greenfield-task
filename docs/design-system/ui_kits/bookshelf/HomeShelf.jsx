// Bookshelf UI kit — Home shelf view (books grouped by tag).
function HomeShelf({ books, shelves, onOpenBook }) {
  const { BookCard, Button, Input, Select } = window.BookshelfDesignSystem_18192e;

  const reading = books.filter((b) => b.status === 'reading');
  const grouped = shelves.map((s) => ({ ...s, books: books.filter((b) => b.tags.includes(s.tag)) })).filter((g) => g.books.length);

  return (
    <div style={{ padding: '28px 36px 60px', maxWidth: 'var(--container-max)', margin: '0 auto' }}>
      {/* page head */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 26 }}>
        <div>
          <div className="bs-eyebrow" style={{ marginBottom: 6 }}>Your library · 8 books · 6 notes</div>
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 600 }}>The shelf</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Input iconLeft={<Icon name="search" size={15} />} placeholder="Search" style={{ width: 200 }} />
          <Select options={['Recently read', 'Highest rated', 'Title A–Z']} />
          <Button variant="primary" iconLeft={<Icon name="plus" size={16} />}>Add book</Button>
        </div>
      </div>

      {/* currently reading band */}
      {reading.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 9 }}>
            <Icon name="book-open" size={18} color="var(--accent)" /> Currently reading
          </h2>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {reading.map((b) => <BookCard key={b.id} {...b} onClick={() => onOpenBook(b.id)} />)}
          </div>
        </section>
      )}

      {/* shelves grouped by tag */}
      {grouped.map((g) => (
        <section key={g.tag} style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: g.color }} />
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>{g.label}</h2>
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: 'var(--text-sm)', color: 'var(--text-faint)' }}>{g.books.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {g.books.map((b) => <BookCard key={b.id} {...b} onClick={() => onOpenBook(b.id)} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
window.HomeShelf = HomeShelf;
