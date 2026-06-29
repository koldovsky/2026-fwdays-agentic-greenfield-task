// Bookshelf UI kit — Sidebar nav. Exports to window.
function Sidebar({ shelves, current, onNav, dark, onToggleDark }) {
  const { Avatar } = window.BookshelfDesignSystem_18192e;
  const Ic = ({ n, s = 17 }) => <Icon name={n} size={s} />;

  const navItem = (key, icon, label, count) => {
    const on = current === key;
    return (
      <button key={key} onClick={() => onNav(key)} style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
        background: on ? 'var(--accent-soft)' : 'transparent', border: 'none', cursor: 'pointer',
        color: on ? 'var(--accent-hover)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: on ? 600 : 500,
        padding: '8px 10px', borderRadius: 'var(--radius-sm)', transition: 'background var(--dur-fast)',
      }}>
        <Ic n={icon} />
        <span style={{ flex: 1 }}>{label}</span>
        {count != null && <span style={{ fontFamily: 'var(--font-meta)', fontSize: 'var(--text-xs)', color: on ? 'var(--accent-hover)' : 'var(--text-faint)' }}>{count}</span>}
      </button>
    );
  };

  return (
    <aside style={{
      width: 'var(--sidebar-w)', flexShrink: 0, height: '100%', boxSizing: 'border-box',
      background: 'var(--surface-card)', borderRight: '1px solid var(--border-default)',
      display: 'flex', flexDirection: 'column', padding: '16px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 8px 16px' }}>
        <img src="../../assets/logo-mark.svg" width="30" height="30" alt="" />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.02em' }}>Bookshelf</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItem('home', 'library', 'All books', 8)}
        {navItem('reading', 'book-open', 'Reading', 1)}
        {navItem('notes', 'sticky-note', 'All notes', 6)}
        {navItem('toread', 'bookmark', 'To read', 2)}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontFamily: 'var(--font-meta)', fontSize: 'var(--text-xs)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '0 10px 8px' }}>Shelves</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {shelves.map((s) => (
            <button key={s.tag} onClick={() => onNav('shelf:' + s.tag)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
              background: current === 'shelf:' + s.tag ? 'var(--surface-sunken)' : 'transparent',
              border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', fontWeight: 500,
              padding: '7px 10px', borderRadius: 'var(--radius-sm)',
            }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px 2px' }}>
        <Avatar name="You" size="sm" />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', flex: 1 }}>Your library</span>
        <button onClick={onToggleDark} title="Toggle theme" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30,
          background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)',
          cursor: 'pointer', color: 'var(--text-secondary)',
        }}><Ic n={dark ? 'sun' : 'moon'} s={15} /></button>
      </div>
    </aside>
  );
}
window.Sidebar = Sidebar;
