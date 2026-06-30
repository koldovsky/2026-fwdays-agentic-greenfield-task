/* DetailPanel — the right column body. A segmented control switches
   between the converter and the 30-day history chart for the focused
   currency. */
(function () {
  const DS = (function () { for (const k in window) { const v = window[k]; if (v && v.RateRow && v.Converter) return v; } return {}; })();
  const { Tabs, Converter, RateChart, TrendBadge } = DS;
  const fmt = (n, d = 4) => Number(n).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: d });

  window.HryvniaDetailPanel = function DetailPanel({ cur, hint }) {
    const [view, setView] = React.useState('convert');
    const lo = Math.min(...cur.history.map((p) => p.rate));
    const hi = Math.max(...cur.history.map((p) => p.rate));

    return (
      <section style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
        padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Tabs value={view} onChange={setView} tabs={[{ value: 'convert', label: 'Конвертер' }, { value: 'history', label: 'Історія' }]} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {cur.code}
          </span>
        </div>

        {view === 'convert' ? (
          <Converter code={cur.code} rate={cur.rate} defaultAmount="100" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Офіційний курс за 30 днів
              </span>
              <TrendBadge delta={cur.week} size="md" />
            </div>
            <RateChart data={cur.history} height={220} />
            <div style={{ display: 'flex', gap: 20, paddingTop: 4 }}>
              <Stat label="Мінімум" value={fmt(lo)} />
              <Stat label="Максимум" value={fmt(hi)} />
              <Stat label="Сьогодні" value={fmt(cur.rate)} accent />
            </div>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              {hint}
            </p>
          </div>
        )}
      </section>
    );
  };

  function Stat({ label, value, accent }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 'var(--text-md)', color: accent ? 'var(--brand)' : 'var(--text)' }}>
          {value}<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginLeft: 3 }}>₴</span>
        </span>
      </div>
    );
  }
})();
