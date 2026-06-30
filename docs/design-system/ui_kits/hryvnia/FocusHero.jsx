/* FocusHero — the "one number, then the detail" header for the focused
   currency: the big official rate, the calm weekly trend sentence, and a
   trend pill. */
(function () {
  const DS = (function () { for (const k in window) { const v = window[k]; if (v && v.RateRow && v.Converter) return v; } return {}; })();
  const { TrendBadge, CurrencyAvatar } = DS;
  const fmt = (n, d = 4) => Number(n).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: d });

  window.HryvniaFocusHero = function FocusHero({ cur, hint }) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
        padding: 'var(--space-5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <CurrencyAvatar flag={cur.flag} code={cur.code} size="md" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text)', letterSpacing: '0.02em' }}>
              {cur.unit > 1 ? `${cur.unit} ` : ''}{cur.code}
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{cur.name}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 'var(--text-4xl)', lineHeight: 1, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {fmt(cur.rate)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', color: 'var(--text-faint)', paddingBottom: 6 }}>₴</span>
          <span style={{ paddingBottom: 8 }}><TrendBadge delta={cur.week} size="lg" /></span>
        </div>

        <p style={{ margin: '14px 0 0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {hint}
        </p>
      </div>
    );
  };
})();
