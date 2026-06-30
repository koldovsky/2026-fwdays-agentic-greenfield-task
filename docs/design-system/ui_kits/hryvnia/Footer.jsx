/* Footer — a dry, deterministic Ukrainian one-liner (no API, no tracking)
   and a quiet provenance note. */
(function () {
  window.HryvniaFooter = function Footer({ saying, asOf }) {
    return (
      <footer style={{
        maxWidth: 'var(--content-max)', margin: '0 auto',
        padding: '28px var(--gutter) 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap',
        borderTop: '1px solid var(--border)', marginTop: 8,
      }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>
          {saying}
        </p>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)', letterSpacing: '0.02em' }}>
          Дані: відкритий API НБУ · станом на {asOf.date} · без кук і трекерів
        </span>
      </footer>
    );
  };
})();
