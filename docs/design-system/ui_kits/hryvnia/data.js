/* ============================================================
   Гривня — mock data for the UI kit.
   Stands in for the keyless NBU open API. Rates are UAH per 1 unit
   of the currency (the brief's anchor: ≈41.85 ₴/USD). History is a
   deterministic ~30-day walk so the kit renders the same every time.
   Exposed as window.HryvniaData.
   ============================================================ */
(function () {
  // Effective date — a Monday-after-weekend example so we can show the
  // honest "stale" provenance (NBU publishes the previous business day).
  const asOf = { date: '29.06.2026', stale: false, weekdayNote: 'Курс діє на сьогодні' };

  // base = current official rate; vol = daily volatility seed
  const CURRENCIES = [
    { code: 'USD', name: 'Долар США',        flag: '🇺🇸', base: 41.8540, vol: 0.06, drift: 0.10 },
    { code: 'EUR', name: 'Євро',             flag: '🇪🇺', base: 45.1208, vol: 0.07, drift: -0.31 },
    { code: 'GBP', name: 'Фунт стерлінгів',  flag: '🇬🇧', base: 53.0719, vol: 0.10, drift: -0.44 },
    { code: 'PLN', name: 'Польський злотий', flag: '🇵🇱', base: 10.6471, vol: 0.02, drift: 0.08 },
    { code: 'CHF', name: 'Швейцарський франк',flag: '🇨🇭', base: 46.7330, vol: 0.08, drift: 0.21 },
    { code: 'CAD', name: 'Канадський долар', flag: '🇨🇦', base: 30.6120, vol: 0.05, drift: -0.05 },
    { code: 'JPY', name: 'Японська єна',     flag: '🇯🇵', base: 26.4810, vol: 0.04, drift: -0.12, unit: 100 },
    { code: 'CZK', name: 'Чеська крона',     flag: '🇨🇿', base: 18.2040, vol: 0.03, drift: 0.02, unit: 10 },
    { code: 'PLZ', name: 'Норвезька крона',  flag: '🇳🇴', base: 41.0900, vol: 0.05, drift: 0.14, unit: 10, displayCode: 'NOK' },
    { code: 'SEK', name: 'Шведська крона',   flag: '🇸🇪', base: 43.9700, vol: 0.05, drift: -0.09, unit: 10 },
    { code: 'AUD', name: 'Австралійський долар', flag: '🇦🇺', base: 27.7300, vol: 0.05, drift: 0.03 },
    { code: 'CNY', name: 'Юань Женьміньбі',  flag: '🇨🇳', base: 5.8390, vol: 0.02, drift: -0.01 },
    { code: 'TRY', name: 'Турецька ліра',    flag: '🇹🇷', base: 1.0420, vol: 0.01, drift: -0.22 },
    { code: 'PLG', name: 'Дат. крона',       flag: '🇩🇰', base: 6.0490, vol: 0.02, drift: -0.07, displayCode: 'DKK' },
  ].map((c) => ({ ...c, displayCode: c.displayCode || c.code }));

  // Deterministic pseudo-random so the chart is stable across reloads.
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedFromCode(code) {
    let h = 0; for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) | 0;
    return Math.abs(h) + 7;
  }

  const DAYS = 30;
  function labelFor(daysAgo) {
    const d = new Date(2026, 5, 29); // 29 Jun 2026
    d.setDate(d.getDate() - daysAgo);
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0');
  }

  // Build a 30-day history ending at `base`, with shape implied by `drift`.
  function buildHistory(c) {
    const rng = mulberry(seedFromCode(c.code));
    const pts = [];
    // start near base minus the net weekly drift, plus a slow wave
    let v = c.base * (1 - (c.drift / 100) * 2.4);
    for (let i = 0; i < DAYS; i++) {
      const daysAgo = DAYS - 1 - i;
      const wave = Math.sin((i / DAYS) * Math.PI * 1.3) * c.base * (c.vol / 100) * 6;
      const noise = (rng() - 0.5) * c.base * (c.vol / 100) * 2.2;
      const trend = (c.base - v) * 0.10; // gentle pull toward base
      v = v + trend + noise * 0.5;
      const rate = (i === DAYS - 1) ? c.base : v + wave * 0.04;
      pts.push({ label: labelFor(daysAgo), rate: Math.round(rate * 1e4) / 1e4 });
    }
    pts[pts.length - 1].rate = c.base;
    return pts;
  }

  // Weekly change %: compare today vs ~7 days ago.
  function weekChange(history) {
    const a = history[history.length - 8] ? history[history.length - 8].rate : history[0].rate;
    const b = history[history.length - 1].rate;
    return ((b - a) / a) * 100;
  }

  const rates = CURRENCIES.map((c) => {
    const history = buildHistory(c);
    return {
      code: c.displayCode,
      rawCode: c.code,
      name: c.name,
      flag: c.flag,
      unit: c.unit || 1,
      rate: c.base,
      delta: c.drift,          // day-over-day (provided)
      week: weekChange(history),
      history,
    };
  });

  // Deterministic dry one-liners, chosen by day-of-year. No API, no tracking.
  const sayings = [
    'Найнадійніший курс — той, що ви вже порахували.',
    'Гривня любить тишу: менше паніки — рівніший графік.',
    'Офіційний курс не поспішає. І ви не поспішайте.',
    'Курс — це число, а не порада. Рішення лишається за вами.',
    'Долар то вгору, то вниз. Гривня залишається гривнею.',
    'Перш ніж конвертувати — порахуйте двічі.',
    'Сьогоднішній курс завтра стане історією. Буквально.',
  ];
  function sayingOfDay() {
    const start = new Date(2026, 0, 0);
    const now = new Date(2026, 5, 29);
    const day = Math.floor((now - start) / 86400000);
    return sayings[day % sayings.length];
  }

  // Trend hint — one calm Ukrainian sentence, number first.
  function trendHint(r) {
    const w = r.week;
    const name = r.name.split(' ')[0]; // "Долар", "Євро"…
    const mag = Math.abs(w).toLocaleString('uk-UA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    if (Math.abs(w) < 0.15) return `${name} за тиждень майже без змін до гривні.`;
    const dir = w > 0 ? 'зміцнів' : 'послабшав';
    return `${name} за тиждень ${dir} на ${mag}% до гривні.`;
  }

  window.HryvniaData = { asOf, rates, sayingOfDay, trendHint };
})();
