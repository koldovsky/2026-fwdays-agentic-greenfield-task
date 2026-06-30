/* App — orchestrates the Гривня screen. Left: the rates list (filter +
   pick). Right: the focused currency hero + converter / history. The
   whole thing is one calm sheet; selecting a currency focuses it. */
(function () {
  window.HryvniaApp = function App() {
    const data = window.HryvniaData;
    const [dark, setDark] = React.useState(false);
    const [code, setCode] = React.useState('USD');

    React.useEffect(() => {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }, [dark]);

    React.useEffect(() => {
      if (window.lucide) window.lucide.createIcons();
    });

    const cur = data.rates.find((r) => r.code === code) || data.rates[0];
    const hint = data.trendHint(cur);

    const Header = window.HryvniaHeader;
    const RatesPanel = window.HryvniaRatesPanel;
    const FocusHero = window.HryvniaFocusHero;
    const DetailPanel = window.HryvniaDetailPanel;
    const Footer = window.HryvniaFooter;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header asOf={data.asOf} dark={dark} onToggleTheme={setDark} />
        <main style={{
          flex: 1, width: '100%', maxWidth: 'var(--content-max)', margin: '0 auto',
          padding: 'var(--space-6) var(--gutter) var(--space-7)',
          display: 'grid', gap: 'var(--space-5)',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)',
          alignItems: 'start',
        }} className="hryv-main">
          <RatesPanel rates={data.rates} selected={code} onSelect={setCode} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <FocusHero cur={cur} hint={hint} />
            <DetailPanel cur={cur} hint={hint} />
          </div>
        </main>
        <Footer saying={data.sayingOfDay()} asOf={data.asOf} />
      </div>
    );
  };
})();
