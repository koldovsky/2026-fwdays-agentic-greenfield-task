/* Header — logo lockup, honest provenance, theme toggle. Sticky and
   translucent so the page reads as one calm sheet. */
(function () {
  const DS = (function () { for (const k in window) { const v = window[k]; if (v && v.RateRow && v.Converter) return v; } return {}; })();
  const { AsOfBadge, Switch } = DS;

  function Logo() {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          width: 40, height: 40, borderRadius: '50%', flex: 'none',
          background: 'var(--green-500)', border: '2px solid var(--brass-400)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <span style={{ color: '#faf4e6', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 22, lineHeight: 1 }}>&#8372;</span>
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.1 }}>Гривня</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '2.5px', color: 'var(--text-muted)' }}>ОФІЦІЙНИЙ КУРС НБУ</span>
        </div>
      </div>
    );
  }

  window.HryvniaHeader = function Header({ asOf, dark, onToggleTheme }) {
    return (
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'color-mix(in oklab, var(--bg) 82%, transparent)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 'var(--content-max)', margin: '0 auto', padding: '14px var(--gutter)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <Logo />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="hide-sm"><AsOfBadge date={asOf.date} stale={asOf.stale} /></div>
            <Switch checked={dark} onChange={onToggleTheme} label="" />
          </div>
        </div>
      </header>
    );
  };
})();
