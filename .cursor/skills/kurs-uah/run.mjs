// Self-contained "kurs-uah" skill — zero dependencies (plain Node + global fetch).
//
// It fetches the official UAH exchange rate from the National Bank of Ukraine
// directly, prints a compact Ukrainian table, and the AGENT reasons over it to
// answer the user's question (convert an amount, read which way a rate is moving,
// compare currencies). No app, no build, no API key. Copy this folder into any
// harness's skills dir and it works.
//
//   node run.mjs '{"codes":["USD","EUR"],"amount":100}'
//   node run.mjs '{"codes":["USD"],"days":7}'
//   node run.mjs                       # default basket, no amount
//
// Input JSON (all optional):
//   codes  : string[]  ISO codes (default: a popular basket)
//   amount : number    amount to convert both ways (currency ⇄ UAH)
//   days   : number    trend window in days (default 7, max 31)

const DEFAULT_CODES = ["USD", "EUR", "GBP", "PLN", "CHF", "JPY", "CAD"];
const EXCHANGE = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange";

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const uk = (n, max = 4) =>
  n == null ? "—" : n.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: max });

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`НБУ ${res.status}`);
  return res.json();
}

function byCode(arr) {
  const m = new Map();
  for (const r of Array.isArray(arr) ? arr : []) m.set(r.cc, r);
  return m;
}

async function main() {
  let arg = {};
  if (process.argv[2]) {
    try { arg = JSON.parse(process.argv[2]); }
    catch { console.error("Невалідний JSON-аргумент."); process.exit(1); }
    if (!arg || typeof arg !== "object" || Array.isArray(arg)) arg = {};
  }
  const codes = (Array.isArray(arg.codes) && arg.codes.length ? arg.codes : DEFAULT_CODES)
    .map((c) => String(c).toUpperCase());
  const amount = num(arg.amount);
  const days = Number.isFinite(arg.days) ? Math.max(1, Math.min(31, Math.trunc(arg.days))) : 7;

  const today = byCode(await fetchJson(`${EXCHANGE}?json`));
  const asOf = [...today.values()][0]?.exchangedate ?? "—";

  // Trend baseline: same archive endpoint on a past date (buffer covers weekends).
  let past = new Map();
  try { past = byCode(await fetchJson(`${EXCHANGE}?date=${ymd(addDays(new Date(), -(days + 2)))}&json`)); }
  catch { /* trend is optional — today's rate still prints */ }

  const out = [];
  out.push(`Офіційний курс НБУ станом на ${asOf} (₴ за одиницю; зміна ~ за ${days} дн.).`);
  if (amount != null) out.push(`Сума для конвертації: ${uk(amount, 2)}.`);
  out.push("Дані лише з НБУ. Відповідай українською, спокійно, без знаків оклику:");

  for (const code of codes) {
    const r = today.get(code);
    if (!r) { out.push(`- ${code}: немає в переліку НБУ`); continue; }
    const rate = num(r.rate);
    const prate = num(past.get(code)?.rate);
    let change = "—";
    if (rate != null && prate != null && prate !== 0) {
      const pct = ((rate - prate) / prate) * 100;
      const sign = pct > 0.05 ? "+" : pct < -0.05 ? "−" : "±";
      change = `${sign}${Math.abs(pct).toLocaleString("uk-UA", { maximumFractionDigits: 2 })}%`;
    }
    let line = `- ${code} (${r.txt}): ${uk(rate)} ₴ · зміна ${change}`;
    if (amount != null && rate != null && rate !== 0) {
      line += ` · ${uk(amount, 2)} ${code} = ${uk(amount * rate, 2)} ₴`;
      line += ` · ${uk(amount, 2)} ₴ = ${uk(amount / rate, 2)} ${code}`;
    }
    out.push(line);
  }
  console.log(out.join("\n"));
}

main().catch((err) => {
  console.error("kurs-uah failed:", err?.message ?? err);
  process.exit(1);
});
