/* RatesPanel — the currency list with a free-form filter. Leads each row
   with the official rate; selecting a row focuses it across the app. */
(function () {
  const DS = (function () { for (const k in window) { const v = window[k]; if (v && v.RateRow && v.Converter) return v; } return {}; })();
  const { CurrencyPicker } = DS;

  window.HryvniaRatesPanel = function RatesPanel({ rates, selected, onSelect }) {
    return (
      <section style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
        padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text)' }}>Курси валют</h2>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            ₴ за одиницю
          </span>
        </div>
        <CurrencyPicker currencies={rates} selected={selected} onSelect={onSelect} maxHeight={460} />
      </section>
    );
  };
})();
